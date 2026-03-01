# GEMINI.md

## Project Overview
This project is a modern front-end redesign for the **Criterion Channel** streaming service. The goal is to improve film discovery and navigation through a highly interactive, metadata-rich interface. The design focuses on high-priority content (e.g., films leaving the service soon) and deeply linked metadata (e.g., clickable directors and actors).

**Key Technologies:**
- **Framework:** React 19 (TypeScript)
- **Routing:** React Router 7
- **Tooling:** Vite 7
- **Styling:** Vanilla CSS (CSS Modules)
- **Data Source:** Scraped Criterion Index (3,300+ titles).

## Project Structure
- `src/components/`: Reusable UI components (FilmCard, PersonLink, Search, Layout).
- `src/views/`: Main page views (Home, Index, FilmDetail, Person, Collections, Watchlist).
- `src/context/`: Global state (Watchlist persistence).
- `src/data/`: Scraped dataset (`catalog.json`).
- `src/styles/`: CSS modules and global variables.
- `scripts/`: Scraper and enrichment utilities.

## Current Status
- **Prototype Completed.** 
- 3,300+ films scraped and integrated with real-world metadata.
- **Infinite Scroll** implemented for high-performance discovery.
- **Film Detail Pages** with cinematic layouts and direct Criterion Channel links.
- Advanced filtering, sorting, and global search fully functional.
- Watchlist persistence and deep-linked metadata active.
- Project verified with production build and type safety.

## Final Summary
The Criterion Channel Redesign prototype successfully addresses discovery issues through a high-fidelity, metadata-rich interface. The "Criterion Noir" aesthetic is maintained across all views, ensuring a cinematic experience for the user.

## Building and Running
- **Install Dependencies:** `npm install`
- **Scrape Data:** `node scripts/scraper.js`
- **Enrich Data:** `node scripts/enricher.js`
- **Development Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`
