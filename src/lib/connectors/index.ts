import { SourceType, SourceItem } from '@/types/research';
import { BaseSourceResult, ConnectorExecutionResult, ConnectorOptions, SourceConnector } from './types';
import { WebConnector } from './web';
import { PapersConnector } from './papers';
import { GitHubConnector } from './github';
import { RedditHNConnector } from './reddit';
import { YouTubeConnector } from './youtube';

// All registered connectors
export const connectors: Record<string, SourceConnector> = {
  web: new WebConnector(),
  papers: new PapersConnector(),
  github: new GitHubConnector(),
  reddit_hn: new RedditHNConnector(),
  youtube: new YouTubeConnector(),
};

export interface SearchSourcesOptions extends ConnectorOptions {
  depth?: 'quick' | 'standard' | 'deep';
}

export interface SearchSourcesResponse {
  sources: SourceItem[];
  warnings: string[];
  executionResults: ConnectorExecutionResult[];
}

/**
 * Searches across multiple source connectors in parallel with graceful failure handling.
 */
export async function searchSources(
  queries: Array<{ sourceType: SourceType; query: string }>,
  options: SearchSourcesOptions = {}
): Promise<SearchSourcesResponse> {
  const warnings: string[] = [];
  const executionResults: ConnectorExecutionResult[] = [];
  const allResults: BaseSourceResult[] = [];

  const promises = queries.map(async ({ sourceType, query }) => {
    const start = Date.now();
    const connector = connectors[sourceType];

    if (!connector) {
      warnings.push(`Connector for '${sourceType}' is not yet enabled or configured.`);
      return;
    }

    try {
      const results = await connector.search(query, options);
      const durationMs = Date.now() - start;

      executionResults.push({
        sourceType,
        results,
        durationMs,
      });

      allResults.push(...results);
    } catch (err: any) {
      const durationMs = Date.now() - start;
      const errorMsg = err.message || 'Unknown connector error';
      console.warn(`[Connectors] Error querying ${sourceType}:`, errorMsg);
      warnings.push(`Source '${sourceType}' warning: ${errorMsg}`);

      executionResults.push({
        sourceType,
        results: [],
        error: errorMsg,
        durationMs,
      });
    }
  });

  await Promise.allSettled(promises);

  // Deduplicate by normalized URL
  const seenUrls = new Set<string>();
  const deduplicated: BaseSourceResult[] = [];

  for (const item of allResults) {
    const cleanUrl = normalizeUrl(item.url);
    if (!seenUrls.has(cleanUrl)) {
      seenUrls.add(cleanUrl);
      deduplicated.push(item);
    }
  }

  // Sort by credibility score descending, then date
  deduplicated.sort((a, b) => {
    const credA = a.credibilityScore || 85;
    const credB = b.credibilityScore || 85;
    if (credB !== credA) return credB - credA;
    return new Date(b.date || '1970').getTime() - new Date(a.date || '1970').getTime();
  });

  // Assign sequential citation IDs [1], [2], [3]...
  const sources: SourceItem[] = deduplicated.map((item, idx) => ({
    id: `src-${Date.now()}-${idx + 1}`,
    citationId: idx + 1,
    type: item.source,
    title: item.title,
    url: item.url,
    snippet: item.snippet,
    date: item.date,
    author: item.author,
    credibilityScore: item.credibilityScore,
    metadata: item.metadata,
  }));

  return {
    sources,
    warnings,
    executionResults,
  };
}

function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '').toLowerCase();
  } catch {
    return url.toLowerCase().trim();
  }
}

export * from './types';
export * from './cache';
export * from './web';
export * from './papers';
export * from './github';
export * from './reddit';
export * from './youtube';

