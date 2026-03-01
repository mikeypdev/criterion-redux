import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    const query = searchParams.get('search');
    if (query !== null) {
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

  // Extract unique filter options from the dataset
  const decades = Array.from(new Set(mockFilms.map(f => Math.floor(f.year / 10) * 10))).sort((a, b) => b - a);
  const countries = Array.from(new Set(mockFilms.flatMap(f => f.countries))).sort();
  const genres = Array.from(new Set(mockFilms.flatMap(f => f.genres))).sort();
  const languages = Array.from(new Set(mockFilms.flatMap(f => f.languages))).sort();

  const filteredFilms = mockFilms.filter(film => {
    // If searchTerm is a specific film ID (passed from search dropdown)
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

  const sortedFilms = [...filteredFilms].sort((a, b) => {
    switch (sortBy) {
      case 'title-asc':
        return a.title.localeCompare(b.title);
      case 'title-desc':
        return b.title.localeCompare(a.title);
      case 'year-newest':
        return b.year - a.year;
      case 'year-oldest':
        return a.year - b.year;
      case 'added-newest':
        return new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime();
      default:
        return 0;
    }
  });

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
        <h1 className={styles.title}>All Films</h1>
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
          <label className={styles.label}>Decade</label>
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
          <label className={styles.label}>Country</label>
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
          <label className={styles.label}>Genre</label>
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
          <label className={styles.label}>Language</label>
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
        {sortedFilms.length > 0 ? (
          sortedFilms.map(film => <FilmCard key={film.id} film={film} />)
        ) : (
          <div className={styles.noResults}>No films match your criteria.</div>
        )}
      </div>
    </div>
  );
};

export default FilmIndexView;
