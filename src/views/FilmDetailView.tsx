import React, { useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import PersonLink from '../components/PersonLink';
import { useWatchlist } from '../context/WatchlistContext';
import styles from '../styles/filmDetailView.module.css';

const FilmDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { addToWatchlist, removeFromWatchlist, isInWatchlist } = useWatchlist();
  const { catalog, isLoading } = useData();
  const [showTrailer, setShowTrailer] = React.useState(false);

  const film = catalog.find(f => f.id === id);
  const isSaved = film ? isInWatchlist(film.id) : false;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (isLoading) {
    return <div className={styles.loading}>Loading film details...</div>;
  }

  if (!film) {
    return (
      <div className={styles.notFound}>
        <h2>Film not found</h2>
        <Link to="/index" className={styles.backLink}>Return to Index</Link>
      </div>
    );
  }

  const toggleWatchlist = () => {
    if (isSaved) {
      removeFromWatchlist(film.id);
    } else {
      addToWatchlist(film.id);
    }
  };

  return (
    <div className={styles.root}>
      {showTrailer && film.trailerKey && (
        <div className={styles.trailerModal} onClick={() => setShowTrailer(false)}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <button className={styles.closeModal} onClick={() => setShowTrailer(false)}>✕</button>
            <iframe 
              width="100%" 
              height="100%" 
              src={`https://www.youtube.com/embed/${film.trailerKey}?autoplay=1`} 
              title="YouTube video player" 
              frameBorder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      )}

      <header className={styles.hero}>
        <div className={styles.backdropWrapper}>
          <img 
            src={film.posterUrl || film.thumbnailUrl} 
            alt="" 
            className={styles.backdrop} 
          />
          <div className={styles.vignette} />
        </div>

        <div className={styles.heroContent}>
          <button onClick={() => navigate(-1)} className={styles.backBtn}>
            ← Back
          </button>
          
          <h1 className={styles.title}>{film.title}</h1>
          {film.originalTitle && <h2 className={styles.originalTitle}>{film.originalTitle}</h2>}
          {film.tagline && <p className={styles.tagline}>“{film.tagline}”</p>}
          
          <div className={styles.metaLine}>
            <span>{film.year}</span>
            {film.runtime > 0 && <span>{film.runtime} MIN</span>}
            {film.aspectRatio && <span>{film.aspectRatio}</span>}
          </div>

          <div className={styles.actions}>
            {film.link ? (
              <a 
                href={film.link} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.playBtn}
              >
                ▶ Watch Now
              </a>
            ) : (
              <button className={styles.playBtn} disabled>▶ Unavailable</button>
            )}
            
            {film.trailerKey && (
              <button className={styles.trailerBtn} onClick={() => setShowTrailer(true)}>
                🎬 YouTube Trailer
              </button>
            )}

            {film.trailerLink && (
              <a 
                href={film.trailerLink} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.trailerBtn}
              >
                🎬 Criterion Trailer
              </a>
            )}

            {film.imdbId && (
              <a 
                href={`https://www.imdb.com/title/${film.imdbId}`} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={styles.imdbLink}
              >
                IMDb
              </a>
            )}

            <button 
              className={`${styles.watchlistBtn} ${isSaved ? styles.isSaved : ''}`}
              onClick={toggleWatchlist}
            >
              {isSaved ? '✓ In Watchlist' : '+ Add to Watchlist'}
            </button>
          </div>
        </div>
      </header>

      <div className={styles.container}>
        <div className={styles.mainContent}>
          <section className={styles.description}>
            <p className={styles.synopsis}>
              {film.synopsis || 'No synopsis available for this title.'}
              {film.synopsisSource && (
                <span className={styles.sourceBadge}>Source: {film.synopsisSource.toUpperCase()}</span>
              )}
            </p>
          </section>

          <section className={styles.credits}>
            <div className={styles.creditGroup}>
              <h3 className={styles.creditLabel}>Directed by</h3>
              <div className={styles.creditNames}>
                {film.directors.map(d => (
                  <PersonLink key={d.id} person={d} />
                ))}
              </div>
            </div>

            {film.cinematographers && film.cinematographers.length > 0 && (
              <div className={styles.creditGroup}>
                <h3 className={styles.creditLabel}>Cinematography</h3>
                <div className={styles.creditNames}>
                  {film.cinematographers.map(c => (
                    <PersonLink key={c.id} person={c} />
                  ))}
                </div>
              </div>
            )}

            {film.composers && film.composers.length > 0 && (
              <div className={styles.creditGroup}>
                <h3 className={styles.creditLabel}>Original Score</h3>
                <div className={styles.creditNames}>
                  {film.composers.map(c => (
                    <PersonLink key={c.id} person={c} />
                  ))}
                </div>
              </div>
            )}

            {film.cast.length > 0 && (
              <div className={styles.creditGroup}>
                <h3 className={styles.creditLabel}>Starring</h3>
                <div className={styles.creditNames}>
                  {film.cast.map(c => (
                    <PersonLink key={c.id} person={c} />
                  ))}
                </div>
              </div>
            )}

            {film.genres.length > 0 && (
              <div className={styles.creditGroup}>
                <h3 className={styles.creditLabel}>Genres</h3>
                <div className={styles.genres}>
                  {film.genres.map(g => (
                    <span 
                      key={g} 
                      className={styles.genreTag}
                      style={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/index?genre=${encodeURIComponent(g)}`)}
                    >
                      {g}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.sidebar}>
          <div className={styles.editionInfo}>
            <h3 className={styles.sidebarTitle}>The Criterion Redux</h3>
            <p>This title is available as part of our permanent library. Subtitles available in English.</p>
          </div>
          {film.leavingSoon && (
            <div className={styles.urgencyBox}>
              <strong>Leaving Soon</strong>
              <p>This film is scheduled to leave the service at the end of the month.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default FilmDetailView;
