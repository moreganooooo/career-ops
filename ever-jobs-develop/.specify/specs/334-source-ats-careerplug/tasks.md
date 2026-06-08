# Tasks: 334 — CareerPlug ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 343 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-careerplug/{package.json,tsconfig.json,src/index.ts,src/careerplug.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/careerplug.types.ts`, `src/careerplug.constants.ts`
  - **Acceptance:** `ItemList` + `JobPosting` JSON-LD interfaces modelled with
    JSDoc; host template, `/jobs` + `/account` paths, job-id / short-link
    regexes, CSS selectors, default results, and request headers defined; the
    verified wire surface documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `CareerPlugService` implementing `IScraper`
  - **Files:** `src/careerplug.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; `/jobs` fetched and the `ItemList`
    JSON-LD parsed via cheerio; postings paired with `/jobs/{id}` (or
    `/j/{shortcode}`) anchors; `/account` fallback for single-job tenants;
    redirect-to-sign-in / HTTP 4xx → empty; de-dup by `atsId`; `tsc --noEmit`
    clean apart from the orchestrator-wired `Site.CAREERPLUG`.
  - **Estimate:** 0.5 day

## Phase 343 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CAREERPLUG = 'careerplug'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 343 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/careerplug.e2e-spec.ts`
  - **Acceptance:** known-tenant (`cplugjobs`) shape assertions (guarded; asserts
    `site === Site.CAREERPLUG`, `atsType === 'careerplug'`, `atsId`/`jobUrl`
    defined), no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured; 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/334-source-ats-careerplug/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public careers-site surface, `ItemList` JSON-LD wire shape,
    tenant resolution, mapping table, graceful degradation, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against `https://cplugjobs.careerplug.com/`
  (CareerPlug's own careers site), no authentication required:
  - `GET /jobs` (single-job tenant) → 302 to `/jobs/{id}/apps/new`.
  - `GET /account` (careers landing page) → HTTP 200 with a `schema.org`
    `ItemList` of `JobPosting` objects carrying one real role
    (`Sales Account Executive`, `FULL_TIME`, `TELECOMMUTE`, USA).
  Confidence: **verified** (byte-confirmed `ItemList` JSON-LD with a live role).
- The `JobPosting` JSON-LD omits a per-item URL / id; postings are paired with
  job-card anchors (`/jobs/{id}` or `/j/{shortcode}`) by document order, with a
  deterministic title+position ATS-id fallback.
- The authenticated dashboard (`app.careerplug.com`) and the partner XML
  distribution feed are explicit non-goals.
- Mapping is fully resilient (malformed JSON-LD skipped, title-less posting
  skipped, de-dup by `atsId`); result-set sliced client-side to `resultsWanted`.
