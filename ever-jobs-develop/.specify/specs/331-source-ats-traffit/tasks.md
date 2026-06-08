# Tasks: 331 — Traffit ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 331 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-traffit/{package.json,tsconfig.json,src/index.ts,src/traffit.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/traffit.types.ts`, `src/traffit.constants.ts`
  - **Acceptance:** advert-envelope and `advert.values[]` interfaces modelled with
    JSDoc; host template, feed path, field ids (`description`, `geolocation`),
    default results, and request headers defined; verified wire surface documented
    with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `TraffitService` implementing `IScraper`
  - **Files:** `src/traffit.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; published feed fetched; `advert.values[]`
    resolved by `field_id`; structured `geolocation` → `LocationDto`; DNS/HTTP 4xx
    → empty; de-dup by `atsId`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 331 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TRAFFIT` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 331 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/traffit.e2e-spec.ts`
  - **Acceptance:** known-tenant (`people`) shape assertions (guarded; asserts
    `site === Site.TRAFFIT`, `atsType === 'traffit'`, `atsId`/`jobUrl` defined),
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured. 30000 ms
    timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/331-source-ats-traffit/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public published-adverts surface, `advert.values[]` wire shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - `GET https://people.traffit.com/public/job_posts/published` → HTTP 200, JSON
    array of 12 published adverts.
  - `GET https://traffit.traffit.com/public/job_posts/published` → HTTP 200, JSON
    array (advert "Customer Support Specialist", id 639, Gdynia / Poland).
  Confidence: **verified** (byte-confirmed JSON array with real adverts).
- The advert content lives in `advert.values[]` keyed by `field_id`
  (`description` HTML, `geolocation` structured object); the mapper resolves
  fields by id, not positional index.
- The public job-post `id` (top-level) is the stable ATS id / de-dup key.
- The advanced authenticated Integration API (`api.traffit.com`) is an explicit
  non-goal; the free public feed is sufficient.
