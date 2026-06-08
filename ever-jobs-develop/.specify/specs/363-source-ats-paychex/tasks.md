# Tasks: 363 — Paychex ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 372 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-paychex/{package.json,tsconfig.json,src/index.ts,src/paychex.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/paychex.types.ts`, `src/paychex.constants.ts`
  - **Acceptance:** normalised sitemap/JSON-LD interfaces modelled with JSDoc;
    careers host templates, sitemap path, job-URL / loc / lastmod / JSON-LD /
    og / remote regexes, default results, and request headers defined; researched
    public surface documented with date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `PaychexService` implementing `IScraper`
  - **Files:** `src/paychex.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; sitemap
    fetched + parsed; detail pages fetched + JSON-LD `JobPosting` parsed
    defensively (recursive over arrays / `@graph`, `og:` fallbacks); job id →
    `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description format-converted;
    department / employmentType / location / remote derived from JSON-LD; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 372 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PAYCHEX` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 372 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/paychex.e2e-spec.ts`
  - **Acceptance:** known-tenant (`demo`) shape assertions (guarded; asserts
    `site === Site.PAYCHEX`, `atsType === 'paychex'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/363-source-ats-paychex/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + JSON-LD detail-page surface, wire shape, host
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform confirmed: Paychex Flex Hiring is a public-facing recruiting / ATS
    product that lets each customer "post jobs to their unique career site". The
    Paychex Apply careers host (`careers.paychex.com` / `apply.paychex.com`) is
    confirmed live and serves browsable, public job listings + per-job detail
    pages by department.
  - Confidence: **unverified** — the per-tenant Flex Hiring careers site is a
    client-rendered app, so an unauthenticated no-JS fetch returns only the app
    shell; the rendered schema.org `JobPosting` JSON-LD payload's byte-level shape
    could not be confirmed. The parser is written defensively around the documented
    Google-for-Jobs pattern.
- There is no public, tenant-agnostic JSON list feed; the careers index is an app.
  The sitemap (`/sitemap.xml`) + per-role JSON-LD detail pages are the documented,
  no-auth, crawlable surface and are used here.
- The sitemap enumerates every open role in one document (no pagination); de-dup by
  `atsId`; the enumerated set is sliced client-side to `resultsWanted` (default 100)
  before detail pages are fetched.
