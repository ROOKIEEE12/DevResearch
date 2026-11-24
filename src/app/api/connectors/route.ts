import { NextRequest, NextResponse } from 'next/server';
import { searchSources } from '@/lib/connectors';
import { SourceType } from '@/types/research';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get('query') || 'PostgreSQL partition vacuum deadlocks';
    const sourcesParam = searchParams.get('sources') || 'web,papers';

    const sourceTypes = sourcesParam.split(',').map((s) => s.trim()) as SourceType[];

    const queries = sourceTypes.map((sourceType) => ({
      sourceType,
      query,
    }));

    const result = await searchSources(queries, {
      limit: 5,
      timeoutMs: 10000,
    });

    return NextResponse.json({
      success: true,
      query,
      sourcesCount: result.sources.length,
      sources: result.sources,
      warnings: result.warnings,
      executionResults: result.executionResults,
    });
  } catch (error: any) {
    console.error('[API /api/connectors GET Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error while searching sources',
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { queries, depth = 'standard' } = body;

    if (!queries || !Array.isArray(queries) || queries.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Expected "queries" array with { sourceType, query } items' },
        { status: 400 }
      );
    }

    const limit = depth === 'quick' ? 3 : depth === 'deep' ? 8 : 5;

    const result = await searchSources(queries, {
      limit,
      timeoutMs: 12000,
      depth,
    });

    return NextResponse.json({
      success: true,
      sourcesCount: result.sources.length,
      sources: result.sources,
      warnings: result.warnings,
      executionResults: result.executionResults,
    });
  } catch (error: any) {
    console.error('[API /api/connectors POST Error]:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to search sources',
      },
      { status: 500 }
    );
  }
}

