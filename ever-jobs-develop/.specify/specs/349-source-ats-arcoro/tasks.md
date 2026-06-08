# Tasks: 349 — Arcoro ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 349 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-arcoro/{package.json,tsconfig.json,src/index.ts,src/arcoro.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/arcoro.types.ts`, `src/arcoro.constants.ts`
  - **Acceptance:** normalised job + JSON-LD interfaces modelled with JSDoc;
    career host templates (`{tenant}.birddoghr.com` + shared
    `jobs.ourcareerpages.com`), listing/sitemap/detail paths, job-link / `<loc>` /
    JSON-LD / meta / title / location / employment-type / remote regexes, default
    results, and request headers defined; verified public detail-page surface
    documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `ArcoroService` implementing `IScraper`
  - **Files:** `src/arcoro.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; host resolved from slug/url (incl.
    shared host + direct `/job/{id}` deep link); `/job/{id}` links harvested from
    listing/landing/sitemap; detail page parsed JSON-LD → `og:*` → visible HTML;
    job id → `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description
    format-converted; location / employmentType / remote / datePosted derived;
    bounded to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 349 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ARCORO` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 349 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/arcoro.e2e-spec.ts`
  - **Acceptance:** known-tenant (`engineeringjobs`) shape assertions (guarded;
    asserts `site === Site.ARCORO`, `atsType === 'arcoro'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/349-source-ats-arcoro/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public detail-page surface, wire shape, host resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the shared career-pages host
  (`https://jobs.ourcareerpages.com/`), no authentication required:
  - `GET https://jobs.ourcareerpages.com/job/77551` → HTTP 200 server-rendered
    HTML ("Mid-Market Software Sales Representative", company "BirdDogHR",
    "Atlanta, GA 30313", "full-time, exempt").
  - `GET https://jobs.ourcareerpages.com/job/62256` → HTTP 200 server-rendered
    HTML ("Implementation & Support Specialist", "Urbandale, IA 50322").
  - Tenant career centers on the `{tenant}.birddoghr.com` host pattern: `jobs`,
    `engineeringjobs`, `procoreconstructionjobboard`, `agciajobs`, `agcksjobs`.
  Confidence: **verified** (detail-page surface + field set confirmed live;
  schema.org JSON-LD path designed defensively as tenant-dependent).
- The official Arcoro/BirdDogHR REST APIs are partner/OAuth gated and an explicit
  non-goal; job data is taken from the public `/job/{id}` detail pages only.
- The listing/search page is client-rendered; roles are enumerated by harvesting
  `/job/{id}` links from the listing/landing HTML and the sitemap. De-dup by
  `atsId`; detail-page set bounded to `resultsWanted` (default 100).
