import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const COLLECTIONS_OUTPUT = path.resolve('public/data/collections.json');

async function scrapeCollections() {
  console.log('--- SCRAPING CRITERION COLLECTIONS ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://www.criterionchannel.com/browse', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Scroll multiple times to trigger lazy loading of browse rows
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => window.scrollBy(0, 1000));
      await page.waitForTimeout(500);
    }

    const collections = await page.evaluate(() => {
      // Criterion uses 'browse-row' for each horizontal collection
      const rows = Array.from(document.querySelectorAll('.browse-row, .media-list-container'));
      return rows.map((row, index) => {
        const titleEl = row.querySelector('.browse-row-title, .media-list-header-title, h2, h3');
        const title = titleEl ? titleEl.innerText.trim() : `Collection ${index + 1}`;
        
        // Find all links that might be films
        const links = Array.from(row.querySelectorAll('a'));
        const filmIds = links.map(a => {
          const href = a.getAttribute('href') || '';
          // Slugs are usually the last part of the path
          return href.split('/').filter(Boolean).pop();
        }).filter(id => id && id.length > 3 && !['browse', 'search', 'login', 'signup'].includes(id));

        // De-duplicate film IDs
        const uniqueFilmIds = Array.from(new Set(filmIds));

        return {
          id: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
          title,
          description: `A curated selection from the ${title} series.`,
          filmIds: uniqueFilmIds
        };
      }).filter(c => c.filmIds.length > 3);
    });

    console.log(`Found ${collections.length} raw collection rows.`);
    
    // Filter out some of the more generic rows if needed
    const finalCollections = collections.slice(0, 50);
    
    fs.writeFileSync(COLLECTIONS_OUTPUT, JSON.stringify(finalCollections, null, 2));
    console.log(`Saved ${finalCollections.length} collections to ${COLLECTIONS_OUTPUT}`);

  } catch (err) {
    console.error('Scraping collections failed:', err.message);
  } finally {
    await browser.close();
  }
}

scrapeCollections();
