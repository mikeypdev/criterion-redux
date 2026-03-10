export interface Person {
  id: string;
  name: string;
  role: 'director' | 'actor' | 'both';
  bio?: string;
  imageUrl?: string;
  tmdbId?: number;
}

export interface SupplementalContent {
  id: string;
  title: string;
  link: string;
  thumbnailUrl: string;
  runtime?: number;
}

export interface Film {
  id: string;
  title: string;
  link?: string;
  year: number;
  runtime: number; // in minutes
  directors: Person[];
  cast: Person[];
  synopsis: string;
  genres: string[];
  countries: string[];
  languages: string[];
  thumbnailUrl: string;
  dateAdded: string; // ISO format
  leavingSoon: boolean;
  enriched?: boolean;
  tmdbAttempted?: boolean;
  aspectRatio?: string;
  trailerKey?: string;
  trailerLink?: string;
  posterUrl?: string;
  tagline?: string;
  synopsisSource?: 'criterion' | 'tmdb';
  originalTitle?: string;
  imdbId?: string;
  cinematographers?: Person[];
  composers?: Person[];
  supplemental?: SupplementalContent[];
}

export interface SyncStatus {
  lastUpdated: string;
  filmCount: number;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  filmIds: string[];
}

export interface SupplementalResult {
  type: 'supplement';
  supplement: SupplementalContent;
  parentFilm: Film;
}

export type SearchResult = { type: 'film'; film: Film } | SupplementalResult;
