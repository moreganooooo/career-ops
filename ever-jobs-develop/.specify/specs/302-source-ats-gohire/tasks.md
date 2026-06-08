# Tasks: 302 — GoHire ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-gohire/{package.json,tsconfig.json,src/index.ts,src/gohire.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/gohire.types.ts`, `src/gohire.constants.ts`
  - **Acceptance:** list + detail feed shapes modelled (camelCase, defensive aliases); hosts/paths/concurrency/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `GoHireService` implementing `IScraper`
  - **Files:** `src/gohire.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; public `widget-jobs` list feed + bounded `widget-job` detail fan-out; unknown tenant → empty; `tsc --noEmit` clean (apart from the centrally-registered `Site.GOHIRE` member).
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.GOHIRE` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/gohire.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/302-source-ats-gohire/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoints, wire shapes, host resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoints verified live 2026-06-03: list `GET https://api2.gohire.io/widget-jobs/{clientHash}`
  and detail `GET https://api.gohire.io/widget-job?clientHash={hash}&jobId={id}`.
- WAF-gated surfaces (Q-GH-1) and a curated tenant seed list are explicit
  non-goals this iteration.
- The list feed returns the full open-roles array in one response (no pagination
  envelope); detail hydration is fanned out with a bounded `Promise.allSettled`
  (max 8); results are sliced client-side to `resultsWanted`.
