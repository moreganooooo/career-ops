# Tasks: 333 — Sage HR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 342 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-sagehr/{package.json,tsconfig.json,src/index.ts,src/sagehr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/sagehr.types.ts`, `src/sagehr.constants.ts`
  - **Acceptance:** listing-row and detail-enrichment interfaces modelled with
    JSDoc; host, listing/detail path templates, CSS selectors, default results,
    concurrency, and request headers defined; verified careers-site surface
    documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `SageHrService` implementing `IScraper`
  - **Files:** `src/sagehr.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; vacancies listing parsed via cheerio;
    detail page enrichment extracted; bounded `Promise.allSettled` fan-out; HTTP
    4xx → empty; de-dup by `atsId`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 342 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SAGEHR` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 342 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/sagehr.e2e-spec.ts`
  - **Acceptance:** known-tenant (`cf0157f8-8d5e-4d2a-a9f7-0a80b348b097`) shape
    assertions (guarded; asserts `site === Site.SAGEHR`, `atsType === 'sagehr'`,
    `atsId`/`jobUrl` defined), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30 000 ms network timeouts.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/333-source-ats-sagehr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public careers-site surface, listing + detail wire shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against
  `https://talent.sage.hr/cf0157f8-8d5e-4d2a-a9f7-0a80b348b097/vacancies`
  (Newstel Worldwide HQ), no authentication required:
  - `GET /{careerSiteId}/vacancies` → HTTP 200, `div.job` cards with
    `/jobs/{positionId}` anchors + `.location`.
  - `GET /jobs/{positionId}` → HTTP 200, detail / apply page with the
    `ul.with-ticks` employment-type / location chips and `.block-content`
    description blocks.
  Confidence: **verified** (byte-confirmed listing and detail page).
- The authenticated REST API (`/api/recruitment/positions`, `X-Auth-Token`
  header) is an explicit non-goal; no anonymous JSON / RSS feed is exposed.
- Detail fan-out uses `Promise.allSettled`; de-dup by `atsId`; result-set sliced
  client-side to `resultsWanted` (default 100 internally).
