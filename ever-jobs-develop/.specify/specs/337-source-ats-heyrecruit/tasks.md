# Tasks: 337 — Heyrecruit ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 346 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-heyrecruit/{package.json,tsconfig.json,src/index.ts,src/heyrecruit.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/heyrecruit.types.ts`, `src/heyrecruit.constants.ts`
  - **Acceptance:** embedded-job-record interfaces (`HeyrecruitJob`,
    `HeyrecruitJobString`, `HeyrecruitCompanyLocationJob`,
    `HeyrecruitCompanyLocation`, `HeyrecruitTile`) modelled with JSDoc; host
    template, overview/detail paths, `.job-tile` selector, the
    `jobClickEventListener` / id / location regexes, default results, and request
    headers defined; verified wire surface documented with verification date
    2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `HeyrecruitService` implementing `IScraper`
  - **Files:** `src/heyrecruit.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; overview `.job-tile` parsed via cheerio;
    embedded job JSON decoded + parsed from the `onclick` handler; visible-tile
    fallback; HTTP 4xx → empty; de-dup by `atsId`; client-side slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 346 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HEYRECRUIT` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 346 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/heyrecruit.e2e-spec.ts`
  - **Acceptance:** known-tenant (`bodenseetherme`) shape assertions (guarded;
    asserts `site === Site.HEYRECRUIT`, `atsType === 'heyrecruit'`, `atsId`/`jobUrl`
    defined), no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured;
    30 000 ms network timeouts.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/337-source-ats-heyrecruit/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public careers-overview surface, embedded-job wire shape,
    mapping table, tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against
  `https://bodenseetherme.heyrecruit.de/?page=jobs` (Bodensee-Therme Überlingen),
  no authentication required:
  - `GET /?page=jobs` → HTTP 200, 4 `.job-tile` cards.
  - Each tile anchor carries `onclick="jobClickEventListener({...})"` embedding
    the full job record (id, localised title/description/employment/department,
    structured location, publish dates).
  - Detail page at `/?page=job&id={jobId}&location={locationId}`.
  Confidence: **verified** (byte-confirmed overview with 4 embedded job objects
  parsed).
- The authenticated REST API (`app.heyrecruit.de/api/v2`, JWT bearer from
  `client_id`/`client_secret`) is an explicit non-goal; the public overview embeds
  the same per-job object, so no credentials are required.
- Single overview fetch per tenant (no detail fan-out); de-dup by numeric job id;
  result-set sliced client-side to `resultsWanted`.
