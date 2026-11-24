/**
 * /api/research — Full SSE research pipeline
 *
 * POST body: { problem, selectedSources, depth }
 *
 * Streams Server-Sent Events in this order:
 *   step    — pipeline step progress updates
 *   queries — planned sub-queries from Claude
 *   sources — found sources (batches)
 *   warning — non-fatal connector warnings
 *   brief   — full synthesized JSON (ResearchBriefData)
 *   done    — { sessionId } signals completion
 *   error   — fatal error message
 */

import { NextRequest } from 'next/server';
import { planQueries } from '@/lib/synthesize';
import { synthesize } from '@/lib/synthesize';
import { searchSources } from '@/lib/connectors';
import { SourceType, ResearchDepth } from '@/types/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Helper to encode an SSE event
function sseEvent(type: string, data: unknown): string {
  return `event: ${type}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
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

        // ── Step 1: Query Planning (Claude) ─────────────────────────────
        send('step', { id: 'planning', status: 'in_progress', message: 'Using Claude to plan targeted queries…' });

        let plannedQueries;
        try {
          plannedQueries = await planQueries(problem, selectedSources, depth);
        } catch (err: any) {
          send('warning', { message: `Query planning failed: ${err.message}. Using fallback queries.` });
          // Build simple fallback
          plannedQueries = selectedSources.map((src) => ({
            sourceType: src,
            query: problem.slice(0, 60),
            purpose: `${src} search`,
          }));
        }

        send('step', {
          id: 'planning',
          status: 'completed',
          message: `Planned ${plannedQueries.length} targeted sub-queries`,
        });
        send('queries', { queries: plannedQueries });

        // ── Step 2: Search Sources in Parallel ──────────────────────────
        send('step', {
          id: 'searching',
          status: 'in_progress',
          message: `Querying ${selectedSources.length} source connectors in parallel…`,
        });

        const limit = depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5;
        const { sources, warnings, executionResults } = await searchSources(plannedQueries, {
          limit,
          timeoutMs: 15000,
          depth,
        });

        // Surface per-connector warnings
        for (const w of warnings) {
          send('warning', { message: w });
        }

        // Surface any connector that returned 0 results
        for (const r of executionResults) {
          if (r.results.length === 0 && !r.error) {
            send('warning', { message: `Connector '${r.sourceType}' returned no results.` });
          }
        }

        send('step', {
          id: 'searching',
          status: 'completed',
          message: `Retrieved ${sources.length} sources`,
        });
        send('sources', { sources });

        // ── Step 3: Deduplication & Ranking (already done in searchSources) ─
        send('step', {
          id: 'processing',
          status: 'completed',
          message: `Deduplicated and ranked ${sources.length} sources by credibility`,
        });

        // ── Step 4: Synthesis (Claude) ───────────────────────────────────
        send('step', { id: 'synthesizing', status: 'in_progress', message: 'Synthesizing research brief with Claude…' });

        if (sources.length === 0) {
          send('warning', {
            message: 'No sources retrieved. Synthesis may be limited. Check API keys in .env.',
          });
        }

        const brief = await synthesize(problem, sources, depth);

        send('step', { id: 'synthesizing', status: 'completed', message: 'Research brief ready' });
        send('brief', { brief });

        // ── Done ─────────────────────────────────────────────────────────
        const sessionId = `sess-${Date.now()}`;
        send('done', { sessionId });
      } catch (err: any) {
        console.error('[/api/research] Fatal error:', err);
        send('error', { message: err.message || 'Unexpected server error during research pipeline.' });
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
