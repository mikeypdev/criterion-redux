import React from 'react';
import { NavLink } from 'react-router-dom';
import { useData } from '../context/DataContext';
import styles from '../styles/layout.module.css';
import Search from './Search';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { status } = useData();

  const formatLastUpdated = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString(undefined, { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return isoString;
    }
  };

  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <NavLink to="/" className={styles.logo}>Criterion Redux</NavLink>
        <nav className={styles.nav}>
          <NavLink 
            to="/" 
            end
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            Home
          </NavLink>
          <NavLink 
            to="/index" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            All Films
          </NavLink>
          <NavLink 
            to="/collections" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            Collections
          </NavLink>
          <NavLink 
            to="/watchlist" 
            className={({ isActive }) => isActive ? `${styles.navItem} ${styles.navItemActive}` : styles.navItem}
          >
            Watchlist
          </NavLink>
        </nav>
        <div className={styles.search}>
          <Search />
        </div>
      </header>
      <main className={styles.main}>
        {children}
      </main>
      <footer className={styles.footer}>
        <div className={styles.footerContent}>
          <div className={styles.tmdbAttribution}>
            <img 
              src={`${import.meta.env.BASE_URL}tmdb-logo.svg`} 
              alt="The Movie Database" 
              className={styles.tmdbLogo}
            />
            <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
          </div>
          <a 
            href="https://github.com/mikeypdev/criterion-redux" 
            target="_blank" 
            rel="noopener noreferrer" 
            className={styles.githubLink}
          >
            <svg height="20" width="20" viewBox="0 0 16 16" fill="currentColor" style={{ verticalAlign: 'middle' }}>
              <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"></path>
            </svg>
            View Project on GitHub
          </a>
          <div className={styles.copyright}>
            LINKED AND EMBEDDED CONTENT ITEMS ARE SUBJECT TO THE TERMS, COPYRIGHTS, AND INTELLECTUAL PROPERTY
            RIGHTS OF THEIR RESPECTIVE OWNERS.
          </div>
          <div className={styles.copyright}>
            © 2026 CRITERION REDUX FAN PROJECT. FOR DEMONSTRATION PURPOSES ONLY. NOT AFFILIATED WITH CRITERION CHANNEL.
          </div>
          {status && (
            <div className={styles.lastUpdated}>
              Library synced: {formatLastUpdated(status.lastUpdated)} ({status.filmCount} films)
            </div>
          )}
        </div>
      </footer>
    </div>
  );
};

export default Layout;
