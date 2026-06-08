# Tasks: 314 — Workstream ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 323 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-workstream/{package.json,tsconfig.json,src/index.ts,src/workstream.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/workstream.types.ts`, `src/workstream.constants.ts`
  - **Acceptance:** `WorkstreamListJob` and `WorkstreamDetailJob` interfaces modelled;
    host, path templates, regex, concurrency, defaults, and headers constants defined
    with JSDoc documenting the public HTML surface.
  - **Estimate:** 0.25 day

- [x] T03 — `WorkstreamService` implementing `IScraper`
  - **Files:** `src/workstream.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; positions listing + detail fan-out with
    bounded `Promise.allSettled`; HTTP 404/410 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 323 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.WORKSTREAM` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present. (`Site.WORKSTREAM` was already present before this run.)
  - **Estimate:** 0.25 day

## Phase 323 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/workstream.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty,
    unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/314-source-ats-workstream/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public HTML surface, URL anatomy, tenant resolution, and
    non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- No public anonymous JSON API found on 2026-06-03. The Workstream REST API
  (`public-api.workstream.us`) requires OAuth2 bearer tokens and is not used.
- The HTML surface at `www.workstream.us/j/{accountId}/{brandSlug}/positions`
  was confirmed live for tenants `36047dd7/jamba`, `f030c4f0/ymca`, `221e9529/ihop`,
  `3547b62e/wendys` on 2026-06-03.
- The `companySlug` input format is `{accountId}/{brandSlug}` (e.g. `36047dd7/jamba`).
- `datePosted` is not available in the public HTML surface (Q-WS-2; left null).
- UUID discovery for new tenants is out of scope (Q-WS-1).
