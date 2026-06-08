# Tasks: 296 — Eightfold AI ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-eightfold/{package.json,tsconfig.json,src/index.ts,src/eightfold.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/eightfold.types.ts`, `src/eightfold.constants.ts`
  - **Acceptance:** camelCase + snake_case fields modelled; endpoint/page-size/headers/pacing constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `EightfoldService` implementing `IScraper`
  - **Files:** `src/eightfold.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; bounded `Promise.allSettled` page fan-out (NFR-1/2); `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EIGHTFOLD` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/eightfold.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Docs: ATS_INTEGRATIONS, index, log, questions
  - **Files:** `docs/ATS_INTEGRATIONS.md`, `docs/index.md`, `docs/log.md`, `docs/questions.md`
  - **Acceptance:** Eightfold listed; Q-061 (WAF fallback) recorded; log entry for run #400.
  - **Estimate:** 0.25 day

## Notes

- Tests written alongside the implementation, not batched.
- WAF-gated tenants and per-position description enrichment are explicit
  non-goals this iteration (Q-EF-1 / Q-061).
