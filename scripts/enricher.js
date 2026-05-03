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

const GENERIC_SYNOPSIS = "Classics and discoveries from around the world";
function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function normalizePersonName(name) {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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
  const match = synopsis.match(/Directed by\s+([^•\.\n]+)/i);
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
  if (scored[0].score > scored[1].score + 5) {
    return scored[0].result;
  }
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

async function enrichCatalog(maxItems = 10) {
  let catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const originalCount = catalog.length;
  let attemptedCount = 0;
  
  // Recovery: re-attempt TMDB for films with empty/generic directors
  let recoveredCount = 0;
  for (const film of catalog) {
    const hasValidDirector = film.directors && film.directors.length > 0 && film.directors[0].name && film.directors[0].name.length >= 2;
    if (film.tmdbAttempted && !hasValidDirector) {
      film.tmdbAttempted = false;
      recoveredCount++;
    }
  }
  if (recoveredCount > 0) {
    console.log(`>>> Recovery: ${recoveredCount} films queued for TMDB director re-attempt`);
  }
  
  if (TMDB_API_KEY) {
    console.log(`>>> Using TMDB API Enrichment (Speed: Fast)`);
    attemptedCount = await runTMDBEnrichment(catalog, maxItems);
  } else {
    console.log(`>>> Using Playwright Deep-Crawl (Speed: Respectful)`);
    attemptedCount = await runDeepCrawl(catalog, maxItems);
  }

  // Prune films marked for removal (dead links/redirects)
  const finalCatalog = catalog.filter(f => !f._remove);
  const removedCount = originalCount - finalCatalog.length;
  
  if (removedCount > 0) {
    console.log(`>>> Pruned ${removedCount} unavailable films from catalog.`);
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(finalCatalog, null, 2));
  
  // Return true if we actually ATTEMPTED anything. 
  // If attemptedCount is 0, it means the entire library is already enriched.
  return attemptedCount > 0;
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
        params: { query: film.title, primary_release_year: film.year }
      }));

      let results = searchRes.data.results;
      
      // Fallback: If no results with year, try without year
      if (results?.length === 0) {
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
        if (bestResult !== results[0]) {
          const bestYear = bestResult.release_date ? bestResult.release_date.substring(0, 4) : '?';
          console.log(`    - Selected result: ${bestResult.title} (${bestYear}) over top result`);
        }
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
        
        // 1. Basic Info
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

        // 1.5 Genres - union merge, Criterion first
        if (data.genres) {
          const tmdbGenres = data.genres.map(g => g.name);
          const existing = film.genres || [];
          film.genres = Array.from(new Set([...existing, ...tmdbGenres]));
        }

        // 2. Cast - name-match enrich, preserve Criterion order
        if (data.credits?.cast) {
          const tmdbCast = data.credits.cast.slice(0, 10).map(c => ({
            id: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: c.name,
            role: 'actor',
            tmdbId: c.id
          }));
          film.cast = mergePeople(film.cast, tmdbCast);
        }

        // 3. Technical Crew
        if (data.credits?.crew) {
          const crew = data.credits.crew;
          const mainDirector = crew.find(c => c.job === 'Director');
          if (!mainDirector) {
            const directorJobs = crew.filter(c => c.department === 'Directing').map(c => `${c.name} (${c.job})`);
            if (directorJobs.length > 0) {
              console.log(`    - No crew with job='Director', but Directing dept: ${directorJobs.join(', ')}`);
            }
          }
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
            } else {
              console.warn(`    - Director mismatch: Criterion has "${film.directors[0].name}", TMDB has "${mainDirector.name}". Keeping Criterion.`);
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
        }

        // 4. Technical Specs Fallback
        if (!film.languages || film.languages.length === 0) {
          if (data.spoken_languages) {
            film.languages = data.spoken_languages.map(l => l.english_name);
          }
        }

        // 5. Trailers
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
 * Deep Crawl Mode: No key required, extracts exactly what's on Criterion Channel.
 */
async function runDeepCrawl(catalog, maxItems) {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  let updatedCount = 0;
  let attemptedCount = 0;

  // Prioritize films missing key metadata
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

    try {
      attemptedCount++;
      console.log(`[${i+1}/${catalog.length}] Deep-Crawl: ${film.title}`);
      await deepCrawlLimiter.schedule(() => page.goto(film.link, { waitUntil: 'domcontentloaded', timeout: 30000 }));
      await page.waitForTimeout(1000);

      if (page.url().includes('/browse') && !film.link.includes('/browse')) {
        if (film.year === 0 || !film.year) {
          console.warn(`  - Redirect detected for ${film.title} (collection episode). Preserving without enrichment.`);
          film.enriched = true;
        } else {
          console.warn(`  - Redirect detected for ${film.title}. Marking for removal.`);
          film._remove = true;
        }
        updatedCount++;
        continue;
      }

      // 1. Check landing page for assets and supplemental content
      const landingData = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        const trailerAnchor = anchors.find(a => a.href.includes('-trailer'));
        
        // Find all unique video links
        const videoLinks = anchors.map(a => a.href);
        
        const supplementalMap = {};
        
        // Use cards for better metadata if available
        const cards = Array.from(document.querySelectorAll('.browse-item-card'));
        cards.forEach(card => {
          const linkEl = card.querySelector('a.browse-item-link');
          const imgEl = card.querySelector('img');
          const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
          const durationEl = card.querySelector('.duration-container');
          
          if (!linkEl || !linkEl.href || !titleEl) return;
          
          const href = linkEl.href;
          if (!href) return;
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

        // Add any video links NOT in cards
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

      // Filter supplemental to remove the main film itself
      if (landingData.supplemental && landingData.supplemental.length > 0) {
        film.supplemental = landingData.supplemental.filter(s => s.id !== film.id);
      }

      // Capture synopsis, director, cast from LANDING page metadata
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

        const directedByMatch = metaSynopsis.match(/Directed by\s+([^•\.\n]+)/i);
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
          const castMatch = metaSynopsis.match(/starring\s+([^•\.\n]+)/i);
          if (castMatch) {
            const decodedCast = decodeEntities(castMatch[1]);
            film.cast = decodedCast.split(/,|\band\b/i).map(n => ({
              id: normalizeString(n.trim()).replace(/[^a-z0-9]+/g, '-'),
              name: n.trim().replace(/\.$/, ''),
              role: 'actor',
              tmdbId: undefined
            })).filter(c => c.name.length > 2);
          }
        }
      }

      // 2. Check for deeper video pages (plural)
      const videoLinks = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
        // Keep unique paths
        const paths = anchors.map(a => a.href);
        return Array.from(new Set(paths));
      });

      for (const videoLink of videoLinks) {
        console.log(`  - Navigating to video page: ${videoLink}`);
        try {
          await page.goto(videoLink, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await page.waitForTimeout(1000);

          // Extract supplemental and metadata from EACH video page
          const pageData = await page.evaluate(() => {
            const hPattern = /(\d+)\s*h\s*(\d+)?\s*m/i;
            const mPattern = /(\d+)\s*m(in)?/i;
            const timePattern = /(?<!\d:)(?:(\d+):)?([0-5]?\d):([0-5]\d)(?!\d)/;
            const aspectPattern = /\b(?:\d\.\d{2}:1|16:9|4:3|1\.37:1|1\.66:1|1\.85:1|2\.35:1|2\.39:1|2\.40:1)\b/;
            
            let rCandidates = [];
            let aCandidates = [];
            let langs = [];
            const fullText = document.body.innerText;
            const pAspect = fullText.match(aspectPattern);
            if (pAspect) aCandidates.push(pAspect[0]);
            if (fullText.includes('English')) langs.push('English');

            const elements = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6, li, span, p, .time, .description'));
            for (const el of elements) {
              const t = el.innerText.trim();
              const am = t.match(aspectPattern); if (am) aCandidates.push(am[0]);
              const hm = t.match(hPattern); if (hm) rCandidates.push((parseInt(hm[1], 10) * 60) + parseInt(hm[2] || 0, 10));
              const m = t.match(mPattern); if (m) rCandidates.push(parseInt(m[1], 10));
              const tp = t.match(timePattern);
              if (tp && !t.match(aspectPattern)) { 
                rCandidates.push((parseInt(tp[1] || 0, 10) * 60) + parseInt(tp[2] || 0, 10));
              }
            }

            // Supplemental cards
            const sMap = {};
            const cards = Array.from(document.querySelectorAll('.browse-item-card'));
            cards.forEach(card => {
              const linkEl = card.querySelector('a.browse-item-link');
              const imgEl = card.querySelector('img');
              const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
              const durationEl = card.querySelector('.duration-container');
              if (linkEl && linkEl.href && titleEl) {
                const sid = linkEl.href.split('/').filter(Boolean).pop();
                let runtime;
                if (durationEl) {
                  const parts = durationEl.innerText.trim().split(':').map(p => parseInt(p.replace(/\D/g, ''), 10));
                  if (parts.length === 3) runtime = (parts[0] * 60) + parts[1];
                  else if (parts.length === 2) runtime = parts[0];
                  else if (parts.length === 1) runtime = Math.round(parts[0] / 60);
                  if (runtime === 0) runtime = 1;
                }
                sMap[sid] = {
                  id: sid,
                  title: titleEl.innerText.trim(),
                  link: linkEl.href,
                  thumbnailUrl: imgEl ? imgEl.src : '',
                  runtime: runtime || undefined
                };
              }
            });

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
            const newSupp = pageData.supplemental.filter(s => s.id !== film.id && !existingIds.has(s.id));
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

const limit = parseInt(process.env.LIMIT || '10', 10);
enrichCatalog(limit).then(hasMore => {
  if (!hasMore) {
    console.log('--- ENTIRE CATALOG COMPLETED ---');
    process.exit(0);
  }
});
