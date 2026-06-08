# Tasks: 318 — Oorwin ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 327 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-oorwin/{package.json,tsconfig.json,src/index.ts,src/oorwin.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/oorwin.types.ts`, `src/oorwin.constants.ts`
  - **Acceptance:** listing row (`OorwinJobListItem`), detail (`OorwinJobDetail`), and
    response wrappers typed; API base URL, paths, page size, defaults, and headers defined.
  - **Estimate:** 0.25 day

- [x] T03 — `OorwinService` implementing `IScraper`
  - **Files:** `src/oorwin.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; paginated listing fan-out; per-job detail
    fetch with `Promise.allSettled`; status 404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 327 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.OORWIN` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 327 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/oorwin.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty,
    unknown-tenant graceful, resultsWanted honoured. Timeout: 60 s.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/318-source-ats-oorwin/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, tenant resolution, and
    non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Both `POST /api/v2/careers/getJobList` and `POST /api/v2/careers/job_view`
  verified live 2026-06-03: `purpledrive` tenant, 2 804 total jobs, full HTML
  description returned — no auth required.
- Listing rows do not embed descriptions; a per-job `job_view` POST is needed
  (fetched concurrently, individual failures tolerated).
- `sub_domain` is derived from `window.location.host.split('.')[0]` in the SPA —
  the first sub-domain label of the tenant URL.
- The private Oorwin API (OAuth/token-based) is an explicit non-goal.
- Remote detection: `remote_status === "Remote"` → `isRemote: true`.
- `job_type` (employment type) is mapped to `department` (no separate department
  field on the listing endpoint).
