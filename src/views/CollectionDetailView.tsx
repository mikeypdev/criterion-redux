import React, { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import type { Film } from '../types';
import FilmCard from '../components/FilmCard';
import styles from '../styles/collectionsView.module.css';

const CollectionDetailView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { collections, catalog, isLoading } = useData();
  
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  if (isLoading) {
    return <div className={styles.loading}>Assembling collection...</div>;
  }

  let collection = collections.find(c => c.id === id);
  
  // Handle virtual 'Leaving Soon' collection
  if (!collection && id === 'leaving-soon') {
    const leavingSoonFilms = catalog.filter(f => f.leavingSoon);
    if (leavingSoonFilms.length > 0) {
      collection = {
        id: 'leaving-soon',
        title: 'Leaving Soon',
        description: 'Your last chance to catch these titles before they leave the service at the end of the month.',
        filmIds: leavingSoonFilms.map(f => f.id),
        imageUrl: leavingSoonFilms[0].posterUrl || leavingSoonFilms[0].thumbnailUrl
      };
    }
  }

  const collectionFilms = collection 
    ? collection.filmIds
        .map(fId => catalog.find(f => f.id === fId))
        .filter((f): f is Film => !!f)
    : [];

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
      <header className={`${styles.detailHeader} ${collection.imageUrl ? styles.hasImage : ''}`}>
        {collection.imageUrl && (
          <div className={styles.detailHero}>
            <img src={collection.imageUrl} alt="" className={styles.heroImage} />
            <div className={styles.heroOverlay} />
          </div>
        )}
        
        <div className={styles.detailContent}>
          <Link to="/collections" className={styles.backLink}>← All Collections</Link>
          <h1 className={styles.detailTitle}>{collection.title}</h1>
          <p className={styles.detailDescription}>{collection.description}</p>
          <div className={styles.count}>{collectionFilms.length} Titles</div>
        </div>
      </header>

      <div className={styles.gridContainer}>
        <div className={styles.grid}>
          {collectionFilms.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollectionDetailView;
