import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { useData } from '../context/DataContext';
import styles from '../styles/filmIndex.module.css';

const FilmIndexView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalog } = useData();
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedDecade, setSelectedDecade] = useState<string>('');
  const [selectedCountry, setSelectedCountry] = useState<string>('');
  const [selectedGenre, setSelectedGenre] = useState<string>('');
  const [selectedLanguage, setSelectedLanguage] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('title-asc');
  
  const [limit, setLimit] = useState(48);
  const observerTarget = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
      setSearchTerm(query);
    }
    const genre = searchParams.get('genre');
    if (genre !== null) {
      setSelectedGenre(genre);
    }
  }, [searchParams]);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedGenre) params.genre = selectedGenre;
    
    // Only update if they differ from current to avoid loops
    const currentSearch = searchParams.get('search') || '';
    const currentGenre = searchParams.get('genre') || '';
    
    if (searchTerm !== currentSearch || selectedGenre !== currentGenre) {
      setSearchParams(params, { replace: true });
    }
  }, [searchTerm, selectedGenre, setSearchParams, searchParams]);

  // Reset limit when filters or sort change
  useEffect(() => {
    setLimit(48);
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, sortBy]);

  // Extract unique filter options from the dataset
  const decades = React.useMemo(() => Array.from(new Set(catalog.map(f => Math.floor(f.year / 10) * 10))).filter(d => d > 0).sort((a, b) => b - a), [catalog]);
  const countries = React.useMemo(() => Array.from(new Set(catalog.flatMap(f => f.countries))).filter(Boolean).sort(), [catalog]);
  const genres = React.useMemo(() => Array.from(new Set(catalog.flatMap(f => f.genres))).filter(Boolean).sort(), [catalog]);
  const languages = React.useMemo(() => Array.from(new Set(catalog.flatMap(f => f.languages))).filter(Boolean).sort(), [catalog]);

  const filteredFilms = React.useMemo(() => {
    const q = searchTerm.toLowerCase();
    return catalog.filter(film => {
      const isSpecificID = searchTerm === film.id;
      const matchesSearch = isSpecificID || 
                           film.title.toLowerCase().includes(q) ||
                           film.directors.some(d => d.name.toLowerCase().includes(q)) ||
                           film.cast.some(c => c.name.toLowerCase().includes(q));
      
      const matchesDecade = selectedDecade ? Math.floor(film.year / 10) * 10 === parseInt(selectedDecade) : true;
      const matchesCountry = selectedCountry ? film.countries.includes(selectedCountry) : true;
      const matchesGenre = selectedGenre ? film.genres.includes(selectedGenre) : true;
      const matchesLanguage = selectedLanguage ? film.languages.includes(selectedLanguage) : true;
      
      return matchesSearch && matchesDecade && matchesCountry && matchesGenre && matchesLanguage;
    });
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, catalog]);

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
          {(searchTerm || selectedDecade || selectedCountry || selectedGenre || selectedLanguage) && (
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
