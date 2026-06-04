import axios from 'axios';
import fs from 'fs';
import path from 'path';
import Bottleneck from 'bottleneck';

const CATALOG_PATH = path.resolve('public/data/catalog.json');
const COLLECTIONS_PATH = path.resolve('public/data/collections.json');

const HEAD_TIMEOUT_MS = 8000;
const MIN_TIME_MS = 200; // ~5 req/s — gentle on Criterion

const limiter = new Bottleneck({
  minTime: MIN_TIME_MS,
  // If Criterion rate-limits us (429), ease off instead of hammering.
  reservoir: 20,
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 4000,
});

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36';

async function checkLiveness(url) {
  const MAX_RETRIES = 2;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const r = await limiter.schedule(() => axios.head(url, {
        maxRedirects: 5,
        validateStatus: () => true,
        timeout: HEAD_TIMEOUT_MS,
        headers: { 'User-Agent': USER_AGENT }
      }));
      // If rate-limited, back off and retry — don't treat 429 as a removal signal.
      if (r.status === 429 && attempt < MAX_RETRIES) {
        const retryAfter = parseInt(r.headers['retry-after'] || '0', 10);
        const waitMs = retryAfter > 0 ? retryAfter * 1000 : 2000;
        await new Promise(res => setTimeout(res, waitMs));
        continue;
      }
      return { status: r.status, location: r.headers.location || '' };
    } catch (e) {
      if (attempt < MAX_RETRIES) {
        await new Promise(res => setTimeout(res, 1000));
        continue;
      }
      return { status: 0, location: '', error: e.message };
    }
  }
}

function isStaleStatus(status) {
  // Only definitive removal signals count. Transient / ambiguous 4xx codes
  // (429 rate limit, 408 timeout, 425 too early, 451 legal, 401/403 auth)
  // are left alone so the next sync can retry them.
  return status === 404 || status === 410;
}

async function pruneFilms(catalog) {
  const targets = catalog.filter(f => f.link && !f._remove);
  if (targets.length === 0) {
    console.log('>>> Liveness sweep: no films with links to check.');
    return 0;
  }

  console.log(`>>> Liveness sweep: checking ${targets.length} film links...`);

  let removed = 0;
  let networkErrors = 0;
  let byStatus = {};
  let processed = 0;

  // Process in chunks for progress reporting without holding all promises at once
  const CHUNK = 200;
  for (let i = 0; i < targets.length; i += CHUNK) {
    const chunk = targets.slice(i, i + CHUNK);
    const results = await Promise.all(
      chunk.map(async (film) => {
        const r = await checkLiveness(film.link);
        return { film, ...r };
      })
    );

    for (const r of results) {
      processed++;
      const key = r.status === 0 ? 'NETERR' : String(r.status);
      byStatus[key] = (byStatus[key] || 0) + 1;
      if (isStaleStatus(r.status)) {
        r.film._remove = true;
        removed++;
      } else if (r.status === 0) {
        networkErrors++;
      }
    }
    process.stdout.write(`\r    progress: ${processed}/${targets.length}`);
  }
  process.stdout.write('\n');

  console.log(`>>> Status breakdown:`, byStatus);
  console.log(`>>> Marked ${removed} films for removal (4xx).`);
  if (networkErrors > 0) {
    console.log(`>>> ${networkErrors} films had transient/network errors — left for next sync.`);
  }
  return removed;
}

function pruneCollections(collections, catalog) {
  const aliveFilmIds = new Set(catalog.filter(f => !f._remove).map(f => f.id));
  let removed = 0;
  for (const col of collections) {
    if (col._remove) continue;
    const liveCount = (col.filmIds || []).filter(id => aliveFilmIds.has(id)).length;
    if (liveCount === 0 && (col.filmIds || []).length > 0) {
      col._remove = true;
      removed++;
    }
  }
  console.log(`>>> Marked ${removed} collections as fully stale (all member films gone).`);
  return removed;
}

async function main() {
  if (!fs.existsSync(CATALOG_PATH)) {
    console.error(`Catalog not found at ${CATALOG_PATH}. Run scraper.js first.`);
    process.exit(1);
  }
  if (!fs.existsSync(COLLECTIONS_PATH)) {
    console.error(`Collections not found at ${COLLECTIONS_PATH}. Run scrape_collections.js first.`);
    process.exit(1);
  }

  const catalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
  const collections = JSON.parse(fs.readFileSync(COLLECTIONS_PATH, 'utf-8'));

  console.log(`--- PRUNING STALE FILMS ---`);
  console.log(`Loaded ${catalog.length} films, ${collections.length} collections.`);

  await pruneFilms(catalog);
  pruneCollections(collections, catalog);

  const cleanCatalog = catalog.filter(f => !f._remove);
  const cleanCollections = collections.filter(c => !c._remove);

  fs.writeFileSync(CATALOG_PATH, JSON.stringify(cleanCatalog, null, 2));
  fs.writeFileSync(COLLECTIONS_PATH, JSON.stringify(cleanCollections, null, 2));

  const filmDelta = catalog.length - cleanCatalog.length;
  const colDelta = collections.length - cleanCollections.length;
  console.log(`--- PRUNE COMPLETE ---`);
  console.log(`Removed: ${filmDelta} films, ${colDelta} collections.`);
  console.log(`Remaining: ${cleanCatalog.length} films, ${cleanCollections.length} collections.`);
}

main().catch(err => {
  console.error('Prune failed:', err);
  process.exit(1);
});
