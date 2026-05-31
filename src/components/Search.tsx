import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/useData';
import { fuzzyIncludes } from '../utils/searchUtils';
import styles from '../styles/search.module.css';

const Search: React.FC = () => {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const searchRef = useRef<HTMLDivElement>(null);
  
  const { catalog: films, collections } = useData();

  const { filmResults, collectionResults } = React.useMemo(() => {
    if (query.length <= 1) return { filmResults: [], collectionResults: [] };

    const matchedFilms = films
      .filter(f => f.year > 0)
      .filter(f => 
        fuzzyIncludes(f.title, query) ||
        f.directors.some(d => fuzzyIncludes(d.name, query)) ||
        f.cast.some(c => fuzzyIncludes(c.name, query)) ||
        f.cinematographers?.some(c => fuzzyIncludes(c.name, query)) ||
        f.composers?.some(c => fuzzyIncludes(c.name, query)) ||
        f.writers?.some(w => fuzzyIncludes(w.name, query)) ||
        f.supplemental?.some(s => fuzzyIncludes(s.title, query))
      )
      .slice(0, 5);

    const matchedCollections = collections
      .filter(c =>
        fuzzyIncludes(c.title, query) ||
        fuzzyIncludes(c.description, query)
      )
      .slice(0, 3);

    return { filmResults: matchedFilms, collectionResults: matchedCollections };
  }, [query, films, collections]);

  const hasResults = filmResults.length > 0 || collectionResults.length > 0;

  useEffect(() => {
    setIsOpen(hasResults);
  }, [hasResults]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectFilm = (filmId: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/film/${filmId}`);
  };

  const handleSelectCollection = (collectionId: string) => {
    setQuery('');
    setIsOpen(false);
    navigate(`/collections/${collectionId}`);
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

      {isOpen && hasResults && (
        <div className={styles.dropdown}>
          {filmResults.map(film => (
            <div key={film.id} className={styles.resultItem} onClick={() => handleSelectFilm(film.id)}>
              <img src={film.thumbnailUrl} alt={film.title} className={styles.resultThumb} />
              <div className={styles.resultInfo}>
                <div className={styles.resultTitle}>{film.title}</div>
                <div className={styles.resultMeta}>{film.year} • {film.directors.map(d => d.name).join(', ')}</div>
              </div>
            </div>
          ))}
          {collectionResults.length > 0 && (
            <div className={styles.sectionLabel}>Collections</div>
          )}
          {collectionResults.map(col => (
            <div key={col.id} className={styles.resultItem} onClick={() => handleSelectCollection(col.id)}>
              <div className={styles.collectionThumb}>
                {col.imageUrl ? (
                  <img src={col.imageUrl} alt="" className={styles.collectionThumbImg} />
                ) : (
                  <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="1.5" fill="none"><rect x="2" y="3" width="20" height="18" rx="2"/><line x1="2" y1="9" x2="22" y2="9"/><line x1="8" y1="3" x2="8" y2="21"/></svg>
                )}
              </div>
              <div className={styles.resultInfo}>
                <div className={styles.resultTitle}>{col.title}</div>
                <div className={styles.resultMeta}>{col.filmIds.length} Titles</div>
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
