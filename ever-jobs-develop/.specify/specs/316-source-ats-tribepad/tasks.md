# Tasks: 316 — Tribepad ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-tribepad/{package.json,tsconfig.json,src/index.ts,src/tribepad.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/tribepad.types.ts`, `src/tribepad.constants.ts`
  - **Acceptance:** HTML selector constants defined; TribepadListingItem /
    TribepadJobDetail / TribepadJob interfaces cover all parsed fields; host
    templates, path templates, paging defaults, and headers defined.
  - **Estimate:** 0.25 day

- [x] T03 — `TribepadService` implementing `IScraper`
  - **Files:** `src/tribepad.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; `cheerio`-based HTML parsing of
    `/v2/job/search` listing page + `/members/modules/job/detail.php?record=`
    detail page; bounded paginated fan-out; HTTP 400/403/404 → empty;
    `tsc --noEmit` clean.
  - **Estimate:** 0.75 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts` (TRIBEPAD already
    present), `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TRIBEPAD` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/tribepad.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty,
    unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/316-source-ats-tribepad/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** HTML wire surface, sitebuilder selectors, tenant host
    resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Tribepad exposes no public JSON API; the adapter uses `cheerio` HTML
  parsing against the sitebuilder search-results template.
- Endpoints verified live 2026-06-03: `getsetuk.tribepad-gro.com` (18 jobs,
  2 pages) and `ypocareers.tribepad-gro.com` (3 jobs, 1 page).
- The sitebuilder CSS selectors (`sitebuilder-job-results-item*`) and Font
  Awesome icon class pattern are consistent across all tested tenants.
- Detail page (`/members/modules/job/detail.php?record={id}`) carries the
  full HTML description in `section.job-details-section`; fetched
  concurrently with a graceful degradation on failure.
- `Site.TRIBEPAD = 'tribepad'` was pre-added by the orchestrator (Phase 325).
