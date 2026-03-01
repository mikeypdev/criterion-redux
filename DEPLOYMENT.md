# Deployment Plan: Criterion Channel Redesign

This document outlines the strategy for deploying the Criterion Channel Redesign prototype and maintaining its real-world data pipeline.

## 1. Front-End Hosting (Static)

The application is a Vite-based Single Page Application (SPA). It should be deployed to a high-performance static hosting provider.

### Recommended Providers
*   **Vercel (Recommended):** Best-in-class performance and automatic support for SPA routing.
*   **Netlify:** Excellent choice with simple "drag and drop" or GitHub-linked deploys.
*   **GitHub Pages:** Free and reliable. Use the `gh-pages` branch method for simple deployment.

### Deployment via GitHub Pages (`gh-pages` branch)
If you prefer to host on GitHub Pages, use the `gh-pages` utility to automate the process:

1.  **Install the package:** `npm install gh-pages --save-dev`
2.  **Update `package.json` scripts:**
    ```json
    "scripts": {
      "predeploy": "npm run build",
      "deploy": "gh-pages -d dist"
    }
    ```
3.  **Set the `base` in `vite.config.ts`:**
    Ensure `base: '/your-repo-name/'` is set in your Vite configuration so assets load correctly from the sub-path.
4.  **Run `npm run deploy`:** This builds the app and pushes the `dist` folder to the `gh-pages` branch. GitHub will then serve your site from that branch.

### Critical Configuration: SPA Routing
Since this app uses `react-router-dom`, the hosting provider must be configured to redirect all 404 requests to `index.html`.
*   **Vercel:** Create a `vercel.json` in the root:
    ```json
    { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
    ```
*   **Netlify:** Create a `_redirects` file in `public/`:
    ```text
    /*  /index.html  200
    ```

---

## 2. Automated Data Sync (The Pipeline)

To keep the library current (Newly Added, Leaving Soon), the data sync should be automated. The system supports two modes of enrichment:

### Enrichment Modes
*   **Deep-Crawl (Default):** Uses Playwright to extract metadata directly from the Criterion Channel. No API keys required. Respectful 2s throttle.
*   **TMDB (High-Speed):** Uses the The Movie Database API. Requires a `TMDB_API_KEY`. Much faster for bulk processing.

### GitHub Actions (Daily Sync)
Set up a GitHub Action to run the sync utility every 24 hours. This keeps "Leaving Soon" and "Newly Added" categories accurate.

**Sample Workflow File (`.github/workflows/sync.yml`):**
```yaml
name: Daily Data Sync
on:
  schedule:
    - cron: '0 0 * * *'
  workflow_dispatch:

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: npm install
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps chromium
      - name: Run Sync
        env:
          TMDB_API_KEY: ${{ secrets.TMDB_API_KEY }}
          LIMIT: 100
        run: npm run sync
      - name: Commit and Push
        run: |
          git config --global user.name "github-actions[bot]"
          git config --global user.email "github-actions[bot]@users.noreply.github.com"
          git add public/data/*.json
          git diff --quiet && git diff --staged --quiet || (git commit -m "chore: automated data sync" && git push)
```

---

## 3. Production Architecture

### Externalized Data (Implemented)
The application uses a high-performance runtime data fetching model. `catalog.json` and `collections.json` reside in the `public/data/` folder and are fetched asynchronously via the `DataProvider` on application load.
*   **Benefit:** Decouples the massive 3,300+ film dataset from the main JavaScript bundle, allowing for near-instant initial page loads and independent caching of data.

### Image Proxying
The app links directly to Criterion's `vhx.imgix.net` images at 640x360 resolution.
*   **Action:** If performance lags, use an image optimization service like **Cloudinary** or **Vercel Image Optimization** to resize and webp-format images on the fly.

---

## 4. Execution Roadmap

1.  **Repository Setup:** Push the current code to GitHub.
2.  **Configure Hosting:** Connect the repo to Vercel/Netlify.
3.  **Setup SPA Routing:** Add the necessary redirect rules (`vercel.json` or `_redirects`).
4.  **Enable Automation:** Add the GitHub Action for daily syncing to keep metadata and collections fresh.
5.  **Full Enrichment:** Use the `CONTINUOUS=true` mode locally or via a manual GitHub Action trigger to finish populating trailers and technical specs for the entire library.
