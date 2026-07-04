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
const tmdbLimiter = new Bottleneck({ minTime: 40 });       // 25 req/s for TMDB API

const GENERIC_SYNOPSIS = "Classics and discoveries from around the world";
function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function normalizePersonName(name) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function personMatches(a, b) {
  if (!a || !b) return false;
  return normalizePersonName(a) === normalizePersonName(b);
}

function mergePeople(criterionList, tmdbList) {
  if (!criterionList || criterionList.length === 0) return tmdbList || [];
  if (!tmdbList || tmdbList.length === 0) return criterionList;

  const result = criterionList.map(p => ({ ...p }));

  for (const tmdbPerson of tmdbList) {
    const existingIdx = result.findIndex(p => personMatches(p.name, tmdbPerson.name));
    if (existingIdx >= 0) {
      if (tmdbPerson.tmdbId && !result[existingIdx].tmdbId) {
        result[existingIdx].tmdbId = tmdbPerson.tmdbId;
      }
    } else {
      result.push({ ...tmdbPerson });
    }
  }
  return result;
}

function extractDirectorFromSynopsis(synopsis) {
  if (!synopsis) return null;
  const match = synopsis.match(/Directed by\s+([^•.\n]+)/i);
  if (!match) return null;
  return normalizeString(match[1].trim());
}

function pickBestResult(results, film) {
  if (!results || results.length === 0) return null;
  if (results.length === 1) return results[0];

  const filmYear = film.year;
  const synopsisDirector = extractDirectorFromSynopsis(film.synopsis);
  const existingDirector = film.directors?.[0]?.name
    ? normalizeString(film.directors[0].name)
    : null;
  const knownDirector = synopsisDirector || existingDirector;

  const scored = results.map(r => {
    let score = 0;
    const releaseYear = r.release_date ? parseInt(r.release_date.substring(0, 4), 10) : null;
    if (filmYear && releaseYear) {
      const diff = Math.abs(filmYear - releaseYear);
      if (diff === 0) score += 100;
      else if (diff <= 1) score += 80;
      else if (diff <= 2) score += 40;
      else score -= diff;
    }
    if (knownDirector) {
      const overview = (r.overview || '').toLowerCase();
      const titleNorm = normalizeString(r.original_title || r.title || '');
      if (overview.includes(knownDirector)) score += 60;
      if (titleNorm.includes(knownDirector)) score += 60;
    }
    score += (r.popularity || 0) * 0.1;
    score += (r.vote_count || 0) * 0.01;
    return { result: r, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].result;
}

function decodeEntities(text) {
  if (!text) return '';
  return text
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&rsquo;/g, "'")
    .replace(/&lsquo;/g, "'")
    .replace(/&ldquo;/g, '"')
    .replace(/&rdquo;/g, '"')
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '--');
}

async function enrichCatalog(limit = 10, deepCrawlLimit = 10) {
  let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const originalCount = catalog.length;
  let totalAttempted = 0;

  // RE_ENRICH support: selectively reset flags for re-processing
  const reEnrich = process.env.RE_ENRICH;
  if (reEnrich === 'all') {
    const resetCount = catalog.filter(f => f.enriched || f.tmdbAttempted).length;
    catalog.forEach(f => { f.enriched = false; f.tmdbAttempted = false; });
    console.log(`>>> RE_ENRICH=all: Reset flags for ${resetCount} films`);
  } else if (reEnrich === 'tmdb') {
    const resetCount = catalog.filter(f => f.tmdbAttempted).length;
    catalog.forEach(f => { f.tmdbAttempted = false; });
    console.log(`>>> RE_ENRICH=tmdb: Reset TMDB flag for ${resetCount} films`);
  }

  // Stage 0: Supplemental Re-crawl for enriched films found in newly crawled collections
  console.log(`>>> Stage 0: Supplemental Re-crawl (existing films in new collections)`);
  await runSupplementalRecrawl(catalog);

  // Stage 1: Playwright Deep-Crawl for Criterion-authoritative assets (trailers, custom posters, supplemental features)
  // ONLY run on a prioritized mini-batch limit to avoid timeout crashes in CI
  console.log(`>>> Stage 1: Playwright Deep-Crawl (Criterion-authoritative data) - Limit: ${deepCrawlLimit}`);
  const deepCrawlAttempted = await runDeepCrawl(catalog, deepCrawlLimit);
  totalAttempted += deepCrawlAttempted;

  // Stage 2: TMDB for extensive database fields (biographies, genres, missing cast, directors)
  if (TMDB_API_KEY) {
    console.log(`>>> Stage 2: TMDB API Enrichment (Structural backfilling + IDs) - Limit: ${limit}`);
    const tmdbAttempted = await runTMDBEnrichment(catalog, limit);
    totalAttempted += tmdbAttempted;
  } else {
    console.log(`>>> Stage 2: Skipped TMDB API details (no TMDB_API_KEY provided)`);
  }

  // Prune films marked for removal (dead links/redirects)
  const finalCatalog = catalog.filter(f => !f._remove);
  const removedCount = originalCount - finalCatalog.length;

  if (removedCount > 0) {
    console.log(`>>> Pruned ${removedCount} unavailable films from catalog.`);
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(finalCatalog, null, 2));

  // Return true if we actually ATTEMPTED anything.
  return totalAttempted > 0;
}

/**
 * TMDB API Mode: Fast, but requires API Key.
 */
async function runTMDBEnrichment(catalog, maxItems) {
  let updatedCount = 0;
  let attemptedCount = 0;
  const isBearer = TMDB_API_KEY.includes('.'); // Simple check for JWT/Bearer token
  
  const apiClient = axios.create({
    baseURL: TMDB_BASE_URL,
    headers: isBearer ? { 'Authorization': `Bearer ${TMDB_API_KEY}` } : {},
    params: isBearer ? {} : { api_key: TMDB_API_KEY }
  });

  // Sort: prioritize films missing key metadata (directors, synopsis) over partially enriched ones
  const prioritized = catalog.map((f, i) => ({ film: f, origIndex: i }));
  prioritized.sort((a, b) => {
    const scoreA = (a.film.directors?.length > 0 ? 0 : 2) + (a.film.synopsis ? 0 : 1);
    const scoreB = (b.film.directors?.length > 0 ? 0 : 2) + (b.film.synopsis ? 0 : 1);
    return scoreB - scoreA || a.origIndex - b.origIndex;
  });

  for (let i = 0; i < prioritized.length && updatedCount < maxItems; i++) {
    const film = prioritized[i].film;
    
    // Skip if we already tried TMDB in this cycle
    if (film.tmdbAttempted) continue;

    try {
      attemptedCount++;
      console.log(`[${i+1}/${catalog.length}] TMDB Search: ${film.title} (${film.year})`);
      let searchRes = await tmdbLimiter.schedule(() => apiClient.get('/search/movie', {
        params: { query: film.title, primary_release_year: film.year > 0 ? film.year : undefined }
      }));

      let results = searchRes.data.results;
      
      // Fallback: If no results with year, try without year
      if (results?.length === 0 && film.year > 0) {
        console.log(`    - No results with year ${film.year}, trying without year...`);
        searchRes = await tmdbLimiter.schedule(() => apiClient.get('/search/movie', {
          params: { query: film.title }
        }));
        results = searchRes.data.results;
      }

      console.log(`    - Found ${results?.length || 0} results for ${film.title}`);
      if (results?.length > 0) {
        const bestResult = pickBestResult(results, film);
        const tmdbMovieId = bestResult.id;
        
        const detailRes = await tmdbLimiter.schedule(() => apiClient.get(`/movie/${tmdbMovieId}`, {
          params: { append_to_response: 'credits,videos' }
        }));
        const data = detailRes.data;
        
        // Fallback: fetch credits separately if append_to_response didn't include them
        if (!data.credits?.crew && !data.credits?.cast) {
          console.log(`    - Credits missing from append_to_response, fetching separately...`);
          try {
            const creditsRes = await tmdbLimiter.schedule(() => apiClient.get(`/movie/${tmdbMovieId}/credits`));
            data.credits = creditsRes.data;
          } catch (e) {
            console.log(`    - Separate credits fetch failed: ${e.message}`);
          }
        }
        
        // 1. Basic Info - Only overwrite if empty or matches placeholder
        if (!film.synopsis || film.synopsis.includes(GENERIC_SYNOPSIS)) {
          film.synopsis = decodeEntities(data.overview) || film.synopsis;
          if (data.overview) film.synopsisSource = 'tmdb';
        }
        if (!film.runtime || film.runtime === 0) {
          film.runtime = data.runtime || film.runtime;
        }
        film.aspectRatio = film.aspectRatio || data.aspect_ratio;
        film.tagline = film.tagline || decodeEntities(data.tagline);
        if (!film.originalTitle) {
          film.originalTitle = data.original_title !== film.title ? data.original_title : undefined;
        }
        if (!film.imdbId) {
          film.imdbId = data.imdb_id;
        }

        // Genres - union merge, Criterion first
        if (data.genres) {
          const tmdbGenres = data.genres.map(g => g.name);
          const existing = film.genres || [];
          film.genres = Array.from(new Set([...existing, ...tmdbGenres]));
        }

        // Cast - name-match enrich, preserve Criterion order
        if (data.credits?.cast) {
          const tmdbCast = data.credits.cast.slice(0, 10).map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'actor',
            tmdbId: c.id
          }));
          film.cast = mergePeople(film.cast, tmdbCast);
        }

        // Technical Crew
        if (data.credits?.crew) {
          const crew = data.credits.crew;
          const mainDirector = crew.find(c => c.job === 'Director');
          if (mainDirector) {
            const directorObj = {
              id: mainDirector.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
              name: mainDirector.name,
              role: 'director',
              tmdbId: mainDirector.id
            };

            const hasValidDirector = film.directors && film.directors.length > 0 && film.directors[0].name && film.directors[0].name.length >= 2;
            if (!hasValidDirector) {
              film.directors = [directorObj];
            } else if (personMatches(film.directors[0].name, mainDirector.name)) {
              film.directors[0].tmdbId = mainDirector.id;
            }
          }
          const dps = crew.filter(c => c.job === 'Director of Photography').map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'both',
            tmdbId: c.id
          }));
          if (dps.length > 0) film.cinematographers = mergePeople(film.cinematographers, dps);
          const composers = crew.filter(c => c.job === 'Original Music Composer').map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'both',
            tmdbId: c.id
          }));
          if (composers.length > 0) film.composers = mergePeople(film.composers, composers);
          const writers = crew.filter(c => c.job === 'Writer' || c.job === 'Screenplay' || c.job === 'Author').map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'both',
            tmdbId: c.id
          }));
          console.log(`    - TMDB Writers for ${film.title}: ${JSON.stringify(writers.map(w => w.name))}`);
          if (writers.length > 0) film.writers = mergePeople(film.writers, writers);
        }

        if (!film.languages || film.languages.length === 0) {
          if (data.spoken_languages) {
            film.languages = data.spoken_languages.map(l => l.english_name);
          }
        }

        // Trailers
        if (data.videos?.results && !film.trailerKey && !film.trailerLink) {
          const videos = data.videos.results;
          const trailer = videos.find(v => v.site === 'YouTube' && v.type === 'Trailer') ||
                          videos.find(v => v.site === 'YouTube' && v.type === 'Teaser') ||
                          videos.find(v => v.site === 'YouTube' && v.type === 'Clip');
          if (trailer) {
            film.trailerKey = trailer.key;
          }
        }
      }
      
      film.tmdbAttempted = true;
      updatedCount++;
    } catch (err) {
      console.error(`  - TMDB error for ${film.title}:`, err.message);
      film.tmdbAttempted = true;
      updatedCount++;
    }
  }
  return attemptedCount;
}

/**
 * Deep Crawl Mode: Extracts exactly what's on Criterion Channel's landing pages and video links.
 */
async function runDeepCrawl(catalog, maxItems) {
  const unenriched = catalog.filter(f => !f.enriched && f.link);
  if (unenriched.length === 0) {
    console.log('>>> Deep-crawl: No unenriched films, skipping.');
    return 0;
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let updatedCount = 0;
  let attemptedCount = 0;

  // Prioritize films missing key metadata (like synopses)
  const prioritized = catalog.map((f, i) => ({ film: f, origIndex: i }));
  prioritized.sort((a, b) => {
    const scoreA = (a.film.synopsis ? 0 : 1);
    const scoreB = (b.film.synopsis ? 0 : 1);
    return scoreB - scoreA || a.origIndex - b.origIndex;
  });

  for (let i = 0; i < prioritized.length && updatedCount < maxItems; i++) {
    const film = prioritized[i].film;
    if (film.enriched) continue;
    if (!film.link) continue;

    // Pre-flight: validate the link is still live before spending a Playwright session.
    // Catches 404/410 (truly removed) and 30x to /browse (auth wall for unavailable titles).
    if (film.link) {
      try {
        const resp = await axios.head(film.link, { maxRedirects: 5, timeout: 6000, validateStatus: () => true });
        const status = resp.status;
        const location = resp.headers.location || '';
        if (status === 404 || status === 410) {
          film._remove = true;
          film.enriched = true;
          continue;
        }
        if (location.includes('/browse') || location.includes('/login')) {
          film._remove = true;
          film.enriched = true;
          continue;
        }
      } catch (e) {
        // If pre-flight fails (network error), fall through to the full crawl.
      }
    }

    try {
      attemptedCount++;
      console.log(`[${i+1}/${catalog.length}] Deep-Crawl: ${film.title}`);
      await deepCrawlLimiter.schedule(() => page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(1000);

      // After navigation: detect 404 pages (URL unchanged but content is an error page)
      // or redirects to /browse / /login (auth wall for unavailable titles).
      const finalUrl = page.url();
      const responseStatus = (await page.evaluate(() => {
        const navEntry = performance.getEntriesByType('navigation')[0];
        return navEntry ? navEntry.responseStatus : 0;
      })) || 0;
      const looksStale = (finalUrl.includes('/browse') && !film.link.includes('/browse'))
        || finalUrl.includes('/login')
        || responseStatus === 404
        || responseStatus === 410;
      if (looksStale) {
        console.warn(`  - Stale (status ${responseStatus} or auth redirect) for ${film.title}. Marking for removal.`);
        film._remove = true;
        film.enriched = true;
        updatedCount++;
        continue;
      }

      // Check landing page for assets and supplemental content
      const landingData = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        const trailerAnchor = anchors.find(a => a.href.includes('-trailer'));
        const videoLinks = anchors.map(a => a.href);
        const supplementalMap = {};
        
        const cards = Array.from(document.querySelectorAll('.browse-item-card'));
        cards.forEach(card => {
          const linkEl = card.querySelector('a.browse-item-link');
          const imgEl = card.querySelector('img');
          const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
          const durationEl = card.querySelector('.duration-container');
          
          if (!linkEl || !linkEl.href || !titleEl) return;
          
          const href = linkEl.href;
          const sid = href.split('/').filter(Boolean).pop();
          if (sid) {
            let runtime;
            if (durationEl) {
              const parts = durationEl.innerText.trim().split(':').map(p => parseInt(p.replace(/\D/g, ''), 10));
              if (parts.length === 3) runtime = (parts[0] * 60) + parts[1];
              else if (parts.length === 2) runtime = parts[0];
              else if (parts.length === 1) runtime = Math.round(parts[0] / 60);
              if (runtime === 0) runtime = 1;
            }
            supplementalMap[sid] = {
              id: sid,
              title: titleEl.innerText.trim(),
              link: href,
              thumbnailUrl: imgEl ? imgEl.src : '',
              runtime: runtime || undefined
            };
          }
        });

        videoLinks.forEach(href => {
          const sid = href.split('/').filter(Boolean).pop();
          if (sid && !supplementalMap[sid]) {
            supplementalMap[sid] = {
              id: sid,
              title: sid.replace(/-/g, ' '),
              link: href
            };
          }
        });

        const supplemental = Object.values(supplementalMap);
        const img = document.querySelector('.collection-img, .hero-img, img[src*="vhx.imgix.net/criterionchannelchartersu/assets/"]');
        let highResPoster = img ? img.getAttribute('src') : null;
        if (highResPoster) {
          highResPoster = highResPoster.replace(/h=\d+/, 'h=2160').replace(/w=\d+/, 'w=3840').replace(/q=\d+/, 'q=100').replace(/fit=[^&]+/, 'fit=max');
        }
        return {
          trailerLink: trailerAnchor ? trailerAnchor.href : null,
          posterUrl: highResPoster,
          supplemental
        };
      });

      if (landingData.trailerLink) film.trailerLink = landingData.trailerLink;
      if (landingData.posterUrl) film.posterUrl = landingData.posterUrl;

      if (landingData.supplemental && landingData.supplemental.length > 0) {
        film.supplemental = landingData.supplemental.filter(s => 
          s.id !== film.id && 
          !s.id.match(/-(trailer|teaser)(-\d+)?$/)
        );
      }

      const metaSynopsis = await page.getAttribute('meta[name="description"]', 'content') || 
                           await page.getAttribute('meta[property="og:description"]', 'content');

      if (metaSynopsis && !metaSynopsis.includes(GENERIC_SYNOPSIS)) {
        let cleanSynopsis = metaSynopsis.replace(/^Directed by[^•]+•[^•]+•[^\n]+(?:\n|$)/i, '').trim();
        cleanSynopsis = cleanSynopsis
          .replace(/This film is part of the Criterion Channel’s permanent collection\.?/gi, '')
          .replace(/This film is only available to stream in the United States and Canada\.?/gi, '')
          .trim();

        if (!film.synopsis || film.synopsis.length < 20 || film.synopsis.includes(GENERIC_SYNOPSIS)) {
          film.synopsis = decodeEntities(cleanSynopsis);
          film.synopsisSource = 'criterion';
        }

        const directedByMatch = metaSynopsis.match(/Directed by\s+([^•.\n]+)/i);
        const hasValidDirector = film.directors && film.directors.length > 0 && film.directors[0].name && film.directors[0].name.length >= 2;
        if (directedByMatch && !hasValidDirector) {
          const names = decodeEntities(directedByMatch[1]).split(/,|\band\b/i);
          film.directors = names.map(n => ({
            id: normalizeString(n.trim()).replace(/[^a-z0-9]+/g, '-'),
            name: n.trim(),
            role: 'director'
          })).filter(d => d.name.length > 2);
        }

        if (metaSynopsis.toLowerCase().includes('starring') && (!film.cast || film.cast.length === 0)) {
          const castMatch = metaSynopsis.match(/starring\s+([^•.\n]+)/i);
          if (castMatch) {
            const decodedCast = decodeEntities(castMatch[1]);
            film.cast = decodedCast.split(/,|\band\b/i).map(n => ({
              id: normalizeString(n.trim()).replace(/[^a-z0-9]+/g, '-'),
              name: n.trim().replace(/\.$/, ''),
              role: 'actor'
            })).filter(c => c.name.length > 2);
          }
        }

        if (metaSynopsis.toLowerCase().includes('written by') && (!film.writers || film.writers.length === 0)) {
          const writerMatch = metaSynopsis.match(/written by\s+([^•.\n-]+)/i);
          if (writerMatch) {
            const decodedWriters = decodeEntities(writerMatch[1]);
            film.writers = decodedWriters.split(/,|\band\b/i).map(n => ({
              id: normalizeString(n.trim()).replace(/[^a-z0-9]+/g, '-'),
              name: n.trim().replace(/\.$/, ''),
              role: 'both'
            })).filter(w => w.name.length > 2);
          }
        }
      }

      // Check for deeper video pages (plural)
      const videoLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        const paths = anchors.map(a => a.href);
        return Array.from(new Set(paths));
      });

      for (const videoLink of videoLinks) {
        try {
          await page.goto(videoLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);

          const pageData = await page.evaluate(() => {
            const hPattern = /(\d+)\s*h\s*(\d+)?\s*m/i;
            const mPattern = /(\d+)\s*m/i;
            const aspectPattern = /(1\.\d+:1)/;
            const langPattern = /(?:language|spoken in|subtitles in):\s*([a-zA-Z\s,]+)/gi;
            
            const rCandidates = [];
            const aCandidates = [];
            const langs = [];
            
            const text = document.body.innerText;
            const hMatch = text.match(hPattern);
            if (hMatch) {
              const h = parseInt(hMatch[1], 10);
              const m = hMatch[2] ? parseInt(hMatch[2], 10) : 0;
              rCandidates.push((h * 60) + m);
            }
            const mMatch = text.match(mPattern);
            if (mMatch) {
              rCandidates.push(parseInt(mMatch[1], 10));
            }
            const aMatch = text.match(aspectPattern);
            if (aMatch) {
              aCandidates.push(aMatch[1]);
            }
            
            let lMatch;
            while ((lMatch = langPattern.exec(text)) !== null) {
              lMatch[1].split(/,|\band\b/i).forEach(l => {
                const clean = l.trim();
                if (clean.length > 2 && clean.length < 25) langs.push(clean);
              });
            }

            const sMap = {};
            const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
            const videoLinks = anchors.filter(a => !a.href.includes('-trailer'));
            videoLinks.forEach(a => {
              const sid = a.href.split('/').filter(Boolean).pop();
              if (sid && !sMap[sid]) {
                sMap[sid] = {
                  id: sid,
                  title: a.innerText.trim() || sid.replace(/-/g, ' '),
                  link: a.href
                };
              }
            });

            return {
              runtime: rCandidates.length ? Math.max(...rCandidates) : null,
              aspectRatio: aCandidates.length ? aCandidates[0] : null,
              languages: langs,
              supplemental: Object.values(sMap)
            };
          });

          if (pageData.runtime) {
            if (!film.runtime || pageData.runtime > film.runtime) {
              film.runtime = pageData.runtime;
            }
          }
          if (pageData.aspectRatio && !film.aspectRatio) film.aspectRatio = pageData.aspectRatio;
          if (pageData.languages.length > 0 && (!film.languages || film.languages.length === 0)) {
            film.languages = Array.from(new Set([...(film.languages || []), ...pageData.languages]));
          }
          if (pageData.supplemental.length > 0) {
            const existingIds = new Set((film.supplemental || []).map(s => s.id));
            const newSupp = pageData.supplemental.filter(s => 
              s.id !== film.id && 
              !s.id.match(/-(trailer|teaser)(-\d+)?$/) &&
              !existingIds.has(s.id)
            );
            film.supplemental = [...(film.supplemental || []), ...newSupp];
          }
        } catch (e) {
          console.warn(`  - Error scanning video page ${videoLink}: ${e.message}`);
        }
      }

      film.enriched = true;
      updatedCount++;
    } catch (err) {
      console.error(`  - Crawl error for ${film.title}:`, err.message);
    }
  }
  await browser.close();
  return attemptedCount;
}

/**
 * Supplemental Re-crawl: Re-visits already-enriched films that appeared in newly crawled
 * collections, extracting only supplemental content (discussion videos, interviews, etc.)
 * that Criterion may have added since the initial enrichment.
 */
async function runSupplementalRecrawl(catalog) {
  const recrawlPath = path.resolve('public/data/.supplemental-recrawl.json');
  if (!fs.existsSync(recrawlPath)) {
    return 0;
  }

  const targetIds = new Set(JSON.parse(fs.readFileSync(recrawlPath, 'utf-8')));
  fs.rmSync(recrawlPath, { force: true });

  if (targetIds.size === 0) return 0;

  const targets = catalog.filter(f => targetIds.has(f.id) && f.link && f.enriched);
  if (targets.length === 0) return 0;

  console.log(`>>> Supplemental Re-crawl: ${targets.length} enriched films from new collections`);

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let updatedCount = 0;

  for (let i = 0; i < targets.length; i++) {
    const film = targets[i];
    try {
      console.log(`  [${i + 1}/${targets.length}] Supplemental re-crawl: ${film.title}`);
      await deepCrawlLimiter.schedule(() => page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(1000);

      const finalUrl = page.url();
      if (finalUrl.includes('/browse') || finalUrl.includes('/login')) {
        continue;
      }

      const landingData = await page.evaluate(() => {
        const cards = Array.from(document.querySelectorAll('.browse-item-card'));
        const supplementalMap = {};

        cards.forEach(card => {
          const linkEl = card.querySelector('a.browse-item-link');
          const imgEl = card.querySelector('img');
          const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
          const durationEl = card.querySelector('.duration-container');

          if (!linkEl || !linkEl.href || !titleEl) return;

          const sid = linkEl.href.split('/').filter(Boolean).pop();
          if (sid) {
            let runtime;
            if (durationEl) {
              const parts = durationEl.innerText.trim().split(':').map(p => parseInt(p.replace(/\D/g, ''), 10));
              if (parts.length === 3) runtime = (parts[0] * 60) + parts[1];
              else if (parts.length === 2) runtime = parts[0];
              else if (parts.length === 1) runtime = Math.round(parts[0] / 60);
              if (runtime === 0) runtime = 1;
            }
            supplementalMap[sid] = {
              id: sid,
              title: titleEl.innerText.trim(),
              link: linkEl.href,
              thumbnailUrl: imgEl ? imgEl.src : '',
              runtime: runtime || undefined
            };
          }
        });

        return { supplemental: Object.values(supplementalMap) };
      });

      if (landingData.supplemental && landingData.supplemental.length > 0) {
        const existingIds = new Set((film.supplemental || []).map(s => s.id));
        const newSupp = landingData.supplemental.filter(s =>
          s.id !== film.id &&
          !s.id.match(/-(trailer|teaser)(-\d+)?$/) &&
          !existingIds.has(s.id)
        );
        if (newSupp.length > 0) {
          film.supplemental = [...(film.supplemental || []), ...newSupp];
          updatedCount++;
          console.log(`    - Found ${newSupp.length} new supplemental items`);
        }
      }
    } catch (err) {
      console.warn(`    - Error re-crawling ${film.title}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`>>> Supplemental Re-crawl complete: ${updatedCount} films updated.`);
  return updatedCount;
}

const limit = parseInt(process.env.LIMIT || '10', 10);
const deepCrawlLimit = parseInt(process.env.DEEP_CRAWL_LIMIT || '10', 10);

enrichCatalog(limit, deepCrawlLimit).then((hasAttempted) => {
  if (!hasAttempted) {
    console.log('--- SYSTEM ENRICHMENT COMPLETE ---');
  }
}).catch((err) => {
  console.error('Enrichment failed:', err);
  process.exit(1);
});
