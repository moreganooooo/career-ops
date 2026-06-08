# Tasks: 305 — VivaHR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-vivahr/{package.json,tsconfig.json,src/index.ts,src/vivahr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — JSON-LD types + constants
  - **Files:** `src/vivahr.types.ts`, `src/vivahr.constants.ts`
  - **Acceptance:** schema.org `JobPosting` fields modelled (title, description, datePosted, employmentType, identifier, hiringOrganization, baseSalary, jobLocation, jobLocationType); host/path-template/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `VivaHRService` implementing `IScraper`
  - **Files:** `src/vivahr.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; listing-page URL enumeration + per-role JSON-LD parse; bounded `Promise.allSettled` fan-out; HTTP 400/404 → empty; `tsc --noEmit` clean (apart from the centrally-registered `Site.VIVAHR` member).
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.VIVAHR` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/vivahr.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/305-source-ats-vivahr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public surface, JSON-LD wire shape, tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03: listing `GET /{tenant}/jobs` (HTML) + per-role
  `JobPosting` JSON-LD on each detail page (`jobs.avahr.com`, tenant `236-avahr`).
- No anonymous JSON API exists (developer API needs a key) → public HTML + JSON-LD
  scrape. WAF-gated tenants (Q-VH-1) and listing pagination (Q-VH-2) are explicit
  non-goals/deferred this iteration.
- Per-role detail fetches fan out with a bounded concurrency via
  `Promise.allSettled`; per-detail failures are skipped, results sliced
  client-side to `resultsWanted`.
