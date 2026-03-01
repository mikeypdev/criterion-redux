# GEMINI.md

## Project Overview
This project is a modern front-end redesign for the **Criterion Channel** streaming service. The goal is to improve film discovery and navigation through a highly interactive, metadata-rich interface. The design focuses on high-priority content (e.g., films leaving the service soon) and deeply linked metadata (e.g., clickable directors and actors).

**Key Technologies:**
- **Framework:** React 19 (TypeScript)
- **Routing:** React Router 7
- **Tooling:** Vite 7
- **Styling:** Vanilla CSS (CSS Modules)
- **Data Source:** Mock JSON structure mirroring the Criterion API/Index.

## Project Structure
- `src/components/`: Reusable UI components (FilmCard, PersonLink, Search, Layout).
- `src/views/`: Main page views (Home, Index, Person, Collections, Watchlist).
- `src/context/`: Global state (Watchlist persistence).
- `src/data/`: Mock dataset.
- `src/styles/`: CSS modules and global variables.
- `SPEC.md`: The comprehensive design specification.
- `GEMINI.md`: Instructional context for the Gemini CLI.

## Building and Running
- **Install Dependencies:** `npm install`
- **Development Server:** `npm run dev`
- **Production Build:** `npm run build`
- **Linting:** `npm run lint`

## Development Conventions
- **Styling:** Use Vanilla CSS with CSS Modules to maintain a bespoke, cinematic aesthetic.
- **Type Safety:** Strict TypeScript with `verbatimModuleSyntax` enabled (use `import type` for interfaces).
- **Metadata Integration:** All entity names (Directors, Actors, Genres) should be clickable links.
- **Persistence:** User-specific states (Watchlist) are persisted in `localStorage`.
- **Global Search:** The header search bar syncs with the `/index` route via URL query parameters.

## Current Status
- Prototype fully implemented and functional.
- Core discovery features (Index, Filtering, Sorting, Collections, Person Profiles) are complete.
- Global search integrated and persistent watchlist added.
- **Next Step:** Phase 8: Real Data Strategy (Implementing the Criterion Data Connector scraper).
