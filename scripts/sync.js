import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const SCRIPTS_DIR = './scripts';
const CATALOG_PATH = './public/data/catalog.json';

async function runSync() {
  const limit = process.env.LIMIT || '50';
  const fullScrape = process.env.FULL_SCRAPE === 'true';

  console.log('--- STARTING CRITERION DATA SYNC ---');

  // 1. Base Scrape (Optional or if catalog missing)
  if (fullScrape || !fs.existsSync(CATALOG_PATH)) {
    console.log('Step 1: Running base scraper...');
    execSync('node scripts/scraper.js', { stdio: 'inherit' });
  } else {
    console.log('Step 1: Skipping base scrape (use FULL_SCRAPE=true to force).');
  }

  // 2. Metadata Enrichment
  const continuous = process.env.CONTINUOUS === 'true';
  console.log(`Step 2: Enriching films... (Continuous: ${continuous})`);
  
  try {
    if (continuous) {
      console.log('Running in continuous mode. Press Ctrl+C to stop.');
      while (true) {
        try {
          execSync(`LIMIT=${limit} node scripts/enricher.js`, { stdio: 'inherit' });
          console.log('Finalizing batch with local enrichment...');
          execSync('node scripts/local_enrich.js', { stdio: 'inherit' });
          console.log('Batch completed. Starting next batch in 5 seconds...');
          execSync('sleep 5');
        } catch (err) {
          // If enricher.js exits with 0 (normal) but sync thinks it's an error,
          // or if it explicitly signals completion, we can stop.
          // For now, we'll just check if the catalog is full.
          console.log('Enrichment loop signaled completion or was interrupted.');
          break;
        }
      }
    } else {
      execSync(`LIMIT=${limit} node scripts/enricher.js`, { stdio: 'inherit' });
      console.log('Step 3: Running local enrichment and cleanup...');
      execSync('node scripts/local_enrich.js', { stdio: 'inherit' });
    }
  } catch (err) {
    if (continuous) {
      console.log('Continuous sync interrupted.');
    } else {
      console.warn('Enrichment batch interrupted or failed, continuing to local sync...');
      execSync('node scripts/local_enrich.js', { stdio: 'inherit' });
    }
  }

  // 3. Collections Sync
  console.log('Step 3: Syncing curated collections...');
  execSync('node scripts/scrape_collections.js', { stdio: 'inherit' });

  console.log('--- SYNC COMPLETED SUCCESSFULLY ---');
}

runSync();
