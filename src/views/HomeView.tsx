import React from 'react';
import { Link } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { mockFilms, mockCollections } from '../data/mockData';
import styles from '../styles/app.module.css';

const HomeView: React.FC = () => {
  const leavingSoon = mockFilms.filter(film => film.leavingSoon).slice(0, 15);
  const newlyAdded = [...mockFilms]
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
          {leavingSoon.map(film => (
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

      {mockCollections.map(collection => (
        <section key={collection.id} className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{collection.title}</h2>
            <Link to="/collections" className={styles.seeAll}>More Collections</Link>
          </div>
          <div className={styles.carousel}>
            {collection.films.map(film => (
              <FilmCard key={film.id} film={film} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
};

export default HomeView;
