import type { Film, Collection } from '../types';

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Returns true if the collection title indicates it is a "leaving soon"
 * collection — i.e. contains the word "leaving" and a month name.
 *
 * Examples that match: "Leaving June 30", "leaving-may-31", "Films Leaving April".
 * Examples that do NOT match: "Leaving Las Vegas", "The New American Cinema",
 * "Martin Scorsese's Leaving Home" (no month).
 */
export function isLeavingSoonCollection(title: string): boolean {
  const t = title.toLowerCase();
  if (!t.includes('leaving')) return false;
  return MONTHS.some(m => t.includes(m));
}

/**
 * Derives the "leaving soon" film list directly from the collections list,
 * rather than from a per-film boolean flag. This is more durable because
 * it does not depend on a side-effect of scrape_collections.js having run.
 *
 * The order of films follows the order they appear in their collections,
 * with duplicates removed. Only films present in the catalog are returned,
 * so a 404'd film is silently excluded.
 */
export function getLeavingSoonFilms(
  collections: Collection[],
  catalog: Film[]
): Film[] {
  const catalogMap = new Map(catalog.map(f => [f.id, f]));
  const seen = new Set<string>();
  const result: Film[] = [];
  for (const col of collections) {
    if (!isLeavingSoonCollection(col.title)) continue;
    for (const fid of col.filmIds || []) {
      if (seen.has(fid)) continue;
      const f = catalogMap.get(fid);
      if (f) {
        seen.add(fid);
        result.push(f);
      }
    }
  }
  return result;
}

/**
 * Returns the cover image for the synthesized "leaving soon" pseudo-collection,
 * preferring a 4K poster from any of the films, falling back to a thumbnail.
 */
export function getLeavingSoonImage(films: Film[]): string {
  for (const f of films) {
    if (f.posterUrl) return f.posterUrl;
  }
  for (const f of films) {
    if (f.thumbnailUrl) return f.thumbnailUrl;
  }
  return '';
}

/**
 * Returns a Set of film IDs that are in any "leaving [month]" collection.
 * Use this to check per-film leaving-soon status in O(1) anywhere in the app
 * without trusting the per-film `leavingSoon` flag (which depends on a recent
 * scrape_collections.js run having applied it).
 */
export function getLeavingSoonFilmIds(collections: Collection[]): Set<string> {
  const ids = new Set<string>();
  for (const col of collections) {
    if (!isLeavingSoonCollection(col.title)) continue;
    for (const fid of col.filmIds || []) {
      ids.add(fid);
    }
  }
  return ids;
}
