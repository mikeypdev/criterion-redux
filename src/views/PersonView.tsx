import React from 'react';
import { useParams, Link } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { mockFilms, mockPersons } from '../data/mockData';
import styles from '../styles/personView.module.css';

const PersonView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  
  // First try to find in curated mockPersons
  let person = mockPersons.find(p => p.id === id);
  
  // If not found, try to find in the entire film dataset (scraped directors/cast)
  if (!person) {
    for (const film of mockFilms) {
      const foundDirector = film.directors.find(d => d.id === id);
      if (foundDirector) {
        person = foundDirector;
        break;
      }
      const foundCast = film.cast.find(c => c.id === id);
      if (foundCast) {
        person = foundCast;
        break;
      }
    }
  }

  const films = mockFilms.filter(f => 
    f.directors.some(d => d.id === id) || 
    f.cast.some(c => c.id === id)
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
          <p className={styles.role}>{person.role.toUpperCase()}</p>
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
