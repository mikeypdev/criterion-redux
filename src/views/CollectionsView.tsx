import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import styles from '../styles/collectionsView.module.css';

const CollectionsView: React.FC = () => {
  const { collections, catalog, isLoading } = useData();

  if (isLoading) {
    return <div className={styles.loading}>Curating collections...</div>;
  }

  const getFilmThumbnail = (filmId: string) => {
    const film = catalog.find(f => f.id === filmId);
    return film ? film.thumbnailUrl : null;
  };

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collections</h1>
      <p className={styles.subtitle}>Curated cinematic experiences, exclusively for you.</p>

      <div className={styles.collectionsList}>
        {collections.map(collection => (
          <Link key={collection.id} to={`/collections/${collection.id}`} className={styles.collectionLink}>
            <section className={styles.collection}>
              <div className={styles.collectionInfo}>
                <h2 className={styles.collectionTitle}>{collection.title}</h2>
                <p className={styles.collectionDesc}>{collection.description}</p>
                <div className={styles.count}>{collection.filmIds.length} Titles</div>
              </div>
              
              <div className={styles.visualWrapper}>
                {collection.imageUrl ? (
                  <img src={collection.imageUrl} alt="" className={styles.collectionImage} />
                ) : (
                  <div className={styles.previewGrid}>
                    {collection.filmIds.slice(0, 4).map(id => {
                      const thumb = getFilmThumbnail(id);
                      return thumb ? (
                        <img key={id} src={thumb} alt="" className={styles.previewImg} />
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </section>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default CollectionsView;
