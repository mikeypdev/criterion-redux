export interface Person {
  id: string;
  name: string;
  role: 'director' | 'actor' | 'both';
  bio?: string;
  imageUrl?: string;
  tmdbId?: number;
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
  isColor: boolean;
  thumbnailUrl: string;
  dateAdded: string; // ISO format
  leavingSoon: boolean;
  enriched?: boolean;
  aspectRatio?: string;
  trailerKey?: string;
  trailerLink?: string;
  posterUrl?: string;
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  filmIds: string[];
  imageUrl?: string;
}
