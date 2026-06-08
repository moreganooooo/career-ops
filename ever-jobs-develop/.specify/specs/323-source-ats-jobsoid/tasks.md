# Tasks: 323 — Jobsoid ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 332 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-jobsoid/{package.json,tsconfig.json,src/index.ts,src/jobsoid.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/jobsoid.types.ts`, `src/jobsoid.constants.ts`
  - **Acceptance:** JSON job field interfaces modelled with JSDoc (all
    optional/nullable); host template, feed path, hosted/apply URL templates,
    default results, and request headers defined.
  - **Estimate:** 0.25 day

- [x] T03 — `JobsoidService` implementing `IScraper`
  - **Files:** `src/jobsoid.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public `/api/v1/jobs` JSON feed parsed;
    inline HTML description format-converted; HTTP 4xx → empty; de-dup by `id`;
    slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 332 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.JOBSOID` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 332 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/jobsoid.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured; asserts
    `site === Site.JOBSOID` and `atsType === 'jobsoid'`.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/323-source-ats-jobsoid/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON feed endpoint, wire shape, tenant resolution, and
    non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET https://simpler.jobsoid.com/api/v1/jobs`
  returns HTTP 200, a flat JSON array of 3 full job objects with inline HTML
  `description`, no authentication required. `GET /api/v1/jobs/{id}` returns the
  same single-object shape (unused).
- Unknown tenants return `[]` (HTTP 200); the feed ignores `offset`/`limit`
  params. De-dup by numeric `id`; result-set sliced client-side to
  `resultsWanted`. Confidence: **verified** (byte-confirmed field names live).
