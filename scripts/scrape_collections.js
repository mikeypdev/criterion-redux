import { chromium } from 'playwright';
import axios from 'axios';
import fs from 'fs';
import path from 'path';

const COLLECTIONS_OUTPUT = path.resolve('public/data/collections.json');
const CATALOG_PATH = path.resolve('public/data/catalog.json');

const SKIP_IDS = new Set([
  'browse', 'new-collections', 'search', 'sign-up', 'films',
  'login', 'checkout', 'buy', 'terms', 'privacy', 'cookies', 'help',
]);

async function discoverCollectionsFromSitemap() {
  console.log('  - Fetching sitemap.xml for complete collection discovery...');
  const { data } = await axios.get('https://www.criterionchannel.com/sitemap.xml', {
    headers: { 'User-Agent': 'Mozilla/5.0' }
  });

  const allUrls = [...data.matchAll(/<loc>(https:\/\/www\.criterionchannel\.com\/[^<]+)<\/loc>/g)].map(m => m[1]);

  const collections = [];
  const seenIds = new Set();

  for (const url of allUrls) {
    if (url.includes('/videos/')) continue;
    if (url.includes('/checkout') || url.includes('/buy/')) continue;

    const id = url.split('/').filter(Boolean).pop();
    if (!id || SKIP_IDS.has(id) || id.length < 2) continue;
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    const title = id
      .replace(/-season-\d+$/, '')
      .replace(/-/g, ' ')
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    collections.push({
      id,
      title,
      link: url,
      filmIds: []
    });
  }

  return collections;
}

// Highly efficient parallel batch checker to prune stale redirects to /browse
async function filterActiveCollections(collections) {
  console.log('  - Performing fast HTTP pre-flight redirects validation on sitemap...');
  const activeList = [];
  const batchSize = 100;
  
  for (let i = 0; i < collections.length; i += batchSize) {
    const queue = collections.slice(i, i + batchSize);
    const checks = queue.map(async (col) => {
      try {
        const response = await axios.get(col.link, {
          maxRedirects: 0,
          timeout: 4000,
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
          validateStatus: (status) => status >= 200 && status < 400
        });
        
        const loc = response.headers.location || '';
        if (loc.endsWith('/browse') || loc.includes('/login')) {
          return null; // Redirects to browse/login -> stale
        }
        return col;
      } catch (err) {
        if (err.response && (err.response.status === 301 || err.response.status === 302)) {
          const loc = err.response.headers.location || '';
          if (loc.endsWith('/browse') || loc.includes('/login')) {
            return null; // Stale redirect
          }
        }
        // Network/parsing timeout or standard page load error -> safely ignore or preserve
        return col;
      }
    });
    
    const results = await Promise.all(checks);
    results.forEach(col => { if (col) activeList.push(col); });
    
    if (i % 500 === 0 && i > 0) {
      console.log(`    * Checked ${i}/${collections.length} URLs...`);
    }
  }
  
  console.log(`  - Pre-flight complete. Found ${activeList.length} active collection URLs out of ${collections.length}.`);
  return activeList;
}

async function scrapeCollections() {
  console.log('--- SCRAPING CRITERION COLLECTIONS ---');

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  catalog.forEach(f => f.leavingSoon = false);
  const todayStr = new Date().toISOString().split('T')[0];

  const catalogMap = new Map(catalog.map(f => [f.id, f]));
  let newFilmsAdded = 0;

  // Load existing collections to skip already-scraped ones
  const existingCollections = fs.existsSync(COLLECTIONS_OUTPUT)
    ? JSON.parse(fs.readFileSync(COLLECTIONS_OUTPUT, 'utf-8'))
    : [];
  const existingMap = new Map(existingCollections.map(c => [c.id, c]));

  try {
    const rawCollections = await discoverCollectionsFromSitemap();
    console.log(`Found ${rawCollections.length} collections raw from sitemap.`);
    
    // Filter sitemap urls of stale entries by running fast HTTP checks
    // ONLY check items we don't already have fully scraped with data
    const toCheck = [];
    const unchangedActive = [];
    
    for (const col of rawCollections) {
      const cleanId = col.id.replace(/-season-\d+$/, '').replace(/-supplemental$/, '');
      const existing = existingMap.get(col.id) || existingMap.get(cleanId);
      
      if (existing && existing.filmIds && existing.filmIds.length > 0) {
        col.title = existing.title;
        col.imageUrl = existing.imageUrl;
        col.description = existing.description ?? '';
        col.filmIds = existing.filmIds;
        unchangedActive.push(col);
      } else {
        toCheck.push(col);
      }
    }
    
    console.log(`  * ${unchangedActive.length} collections are already cached. Verifying remaining ${toCheck.length} items...`);
    const verifiedNewAndStale = await filterActiveCollections(toCheck);
    
    const collections = [...unchangedActive, ...verifiedNewAndStale];

    // Still apply leavingSoon/newlyAdded flags for cached, active targets
    for (const col of collections) {
      const lowerTitle = col.title.toLowerCase();
      const isLeavingSoonColl = lowerTitle.includes('leaving') && (
        lowerTitle.includes('january') || lowerTitle.includes('february') || lowerTitle.includes('march') ||
        lowerTitle.includes('april') || lowerTitle.includes('may') || lowerTitle.includes('june') ||
        lowerTitle.includes('july') || lowerTitle.includes('august') || lowerTitle.includes('september') ||
        lowerTitle.includes('october') || lowerTitle.includes('november') || lowerTitle.includes('december')
      );
      if (isLeavingSoonColl && col.filmIds) {
        col.filmIds.forEach(fId => { const f = catalogMap.get(fId); if (f) f.leavingSoon = true; });
      }
    }

    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    const collectionLimit = parseInt(process.env.COLLECTION_LIMIT || '0', 10);

    for (const col of collections) {
      // If collection film list is already populated, skip Playwright crawl
      if (col.filmIds && col.filmIds.length > 0) {
        continue;
      }
      
      if (collectionLimit > 0 && newFilmsAdded >= collectionLimit) break;

      console.log(`  - Fetching films and artwork for: ${col.title}`);
      try {
        await page.goto(col.link, { waitUntil: 'domcontentloaded', timeout: 40000 });
        
        // Detect redirect to /browse (requires auth) — skip these collections
        if (page.url().replace(/\/$/, '').endsWith('/browse')) {
          console.log(`    - Skipped: redirects to /browse`);
          continue;
        }
        
        // Scroll to ensure lazy-loaded grids are populated
        for (let i = 0; i < 6; i++) {
          await page.evaluate(() => window.scrollBy(0, 1500));
          await page.waitForTimeout(400);
        }

        // 1. Get high-quality billboard image, description, and real title from the collection's own page
        const meta = await page.evaluate(() => {
          const img = document.querySelector('.collection-img, .hero-img, .poster-image, img[src*="vhx.imgix.net/criterionchannelchartersu/assets/"]');
          let src = img ? img.getAttribute('src') : null;
          if (src) {
            src = src.replace(/h=\d+/, 'h=1080').replace(/w=\d+/, 'w=1920').replace(/q=\d+/, 'q=100').replace(/fit=[^&]+/, 'fit=max');
          }
          
          const pageTitle = document.querySelector('.collection-title, .hero-title, h1')?.innerText.trim();
          const pageDesc = document.querySelector('.collection-description, .hero-description, .description-text')?.innerText.trim();
          const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content');
          let description = pageDesc || metaDesc || '';
          
          description = description.replace(/\s*Show more\s*$/i, '').trim();
          return { imageUrl: src, description, title: pageTitle };
        });
        
        if (meta.imageUrl) col.imageUrl = meta.imageUrl;
        if (meta.description && meta.description.length > 5) col.description = meta.description;
        
        if (meta.title && (col.title.toLowerCase().includes('watch') || col.title.length < 3)) {
          col.title = meta.title;
        }

        // 2. Get film IDs and basic metadata from the cards
        const collectionsData = await page.evaluate(() => {
          const headerText = document.body.innerText.match(/(\d+)\s*(?:Episodes?|Films?|Videos?|Titles?)/i);
          const expectedCount = headerText ? parseInt(headerText[1], 10) : 0;

          const cards = Array.from(document.querySelectorAll('.browse-item-card'));
          const map = {};
          const filmIds = [];
          const seenIds = new Set();
          
          cards.forEach(card => {
            const linkEl = card.querySelector('a.browse-item-link');
            const imgEl = card.querySelector('img');
            const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
            
            if (linkEl) {
              const id = linkEl.href.split('/').filter(Boolean).pop();
              if (id && !seenIds.has(id)) {
                const lower = id.toLowerCase();
                if (lower.includes('-teaser') || lower.includes('-trailer') || 
                    lower.includes('-series') || lower.includes('-intro') || lower.includes('-promo')) return;
                seenIds.add(id);
                filmIds.push(id);
                map[id] = {
                  title: titleEl?.innerText.trim() || id,
                  thumbnailUrl: imgEl?.src || ''
                };
              }
            }
          });

          const finalIds = (expectedCount > 0 && filmIds.length > expectedCount) 
            ? filmIds.slice(0, expectedCount) 
            : filmIds;

          return { cardData: map, filmIds: finalIds, expectedCount };
        });
        
        col.filmIds = collectionsData.filmIds;
        console.log(`    - Found ${col.filmIds.length} unique films.${collectionsData.expectedCount ? ` (expected: ${collectionsData.expectedCount})` : ''}`);

        // 3. Mark films as leaving soon / newly added based on collection titles
        const lowerTitle = col.title.toLowerCase();
        const isLeavingSoonColl = lowerTitle.includes('leaving') && (
            lowerTitle.includes('january') || lowerTitle.includes('february') || lowerTitle.includes('march') || 
            lowerTitle.includes('april') || lowerTitle.includes('may') || lowerTitle.includes('june') || 
            lowerTitle.includes('july') || lowerTitle.includes('august') || lowerTitle.includes('september') || 
            lowerTitle.includes('october') || lowerTitle.includes('november') || lowerTitle.includes('december')
        );
        const isNewlyAddedColl = lowerTitle.includes('newly added');

        if (isLeavingSoonColl) {
            console.log(`    - Flagging ${col.filmIds.length} films as "Leaving Soon"`);
        }
        if (isNewlyAddedColl) {
            console.log(`    - Flagging ${col.filmIds.length} films as "Newly Added"`);
        }

        // Auto-discover missing films and add placeholders to catalog
        for (const fId of col.filmIds) {
          const cardData = collectionsData.cardData[fId];
          let film = catalogMap.get(fId);
          
          if (!film) {
            console.log(`      * NEW FILM DISCOVERED: ${fId}`);
            film = {
              id: fId,
              title: cardData?.title || fId.replace(/-/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
              link: `https://www.criterionchannel.com/${fId}`,
              year: 0,
              runtime: 0,
              directors: [],
              cast: [],
              genres: [],
              countries: [],
              languages: [],
              synopsis: '',
              thumbnailUrl: cardData?.thumbnailUrl || '',
              dateAdded: isNewlyAddedColl ? todayStr : new Date().toISOString().split('T')[0],
              enriched: false,
              tmdbAttempted: false,
              leavingSoon: isLeavingSoonColl,
              supplemental: []
            };
            catalog.push(film);
            catalogMap.set(fId, film);
            newFilmsAdded++;
          } else {
            if (!film.thumbnailUrl && cardData?.thumbnailUrl) {
                film.thumbnailUrl = cardData.thumbnailUrl;
                newFilmsAdded++;
            }
            if (isLeavingSoonColl) {
                film.leavingSoon = true;
                newFilmsAdded++;
            }
            if (isNewlyAddedColl) {
                film.dateAdded = todayStr;
                newFilmsAdded++;
            }
          }
        }
      } catch (e) {
        console.warn(`    - Failed to fetch ${col.title}: ${e.message}`);
      }
    }

    await browser.close();

    // Map all processed collections into a master dictionary to merge with existing data
    const masterCollectionsMap = new Map();
    
    // 1. Pre-seed with existing fully populated collection data
    for (const c of existingCollections) {
      if (c.filmIds && c.filmIds.length > 0) {
        masterCollectionsMap.set(c.id, c);
      }
    }
    
    // 2. Overwrite with newly processed/updated active sitemap collections
    for (const c of collections) {
      if (c.filmIds && c.filmIds.length > 0) {
        masterCollectionsMap.set(c.id, c);
      }
    }
    
    const finalResults = Array.from(masterCollectionsMap.values()).filter(c => 
      !c.title.toUpperCase().includes('ALL FILMS') &&
      !(c.filmIds.length === 1 && c.filmIds[0] === c.id && (!c.description || c.description.length < 5))
    );

    // Sort to keep it clean and predictable
    finalResults.sort((a, b) => a.id.localeCompare(b.id));

    fs.writeFileSync(COLLECTIONS_OUTPUT, JSON.stringify(finalResults, null, 2));
    console.log(`Saved ${finalResults.length} curated collections to ${COLLECTIONS_OUTPUT}`);

    if (newFilmsAdded > 0) {
      catalog.sort((a, b) => a.id.localeCompare(b.id));
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
      console.log(`Added ${newFilmsAdded} newly discovered films/updates to the catalog.`);
    }

  } catch (err) {
    console.error('Scraping failed:', err.message);
  }
}

scrapeCollections();
