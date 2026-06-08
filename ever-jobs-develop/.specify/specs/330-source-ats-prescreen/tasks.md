# Tasks: 330 — Prescreen ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 339 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-prescreen/{package.json,tsconfig.json,src/index.ts,src/prescreen.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/prescreen.types.ts`, `src/prescreen.constants.ts`
  - **Acceptance:** listing-row and `JobPosting` JSON-LD interfaces modelled with
    JSDoc; host templates, detail/full paths, CSS selectors, default results,
    concurrency, and request headers defined; verified wire surface documented
    with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `PrescreenService` implementing `IScraper`
  - **Files:** `src/prescreen.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; landing `#jobList` parsed via cheerio;
    detail JSON-LD extracted; full-ad fragment fetched; bounded `Promise.allSettled`
    fan-out; HTTP 4xx → empty; de-dup by `atsId`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 339 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PRESCREEN` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 339 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/prescreen.e2e-spec.ts`
  - **Acceptance:** known-tenant (`v2c2`) shape assertions (guarded; asserts
    `site === Site.PRESCREEN`, `atsType === 'prescreen'`, `atsId`/`jobUrl`
    defined), no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/330-source-ats-prescreen/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public candidate-portal surface, JSON-LD wire shape, tenant
    resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against `https://v2c2.onlyfy.jobs/` (Virtual
  Vehicle Research GmbH), no authentication required:
  - `GET /` → HTTP 200, `#jobList` with `/job/{token}` rows.
  - `GET /job/{token}` → HTTP 200, `schema.org` `JobPosting` JSON-LD.
  - `GET /job/show/{token}/full?lang=en&mode=candidate` → HTTP 200, full body.
  Confidence: **verified** (byte-confirmed list, detail JSON-LD, and full body).
- Legacy hosts `{handle}.jobbase.io` / `{handle}.prescreenapp.io` 301-redirect to
  `{handle}.onlyfy.jobs`; the handle (sub-domain label) is the stable key.
- The authenticated REST API (`api.prescreenapp.io`, `apikey` header) and the
  retired `app.prescreenapp.io/job/list/{handle}?format=json` feed (HTTP 404)
  are explicit non-goals.
- Detail/full fan-out uses `Promise.allSettled`; de-dup by `atsId`; result-set
  sliced client-side to `resultsWanted`.
