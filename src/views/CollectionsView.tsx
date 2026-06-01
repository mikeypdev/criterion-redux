import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/useData';
import type { Collection, Film } from '../types';
import styles from '../styles/collectionsView.module.css';

const PAGE_SIZE = 30;
const STORAGE_KEY = 'collections-visible-count';
const SCROLL_KEY = 'collections-scroll-y';

const CollectionsView: React.FC = () => {
  const { collections, catalog, isLoading } = useData();
  const [visibleCount, setVisibleCount] = useState(() =>
    parseInt(sessionStorage.getItem(STORAGE_KEY) || String(PAGE_SIZE), 10)
  );

  useEffect(() => {
    sessionStorage.setItem(STORAGE_KEY, String(visibleCount));
  }, [visibleCount]);

  useEffect(() => {
    const savedY = sessionStorage.getItem(SCROLL_KEY);
    if (savedY) {
      sessionStorage.removeItem(SCROLL_KEY);
      requestAnimationFrame(() => window.scrollTo(0, parseInt(savedY, 10)));
    }
  }, []);

  const handleClick = () => {
    sessionStorage.setItem(SCROLL_KEY, String(window.scrollY));
  };

  if (isLoading) {
    return <div className={styles.loading}>Curating collections...</div>;
  }

  const leavingSoonFilms = catalog.filter(f => f.leavingSoon);
  
  const allCollections: Collection[] = [...collections];
  if (leavingSoonFilms.length > 0) {
    allCollections.unshift({
      id: 'leaving-soon',
      title: 'Leaving Soon',
      description: 'Your last chance to catch these titles before they leave the service at the end of the month.',
      filmIds: leavingSoonFilms.map(f => f.id),
      imageUrl: leavingSoonFilms[0].posterUrl || leavingSoonFilms[0].thumbnailUrl,
      link: '#'
    });
  }

  const getFilmThumbnail = (filmId: string) => {
    const film = catalog.find((f: Film) => f.id === filmId);
    return film ? film.thumbnailUrl : null;
  };

  const visibleCollections = allCollections.slice(0, visibleCount);
  const hasMore = visibleCount < allCollections.length;

  return (
    <div className={styles.root}>
      <h1 className={styles.title}>Collections</h1>
      <p className={styles.subtitle}>Curated cinematic experiences, exclusively for you.</p>

      <div className={styles.collectionsList}>
        {visibleCollections.map((collection: Collection) => (
          <Link key={collection.id} to={`/collections/${collection.id}`} className={styles.collectionLink} onClick={handleClick}>
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
                    {collection.filmIds.slice(0, 4).map((id: string) => {
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

      {hasMore && (
        <div className={styles.loadMoreContainer}>
          <button
            className={styles.loadMoreButton}
            onClick={() => setVisibleCount(prev => prev + PAGE_SIZE)}
          >
            Load More ({allCollections.length - visibleCount} remaining)
          </button>
        </div>
      )}
    </div>
  );
};

export default CollectionsView;
