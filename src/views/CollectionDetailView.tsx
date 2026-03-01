import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import type { Film } from '../types';
import FilmCard from '../components/FilmCard';
import styles from '../styles/collectionsView.module.css';

const CollectionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { collections, catalog, isLoading } = useData();
  
  if (isLoading) {
    return <div className={styles.loading}>Assembling collection...</div>;
  }

  const collection = collections.find(c => c.id === id);
  const collectionFilms = collection 
    ? collection.filmIds
        .map(fId => catalog.find(f => f.id === fId))
        .filter((f): f is Film => !!f)
    : [];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (!collection) {
    return (
      <div style={{ padding: '80px', textAlign: 'center' }}>
        <h2>Collection not found</h2>
        <Link to="/collections" style={{ color: 'var(--accent)' }}>Back to Collections</Link>
      </div>
    );
  }

  return (
    <div className={styles.detailRoot}>
      <header className={styles.detailHeader}>
        <Link to="/collections" className={styles.backLink}>← All Collections</Link>
        <h1 className={styles.detailTitle}>{collection.title}</h1>
        <p className={styles.detailDescription}>{collection.description}</p>
        <div className={styles.count}>{collectionFilms.length} Titles</div>
      </header>

      <div className={styles.grid}>
        {collectionFilms.map(film => (
          <FilmCard key={film.id} film={film} />
        ))}
      </div>
    </div>
  );
};

export default CollectionDetailView;
