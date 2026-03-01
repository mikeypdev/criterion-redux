import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Bottleneck from 'bottleneck';

const CATALOG_PATH = path.resolve('src/data/catalog.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Rate limiters
const deepCrawlLimiter = new Bottleneck({ minTime: 2000 }); // 2s for web scraping
const tmdbLimiter = new Bottleneck({ minTime: 250 });      // 4 req/s for TMDB API

async function enrichCatalog(maxItems = 10) {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  
  if (TMDB_API_KEY) {
    console.log(`>>> Using TMDB API Enrichment (Speed: Fast)`);
    await runTMDBEnrichment(catalog, maxItems);
  } else {
    console.log(`>>> Using Playwright Deep-Crawl (Speed: Respectful)`);
    await runDeepCrawl(catalog, maxItems);
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
}

/**
 * TMDB API Mode: Fast, but requires API Key.
 */
async function runTMDBEnrichment(catalog, maxItems) {
  let updatedCount = 0;
  for (let i = 0; i < catalog.length && updatedCount < maxItems; i++) {
    const film = catalog[i];
    if (film.synopsis && film.runtime > 0) continue;

    try {
      console.log(`[${i+1}/${catalog.length}] TMDB Search: ${film.title} (${film.year})`);
      const searchRes = await tmdbLimiter.schedule(() => axios.get(`${TMDB_BASE_URL}/search/movie`, {
        params: { api_key: TMDB_API_KEY, query: film.title, primary_release_year: film.year }
      }));

      const results = searchRes.data.results;
      if (results?.length > 0) {
        const detailRes = await tmdbLimiter.schedule(() => axios.get(`${TMDB_BASE_URL}/movie/${results[0].id}`, {
          params: { api_key: TMDB_API_KEY, append_to_response: 'credits' }
        }));
        const data = detailRes.data;
        film.synopsis = data.overview || film.synopsis;
        film.runtime = data.runtime || film.runtime;
        if (data.credits?.cast) {
          film.cast = data.credits.cast.slice(0, 5).map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'actor'
          }));
        }
        updatedCount++;
      }
    } catch (err) {
      console.error(`  - TMDB error for ${film.title}:`, err.message);
    }
  }
}

/**
 * Deep Crawl Mode: No key required, extracts exactly what's on Criterion Channel.
 */
async function runDeepCrawl(catalog, maxItems) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let updatedCount = 0;

  for (let i = 0; i < catalog.length && updatedCount < maxItems; i++) {
    const film = catalog[i];
    if (film.synopsis && film.runtime > 0 && (film.genres?.length || 0) > 0) continue;
    if (!film.link) continue;

    try {
      console.log(`[${i+1}/${catalog.length}] Deep-Crawl: ${film.title}`);
      await deepCrawlLimiter.schedule(() => page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(1000);

      const runtimeFound = await page.evaluate(() => {
        const hPattern = /(\d+)\s*h\s*(\d+)?\s*m/i;
        const mPattern = /(\d+)\s*m(in)?/i;
        const timePattern = /(\d+:)?\d+:\d+/;
        let candidates = [];
        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, li, span, p, .time'));
        for (const el of elements) {
          const t = el.innerText.trim();
          const hm = t.match(hPattern); if (hm) candidates.push((parseInt(hm[1], 10) * 60) + parseInt(hm[2] || 0, 10));
          const m = t.match(mPattern); if (m) candidates.push(parseInt(m[1], 10));
          const tp = t.match(timePattern);
          if (tp) {
            const parts = tp[0].split(':').map(p => parseInt(p, 10));
            if (parts.length === 3) candidates.push((parts[0] * 60) + parts[1]);
            else if (parts.length === 2) candidates.push(parts[0]);
          }
        }
        return candidates.length ? Math.max(...candidates) : null;
      });

      if (runtimeFound) film.runtime = runtimeFound;

      const metaSynopsis = await page.getAttribute('meta[name="description"]', 'content') || 
                           await page.getAttribute('meta[property="og:description"]', 'content');

      if (metaSynopsis) {
        film.synopsis = metaSynopsis.replace(/^Directed by[^•]+•[^•]+•[^\n]+(?:\n|$)/i, '').trim();
        if (metaSynopsis.toLowerCase().includes('starring')) {
          const castMatch = metaSynopsis.match(/starring\s+([^•\.\n]+)/i);
          if (castMatch) {
            film.cast = castMatch[1].split(/,|and/).map(n => ({
              id: n.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: n.trim().replace(/\.$/, ''),
              role: 'actor'
            })).filter(c => c.name.length > 2);
          }
        }
      }
      updatedCount++;
    } catch (err) {
      console.error(`  - Crawl error for ${film.title}:`, err.message);
    }
  }
  await browser.close();
}

const limit = parseInt(process.env.LIMIT || '10', 10);
enrichCatalog(limit);
