import React, { useState } from 'react';
import type { Film } from '../types';
import PersonLink from './PersonLink';
import styles from '../styles/filmCard.module.css';
import { useWatchlist } from '../context/WatchlistContext';

interface FilmCardProps {
  film: Film;
}

const FilmCard: React.FC<FilmCardProps> = ({ film }) => {
  const [isHovered, setIsHovered] = useState(false);
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();

  const isSaved = isInWatchlist(film.id);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isSaved) {
      removeFromWatchlist(film.id);
    } else {
      addToWatchlist(film.id);
    }
  };

  return (
    <div 
      className={styles.root}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className={styles.thumbnailWrapper}>
        <img src={film.thumbnailUrl} alt={film.title} className={styles.thumbnail} />
        {film.leavingSoon && <div className={styles.badge}>Leaving Soon</div>}
        {isSaved && <div className={`${styles.badge} ${styles.watchlistBadge}`}>Watchlist</div>}
        
        <div className={`${styles.overlay} ${isHovered ? styles.overlayVisible : ''}`}>
          <div className={styles.content}>
            <h3 className={styles.title}>{film.title}</h3>
            <p className={styles.meta}>{film.year} • {film.runtime} min</p>
            
            <div className={styles.director}>
              Dir: {film.directors.map((d, i) => (
                <React.Fragment key={d.id}>
                  <PersonLink person={d} />
                  {i < film.directors.length - 1 && ', '}
                </React.Fragment>
              ))}
            </div>

            <div className={styles.cast}>
              {film.cast.length > 0 && 'Cast: '}
              {film.cast.map((p, i) => (
                <React.Fragment key={p.id}>
                  <PersonLink person={p} />
                  {i < film.cast.length - 1 && ', '}
                </React.Fragment>
              ))}
            </div>

            <p className={styles.synopsis}>{film.synopsis}</p>
            
            <div className={styles.genres}>
              {film.genres.map(genre => (
                <span key={genre} className={styles.genreTag}>{genre}</span>
              ))}
            </div>

            <button 
              className={`${styles.watchlistBtn} ${isSaved ? styles.isSaved : ''}`}
              onClick={toggleWatchlist}
            >
              {isSaved ? '– Remove' : '+ Watchlist'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilmCard;
