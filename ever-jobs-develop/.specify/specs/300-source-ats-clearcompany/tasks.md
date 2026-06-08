# Tasks: 300 — ClearCompany ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-clearcompany/{package.json,tsconfig.json,src/index.ts,src/clearcompany.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/clearcompany.types.ts`, `src/clearcompany.constants.ts`
  - **Acceptance:** PascalCase + lower-case fallback fields modelled; host/path/header/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `ClearCompanyService` implementing `IScraper`
  - **Files:** `src/clearcompany.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public feed via `API-ShortName` header; HTTP 400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CLEARCOMPANY` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/clearcompany.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/300-source-ats-clearcompany/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, host resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /api/v1/careers/jobs` + `API-ShortName: {slug}`.
- WAF-gated tenants (Q-CC-1) and structured-office location lookup (Q-CC-2) are
  explicit non-goals this iteration.
- The feed returns the full open-roles array in one response (no pagination
  envelope), so no concurrent page fan-out is required; results are sliced
  client-side to `resultsWanted`.
