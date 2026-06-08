# Tasks: 313 — Factorial ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-factorial/{package.json,tsconfig.json,src/index.ts,src/factorial.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/factorial.types.ts`, `src/factorial.constants.ts`
  - **Acceptance:** `FactorialIndexJob` and `FactorialDetailJob` interfaces model the HTML-parsed data; host template / paths / headers / defaults defined with thorough JSDoc.
  - **Estimate:** 0.25 day

- [x] T03 — `FactorialService` implementing `IScraper`
  - **Files:** `src/factorial.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; public HTML surfaces used; bounded concurrent detail fan-out; HTTP 400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.75 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.FACTORIAL` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Note:** `Site.FACTORIAL = 'factorial'` was pre-added by the orchestrator at line 783 of `site.enum.ts` before this run.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/factorial.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/313-source-ats-factorial/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen HTML surfaces, wire shape, tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- No anonymous JSON API exists for Factorial tenant career pages; HTML
  parsing is the only public approach.
- Three HTML surfaces used: index page (job listing), sitemap (dates),
  detail page (description + apply URL).
- Verified live 2026-06-03: `jobs-tendencys.factorialhr.com` (22 jobs,
  HTTP 200, fully parsed).
- The authenticated `api.factorialhr.com/api/v1/ats/…` REST API (OAuth2
  required) is an explicit non-goal.
- Detail fetches are an N+1 pattern but bounded by `FACTORIAL_MAX_CONCURRENCY=6`
  with `Promise.allSettled`; a single page failure does not abort the run.
