#!/usr/bin/env node
/**
 * One-time repair: recover the earliest known dateAdded per film from git history.
 *
 * The nightly sync's "Newly Added" carousel re-stamped the same films every day,
 * polluting their dateAdded. This script walks every historical revision of
 * catalog.json (oldest-first) and captures the first dateAdded each film ever had,
 * then writes those corrected values back to the current catalog.
 *
 * Usage: node scripts/repair_dates.js
 */
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const CATALOG_PATH = path.resolve('public/data/catalog.json');

const commits = execSync('git rev-list --reverse --all -- public/data/catalog.json', { encoding: 'utf-8' })
  .trim().split('\n')
  .filter(Boolean);

console.log(`Found ${commits.length} historical revisions of catalog.json`);

const earliestDate = new Map();
const currentDate = new Map();

let rev = 0;
for (const commit of commits) {
  rev++;
  let catalog;
  try {
    const raw = execSync(`git show ${commit}:public/data/catalog.json`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
    });
    catalog = JSON.parse(raw);
  } catch {
    continue;
  }

  for (const film of catalog) {
    if (!film.id || !film.dateAdded) continue;

    // Track the earliest date we've ever seen for this film
    if (!earliestDate.has(film.id) || film.dateAdded < earliestDate.get(film.id)) {
      earliestDate.set(film.id, film.dateAdded);
    }
  }

  if (rev % 20 === 0 || rev === commits.length) {
    console.log(`  Processed ${rev}/${commits.length} revisions...`);
  }
}

console.log(`\nRecovered earliest dates for ${earliestDate.size} films`);

// Apply to current catalog
const currentCatalog = JSON.parse(fs.readFileSync(CATALOG_PATH, 'utf-8'));
let fixed = 0;

for (const film of currentCatalog) {
  if (!film.id) continue;
  const recovered = earliestDate.get(film.id);
  if (recovered && recovered !== film.dateAdded) {
    film.dateAdded = recovered;
    fixed++;
  }
}

fs.writeFileSync(CATALOG_PATH, JSON.stringify(currentCatalog, null, 2));
console.log(`Corrected ${fixed} films' dateAdded values`);
console.log(`Saved to ${CATALOG_PATH}`);
