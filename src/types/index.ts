export interface Person {
  id: string;
  name: string;
  role: 'director' | 'actor' | 'both';
  bio?: string;
  imageUrl?: string;
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
}

export interface Collection {
  id: string;
  title: string;
  description: string;
  films: Film[];
}
