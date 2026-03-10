import React, { useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import SupplementalCard from '../components/SupplementalCard';
import { useData } from '../context/DataContext';
import { fuzzyIncludes } from '../utils/searchUtils';
import styles from '../styles/filmIndex.module.css';
import type { SearchResult, Film, SupplementalResult } from '../types';

const FilmIndexView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { catalog, isLoading } = useData();
  
  // Single source of truth from URL
  const searchTerm = searchParams.get('search') || '';
  const selectedDecade = searchParams.get('decade') || '';
  const selectedCountry = searchParams.get('country') || '';
  const selectedGenre = searchParams.get('genre') || '';
  const selectedLanguage = searchParams.get('language') || '';
  const sortBy = searchParams.get('sort') || 'title-asc';
  
  const [limit, setLimit] = React.useState(48);
  const observerTarget = useRef<HTMLDivElement>(null);

  // Reset limit only when filters change
  useEffect(() => {
    setLimit(48);
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, sortBy]);

  const updateParam = (key: string, value: string) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    setSearchParams(newParams, { replace: true });
  };

  // Extract unique filter options
  const filterOptions = useMemo(() => {
    return {
      decades: Array.from(new Set(catalog.map(f => Math.floor(f.year / 10) * 10))).filter(d => d > 1800 && d < 2100).sort((a, b) => b - a),
      countries: Array.from(new Set(catalog.flatMap(f => f.countries))).filter(Boolean).sort(),
      genres: Array.from(new Set(catalog.flatMap(f => f.genres))).filter(Boolean).sort(),
      languages: Array.from(new Set(catalog.flatMap(f => f.languages))).filter(Boolean).sort(),
    };
  }, [catalog]);

  const { filmResults, supplementalResults } = useMemo(() => {
    const films: Film[] = [];
    const supplements: SupplementalResult[] = [];
    const isSearching = searchTerm.trim().length > 0;

    catalog.forEach(film => {
      const isSpecificID = searchTerm === film.id;
      const filmMatches = isSpecificID || 
                         fuzzyIncludes(film.title, searchTerm) ||
                         film.directors.some(d => fuzzyIncludes(d.name, searchTerm)) ||
                         film.cast.some(c => fuzzyIncludes(c.name, searchTerm)) ||
                         film.cinematographers?.some(c => fuzzyIncludes(c.name, searchTerm)) ||
                         film.composers?.some(c => fuzzyIncludes(c.name, searchTerm));
      
      const matchesDecade = selectedDecade ? Math.floor(film.year / 10) * 10 === parseInt(selectedDecade) : true;
      const matchesCountry = selectedCountry ? film.countries.includes(selectedCountry) : true;
      const matchesGenre = selectedGenre ? film.genres.includes(selectedGenre) : true;
      const matchesLanguage = selectedLanguage ? film.languages.includes(selectedLanguage) : true;
      
      const baseMatches = matchesDecade && matchesCountry && matchesGenre && matchesLanguage;

      if (filmMatches && baseMatches) {
        films.push(film);
      }

      if (isSearching && baseMatches) {
        film.supplemental?.forEach(sup => {
          if (fuzzyIncludes(sup.title, searchTerm)) {
            supplements.push({ type: 'supplement', supplement: sup, parentFilm: film });
          }
        });
      }
    });

    // Sort films
    films.sort((a, b) => {
      switch (sortBy) {
        case 'title-asc': return a.title.localeCompare(b.title);
        case 'title-desc': return b.title.localeCompare(a.title);
        case 'year-newest': return b.year - a.year;
        case 'year-oldest': return a.year - b.year;
        default: return 0;
      }
    });

    // Sort supplements by title
    supplements.sort((a, b) => a.supplement.title.localeCompare(b.supplement.title));

    return { filmResults: films, supplementalResults: supplements };
  }, [searchTerm, selectedDecade, selectedCountry, selectedGenre, selectedLanguage, sortBy, catalog]);

  // Infinite Scroll
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
    if (target) observer.observe(target);
    return () => { if (target) observer.unobserve(target); };
  }, [filmResults.length, supplementalResults.length]);

  if (isLoading) {
    return <div className={styles.loading}>Opening the vaults...</div>;
  }

  const clearFilters = () => setSearchParams({}, { replace: true });

  const displayedFilms = filmResults.slice(0, limit);

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>
          {searchTerm ? `Results for "${searchTerm}"` : 'All Films'}
          <span className={styles.countBadge}>{filmResults.length + supplementalResults.length}</span>
        </h1>
        <div className={styles.searchWrapper}>
          <input 
            type="text" 
            placeholder="Search films, directors, extras..." 
            className={styles.search}
            value={searchTerm}
            onChange={(e) => updateParam('search', e.target.value)}
          />
          {(searchTerm || selectedDecade || selectedCountry || selectedGenre || selectedLanguage) && (
            <button className={styles.clearBtn} onClick={clearFilters}>Clear All</button>
          )}
        </div>
      </header>

      <div className={styles.filtersBar}>
        <div className={styles.filterGroup}>
          <label className={styles.label}>Decade</label>
          <select className={styles.select} value={selectedDecade} onChange={(e) => updateParam('decade', e.target.value)}>
            <option value="">All Decades</option>
            {filterOptions.decades.map(d => <option key={d} value={d}>{d}s</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Country</label>
          <select className={styles.select} value={selectedCountry} onChange={(e) => updateParam('country', e.target.value)}>
            <option value="">All Countries</option>
            {filterOptions.countries.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Genre</label>
          <select className={styles.select} value={selectedGenre} onChange={(e) => updateParam('genre', e.target.value)}>
            <option value="">All Genres</option>
            {filterOptions.genres.map(g => <option key={g} value={g}>{g}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Language</label>
          <select className={styles.select} value={selectedLanguage} onChange={(e) => updateParam('language', e.target.value)}>
            <option value="">All Languages</option>
            {filterOptions.languages.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.label}>Sort By</label>
          <select className={styles.select} value={sortBy} onChange={(e) => updateParam('sort', e.target.value)}>
            <option value="title-asc">Title (A-Z)</option>
            <option value="title-desc">Title (Z-A)</option>
            <option value="year-newest">Release Date (Newest)</option>
            <option value="year-oldest">Release Date (Oldest)</option>
          </select>
        </div>
      </div>

      <section className={styles.resultsSection}>
        {supplementalResults.length > 0 && searchTerm && <h2 className={styles.resultsSubTitle}>Films</h2>}
        <div className={styles.grid}>
          {displayedFilms.length > 0 ? (
            displayedFilms.map(film => <FilmCard key={film.id} film={film} />)
          ) : (
            <div className={styles.noResults}>No films match your criteria.</div>
          )}
        </div>
      </section>

      {supplementalResults.length > 0 && searchTerm && (
        <section className={styles.resultsSection}>
          <h2 className={styles.resultsSubTitle}>Special Features</h2>
          <div className={styles.grid}>
            {supplementalResults.map((result, idx) => (
              <SupplementalCard 
                key={`sup-${result.parentFilm.id}-${result.supplement.id}-${idx}`} 
                supplement={result.supplement} 
                parentFilm={result.parentFilm} 
              />
            ))}
          </div>
        </section>
      )}

      {filmResults.length > limit && (
        <div ref={observerTarget} className={styles.loader}>
          <div className={styles.spinner}></div>
          <span>Loading more...</span>
        </div>
      )}
    </div>
  );
};

export default FilmIndexView;
