# Tasks: 310 — CATS ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package (Phase 319)

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-catsone/{package.json,tsconfig.json,src/index.ts,src/catsone.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/catsone.types.ts`, `src/catsone.constants.ts`
  - **Acceptance:** HTML-parsed types modelled (stub, detail, tenant context); host template, path regexes, page-size, defaults, headers constants defined with full JSDoc documenting the live wire surface.
  - **Estimate:** 0.25 day

- [x] T03 — `CatsoneService` implementing `IScraper`
  - **Files:** `src/catsone.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; public HTML-scrape with cheerio; portal discovery from root; bounded paginated listing; bounded description fan-out via `Promise.allSettled`; HTTP 400/404 → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.75 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CATSONE` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/catsone.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/310-source-ats-catsone/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, HTML structure, portal resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- CATS portals are server-rendered HTML; no anonymous public JSON feed exists. The authenticated v3 API requires a per-tenant token and is not used.
- Endpoint verified live 2026-06-03: `.cats-job` CSS classes on portal listing pages; pagination via `?page=N`.
- The WAF-gated portals (Q-310-1) and fully custom-domain tenants (Q-310-2) are explicit non-goals this iteration.
- Description fetch fan-out uses `Promise.allSettled` at bounded concurrency; a failed detail request still yields the job stub.
