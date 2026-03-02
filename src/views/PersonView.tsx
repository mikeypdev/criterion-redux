import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { useData } from '../context/DataContext';
import type { Person } from '../types';
import styles from '../styles/personView.module.css';

const PersonView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { catalog, isLoading } = useData();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (isLoading) {
    return <div className={styles.loading}>Searching the archives...</div>;
  }
  
  // Find person in the entire film dataset
  let person: Person | undefined;
  for (const film of catalog) {
    const foundDirector = film.directors.find(d => d.id === id);
    if (foundDirector) { person = foundDirector; break; }
    
    const foundCast = film.cast.find(c => c.id === id);
    if (foundCast) { person = foundCast; break; }

    const foundDP = film.cinematographers?.find(c => c.id === id);
    if (foundDP) { person = foundDP; break; }

    const foundComposer = film.composers?.find(c => c.id === id);
    if (foundComposer) { person = foundComposer; break; }
  }

  const films = catalog.filter(f => 
    f.directors.some(d => d.id === id) || 
    f.cast.some(c => c.id === id) ||
    f.cinematographers?.some(c => c.id === id) ||
    f.composers?.some(c => c.id === id)
  );

  if (!person) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h2>Person not found.</h2>
        <Link to="/" style={{ color: 'var(--accent)', marginTop: '20px', display: 'block' }}>Back to Home</Link>
      </div>
    );
  }

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div className={styles.info}>
          <h1 className={styles.name}>{person.name}</h1>
          <div className={styles.metaRow}>
            <p className={styles.role}>{person.role.toUpperCase()}</p>
            {person.tmdbId && (
              <a 
                href={`https://www.themoviedb.org/person/${person.tmdbId}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className={styles.tmdbLink}
              >
                View on TMDB ↗
              </a>
            )}
          </div>
          {person.bio && <p className={styles.bio}>{person.bio}</p>}
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Films on Criterion Redux</h2>
        <div className={styles.grid}>
          {films.length > 0 ? (
            films.map(film => <FilmCard key={film.id} film={film} />)
          ) : (
            <p style={{ color: 'var(--text-secondary)' }}>No films currently available.</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default PersonView;
