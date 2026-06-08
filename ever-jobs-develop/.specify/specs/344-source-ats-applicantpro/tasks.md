# Tasks: 344 — ApplicantPro ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 344 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-applicantpro/{package.json,tsconfig.json,src/index.ts,src/applicantpro.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/applicantpro.types.ts`, `src/applicantpro.constants.ts`
  - **Acceptance:** sitemap-entry, job, and jobInfo interfaces modelled with
    JSDoc; host/path templates, sitemap + detail-page regexes, default results,
    and request headers defined; verified public surface documented with
    verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `ApplicantProService` implementing `IScraper`
  - **Files:** `src/applicantpro.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; sitemap
    enumerated; detail pages parsed (`og:*`, `keywords`, `JobDetail` mount);
    HTTP 4xx → empty/partial; de-dup by `atsId`; description format-converted;
    detail fetches limited to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 344 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.APPLICANTPRO` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 344 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/applicantpro.e2e-spec.ts`
  - **Acceptance:** known-tenant (`pharrtx`) shape assertions (guarded;
    asserts `site === Site.APPLICANTPRO`, `atsType === 'applicantpro'`,
    `atsId`/`jobUrl` defined), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/344-source-ats-applicantpro/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + detail-page surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - `GET https://pharrtx.applicantpro.com/sitemap.xml` → HTTP 200 `text/xml`
    enumerating `/jobs/{id}.html` open-role URLs (City of Pharr, TX).
  - `GET https://communitybridge.applicantpro.com/jobs/995117.html` → HTTP 200
    HTML with `og:title`/`og:url`/`og:description`, `meta[keywords]`, and the
    inline `JobDetail` mount object (`domainTitle: "Community Bridge"`,
    `jobInfo.mdiCalendar: "Posted 06-Feb-2019 (EST)"`,
    `jobInfo.mdiMapMarker: "Washington, DC, USA"`, `jobInfo.mdiInbox: "Full Time"`).
  Confidence: **verified** (byte-confirmed sitemap rows + detail-page metadata).
- The board's `/jobs/` listing page is client-rendered (a Vue web component
  fetching rows from an internal, run-time-computed API) and is an explicit
  non-goal; the public XML sitemap is the stable enumeration surface.
- The sitemap lists every open role in one document (no pagination of the job
  set); de-dup by `atsId`; detail-page fetches limited to `resultsWanted`
  (default 100).
