# Tasks: 297 — Cornerstone OnDemand (CSOD) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-cornerstone/{package.json,tsconfig.json,src/index.ts,src/cornerstone.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/cornerstone.types.ts`, `src/cornerstone.constants.ts`
  - **Acceptance:** requisition/location/bootstrap shapes modelled with `??` fallbacks; host/path/page-size/headers/pacing/token+host regexes defined.
  - **Estimate:** 0.25 day

- [x] T03 — `CornerstoneService` implementing `IScraper`
  - **Files:** `src/cornerstone.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; two-step bootstrap + bounded `Promise.allSettled` page fan-out (NFR-1/2); `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CORNERSTONE = 'cornerstone'` exists; module in `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Note:** Performed centrally by the orchestrator (not edited in this run); package only references `Site.CORNERSTONE`.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/cornerstone.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty, unknown-tenant graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Docs: ATS_INTEGRATIONS, index, log, questions
  - **Files:** `docs/ATS_INTEGRATIONS.md`, `docs/index.md`, `docs/log.md`, `docs/questions.md`
  - **Acceptance:** Cornerstone listed; Q-CS-1 (WAF) / Q-CS-2 (multi-portal siteId) recorded; log entry for run #401.
  - **Note:** Doc index/log updates handled by the orchestrator run that registers the plugin.
  - **Estimate:** 0.25 day

## Notes

- Tests written alongside the implementation, not batched.
- WAF-gated tenants, OAuth Recruiting REST API, multi-portal siteId auto-discovery,
  and per-requisition enrichment are explicit non-goals this iteration
  (Q-CS-1 / Q-CS-2).
- Public flow verified live against the `ouc` tenant: career page embeds an
  anonymous `"token"` JWT plus `"endpoints":{"cloud":"https://us.api.csod.com"}`,
  and the JWT `rurls` claim whitelists `rec-job-search/external`.
