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

async function scrapeCollections() {
  console.log('--- SCRAPING CRITERION COLLECTIONS ---');

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  catalog.forEach(f => f.leavingSoon = false);
  const todayStr = new Date().toISOString().split('T')[0];

  const catalogMap = new Map(catalog.map(f => [f.id, f]));
  let newFilmsAdded = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  try {
    const collections = await discoverCollectionsFromSitemap();
    console.log(`Found ${collections.length} collections from sitemap.`);
    
    // Load existing collections to skip already-scraped ones
    const existingCollections = fs.existsSync(COLLECTIONS_OUTPUT)
      ? JSON.parse(fs.readFileSync(COLLECTIONS_OUTPUT, 'utf-8'))
      : [];
    const existingMap = new Map(existingCollections.map(c => [c.id, c]));

    const collectionLimit = parseInt(process.env.COLLECTION_LIMIT || '0', 10);

    for (const col of collections) {
      if (collectionLimit > 0 && newFilmsAdded >= collectionLimit) break;

      // Skip collections we already have with film data (unless forced)
      const existing = existingMap.get(col.id);
      if (existing && existing.filmIds && existing.filmIds.length > 0) {
        col.title = existing.title;
        col.imageUrl = existing.imageUrl;
        col.description = existing.description;
        col.filmIds = existing.filmIds;

        // Still apply leavingSoon/newlyAdded flags
        const lowerTitle = col.title.toLowerCase();
        const isLeavingSoonColl = lowerTitle.includes('leaving') && (
          lowerTitle.includes('january') || lowerTitle.includes('february') || lowerTitle.includes('march') ||
          lowerTitle.includes('april') || lowerTitle.includes('may') || lowerTitle.includes('june') ||
          lowerTitle.includes('july') || lowerTitle.includes('august') || lowerTitle.includes('september') ||
          lowerTitle.includes('october') || lowerTitle.includes('november') || lowerTitle.includes('december')
        );
        if (isLeavingSoonColl) {
          col.filmIds.forEach(fId => { const f = catalogMap.get(fId); if (f) f.leavingSoon = true; });
        }
        continue;
      }
      console.log(`  - Fetching films and artwork for: ${col.title}`);
      try {
        await page.goto(col.link, { waitUntil: 'networkidle', timeout: 60000 });
        
        // Scroll to ensure lazy-loaded grids are populated
        for (let i = 0; i < 10; i++) {
          await page.evaluate(() => window.scrollBy(0, 2000));
          await page.waitForTimeout(600);
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
          
          // Clean up "Show more" or other noise
          description = description.replace(/\s*Show more\s*$/i, '').trim();
          
          return { imageUrl: src, description, title: pageTitle };
        });
        
        if (meta.imageUrl) col.imageUrl = meta.imageUrl;
        if (meta.description && meta.description.length > 5) col.description = meta.description;
        
        // Use better title if the index one was generic or if we found a better one
        if (meta.title && (col.title.toLowerCase().includes('watch') || col.title.length < 3)) {
          col.title = meta.title;
        }

        // 2. Get film IDs and basic metadata from the cards
        const collectionsData = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.browse-item-card'));
          const map = {};
          
          cards.forEach(card => {
            const linkEl = card.querySelector('a.browse-item-link');
            const imgEl = card.querySelector('img');
            const titleEl = card.querySelector('.browse-item-title strong') || card.querySelector('.browse-item-title');
            
            if (linkEl) {
              const id = linkEl.href.split('/').filter(Boolean).pop();
              if (id) {
                map[id] = {
                  title: titleEl?.innerText.trim() || id,
                  thumbnailUrl: imgEl?.src || ''
                };
              }
            }
          });
          return map;
        });

        const filmIds = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
          return anchors.map(a => {
            const url = new URL(a.href);
            const pathParts = url.pathname.split('/').filter(Boolean);
            return pathParts.pop();
          })
          .filter(id => {
            if (!id) return false;
            const lower = id.toLowerCase();
            return !lower.includes('-teaser') && 
                   !lower.includes('-trailer') && 
                   !lower.includes('-series') && 
                   !lower.includes('-intro') &&
                   !lower.includes('-promo');
          });
        });
        
        col.filmIds = Array.from(new Set(filmIds));
        console.log(`    - Found ${col.filmIds.length} unique films.`);

        // 3. Mark films as "Leaving Soon" or "Newly Added" based on collection titles
        const lowerTitle = col.title.toLowerCase();
        const isLeavingSoonColl = lowerTitle.includes('leaving') && (
            lowerTitle.includes('january') || lowerTitle.includes('february') || lowerTitle.includes('march') || 
            lowerTitle.includes('april') || lowerTitle.includes('may') || lowerTitle.includes('june') || 
            lowerTitle.includes('july') || lowerTitle.includes('august') || lowerTitle.includes('september') || 
            lowerTitle.includes('october') || lowerTitle.includes('november') || lowerTitle.includes('december')
        );
        const isNewlyAddedColl = lowerTitle.includes('newly added');

        if (isLeavingSoonColl) {
            console.log(`    - Flagging ${col.filmIds.length} films as "Leaving Soon" based on collection title.`);
        }
        if (isNewlyAddedColl) {
            console.log(`    - Flagging ${col.filmIds.length} films as "Newly Added" based on collection title.`);
        }

        // Auto-discover missing films and add placeholders to catalog
        for (const fId of col.filmIds) {
          const cardData = collectionsData[fId];
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
                newFilmsAdded++; // Trigger save
            }
            if (isLeavingSoonColl) {
                film.leavingSoon = true;
                newFilmsAdded++; // Force a save to update flags
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

    const finalResults = collections.filter(c => 
      c.filmIds.length > 0 && 
      !c.title.toUpperCase().includes('ALL FILMS')
    );

    fs.writeFileSync(COLLECTIONS_OUTPUT, JSON.stringify(finalResults, null, 2));
    console.log(`Saved ${finalResults.length} curated collections to ${COLLECTIONS_OUTPUT}`);

    if (newFilmsAdded > 0) {
      // Sort catalog to keep it clean
      catalog.sort((a, b) => a.id.localeCompare(b.id));
      fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
      console.log(`Added ${newFilmsAdded} newly discovered films to the catalog.`);
    }

  } catch (err) {
    console.error('Scraping failed:', err.message);
  } finally {
    await browser.close();
  }
}

scrapeCollections();
