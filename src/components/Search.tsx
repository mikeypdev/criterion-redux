import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { fuzzyIncludes } from '../utils/searchUtils';
import styles from '../styles/search.module.css';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { catalog: films } = useData();

  const results = React.useMemo(() => {
    if (query.length > 1) {
      return films.filter(f => 
        fuzzyIncludes(f.title, query) ||
        f.directors.some(d => fuzzyIncludes(d.name, query)) ||
        f.cast.some(c => fuzzyIncludes(c.name, query)) ||
        f.cinematographers?.some(c => fuzzyIncludes(c.name, query)) ||
        f.composers?.some(c => fuzzyIncludes(c.name, query))
      ).slice(0, 5);
    }
    return [];
  }, [query, films]);

  useEffect(() => {
    setIsOpen(results.length > 0);
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (filmId: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/film/${filmId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query) {
      navigate(`/index?search=${encodeURIComponent(query)}`);
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.root} ref={searchRef}>
      <div className={styles.inputWrapper}>
        <svg className={styles.icon} viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input 
          type="text" 
          placeholder="Search..." 
          className={styles.input}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => query.length > 1 && setIsOpen(true)}
        />
      </div>

      {isOpen && results.length > 0 && (
        <div className={styles.dropdown}>
          {results.map(film => (
            <div key={film.id} className={styles.resultItem} onClick={() => handleSelect(film.id)}>
              <img src={film.thumbnailUrl} alt={film.title} className={styles.resultThumb} />
              <div className={styles.resultInfo}>
                <div className={styles.resultTitle}>{film.title}</div>
                <div className={styles.resultMeta}>{film.year} • {film.directors.map(d => d.name).join(', ')}</div>
              </div>
            </div>
          ))}
          <div className={styles.viewAll} onClick={() => navigate(`/index?search=${encodeURIComponent(query)}`)}>
            View all results for "{query}"
          </div>
        </div>
      )}
    </div>
  );
};

export default Search;
