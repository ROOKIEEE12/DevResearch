/**
 * synthesize.ts
 * Handles all Claude API calls:
 *   1. planQueries()   — Break a technical problem into targeted sub-queries per source
 *   2. synthesize()    — Generate a full ResearchBriefData from collected sources (streaming)
 *   3. answerFollowUp() — Ground a follow-up question using already-collected sources
 */

import Anthropic from '@anthropic-ai/sdk';
import { SourceItem, ResearchBriefData, SourceType, ResearchDepth } from '@/types/research';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const MODEL = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

// ─── 1. Query Planning ─────────────────────────────────────────────────────────

export interface PlannedQuery {
  sourceType: SourceType;
  query: string;
  purpose: string;
}

/**
 * Uses Claude to decompose a developer's problem into 3-6 targeted sub-queries,
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
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip markdown code fences if present
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned);

    if (Array.isArray(parsed.queries)) {
      // Filter to only valid source types
      return parsed.queries.filter((q: PlannedQuery) => availableSources.includes(q.sourceType));
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

// ─── 2. Synthesis (Streaming) ──────────────────────────────────────────────────

/**
 * Build a compact source context string for the LLM prompt.
 * Chunks long snippets to avoid blowing the context window.
 */
function buildSourceContext(sources: SourceItem[]): string {
  return sources
    .slice(0, 20) // cap at 20 sources for prompt safety
    .map((s) => {
      const snippet = s.snippet.length > 400 ? s.snippet.slice(0, 400) + '…' : s.snippet;
      return `[${s.citationId}] (${s.type}) ${s.title}
URL: ${s.url}${s.date ? ` | Date: ${s.date}` : ''}
${snippet}`;
    })
    .join('\n\n---\n\n');
}

/**
 * Streams a JSON synthesis brief from Claude.
 * Yields raw text chunks so the caller can forward them as SSE.
 */
export async function* synthesizeStream(
  problem: string,
  sources: SourceItem[],
  depth: ResearchDepth
): AsyncGenerator<string> {
  const detailLevel =
    depth === 'quick'
      ? '1 approach, 1 code snippet, brief summary (≤150 words)'
      : depth === 'deep'
      ? '3-4 approaches with detailed pros/cons, 2-3 code snippets, comprehensive summary (≤400 words)'
      : '2-3 approaches, 1-2 code snippets, solid summary (≤250 words)';

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

  const stream = await anthropic.messages.stream({
    model: MODEL,
    max_tokens: depth === 'quick' ? 1500 : depth === 'deep' ? 4000 : 2500,
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
  });

  for await (const chunk of stream) {
    if (
      chunk.type === 'content_block_delta' &&
      chunk.delta.type === 'text_delta'
    ) {
      yield chunk.delta.text;
    }
  }
}

/**
 * Non-streaming version — collects the full JSON and parses it.
 */
export async function synthesize(
  problem: string,
  sources: SourceItem[],
  depth: ResearchDepth
): Promise<ResearchBriefData> {
  let fullText = '';
  for await (const chunk of synthesizeStream(problem, sources, depth)) {
    fullText += chunk;
  }

  // Strip optional markdown fences
  const cleaned = fullText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as ResearchBriefData;
    // Sanitize: ensure keyPapersAndVideos only references real citation IDs
    const validIds = new Set(sources.map((s) => s.citationId));
    parsed.keyPapersAndVideos = (parsed.keyPapersAndVideos || []).filter((kp) =>
      validIds.has(kp.citationId)
    );
    return parsed;
  } catch {
    console.error('[synthesize] JSON parse failed. Raw response:', cleaned.slice(0, 500));
    throw new Error('Claude returned malformed JSON. Please retry.');
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

  const messages: Anthropic.MessageParam[] = [
    ...conversationHistory.slice(-6).map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: question },
  ];

  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: systemPrompt,
    messages,
  });

  const rawText = response.content[0].type === 'text' ? response.content[0].text : '';

  // Extract the cited JSON from the last line
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
