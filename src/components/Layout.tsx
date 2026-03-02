import React from 'react';
import { NavLink } from 'react-router-dom';
import styles from '../styles/layout.module.css';
import Search from './Search';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
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
          <div className={styles.copyright}>
            © 2026 CRITERION REDUX. ALL RIGHTS RESERVED. FOR DEMONSTRATION PURPOSES ONLY.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
