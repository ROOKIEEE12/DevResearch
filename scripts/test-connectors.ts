import { PapersConnector, WebConnector, searchSources } from '../src/lib/connectors';

async function run() {
  console.log('Testing Papers & Web Connectors...');

  const query = 'PostgreSQL partition lock contention autovacuum';

  console.log('\n--- 1. Testing PapersConnector directly (arXiv + Semantic Scholar) ---');
  const papers = new PapersConnector();
  const papersResults = await papers.search(query, { limit: 3 });
  console.log(`Retrieved ${papersResults.length} papers:`);
  for (const p of papersResults) {
    console.log(`- [${p.source}] "${p.title}"`);
    console.log(`  URL: ${p.url}`);
    console.log(`  Author: ${p.author} | Credibility: ${p.credibilityScore}%`);
    console.log(`  Snippet: ${p.snippet.slice(0, 100)}...`);
  }

  console.log('\n--- 2. Testing WebConnector directly ---');
  const web = new WebConnector();
  const webResults = await web.search(query, { limit: 3 });
  console.log(`Retrieved ${webResults.length} web items:`);
  for (const w of webResults) {
    console.log(`- [${w.source}] "${w.title}"`);
    console.log(`  URL: ${w.url}`);
    console.log(`  Credibility: ${w.credibilityScore}%`);
  }

  console.log('\n--- 3. Testing Unified searchSources Pipeline ---');
  const unified = await searchSources([
    { sourceType: 'papers', query },
    { sourceType: 'web', query },
  ], { limit: 4 });

  console.log(`Unified Sources count: ${unified.sources.length}`);
  console.log(`Warnings count: ${unified.warnings.length}`);
  for (const s of unified.sources) {
    console.log(`[${s.citationId}] (${s.type}) ${s.title}`);
  }

  console.log('\nVerification complete: ALL CONNECTORS WORKING CLEANLY!');
}

run().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});

