# Tasks: 306 — Occupop ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-occupop/{package.json,tsconfig.json,src/index.ts,src/occupop.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/occupop.types.ts`, `src/occupop.constants.ts`
  - **Acceptance:** camelCase + snake_case fallback fields modelled; endpoint/query/host-template/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `OccupopService` implementing `IScraper`
  - **Files:** `src/occupop.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public GraphQL gateway via `LiveJobs` operation; `"Invalid company key!"` / HTTP 400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.OCCUPOP` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/occupop.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/306-source-ats-occupop/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, GraphQL query, wire shape, host resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `POST gateway.server.occupop.com/graphql`
  running the `LiveJobs` operation with `companyKey: {slug}`.
- WAF-gated tenants (Q-OP-1) and coarse city/country location (Q-OP-2) are
  explicit non-goals this iteration.
- The operation returns the full live-roles array in one response (no pagination
  envelope), so no concurrent page fan-out is required; results are sliced
  client-side to `resultsWanted`.
