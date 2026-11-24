/**
 * /api/followup — Claude-powered follow-up Q&A
 *
 * POST body: { question, sources, history }
 * Returns:   { content, citedSources }
 */

import { NextRequest, NextResponse } from 'next/server';
import { answerFollowUp } from '@/lib/synthesize';
import { checkRateLimit } from '@/lib/rateLimit';
import { SourceItem } from '@/types/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const limited = checkRateLimit(req, {
    keyPrefix: 'followup',
    limit: 20,
    windowMs: 60_000,
  });
  if (limited) return limited;

  try {
    const body = await req.json();
    const {
      question,
      sources,
      history = [],
    }: {
      question: string;
      sources: SourceItem[];
      history: Array<{ role: 'user' | 'assistant'; content: string }>;
    } = body;

    if (!question?.trim()) {
      return NextResponse.json({ error: 'Question is required.' }, { status: 400 });
    }
    if (!sources || !Array.isArray(sources) || sources.length === 0) {
      return NextResponse.json(
        { error: 'Sources are required to ground the answer.' },
        { status: 400 }
      );
    }

    const result = await answerFollowUp(question, sources, history);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('[/api/followup] Error:', err);
    return NextResponse.json(
      { error: err.message || 'Failed to generate follow-up answer.' },
      { status: 500 }
    );
  }
}

