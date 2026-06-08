# Tasks: 336 — d.vinci ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 336 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-dvinci/{package.json,tsconfig.json,src/index.ts,src/dvinci.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/dvinci.types.ts`, `src/dvinci.constants.ts`
  - **Acceptance:** publication + nested `jobOpening` / structured-location
    interfaces modelled with JSDoc; host template, list path, default lang,
    default results, and request headers defined; verified wire surface
    documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `DvinciService` implementing `IScraper`
  - **Files:** `src/dvinci.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; public `/jobPublication/list.json`
    fetched and normalised; structured + free-text location mapping; HTML
    sections assembled and format-converted; HTTP 4xx → empty; de-dup by
    `atsId`; client-side slice to `resultsWanted`; `tsc --noEmit` clean
    (only the orchestrator-supplied `Site.DVINCI` reference is unresolved in
    isolation).
  - **Estimate:** 0.5 day

## Phase 336 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.DVINCI = 'dvinci'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 336 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/dvinci.e2e-spec.ts`
  - **Acceptance:** known-tenant (`inverto`) shape assertions (guarded; asserts
    `site === Site.DVINCI`, `atsType === 'dvinci'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured; 30000 ms network timeouts.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/336-source-ats-dvinci/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public job-publication API surface, JSON wire shape, mapping
    table, tenant resolution, graceful degradation, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - `https://inverto.dvinci-hr.com/jobPublication/list.json?lang=en` → HTTP 200,
    60 active publications.
  - `https://vhw.dvinci-hr.com/jobPublication/list.json` → HTTP 200, 2
    publications.
  Confidence: **verified** (real job arrays returned from live fetches).
- The job-publication API is documented as "always public" (version 2022.11+);
  no API key, cookie, or auth header is required.
- The list endpoint returns the tenant's full publications array in one response
  (no server-side pagination); a single fetch per tenant is sufficient and the
  result is sliced client-side to `resultsWanted`. De-dup is by `atsId`.
