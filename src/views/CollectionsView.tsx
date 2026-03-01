import React from 'react';
import FilmCard from '../components/FilmCard';
import { mockCollections } from '../data/mockData';
import styles from '../styles/collectionsView.module.css';

const CollectionsView: React.FC = () => {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collections</h1>
      <p className={styles.subtitle}>Curated cinematic experiences, exclusively for you.</p>

      <div className={styles.collectionsList}>
        {mockCollections.map(collection => (
          <section key={collection.id} className={styles.collection}>
            <div className={styles.collectionInfo}>
              <h2 className={styles.collectionTitle}>{collection.title}</h2>
              <p className={styles.collectionDesc}>{collection.description}</p>
            </div>
            <div className={styles.grid}>
              {collection.films.map(film => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
};

export default CollectionsView;
