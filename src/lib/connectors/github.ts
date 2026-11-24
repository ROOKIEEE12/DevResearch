/**
 * github.ts
 * GitHub connector — searches Issues, Pull Requests, Discussions, and Commits
 * via the official GitHub REST Search API v3.
 *
 * API docs: https://docs.github.com/en/rest/search/search
 * Rate limits: 10 req/min unauthenticated, 30 req/min with token
 * Token: GITHUB_TOKEN env var (optional but highly recommended)
 */

import { BaseSourceResult, ConnectorOptions, SourceConnector } from './types';
import { fetchWithTimeout } from './fetchWithTimeout';
import { getCache, setCache } from './cache';

const GITHUB_API = 'https://api.github.com';
const TOKEN = process.env.GITHUB_TOKEN;

function githubHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'DevResearch/1.0',
  };
  if (TOKEN) {
    headers['Authorization'] = `Bearer ${TOKEN}`;
  }
  return headers;
}

/** Credibility score for a GitHub result based on repo stars */
function starScore(stars: number): number {
  if (stars >= 10000) return 92;
  if (stars >= 1000) return 85;
  if (stars >= 100) return 78;
  return 70;
}

/** Trim text to a max length */
function trim(text: string | null | undefined, max = 300): string {
  if (!text) return '';
  return text.length > max ? text.slice(0, max) + '…' : text;
}

/** Format ISO date to YYYY-MM-DD */
function isoDate(dateStr: string | null | undefined): string | undefined {
  if (!dateStr) return undefined;
  return dateStr.slice(0, 10);
}

export class GitHubConnector implements SourceConnector {
  name = 'GitHub';
  sourceType = 'github' as const;

  async search(query: string, options: ConnectorOptions = {}): Promise<BaseSourceResult[]> {
    const { limit = 5, timeoutMs = 12000 } = options;
    const cacheKey = `github:${query}:${limit}`;
    const cached = getCache<BaseSourceResult[]>(cacheKey);
    if (cached) return cached;

    const results: BaseSourceResult[] = [];

    // Run issues/PRs and code searches in parallel
    const [issueResults, repoResults] = await Promise.allSettled([
      this.searchIssues(query, Math.ceil(limit * 0.6), timeoutMs),
      this.searchRepositories(query, Math.floor(limit * 0.4), timeoutMs),
    ]);

    if (issueResults.status === 'fulfilled') results.push(...issueResults.value);
    if (repoResults.status === 'fulfilled') results.push(...repoResults.value);

    if (results.length === 0) {
      console.warn('[GitHub] Both issue and repo searches returned no results');
    }

    const sliced = results.slice(0, limit);
    setCache(cacheKey, sliced);
    return sliced;
  }

  /** Search GitHub Issues and PRs */
  private async searchIssues(
    query: string,
    limit: number,
    timeoutMs: number
  ): Promise<BaseSourceResult[]> {
    // Encode query — GitHub search supports q= with qualifiers
    const q = encodeURIComponent(`${query} is:issue`);
    const url = `${GITHUB_API}/search/issues?q=${q}&sort=reactions&order=desc&per_page=${Math.min(limit, 10)}`;

    const res = await fetchWithTimeout(url, {
      headers: githubHeaders(),
      timeoutMs,
    });

    if (!res.ok) {
      if (res.status === 403 || res.status === 429) {
        throw new Error(`GitHub rate limit hit (${res.status}). Set GITHUB_TOKEN in .env for higher limits.`);
      }
      throw new Error(`GitHub Issues API returned ${res.status}`);
    }

    const data = await res.json() as {
      items: Array<{
        title: string;
        html_url: string;
        body: string | null;
        created_at: string;
        user: { login: string } | null;
        reactions: { total_count: number };
        pull_request?: unknown;
        repository_url: string;
        labels: Array<{ name: string }>;
        state: string;
      }>;
    };

    return (data.items || []).map((item) => {
      const isPR = !!item.pull_request;
      const labels = item.labels.map((l) => l.name).join(', ');
      const repoName = item.repository_url.split('/').slice(-2).join('/');
      const snippet = trim(item.body) ||
        `${isPR ? 'Pull Request' : 'Issue'} in ${repoName}${labels ? ` [${labels}]` : ''} — ${item.state}`;

      return {
        title: `[${isPR ? 'PR' : 'Issue'}] ${item.title} — ${repoName}`,
        url: item.html_url,
        snippet,
        source: 'github' as const,
        date: isoDate(item.created_at),
        author: item.user?.login,
        credibilityScore: 75,
        metadata: {
          score: item.reactions.total_count,
          isOfficialDoc: false,
        },
      };
    });
  }

  /** Search GitHub repositories — surfaces README/description for context */
  private async searchRepositories(
    query: string,
    limit: number,
    timeoutMs: number
  ): Promise<BaseSourceResult[]> {
    const q = encodeURIComponent(query);
    const url = `${GITHUB_API}/search/repositories?q=${q}&sort=stars&order=desc&per_page=${Math.min(limit, 5)}`;

    const res = await fetchWithTimeout(url, {
      headers: githubHeaders(),
      timeoutMs,
    });

    if (!res.ok) {
      throw new Error(`GitHub Repos API returned ${res.status}`);
    }

    const data = await res.json() as {
      items: Array<{
        full_name: string;
        html_url: string;
        description: string | null;
        stargazers_count: number;
        updated_at: string;
        owner: { login: string };
        language: string | null;
        topics: string[];
      }>;
    };

    return (data.items || []).map((repo) => ({
      title: `[Repo] ${repo.full_name}${repo.language ? ` (${repo.language})` : ''}`,
      url: repo.html_url,
      snippet: trim(repo.description) ||
        `${repo.full_name}: ${repo.stargazers_count.toLocaleString()} ⭐${repo.topics.length ? ' · ' + repo.topics.slice(0, 3).join(', ') : ''}`,
      source: 'github' as const,
      date: isoDate(repo.updated_at),
      author: repo.owner.login,
      credibilityScore: starScore(repo.stargazers_count),
      metadata: {
        stars: repo.stargazers_count,
        isOfficialDoc: false,
      },
    }));
  }
}

