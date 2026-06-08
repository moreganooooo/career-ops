# Tasks: 317 — Eploy ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 326 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-eploy/{package.json,tsconfig.json,src/index.ts,src/eploy.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/eploy.types.ts`, `src/eploy.constants.ts`
  - **Acceptance:** `<Item>` field interfaces modelled with JSDoc; staging apex,
    datafeed path, format param, default results, and request headers defined.
  - **Estimate:** 0.25 day

- [x] T03 — `EployService` implementing `IScraper`
  - **Files:** `src/eploy.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public `/feeds/datafeed.ashx?Format=xml`
    feed parsed via cheerio xmlMode; HTTP 4xx → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 326 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EPLOY` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 326 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/eploy.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/317-source-ats-eploy/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public datafeed endpoint, wire shape, tenant resolution, and
    non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /feeds/datafeed.ashx?Format=xml` on
  the tenant domain (`jobs.islington.gov.uk`) returns HTTP 200, XML with
  `<Vacancies Count="30">` and 30 `<Item>` elements, no authentication required.
- The authenticated REST API (`POST /api/vacancies/search` with OAuth2/API-key)
  and WAF-gated career sites (Q-EP-1) are explicit non-goals.
- Feed delivers all roles in one document — no pagination needed. De-dup by
  `VacancyID`; result-set sliced client-side to `resultsWanted`.
