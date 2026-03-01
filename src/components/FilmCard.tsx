import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();

  const isSaved = isInWatchlist(film.id);

  const toggleWatchlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isSaved) {
      removeFromWatchlist(film.id);
    } else {
      addToWatchlist(film.id);
    }
  };

  const handleCardClick = () => {
    navigate(`/film/${film.id}`);
  };

  return (
    <div 
      className={styles.root}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleCardClick}
    >
      <div className={styles.thumbnailWrapper}>
        <img src={film.thumbnailUrl} alt={film.title} className={styles.thumbnail} />
        {film.leavingSoon && <div className={styles.badge}>Leaving Soon</div>}
        {isSaved && <div className={`${styles.badge} ${styles.watchlistBadge}`}>Watchlist</div>}
        
        <div className={`${styles.overlay} ${isHovered ? styles.overlayVisible : ''}`}>
          <div className={styles.content}>
            <h3 className={styles.title}>{film.title}</h3>
            <p className={styles.meta}>{film.year} • {film.runtime > 0 ? `${film.runtime} min` : ''}</p>
            
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
              {film.cast.slice(0, 3).map((p, i) => (
                <React.Fragment key={p.id}>
                  <PersonLink person={p} />
                  {i < Math.min(film.cast.length, 3) - 1 && ', '}
                </React.Fragment>
              ))}
              {film.cast.length > 3 && '...'}
            </div>

            <p className={styles.synopsis}>{film.synopsis}</p>
            
            <div className={styles.genres}>
              {film.genres.slice(0, 2).map(genre => (
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
