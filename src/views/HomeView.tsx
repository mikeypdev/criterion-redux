import React from 'react';
import { Link } from 'react-router-dom';
import FilmCard from '../components/FilmCard';
import { useData } from '../context/useData';
import type { Film, Collection } from '../types';
import { getLeavingSoonFilms, isLeavingSoonCollection } from '../utils/collections';
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

  // For the home page, we only want to show high-quality enriched films for general segments
  const highQualityFilms = catalog.filter(f => f.synopsis && f.synopsis.length > 50);
  
  // Fallback for general segments if no enrichment has happened yet
  let workingFilms = highQualityFilms;
  if (workingFilms.length === 0) {
    workingFilms = catalog.slice(0, 50);
  }

  // Derive "leaving soon" from collections (not from the per-film flag, which
  // depends on scrape_collections.js having run a recent sync). This is more
  // robust against stale data and survives partial sync failures.
  const leavingSoonFilms = getLeavingSoonFilms(collections, workingFilms).slice(0, 15);

  // Daily-stable shuffle for featured films (rotates every 6 hours)
  const getFeaturedFilms = (films: Film[]) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const hourBlock = Math.floor(now.getHours() / 6); // 0, 1, 2, 3
    const seed = today.split('-').reduce((acc, part) => acc + parseInt(part, 10), 0) + hourBlock;
    
    // Sort by: has posterUrl first, then a deterministic shuffle based on seed
    return [...films]
      .sort((a, b) => {
        // Prioritize films with high-quality billboards
        if (a.posterUrl && !b.posterUrl) return -1;
        if (!a.posterUrl && b.posterUrl) return 1;
        
        // Deterministic shuffle based on seed and film ID
        const scoreA = (a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * seed) % 1000;
        const scoreB = (b.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) * seed) % 1000;
        
        if (scoreA !== scoreB) return scoreA - scoreB;
        return a.id.localeCompare(b.id);
      })
      .slice(0, 15);
  };

  const featuredFilms = getFeaturedFilms(workingFilms);

  const newlyAddedCollection = collections.find((c: Collection) => c.id === 'newly-added');
  const newlyAdded = newlyAddedCollection
    ? newlyAddedCollection.filmIds
        .map((fId: string) => catalog.find((f: Film) => f.id === fId))
        .filter((f: Film | undefined): f is Film => !!f)
        .slice(0, 15)
    : [];

  return (
    <>
      {leavingSoonFilms.length > 0 && (
        <section className={styles.section}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>Leaving Soon</h2>
            <Link to="/collections/leaving-soon" className={styles.seeAll}>See All</Link>
          </div>
          <div className={styles.carousel}>
            {leavingSoonFilms.map(film => <FilmCard key={film.id} film={film} />)}
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

      {newlyAdded.length > 0 && (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>Newly Added</h2>
          <Link to="/collections/newly-added" className={styles.seeAll}>See All</Link>
        </div>
        <div className={styles.carousel}>
          {newlyAdded.map(film => (
            <FilmCard key={film.id} film={film} />
          ))}
        </div>
      </section>
      )}

      {(() => {
        const newCols = collections
          .filter(col => col.isNew)
          .map(col => {
            const films = col.filmIds
              .map((fId: string) => catalog.find((f: Film) => f.id === fId))
              .filter((f: Film | undefined): f is Film => !!f)
              .slice(0, 15);
            return { col, films };
          })
          .filter(item => item.films.length >= 1);

        return newCols.map(({ col, films }) => (
          <section key={col.id} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{col.title}</h2>
              <Link to={`/collections/${col.id}`} className={styles.seeAll}>More from this series</Link>
            </div>
            <div className={styles.carousel}>
              {films.map((film: Film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          </section>
        ));
      })()}

      {(() => {
        const filmDateMap = new Map(catalog.map(f => [f.id, f.dateAdded || '1970-01-01']));

        // Pre-filter substantial collections (>= 3 films) to avoid sparse/broken 1-film rows on Homepage.
        // Skip "newly added" (rendered above), "leaving" collections (rendered above as "Leaving Soon"),
        // and editorially new collections (rendered above as their own sections).
        // Sort by newest member film dateAdded (descending) so recent collections surface first.
        const substantialCollections = collections
          .map(col => {
            const films = col.filmIds
              .map((fId: string) => catalog.find((f: Film) => f.id === fId))
              .filter((f: Film | undefined): f is Film => !!f)
              .slice(0, 15);
            let maxDate = '1970-01-01';
            for (const fId of col.filmIds) {
              const d = filmDateMap.get(fId);
              if (d && d > maxDate) maxDate = d;
            }
            return { col, films, maxDate };
          })
          .filter(item => item.films.length >= 3
            && !item.col.title.toLowerCase().includes('newly added')
            && !item.col.isNew
            && !isLeavingSoonCollection(item.col.title))
          .sort((a, b) => b.maxDate.localeCompare(a.maxDate) || (a.col.title || '').localeCompare(b.col.title || ''))
          .slice(0, 5);

        return substantialCollections.map(({ col, films }) => (
          <section key={col.id} className={styles.section}>
            <div className={styles.sectionHeader}>
              <h2 className={styles.sectionTitle}>{col.title}</h2>
              <Link to={`/collections/${col.id}`} className={styles.seeAll}>More from this series</Link>
            </div>
            <div className={styles.carousel}>
              {films.map((film: Film) => (
                <FilmCard key={film.id} film={film} />
              ))}
            </div>
          </section>
        ));
      })()}
    </>
  );
};

export default HomeView;
