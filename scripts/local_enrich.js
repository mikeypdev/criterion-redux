import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve('public/data/catalog.json');

const commonGenres = [
  'Noir', 'Comedy', 'Drama', 'Western', 'Thriller', 'Horror', 'Sci-Fi', 
  'Documentary', 'Musical', 'Action', 'Fantasy', 'Avant-Garde', 'Crime',
  'Romance', 'Mystery', 'Animation', 'Biography', 'History', 'War',
  'Short', 'Silent', 'Experimental', 'Melodrama', 'Samurai', 'Satire',
  'Classic', 'Contemporary', 'Independent', 'World Cinema', 'Family',
  'Adventure', 'Performance', 'Interview', 'Talk Show',
  'Erotica', 'Suspense', 'Coming-of-Age', 'Period Piece'
];

const countryToLanguage = {
  'Japan': 'Japanese',
  'France': 'French',
  'Italy': 'Italian',
  'Germany': 'German',
  'Spain': 'Spanish',
  'Sweden': 'Swedish',
  'Denmark': 'Danish',
  'Norway': 'Norwegian',
  'China': 'Chinese',
  'South Korea': 'Korean',
  'Russia': 'Russian',
  'India': 'Hindi',
  'Mexico': 'Spanish',
  'Brazil': 'Portuguese',
  'UK': 'English',
  'United Kingdom': 'English',
  'USA': 'English',
  'United States': 'English',
  'Canada': 'English',
  'Australia': 'English',
  'Iran': 'Persian',
  'Poland': 'Polish',
  'Czechoslovakia': 'Czech',
  'Hungary': 'Hungarian',
  'Senegal': 'French',
  'Soviet Union': 'Russian',
  'Belgium': 'French/Dutch',
  'Netherlands': 'Dutch',
  'Argentina': 'Spanish',
  'Taiwan': 'Mandarin',
  'Hong Kong': 'Cantonese',
  'Egypt': 'Arabic',
  'Algeria': 'Arabic/French'
};

function localEnrich() {
  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  console.log(`Locally enriching ${catalog.length} films...`);

  let genreCount = 0;
  let langCount = 0;

  for (const film of catalog) {
    const text = (film.title + ' ' + (film.synopsis || '')).toLowerCase();
    
    // 1. Extract Genres
    const foundGenres = [];
    for (const g of commonGenres) {
      if (text.includes(g.toLowerCase())) {
        foundGenres.push(g);
      }
    }

    // 2. Logic-based Genres
    if (film.year < 1930 && film.year > 0 && !foundGenres.includes('Silent')) {
      foundGenres.push('Silent');
    }
    if (film.runtime > 0 && film.runtime < 45 && !foundGenres.includes('Short')) {
      foundGenres.push('Short');
    }
    if (film.title.toLowerCase().includes('interview') || film.title.toLowerCase().includes('conversation')) {
      if (!foundGenres.includes('Interview')) foundGenres.push('Interview');
    }
    
    if (foundGenres.length > 0) {
      film.genres = Array.from(new Set([...(film.genres || []), ...foundGenres]));
      genreCount++;
    }

    // 3. Language Fallback based on country
    if (!film.languages || film.languages.length === 0) {
      const country = film.countries && film.countries[0];
      if (country && countryToLanguage[country]) {
        film.languages = [countryToLanguage[country]];
        langCount++;
      }
    }
  }

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(catalog, null, 2));
  console.log(`Local enrichment complete.`);
  console.log(`- Updated genres for ${genreCount} films.`);
  console.log(`- Updated languages for ${langCount} films.`);
}

localEnrich();
