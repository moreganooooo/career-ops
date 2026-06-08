# Tasks: 329 — PCRecruiter ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 338 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-pcrecruiter/{package.json,tsconfig.json,src/index.ts,src/pcrecruiter.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/pcrecruiter.types.ts`, `src/pcrecruiter.constants.ts`
  - **Acceptance:** listing-row and schema.org JSON-LD `JobPosting` interfaces
    modelled with JSDoc (all fields optional); host, board path, page size,
    selectors, concurrency, defaults, and request headers defined with the
    verified wire surface documented (verification date 2026-06-03).
  - **Estimate:** 0.25 day

- [x] T03 — `PCRecruiterService` implementing `IScraper`
  - **Files:** `src/pcrecruiter.service.ts`
  - **Acceptance:** FR-1…FR-11 satisfied; public `jobboard.aspx` listing parsed
    via cheerio; detail JSON-LD extracted with `#jobdesc` HTML fallback; bounded
    `Promise.allSettled` fan-out; best-effort pagination POST; HTTP 4xx/410 →
    empty; de-dup by recordid; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 338 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PCRECRUITER` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 338 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/pcrecruiter.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded by `length > 0`,
    asserting `site === Site.PCRECRUITER` and `atsType === 'pcrecruiter'`),
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/329-source-ats-pcrecruiter/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public board endpoint, JSON-LD wire shape, tenant resolution,
    pagination approach, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03:
  `GET https://www2.pcrecruiter.net/pcrbin/jobboard.aspx?uid=alliance staffing.alliancestaffing`
  returns HTTP 200, header "1-24 of 38", 24 `<table id="joblist">` job rows;
  the detail page (recordid 203988647552144) returns a schema.org `JobPosting`
  JSON-LD with full HTML description, employer "Apollo Technical", and structured
  location — no authentication required.
- Confidence: **verified** for the URL pattern, listing structure, and JSON-LD
  field extraction (byte-confirmed live). Pagination is **best-effort** (depends
  on a server-issued cursor; page-1 results always retained).
- No public JSON API exists; HTML is scraped with cheerio. Detail fetches use a
  bounded `Promise.allSettled` fan-out. De-dup by `recordid`; result-set sliced
  client-side to `resultsWanted`.
