/**
 * /api/research — Autonomous AI Research Agent SSE Pipeline
 *
 * POST body: { problem, selectedSources, depth }
 *
 * Streams Server-Sent Events:
 *   step    — pipeline step progress updates (nlu, planning, searching, processing, synthesizing)
 *   nlu     — { nlu: NLUAnalysis } (intent, domain, entities, research angles)
 *   queries — { queries: SubQuery[] }
 *   sources — { sources: SourceItem[] } (all raw collected & enriched data)
 *   warning — non-fatal warnings
 *   brief   — { brief: ResearchBriefData }
 *   done    — { sessionId }
 *   error   — fatal error message
 */

import { NextRequest } from 'next/server';
import {
  analyzeContextNLU,
  planQueriesWithNLU,
  findGapQueries,
  enrichRawContent,
} from '@/lib/agent';
import { synthesize } from '@/lib/synthesize';
import { searchSources } from '@/lib/connectors';
import { checkRateLimit } from '@/lib/rateLimit';
import { SourceType, ResearchDepth, SourceItem } from '@/types/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

function mergeAndReindexSources(primary: SourceItem[], secondary: SourceItem[]): SourceItem[] {
  const seen = new Set<string>();
  const merged: SourceItem[] = [];

  for (const item of [...primary, ...secondary]) {
    const key = item.url.toLowerCase().replace(/\/+$/, '');
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }

  merged.sort((a, b) => (b.credibilityScore || 80) - (a.credibilityScore || 80));
  return merged.map((item, idx) => ({
    ...item,
    citationId: idx + 1,
  }));
}

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, {
    keyPrefix: 'research',
    limit: 10,
    windowMs: 60_000,
  });
  if (limited) return limited;

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (type: string, data: unknown) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(type, data)));
        } catch {
          // client disconnected
        }
      };

      try {
        const body = await req.json();
        const {
          problem,
          selectedSources,
          depth = 'standard',
        }: {
          problem: string;
          selectedSources: SourceType[];
          depth: ResearchDepth;
        } = body;

        if (!problem || !problem.trim()) {
          send('error', { message: 'Problem description is required.' });
          controller.close();
          return;
        }

        if (!selectedSources || selectedSources.length === 0) {
          send('error', { message: 'At least one source must be selected.' });
          controller.close();
          return;
        }

        // ── Step 1: NLP & NLU Context Understanding ─────────────────────
        send('step', {
          id: 'nlu',
          status: 'in_progress',
          message: 'Understanding intent, technical entities & context via NLU…',
        });

        const nlu = await analyzeContextNLU(problem);
        send('nlu', { nlu });
        send('step', {
          id: 'nlu',
          status: 'completed',
          message: `Detected ${nlu.domain} (${nlu.problemType}) · ${nlu.entities.length} entities`,
        });

        // ── Step 2: Multi-Platform Query Planning ───────────────────────
        send('step', {
          id: 'planning',
          status: 'in_progress',
          message: 'Crafting tailored queries for each selected platform…',
        });

        const plannedQueries = await planQueriesWithNLU(problem, nlu, selectedSources, depth);
        send('queries', { queries: plannedQueries });
        send('step', {
          id: 'planning',
          status: 'completed',
          message: `Planned ${plannedQueries.length} platform-specific queries`,
        });

        // ── Step 3: Autonomous Multi-Pass Internet Search ───────────────
        send('step', {
          id: 'searching',
          status: 'in_progress',
          message: `Searching ${selectedSources.length} platforms (YouTube, Reddit, Papers, Web, GitHub)…`,
        });

        const limit = depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5;
        const round1 = await searchSources(plannedQueries, {
          limit,
          timeoutMs: 15000,
          depth,
        });

        for (const w of round1.warnings) {
          send('warning', { message: w });
        }

        let allSources = round1.sources;
        let allQueries = [...plannedQueries];

        // Autonomous Round-2 gap check for standard/deep research
        if (depth !== 'quick') {
          const gapQueries = findGapQueries(nlu, selectedSources, round1.sources);
          if (gapQueries.length > 0) {
            send('step', {
              id: 'searching',
              status: 'in_progress',
              message: `Round 1 found ${round1.sources.length} items — running Round 2 gap-fill on ${gapQueries.map((g) => g.sourceType).join(', ')}…`,
            });

            const round2 = await searchSources(gapQueries, {
              limit,
              timeoutMs: 12000,
              depth,
            });

            allQueries = [...allQueries, ...gapQueries];
            send('queries', { queries: allQueries });
            allSources = mergeAndReindexSources(round1.sources, round2.sources);
          }
        }

        send('step', {
          id: 'searching',
          status: 'completed',
          message: `Collected ${allSources.length} raw items across internet platforms`,
        });

        // ── Step 4: Raw Data Extraction & Credibility Ranking ───────────
        send('step', {
          id: 'processing',
          status: 'in_progress',
          message: 'Extracting clean raw page content & ranking credibility…',
        });

        const maxFetch = depth === 'quick' ? 2 : depth === 'deep' ? 6 : 4;
        const enrichedSources = await enrichRawContent(allSources, maxFetch);
        send('sources', { sources: enrichedSources });

        send('step', {
          id: 'processing',
          status: 'completed',
          message: `Prepared ${enrichedSources.length} raw sources with full metadata`,
        });

        // ── Step 5: Synthesis ───────────────────────────────────────────
        send('step', {
          id: 'synthesizing',
          status: 'in_progress',
          message: 'Synthesizing research brief from collected raw data…',
        });

        try {
          const brief = await synthesize(problem, enrichedSources, depth);
          send('step', { id: 'synthesizing', status: 'completed', message: 'Research brief ready' });
          send('brief', { brief });
        } catch (synthErr: unknown) {
          const msg = synthErr instanceof Error ? synthErr.message : 'Synthesis skipped';
          send('warning', { message: `Synthesis note: ${msg}. All raw collected data is still available.` });
          send('step', { id: 'synthesizing', status: 'completed', message: 'Raw data ready (AI synthesis skipped)' });
        }

        const sessionId = `sess-${Date.now()}`;
        send('done', { sessionId });
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Unexpected server error during research pipeline.';
        console.error('[/api/research] Fatal error:', err);
        send('error', { message: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
