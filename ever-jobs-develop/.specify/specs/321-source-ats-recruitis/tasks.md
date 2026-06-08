# Tasks: 321 — Recruitis ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 330 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-recruitis/{package.json,tsconfig.json,src/index.ts,src/recruitis.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/recruitis.types.ts`, `src/recruitis.constants.ts`
  - **Acceptance:** parsed-record interfaces modelled with JSDoc; careers apex,
    block/title/chip/description selectors, pagination markers, page param,
    default results, concurrency, and request headers defined; verified wire
    surface documented with the 2026-06-03 verification date.
  - **Estimate:** 0.25 day

- [x] T03 — `RecruitisService` implementing `IScraper`
  - **Files:** `src/recruitis.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; public `jobs.recruitis.io/{tenant}`
    HTML parsed via cheerio; per-detail fan-out via `Promise.allSettled`;
    de-dup by `atsId`; pagination via `?page=n`; HTTP 4xx → empty; never throws;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 330 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RECRUITIS` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 330 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/recruitis.e2e-spec.ts`
  - **Acceptance:** known-tenant (`recruitisio`) shape assertions (guarded),
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured;
    asserts `site === Site.RECRUITIS` and `atsType === 'recruitis'`; nullable
    fields guarded.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/321-source-ats-recruitis/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-site endpoint, verified wire shape, tenant
    resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET https://jobs.recruitis.io/{tenant}`
  returns HTTP 200 server-rendered HTML with `div.row.job` role blocks and
  full HTML descriptions in `#job-description`. No authentication required.
  Byte-confirmed against two tenants (`recruitisio`, `allwyn`); unknown tenant
  → HTTP 404 (graceful empty). **Confidence: verified.**
- The authenticated REST API (`app.recruitis.io/api2/jobs` with a per-company
  bearer token) and WAF-gated career sites (Q-RC-1) are explicit non-goals.
- `datePosted` is left null — the public HTML exposes no machine-readable
  publish date (Q-RC-2). De-dup by `atsId`; result-set sliced to `resultsWanted`.
