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
  const enrichedFilms = catalog.filter(f => f.synopsis && f.synopsis.length > 50);

  const leavingSoon = enrichedFilms.filter(film => film.leavingSoon).slice(0, 15);
  const newlyAdded = [...enrichedFilms]
    .sort((a, b) => new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime())
    .slice(0, 15);

  return (
    <>
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Leaving Soon</h2>
          <Link to="/collections" className={styles.seeAll}>See All Collections</Link>
        </div>
        <div className={styles.carousel}>
          {leavingSoon.length > 0 ? (
            leavingSoon.map(film => <FilmCard key={film.id} film={film} />)
          ) : (
            enrichedFilms.slice(10, 25).map(film => <FilmCard key={film.id} film={film} />)
          )}
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
