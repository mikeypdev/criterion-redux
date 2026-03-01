# Criterion Channel Redesign Specification

## 1. Project Overview
The goal is to build a modern, high-performance front-end for the Criterion Channel that prioritizes film discovery and curation. The redesign aims to solve the "clunky" navigation issues of the current Vimeo-based platform by surface-level metadata and intuitive filtering.

## 2. Core UX Principles
- **Discoverability First:** High-priority content (Leaving Soon, New Additions) is moved to the top.
- **Surface Metadata:** Minimize clicks by showing film details (blurb, year, runtime) on hover.
- **Deeply Linked Information:** Every entity (Director, Actor, Genre, Country) is a clickable link leading to a filtered view or a dedicated person page.
- **Cinematic Aesthetic:** A "Criterion Noir" theme using deep blacks, subtle grays, and elegant typography (favoring high-contrast serifs for titles and clean sans-serifs for metadata).

## 3. Key Features

### 3.1. The "High-Urgency" Dashboard
- **"Leaving at the End of the Month":** The very first row on the home page.
- **"Newly Added":** The second row.

### 3.2. Global Film Index (The "Power" Tool)
- A unified grid view of all available titles.
- **Advanced Filtering:** Real-time filtering by:
    - Decade (1920s, 1930s, etc.)
    - Country
    - Director
    - Genre (Noir, Western, Avant-Garde)
- **Sorting:** Sort by Release Date (New/Old), Date Added, or Alphabetical.

### 3.3. Linked Metadata & Person Pages
- **Interactive Credits:** Clicking a director or actor's name opens a filtered view showing all their films currently on the service.
- **Rich Context:** Brief bios for major directors sourced from metadata or placeholders.

### 3.4. Metadata "Quick Look" Cards
- Hovering over a film thumbnail reveals a card containing:
    - Full Title
    - Director(s)
    - Year & Runtime
    - Short Synopsis
    - "Add to Watchlist" toggle

## 4. Visual Language
- **Color Palette:**
    - Background: `#0A0A0A` (Deep Black)
    - Surface: `#1A1A1A` (Dark Gray)
    - Primary Text: `#FFFFFF`
    - Secondary Text: `#A0A0A0` (Muted Gray)
    - Accent: `#DAA520` (Goldenrod for "Leaving Soon" warnings or highlights)
- **Typography:**
    - Headings: Elegant Serif (e.g., Playfair Display or similar)
    - UI/Metadata: Minimal Sans-Serif (e.g., Inter or Roboto)

## 5. Information Architecture
- **Home:** Curated carousels and urgent collections.
- **Film Index:** The searchable database.
- **Collections:** Dedicated pages for "The Criterion Edition," "Saturday Matinee," etc.
- **Person Detail:** A landing page for specific directors/actors showing their filmography.

## 6. Technical Stack
- **Framework:** React (TypeScript)
- **Tooling:** Vite
- **Styling:** Vanilla CSS (CSS Modules)
- **Data:** Mock JSON structure mirroring the Criterion API/Index.

## 7. Implementation Roadmap
1. **Phase 1: Architecture & Mock Data.** Define types and initial JSON structure for films and persons. (Completed)
2. **Phase 2: Layout & Navigation.** Build the persistent header and side navigation. (Completed)
3. **Phase 3: The "Urgent" Home Page.** Implement the top-priority carousels. (Completed)
4. **Phase 4: The Filterable Index.** Build the grid and filtering logic. (Completed)
5. **Phase 5: Linked Metadata.** Implement the detail views and cross-linking logic. (Completed)
6. **Phase 6: Polish & Interactions.** Add hover states, transitions, and "Watchlist" persistence. (Completed)
7. **Phase 7: Routing & Search.** Implement global search and client-side routing. (Completed)

## 8. Real Data Strategy (The "Criterion Data Connector")

### 8.1. Extraction (The Scraper)
- **Target:** `https://www.criterionchannel.com/browse/all-films`
- **Tooling:** Node.js with `Cheerio` or `Playwright`.
- **Extraction Logic:** Parse the film grid for Title, Director, Year, Country, and High-Res Thumbnail URLs.

### 8.2. Enrichment (The Enhancer)
- **Metadata Sources:** Integrate with **TMDB API** to fetch deep cast lists, high-res backdrops, and expanded genres.
- **Sitemap Crawling:** Programmatically parse `criterion.com/films.xml` to ensure 100% coverage of the library.

### 8.3. Integration (The Data Sync)
- **Storage:** Export enriched data to `src/data/catalog.json`.
- **Automation:** Implement a daily sync via GitHub Actions to keep "Leaving Soon" and "Newly Added" sections current.
- **Dynamic Service:** Create a `CatalogService` in React to handle large-scale data loading and real-time filtering.
