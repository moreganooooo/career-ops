# Tasks: 358 — Namely ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 367 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-namely/{package.json,tsconfig.json,src/index.ts,src/namely.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/namely.types.ts`, `src/namely.constants.ts`
  - **Acceptance:** normalised sitemap/JSON-LD interfaces modelled with JSDoc;
    career-site host template, sitemap path, job-URL / loc / lastmod / JSON-LD /
    og / remote regexes, default results, and request headers defined; researched
    public surface documented with date 2026-06-03 and the `{tenant}.namely.com`
    host pattern.
  - **Estimate:** 0.25 day

- [x] T03 — `NamelyService` implementing `IScraper`
  - **Files:** `src/namely.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; sitemap
    fetched + parsed; detail pages fetched + JSON-LD `JobPosting` parsed
    defensively (recursive over arrays / `@graph`, `og:` fallbacks); job id →
    `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description format-converted;
    department / employmentType / location / remote derived from JSON-LD; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 367 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.NAMELY` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 367 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/namely.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded; asserts
    `site === Site.NAMELY`, `atsType === 'namely'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/358-source-ats-namely/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + JSON-LD detail-page surface, wire shape, host
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.namely.com` confirmed (Namely
    addresses every company by its own sub-domain of `namely.com`, each publishing
    a public candidate career site under it).
  - Namely's documented JSON job/recruiting API (`developers.namely.com`) is
    OAuth-gated and therefore out of scope.
  - Confidence: **unverified** — the career sites are JS-rendered SPAs, so an
    unauthenticated no-JS fetch returns only the app shell; the rendered schema.org
    `JobPosting` JSON-LD payload's byte-level shape could not be confirmed. The
    parser is written defensively around the documented Google-for-Jobs pattern.
- There is no public, tenant-agnostic anonymous JSON list feed; the jobs index is
  a SPA. The sitemap (`/sitemap.xml`) + per-role JSON-LD detail pages are the
  documented, no-auth, crawlable surface and are used here.
- The sitemap enumerates every open role in one document (no pagination); de-dup by
  `atsId`; the enumerated set is sliced client-side to `resultsWanted` (default 100)
  before detail pages are fetched.
