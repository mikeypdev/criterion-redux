import type { Film, Person, Collection } from '../types';
import catalogData from './catalog.json';

// Cast the imported JSON to the Film type
const catalogFilms = catalogData as Film[];

// We keep these "Featured Persons" because they have hand-written bios 
// that the scraper doesn't fetch yet.
const Kurosawa: Person = { 
  id: 'akira-kurosawa', 
  name: 'Akira Kurosawa', 
  role: 'director',
  bio: 'Akira Kurosawa was a Japanese filmmaker and painter who directed 30 films in a career spanning 57 years. He is regarded as one of the most important and influential filmmakers in the history of cinema.'
};
const Mifune: Person = { 
  id: 'toshiro-mifune', 
  name: 'Toshiro Mifune', 
  role: 'actor',
  bio: 'Toshiro Mifune was a Japanese actor who appeared in almost 170 feature films. He is best known for his 16-film collaboration with filmmaker Akira Kurosawa.'
};
const Hitchcock: Person = { 
  id: 'alfred-hitchcock', 
  name: 'Alfred Hitchcock', 
  role: 'director',
  bio: 'Sir Alfred Hitchcock was an English film director, producer, and screenwriter. He is one of the most influential and widely studied filmmakers in the history of cinema.'
};
const Bergman: Person = { 
  id: 'ingmar-bergman', 
  name: 'Ingmar Bergman', 
  role: 'director',
  bio: 'Ernst Ingmar Bergman was a Swedish film director, screenwriter, and producer. He is widely considered one of the most accomplished and influential filmmakers of all time.'
};

// All films now come from the catalog
export const mockFilms: Film[] = catalogFilms;

export const mockCollections: Collection[] = [
  {
    id: 'newly-added',
    title: 'Newly Added',
    description: 'Fresh additions to the Criterion Channel library.',
    films: catalogFilms.slice(10, 30)
  },
  {
    id: 'kurosawa-essentials',
    title: 'Akira Kurosawa Essentials',
    description: 'The masterworks of one of cinemas greatest visual stylists.',
    films: catalogFilms.filter(f => f.directors.some(d => d.name.includes('Akira Kurosawa')))
  },
  {
    id: 'leaving-soon-jan',
    title: 'Leaving January 31',
    description: 'Catch these masterpieces before they depart.',
    films: catalogFilms.filter(f => f.leavingSoon)
  }
];

export const mockPersons: Person[] = [Kurosawa, Mifune, Hitchcock, Bergman];
