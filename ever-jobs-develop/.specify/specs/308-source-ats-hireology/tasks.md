# Tasks: 308 — Hireology ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hireology/{package.json,tsconfig.json,src/index.ts,src/hireology.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hireology.types.ts`, `src/hireology.constants.ts`
  - **Acceptance:** snake_case + camelCase fallback fields modelled; hosts/paths/token-regex/page-size/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `HireologyService` implementing `IScraper`
  - **Files:** `src/hireology.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public token scraped from careers shell; paginated feed via `Authorization: Bearer`; HTTP 404 / no token → empty; `tsc --noEmit` clean (apart from the centrally-registered `Site.HIREOLOGY` member).
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HIREOLOGY` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hireology.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/308-source-ats-hireology/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, public-token bootstrap, wire shape, slug resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: careers shell `GET /{slug}` yields the
  anonymous public `apiToken`; `GET /v2/public/careers/{slug}` (Bearer) returns
  the paginated `{ data, count, page, page_size }` envelope.
- WAF-gated tenants (Q-HR-1) and cross-run token caching (Q-HR-2) are explicit
  non-goals this iteration.
- The feed is paginated; the first page yields the true `count`, so remaining
  pages are fanned out with bounded concurrency and merged via
  `Promise.allSettled`; results are sliced client-side to `resultsWanted`.
