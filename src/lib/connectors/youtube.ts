/**
 * youtube.ts
 * YouTube connector — searches videos via the YouTube Data API v3.
 *
 * API docs: https://developers.google.com/youtube/v3/docs/search/list
 * Key:      YOUTUBE_API_KEY env var
 *
 * Returns conference talks, tutorials and deep-dives.
 * Transcript fetching is NOT included (requires extra library + potential ToS issues)
 * — instead we surface the description and auto-generated chapter data where available.
 */

import { BaseSourceResult, ConnectorOptions, SourceConnector } from './types';
import { fetchWithTimeout } from './fetchWithTimeout';
import { getCache, setCache } from './cache';

const YT_API = 'https://www.googleapis.com/youtube/v3';
const API_KEY = process.env.YOUTUBE_API_KEY;

/** Trim text */
function trim(text: string | null | undefined, max = 350): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Parse ISO 8601 duration to human-readable string */
function parseDuration(iso: string): string {
  const match = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return '';
  const h = match[1] ? `${match[1]}h ` : '';
  const m = match[2] ? `${match[2]}m ` : '';
  const s = match[3] ? `${match[3]}s` : '';
  return (h + m + s).trim();
}

/** Map view count to a credibility score */
function viewScore(views: number): number {
  if (views >= 1_000_000) return 90;
  if (views >= 100_000) return 85;
  if (views >= 10_000) return 78;
  if (views >= 1_000) return 72;
  return 65;
}

/** Convert ISO 8601 date string to YYYY-MM-DD */
function isoDate(str: string | undefined): string | undefined {
  return str?.slice(0, 10);
}

export class YouTubeConnector implements SourceConnector {
  name = 'YouTube';
  sourceType = 'youtube' as const;

  async search(query: string, options: ConnectorOptions = {}): Promise<BaseSourceResult[]> {
    const { limit = 5, timeoutMs = 12000 } = options;

    if (!API_KEY) {
      console.warn('[YouTube] YOUTUBE_API_KEY not set — skipping YouTube search');
      return this.fallbackResults(query, limit);
    }

    const cacheKey = `youtube:${query}:${limit}`;
    const cached = getCache<BaseSourceResult[]>(cacheKey);
    if (cached) return cached;

    try {
      // Step 1: Search for videos
      const searchParams = new URLSearchParams({
        part: 'snippet',
        q: query,
        type: 'video',
        order: 'relevance',
        maxResults: String(Math.min(limit * 2, 10)),
        videoCategoryId: '28', // Science & Technology
        key: API_KEY,
      });

      const searchRes = await fetchWithTimeout(`${YT_API}/search?${searchParams}`, {
        timeoutMs,
      });

      if (!searchRes.ok) {
        const err = await searchRes.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(`YouTube Search API ${searchRes.status}: ${err?.error?.message || searchRes.statusText}`);
      }

      const searchData = await searchRes.json() as {
        items: Array<{
          id: { videoId: string };
          snippet: {
            title: string;
            description: string;
            channelTitle: string;
            publishedAt: string;
          };
        }>;
      };

      const videoIds = (searchData.items || []).map((i) => i.id.videoId).join(',');
      if (!videoIds) return [];

      // Step 2: Get video statistics and content details for richer data
      const detailParams = new URLSearchParams({
        part: 'statistics,contentDetails',
        id: videoIds,
        key: API_KEY,
      });

      const detailRes = await fetchWithTimeout(`${YT_API}/videos?${detailParams}`, {
        timeoutMs,
      });

      const statsMap: Record<string, { views: number; duration: string }> = {};
      if (detailRes.ok) {
        const detailData = await detailRes.json() as {
          items: Array<{
            id: string;
            statistics: { viewCount: string };
            contentDetails: { duration: string };
          }>;
        };
        for (const item of detailData.items || []) {
          statsMap[item.id] = {
            views: parseInt(item.statistics.viewCount || '0', 10),
            duration: parseDuration(item.contentDetails.duration || ''),
          };
        }
      }

      // Sort by view count (most popular first)
      const sorted = [...(searchData.items || [])].sort((a, b) => {
        const vA = statsMap[a.id.videoId]?.views || 0;
        const vB = statsMap[b.id.videoId]?.views || 0;
        return vB - vA;
      });

      const results: BaseSourceResult[] = sorted.slice(0, limit).map((item) => {
        const videoId = item.id.videoId;
        const stats = statsMap[videoId];
        const views = stats?.views || 0;
        const duration = stats?.duration || '';

        const snippet = `${item.snippet.channelTitle}${duration ? ` · ${duration}` : ''}${views ? ` · ${formatViews(views)} views` : ''}\n${trim(item.snippet.description, 250)}`;

        return {
          title: `[YouTube] ${item.snippet.title}`,
          url: `https://www.youtube.com/watch?v=${videoId}`,
          snippet,
          source: 'youtube' as const,
          date: isoDate(item.snippet.publishedAt),
          author: item.snippet.channelTitle,
          credibilityScore: viewScore(views),
          metadata: {
            channelTitle: item.snippet.channelTitle,
            stars: views, // reuse stars field for view count
          },
        };
      });

      setCache(cacheKey, results);
      return results;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown YouTube error';
      console.warn('[YouTube] Search failed:', msg);

      // Rethrow so the pipeline can mark it as a warning
      throw new Error(`YouTube: ${msg}`);
    }
  }

  /** Static fallback when no API key is configured */
  private fallbackResults(query: string, limit: number): BaseSourceResult[] {
    const encoded = encodeURIComponent(query);
    return [
      {
        title: `YouTube: Search "${query}"`,
        url: `https://www.youtube.com/results?search_query=${encoded}`,
        snippet: `YOUTUBE_API_KEY not configured — click to search YouTube directly for: ${query}`,
        source: 'youtube' as const,
        credibilityScore: 60,
        metadata: {},
      },
    ].slice(0, limit);
  }
}

function formatViews(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(n);
}

