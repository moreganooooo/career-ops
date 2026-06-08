# Tasks: 332 — HR-ON Recruit ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 341 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hron/{package.json,tsconfig.json,src/index.ts,src/hron.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hron.types.ts`, `src/hron.constants.ts`
  - **Acceptance:** listing-item, job-detail, and `JobPosting` JSON-LD interfaces
    modelled with JSDoc; host, career-path + detail-path templates, the
    `?jobid=` link regex, default results, concurrency, and request headers
    defined; verified public surface documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `HrOnService` implementing `IScraper`
  - **Files:** `src/hron.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; career page parsed for
    `/jobposts*?jobid={ID}` links via a theme-independent regex + cheerio
    enrichment; detail pages parsed (HTML + optional JSON-LD); bounded
    `Promise.allSettled` fan-out; HTTP 4xx → empty; de-dup by `atsId`;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 341 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HRON` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 341 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hron.e2e-spec.ts`
  - **Acceptance:** known-tenant (`https://hr-on.com/careers/`) shape assertions
    (guarded; asserts `site === Site.HRON`, `atsType === 'hron'`, `atsId`/`jobUrl`
    defined), no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/332-source-ats-hron/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-page surface, parse strategy, mapping table,
    tenant resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against `https://hr-on.com/careers/` (HR-ON
  ApS' own HR-ON-Recruit-rendered career page), no authentication required:
  - `GET /careers/` → HTTP 200, six `/jobposts_en?jobid={ID}` role links.
  - `GET /jobposts_en?jobid=318814` → HTTP 200, server-rendered detail HTML
    (title "Senior Backend Engineer …", company "HR-ON", location "Odense C").
  Confidence: **verified** (byte-confirmed listing links and detail HTML).
- HR-ON keeps candidates on each company's own domain; the `/jobposts*?jobid={ID}`
  anchor is the stable cross-tenant contract, harvested by pattern (not CSS).
- No documented anonymous JSON feed exists; the authenticated HR-ON Open API is
  an explicit non-goal.
- Detail fan-out uses `Promise.allSettled`; de-dup by numeric job id (`atsId`);
  result-set sliced client-side to `resultsWanted`.
