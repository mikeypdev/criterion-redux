import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Bottleneck from 'bottleneck';

const CATALOG_PATH = path.resolve('public/data/catalog.json');
const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

// Rate limiters
const deepCrawlLimiter = new Bottleneck({ minTime: 2000 }); // 2s for web scraping
const tmdbLimiter = new Bottleneck({ minTime: 250 });      // 4 req/s for TMDB API

async function enrichCatalog(maxItems = 10) {
  let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const originalCount = catalog.length;
  
  if (TMDB_API_KEY) {
    console.log(`>>> Using TMDB API Enrichment (Speed: Fast)`);
    await runTMDBEnrichment(catalog, maxItems);
  } else {
    console.log(`>>> Using Playwright Deep-Crawl (Speed: Respectful)`);
    await runDeepCrawl(catalog, maxItems);
  }

  // Prune films marked for removal (dead links/redirects)
  const finalCatalog = catalog.filter(f => !f._remove);
  const removedCount = originalCount - finalCatalog.length;
  
  if (removedCount > 0) {
    console.log(`>>> Pruned ${removedCount} unavailable films from catalog.`);
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(finalCatalog, null, 2));
}

/**
 * TMDB API Mode: Fast, but requires API Key.
 */
async function runTMDBEnrichment(catalog, maxItems) {
  let updatedCount = 0;
  const isBearer = TMDB_API_KEY.includes('.'); // Simple check for JWT/Bearer token
  
  const apiClient = axios.create({
    baseURL: TMDB_BASE_URL,
    headers: isBearer ? { 'Authorization': `Bearer ${TMDB_API_KEY}` } : {},
    params: isBearer ? {} : { api_key: TMDB_API_KEY }
  });

  for (let i = 0; i < catalog.length && updatedCount < maxItems; i++) {
    const film = catalog[i];
    // Gap-filler logic: Only skip if we have the "Big Three" metadata points
    const hasFullMetadata = film.synopsis && film.runtime > 0 && (film.cast?.length || 0) > 0;
    if (hasFullMetadata && film.enriched) continue;

    try {
      console.log(`[${i+1}/${catalog.length}] TMDB Search: ${film.title} (${film.year})`);
      const searchRes = await tmdbLimiter.schedule(() => apiClient.get('/search/movie', {
        params: { query: film.title, primary_release_year: film.year }
      }));

      const results = searchRes.data.results;
      if (results?.length > 0) {
        const detailRes = await tmdbLimiter.schedule(() => apiClient.get(`/movie/${results[0].id}`, {
          params: { append_to_response: 'credits,videos' }
        }));
        const data = detailRes.data;
        
        // ONLY update if currently empty or placeholder
        if (!film.synopsis || film.synopsis.includes("Classics and discoveries")) {
          film.synopsis = data.overview || film.synopsis;
        }
        
        if (!film.runtime || film.runtime === 0) {
          film.runtime = data.runtime || film.runtime;
        }

        if ((!film.cast || film.cast.length === 0) && data.credits?.cast) {
          film.cast = data.credits.cast.slice(0, 5).map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'actor',
            tmdbId: c.id
          }));
        }

        // technical spec gaps
        if (!film.languages || film.languages.length === 0) {
          if (data.spoken_languages) {
            film.languages = data.spoken_languages.map(l => l.english_name);
          }
        }

        // Note: TMDB doesn't directly provide aspect ratios in the basic movie detail, 
        // it's usually in 'images' but that's overkill. We can stick to languages/runtimes for now.

        // Try to update Director tmdbId as well
        if (data.credits?.crew) {
          const mainDirector = data.credits.crew.find(c => c.job === 'Director');
          if (mainDirector && film.directors.length > 0) {
            film.directors[0].tmdbId = mainDirector.id;
          }
        }

        // Extract Trailer Key
        if (data.videos?.results) {
          const trailer = data.videos.results.find(v => v.site === 'YouTube' && v.type === 'Trailer');
          if (trailer) {
            film.trailerKey = trailer.key;
          }
        }
      }
      film.enriched = true;
      updatedCount++;
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
  const GENERIC_SYNOPSIS = "Classics and discoveries from around the world";

  for (let i = 0; i < catalog.length && updatedCount < maxItems; i++) {
    const film = catalog[i];
    // Don't skip if it has the generic synopsis
    const hasRealSynopsis = film.synopsis && !film.synopsis.includes(GENERIC_SYNOPSIS);
    if (film.enriched || (hasRealSynopsis && film.runtime > 0 && (film.genres?.length || 0) > 0)) continue;
    if (!film.link) continue;

    try {
      console.log(`[${i+1}/${catalog.length}] Deep-Crawl: ${film.title}`);
      await deepCrawlLimiter.schedule(() => page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(1000);

      if (page.url().includes('/browse') && !film.link.includes('/browse')) {
        console.warn(`  - Redirect detected for ${film.title}. Marking for removal.`);
        film._remove = true;
        updatedCount++;
        continue;
      }

      // Extract native assets from landing page
      const assets = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        const trailerAnchor = anchors.find(a => a.href.includes('-trailer'));
        
        // Try to find a large hero/poster image
        const img = document.querySelector('.collection-img, .hero-img, img[src*="vhx.imgix.net/criterionchannelchartersu/assets/"]');
        let highResPoster = img ? img.getAttribute('src') : null;
        if (highResPoster) {
          // Force maximum resolution and quality
          highResPoster = highResPoster
            .replace(/h=\d+/, 'h=2160') // Target 4K height
            .replace(/w=\d+/, 'w=3840') // Target 4K width
            .replace(/q=\d+/, 'q=100')  // Maximum quality
            .replace(/fit=[^&]+/, 'fit=max'); // No cropping, max size
        }

        return {
          trailerLink: trailerAnchor ? trailerAnchor.href : null,
          posterUrl: highResPoster
        };
      });

      if (assets.trailerLink) film.trailerLink = assets.trailerLink;
      if (assets.posterUrl) film.posterUrl = assets.posterUrl;

      // Check for deeper video page (avoid trailers)
      const videoLink = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        const filmAnchor = anchors.find(a => !a.href.includes('-trailer'));
        return filmAnchor ? filmAnchor.href : null;
      });

      if (videoLink) {
        console.log(`  - Navigating to video page for technical specs: ${videoLink}`);
        await page.goto(videoLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(1000);
      }

      const metadata = await page.evaluate(() => {
        const hPattern = /(\d+)\s*h\s*(\d+)?\s*m/i;
        const mPattern = /(\d+)\s*m(in)?/i;
        const timePattern = /(?<!\d:)(?:(\d+):)?([0-5]?\d):([0-5]\d)(?!\d)/;
        
        // Strict aspect ratio pattern: e.g., 1.33:1, 2.39:1 OR 16:9, 4:3
        const aspectPattern = /\b(?:\d\.\d{2}:1|16:9|4:3|1\.37:1|1\.66:1|1\.85:1|2\.35:1|2\.39:1|2\.40:1)\b/;
        
        let runtimeCandidates = [];
        let aspectCandidates = [];
        let languagesFound = [];
        
        const fullText = document.body.innerText;
        const pageAspectMatch = fullText.match(aspectPattern);
        if (pageAspectMatch) aspectCandidates.push(pageAspectMatch[0]);
        if (fullText.includes('English')) languagesFound.push('English');

        const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, li, span, p, .time, .description'));
        for (const el of elements) {
          const t = el.innerText.trim();
          
          const aspectMatch = t.match(aspectPattern);
          if (aspectMatch) aspectCandidates.push(aspectMatch[0]);

          const hm = t.match(hPattern); if (hm) runtimeCandidates.push((parseInt(hm[1], 10) * 60) + parseInt(hm[2] || 0, 10));
          const m = t.match(mPattern); if (m) runtimeCandidates.push(parseInt(m[1], 10));
          
          const tp = t.match(timePattern);
          if (tp && !t.match(aspectPattern)) { 
            const h = parseInt(tp[1] || 0, 10);
            const m = parseInt(tp[2] || 0, 10);
            runtimeCandidates.push((h * 60) + m);
          }
        }
        
        return {
          runtime: runtimeCandidates.length ? Math.max(...runtimeCandidates) : null,
          aspectRatio: aspectCandidates.length ? aspectCandidates[0] : null,
          languages: languagesFound
        };
      });

      if (metadata.runtime) film.runtime = metadata.runtime;
      if (metadata.aspectRatio) film.aspectRatio = metadata.aspectRatio;
      if (metadata.languages.length > 0) {
        film.languages = Array.from(new Set([...(film.languages || []), ...metadata.languages]));
      }

      const metaSynopsis = await page.getAttribute('meta[name="description"]', 'content') || 
                           await page.getAttribute('meta[property="og:description"]', 'content');

      if (metaSynopsis && !metaSynopsis.includes(GENERIC_SYNOPSIS)) {
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
      film.enriched = true;
      updatedCount++;
    } catch (err) {
      console.error(`  - Crawl error for ${film.title}:`, err.message);
    }
  }
  await browser.close();
}

const limit = parseInt(process.env.LIMIT || '10', 10);
enrichCatalog(limit);
