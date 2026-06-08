# Tasks: 379 — Carerix ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 388 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-carerix/{package.json,tsconfig.json,src/index.ts,src/carerix.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/carerix.types.ts`, `src/carerix.constants.ts`
  - **Acceptance:** feed-job + normalised interfaces modelled with JSDoc; root
    domain, host template, CxTools feed paths (`indeedFeed.php`, `jobboardFeed.php`,
    `RSSx.php`) + ordered probe list, default results, page size, page cap, request
    headers, `<job>` / `<item>` block regexes, publicationID-from-URL regex, and
    remote regex defined; researched public surface documented with date 2026-06-03
    and verified=false rationale.
  - **Estimate:** 0.25 day

- [x] T03 — `CarerixService` implementing `IScraper`
  - **Files:** `src/carerix.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; CxTools feeds
    probed in order; `<job>` / `<item>` blocks parsed (CDATA-unwrapped, entity-decoded)
    + deduped by publicationID; `publicationID` → `atsId`; HTTP 4xx → empty/skip;
    description format-converted; department / employmentType / location / remote
    derived; stop at `resultsWanted` (page cap on job-board feed); canonical public
    job URL built; `tsc --noEmit` clean; never throws out of `scrape`.
  - **Estimate:** 0.5 day

## Phase 388 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CARERIX = 'carerix'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 388 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/carerix.e2e-spec.ts`
  - **Acceptance:** candidate-tenant (`demo`) shape assertions (guarded; asserts
    `site === Site.CARERIX`, `atsType === 'carerix'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/379-source-ats-carerix/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public CxTools feed surface, feed paths + query params, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required; **verified=false**:
  - Platform + tenant host pattern `{tenant}.carerix.com`, and the public CxTools
    feed paths `/cxtools/indeedFeed.php`, `/cxtools/jobboardFeed.php?start=&count=&medium=`,
    `/cxtools/RSSx.php`, confirmed from Carerix's own technical documentation
    (Carerix Help Center: "CxTools", "RSS", "Publish Job orders on job sites").
  - The stable per-vacancy identifier is the Carerix `publicationID`, used to build
    candidate-facing detail / apply URLs (Carerix Help Center: "ApplyURL").
  - A specific live tenant feed could not be fetched during research (the generic
    `jobboardFeed`/RSS feeds require a per-tenant XML password to be enabled, and the
    demo sub-domain presented a TLS host mismatch), so feed parsing is written
    defensively against the documented feed shapes. Confidence: **researched**.
- The feeds are XML; no XML dependency is added — each `<job>` / `<item>` block is
  matched and its child tags read via defensive regex (CDATA-unwrapped, entity-
  decoded), so minor schema drift never throws.
- The Indeed / RSS feeds render the full board in one document; the generic job-board
  feed is paged via `start`/`count` (bounded by a page cap). De-dup is by `atsId`
  (publicationID).
