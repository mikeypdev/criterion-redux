import React from 'react';
import { Link } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { useData } from '../context/DataContext';
import type { Film } from '../types';
import styles from '../styles/app.module.css';

const HomeView: React.FC = () => {
  const { catalog, collections, isLoading } = useData();

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.spinner}></div>
        <p>Opening the vaults...</p>
      </div>
    );
  }

  // For the home page, we only want to show high-quality enriched films
  let enrichedFilms = catalog.filter(f => f.synopsis && f.synopsis.length > 50);
  
  // Fallback if no enrichment has happened yet
  if (enrichedFilms.length === 0) {
    enrichedFilms = catalog.slice(0, 50);
  }

  const leavingSoon = enrichedFilms.filter(film => film.leavingSoon).slice(0, 15);

  // Daily-stable shuffle for featured films
  const getFeaturedFilms = (films: Film[]) => {
    const today = new Date().toISOString().split('T')[0];
    const seed = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0);
    
    // Sort by: has posterUrl first, then a deterministic shuffle based on seed
    return [...films]
      .sort((a, b) => {
        // Prioritize films with high-quality billboards
        if (a.posterUrl && !b.posterUrl) return -1;
        if (!a.posterUrl && b.posterUrl) return 1;
        
        // Deterministic shuffle
        const scoreA = (a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * seed) % 1000;
        const scoreB = (b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * seed) % 1000;
        return scoreA - scoreB;
      })
      .slice(0, 15);
  };

  const featuredFilms = getFeaturedFilms(enrichedFilms);

  const newlyAdded = [...enrichedFilms]
    .sort((a, b) => {
      const dateA = a.dateAdded ? new Date(a.dateAdded).getTime() : 0;
      const dateB = b.dateAdded ? new Date(b.dateAdded).getTime() : 0;
      return dateB - dateA;
    })
    .slice(0, 15);

  return (
    <>
      {leavingSoon.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Leaving Soon</h2>
            <Link to="/collections" className={styles.seeAll}>See All Collections</Link>
          </div>
          <div className={styles.carousel}>
            {leavingSoon.map(film => <FilmCard key={film.id} film={film} />)}
          </div>
        </section>
      )}

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Featured Films</h2>
          <Link to="/index" className={styles.seeAll}>See All Films</Link>
        </div>
        <div className={styles.carousel}>
          {featuredFilms.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Newly Added</h2>
          <Link to="/index" className={styles.seeAll}>See All Films</Link>
        </div>
        <div className={styles.carousel}>
          {newlyAdded.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      </section>

      {collections.slice(0, 5).map(collection => {
        const collectionFilms = collection.filmIds
          .map(fId => catalog.find(f => f.id === fId))
          .filter((f): f is Film => !!f)
          .slice(0, 15);

        if (collectionFilms.length === 0) return null;

        return (
          <section key={collection.id} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{collection.title}</h2>
              <Link to={`/collections/${collection.id}`} className={styles.seeAll}>More from this series</Link>
            </div>
            <div className={styles.carousel}>
              {collectionFilms.map(film => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          </section>
        );
      })}
    </>
  );
};

export default HomeView;
