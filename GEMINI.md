# GEMINI.md

## Project Overview
This project is a modern front-end redesign for the **Criterion Channel** streaming service. The goal is to improve film discovery and navigation through a highly interactive, metadata-rich interface. The design focuses on high-priority content (e.g., films leaving the service soon) and deeply linked metadata (e.g., clickable directors and actors).

**Key Technologies:**
- **Framework:** React 19 (TypeScript)
- **Routing:** React Router 7
- **Tooling:** Vite 7
- **Styling:** Vanilla CSS (CSS Modules)
- **Data Source:** Hybrid Scraped Criterion Index + TMDB Enrichment.

## Project Structure
- `src/components/`: Reusable UI components (FilmCard, PersonLink, Search, Layout).
- `src/views/`: Main page views (Home, Index, FilmDetail, Person, Collections, Watchlist).
- `src/context/`: Global state (Watchlist persistence, Runtime Data Fetching).
- `public/data/`: Runtime-fetched datasets (`catalog.json`, `collections.json`).
- `src/styles/`: CSS modules and global variables.
- `scripts/`: Scraper, enrichment engine, and collection sync utilities.

## Current Status
- **Architecture Finalized:** Application uses a high-performance runtime data fetching model via `DataContext`, decoupling the massive 3,300+ film dataset from the main JS bundle.
- **Enrichment Engine:** Advanced `sync.js` pipeline implements Criterion deep-crawling, TMDB gap-filling (synopsis, cast, trailers), and automatic pruning of dead redirects.
- **Rich Technical Metadata:** Extraction of technical specs (aspect ratios) and integration of high-resolution (640x360) artwork.
- **Discovery Features:** Fully functional curated collections sync, searchable cast members, and dedicated filmography pages with external TMDB linking.
- **Media Integration:** YouTube trailer support with cinematic modal presentation.
- **Project Verified:** Production build verified with type safety and optimized bundle size.

## Final Summary
The Criterion Channel Redesign successfully addresses discovery issues through a high-fidelity, metadata-rich interface. The "Criterion Noir" aesthetic is maintained across all views, ensuring a cinematic experience for the user.

## Building and Running
- **Install Dependencies:** `npm install`
- **Unified Sync:** `npm run sync` (Run with `TMDB_API_KEY=...` for full enrichment)
- **Development Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
