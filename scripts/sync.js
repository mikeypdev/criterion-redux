import { execSync } from 'child_process';
import fs from 'fs';

const CATALOG_PATH = './public/data/catalog.json';

async function runSync() {
  const limit = process.env.LIMIT || '1000'; // TMDB API extensive Stage 2
  const deepCrawlLimit = process.env.DEEP_CRAWL_LIMIT || '30'; // Playwright slow Stage 1

  console.log('--- STARTING CRITERION DATA SYNC ---');

  // Step 1: Base Scrape (Always runs - fast HTML scrape of index pages)
  console.log('Step 1: Running base scraper to catch new arrivals...');
  execSync('node scripts/scraper.js', { stdio: 'inherit' });

  // Step 2: Sync Curated Collections (Discovers custom sitemap files and adds placeholders)
  console.log('Step 2: Syncing curated collections from sitemap (Axios active checked)...');
  execSync('node scripts/scrape_collections.js', { stdio: 'inherit' });

  // Step 3: Metadata Enrichment (Run Stage 1 and Stage 2 with distinct bound limits)
  console.log(`Step 3: Enriching films (TMDB API Limit: ${limit}, Playwright Limit: ${deepCrawlLimit})...`);
  try {
    execSync(`LIMIT=${limit} DEEP_CRAWL_LIMIT=${deepCrawlLimit} node scripts/enricher.js`, { stdio: 'inherit' });
  } catch (err) {
    console.warn('Enrichment batch failed, continuing to local sync...');
  }

  // Step 4: Local Enrichment (computes aspect ratio fallback, language defaults, indices)
  console.log('Step 4: Running local enrichment and cleanup...');
  execSync('node scripts/local_enrich.js', { stdio: 'inherit' });

  // Step 5: Sync Criterion Genres
  console.log('Step 5: Syncing Criterion genres...');
  execSync('node scripts/scrape_genres.js', { stdio: 'inherit' });

  // Step 6: Update Sync Status
  const status = {
    lastUpdated: new Date().toISOString(),
    filmCount: JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8')).length
  };
  fs.writeFileSync('./public/data/status.json', JSON.stringify(status, null, 2));
  console.log(`Step 6: Updated status.json with timestamp: ${status.lastUpdated}`);

  console.log('--- SYNC COMPLETED SUCCESSFULLY ---');
}

runSync();
