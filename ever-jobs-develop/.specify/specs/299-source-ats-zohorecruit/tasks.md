# Tasks: 299 — Zoho Recruit ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-zohorecruit/{package.json,tsconfig.json,src/index.ts,src/zohorecruit.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/zohorecruit.types.ts`, `src/zohorecruit.constants.ts`
  - **Acceptance:** `Job_Openings` fields modelled (all optional/nullable); host template, careers path, `jobs` input id, job-url template, headers defined.
  - **Estimate:** 0.25 day

- [x] T03 — `ZohoRecruitService` implementing `IScraper`
  - **Files:** `src/zohorecruit.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; `Promise.allSettled`-wrapped fetch (NFR-1); entity-decode + defensive `JSON.parse`; locked/unpublished skipped; de-dup by `atsId`; `tsc --noEmit --skipLibCheck` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (orchestrator-owned)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ZOHORECRUIT` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/zohorecruit.e2e-spec.ts`
  - **Acceptance:** known-tenant (`workbetternow`) shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Docs: ATS_INTEGRATIONS, index, log, questions
  - **Files:** `docs/ATS_INTEGRATIONS.md`, `docs/index.md`, `docs/log.md`, `docs/questions.md`
  - **Acceptance:** Zoho Recruit listed; Q-ZR-1 (WAF/lazy-load) recorded; log entry for run #299.
  - **Estimate:** 0.25 day

## Notes

- Tests written alongside the implementation, not batched.
- WAF-gated / lazy-load tenants, the OAuth REST API, per-job description
  enrichment, and non-US datacenter auto-discovery are explicit non-goals this
  iteration (Q-ZR-1 / Q-ZR-2).
- Endpoint verified live against `workbetternow.zohorecruit.com` and
  `bruntwork.zohorecruit.com`: the careers page embeds the open-roles array in a
  hidden `<input id="jobs">` (HTML-entity-encoded JSON), no auth required.
