# Tasks: 311 — Recruit CRM ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-recruitcrm/{package.json,tsconfig.json,src/index.ts,src/recruitcrm.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/recruitcrm.types.ts`, `src/recruitcrm.constants.ts`
  - **Acceptance:** snake_case wire-shape fields modelled; Albatross endpoint
    URL, CORS origin, headers, paging defaults, and result cap constants defined
    with thorough JSDoc documenting the live-verified wire surface.
  - **Estimate:** 0.25 day

- [x] T03 — `RecruitCrmService` implementing `IScraper`
  - **Files:** `src/recruitcrm.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public Albatross feed called with
    `Origin: https://recruitcrm.io`; bounded paginated fan-out; `status: "fail"`
    / HTTP 4xx → empty; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RECRUITCRM` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/recruitcrm.e2e-spec.ts`
  - **Acceptance:** known-tenant (`Terra_Careers`) shape assertions (guarded),
    no-slug empty, unknown-account graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/311-source-ats-recruitcrm/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** chosen public endpoint, wire shape, account resolution, and
    non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint live-verified 2026-06-03: `POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get?account=Terra_Careers&batch=true` → HTTP 200, 14 jobs.
- Endpoint extracted from the jobs-page SPA bundle at
  `recruitcrm.io/_next/static/chunks/app/jobs/[account_job_page_name]/page-3fb6d24bbcc5e9e5.js`.
- CORS: `Access-Control-Allow-Origin: https://recruitcrm.io`; we always set
  `Origin: https://recruitcrm.io`.
- No `total_count` in the response: pagination exhaustion detected by
  `returned.length < limit`.
- The credentialed `GET /v1/jobs` API (Bearer token) and custom-domain tenants
  are explicit non-goals this iteration.
- `datePosted` and `department` are always `null` (no matching feed field).
