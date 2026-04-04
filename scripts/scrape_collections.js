import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const COLLECTIONS_OUTPUT = path.resolve('public/data/collections.json');
const CATALOG_PATH = path.resolve('public/data/catalog.json');

async function scrapeCollections() {
  console.log('--- SCRAPING CRITERION NEW COLLECTIONS ---');

  // Load catalog to check for missing films
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const catalogMap = new Map(catalog.map(f => [f.id, f]));
  let newFilmsAdded = 0;

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    const pagesToScrape = [
      'https://www.criterionchannel.com/new-collections',
      'https://www.criterionchannel.com/browse'
    ];
    
    let allCollectionLinks = [];

    for (const url of pagesToScrape) {
      console.log(`  - Navigating to ${url}...`);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      
      // Scroll deep to ensure everything is loaded
      for (let i = 0; i < 20; i++) {
        await page.evaluate(() => window.scrollBy(0, 1500));
        await page.waitForTimeout(400);
      }

      const links = await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href*="criterionchannel.com/"]'));
        const seenIds = new Set();
        const results = [];

        anchors.forEach(item => {
          const href = item.getAttribute('href');
          const id = href.split('/').filter(Boolean).pop();
          
          if (!id || href.includes('/videos/') || id === 'browse' || id === 'new-collections' || id === 'search') return;
          
          const title = item.innerText.trim();
          if (title.length < 3) return;

          const img = item.querySelector('img') || item.parentElement?.querySelector('img');
          let imageUrl = img ? img.getAttribute('src') : null;

          if (!seenIds.has(id)) {
            seenIds.add(id);
            results.push({
              id,
              title,
              imageUrl: imageUrl || undefined,
              link: item.href,
              filmIds: []
            });
          }
        });
        return results;
      });
      
      allCollectionLinks = [...allCollectionLinks, ...links];
    }

    // Deduplicate and filter links
    const seenIds = new Set();
    const collections = allCollectionLinks.filter(c => {
      if (seenIds.has(c.id)) return false;
      seenIds.add(c.id);
      return true;
    });

    console.log(`Found ${collections.length} potential collection links across all index pages.`);
    
    // Increase limit and add proper fetching with scrolling
    for (const col of collections.slice(0, 250)) {
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

        // Auto-discover missing films and add placeholders to catalog
        for (const fId of col.filmIds) {
          const cardData = collectionsData[fId];
          const existing = catalogMap.get(fId);
          
          if (!existing) {
            console.log(`      * NEW FILM DISCOVERED: ${fId}`);
            const newFilm = {
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
              dateAdded: new Date().toISOString().split('T')[0],
              enriched: false
            };
            catalog.push(newFilm);
            catalogMap.set(fId, newFilm);
            newFilmsAdded++;
          } else if (!existing.thumbnailUrl && cardData?.thumbnailUrl) {
            // Update existing with thumbnail if missing
            existing.thumbnailUrl = cardData.thumbnailUrl;
            newFilmsAdded++; // Trigger save
          }
        }
      } catch (e) {
        console.warn(`    - Failed to fetch ${col.title}: ${e.message}`);
      }
    }

    const finalResults = collections.filter(c => 
      c.filmIds.length > 0 && 
      !['films.criterionchannel.com', 'sign-up', 'films', 'browse', 'new-collections'].includes(c.id) &&
      !c.title.toUpperCase().includes('ALL FILMS')
    ).map(c => ({
      ...c,
      title: c.title.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));

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
