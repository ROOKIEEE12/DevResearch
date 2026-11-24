/**
 * reddit.ts
 * Reddit + Hacker News connector.
 *
 * Reddit:       Public JSON API  — reddit.com/r/<subreddits>/search.json (no auth required)
 * Hacker News:  Algolia HN API   — hn.algolia.com (completely open)
 *
 * Both are public REST endpoints — no scraping, no TOS violation.
 */

import { BaseSourceResult, ConnectorOptions, SourceConnector } from './types';
import { fetchWithTimeout } from './fetchWithTimeout';
import { getCache, setCache } from './cache';

/** Trim text */
function trim(text: string | null | undefined, max = 300): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

function isoDate(ts: number): string {
  return new Date(ts * 1000).toISOString().slice(0, 10);
}

function isoDateFromStr(str: string): string {
  return new Date(str).toISOString().slice(0, 10);
}

// Subreddits that are most valuable for developers
const DEV_SUBREDDITS = [
  'programming',
  'webdev',
  'learnprogramming',
  'javascript',
  'typescript',
  'python',
  'rust',
  'golang',
  'devops',
  'softwareengineering',
  'cscareerquestions',
  'MachineLearning',
  'LocalLLaMA',
].join('+');

export class RedditHNConnector implements SourceConnector {
  name = 'Reddit + Hacker News';
  sourceType = 'reddit_hn' as const;

  async search(query: string, options: ConnectorOptions = {}): Promise<BaseSourceResult[]> {
    const { limit = 5, timeoutMs = 12000 } = options;
    const cacheKey = `reddit_hn:${query}:${limit}`;
    const cached = getCache<BaseSourceResult[]>(cacheKey);
    if (cached) return cached;

    const half = Math.ceil(limit / 2);

    // Run Reddit and HN in parallel
    const [redditRes, hnRes] = await Promise.allSettled([
      this.searchReddit(query, half, timeoutMs),
      this.searchHackerNews(query, limit - half, timeoutMs),
    ]);

    const results: BaseSourceResult[] = [];
    if (redditRes.status === 'fulfilled') results.push(...redditRes.value);
    if (hnRes.status === 'fulfilled') results.push(...hnRes.value);

    if (redditRes.status === 'rejected') {
      console.warn('[RedditHN] Reddit search failed:', redditRes.reason?.message);
    }
    if (hnRes.status === 'rejected') {
      console.warn('[RedditHN] HN search failed:', hnRes.reason?.message);
    }

    const sliced = results.slice(0, limit);
    setCache(cacheKey, sliced);
    return sliced;
  }

  // ─── Reddit ───────────────────────────────────────────────────────────────────

  private async searchReddit(
    query: string,
    limit: number,
    timeoutMs: number
  ): Promise<BaseSourceResult[]> {
    // Use multi-subreddit search for developer-relevant posts
    const encoded = encodeURIComponent(query);
    const url = `https://www.reddit.com/r/${DEV_SUBREDDITS}/search.json?q=${encoded}&sort=relevance&limit=${Math.min(limit * 2, 10)}&restrict_sr=1&t=year`;

    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'DevResearch/1.0 (open source dev tool)' },
      timeoutMs,
    });

    if (!res.ok) {
      throw new Error(`Reddit API returned HTTP ${res.status}`);
    }

    const data = await res.json() as {
      data: {
        children: Array<{
          data: {
            title: string;
            url: string;
            selftext: string;
            subreddit: string;
            author: string;
            created_utc: number;
            score: number;
            num_comments: number;
            permalink: string;
            is_self: boolean;
            upvote_ratio: number;
          };
        }>;
      };
    };

    return (data?.data?.children || [])
      .filter((p) => p.data.score > 5) // filter out low-quality posts
      .slice(0, limit)
      .map((p) => {
        const post = p.data;
        const snippet = trim(post.selftext) ||
          `r/${post.subreddit} · ${post.score.toLocaleString()} upvotes · ${post.num_comments} comments`;

        return {
          title: `[Reddit r/${post.subreddit}] ${post.title}`,
          url: `https://reddit.com${post.permalink}`,
          snippet,
          source: 'reddit_hn' as const,
          date: isoDate(post.created_utc),
          author: `u/${post.author}`,
          credibilityScore: redditScore(post.score, post.upvote_ratio),
          metadata: {
            score: post.score,
            subreddit: post.subreddit,
          },
        };
      });
  }

  // ─── Hacker News (Algolia API) ────────────────────────────────────────────────

  private async searchHackerNews(
    query: string,
    limit: number,
    timeoutMs: number
  ): Promise<BaseSourceResult[]> {
    const encoded = encodeURIComponent(query);
    // tags=story filters to top-level posts only (not comments)
    const url = `https://hn.algolia.com/api/v1/search?query=${encoded}&tags=story&hitsPerPage=${Math.min(limit * 2, 10)}`;

    const res = await fetchWithTimeout(url, {
      headers: { 'User-Agent': 'DevResearch/1.0' },
      timeoutMs,
    });

    if (!res.ok) {
      throw new Error(`HN Algolia API returned HTTP ${res.status}`);
    }

    const data = await res.json() as {
      hits: Array<{
        objectID: string;
        title: string;
        url: string | null;
        story_text: string | null;
        author: string;
        created_at: string;
        points: number;
        num_comments: number;
      }>;
    };

    return (data?.hits || [])
      .filter((h) => h.points > 5)
      .slice(0, limit)
      .map((hit) => {
        const hnLink = `https://news.ycombinator.com/item?id=${hit.objectID}`;
        const externalUrl = hit.url || hnLink;
        const snippet = trim(hit.story_text) ||
          `HN discussion — ${hit.points.toLocaleString()} points · ${hit.num_comments} comments`;

        return {
          title: `[HN] ${hit.title}`,
          url: externalUrl,
          snippet,
          source: 'reddit_hn' as const,
          date: isoDateFromStr(hit.created_at),
          author: hit.author,
          credibilityScore: hnScore(hit.points),
          metadata: {
            score: hit.points,
          },
        };
      });
  }
}

/** Map Reddit score + ratio to a credibility score (60-88) */
function redditScore(score: number, ratio: number): number {
  const base = ratio >= 0.9 ? 85 : ratio >= 0.75 ? 78 : 68;
  if (score >= 1000) return Math.min(base + 3, 88);
  if (score >= 100) return base;
  return base - 5;
}

/** Map HN points to credibility score (65-90) */
function hnScore(points: number): number {
  if (points >= 500) return 90;
  if (points >= 100) return 85;
  if (points >= 50) return 80;
  if (points >= 10) return 72;
  return 65;
}

