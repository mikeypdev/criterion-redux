# Criterion Channel Redesign Specification

## 1. Project Overview
The goal is to build a modern, high-performance front-end for the Criterion Channel that prioritizes film discovery and curation. The redesign solves the "clunky" navigation issues of the current platform by surfacing deep metadata and intuitive filtering. This is a fully data-driven application using a real-world library of over 3,300 titles.

## 2. Core UX Principles
- **Discoverability First:** High-priority content (Leaving Soon, New Additions) is moved to the top.
- **Surface Metadata:** Minimize clicks by showing film details (blurb, year, runtime) on hover.
- **Deeply Linked Information:** Every entity (Director, Actor, Genre, Country) is a clickable link leading to a filtered view or a dedicated person page.
- **Cinematic Aesthetic:** A "Criterion Noir" theme using deep blacks, subtle grays, and elegant typography.

## 3. Key Features

### 3.1. The "High-Urgency" Dashboard
- **"Leaving Soon":** Curated films scheduled to depart the service.
- **"Newly Added":** The latest arrivals to the library.
- **Curated Series:** Dynamic rows synced from the Criterion browse page.

### 3.2. Global Film Index (The "Power" Tool)
- A unified grid view of all available titles with infinite scroll.
- **Advanced Filtering:** Real-time filtering by Decade, Country, Language, Genre, and Format (Color/BW).
- **Sorting:** Sort by Release Date, Date Added, or Alphabetical.

### 3.3. Rich Technical Metadata & Trailers
- **Technical Specs:** Display of aspect ratios (e.g., 1.37:1, 1.85:1) and high-res 640x360 artwork.
- **Cinematic Trailers:** One-click YouTube trailer integration with modal presentation.

### 3.4. Person Profiles & Filmographies
- **Discovery Pages:** Dedicated landing pages for directors and actors showing their entire available body of work.
- **External Links:** Direct integration with TMDB for full actor biographies.

## 6. Technical Stack
- **Framework:** React 19 (TypeScript)
- **Tooling:** Vite 7
- **Data Model:** Runtime-fetched JSON datasets via `DataContext` (catalog.json, collections.json).
- **Automation:** Node.js + Playwright for deep-crawling and TMDB API for enrichment.
- **Styling:** Vanilla CSS (CSS Modules)

## 7. Implementation Roadmap
1. **Phase 1: Architecture & Scraper.** Define data structures and build the base Criterion scraper. (Completed)
2. **Phase 2: Enrichment Engine.** Implement TMDB integration for synopses, cast, and trailers. (Completed)
3. **Phase 3: High-Performance Grid.** Build the infinite scroll film index with multi-faceted filtering. (Completed)
4. **Phase 4: Cinematic Detail Views.** Implement hero layouts with trailer support and technical metadata. (Completed)
5. **Phase 5: Discovery Logic.** Link persons, genres, and collections for a deeply interconnected UX. (Completed)
6. **Phase 6: Runtime Data Fetching.** Decouple datasets from the JS bundle for instant loading. (Completed)
7. **Phase 7: Final Polish.** Finalize "Criterion Noir" theme and persistent watchlist logic. (Completed)

## 8. Real Data Strategy (The "Criterion Data Connector")

### 8.1. Extraction (The Scraper)
- **Target:** `https://films.criterionchannel.com/`
- **Tooling:** Node.js with `Cheerio` and `Playwright`.
- **Extraction Logic:** Unified pipeline (`sync.js`) that scrapes the master list and then deep-crawls individual pages for metadata.

### 8.2. Enrichment (The Enhancer)
- **Metadata Sources:** Hybrid model using Criterion for blurbs/aspect ratios and **TMDB API** for cast, runtimes, and YouTube trailers.
- **Pruning Logic:** Automated detection of dead redirects to ensure the catalog only contains playable titles.

### 8.3. Integration (The Data Sync)
- **Storage:** Export enriched data to `public/data/catalog.json`.
- **Hydration:** Global `DataProvider` fetches datasets on application load for high-performance client-side filtering.
