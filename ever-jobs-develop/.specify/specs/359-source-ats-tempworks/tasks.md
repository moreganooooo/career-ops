# Tasks: 359 — TempWorks ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 368 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-tempworks/{package.json,tsconfig.json,src/index.ts,src/tempworks.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/tempworks.types.ts`, `src/tempworks.constants.ts`
  - **Acceptance:** normalised listing/detail interfaces modelled with JSDoc;
    board origin, HRCenter origin, listing/detail paths, detail-link / order-id /
    card-title / card-location / detail-title / apply-href / og / description-block /
    remote regexes, default results, and request headers defined; researched public
    surface documented with date 2026-06-03 and named real tenants
    (`JustInTimeStaffing`, `jjstaff`, `RPM`).
  - **Estimate:** 0.25 day

- [x] T03 — `TempWorksService` implementing `IScraper`
  - **Files:** `src/tempworks.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; listing
    fetched + parsed; detail pages fetched + `<h1>`/description/apply parsed
    defensively (card fallbacks, `og:` fallbacks); order id → `atsId`; HTTP 4xx →
    empty/skip (detail 4xx falls back to card data); de-dup by `atsId`; description
    format-converted; location / remote derived; slice to `resultsWanted`;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 368 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TEMPWORKS` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 368 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/tempworks.e2e-spec.ts`
  - **Acceptance:** known-tenant (`JustInTimeStaffing`) shape assertions (guarded;
    asserts `site === Site.TEMPWORKS`, `atsType === 'tempworks'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/359-source-ats-tempworks/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public listing + detail-page surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched + confirmed live 2026-06-03, no authentication required:
  - Board host `jobboard.ontempworks.com/{tenant}`, listing path
    `/{tenant}/Jobs/Search`, detail path `/{tenant}/Jobs/Details/{orderId}`, and
    HRCenter apply URL `https://hrcenter.ontempworks.com/en/{tenant}?orders={orderId}`
    all confirmed live, with named real tenants: `JustInTimeStaffing`
    (Just In Time Staffing), `jjstaff`, `RPM`.
  - Confidence: **verified** for the surface (host + listing/detail/apply URL
    patterns confirmed live); per-card theme CSS classes vary, so field extraction
    is written defensively around the stable structural markers (the
    `/Jobs/Details/{id}` link, the heading, and the `{city}, {state}` `<em>` text).
- The board carries no schema.org `JobPosting` JSON-LD; fields are parsed from the
  server-rendered HTML (listing cards + detail body). The authenticated TempWorks
  OpenAPI (`developer.ontempworks.com`, Swagger) is a non-goal — it requires a
  per-tenant credential and is not tenant-agnostic.
- The listing page enumerates the tenant's open orders; de-dup by `atsId`; the
  enumerated set is sliced client-side to `resultsWanted` (default 100) before
  detail pages are fetched.
