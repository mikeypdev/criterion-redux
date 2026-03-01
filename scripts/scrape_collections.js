import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const COLLECTIONS_OUTPUT = path.resolve('public/data/collections.json');

async function scrapeCollections() {
  console.log('--- SCRAPING CRITERION NEW COLLECTIONS ---');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    console.log('  - Navigating to new collections index...');
    await page.goto('https://www.criterionchannel.com/new-collections', { waitUntil: 'networkidle', timeout: 60000 });
    
    // Scroll deep to ensure everything is loaded
    for (let i = 0; i < 15; i++) {
      await page.evaluate(() => window.scrollBy(0, 1500));
      await page.waitForTimeout(500);
    }

    const collections = await page.evaluate(() => {
      // On this specific page, collections are usually in 'media-list-container' or just links
      const links = Array.from(document.querySelectorAll('a[href*="criterionchannel.com/"]'));
      
      const seenIds = new Set();
      const results = [];

      links.forEach(item => {
        const href = item.getAttribute('href');
        const id = href.split('/').filter(Boolean).pop();
        
        // Filter for collection-like paths (skip /videos/ and generic stuff)
        if (!id || href.includes('/videos/') || id === 'browse' || id === 'new-collections' || seenIds.has(id)) return;
        
        // Get title
        const title = item.innerText.trim();
        if (title.length < 3) return;

        // Find image
        const img = item.querySelector('img') || item.parentElement?.querySelector('img');
        let imageUrl = img ? img.getAttribute('src') : null;
        if (imageUrl) {
          imageUrl = imageUrl.replace(/h=\d+/, 'h=1080').replace(/w=\d+/, 'w=1920').replace(/q=\d+/, 'q=100').replace(/fit=[^&]+/, 'fit=max');
        }

        seenIds.add(id);
        results.push({
          id,
          title,
          description: `Curated collection: ${title}`,
          imageUrl: imageUrl || undefined,
          link: item.href,
          filmIds: []
        });
      });

      return results;
    });

    console.log(`Found ${collections.length} potential collection links.`);
    
    for (const col of collections.slice(0, 30)) {
      console.log(`  - Fetching films and artwork for: ${col.title}`);
      try {
        await page.goto(col.link, { waitUntil: 'domcontentloaded', timeout: 30000 });
        
        // 1. Get high-quality billboard image from the collection's own page
        const billboard = await page.evaluate(() => {
          const img = document.querySelector('.collection-img, .hero-img, img[src*="vhx.imgix.net/criterionchannelchartersu/assets/"]');
          let src = img ? img.getAttribute('src') : null;
          if (src) {
            src = src.replace(/h=\d+/, 'h=1080').replace(/w=\d+/, 'w=1920').replace(/q=\d+/, 'q=100').replace(/fit=[^&]+/, 'fit=max');
          }
          return src;
        });
        if (billboard) col.imageUrl = billboard;

        // 2. Get film IDs
        const filmIds = await page.evaluate(() => {
          const anchors = Array.from(document.querySelectorAll('a[href*="/videos/"]'));
          return anchors.map(a => a.href.split('/').filter(Boolean).pop())
            .filter(id => id && !id.includes('-teaser') && !id.includes('-trailer') && !id.includes('-series') && !id.includes('-intro'));
        });
        col.filmIds = Array.from(new Set(filmIds));
        console.log(`    - Found ${col.filmIds.length} films.`);
      } catch (e) {
        // skip
      }
    }

    const finalResults = collections.filter(c => 
      c.filmIds.length > 1 && 
      !['films.criterionchannel.com', 'sign-up', 'films', 'browse', 'new-collections'].includes(c.id) &&
      !c.title.toUpperCase().includes('ALL FILMS')
    ).map(c => ({
      ...c,
      title: c.title.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')
    }));

    fs.writeFileSync(COLLECTIONS_OUTPUT, JSON.stringify(finalResults, null, 2));
    console.log(`Saved ${finalResults.length} curated collections to ${COLLECTIONS_OUTPUT}`);

  } catch (err) {
    console.error('Scraping failed:', err.message);
  } finally {
    await browser.close();
  }
}

scrapeCollections();
