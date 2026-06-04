import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/useData';
import type { Collection } from '../types';
import { getLeavingSoonFilms, getLeavingSoonImage } from '../utils/collections';
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

  // Derive "leaving soon" directly from the collections list. Survives stale
  // data, partial syncs, and any future changes to per-film metadata.
  const leavingSoonFilms = getLeavingSoonFilms(collections, catalog);

  // Create high-performance constant-time lookup Sets/Maps
  // This reduces complexity from O(C * C * N) quadratic lookups down to O(1) constant lookups!
  const catalogIds = new Set(catalog.map(f => f.id));
  const filmDateMap = new Map(catalog.map(f => [f.id, f.dateAdded || '1970-01-01']));
  const filmThumbMap = new Map(catalog.map(f => [f.id, f.thumbnailUrl]));

  // Exclude empty collections to ensure only active, populated collections are displayed
  const activeCollections = collections.filter(c => c.filmIds.some(id => catalogIds.has(id)));
  const allCollections: Collection[] = [...activeCollections];
  if (leavingSoonFilms.length > 0) {
    allCollections.push({
      id: 'leaving-soon',
      title: 'Leaving Soon',
      description: 'Your last chance to catch these titles before they leave the service at the end of the month.',
      filmIds: leavingSoonFilms.map(f => f.id),
      imageUrl: getLeavingSoonImage(leavingSoonFilms),
      link: '#'
    });
  }

  // Get dynamic collection age based on the newest film dateAdded inside it
  const getCollectionDate = (col: Collection) => {
    if (col.id === 'leaving-soon') return '9999-99-99';
    if (col.id === 'newly-added') return '9999-99-98';
    
    let maxDate = '1970-01-01';
    for (const fId of col.filmIds) {
      const dateAdded = filmDateMap.get(fId);
      if (dateAdded && dateAdded > maxDate) {
        maxDate = dateAdded;
      }
    }
    return maxDate;
  };

  // Sort: Active/sticky top first, then newest collections by film added date descending
  allCollections.sort((a, b) => {
    const dateA = getCollectionDate(a);
    const dateB = getCollectionDate(b);
    if (dateA !== dateB) {
      return dateB.localeCompare(dateA); // Newest first
    }
    return (a.title || '').localeCompare(b.title || ''); // Alphabetical fallback with safe access
  });

  const getFilmThumbnail = (filmId: string) => {
    return filmThumbMap.get(filmId) || null;
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
                <div className={styles.count}>
                  {collection.filmIds.filter(id => catalogIds.has(id)).length} Titles
                </div>
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
