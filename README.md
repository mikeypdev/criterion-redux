# Criterion Redux

A modern, high-performance front-end redesign for the **Criterion Channel** streaming service. This project prioritizes film discovery and navigation through a metadata-rich interface.

![Criterion Redux](https://placehold.co/1200x600/0a0a0a/ffffff?text=Criterion+Channel+Redux)

## 🎥 Project Overview

Criterion Redux is a better and more useable front-end for [Criterion Channel](criterionchannel.com). It syncs the list of films from Criterion Channel and presents them in a fast, searchable, easy-to-navigate web site with additional info augmented by [The Movie DB](themoviedb.org). Basically, this front-end makes Criterion Channel look and feel like a modern movie streaming service.

***You must have a subscription*** to Criterion Channel to watch any of the flims. This app is **not** a replacement for their streaming service - it’s only an improved presentation and better way to find their films.

This an open source fan project. **This project is not affliated with Criterion. All of the content shown in this app is property of the respective copyright holders.**

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
