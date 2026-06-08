# Plan 316 — Tribepad ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 316 — source-ats-tribepad`.

## Approach

Mirror the existing ATS adapter pattern (structural pattern from
`source-ats-niceboard`; HTML parsing pattern from `source-ats-eploy`).
Build a self-contained plugin package using `cheerio` (already a root
workspace dependency) to parse Tribepad's server-rendered career-site HTML.
Register in the four canonical locations (handled centrally by the orchestrator).

## Architecture

```
packages/plugins/source-ats-tribepad/
  package.json                       # @ever-jobs/source-ats-tribepad
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    tribepad.module.ts               # Nest DI module
    tribepad.service.ts              # @SourcePlugin + IScraper.scrape
    tribepad.types.ts                # TribepadListingItem, TribepadJobDetail, TribepadJob
    tribepad.constants.ts            # host templates, paths, selectors, defaults, headers
  __tests__/
    tribepad.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` → `{slug}.tribepad-gro.com`; or
   `companyUrl` origin verbatim.
2. `fetchSearchPage(host, page)` → `GET /v2/job/search?page={n}&records_per_page={size}`
   → parse `.sitebuilder-job-results-item` cards → `{ items, total }`. HTTP
   400/403/404 (unknown tenant) → null (no throw).
3. First page seeds `total` (from `<h2>N Search Results</h2>`); remaining
   pages fanned out with a bounded `Promise.allSettled`.
4. For each listing item, `fetchDetailPage(host, recordId)` is called
   concurrently to retrieve the full HTML description and precise closing
   date. Detail failures degrade gracefully.
5. `mapToJobPost` → `JobPostDto`, de-duplicating by record id within the run.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Tribepad career sites are server-rendered PHP; no public JSON API exists.
- The sitebuilder template is consistent across tenants — the
  `.sitebuilder-job-results-item` CSS class and the Font Awesome icon
  pattern for meta chips are stable markers.
- `GET /v2/job/search?page=1&records_per_page=10` on
  `getsetuk.tribepad-gro.com`: HTTP 200, 18 total, 10 items on page 1.
- `GET /v2/job/search?page=1` on `ypocareers.tribepad-gro.com`: HTTP 200,
  3 total, 3 items on page 1.
- Detail page `GET /members/modules/job/detail.php?record=461`: HTTP 200,
  full HTML description in `section.job-details-section`.
- The `records_per_page` default in the sitebuilder template is 10; we
  send it explicitly to ensure predictable pagination.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TRIBEPAD = 'tribepad'` (already present).
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- First search-page fetch yields the total via `<h2>N Search Results</h2>`;
  remaining pages fanned out with a bounded `Promise.allSettled` so one
  transient page failure never nukes the batch.
- Detail fetches are also fanned out concurrently within each pagination
  chunk; individual detail failures degrade to a record without description
  (title, location, dates still present from listing page).
- HTTP 400/403/404 → null (page fetch) or null (detail fetch); other errors
  caught at `scrape()` level → partial result. A single tenant never aborts
  a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **No JSON API** → cheerio HTML parsing. CSS selectors are namespace-stable
  (`sitebuilder-job-results-item-*`); should survive cosmetic redesigns.
- **WAF 403 on some tenants** → out of scope (Q-TB-1); graceful empty result.
- **`records_per_page` enforcement** → send `10` explicitly; any lower
  tenant-enforced cap just adds pagination pages (total unchanged).
- **Enterprise / custom-domain tenants** → supported via `companyUrl` (Q-TB-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
