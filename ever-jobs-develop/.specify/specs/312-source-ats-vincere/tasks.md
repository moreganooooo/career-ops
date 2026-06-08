# Tasks: 312 — Vincere ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 321 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-vincere/{package.json,tsconfig.json,src/index.ts,src/vincere.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/vincere.types.ts`, `src/vincere.constants.ts`
  - **Acceptance:** `VincereJob`, `VincereLocation`, `VincereSearchResponse` interfaces
    model the verified AJAX response; host template, AJAX path, page-size, concurrency,
    request-delay, default-results, and header constants defined with JSDoc.
  - **Estimate:** 0.25 day

- [x] T03 — `VincereService` implementing `IScraper`
  - **Files:** `src/vincere.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; CSRF bootstrap from GET `/careers/`;
    bounded paginated fan-out via POST AJAX; HTTP 4xx → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 322 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.VINCERE` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 323 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/vincere.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty,
    unknown-board graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/312-source-ats-vincere/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** verified wire surface, CSRF bootstrap, pagination, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03 against `nordicjobsworldwide.vincere.io`:
  - `GET /careers/` → HTTP 200, 193 jobs, CSRF token in meta tag.
  - `POST /careers/ajax/search-jobs?page=1` → HTTP 200, JSON
    `{ items: [...10 VincereJob], total: 193, more: true }`.
- The private `/api/v2/job/search/` route (requires OAuth2 credentials) and
  WAF-gated boards are explicit non-goals this iteration.
- The AJAX endpoint paginates via `page` (10 items per page) and reports the
  tenant total as `total`; remaining pages are fanned out with a bounded
  `Promise.allSettled`, de-duped by job id, and sliced client-side to `resultsWanted`.
- The CSRF token is obtained anonymously from the public careers listing page GET.
