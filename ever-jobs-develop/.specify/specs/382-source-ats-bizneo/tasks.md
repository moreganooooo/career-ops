# Tasks: 382 — Bizneo HR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 391 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-bizneo/{package.json,tsconfig.json,src/index.ts,src/bizneo.module.ts}`
  - **Acceptance:** package compiles; barrel exports `BizneoModule` + `BizneoService`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/bizneo.types.ts`, `src/bizneo.constants.ts`
  - **Acceptance:** board-card + JSON-LD + normalised interfaces modelled with
    JSDoc; root domain, host template, jobs path, default results, page cap, request
    headers, job-link regex, JSON-LD / title regexes, and remote regex defined;
    verified public surface documented with date 2026-06-03 and the named real
    tenant (`groundforce`).
  - **Estimate:** 0.25 day

- [x] T03 — `BizneoService` implementing `IScraper`
  - **Files:** `src/bizneo.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; host resolved from slug/url (marketing
    host rejected); index HTML walked for `/jobs/{slug}` links + deduped; card title
    / location / brand / work-mode recovered; optional `JobPosting` JSON-LD
    enrichment; `{slug}` → `atsId`; canonical `…/jobs/{slug}` apply URL built; HTTP
    4xx / DNS → empty/skip; description format-converted; department / employmentType
    / location / remote derived; stop at `resultsWanted` (page cap); never throws;
    `tsc --noEmit` clean (modulo the orchestrator-added `Site.BIZNEO`).
  - **Estimate:** 0.5 day

## Phase 391 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BIZNEO` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 391 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/bizneo.e2e-spec.ts`
  - **Acceptance:** known-tenant (`groundforce`) shape assertions (guarded; asserts
    `site === Site.BIZNEO`, `atsType === 'bizneo'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/382-source-ats-bizneo/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index surface, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.bizneo.com`, confirmed with the named
    real tenant `groundforce` (Groundforce, airport handling, ES;
    `https://groundforce.bizneo.com/jobs`, multiple open roles rendering live with
    title + location + work-mode). Another live tenant on the same pattern:
    `telepizza` (Telepizza / Food Delivery Brands).
  - The server-rendered index HTML and the per-role detail URL shape `…/jobs/{slug}`
    (e.g. `/jobs/operario-a-almacen-aeropuerto-de-malaga`,
    `/jobs/agentes-de-rampa-aeropuerto-de-bilbao-9821c8a8-1aca-4e1a-afd6-9ec384a509ef`),
    with the `{slug}` segment as the per-role ATS id. Confidence: **verified**.
- The board's per-role detail body is hydrated client-side; the adapter enumerates +
  describes roles from the server-rendered index card text (anchored on `/jobs/{slug}`
  links), enriching from a `JobPosting` JSON-LD block when one is server-rendered. No
  headless browser dependency. De-dup is by `atsId` (`slug`).
