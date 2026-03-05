/**
 * Normalizes a string by converting it to lowercase and removing diacritics.
 * e.g., "Kōji" becomes "koji"
 */
export const normalizeString = (str: string): string => {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
};

/**
 * Checks if the target string includes the query string, after normalizing both.
 */
export const fuzzyIncludes = (target: string, query: string): boolean => {
  if (!target || !query) return false;
  return normalizeString(target).includes(normalizeString(query));
};
