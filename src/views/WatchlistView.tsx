import React from 'react';
import { useWatchlist } from '../context/WatchlistContext';
import { useData } from '../context/DataContext';
import FilmCard from '../components/FilmCard';
import styles from '../styles/watchlistView.module.css';
import { Link } from 'react-router-dom';

const WatchlistView: React.FC = () => {
  const { watchlist } = useWatchlist();
  const { catalog, isLoading } = useData();
  
  if (isLoading) {
    return <div className={styles.loading}>Retrieving your watchlist...</div>;
  }

  const savedFilms = catalog.filter(film => watchlist.includes(film.id));

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <h1 className={styles.title}>My Watchlist</h1>
        <p className={styles.subtitle}>Your personalized selection of cinematic masterpieces.</p>
      </header>

      {savedFilms.length > 0 ? (
        <div className={styles.grid}>
          {savedFilms.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      ) : (
        <div className={styles.empty}>
          <p>Your watchlist is currently empty.</p>
          <Link to="/index" className={styles.browseBtn}>Browse Films</Link>
        </div>
      )}
    </div>
  );
};

export default WatchlistView;
