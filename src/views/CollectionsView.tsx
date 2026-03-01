import React from 'react';
import { Link } from 'react-router-dom';
import { mockCollections } from '../data/mockData';
import styles from '../styles/collectionsView.module.css';

const CollectionsView: React.FC = () => {
  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collections</h1>
      <p className={styles.subtitle}>Curated cinematic experiences, exclusively for you.</p>

      <div className={styles.collectionsList}>
        {mockCollections.map(collection => (
          <Link key={collection.id} to={`/collections/${collection.id}`} className={styles.collectionLink}>
            <section className={styles.collection}>
              <div className={styles.collectionInfo}>
                <h2 className={styles.collectionTitle}>{collection.title}</h2>
                <p className={styles.collectionDesc}>{collection.description}</p>
                <div className={styles.count}>{collection.films.length} Titles</div>
              </div>
              <div className={styles.previewGrid}>
                {collection.films.slice(0, 4).map(film => (
                  <img key={film.id} src={film.thumbnailUrl} alt="" className={styles.previewImg} />
                ))}
              </div>
            </section>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CollectionsView;
