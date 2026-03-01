# Criterion Channel Redesign

A modern, high-performance front-end redesign for the **Criterion Channel** streaming service. This project prioritizes film discovery and navigation through a metadata-rich interface, featuring a library of over 3,300 real-world titles.

![Cinematic Redesign](https://via.placeholder.com/1200x600/0A0A0A/FFFFFF?text=Criterion+Channel+Redux)

## 🎥 Project Overview

The goal of this redesign is to solve common navigation friction points by surfacing deep metadata (synopses, cast, runtimes) directly in the browsing experience and providing a lightning-fast, virtualized index for the entire collection.

### Key Features
- **3,300+ Real Titles:** Scraped directly from the Criterion index.
- **Infinite Scroll Discovery:** High-performance grid that handles the massive library smoothly at 60fps.
- **Deep Metadata:** Playwright-based enrichment pipeline for synopses, cast, and runtimes.
- **Cinematic Detail Views:** Dedicated landing pages for every film with hero layouts and direct links to the original service.
- **Advanced Discovery:** Real-time filtering by Genre, Language, Decade, and Country.
- **Persistence:** Global Watchlist state persisted in `localStorage`.

## 🛠 Tech Stack

- **Framework:** React 19 (TypeScript)
- **Routing:** React Router 7
- **Styling:** Vanilla CSS (CSS Modules) for a bespoke "Criterion Noir" aesthetic.
- **Automation:** Node.js + Playwright for data scraping and enrichment.
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

### 3. Data Sync (The Pipeline)
The app comes with a pre-scraped `catalog.json`. To refresh or further enrich the metadata:
```bash
# Basic enrichment batch (10 films)
npm run sync

# Larger batch enrichment
LIMIT=100 npm run sync

# Continuous enrichment (until library is 100% full)
CONTINUOUS=true npm run sync

# Use TMDB API for high-speed enrichment (requires key)
TMDB_API_KEY=your_key LIMIT=500 npm run sync
```

## 📂 Project Structure

- `src/components/`: Reusable UI elements (FilmCard, Search, Layout).
- `src/views/`: Main page layouts (Home, Index, FilmDetail, Collections, Person).
- `src/data/`: The `catalog.json` database and mock definitions.
- `scripts/`: Unified data pipeline utilities (Scraper, Enricher, Local Sync).
- `src/styles/`: Global variables and component-specific CSS modules.

## 🚢 Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for full instructions on deploying to **Vercel**, **Netlify**, or **GitHub Pages**, including setting up automated daily data syncs via GitHub Actions.

---

*Disclaimer: This is a fan-made prototype redesign and is not affiliated with The Criterion Collection or Janus Films.*
