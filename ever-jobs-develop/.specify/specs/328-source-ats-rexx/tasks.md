# Tasks: 328 — rexx systems ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 337 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-rexx/{package.json,tsconfig.json,src/index.ts,src/rexx.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/rexx.types.ts`, `src/rexx.constants.ts`
  - **Acceptance:** listing-row + schema.org `JobPosting` JSON-LD interfaces
    modelled with JSDoc; host template, listing path, job-id regex, card
    selectors, concurrency/defaults, and request headers defined; verified wire
    surface and verification date (2026-06-03) documented in the doc-comment.
  - **Estimate:** 0.25 day

- [x] T03 — `RexxService` implementing `IScraper`
  - **Files:** `src/rexx.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; public `/stellenangebote.html` listing
    parsed via cheerio; detail JSON-LD extracted with bounded `Promise.allSettled`
    fan-out; HTTP 4xx → empty; de-dup by job id; never throws; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 337 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.REXX = 'rexx'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 337 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/rexx.e2e-spec.ts`
  - **Acceptance:** known-tenant (`companySlug: 'icotek'`) shape assertions
    (guarded); no-slug/url empty; unknown-tenant graceful; `resultsWanted`
    honoured; asserts `job.site === Site.REXX` and `job.atsType === 'rexx'`;
    nullable fields guarded.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/328-source-ats-rexx/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public listing + JSON-LD detail surface, verified wire shape,
    tenant resolution, and non-goals documented; live-verification confidence
    recorded; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03: `GET /stellenangebote.html` on
  `icotek-portal.rexx-systems.com` (data-count=13) and
  `nobix-portal.rexx-systems.com` (data-count=12); detail pages embed a complete
  schema.org `JobPosting` JSON-LD. No authentication required. **Confidence:
  verified** — an end-to-end live scrape returned correctly shaped jobs.
- No anonymous XML/RSS feed exists (`?xml=1` / `/stellenangebote.xml` /
  `/export/index.php?xml=1` all 404 or HTML), so HTML scraping with cheerio plus
  JSON-LD extraction is the chosen approach.
- Detail JSON-LD is the primary field source; listing card supplies id/title/
  location fallbacks. De-dup by numeric job id; result-set sliced client-side to
  `resultsWanted`. Detail fan-out uses bounded `Promise.allSettled`.
