# Tasks: 303 — Recooty ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-recooty/{package.json,tsconfig.json,src/index.ts,src/recooty.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/recooty.types.ts`, `src/recooty.constants.ts`
  - **Acceptance:** snake_case + camel/Pascal fallback fields modelled; host/path/language/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `RecootyService` implementing `IScraper`
  - **Files:** `src/recooty.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public widget feed via `/api/widget/{widgetId}`; HTTP 422/400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RECOOTY` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/recooty.e2e-spec.ts`
  - **Acceptance:** known-widget shape assertions (guarded), no-slug empty, unknown-widget graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/303-source-ats-recooty/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /api/widget/{widgetId}?language=en`
  returns the tenant's `team.jobPosts` envelope; unknown id → HTTP 422
  `{"error":true,"message":"Invalid API Key."}`.
- WAF-gated tenants (Q-RC-1) and structured-location geocoding (Q-RC-2) are
  explicit non-goals this iteration.
- The feed returns the full open-roles array in one response (no pagination
  envelope), so no concurrent page fan-out is required; results are sliced
  client-side to `resultsWanted`.
