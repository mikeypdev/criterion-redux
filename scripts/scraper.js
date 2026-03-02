import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import path from 'path';

const TARGET_URL = 'https://films.criterionchannel.com/';
const OUTPUT_PATH = path.resolve('public/data/catalog.json');

async function scrapeFilms() {
  try {
    console.log(`Fetching ${TARGET_URL}...`);
    const { data } = await axios.get(TARGET_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
      },
    });

    const $ = cheerio.load(data);
    const films = [];

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

        // Map to our Film type (with placeholders for now)
        films.push({
          id,
          title,
          link,
          year: isNaN(year) ? 0 : year,
          runtime: 0, // Placeholder
          directors: [{
            id: directorName.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
            name: directorName,
            role: 'director'
          }],
          cast: [], // Placeholder
          synopsis: '', // Placeholder
          genres: [], // Placeholder
          countries: [country],
          languages: [], // Placeholder
          thumbnailUrl: thumbnailUrl || '',
          dateAdded: new Date().toISOString().split('T')[0], // Placeholder
          leavingSoon: false, // Placeholder
        });
      }
    });

    console.log(`Successfully scraped ${films.length} films.`);
    
    // Save to src/data/catalog.json
    fs.writeFileSync(OUTPUT_PATH, JSON.stringify(films, null, 2));
    console.log(`Saved to ${OUTPUT_PATH}`);

  } catch (error) {
    console.error('Scraping failed:', error.message);
  }
}

scrapeFilms();
