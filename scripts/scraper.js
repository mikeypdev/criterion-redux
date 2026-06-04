import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';
import { chromium } from 'playwright';

const TARGET_URL = 'https://films.criterionchannel.com/';
const OUTPUT_PATH = path.resolve('public/data/catalog.json');

function normalizeString(str) {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

async function scrapeFilms() {
  const browser = await chromium.launch({ headless: true });
  try {
    console.log(`Fetching ${TARGET_URL}...`);
    const { data: indexData } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
    });

    // Pre-fetch the home page to see what is TRULY new
    const homeUrl = 'https://www.criterionchannel.com/';
    console.log(`Checking Criterion home page with Playwright...`);

    const page = await browser.newPage();
    await page.goto(homeUrl, { waitUntil: 'networkidle' });

    // Scroll a bit to trigger lazy loading
    for (let i = 0; i < 5; i++) {
        await page.evaluate(() => window.scrollBy(0, 1000));
        await page.waitForTimeout(500);
    }

    const { newlyAddedIds } = await page.evaluate(() => {
        const newlyAdded = new Set();

        const sections = Array.from(document.querySelectorAll('section'));
        sections.forEach(section => {
            const h2 = section.querySelector('h2');
            if (!h2) return;
            const title = h2.innerText.toLowerCase();

            if (title.includes('newly added')) {
                section.querySelectorAll('a[href*="/videos/"]').forEach(link => {
                    const id = link.getAttribute('href').split('/').filter(Boolean).pop();
                    if (id) newlyAdded.add(id);
                });
            }
        });

        return { newlyAddedIds: Array.from(newlyAdded) };
    });

    const newlyAddedSet = new Set(newlyAddedIds);

    console.log(`Found ${newlyAddedSet.size} truly new films.`);

    const $ = cheerio.load(indexData);
    const films = [];
    const existingCatalog = fs.existsSync(OUTPUT_PATH) ? JSON.parse(fs.readFileSync(OUTPUT_PATH, 'utf-8')) : [];
    const existingMap = new Map(existingCatalog.map(f => [f.id, f]));

    $('tr').each((i, row) => {
      if (i === 0) return; // Skip header

      const $cells = $(row).find('td');
      if ($cells.length >= 5) {
        let thumbnailUrl = $cells.eq(0).find('img').attr('src');
        if (thumbnailUrl) {
          // Upgrade from 250x140 to 640x360 for high-DPI displays
          thumbnailUrl = thumbnailUrl
            .replace('h=140', 'h=360')
            .replace('w=250', 'w=640')
            .replace('q=100', 'q=90'); // 90 is a good balance for thumbnails
        }
        const $titleLink = $cells.eq(1).find('a');
        const title = $titleLink.text().trim();
        const link = $titleLink.attr('href');
        const directorName = $cells.eq(2).text().trim();
        const country = $cells.eq(3).text().trim().replace(/,$/, '');
        const year = parseInt($cells.eq(4).text().trim(), 10);

        if (!title) return;

        const id = link ? link.split('/').pop() : title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const existingFilm = existingMap.get(id);

        // Date Logic: If it's on the home page as 'Newly Added', force a fresh date
        let dateAdded = existingFilm?.dateAdded || new Date().toISOString().split('T')[0];
        if (newlyAddedSet.has(id)) {
          dateAdded = new Date().toISOString().split('T')[0];
        }

        // Map to our Film type (ensuring we merge EVERYTHING from enrichment)
        films.push({
          id,
          title,
          link,
          year: isNaN(year) ? 0 : year,
          runtime: existingFilm?.runtime || 0,
          directors: existingFilm?.directors || (directorName ? [{
            id: directorName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: directorName,
            role: 'director'
          }] : []),
          cast: existingFilm?.cast || [],
          synopsis: existingFilm?.synopsis || '',
          genres: existingFilm?.genres || [],
          countries: existingFilm?.countries || [country],
          languages: existingFilm?.languages || [],
          thumbnailUrl: thumbnailUrl || existingFilm?.thumbnailUrl || '',
          dateAdded,
          enriched: existingFilm?.enriched || false,
          tmdbAttempted: existingFilm?.tmdbAttempted || false,
          posterUrl: existingFilm?.posterUrl,
          // Technical specs and media
          aspectRatio: existingFilm?.aspectRatio,
          trailerLink: existingFilm?.trailerLink,
          trailerKey: existingFilm?.trailerKey,
          synopsisSource: existingFilm?.synopsisSource,
          originalTitle: existingFilm?.originalTitle,
          imdbId: existingFilm?.imdbId,
          cinematographers: existingFilm?.cinematographers,
          composers: existingFilm?.composers,
          writers: existingFilm?.writers,
          supplemental: existingFilm?.supplemental || []
        });
      }
    });

    console.log(`Successfully scraped ${films.length} films.`);
    
    // Save to src/data/catalog.json
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(films, null, 2));
    console.log(`Saved to ${OUTPUT_PATH}`);

  } catch (error) {
    console.error('Scraping failed:', error.message);
  } finally {
    await browser.close();
  }
}

scrapeFilms();
