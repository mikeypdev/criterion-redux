import type { Film, Person, Collection } from '../types';

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

export const mockFilms: Film[] = [
  {
    id: 'seven-samurai',
    title: 'Seven Samurai',
    year: 1954,
    runtime: 207,
    directors: [Kurosawa],
    cast: [Mifune],
    synopsis: 'A poor village under attack by bandits recruits seven unemployed samurai to help them defend themselves.',
    genres: ['Action', 'Drama', 'Period Piece'],
    countries: ['Japan'],
    languages: ['Japanese'],
    isColor: false,
    thumbnailUrl: 'https://images.criterionchannel.com/images/7-samurai.jpg',
    dateAdded: '2023-11-01',
    leavingSoon: false,
  },
  {
    id: 'rashomon',
    title: 'Rashomon',
    year: 1950,
    runtime: 88,
    directors: [Kurosawa],
    cast: [Mifune],
    synopsis: 'Brimming with action while incisively examining the nature of truth, Rashomon is perhaps the finest film ever to investigate the philosophy of justice.',
    genres: ['Drama', 'Mystery'],
    countries: ['Japan'],
    languages: ['Japanese'],
    isColor: false,
    thumbnailUrl: 'https://images.criterionchannel.com/images/rashomon.jpg',
    dateAdded: '2023-10-15',
    leavingSoon: true,
  },
  {
    id: 'seventh-seal',
    title: 'The Seventh Seal',
    year: 1957,
    runtime: 96,
    directors: [Bergman],
    cast: [],
    synopsis: 'Disillusioned and exhausted after the Crusades, a knight and his squire return to Sweden to find the country ravaged by the Black Death.',
    genres: ['Drama', 'Fantasy'],
    countries: ['Sweden'],
    languages: ['Swedish'],
    isColor: false,
    thumbnailUrl: 'https://images.criterionchannel.com/images/seventh-seal.jpg',
    dateAdded: '2023-09-20',
    leavingSoon: false,
  },
  {
    id: 'the-39-steps',
    title: 'The 39 Steps',
    year: 1935,
    runtime: 86,
    directors: [Hitchcock],
    cast: [],
    synopsis: 'A man in London tries to help a counter-espionage agent, but when the agent is killed and the man stands accused, he must go on the run to save himself.',
    genres: ['Thriller', 'Action'],
    countries: ['UK'],
    languages: ['English'],
    isColor: false,
    thumbnailUrl: 'https://images.criterionchannel.com/images/39-steps.jpg',
    dateAdded: '2024-01-05',
    leavingSoon: true,
  }
];

export const mockCollections: Collection[] = [
  {
    id: 'kurosawa-essentials',
    title: 'Akira Kurosawa Essentials',
    description: 'The masterworks of one of cinemas greatest visual stylists.',
    films: mockFilms.filter(f => f.directors.some(d => d.id === 'akira-kurosawa'))
  },
  {
    id: 'leaving-soon-jan',
    title: 'Leaving January 31',
    description: 'Catch these masterpieces before they depart.',
    films: mockFilms.filter(f => f.leavingSoon)
  }
];

export const mockPersons: Person[] = [Kurosawa, Mifune, Hitchcock, Bergman];
