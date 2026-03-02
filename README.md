# Criterion Channel Redesign

A modern, high-performance front-end redesign for the **Criterion Channel** streaming service. This project prioritizes film discovery and navigation through a metadata-rich interface, featuring a library of over 3,300 real-world titles.

![Cinematic Redesign](https://placehold.co/1200x600/0a0a0a/ffffff?text=Criterion+Channel+Redux)

## 🎥 Project Overview

The goal of this redesign is to solve common navigation friction points by surfacing deep metadata (synopses, cast, runtimes) directly in the browsing experience and providing a lightning-fast, virtualized index for the entire collection.

### Key Features
- **3,300+ Real Titles:** Scraped from the Criterion index and enriched via hybrid deep-crawling.
- **High-Fidelity Assets:** 4K billboard-style artwork and high-res posters throughout the app.
- **Cinematic Trailers:** Integrated support for both YouTube and direct Criterion trailers.
- **Deep Discovery:** Search by Actor or Director and explore dedicated filmography pages.
- **Rich Technical Metadata:** Aspect ratios, languages, and exhaustive cast lists.
- **Infinite Scroll:** High-performance grid that handles the massive library at 60fps.
- **Curated Collections:** Live-synced series rows with high-impact billboard imagery.
- **Persistence:** Global Watchlist state persisted in `localStorage`.

## 🛠 Tech Stack

- **Framework:** React 19 (TypeScript)
- **Routing:** React Router 7
- **Data Model:** Runtime-fetched JSON datasets via `DataContext`.
- **Styling:** Vanilla CSS (CSS Modules) for a bespoke "Criterion Noir" aesthetic.
- **Automation:** Node.js + Playwright for Criterion crawling and TMDB API enrichment.
- **Tooling:** Vite 7, ESLint.

## 🚀 Getting Started

### 1. Installation
```bash
npm install
```

### 2. Launch Development Server
```bash
npm run dev
```

### 3. Deploy to GitHub Pages
```bash
npm run deploy
```

### 4. Data Sync (The Pipeline)
The app uses runtime-fetched data from `public/data/`. To refresh or further enrich:
```bash
# Basic enrichment (Criterion crawl only)
npm run sync

# Gap-filler enrichment (Uses TMDB for missing synopses, cast, and trailers)
TMDB_API_KEY=your_key npm run sync

# Continuous mode (Processes entire catalog in batches)
CONTINUOUS=true npm run sync
```

## 📂 Project Structure

- `src/components/`: Reusable UI elements (FilmCard, Search, Layout).
- `src/views/`: Main page layouts (Home, Index, FilmDetail, Collections, Person).
- `public/data/`: High-performance JSON datasets (catalog, collections).
- `scripts/`: Unified data pipeline utilities (Scraper, Enricher, Collections Sync).
- `src/styles/`: Global variables and component-specific CSS modules.

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on deploying to **Vercel**, **Netlify**, or **GitHub Pages**, including setting up automated daily data syncs via GitHub Actions.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

*Disclaimer: This is a fan-made prototype redesign and is not affiliated with The Criterion Collection or Janus Films.*
