# ever-jobs Catalog Merge Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the valuable parts of the `ever-jobs` reference catalog into career-ops: ~17 new zero-token job-board provider plugins, plus a bulk import of ~537 net-new Greenhouse-based companies into `tracked_companies`.

**Architecture:** Each new board gets a `providers/<id>.mjs` file following the existing `{ id, detect, fetch }` plugin contract (`providers/greenhouse.mjs` is the reference). `scan.mjs` auto-loads any `*.mjs` dropped into `providers/` — no core scanner changes. RSS-based providers share a new `providers/_rss.mjs` helper. The company import is a one-time migration script that emits a YAML block, appended to the end of `portals.yml` (the file's last top-level key, `tracked_companies:`, runs to EOF).

**Tech Stack:** Node.js (`.mjs` ESM modules), `js-yaml` for YAML parsing/dumping, regex-based RSS/XML parsing (no XML library — matches the codebase's zero-dependency philosophy), `ctx.fetchJson`/`ctx.fetchText` from `providers/_http.mjs`.

---

## Reference: the provider contract

Every new provider in this plan follows this shape (from `providers/greenhouse.mjs`):

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

/** @type {Provider} */
export default {
  id: 'example',
  detect(entry) { /* return {url} or null */ },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(URL, { headers: HEADERS });
    return jobs.map(j => ({ title, url, company, location, posted_at }));
  },
};
```

`ctx.fetchJson(url, opts)` and `ctx.fetchText(url, opts)` come from `providers/_http.mjs` (default 10s timeout, default `User-Agent: 'Mozilla/5.0 (compatible; career-ops/1.3)'`). `opts.headers` merges with these defaults.

All 17 new providers are **search-board providers**, not company-board providers: they're never auto-detected from a `careers_url` (their `detect()` always returns `null`), and are wired up via an explicit `provider:` field plus a `search_term:` field in `portals.yml` (per `resolveProvider`'s explicit-field-wins resolution order — see `scan.mjs:91-98`). Filtering happens either server-side (when the API supports a keyword param) or client-side via a small `matchesSearchTerm` helper inlined per file (the check is a one-line case-insensitive substring match — too small to warrant a shared abstraction, and each provider's matchable fields differ).

---

## Phase 0: Shared RSS helper

### Task 0.1: Create `providers/_rss.mjs`

**Files:**
- Create: `providers/_rss.mjs`

Four of the new providers (We Work Remotely, Real Work From Anywhere, Crunchboard, Jobspresso) consume RSS/XML feeds. Rather than duplicate regex-based parsing four times, extract the three primitives into a shared `_`-prefixed helper (the same convention `_http.mjs` and `_recognition.mjs` establish — files prefixed `_` are never auto-loaded as providers).

- [ ] **Step 1: Write `providers/_rss.mjs`**

```js
// @ts-check
//
// Minimal regex-based RSS/XML parsing helpers — no XML library dependency,
// matching the zero-dependency philosophy of providers/_http.mjs. Handles
// the small, predictable subset of RSS that job-board feeds actually use:
// <item> blocks, CDATA-wrapped tag content, and a handful of HTML entities.

const ITEM_RE = /<item\b[\s\S]*?<\/item>/gi;
const TAG_CACHE = new Map();

const ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  '#39': "'",
  nbsp: ' ',
};

function tagRegex(tagName) {
  let re = TAG_CACHE.get(tagName);
  if (!re) {
    re = new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i');
    TAG_CACHE.set(tagName, re);
  }
  return re;
}

/**
 * Split a raw RSS/XML document into individual `<item>...</item>` blocks.
 * @param {string} xml
 * @returns {string[]}
 */
export function splitItems(xml) {
  if (!xml) return [];
  return xml.match(ITEM_RE) || [];
}

/**
 * Decode the small set of HTML/XML entities that show up in RSS feed text
 * (named entities plus numeric `&#NNN;` / `&#xHH;` references).
 * @param {string} text
 * @returns {string}
 */
export function decodeEntities(text) {
  if (!text) return text;
  return text.replace(/&(#?\w+);/g, (full, entity) => {
    if (entity[0] === '#') {
      const isHex = entity[1] === 'x' || entity[1] === 'X';
      const code = isHex ? parseInt(entity.slice(2), 16) : parseInt(entity.slice(1), 10);
      return Number.isNaN(code) ? full : String.fromCharCode(code);
    }
    return Object.prototype.hasOwnProperty.call(ENTITIES, entity) ? ENTITIES[entity] : full;
  });
}

/**
 * Extract the text content of a tag from an `<item>` block, unwrapping
 * CDATA sections and decoding entities.
 * @param {string} item
 * @param {string} tagName
 * @returns {string|null}
 */
export function extractTag(item, tagName) {
  const match = item.match(tagRegex(tagName));
  if (!match) return null;
  let value = match[1].trim();
  const cdata = value.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  if (cdata) value = cdata[1].trim();
  return decodeEntities(value);
}
```

- [ ] **Step 2: Smoke-test the helper in isolation**

Run:
```bash
node -e "
import('./providers/_rss.mjs').then(({ splitItems, extractTag }) => {
  const xml = '<rss><channel><item><title><![CDATA[Acme: Marketing Lead]]></title><link>https://example.com/1</link><pubDate>Mon, 01 Jun 2026 00:00:00 +0000</pubDate></item></channel></rss>';
  const items = splitItems(xml);
  console.log('items:', items.length);
  console.log('title:', extractTag(items[0], 'title'));
  console.log('link:', extractTag(items[0], 'link'));
  console.log('pubDate:', extractTag(items[0], 'pubDate'));
});
"
```
Expected output:
```
items: 1
title: Acme: Marketing Lead
link: https://example.com/1
pubDate: Mon, 01 Jun 2026 00:00:00 +0000
```

- [ ] **Step 3: Commit**

```bash
git add providers/_rss.mjs
git commit -m "feat: add shared RSS/XML parsing helper for feed-based providers"
```

---

## Phase 1: Bulk company-list import (Part B)

### Task 1.1: Write the extraction + dedup script

**Files:**
- Create: `import-everjobs-companies.mjs`

This is a one-time migration tool (same tier as `merge-tracker.mjs`/`dedup-tracker.mjs` — a root-level `.mjs` utility). It scans the 551 `source-company-*` Greenhouse plugins under `ever-jobs-develop/`, extracts `name` + Greenhouse board slug via regex, normalizes every API URL to the `boards-api.greenhouse.io` host (matching `greenhouse.mjs`'s `ALLOWED_GREENHOUSE_HOSTS` and `resolveApiUrl` normalization — see `providers/greenhouse.mjs:8,38`), dedupes against the 29 Greenhouse companies already in `portals.yml` by slug, and prints a ready-to-append YAML block.

- [ ] **Step 1: Write `import-everjobs-companies.mjs`**

```js
#!/usr/bin/env node
// One-time migration: extract Greenhouse-based companies from the
// ever-jobs catalog (ever-jobs-develop/packages/plugins/source-company-*)
// and emit a YAML block of net-new tracked_companies entries for portals.yml.
//
// Usage: node import-everjobs-companies.mjs > batch/everjobs-import.yml

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const PLUGINS_DIR = join(process.cwd(), 'ever-jobs-develop/packages/plugins');
const PORTALS_PATH = join(process.cwd(), 'portals.yml');

// Matches both `api.greenhouse.io` (legacy host used by some ever-jobs
// plugins) and `boards.greenhouse.io` — both normalize to the same slug.
const SLUG_RE = /(?:boards|api)\.greenhouse\.io\/v1\/boards\/([a-zA-Z0-9_-]+)\/jobs/;
const NAME_RE = /@SourcePlugin\(\{[\s\S]*?name:\s*'([^']+)'/;

function extractCompanyEntries() {
  const dirs = readdirSync(PLUGINS_DIR).filter((d) => d.startsWith('source-company-'));
  const entries = [];
  for (const dir of dirs) {
    const srcDir = join(PLUGINS_DIR, dir, 'src');
    if (!existsSync(srcDir)) continue;
    const serviceFile = readdirSync(srcDir).find((f) => f.endsWith('.service.ts'));
    if (!serviceFile) continue;
    const content = readFileSync(join(srcDir, serviceFile), 'utf8');
    const slugMatch = content.match(SLUG_RE);
    const nameMatch = content.match(NAME_RE);
    if (!slugMatch || !nameMatch) continue;
    entries.push({ name: nameMatch[1], slug: slugMatch[1] });
  }
  return entries;
}

function existingSlugs() {
  const config = yaml.load(readFileSync(PORTALS_PATH, 'utf8'));
  const slugs = new Set();
  for (const company of config.tracked_companies || []) {
    const match = (company.api || '').match(/boards-api\.greenhouse\.io\/v1\/boards\/([a-zA-Z0-9_-]+)\/jobs/);
    if (match) slugs.add(match[1]);
  }
  return slugs;
}

const seen = existingSlugs();
const candidates = extractCompanyEntries();
const dedupedSlugs = new Set();
const netNew = [];

for (const { name, slug } of candidates) {
  if (seen.has(slug) || dedupedSlugs.has(slug)) continue;
  dedupedSlugs.add(slug);
  netNew.push({
    name,
    careers_url: `https://boards.greenhouse.io/${slug}`,
    api: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    enabled: true,
  });
}

netNew.sort((a, b) => a.name.localeCompare(b.name));

process.stderr.write(`Found ${candidates.length} Greenhouse company plugins, ${netNew.length} net-new after dedup against ${seen.size} existing.\n`);
process.stdout.write(`\n# Imported from ever-jobs catalog — ${new Date().toISOString().slice(0, 10)}\n`);
process.stdout.write(yaml.dump(netNew, { lineWidth: -1 }));
```

- [ ] **Step 2: Run it and inspect the count**

```bash
mkdir -p batch
node import-everjobs-companies.mjs > batch/everjobs-import.yml
```
Expected stderr output (counts will vary slightly if the catalog snapshot differs from the design-spec estimate, but should be in this neighborhood):
```
Found 551 Greenhouse company plugins, 537 net-new after dedup against 29 existing.
```

- [ ] **Step 3: Spot-check the generated YAML block**

```bash
head -30 batch/everjobs-import.yml
grep -c "^- name:" batch/everjobs-import.yml
```
Expected: well-formed `- name: ... / careers_url: ... / api: ... / enabled: true` blocks, and the count matches the "net-new" number from Step 2's stderr line.

- [ ] **Step 4: Commit the script (not the generated import file — that gets spliced into portals.yml in Task 1.2 and then deleted)**

```bash
git add import-everjobs-companies.mjs
git commit -m "feat: add one-time script to import Greenhouse companies from ever-jobs catalog"
```

### Task 1.2: Append the net-new companies to `portals.yml`

**Files:**
- Modify: `portals.yml` (append at EOF — `tracked_companies:` at line 738 is the last top-level key and runs to the end of the file at line 1420)

Appending to the end of the file (rather than re-parsing and re-dumping the whole YAML document with `js-yaml`) preserves all existing comments, formatting, and ordering — `js-yaml.dump` would silently strip comments from the 1420-line file, which is not acceptable for a hand-curated config.

- [ ] **Step 1: Append the generated block to `portals.yml`**

```bash
cat batch/everjobs-import.yml >> portals.yml
```

- [ ] **Step 2: Verify the file still parses as valid YAML and the list grew by the expected amount**

```bash
node -e "
import('js-yaml').then(({ load }) => {
  import('node:fs').then(({ readFileSync }) => {
    const config = load(readFileSync('portals.yml', 'utf8'));
    console.log('tracked_companies count:', config.tracked_companies.length);
  });
});
"
```
Expected: `tracked_companies count: <previous count + net-new count>` (e.g., `183 + 537 = 720`, adjusted for the actual net-new figure from Task 1.1 Step 2).

- [ ] **Step 3: Run the pipeline health check**

```bash
node verify-pipeline.mjs
```
Expected: exits cleanly with no structural errors (the new entries use the exact same `name`/`careers_url`/`api`/`enabled` shape as the 183 existing Greenhouse entries, so no new validation failures should surface).

- [ ] **Step 4: Spot-check a sample of new API URLs actually resolve**

```bash
for slug in $(grep -A2 "^# Imported from ever-jobs catalog" portals.yml | true; grep "boards-api.greenhouse.io" portals.yml | tail -537 | head -5 | sed -E 's#.*/v1/boards/([a-zA-Z0-9_-]+)/jobs#\1#'); do
  echo "--- $slug ---"
  curl -s -o /dev/null -w "%{http_code}\n" "https://boards-api.greenhouse.io/v1/boards/$slug/jobs"
done
```
Expected: `200` for each sampled slug. (A `404` would indicate a stale/renamed board — note it but don't block the import on a handful of stale entries; `scan.mjs` already handles per-company fetch failures gracefully.)

- [ ] **Step 5: Clean up the intermediate file and commit**

```bash
rm batch/everjobs-import.yml
git add portals.yml
git commit -m "feat: bulk-import net-new Greenhouse companies from ever-jobs catalog"
```

---

## Phase 2: Tier 1 JSON-API providers

Ten boards with free, no-auth JSON APIs. Each follows the `{ id, detect, fetch }` contract; `detect` always returns `null` (these are search-board providers, wired via explicit `provider:` in `portals.yml`, not auto-detected).

### Task 2.1: RemoteOK (`providers/remoteok.mjs`)

**Files:**
- Create: `providers/remoteok.mjs`

The RemoteOK API (`https://remoteok.com/api`) returns a JSON array where the **first element is a metadata object** (has a `legal` key, not a job) — it must be sliced off. There's no clean free-text search param, so filtering happens client-side against `position` + `tags`.

- [ ] **Step 1: Write `providers/remoteok.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const REMOTEOK_API_URL = 'https://remoteok.com/api';
const REMOTEOK_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.position || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'remoteok',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(REMOTEOK_API_URL, { headers: REMOTEOK_HEADERS });
    const jobs = Array.isArray(json) ? json.slice(1) : []; // first element is API metadata, not a job
    return jobs
      .filter((j) => j && j.position && (j.apply_url || j.url))
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.position || '',
        url: j.apply_url || j.url,
        company: j.company || entry.name,
        location: j.location || '',
        posted_at: j.date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test against the live API**

```bash
node scan.mjs --company "RemoteOK" --no-verify --dry-run
```
(This will only resolve once the entry exists in `portals.yml` — see Phase 5. For an isolated pre-wiring check, run:)
```bash
node -e "
import('./providers/remoteok.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'RemoteOK test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>` with `N > 0` and a sample job object containing non-empty `title`, `url`, `company`.

- [ ] **Step 3: Commit**

```bash
git add providers/remoteok.mjs
git commit -m "feat: add RemoteOK provider"
```

### Task 2.2: Remotive (`providers/remotive.mjs`)

**Files:**
- Create: `providers/remotive.mjs`

Remotive's API supports a server-side `?search=` query param — use it directly rather than client-side filtering.

- [ ] **Step 1: Write `providers/remotive.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const REMOTIVE_API_URL = 'https://remotive.com/api/remote-jobs';
const REMOTIVE_HEADERS = { Accept: 'application/json' };

/** @type {Provider} */
export default {
  id: 'remotive',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const url = entry.search_term
      ? `${REMOTIVE_API_URL}?search=${encodeURIComponent(entry.search_term)}`
      : REMOTIVE_API_URL;
    const json = await ctx.fetchJson(url, { headers: REMOTIVE_HEADERS });
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.url && j.title)
      .map((j) => ({
        title: j.title || '',
        url: j.url,
        company: j.company_name || entry.name,
        location: j.candidate_required_location || '',
        posted_at: j.publication_date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/remotive.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Remotive test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>` with `N > 0`, sample job has non-empty `title`/`url`/`company`.

- [ ] **Step 3: Commit**

```bash
git add providers/remotive.mjs
git commit -m "feat: add Remotive provider"
```

### Task 2.3: Himalayas (`providers/himalayas.mjs`)

**Files:**
- Create: `providers/himalayas.mjs`

`https://himalayas.app/jobs/api?limit=20&offset=0` returns `{ jobs, totalCount, offset, limit }`. `pubDate`/`expiryDate` are numeric epoch timestamps — `formatPostedAt` handles both second- and millisecond-resolution values defensively (values `> 1e12` are treated as already-milliseconds).

- [ ] **Step 1: Write `providers/himalayas.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const HIMALAYAS_API_URL = 'https://himalayas.app/jobs/api';
const HIMALAYAS_HEADERS = { Accept: 'application/json' };
const PAGE_SIZE = 20;

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.title || ''} ${(job.categories || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

function formatPostedAt(pubDate) {
  if (!pubDate) return '';
  const ms = pubDate > 1e12 ? pubDate : pubDate * 1000;
  const d = new Date(ms);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString();
}

/** @type {Provider} */
export default {
  id: 'himalayas',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const url = `${HIMALAYAS_API_URL}?limit=${PAGE_SIZE}&offset=0`;
    const json = await ctx.fetchJson(url, { headers: HIMALAYAS_HEADERS });
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.applicationLink && j.title)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.title || '',
        url: j.applicationLink,
        company: j.companyName || entry.name,
        location: Array.isArray(j.locationRestrictions) ? j.locationRestrictions.join(', ') : '',
        posted_at: formatPostedAt(j.pubDate),
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/himalayas.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Himalayas test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has a valid ISO `posted_at` string (or empty string if `pubDate` was missing).

- [ ] **Step 3: Commit**

```bash
git add providers/himalayas.mjs
git commit -m "feat: add Himalayas provider"
```

### Task 2.4: Jobicy (`providers/jobicy.mjs`)

**Files:**
- Create: `providers/jobicy.mjs`

- [ ] **Step 1: Write `providers/jobicy.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const JOBICY_API_URL = 'https://jobicy.com/api/v2/remote-jobs';
const JOBICY_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.jobTitle || ''} ${(job.jobIndustry || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'jobicy',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(JOBICY_API_URL, { headers: JOBICY_HEADERS });
    const jobs = Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.url && j.jobTitle)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.jobTitle || '',
        url: j.url,
        company: j.companyName || entry.name,
        location: j.jobGeo || '',
        posted_at: j.pubDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/jobicy.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Jobicy test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`.

- [ ] **Step 3: Commit**

```bash
git add providers/jobicy.mjs
git commit -m "feat: add Jobicy provider"
```

### Task 2.5: The Muse (`providers/themuse.mjs`)

**Files:**
- Create: `providers/themuse.mjs`

The Muse's `category` query param expects exact category names (e.g. "Marketing & PR") that don't map cleanly onto Morgan's free-text `search_term` vocabulary, so filtering is client-side against `name` + `categories[].name`.

- [ ] **Step 1: Write `providers/themuse.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const THEMUSE_API_URL = 'https://www.themuse.com/api/public/jobs';
const THEMUSE_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const categories = Array.isArray(job.categories) ? job.categories.map((c) => c.name).join(' ') : '';
  const haystack = `${job.name || ''} ${categories}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'themuse',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(`${THEMUSE_API_URL}?page=0`, { headers: THEMUSE_HEADERS });
    const jobs = Array.isArray(json?.results) ? json.results : [];
    return jobs
      .filter((j) => j.refs?.landing_page && j.name)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.name || '',
        url: j.refs.landing_page,
        company: j.company?.name || entry.name,
        location: Array.isArray(j.locations) ? j.locations.map((l) => l.name).join(', ') : '',
        posted_at: j.publication_date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/themuse.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'The Muse test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`.

- [ ] **Step 3: Commit**

```bash
git add providers/themuse.mjs
git commit -m "feat: add The Muse provider"
```

### Task 2.6: Working Nomads (`providers/workingnomads.mjs`)

**Files:**
- Create: `providers/workingnomads.mjs`

`https://www.workingnomads.co/api/exposed_jobs/` returns a bare JSON array (no envelope object).

- [ ] **Step 1: Write `providers/workingnomads.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const WORKINGNOMADS_API_URL = 'https://www.workingnomads.co/api/exposed_jobs/';
const WORKINGNOMADS_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.title || ''} ${job.category_name || ''} ${job.tags || ''}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'workingnomads',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(WORKINGNOMADS_API_URL, { headers: WORKINGNOMADS_HEADERS });
    const jobs = Array.isArray(json) ? json : [];
    return jobs
      .filter((j) => j.url && j.title)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.title || '',
        url: j.url,
        company: j.company_name || entry.name,
        location: j.location || '',
        posted_at: j.pub_date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/workingnomads.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Working Nomads test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`.

- [ ] **Step 3: Commit**

```bash
git add providers/workingnomads.mjs
git commit -m "feat: add Working Nomads provider"
```

### Task 2.7: NoDesk (`providers/nodesk.mjs`)

**Files:**
- Create: `providers/nodesk.mjs`

- [ ] **Step 1: Write `providers/nodesk.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const NODESK_API_URL = 'https://nodesk.co/api/jobs/';
const NODESK_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.title || ''} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'nodesk',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(NODESK_API_URL, { headers: NODESK_HEADERS });
    const jobs = Array.isArray(json) ? json : Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.url && j.title)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.title || '',
        url: j.url,
        company: j.company || entry.name,
        location: j.location || '',
        posted_at: j.published_at || j.date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/nodesk.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'NoDesk test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`.

- [ ] **Step 3: Commit**

```bash
git add providers/nodesk.mjs
git commit -m "feat: add NoDesk provider"
```

### Task 2.8: 4 Day Week (`providers/fourdayweek.mjs`)

**Files:**
- Create: `providers/fourdayweek.mjs`

- [ ] **Step 1: Write `providers/fourdayweek.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const FOURDAYWEEK_API_URL = 'https://4dayweek.io/api/jobs';
const FOURDAYWEEK_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(job, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${job.title || ''} ${job.category || ''} ${(job.tags || []).join(' ')}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'fourdayweek',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(FOURDAYWEEK_API_URL, { headers: FOURDAYWEEK_HEADERS });
    const jobs = Array.isArray(json) ? json : Array.isArray(json?.jobs) ? json.jobs : [];
    return jobs
      .filter((j) => j.url && j.title)
      .filter((j) => matchesSearchTerm(j, entry.search_term))
      .map((j) => ({
        title: j.title || '',
        url: j.url,
        company: j.company || entry.name,
        location: j.location || '',
        posted_at: j.published_at || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/fourdayweek.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: '4 Day Week test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`.

- [ ] **Step 3: Commit**

```bash
git add providers/fourdayweek.mjs
git commit -m "feat: add 4 Day Week provider"
```

### Task 2.9: Hacker News "Who's Hiring" (`providers/hackernews.mjs`)

**Files:**
- Create: `providers/hackernews.mjs`

This is the most involved Tier 1 provider: the Firebase API exposes `jobstories.json` (a list of item IDs), and each job's details require a second fetch to `item/<id>.json`. There's no native search — filtering and company-name extraction (from titles like `"Acme Corp is hiring a Marketing Lead"`) happen client-side, mirroring the pattern in `source-hackernews/src/hackernews.service.ts`. `MAX_STORIES_TO_SCAN` caps the fan-out to keep this provider's per-scan cost bounded (career-ops's `CONCURRENCY = 10` already parallelizes across companies, so this provider doing N+1 internal fetches is the right place to bound, not the scanner).

- [ ] **Step 1: Write `providers/hackernews.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const HN_API_BASE = 'https://hacker-news.firebaseio.com/v0';
const HN_JOB_STORIES_URL = `${HN_API_BASE}/jobstories.json`;
const HN_ITEM_URL = (id) => `${HN_API_BASE}/item/${id}.json`;
const MAX_STORIES_TO_SCAN = 60;

function matchesSearchTerm(item, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const haystack = `${item.title || ''} ${item.text || ''}`.toLowerCase();
  return haystack.includes(needle);
}

function extractCompanyName(title) {
  if (!title) return '';
  const hiringMatch = title.match(/^(.+?)\s+is\s+hiring/i);
  if (hiringMatch) return hiringMatch[1].trim();
  const separatorMatch = title.match(/^(.+?)\s*[-|]\s+/);
  if (separatorMatch) return separatorMatch[1].trim();
  return '';
}

/** @type {Provider} */
export default {
  id: 'hackernews',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const ids = await ctx.fetchJson(HN_JOB_STORIES_URL);
    const candidateIds = Array.isArray(ids) ? ids.slice(0, MAX_STORIES_TO_SCAN) : [];
    const items = await Promise.all(
      candidateIds.map((id) => ctx.fetchJson(HN_ITEM_URL(id)).catch(() => null)),
    );
    return items
      .filter((item) => item && item.title && item.url)
      .filter((item) => matchesSearchTerm(item, entry.search_term))
      .map((item) => ({
        title: item.title || '',
        url: item.url,
        company: extractCompanyName(item.title) || entry.name,
        location: '',
        posted_at: item.time ? new Date(item.time * 1000).toISOString() : '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/hackernews.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'HN Who is Hiring test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>` (N may be small or 0 depending on the current "Who's Hiring" thread's content — HN job stories are sparse and skew engineering-heavy; this is an acceptable, expected outcome documented in Phase 5). Each returned job has a non-empty `title`/`url`.

- [ ] **Step 3: Commit**

```bash
git add providers/hackernews.mjs
git commit -m "feat: add Hacker News Who's Hiring provider"
```

### Task 2.10: PowerToFly (`providers/powertofly.mjs`)

**Files:**
- Create: `providers/powertofly.mjs`

Despite the `/rss` URL suffix, PowerToFly's endpoint returns **JSON** (`{ items: [...], status }`), confirmed by reading `source-powertofly/src/powertofly.service.ts`. Items don't carry a separate company field, so `company` falls back to `entry.name` — documented as a known limitation in Phase 5.

- [ ] **Step 1: Write `providers/powertofly.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

// NOTE: this endpoint's URL ends in `/rss` but returns JSON, not XML —
// confirmed against ever-jobs's PowertoflyApiResponse type ({ items, status }).
const POWERTOFLY_API_URL = 'https://powertofly.com/jobs/rss';
const POWERTOFLY_HEADERS = { Accept: 'application/json' };

function matchesSearchTerm(item, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  const categories = Array.isArray(item.categories) ? item.categories.join(' ') : '';
  const haystack = `${item.title || ''} ${categories}`.toLowerCase();
  return haystack.includes(needle);
}

/** @type {Provider} */
export default {
  id: 'powertofly',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const json = await ctx.fetchJson(POWERTOFLY_API_URL, { headers: POWERTOFLY_HEADERS });
    const items = Array.isArray(json?.items) ? json.items : [];
    return items
      .filter((item) => item.link && item.title)
      .filter((item) => matchesSearchTerm(item, entry.search_term))
      .map((item) => ({
        title: item.title || '',
        url: item.link,
        company: entry.name, // PowerToFly items don't expose a company field
        location: item.job_location || '',
        posted_at: item.published_on || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/powertofly.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'PowerToFly — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`, and `company` equal to the `name` you passed in (`'PowerToFly — Marketing'`) — confirming the documented fallback behaves as designed.

- [ ] **Step 3: Commit**

```bash
git add providers/powertofly.mjs
git commit -m "feat: add PowerToFly provider"
```

---

## Phase 3: Tier 1 RSS-feed providers

Four boards whose only public interface is an RSS/Atom feed. All four import `splitItems`/`extractTag` from the `_rss.mjs` helper built in Phase 0.

### Task 3.1: We Work Remotely (`providers/weworkremotely.mjs`)

**Files:**
- Create: `providers/weworkremotely.mjs`

WWR's RSS `<title>` encodes `"Company: Job Title"` — the only one of the four feeds that does this (confirmed by reading `source-we-work-remotely`'s `WwrRssItem` type and comparing against Crunchboard/Jobspresso, which don't extract company from titles). `splitTitle` performs the split; if no `": "` separator is present, the whole string is treated as the job title and `company` falls back to `entry.name`.

- [ ] **Step 1: Write `providers/weworkremotely.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const WWR_RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';
const WWR_HEADERS = { Accept: 'application/rss+xml, application/xml, text/xml' };

function splitTitle(rawTitle) {
  if (!rawTitle) return { company: '', title: '' };
  const idx = rawTitle.indexOf(': ');
  if (idx === -1) return { company: '', title: rawTitle };
  return { company: rawTitle.slice(0, idx).trim(), title: rawTitle.slice(idx + 2).trim() };
}

function matchesSearchTerm(title, description, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return `${title} ${description || ''}`.toLowerCase().includes(needle);
}

/** @type {Provider} */
export default {
  id: 'weworkremotely',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const xml = await ctx.fetchText(WWR_RSS_URL, { headers: WWR_HEADERS });
    return splitItems(xml)
      .map((item) => {
        const rawTitle = extractTag(item, 'title') || '';
        const { company, title } = splitTitle(rawTitle);
        return {
          title,
          company,
          link: extractTag(item, 'link'),
          description: extractTag(item, 'description'),
          pubDate: extractTag(item, 'pubDate'),
        };
      })
      .filter((j) => j.link && j.title)
      .filter((j) => matchesSearchTerm(j.title, j.description, entry.search_term))
      .map((j) => ({
        title: j.title,
        url: /** @type {string} */ (j.link),
        company: j.company || entry.name,
        location: '',
        posted_at: j.pubDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/weworkremotely.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'WWR test', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has a non-empty `company` distinct from `'WWR test'` (proving the `"Company: Title"` split worked) for at least the first result.

- [ ] **Step 3: Commit**

```bash
git add providers/weworkremotely.mjs
git commit -m "feat: add We Work Remotely provider"
```

### Task 3.2: Real Work From Anywhere (`providers/realworkfromanywhere.mjs`)

**Files:**
- Create: `providers/realworkfromanywhere.mjs`

Unlike WWR, this feed's `<title>` is just the job title (no company prefix) — confirmed against `RealWorkFromAnywhereRssItem`'s type, which has no company field. `company` falls back to `entry.name`.

- [ ] **Step 1: Write `providers/realworkfromanywhere.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const RWFA_RSS_URL = 'https://www.realworkfromanywhere.com/rss.xml';
const RWFA_HEADERS = { Accept: 'application/rss+xml, application/xml, text/xml' };

function matchesSearchTerm(title, description, category, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return `${title} ${description || ''} ${category || ''}`.toLowerCase().includes(needle);
}

/** @type {Provider} */
export default {
  id: 'realworkfromanywhere',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const xml = await ctx.fetchText(RWFA_RSS_URL, { headers: RWFA_HEADERS });
    return splitItems(xml)
      .map((item) => ({
        title: extractTag(item, 'title'),
        link: extractTag(item, 'link'),
        description: extractTag(item, 'description'),
        category: extractTag(item, 'category'),
        pubDate: extractTag(item, 'pubDate'),
      }))
      .filter((j) => j.link && j.title)
      .filter((j) => matchesSearchTerm(j.title, j.description, j.category, entry.search_term))
      .map((j) => ({
        title: /** @type {string} */ (j.title),
        url: /** @type {string} */ (j.link),
        company: entry.name, // feed exposes no company field on items
        location: '',
        posted_at: j.pubDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/realworkfromanywhere.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'RWFA — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`.

- [ ] **Step 3: Commit**

```bash
git add providers/realworkfromanywhere.mjs
git commit -m "feat: add Real Work From Anywhere provider"
```

### Task 3.3: Crunchboard (`providers/crunchboard.mjs`)

**Files:**
- Create: `providers/crunchboard.mjs`

Plain RSS — no company-from-title parsing (confirmed: `CrunchboardRssItem` has no company field and `crunchboard.service.ts`'s `mapJob` doesn't extract one).

- [ ] **Step 1: Write `providers/crunchboard.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const CRUNCHBOARD_RSS_URL = 'https://www.crunchboard.com/jobs.rss';
const CRUNCHBOARD_HEADERS = { Accept: 'application/rss+xml, application/xml, text/xml' };

function matchesSearchTerm(title, description, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return `${title} ${description || ''}`.toLowerCase().includes(needle);
}

/** @type {Provider} */
export default {
  id: 'crunchboard',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const xml = await ctx.fetchText(CRUNCHBOARD_RSS_URL, { headers: CRUNCHBOARD_HEADERS });
    return splitItems(xml)
      .map((item) => ({
        title: extractTag(item, 'title'),
        link: extractTag(item, 'link'),
        description: extractTag(item, 'description'),
        pubDate: extractTag(item, 'pubDate'),
      }))
      .filter((j) => j.link && j.title)
      .filter((j) => matchesSearchTerm(j.title, j.description, entry.search_term))
      .map((j) => ({
        title: /** @type {string} */ (j.title),
        url: /** @type {string} */ (j.link),
        company: entry.name,
        location: '',
        posted_at: j.pubDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/crunchboard.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Crunchboard — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`.

- [ ] **Step 3: Commit**

```bash
git add providers/crunchboard.mjs
git commit -m "feat: add Crunchboard provider"
```

### Task 3.4: Jobspresso (`providers/jobspresso.mjs`)

**Files:**
- Create: `providers/jobspresso.mjs`

Standard WordPress `job_listing` RSS feed — same simple shape as Crunchboard, plus a `<category>` tag.

- [ ] **Step 1: Write `providers/jobspresso.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */
import { splitItems, extractTag } from './_rss.mjs';

const JOBSPRESSO_RSS_URL = 'https://jobspresso.co/feed/?post_type=job_listing';
const JOBSPRESSO_HEADERS = { Accept: 'application/rss+xml, application/xml, text/xml' };

function matchesSearchTerm(title, description, category, term) {
  if (!term) return true;
  const needle = term.toLowerCase();
  return `${title} ${description || ''} ${category || ''}`.toLowerCase().includes(needle);
}

/** @type {Provider} */
export default {
  id: 'jobspresso',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const xml = await ctx.fetchText(JOBSPRESSO_RSS_URL, { headers: JOBSPRESSO_HEADERS });
    return splitItems(xml)
      .map((item) => ({
        title: extractTag(item, 'title'),
        link: extractTag(item, 'link'),
        description: extractTag(item, 'description'),
        category: extractTag(item, 'category'),
        pubDate: extractTag(item, 'pubDate'),
      }))
      .filter((j) => j.link && j.title)
      .filter((j) => matchesSearchTerm(j.title, j.description, j.category, entry.search_term))
      .map((j) => ({
        title: /** @type {string} */ (j.title),
        url: /** @type {string} */ (j.link),
        company: entry.name,
        location: '',
        posted_at: j.pubDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test**

```bash
node -e "
import('./providers/jobspresso.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Jobspresso — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`.

- [ ] **Step 3: Commit**

```bash
git add providers/jobspresso.mjs
git commit -m "feat: add Jobspresso provider"
```

---

## Phase 4: Tier 2 keyed-API providers

Three boards that require free API keys (Morgan signs up and stores keys as environment variables — same pattern the codebase already uses for `BRAVE_API_KEY`). Each provider throws a clear, actionable error if its required env vars are missing, rather than silently returning an empty result set (so a misconfiguration surfaces immediately in scan output rather than masquerading as "no jobs found").

> **Note on Built In:** the design spec listed Built In as a Tier 2 candidate based on its README's claim of simple `__NEXT_DATA__` JSON parsing. Reading the actual `ever-jobs-develop/packages/plugins/source-builtin/src/builtin.service.ts` (368 lines) revealed it requires a GraphQL API call with spoofed browser headers (`Origin`, `Referer`, fake Chrome `User-Agent`), a location-slug mapping table, randomized rate-limit delays (`randomSleep`), AND an HTML-scraping fallback using `cheerio` + `__NEXT_DATA__` extraction. That's Tier-3-level complexity and fragility — squarely the "heavier/riskier... HTML scraping" profile the design spec already excludes (see "Out of scope" in `docs/superpowers/specs/2026-06-07-ever-jobs-merge-design.md:63`). **Built In is moved to the future-candidates list** alongside LinkedIn/Glassdoor/Indeed/Wellfound; it is not built in this plan. This reduces the Tier 1+2 build count from 18 to 17 providers.

### Task 4.1: Set up environment variables for Tier 2 providers

**Files:**
- Modify: none (this is a one-time account-setup + local-env step, not a code change)

Before writing the Tier 2 providers, Morgan needs free API credentials for all three services. This mirrors how `BRAVE_API_KEY` is already configured for `websearch.mjs`.

- [ ] **Step 1: Sign up for credentials**

| Service | Sign-up URL | Env vars needed |
|---|---|---|
| Adzuna | https://developer.adzuna.com/ | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| Authentic Jobs | https://authenticjobs.com/api/ | `AUTHENTICJOBS_API_KEY` |
| USAJobs | https://developer.usajobs.gov/apirequest/ | `USAJOBS_API_KEY`, `USAJOBS_EMAIL` (USAJobs requires the registered email as the `User-Agent` header on every request) |

- [ ] **Step 2: Add the env vars to your shell profile or `.env` (wherever `BRAVE_API_KEY` currently lives)**

```bash
export ADZUNA_APP_ID="<your-app-id>"
export ADZUNA_APP_KEY="<your-app-key>"
export AUTHENTICJOBS_API_KEY="<your-api-key>"
export USAJOBS_API_KEY="<your-api-key>"
export USAJOBS_EMAIL="<your-registered-email>"
```

- [ ] **Step 3: Verify they're visible to Node**

```bash
node -e "console.log({
  adzuna: !!process.env.ADZUNA_APP_ID && !!process.env.ADZUNA_APP_KEY,
  authenticjobs: !!process.env.AUTHENTICJOBS_API_KEY,
  usajobs: !!process.env.USAJOBS_API_KEY && !!process.env.USAJOBS_EMAIL,
})"
```
Expected: `{ adzuna: true, authenticjobs: true, usajobs: true }`

(No commit — this step only touches the local shell environment.)

### Task 4.2: Adzuna (`providers/adzuna.mjs`)

**Files:**
- Create: `providers/adzuna.mjs`

Adzuna's Search API takes `app_id`/`app_key` as **query params** (not headers) plus a country-code path segment. Hardcoded to `us` — matching Morgan's US-only `location_filter` (the design spec explicitly excludes country-specific boards that conflict with it).

- [ ] **Step 1: Write `providers/adzuna.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const ADZUNA_API_BASE_URL = 'https://api.adzuna.com/v1/api/jobs';
const ADZUNA_HEADERS = { Accept: 'application/json' };
const ADZUNA_COUNTRY_CODE = 'us';
const ADZUNA_RESULTS_PER_PAGE = 25;

/** @type {Provider} */
export default {
  id: 'adzuna',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const appId = process.env.ADZUNA_APP_ID;
    const appKey = process.env.ADZUNA_APP_KEY;
    if (!appId || !appKey) {
      throw new Error('adzuna: missing ADZUNA_APP_ID / ADZUNA_APP_KEY environment variables');
    }
    const params = new URLSearchParams({
      app_id: appId,
      app_key: appKey,
      results_per_page: String(ADZUNA_RESULTS_PER_PAGE),
    });
    if (entry.search_term) params.set('what', entry.search_term);
    const url = `${ADZUNA_API_BASE_URL}/${ADZUNA_COUNTRY_CODE}/search/1?${params.toString()}`;
    const json = await ctx.fetchJson(url, { headers: ADZUNA_HEADERS });
    const jobs = Array.isArray(json?.results) ? json.results : [];
    return jobs
      .filter((j) => j.redirect_url && j.title)
      .map((j) => ({
        title: j.title || '',
        url: j.redirect_url,
        company: j.company?.display_name || entry.name,
        location: j.location?.display_name || '',
        posted_at: j.created || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test (requires `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` from Task 4.1)**

```bash
node -e "
import('./providers/adzuna.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Adzuna — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>` with `N > 0`, sample job has non-empty `title`/`url`/`company`/`location`. If `ADZUNA_APP_ID`/`ADZUNA_APP_KEY` are unset, the script should throw `adzuna: missing ADZUNA_APP_ID / ADZUNA_APP_KEY environment variables` — confirming the guard works.

- [ ] **Step 3: Commit**

```bash
git add providers/adzuna.mjs
git commit -m "feat: add Adzuna provider (requires ADZUNA_APP_ID/ADZUNA_APP_KEY)"
```

### Task 4.3: Authentic Jobs (`providers/authenticjobs.mjs`)

**Files:**
- Create: `providers/authenticjobs.mjs`

Authentic Jobs uses a single REST-ish endpoint with a `method` param selecting the operation (`aj.jobs.search`). Listings don't include a direct apply URL field — the canonical job page is `https://authenticjobs.com/job/<id>` unless the listing's `company.url` is set (confirmed by reading `authenticjobs.service.ts:171-173`, which builds the URL exactly this way).

- [ ] **Step 1: Write `providers/authenticjobs.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const AUTHENTICJOBS_API_URL = 'https://authenticjobs.com/api/';
const AUTHENTICJOBS_HEADERS = { Accept: 'application/json' };

/** @type {Provider} */
export default {
  id: 'authenticjobs',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const apiKey = process.env.AUTHENTICJOBS_API_KEY;
    if (!apiKey) {
      throw new Error('authenticjobs: missing AUTHENTICJOBS_API_KEY environment variable');
    }
    const params = new URLSearchParams({
      format: 'json',
      method: 'aj.jobs.search',
      api_key: apiKey,
      sort: 'date-posted-desc',
    });
    if (entry.search_term) params.set('keyword', entry.search_term);
    const url = `${AUTHENTICJOBS_API_URL}?${params.toString()}`;
    const json = await ctx.fetchJson(url, { headers: AUTHENTICJOBS_HEADERS });
    const jobs = Array.isArray(json?.listings?.listing) ? json.listings.listing : [];
    return jobs
      .filter((j) => j.id && j.title)
      .map((j) => ({
        title: j.title || '',
        url: j.company?.url || `https://authenticjobs.com/job/${j.id}`,
        company: j.company?.name || entry.name,
        location: j.company?.location || '',
        posted_at: j.post_date || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test (requires `AUTHENTICJOBS_API_KEY` from Task 4.1)**

```bash
node -e "
import('./providers/authenticjobs.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'Authentic Jobs — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`. Each `url` should start with either `https://authenticjobs.com/job/` or the listing's own company-site URL.

- [ ] **Step 3: Commit**

```bash
git add providers/authenticjobs.mjs
git commit -m "feat: add Authentic Jobs provider (requires AUTHENTICJOBS_API_KEY)"
```

### Task 4.4: USAJobs (`providers/usajobs.mjs`)

**Files:**
- Create: `providers/usajobs.mjs`

USAJobs requires **both** `Authorization-Key` and a registered-email `User-Agent` header (its API rejects requests without a valid registered email in `User-Agent` — confirmed in `usajobs.service.ts:82-83`). Location is built from the first `PositionLocation` entry's city + state, mirroring `mapJob`'s `loc?.CityName`/`loc?.CountrySubDivisionCode` fields.

- [ ] **Step 1: Write `providers/usajobs.mjs`**

```js
// @ts-check
/** @typedef {import('./_types.js').Provider} Provider */

const USAJOBS_API_URL = 'https://data.usajobs.gov/api/Search';

function formatLocation(desc) {
  const loc = Array.isArray(desc.PositionLocation) ? desc.PositionLocation[0] : null;
  if (!loc) return '';
  return [loc.CityName, loc.CountrySubDivisionCode].filter(Boolean).join(', ');
}

/** @type {Provider} */
export default {
  id: 'usajobs',
  detect() {
    return null;
  },
  async fetch(entry, ctx) {
    const apiKey = process.env.USAJOBS_API_KEY;
    const email = process.env.USAJOBS_EMAIL;
    if (!apiKey || !email) {
      throw new Error('usajobs: missing USAJOBS_API_KEY / USAJOBS_EMAIL environment variables');
    }
    const headers = {
      Host: 'data.usajobs.gov',
      Accept: 'application/json',
      'Authorization-Key': apiKey,
      'User-Agent': email,
    };
    const params = new URLSearchParams({ Keyword: entry.search_term || '' });
    const url = `${USAJOBS_API_URL}?${params.toString()}`;
    const json = await ctx.fetchJson(url, { headers });
    const items = Array.isArray(json?.SearchResult?.SearchResultItems)
      ? json.SearchResult.SearchResultItems
      : [];
    return items
      .map((item) => item.MatchedObjectDescriptor)
      .filter((desc) => desc && desc.PositionURI && desc.PositionTitle)
      .map((desc) => ({
        title: desc.PositionTitle || '',
        url: desc.PositionURI,
        company: desc.OrganizationName || entry.name,
        location: formatLocation(desc),
        posted_at: desc.PublicationStartDate || '',
      }));
  },
};
```

- [ ] **Step 2: Smoke-test (requires `USAJOBS_API_KEY`/`USAJOBS_EMAIL` from Task 4.1)**

```bash
node -e "
import('./providers/usajobs.mjs').then(async ({ default: provider }) => {
  const { makeHttpCtx } = await import('./providers/_http.mjs');
  const jobs = await provider.fetch({ name: 'USAJobs — Marketing', search_term: 'marketing' }, makeHttpCtx());
  console.log('jobs found:', jobs.length);
  console.log(jobs[0]);
});
"
```
Expected: `jobs found: <N>`, sample job has non-empty `title`/`url`/`company`/`location`. If env vars are unset, throws `usajobs: missing USAJOBS_API_KEY / USAJOBS_EMAIL environment variables`.

- [ ] **Step 3: Commit**

```bash
git add providers/usajobs.mjs
git commit -m "feat: add USAJobs provider (requires USAJOBS_API_KEY/USAJOBS_EMAIL)"
```

---

## Phase 5: Wire boards into `portals.yml` + final verification

### Task 5.1: Add `tracked_companies` entries for all 17 new providers

**Files:**
- Modify: `portals.yml` (append a new labeled block before the `# Imported from ever-jobs catalog` section added in Phase 1, so the hand-curated "search board" entries stay visually distinct from the bulk company import)

Per the design spec, each board gets entries with an explicit `provider:` field and a `search_term:` drawn from Morgan's marketing/sales-enablement vocabulary (the same words already proven out in `title_filter.positive` — see `portals.yml:137,164`). Two search terms per board — `"marketing"` (broad net) and `"enablement"` (her sales-enablement specialty) — for 34 new entries total, all `enabled: true` per the user's explicit choice ("Add them all, enabled by default").

- [ ] **Step 1: Insert this block immediately before the `# Imported from ever-jobs catalog` comment line added in Task 1.2 (use your editor's search to locate it, or `grep -n "# Imported from ever-jobs catalog" portals.yml`)**

```yaml

# New job-board search providers — added 2026-06-07 (ever-jobs catalog merge, Part A)
# Each entry hits a board's own structured JSON/RSS API directly via an
# explicit `provider:` field (bypassing detect()); `search_term` is matched
# against the title_filter vocabulary already proven for Morgan's roles.
- name: "RemoteOK — Marketing"
  provider: remoteok
  search_term: "marketing"
  enabled: true

- name: "RemoteOK — Enablement"
  provider: remoteok
  search_term: "enablement"
  enabled: true

- name: "Remotive — Marketing"
  provider: remotive
  search_term: "marketing"
  enabled: true

- name: "Remotive — Enablement"
  provider: remotive
  search_term: "enablement"
  enabled: true

- name: "Himalayas — Marketing"
  provider: himalayas
  search_term: "marketing"
  enabled: true

- name: "Himalayas — Enablement"
  provider: himalayas
  search_term: "enablement"
  enabled: true

- name: "Jobicy — Marketing"
  provider: jobicy
  search_term: "marketing"
  enabled: true

- name: "Jobicy — Enablement"
  provider: jobicy
  search_term: "enablement"
  enabled: true

- name: "The Muse — Marketing"
  provider: themuse
  search_term: "marketing"
  enabled: true

- name: "The Muse — Enablement"
  provider: themuse
  search_term: "enablement"
  enabled: true

- name: "Working Nomads — Marketing"
  provider: workingnomads
  search_term: "marketing"
  enabled: true

- name: "Working Nomads — Enablement"
  provider: workingnomads
  search_term: "enablement"
  enabled: true

- name: "NoDesk — Marketing"
  provider: nodesk
  search_term: "marketing"
  enabled: true

- name: "NoDesk — Enablement"
  provider: nodesk
  search_term: "enablement"
  enabled: true

- name: "4 Day Week — Marketing"
  provider: fourdayweek
  search_term: "marketing"
  enabled: true

- name: "4 Day Week — Enablement"
  provider: fourdayweek
  search_term: "enablement"
  enabled: true

- name: "Hacker News Who's Hiring — Marketing"
  provider: hackernews
  search_term: "marketing"
  enabled: true

- name: "Hacker News Who's Hiring — Enablement"
  provider: hackernews
  search_term: "enablement"
  enabled: true

- name: "PowerToFly — Marketing"
  provider: powertofly
  search_term: "marketing"
  enabled: true

- name: "PowerToFly — Enablement"
  provider: powertofly
  search_term: "enablement"
  enabled: true

- name: "We Work Remotely — Marketing"
  provider: weworkremotely
  search_term: "marketing"
  enabled: true

- name: "We Work Remotely — Enablement"
  provider: weworkremotely
  search_term: "enablement"
  enabled: true

- name: "Real Work From Anywhere — Marketing"
  provider: realworkfromanywhere
  search_term: "marketing"
  enabled: true

- name: "Real Work From Anywhere — Enablement"
  provider: realworkfromanywhere
  search_term: "enablement"
  enabled: true

- name: "Crunchboard — Marketing"
  provider: crunchboard
  search_term: "marketing"
  enabled: true

- name: "Crunchboard — Enablement"
  provider: crunchboard
  search_term: "enablement"
  enabled: true

- name: "Jobspresso — Marketing"
  provider: jobspresso
  search_term: "marketing"
  enabled: true

- name: "Jobspresso — Enablement"
  provider: jobspresso
  search_term: "enablement"
  enabled: true

- name: "Adzuna — Marketing"
  provider: adzuna
  search_term: "marketing"
  enabled: true

- name: "Adzuna — Enablement"
  provider: adzuna
  search_term: "enablement"
  enabled: true

- name: "Authentic Jobs — Marketing"
  provider: authenticjobs
  search_term: "marketing"
  enabled: true

- name: "Authentic Jobs — Enablement"
  provider: authenticjobs
  search_term: "enablement"
  enabled: true

- name: "USAJobs — Marketing"
  provider: usajobs
  search_term: "marketing"
  enabled: true

- name: "USAJobs — Enablement"
  provider: usajobs
  search_term: "enablement"
  enabled: true
```

- [ ] **Step 2: Verify the file still parses and the count is right**

```bash
node -e "
import('js-yaml').then(({ load }) => {
  import('node:fs').then(({ readFileSync }) => {
    const config = load(readFileSync('portals.yml', 'utf8'));
    const newProviderEntries = config.tracked_companies.filter(c => c.provider && [
      'remoteok','remotive','himalayas','jobicy','themuse','workingnomads','nodesk',
      'fourdayweek','hackernews','powertofly','weworkremotely','realworkfromanywhere',
      'crunchboard','jobspresso','adzuna','authenticjobs','usajobs',
    ].includes(c.provider));
    console.log('new provider-keyed entries:', newProviderEntries.length);
  });
});
"
```
Expected: `new provider-keyed entries: 34`

- [ ] **Step 3: Run the pipeline health check**

```bash
node verify-pipeline.mjs
```
Expected: exits cleanly — no structural errors.

- [ ] **Step 4: Commit**

```bash
git add portals.yml
git commit -m "feat: wire 17 new job-board providers into portals.yml (34 search entries)"
```

### Task 5.2: Full end-to-end smoke test of the new providers

**Files:**
- Modify: none (verification only)

Run a real (but bounded) scan limited to the new entries to confirm the whole chain — `portals.yml` → `resolveProvider` → provider `fetch` → normalized `Job[]` → `data/pipeline.md` — works end to end.

- [ ] **Step 1: Dry-run each new board individually**

```bash
for board in "RemoteOK — Marketing" "Remotive — Marketing" "Himalayas — Marketing" "Jobicy — Marketing" "The Muse — Marketing" "Working Nomads — Marketing" "NoDesk — Marketing" "4 Day Week — Marketing" "Hacker News Who's Hiring — Marketing" "PowerToFly — Marketing" "We Work Remotely — Marketing" "Real Work From Anywhere — Marketing" "Crunchboard — Marketing" "Jobspresso — Marketing" "Adzuna — Marketing" "Authentic Jobs — Marketing" "USAJobs — Marketing"; do
  echo "=== $board ==="
  node scan.mjs --company "$board" --no-verify --dry-run
done
```
Expected: each board resolves to its provider (no `unknown provider` errors), fetches without throwing, and reports a job count (some counts may legitimately be 0 for niche/sparse boards like Hacker News — that's an expected, documented outcome, not a failure).

- [ ] **Step 2: Confirm no resolution errors across the full new set**

```bash
node scan.mjs --no-verify --dry-run 2>&1 | grep -i "unknown provider" || echo "No unknown-provider errors — all 17 providers resolved correctly"
```
Expected: `No unknown-provider errors — all 17 providers resolved correctly`

- [ ] **Step 3: Record the final state in `docs/log.md`-equivalent — career-ops uses session memory, so just summarize for the user**

No file changes — report a one-line summary to Morgan: how many of the 17 boards returned jobs on first scan, and flag any that returned 0 (e.g., "Hacker News returned 0 marketing-relevant postings this run — expected, the board skews engineering").

- [ ] **Step 4: Final commit (only if Step 1-2 surfaced any fixes)**

```bash
git add -A
git status
# If there are uncommitted fixes from smoke-testing, commit them:
git commit -m "fix: address smoke-test findings for new job-board providers"
```

---

## Summary of what gets built

| # | Provider file | Board | Auth required |
|---|---|---|---|
| 1 | `providers/remoteok.mjs` | RemoteOK | none |
| 2 | `providers/remotive.mjs` | Remotive | none |
| 3 | `providers/himalayas.mjs` | Himalayas | none |
| 4 | `providers/jobicy.mjs` | Jobicy | none |
| 5 | `providers/themuse.mjs` | The Muse | none |
| 6 | `providers/workingnomads.mjs` | Working Nomads | none |
| 7 | `providers/nodesk.mjs` | NoDesk | none |
| 8 | `providers/fourdayweek.mjs` | 4 Day Week | none |
| 9 | `providers/hackernews.mjs` | Hacker News Who's Hiring | none |
| 10 | `providers/powertofly.mjs` | PowerToFly | none |
| 11 | `providers/weworkremotely.mjs` | We Work Remotely | none |
| 12 | `providers/realworkfromanywhere.mjs` | Real Work From Anywhere | none |
| 13 | `providers/crunchboard.mjs` | Crunchboard | none |
| 14 | `providers/jobspresso.mjs` | Jobspresso | none |
| 15 | `providers/adzuna.mjs` | Adzuna | `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` |
| 16 | `providers/authenticjobs.mjs` | Authentic Jobs | `AUTHENTICJOBS_API_KEY` |
| 17 | `providers/usajobs.mjs` | USAJobs | `USAJOBS_API_KEY`, `USAJOBS_EMAIL` |

Plus: `providers/_rss.mjs` (shared helper), `import-everjobs-companies.mjs` (one-time migration script), and ~537 net-new Greenhouse companies appended to `tracked_companies`.

**Built In** is documented as a future candidate (not built) due to discovered GraphQL/HTML-scraping complexity that matches the spec's Tier 3 exclusion criteria.
