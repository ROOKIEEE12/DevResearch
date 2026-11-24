/**
 * synthesize.ts
 * Handles all LLM calls (Google Gemini primary, Anthropic Claude optional fallback):
 *   1. planQueries()    — Break a technical problem into targeted sub-queries per source
 *   2. synthesize()     — Generate a full ResearchBriefData from collected sources
 *   3. answerFollowUp() — Ground a follow-up question using already-collected sources
 */

import Anthropic from '@anthropic-ai/sdk';
import { SourceItem, ResearchBriefData, SourceType, ResearchDepth } from '@/types/research';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

interface LLMMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface CallLLMOptions {
  system?: string;
  messages: LLMMessage[];
  maxTokens?: number;
  jsonMode?: boolean;
}

/**
 * Unified LLM caller: uses Google Gemini (free tier via GEMINI_API_KEY) if set,
 * otherwise falls back to Anthropic Claude (ANTHROPIC_API_KEY).
 */
export async function callLLM(options: CallLLMOptions): Promise<string> {
  const geminiKey = process.env.GEMINI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (geminiKey) {
    return callGemini(geminiKey, options);
  }

  if (anthropicKey) {
    return callAnthropic(anthropicKey, options);
  }

  throw new Error(
    'No LLM API key configured. Add GEMINI_API_KEY (free at https://aistudio.google.com/apikey) to your .env file.'
  );
}

async function callGemini(apiKey: string, options: CallLLMOptions): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  // Gemini requires non-empty parts and strictly alternating user/model turns
  const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];
  for (const m of options.messages) {
    const text = (m.content || '').trim();
    if (!text) continue;
    const role: 'user' | 'model' = m.role === 'assistant' ? 'model' : 'user';
    const last = contents[contents.length - 1];
    if (last && last.role === role) {
      last.parts[0].text += `\n\n${text}`;
    } else {
      contents.push({ role, parts: [{ text }] });
    }
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      maxOutputTokens: options.maxTokens || 2500,
      temperature: 0.3,
      ...(options.jsonMode ? { responseMimeType: 'application/json' } : {}),
    },
  };

  if (options.system) {
    body.systemInstruction = {
      parts: [{ text: options.system }],
    };
  }

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => res.statusText);
    throw new Error(`Gemini API error (${res.status}): ${errText.slice(0, 300)}`);
  }

  const data = (await res.json()) as {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  if (!text) {
    throw new Error('Gemini returned an empty response.');
  }
  return text;
}

async function callAnthropic(apiKey: string, options: CallLLMOptions): Promise<string> {
  const anthropic = new Anthropic({ apiKey });
  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: options.maxTokens || 2500,
    ...(options.system ? { system: options.system } : {}),
    messages: options.messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  });

  return response.content[0]?.type === 'text' ? response.content[0].text : '';
}

// ─── 1. Query Planning ─────────────────────────────────────────────────────────

export interface PlannedQuery {
  sourceType: SourceType;
  query: string;
  purpose: string;
}

/**
 * Uses the LLM to decompose a developer's problem into 3-6 targeted sub-queries,
 * each tailored to a specific source type.
 */
export async function planQueries(
  problem: string,
  selectedSources: SourceType[],
  depth: ResearchDepth
): Promise<PlannedQuery[]> {
  const sourceDescriptions: Record<SourceType, string> = {
    web: 'Web search for official documentation, Stack Overflow answers, blog posts and tutorials',
    papers: 'Academic papers on arXiv and Semantic Scholar (use formal/algorithmic phrasing)',
    github: 'GitHub issues, pull requests and discussions (look for bug reports, fixes, workarounds)',
    reddit_hn: 'Reddit and Hacker News posts (incident reports, production experiences, opinions)',
    youtube: 'YouTube conference talks, tutorials and deep-dive videos',
  };

  const targetCount = depth === 'quick' ? 3 : depth === 'deep' ? 6 : 4;
  const availableSources = selectedSources.filter((s) => sourceDescriptions[s]);

  const prompt = `You are a senior developer research assistant. Decompose the following technical problem into ${targetCount} highly targeted search queries — one or more per source type selected.

PROBLEM:
${problem}

AVAILABLE SOURCES (use only these):
${availableSources.map((s) => `- ${s}: ${sourceDescriptions[s]}`).join('\n')}

Rules:
- Each query must be optimized for the specific source (e.g., formal for papers, conversational for reddit_hn, keyword-dense for web)
- Cover different angles: conceptual understanding, practical solutions, real-world experiences, code examples
- Do NOT repeat the same query for different sources
- Keep queries concise and specific (under 10 words each)

Respond ONLY with valid JSON in this exact shape (no markdown, no explanation):
{
  "queries": [
    { "sourceType": "web", "query": "...", "purpose": "..." },
    { "sourceType": "papers", "query": "...", "purpose": "..." }
  ]
}`;

  try {
    const text = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 800,
      jsonMode: true,
    });

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed.queries)) {
      const filtered = parsed.queries.filter((q: PlannedQuery) =>
        availableSources.includes(q.sourceType)
      );
      if (filtered.length > 0) return filtered;
    }
  } catch (err) {
    console.warn('[planQueries] LLM planning failed, using rule-based fallback:', err);
  }

  // Rule-based fallback
  return availableSources.slice(0, targetCount).map((src) => {
    const q = fallbackQuery(src, problem);
    return { sourceType: src, query: q.query, purpose: q.purpose };
  });
}

function fallbackQuery(src: SourceType, problem: string): { query: string; purpose: string } {
  const short = problem.slice(0, 50);
  switch (src) {
    case 'web':
      return { query: `${short} official documentation best practices`, purpose: 'Official docs and tutorials' };
    case 'papers':
      return { query: `${short} algorithm architecture analysis`, purpose: 'Academic papers' };
    case 'github':
      return { query: `${short} bug fix issue`, purpose: 'GitHub issues and PRs' };
    case 'reddit_hn':
      return { query: `${short} production experience`, purpose: 'Community experiences' };
    case 'youtube':
      return { query: `${short} deep dive conference talk`, purpose: 'Video tutorials' };
  }
}

// ─── 2. Synthesis ──────────────────────────────────────────────────────────────

/**
 * Build a compact source context string for the LLM prompt.
 * Chunks long snippets to avoid blowing the context window.
 */
function buildSourceContext(sources: SourceItem[]): string {
  return sources
    .slice(0, 20)
    .map((s) => {
      const snippet = s.snippet.length > 400 ? s.snippet.slice(0, 400) + '…' : s.snippet;
      return `[${s.citationId}] (${s.type}) ${s.title}
URL: ${s.url}${s.date ? ` | Date: ${s.date}` : ''}
${snippet}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Generates a structured ResearchBriefData JSON from retrieved sources.
 */
export async function synthesize(
  problem: string,
  sources: SourceItem[],
  depth: ResearchDepth
): Promise<ResearchBriefData> {
  const detailLevel =
    depth === 'quick'
      ? '1 approach, 1 code snippet, brief summary (<=150 words)'
      : depth === 'deep'
      ? '3-4 approaches with detailed pros/cons, 2-3 code snippets, comprehensive summary (<=400 words)'
      : '2-3 approaches, 1-2 code snippets, solid summary (<=250 words)';

  const sourceContext = buildSourceContext(sources);
  const citationIds = sources.map((s) => s.citationId).join(', ');

  const systemPrompt = `You are an expert developer research assistant. You produce precise, citation-backed technical research briefs.

RULES:
- Every factual claim MUST include an inline citation like [1], [2], or [1,3]. NEVER invent sources.
- Only cite sources from the provided list (citation IDs: ${citationIds}).
- If a source is not relevant, do not cite it.
- Never hallucinate URLs, paper titles, or author names.
- Code snippets must be real, runnable examples — not pseudo-code.
- Use plain markdown inside string values (no outer markdown wrapper).`;

  const userPrompt = `Technical problem: ${problem}

SOURCES RETRIEVED (${sources.length} total):
${sourceContext}

Produce a research brief with detail level: ${detailLevel}

Respond ONLY with a valid JSON object matching this TypeScript interface exactly:
{
  "summary": "string — executive summary with inline citations [n]",
  "approaches": [
    {
      "approach": "string — approach name",
      "description": "string — 1-2 sentences",
      "pros": ["string"],
      "cons": ["string"],
      "complexity": "Low" | "Medium" | "High"
    }
  ],
  "recommendedSolution": {
    "title": "string",
    "rationale": "string — with citations [n]",
    "tradeoffs": "string",
    "architectureNotes": "string (optional)"
  },
  "codeSnippets": [
    {
      "language": "string",
      "title": "string",
      "code": "string — actual runnable code",
      "explanation": "string"
    }
  ],
  "keyPapersAndVideos": [
    {
      "title": "string — exact title from source",
      "url": "string — exact URL from source",
      "type": "paper" | "video" | "discussion",
      "takeaway": "string",
      "citationId": number
    }
  ],
  "openQuestions": ["string"]
}

Do NOT wrap in markdown code fences. Output raw JSON only.`;

  const fullText = await callLLM({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: depth === 'quick' ? 1500 : depth === 'deep' ? 4000 : 2500,
    jsonMode: true,
  });

  const cleaned = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as ResearchBriefData;
    const validIds = new Set(sources.map((s) => s.citationId));
    parsed.keyPapersAndVideos = (parsed.keyPapersAndVideos || []).filter((kp) =>
      validIds.has(kp.citationId)
    );
    return parsed;
  } catch {
    console.error('[synthesize] JSON parse failed. Raw response:', cleaned.slice(0, 500));
    throw new Error('LLM returned malformed JSON. Please retry.');
  }
}

// ─── 3. Follow-up Q&A ──────────────────────────────────────────────────────────

export interface FollowUpResult {
  content: string;
  citedSources: number[];
}

/**
 * Answers a follow-up question grounded strictly in the already-collected sources.
 */
export async function answerFollowUp(
  question: string,
  sources: SourceItem[],
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<FollowUpResult> {
  const sourceContext = buildSourceContext(sources);
  const citationIds = sources.map((s) => s.citationId).join(', ');

  const systemPrompt = `You are a helpful developer research assistant answering follow-up questions.

RULES:
- Answer ONLY using the provided sources below — do not use outside knowledge.
- Every factual claim MUST have an inline citation [n] from the available sources (IDs: ${citationIds}).
- If you cannot answer from the sources, say so explicitly.
- Be concise but thorough. Use markdown for structure (bullet points, bold, code).
- End your response with a JSON block on its own line: {"cited": [1, 3, 5]} listing every citation ID you used.

SOURCES:
${sourceContext}`;

  const messages: LLMMessage[] = [
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    })),
    { role: 'user', content: question },
  ];

  let rawText = '';
  try {
    rawText = await callLLM({
      system: systemPrompt,
      messages,
      maxTokens: 1200,
      jsonMode: false,
    });
  } catch (err: unknown) {
    const reason = err instanceof Error ? err.message : 'LLM unavailable';
    console.warn('[answerFollowUp] LLM failed, using local source-matching fallback:', reason);
    return localFollowUpFallback(question, sources, reason);
  }

  const lines = rawText.split('\n');
  let citedSources: number[] = [];
  let content = rawText;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line.startsWith('{"cited":')) {
      try {
        const parsed = JSON.parse(line);
        if (Array.isArray(parsed.cited)) {
          citedSources = parsed.cited;
          content = lines.slice(0, i).join('\n').trim();
        }
      } catch {
        // ignore parse errors
      }
      break;
    }
  }

  return { content, citedSources };
}

/**
 * Local keyword-matching fallback when Gemini/Anthropic API key is missing or unreachable.
 */
function localFollowUpFallback(
  question: string,
  sources: SourceItem[],
  reason: string
): FollowUpResult {
  const keywords = question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = sources
    .map((s) => {
      const hay = `${s.title} ${s.rawContent || s.snippet}`.toLowerCase();
      const hits = keywords.reduce((acc, kw) => (hay.includes(kw) ? acc + 1 : acc), 0);
      return { source: s, hits };
    })
    .sort((a, b) => b.hits - a.hits)
    .slice(0, 3);

  const citedSources = scored.map((x) => x.source.citationId);
  const bullets = scored
    .map(
      ({ source }) =>
        `- **${source.title}** [${source.citationId}]: ${(source.rawContent || source.snippet).slice(0, 220)}…`
    )
    .join('\n');

  return {
    content: `Here is what the collected raw sources say about your question:\n\n${bullets}\n\n> *Note: AI synthesis is currently in fallback mode (${reason}). Add a valid \`GEMINI_API_KEY\` in \`.env\` and restart the dev server for full conversational answers.*`,
    citedSources,
  };
}
