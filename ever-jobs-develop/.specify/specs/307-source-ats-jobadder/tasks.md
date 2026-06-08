# Tasks: 307 — JobAdder ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-jobadder/{package.json,tsconfig.json,src/index.ts,src/jobadder.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Parsed-record types + constants
  - **Files:** `src/jobadder.types.ts`, `src/jobadder.constants.ts`
  - **Acceptance:** listing/tenant record interfaces modelled from real markup; host/path-templates/fan-out/defaults/headers constants defined.
  - **Estimate:** 0.25 day

- [x] T03 — `JobAdderService` implementing `IScraper`
  - **Files:** `src/jobadder.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public Careerpage HTML parsed; bounded detail fan-out; HTTP 400/404 → empty; `tsc --noEmit` clean (apart from the centrally-registered `Site.JOBADDER` member).
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.JOBADDER` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/jobadder.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/307-source-ats-jobadder/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public Careerpage surface, markup shape, tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /{accountId}/{slug}` Careerpage HTML +
  `/{accountId}/{slug}/{jobId}/{titleSlug}` detail pages (tenant `84381/eq8-recruit`).
- The structured v2 jobs API requires OAuth2 and the widget endpoints are
  opaque-key HTML fragments; both are explicit non-goals — the hosted Careerpage
  is the only anonymous, slug-addressable surface.
- WAF-gated tenants (Q-JA-1), heuristic bullet classification (Q-JA-2), and
  multi-page pagination (Q-JA-3) are explicit non-goals / deferrals this iteration.
