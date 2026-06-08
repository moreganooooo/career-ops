# Tasks: 315 — Harri ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-harri/{package.json,tsconfig.json,src/index.ts,src/harri.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/harri.types.ts`, `src/harri.constants.ts`
  - **Acceptance:** `HarriListJob` and `HarriDetailJob` interfaces modelled; host/path/regex/defaults/headers constants defined; JSDoc documents the live HTML surface and verify date.
  - **Estimate:** 0.25 day

- [x] T03 — `HarriService` implementing `IScraper`
  - **Files:** `src/harri.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; two-phase HTML scrape; bounded `Promise.allSettled` detail fan-out; HTTP 404/410 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HARRI` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/harri.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-employer graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/315-source-ats-harri/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public HTML surface, URL patterns, two-phase scrape approach, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- HTML surface verified 2026-06-03: `harri.com/riverstation-careers` returns
  job links with pattern `/{slug}/job/{jobId}-{titleSlug}`.
- No public anonymous JSON API was found after thorough investigation; the
  authenticated API at `developer.harri.com` requires credentials.
- `datePosted` is always `null` — the public HTML surface does not expose
  publish dates.
- Apply URL constructed as `{jobUrl}/apply/{jobId}` per observed URL patterns.
- The two-phase HTML scrape mirrors `source-ats-workstream` (Spec 314).
