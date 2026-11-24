/**
 * test-connectors.ts — Tests all 5 source connectors
 * Usage: npx tsx scripts/test-connectors.ts
 */
import { WebConnector } from '../src/lib/connectors/web';
import { PapersConnector } from '../src/lib/connectors/papers';
import { GitHubConnector } from '../src/lib/connectors/github';
import { RedditHNConnector } from '../src/lib/connectors/reddit';
import { YouTubeConnector } from '../src/lib/connectors/youtube';
import { searchSources } from '../src/lib/connectors';

const QUERY = 'React Server Components performance optimization';
const OPTS = { limit: 3, timeoutMs: 15000 };

async function testConnector(name: string, fn: () => Promise<{ title: string; url: string; credibilityScore?: number }[]>) {
  console.log(`\n--- Testing ${name} ---`);
  try {
    const results = await fn();
    console.log(`✅ ${name}: ${results.length} results`);
    for (const r of results) {
      console.log(`  • [${r.credibilityScore ?? '?'}%] ${r.title.slice(0, 70)}`);
      console.log(`    ${r.url.slice(0, 80)}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.log(`⚠️  ${name}: ${msg}`);
  }
}

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' DevResearch — Connector Test Suite');
  console.log(` Query: "${QUERY}"`);
  console.log('═══════════════════════════════════════════════════════');

  await testConnector('WebConnector (Tavily/Brave)', () =>
    new WebConnector().search(QUERY, OPTS)
  );

  await testConnector('PapersConnector (arXiv + Semantic Scholar)', () =>
    new PapersConnector().search(QUERY, OPTS)
  );

  await testConnector('GitHubConnector (Issues + Repos)', () =>
    new GitHubConnector().search(QUERY, OPTS)
  );

  await testConnector('RedditHNConnector (Reddit + HN)', () =>
    new RedditHNConnector().search(QUERY, OPTS)
  );

  await testConnector('YouTubeConnector (YouTube Data API)', () =>
    new YouTubeConnector().search(QUERY, OPTS)
  );

  console.log('\n--- Unified searchSources Pipeline (all 5 sources) ---');
  try {
    const unified = await searchSources(
      [
        { sourceType: 'web', query: QUERY },
        { sourceType: 'papers', query: QUERY },
        { sourceType: 'github', query: QUERY },
        { sourceType: 'reddit_hn', query: QUERY },
        { sourceType: 'youtube', query: QUERY },
      ],
      { limit: 3, timeoutMs: 15000 }
    );

    console.log(`\n✅ Unified pipeline: ${unified.sources.length} deduplicated sources`);
    if (unified.warnings.length > 0) {
      console.log(`⚠️  Warnings (${unified.warnings.length}):`);
      unified.warnings.forEach((w) => console.log(`   · ${w}`));
    }
    console.log('\nSources (citation order):');
    for (const s of unified.sources) {
      console.log(`  [${s.citationId}] (${s.type}) ${s.title.slice(0, 65)}`);
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error('❌ Unified pipeline error:', msg);
  }

  console.log('\n═══════════════════════════════════════════════════════');
  console.log(' Test suite complete.');
  console.log('═══════════════════════════════════════════════════════');
}

run().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
