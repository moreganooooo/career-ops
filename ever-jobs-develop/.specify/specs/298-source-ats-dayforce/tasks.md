# Tasks: 298 — Dayforce HCM ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-dayforce/{package.json,tsconfig.json,src/index.ts,src/dayforce.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/dayforce.types.ts`, `src/dayforce.constants.ts`
  - **Acceptance:** camelCase (geo) + PascalCase (RESTful) fields modelled; endpoint/page-size/headers/pacing constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `DayforceService` implementing `IScraper`
  - **Files:** `src/dayforce.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; bounded `Promise.allSettled` page fan-out (NFR-1/2); `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (done centrally by the orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.DAYFORCE` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/dayforce.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec docs (spec/plan/tasks)
  - **Files:** `.specify/specs/298-source-ats-dayforce/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, host resolution, and non-goals documented; WAF fallback recorded (Q-DF-1).
  - **Estimate:** 0.25 day

## Notes

- Tests written alongside the implementation, not batched.
- WAF-gated tenants and per-posting description enrichment are explicit
  non-goals this iteration (Q-DF-1 / Q-DF-2).
- Outbound network is blocked inside the build sandbox; the geo search endpoint
  and wire shape were verified from the Dayforce RESTful Web Services Developer
  Guide and public scraper-service documentation rather than a live probe.
