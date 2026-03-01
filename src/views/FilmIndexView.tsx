import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { mockFilms } from '../data/mockData';
import styles from '../styles/filmIndex.module.css';

const FilmIndexView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedDecade, setSelectedDecade] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('title-asc');
  
  const [limit, setLimit] = useState(48);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchTerm(query);
    }
  }, [searchParams]);

  useEffect(() => {
    if (searchTerm) {
      setSearchParams({ search: searchTerm }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [searchTerm, setSearchParams]);

  // Reset limit when filters or sort change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLimit(48);
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, selectedColor, sortBy]);

  // Extract unique filter options from the dataset
  const decades = React.useMemo(() => Array.from(new Set(mockFilms.map(f => Math.floor(f.year / 10) * 10))).filter(d => d > 0).sort((a, b) => b - a), []);
  const countries = React.useMemo(() => Array.from(new Set(mockFilms.flatMap(f => f.countries))).filter(Boolean).sort(), []);
  const genres = React.useMemo(() => Array.from(new Set(mockFilms.flatMap(f => f.genres))).filter(Boolean).sort(), []);
  const languages = React.useMemo(() => Array.from(new Set(mockFilms.flatMap(f => f.languages))).filter(Boolean).sort(), []);

  const filteredFilms = React.useMemo(() => {
    return mockFilms.filter(film => {
      const isSpecificID = searchTerm === film.id;
      const matchesSearch = isSpecificID || 
                           film.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           film.directors.some(d => d.name.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesDecade = selectedDecade ? Math.floor(film.year / 10) * 10 === parseInt(selectedDecade) : true;
      const matchesCountry = selectedCountry ? film.countries.includes(selectedCountry) : true;
      const matchesGenre = selectedGenre ? film.genres.includes(selectedGenre) : true;
      const matchesLanguage = selectedLanguage ? film.languages.includes(selectedLanguage) : true;
      const matchesColor = selectedColor === 'color' ? film.isColor : selectedColor === 'bw' ? !film.isColor : true;
      
      return matchesSearch && matchesDecade && matchesCountry && matchesGenre && matchesLanguage && matchesColor;
    });
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, selectedColor]);

  // Infinite Scroll logic
  useEffect(() => {
    const target = observerTarget.current;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) {
          setLimit(prev => prev + 48);
        }
      },
      { threshold: 1.0, rootMargin: '400px' }
    );

    if (target) {
      observer.observe(target);
    }

    return () => {
      if (target) {
        observer.unobserve(target);
      }
    };
  }, [filteredFilms.length]); // Observe when filter results change

  const sortedFilms = React.useMemo(() => {
    return [...filteredFilms].sort((a, b) => {
      switch (sortBy) {
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'year-newest':
          return b.year - a.year;
        case 'year-oldest':
          return a.year - b.year;
        case 'added-newest': {
          const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
          const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
          return dateB - dateA;
        }
        default:
          return 0;
      }
    });
  }, [filteredFilms, sortBy]);

  const displayedFilms = sortedFilms.slice(0, limit);

  const clearFilters = () => {
    setSelectedDecade('');
    setSelectedCountry('');
    setSelectedGenre('');
    setSelectedLanguage('');
    setSelectedColor('');
    setSearchTerm('');
    setSearchParams({}, { replace: true });
    setSortBy('title-asc');
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>All Films ({sortedFilms.length})</h1>
        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Search films, directors..." 
            className={styles.search}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          {(searchTerm || selectedDecade || selectedCountry || selectedGenre || selectedLanguage || selectedColor) && (
            <button className={styles.clearBtn} onClick={clearFilters}>Clear All</button>
          )}
        </div>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Decade ({decades.length})</label>
          <select 
            className={styles.select}
            value={selectedDecade}
            onChange={(e) => setSelectedDecade(e.target.value)}
          >
            <option value="">All Decades</option>
            {decades.map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Country ({countries.length})</label>
          <select 
            className={styles.select}
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
          >
            <option value="">All Countries</option>
            {countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Genre ({genres.length})</label>
          <select 
            className={styles.select}
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
          >
            <option value="">All Genres</option>
            {genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Language ({languages.length})</label>
          <select 
            className={styles.select}
            value={selectedLanguage}
            onChange={(e) => setSelectedLanguage(e.target.value)}
          >
            <option value="">All Languages</option>
            {languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Format</label>
          <select 
            className={styles.select}
            value={selectedColor}
            onChange={(e) => setSelectedColor(e.target.value)}
          >
            <option value="">All Formats</option>
            <option value="color">Color</option>
            <option value="bw">Black & White</option>
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Sort By</label>
          <select 
            className={styles.select}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="year-newest">Release Date (Newest)</option>
            <option value="year-oldest">Release Date (Oldest)</option>
            <option value="added-newest">Date Added (Newest)</option>
          </select>
        </div>
      </div>

      <div className={styles.grid}>
        {displayedFilms.length > 0 ? (
          displayedFilms.map(film => <FilmCard key={film.id} film={film} />)
        ) : (
          <div className={styles.noResults}>No films match your criteria.</div>
        )}
      </div>

      {sortedFilms.length > limit && (
        <div ref={observerTarget} className={styles.loader}>
          <div className={styles.spinner}></div>
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
};

export default FilmIndexView;
