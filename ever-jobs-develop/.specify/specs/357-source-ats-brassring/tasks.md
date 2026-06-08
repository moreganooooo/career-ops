# Tasks: 357 — BrassRing ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 366 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-brassring/{package.json,tsconfig.json,src/index.ts,src/brassring.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/brassring.types.ts`, `src/brassring.constants.ts`
  - **Acceptance:** MatchedJobs envelope + JSON-LD interfaces modelled with JSDoc
    (defensive field aliases); shared host, AJAX/detail/home paths, JSON-LD / remote
    / html-tag regexes, page size, max pages, default results, and request headers
    defined; researched public surface documented with date 2026-06-03 and named real
    tenants (AAFES `25212`/`5164`, Peace Corps `25332`/`5414`, U.S. Steel, FCPS, ADM).
  - **Estimate:** 0.25 day

- [x] T03 — `BrassRingService` implementing `IScraper`
  - **Files:** `src/brassring.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant pair resolved from slug/url; AJAX
    `MatchedJobs` paged + parsed defensively; requisition (`Areq`/`Autoreqid`) → `atsId`
    (else numeric job id); detail page best-effort enriched from `JobPosting` JSON-LD
    (recursive over arrays / `@graph`); HTTP 4xx → empty/skip; de-dup by `atsId`;
    description format-converted; department / employmentType / location / remote
    derived; bounded by `MAX_PAGES` + sliced to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 366 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BRASSRING` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 366 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/brassring.e2e-spec.ts`
  - **Acceptance:** known-tenant (`companySlug: '25212:5164'`, AAFES) shape assertions
    (guarded; asserts `site === Site.BRASSRING`, `atsType === 'brassring'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/357-source-ats-brassring/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public AJAX listing + JSON-LD detail-page surface, wire shape,
    tenant (`partnerid`/`siteid`) resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Shared host `sjobs.brassring.com` + `partnerid`/`siteid` addressing model
    confirmed, with named real tenants: AAFES (`25212`/`5164`), Peace Corps
    (`25332`/`5414`), U.S. Steel (`25307`/`5238`), Fairfax County Public Schools
    (`25103`/`5041`), Archer Daniels Midland (`25416`/`5998`).
  - AJAX listing endpoint `POST /TgNewUI/Search/Ajax/MatchedJobs` confirmed; its JSON
    envelope carries a `Jobs` array + `JobsCount` (plus `Facets`, `SortFields`). The
    `ProcessSortAndShowMoreJobs` variant pages the same envelope. Detail-page URL
    `PageType=JobDetails&…&Areq={req}` confirmed.
  - Confidence: **unverified** — the portal is a JS-rendered SPA, so an unauthenticated
    no-JS fetch returns only the app shell; the exact per-role field names inside the
    `Jobs[]` array could not be confirmed. The parser is written defensively around the
    documented envelope, tolerating common BrassRing/Kenexa field-name spellings.
- A BrassRing tenant is addressed by a `partnerid` + `siteid` pair on the shared host
  (not a sub-domain or slug). The AJAX `MatchedJobs` envelope + per-role JSON-LD detail
  pages are the documented, no-auth surface and are used here; the enumerated set is
  bounded by `MAX_PAGES`/`JobsCount` and sliced client-side to `resultsWanted`
  (default 100), de-duped by `atsId`.
