# Tasks: 301 — Niceboard ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-niceboard/{package.json,tsconfig.json,src/index.ts,src/niceboard.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/niceboard.types.ts`, `src/niceboard.constants.ts`
  - **Acceptance:** snake_case + camelCase fallback fields modelled; host template/path/base-params/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `NiceboardService` implementing `IScraper`
  - **Files:** `src/niceboard.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public `/api/jobs` feed with full base params; bounded paginated fan-out; HTTP 400/404 → empty; `tsc --noEmit` clean (apart from the not-yet-registered `Site.NICEBOARD` member).
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.NICEBOARD` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/niceboard.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-board graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/301-source-ats-niceboard/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, board resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /api/jobs` on the board sub-domain
  with the full base-filter param set (array filters JSON-encoded).
- The private `/api/v1/jobs?key=…` route (HTTP 401 `invalid_key`) and WAF-gated
  boards (Q-NB-1) are explicit non-goals this iteration.
- The feed paginates via `limit` + `page` and reports the tenant total as
  `count`; remaining pages are fanned out with a bounded `Promise.allSettled`,
  de-duped by job id, and sliced client-side to `resultsWanted`.
