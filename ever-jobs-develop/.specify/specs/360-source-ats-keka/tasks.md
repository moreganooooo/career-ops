# Tasks: 360 — Keka ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 369 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-keka/{package.json,tsconfig.json,src/index.ts,src/keka.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/keka.types.ts`, `src/keka.constants.ts`
  - **Acceptance:** normalised feed/JSON-LD interfaces modelled with JSDoc;
    careers host template, published-jobs feed paths, detail-page path template,
    JSON-LD / og / title / remote regexes, default results, and request headers
    defined; researched public surface documented with date 2026-06-03 and named
    real tenants (`algoworks`, `turno`, `adda247`) + the confirmed detail-page URL
    shape `/careers/jobdetails/{jobId}`.
  - **Estimate:** 0.25 day

- [x] T03 — `KekaService` implementing `IScraper`
  - **Files:** `src/keka.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; published
    jobs feed probed + parsed (envelope-unwrap + field aliases); roles normalised +
    de-duped by `atsId`; detail pages consulted for JSON-LD `JobPosting` enrichment
    (recursive over arrays / `@graph`, `og:` fallbacks) only when company name / HTML
    body missing; job id → `atsId`; HTTP 4xx → empty/skip; description
    format-converted; department / employmentType / location / remote derived;
    slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 369 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.KEKA` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 369 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/keka.e2e-spec.ts`
  - **Acceptance:** known-tenant (`algoworks`) shape assertions (guarded; asserts
    `site === Site.KEKA`, `atsType === 'keka'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/360-source-ats-keka/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public published-jobs feed + JSON-LD detail-page surface, wire
    shape, host resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.keka.com/careers/` confirmed, with the
    real detail-page URL shape `{tenant}.keka.com/careers/jobdetails/{jobId}` (live
    example `algoworks.keka.com/careers/jobdetails/41450`). Real tenants:
    `algoworks`, `turno`, `adda247`.
  - Confidence: **unverified** — the career site is a JS-rendered SPA, so an
    unauthenticated no-JS fetch returns only the app shell; the rendered
    published-jobs JSON feed's byte-level shape could not be confirmed. The parser
    is written defensively around the documented feed + Google-for-Jobs JSON-LD
    patterns.
- The authenticated `developers.keka.com` Hire API (`/v1/hire/jobs`) is explicitly
  out of scope; this plugin uses only the public candidate-facing feed + detail
  pages.
- The feed enumerates every open role in one document (no pagination); de-dup by
  `atsId`; the enumerated set is sliced client-side to `resultsWanted` (default 100)
  before any detail enrichment fetch.
