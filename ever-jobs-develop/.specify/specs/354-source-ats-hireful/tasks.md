# Tasks: 354 — Hireful ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 354 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hireful/{package.json,tsconfig.json,src/index.ts,src/hireful.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hireful.types.ts`, `src/hireful.constants.ts`
  - **Acceptance:** normalised sitemap/JSON-LD interfaces modelled with JSDoc;
    careers host templates, sitemap path, vacancy-URL / loc / lastmod / JSON-LD /
    og / remote regexes, default results, and request headers defined; researched
    public surface documented with date 2026-06-03 and named real tenants
    (`thebigissue`, `tkat`, `hirefulagency`, `planinternationaluk`).
  - **Estimate:** 0.25 day

- [x] T03 — `HirefulService` implementing `IScraper`
  - **Files:** `src/hireful.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; sitemap
    fetched + parsed; detail pages fetched + JSON-LD `JobPosting` parsed
    defensively (recursive over arrays / `@graph`, `og:` fallbacks); vacancy id →
    `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description format-converted;
    department / employmentType / location / remote derived from JSON-LD; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 354 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HIREFUL` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 354 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hireful.e2e-spec.ts`
  - **Acceptance:** known-tenant (`thebigissue`) shape assertions (guarded; asserts
    `site === Site.HIREFUL`, `atsType === 'hireful'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/354-source-ats-hireful/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + JSON-LD detail-page surface, wire shape, host
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.livevacancies.co.uk` confirmed, with
    named real tenants: `thebigissue` (The Big Issue), `tkat` (TKAT), `hirefulagency`
    (hireful Agency), `planinternationaluk` (Plan International UK), `glide`,
    `transforminglearning`. Custom careers hosts: `agency.hireful.com`,
    `www.hirefulcareers.co.uk`.
  - Confidence: **unverified** — the portals are JS-rendered SPAs, so an
    unauthenticated no-JS fetch returns only the app shell; the rendered schema.org
    `JobPosting` JSON-LD payload's byte-level shape could not be confirmed. The
    parser is written defensively around the documented Google-for-Jobs pattern.
- There is no public, tenant-agnostic JSON list feed; the jobs index is a SPA. The
  sitemap (`/sitemap.xml`) + per-role JSON-LD detail pages are the documented,
  no-auth, crawlable surface and are used here.
- The sitemap enumerates every open role in one document (no pagination); de-dup by
  `atsId`; the enumerated set is sliced client-side to `resultsWanted` (default 100)
  before detail pages are fetched.
