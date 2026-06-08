# Tasks: 351 — Jobtrain ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 351 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-jobtrain/{package.json,tsconfig.json,src/index.ts,src/jobtrain.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/jobtrain.types.ts`, `src/jobtrain.constants.ts`
  - **Acceptance:** schema.org `JobPosting` interfaces (place / postal address /
    organisation / posting / normalised job) modelled with JSDoc; career host,
    `_JobCard` + `JobDetail` path templates, jobId / JSON-LD / remote regexes,
    default results, and request headers defined; verified public career-site
    surface documented with verification date 2026-06-03 and the CrossReach tenant.
  - **Estimate:** 0.25 day

- [x] T03 — `JobtrainService` implementing `IScraper`
  - **Files:** `src/jobtrain.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; `_JobCard`
    partial fetched + job ids parsed (deduped); each detail page's JSON-LD
    `JobPosting` extracted + `JSON.parse`-d (numeric-entity decode, object/array/
    `@graph` tolerance); job id → `atsId`; HTTP 4xx → empty/skip; description
    format-converted; location from `PostalAddress`; employmentType + remote
    derived; fetch at most `resultsWanted` detail pages; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 351 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.JOBTRAIN` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 351 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/jobtrain.e2e-spec.ts`
  - **Acceptance:** known-tenant (`crossreach`) shape assertions (guarded; asserts
    `site === Site.JOBTRAIN`, `atsType === 'jobtrain'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/351-source-ats-jobtrain/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-site surface, wire shape, tenant resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the CrossReach tenant
  (`https://www.jobtrain.co.uk/crossreach/`), no authentication required:
  - `GET https://www.jobtrain.co.uk/crossreach/Home/_JobCard` → HTTP 200 HTML
    fragment with 24 live vacancy cards (each `data-jobId="{id}"` +
    `/crossreach/Job/JobDetail?JobId={id}`).
  - `GET https://www.jobtrain.co.uk/crossreach/Job/JobDetail?JobId=14496` →
    HTTP 200 HTML with a complete `application/ld+json` `JobPosting`
    (`title`, `datePosted`, `baseSalary`, `employmentType`, `description`,
    `jobLocation.address`, `hiringOrganization.name`).
  - Sibling tenants on the same host/path pattern: `citizensadvice`, `thirteen`,
    `jobtrainsolutions`.
  Confidence: **verified** (card partial + JSON-LD field set confirmed live).
- The per-tenant automated XML vacancy feed (LinkedIn job feed, etc.) is
  provisioned per integration at an opaque, non-discoverable URL and is an
  explicit non-goal; job data is taken from the public career site only.
- The card partial returns every live role in one response (no pagination);
  de-dup by `atsId`; the adapter fetches at most `resultsWanted` detail pages
  (default 100).
