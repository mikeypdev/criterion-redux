import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve('public/data/catalog.json');
const CRITERION_FILMS_URL = 'https://films.criterionchannel.com/';

const GENRE_MAP = {
  'Action/Adventure': 'action-adventure',
  'Animation': 'animation',
  'Avant-garde': 'avant-garde',
  'Comedy': 'comedy',
  'Crime': 'crime',
  'Documentary': 'documentary',
  'Drama': 'drama',
  'Fantasy': 'fantasy',
  'Film Noir': 'film-noir',
  'Horror': 'horror',
  'Musical': 'musical',
  'Romance': 'romance',
  'Samurai': 'samurai',
  'Science Fiction': 'science-fiction',
  'Shorts': 'shorts',
  'Silent': 'silent',
  'Thriller': 'thriller',
  'War': 'war',
  'Western': 'western'
};

async function scrapeGenres() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error('Catalog not found. Run scraper.js first.');
    return;
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const filmMap = new Map(catalog.map(f => [f.id, f]));

  console.log(`Starting Playwright-based genre scraping for ${Object.keys(GENRE_MAP).length} genres...`);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  for (const [displayName, value] of Object.entries(GENRE_MAP)) {
    console.log(`Fetching films for genre: ${displayName} (${value})...`);
    try {
      const url = `${CRITERION_FILMS_URL}?genre=${value}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Wait for results count to be something (even 0 if it really is 0)
      await page.waitForSelector('.criterion-channel__filters-results--desktop b', { timeout: 10000 }).catch(() => null);
      
      const filmIds = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('tr.criterion-channel__tr td.criterion-channel__td--title a'));
        return links.map(a => a.href.split('/').filter(Boolean).pop());
      });

      let count = 0;
      filmIds.forEach(id => {
        const film = filmMap.get(id);
        if (film) {
          if (!film.genres) film.genres = [];
          if (!film.genres.includes(displayName)) {
            film.genres.push(displayName);
            count++;
          }
        }
      });

      console.log(`  Added "${displayName}" to ${count} films (Total in genre on page: ${filmIds.length}).`);
    } catch (error) {
      console.error(`  Failed to fetch genre "${displayName}":`, error.message);
    }
  }

  await browser.close();

  // Deduplicate and sort genres for all films
  catalog.forEach(film => {
    if (film.genres) {
      film.genres = Array.from(new Set(film.genres)).sort();
    }
  });

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log('Successfully updated catalog with Criterion genres.');
}

scrapeGenres();
