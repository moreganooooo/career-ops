# Tasks: 335 — Webcruiter ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 335 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-webcruiter/{package.json,tsconfig.json,src/index.ts,src/webcruiter.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/webcruiter.types.ts`, `src/webcruiter.constants.ts`
  - **Acceptance:** advert + envelope + company-meta interfaces modelled with
    JSDoc (`PascalCase` wire fields, defensive `camelCase` aliases); host, path
    templates, default language, default results, and request headers defined;
    the verified public endpoints documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `WebcruiterService` implementing `IScraper`
  - **Files:** `src/webcruiter.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; advert list fetched via
    `POST /api/odvert/companysearch/{lock}` with a `{ take, skip }` body; clean
    name from `companymeta` (best-effort); HTTP 4xx / missing `Data` → empty;
    de-dup by `atsId`; client-side slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 335 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.WEBCRUITER` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 335 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/webcruiter.e2e-spec.ts`
  - **Acceptance:** known-tenant (`companySlug: '23109900'`) shape assertions
    (guarded; asserts `site === Site.WEBCRUITER`, `atsType === 'webcruiter'`,
    `atsId`/`jobUrl` defined), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured; 30 000 ms network timeouts.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/335-source-ats-webcruiter/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public candidate-portal surface, wire-shape mapping table,
    company-lock resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against `https://candidate.webcruiter.com`,
  no authentication required:
  - `POST /api/odvert/companysearch/77790000` (Tromsø kommune) → `Total: 65`,
    shaped adverts (body `{ take, skip }`).
  - `POST /api/odvert/companysearch/23109900` (Norwegian Refugee Council,
    English) → 13 adverts with real `Heading` / `OpenAdvertUrl` / `Id`.
  - `GET /api/company/companymeta/77790000` → `{ CompanyName: "Tromsø kommune", ... }`.
  - `POST /api/odvert/companysearch/99999999999` (unknown) → `{ Total: 0, Data: [] }`.
  Confidence: **verified** (byte-confirmed advert list and full advert object).
- The search endpoint is POST-only (GET → HTTP 405); an empty body returns
  `Data: []` with a correct `Total`, so a `{ take, skip }` paging body is required.
- The advert payload carries title, description, location, and both the public
  job URL (`OpenAdvertUrl`) and apply URL (`ApplyUrl`) — no per-advert detail
  fan-out is needed. De-dup by `atsId`; result-set sliced client-side to
  `resultsWanted`.
