# Tasks: 347 — ApplicantStack ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 347 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-applicantstack/{package.json,tsconfig.json,src/index.ts,src/applicantstack.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/applicantstack.types.ts`, `src/applicantstack.constants.ts`
  - **Acceptance:** opening / detail / normalised job interfaces modelled with
    JSDoc; tenant host template, openings / detail / apply paths, row / detail-link
    / cell / summary-field / description / og / title / board-gone / remote regexes,
    default results, and request headers defined; verified public openings-table
    surface documented with verification date 2026-06-03 and the real tenant
    (`atwork443`).
  - **Estimate:** 0.25 day

- [x] T03 — `ApplicantStackService` implementing `IScraper`
  - **Files:** `src/applicantstack.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant resolved from slug/url; openings
    table fetched + parsed defensively (row split + cell + entity decode); `{jobId}`
    → `atsId`; HTTP 4xx / retired board → empty; de-dup by `atsId`; detail pages
    enriched + capped at `resultsWanted`; description format-converted;
    department / employmentType / location / remote derived; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 347 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.APPLICANTSTACK` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 347 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/applicantstack.e2e-spec.ts`
  - **Acceptance:** known-tenant (`atwork443`) shape assertions (guarded; asserts
    `site === Site.APPLICANTSTACK`, `atsType === 'applicantstack'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/347-source-ats-applicantstack/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public openings-table surface, wire shape, tenant resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the At Work Group tenant
  (`https://atwork443.applicantstack.com/`), no authentication required:
  - `https://atwork443.applicantstack.com/x/openings` → HTTP 200 HTML, ~404-row
    sortable listings table (Title / Date Posted / "Industry - Job Category" / City).
  - `https://atwork443.applicantstack.com/x/detail/a2v6venn6ji9` → HTTP 200 HTML
    ("Account Manager") with `og:` metadata, a "Job post summary" table
    (`ID: 56380612782CBH`, `Date Posted: 03/12/2026`, `City: Riverside`), and a
    `listing_description` body; apply at `/x/apply/a2v6venn6ji9`.
  - Sibling tenants on the same host pattern: `jayco`, `qrm`, `fwcc`, `acesrch`,
    `solutionsbyfusion`.
  Confidence: **verified** (openings table + detail page confirmed live).
- ApplicantStack exposes no public JSON list feed and no schema.org JSON-LD; job
  data is taken from the server-rendered openings table + detail pages only.
- The openings table lists every open role in one response (no pagination); de-dup
  by `atsId`; detail fetches and the result-set are sliced client-side to
  `resultsWanted` (default 100).
