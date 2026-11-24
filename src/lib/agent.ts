/**
 * agent.ts
 * Autonomous Research Agent Engine:
 *   1. analyzeContextNLU()  — Deep NLP/NLU understanding of user's intent, entities, domain & angles
 *   2. planQueriesWithNLU() — Generates platform-tailored queries informed by NLU output
 *   3. findGapQueries()     — Autonomous Round-2 query refinement for under-covered platforms
 *   4. enrichRawContent()   — Collects clean raw text excerpts from top web/article pages
 */

import { NLUAnalysis, ResearchDepth, SourceItem, SourceType, SubQuery } from '@/types/research';
import { callLLM } from './synthesize';
import { fetchWithTimeout } from './connectors/fetchWithTimeout';

// ─── 1. NLP & NLU Context Understanding ─────────────────────────────────────────

const TECH_STOPWORDS = new Set([
  'how', 'what', 'why', 'when', 'where', 'which', 'the', 'and', 'for', 'with',
  'that', 'this', 'from', 'into', 'about', 'can', 'does', 'should', 'would',
  'could', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had',
  'best', 'way', 'ways', 'using', 'use', 'make', 'build', 'create', 'fix',
  'issue', 'problem', 'error', 'help', 'please', 'need', 'want',
]);

/**
 * Performs NLP/NLU analysis on the user's raw prompt to understand:
 * - True intent & goal
 * - Technical domain & problem type
 * - Named entities (languages, frameworks, protocols, tools)
 * - Research angles to explore across internet platforms
 */
export async function analyzeContextNLU(problem: string): Promise<NLUAnalysis> {
  const prompt = `You are an expert NLP/NLU engine for a software engineering research agent.
Analyze the user's prompt deeply to understand their exact technical context before searching the internet.

USER PROMPT:
"${problem}"

Extract:
1. "intent": A clear 1-sentence statement of what the user actually wants to achieve or solve.
2. "domain": The primary technical domain (e.g., "Distributed Systems", "Frontend Performance", "Databases", "AI/ML", "DevOps", "Security", "Backend Architecture").
3. "problemType": One of "debugging", "architecture", "comparison", "how-to", "deep-dive".
4. "entities": Array of 3-8 specific technologies, frameworks, protocols, APIs, or technical concepts mentioned or implied.
5. "researchAngles": Array of 3-5 distinct research angles/questions to investigate across docs, papers, GitHub, Reddit/HN, and YouTube.
6. "complexity": One of "Low", "Medium", "High".

Respond ONLY with valid JSON matching those exact keys.`;

  try {
    const raw = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 700,
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as Partial<NLUAnalysis>;

    if (parsed.intent && Array.isArray(parsed.entities) && Array.isArray(parsed.researchAngles)) {
      return {
        intent: parsed.intent,
        domain: parsed.domain || 'Software Engineering',
        problemType: parsed.problemType || 'deep-dive',
        entities: parsed.entities.slice(0, 8),
        researchAngles: parsed.researchAngles.slice(0, 5),
        complexity: parsed.complexity || 'Medium',
      };
    }
  } catch (err) {
    console.warn('[Agent NLU] LLM NLU failed, using deterministic NLP fallback:', err);
  }

  return deterministicNLPFallback(problem);
}

/**
 * Deterministic NLP fallback when LLM key is missing or fails.
 */
function deterministicNLPFallback(problem: string): NLUAnalysis {
  const words = problem
    .replace(/[^\w\s.-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !TECH_STOPWORDS.has(w.toLowerCase()));

  const uniqueEntities = Array.from(new Set(words)).slice(0, 6);
  const lower = problem.toLowerCase();

  let problemType: NLUAnalysis['problemType'] = 'deep-dive';
  if (/error|bug|crash|fail|deadlock|leak|fix|slow|timeout/.test(lower)) problemType = 'debugging';
  else if (/vs|compare|better|difference|alternative/.test(lower)) problemType = 'comparison';
  else if (/architecture|design|scale|pattern|system/.test(lower)) problemType = 'architecture';
  else if (/how to|implement|setup|tutorial|build/.test(lower)) problemType = 'how-to';

  return {
    intent: `Research technical solutions, patterns, and real-world implementations for: ${problem.slice(0, 140)}`,
    domain: 'Software Engineering',
    problemType,
    entities: uniqueEntities.length > 0 ? uniqueEntities : ['Software Architecture'],
    researchAngles: [
      `Official documentation & core concepts for ${uniqueEntities.slice(0, 2).join(' ')}`,
      'Production trade-offs, benchmarks, and edge cases',
      'Open-source implementations, issues, and community discussions',
    ],
    complexity: problem.length > 120 ? 'High' : 'Medium',
  };
}

// ─── 2. NLU-Driven Multi-Platform Query Planning ────────────────────────────────

export async function planQueriesWithNLU(
  problem: string,
  nlu: NLUAnalysis,
  selectedSources: SourceType[],
  depth: ResearchDepth
): Promise<SubQuery[]> {
  const sourceDescriptions: Record<SourceType, string> = {
    web: 'Articles, official documentation, Stack Overflow, and engineering blogs',
    papers: 'Academic research papers on arXiv & Semantic Scholar (use formal terminology)',
    github: 'GitHub repositories, issues, PRs, and real code implementations',
    reddit_hn: 'Reddit & Hacker News developer discussions and production postmortems',
    youtube: 'YouTube conference talks, deep dives, and technical tutorials',
  };

  const targetCount =
    depth === 'quick'
      ? Math.max(selectedSources.length, 3)
      : depth === 'deep'
      ? Math.max(selectedSources.length * 2, 6)
      : Math.max(selectedSources.length, 5);

  const prompt = `You are an autonomous developer research agent. Using the NLU context analysis below, craft ${targetCount} targeted search queries across the selected platforms.

ORIGINAL PROMPT: "${problem}"
NLU INTENT: ${nlu.intent}
DOMAIN: ${nlu.domain} (${nlu.problemType})
EXTRACTED ENTITIES: ${nlu.entities.join(', ')}
RESEARCH ANGLES:
${nlu.researchAngles.map((a, i) => `${i + 1}. ${a}`).join('\n')}

SELECTED PLATFORMS (cover EVERY selected platform at least once):
${selectedSources.map((s) => `- ${s}: ${sourceDescriptions[s]}`).join('\n')}

Rules:
- Every query must be concise (3-7 keywords) so search APIs return high-signal results.
- Tailor each query to the platform (e.g., formal terms for papers, library/error keywords for github, talk/tutorial terms for youtube).
- Respond ONLY with valid JSON:
{
  "queries": [
    { "sourceType": "web", "query": "...", "purpose": "..." }
  ]
}`;

  try {
    const raw = await callLLM({
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 900,
      jsonMode: true,
    });

    const cleaned = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const parsed = JSON.parse(cleaned) as {
      queries?: Array<{ sourceType: SourceType; query: string; purpose: string }>;
    };

    if (Array.isArray(parsed.queries)) {
      const valid = parsed.queries
        .filter((q) => selectedSources.includes(q.sourceType) && q.query?.trim())
        .map((q, idx) => ({
          id: `sq-${idx + 1}`,
          sourceType: q.sourceType,
          query: q.query.trim(),
          purpose: q.purpose || `${q.sourceType} research`,
        }));

      if (valid.length > 0) return valid;
    }
  } catch (err) {
    console.warn('[Agent Plan] LLM planning failed, using entity-based fallback:', err);
  }

  // Fallback using NLU entities
  const coreTerms = nlu.entities.slice(0, 4).join(' ');
  return selectedSources.map((src, idx) => ({
    id: `sq-${idx + 1}`,
    sourceType: src,
    query:
      src === 'papers'
        ? `${coreTerms} algorithm architecture`
        : src === 'github'
        ? `${coreTerms} implementation`
        : src === 'youtube'
        ? `${coreTerms} deep dive`
        : coreTerms,
    purpose: sourceDescriptions[src],
  }));
}

// ─── 3. Autonomous Round-2 Gap Detection ────────────────────────────────────────

/**
 * Inspects Round 1 results. For any selected platform that returned < 2 results,
 * builds simpler, broader entity-based queries for an autonomous Round 2 search.
 */
export function findGapQueries(
  nlu: NLUAnalysis,
  selectedSources: SourceType[],
  round1Sources: SourceItem[]
): SubQuery[] {
  const counts = new Map<SourceType, number>();
  for (const src of selectedSources) counts.set(src, 0);
  for (const item of round1Sources) {
    counts.set(item.type, (counts.get(item.type) || 0) + 1);
  }

  const coreEntities = nlu.entities.slice(0, 3).join(' ');
  if (!coreEntities.trim()) return [];

  const gapQueries: SubQuery[] = [];
  let idx = 1;

  for (const src of selectedSources) {
    const count = counts.get(src) || 0;
    if (count < 2) {
      gapQueries.push({
        id: `sq-r2-${idx++}`,
        sourceType: src,
        query: coreEntities,
        purpose: `Round 2 autonomous gap-fill for ${src} (Round 1 had ${count} results)`,
      });
    }
  }

  return gapQueries;
}

// ─── 4. Raw Content Collector & Cleaner ─────────────────────────────────────────

/**
 * Strips HTML tags, scripts, and styles to extract clean readable text from a web page.
 */
function htmlToCleanText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Enriches top web/article sources with cleaned raw page text (up to maxToFetch URLs)
 * so the user receives fuller raw collected data, not just search snippets.
 * Never throws — skips any URL that blocks or times out.
 */
export async function enrichRawContent(
  sources: SourceItem[],
  maxToFetch = 4
): Promise<SourceItem[]> {
  const targets = sources
    .filter((s) => s.type === 'web' && s.url.startsWith('http') && !s.url.includes('/search?'))
    .slice(0, maxToFetch);

  const fetchedMap = new Map<string, string>();

  await Promise.allSettled(
    targets.map(async (item) => {
      try {
        const res = await fetchWithTimeout(item.url, {
          timeoutMs: 4500,
          headers: {
            'User-Agent': 'DevResearch-Agent/1.0 (+https://github.com/ROOKIEEE12/DevResearch)',
            Accept: 'text/html,application/xhtml+xml',
          },
        });
        if (!res.ok) return;
        const contentType = res.headers.get('content-type') || '';
        if (!contentType.includes('text/html') && !contentType.includes('text/plain')) return;

        const html = await res.text();
        const text = htmlToCleanText(html);
        if (text.length > 150) {
          fetchedMap.set(item.id, text.slice(0, 2500));
        }
      } catch {
        // Ignore timeouts/blocked pages gracefully
      }
    })
  );

  return sources.map((s) => ({
    ...s,
    rawContent: fetchedMap.get(s.id) || s.rawContent || s.snippet,
  }));
}
