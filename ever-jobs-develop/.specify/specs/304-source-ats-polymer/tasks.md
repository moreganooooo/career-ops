# Tasks: 304 — Polymer ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-polymer/{package.json,tsconfig.json,src/index.ts,src/polymer.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/polymer.types.ts`, `src/polymer.constants.ts`
  - **Acceptance:** snake_case + camelCase fallback fields modelled; list + detail shapes captured; host/paths/page-size/concurrency/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `PolymerService` implementing `IScraper`
  - **Files:** `src/polymer.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; public list feed paginated via `meta.is_last`; description/department hydrated from detail endpoint with bounded fan-out; HTTP 400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.POLYMER` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/polymer.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/304-source-ats-polymer/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoints, wire shape, host resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoints verified live 2026-06-03: list `GET /v1/hire/organizations/{slug}/jobs`
  and detail `GET .../jobs/{id}` (tenants `teton`, `return`).
- WAF-gated tenants (Q-PM-1) and a list-only fast path that skips description
  hydration (Q-PM-2) are explicit non-goals this iteration.
- The list feed paginates (`per_page` default 50); pages are walked via
  `meta.is_last` and the result-set is sliced client-side to `resultsWanted`.
- Descriptions live only on the per-job detail endpoint and are hydrated with a
  bounded `Promise.allSettled` fan-out; a failed detail keeps the role with a
  null description.
