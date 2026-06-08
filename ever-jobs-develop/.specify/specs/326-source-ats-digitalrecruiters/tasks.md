# Tasks: 326 — DigitalRecruiters ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 335 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-digitalrecruiters/{package.json,tsconfig.json,src/index.ts,src/digitalrecruiters.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/digitalrecruiters.types.ts`, `src/digitalrecruiters.constants.ts`
  - **Acceptance:** config / list-item / detail interfaces modelled with JSDoc;
    API host, config / list / detail paths, page size, locale map, defaults, and
    request headers defined; verified wire surface documented (2026-06-03).
  - **Estimate:** 0.25 day

- [x] T03 — `DigitalRecruitersService` implementing `IScraper`
  - **Files:** `src/digitalrecruiters.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; config-resolve → paginated listing →
    per-job detail fan-out (`Promise.allSettled`); locale expansion; HTTP 4xx →
    empty; de-dup by `job_ad_id`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 335 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.DIGITALRECRUITERS` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 335 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/digitalrecruiters.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded; `site` +
    `atsType` asserted), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. Uses the live tenant `segulatechnologies-careers`.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/326-source-ats-digitalrecruiters/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public API endpoints, verified wire shape, tenant + locale
    resolution, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 (confidence: **verified**):
  - `GET /careers/v1/careers-sites/careers.segulatechnologies.com` → 200,
    `domain_name=careers.segulatechnologies.com`, `internal_id=dRjVLJRz`.
  - `POST /public/v1/careers-site/job-ads?domainName=...&locale=en_GB` → 200,
    `count=683`, `items[]` with `job_ad_id`, `title`, `contract`, `location`, `url`.
  - `GET /public/v1/careers-site/job-ads/4428717?...&withJsonld=1` → 200, HTML
    `description` + `profile`, structured `address`, `jsonld.datePosted`.
  - Second tenant `recrutement.la-boucherie.fr` → listing 200, `count=58`.
- The job-ads endpoints require a region-qualified locale (`en_GB`, `fr_FR`); a
  bare `iso_code` (`en`) is rejected HTTP 400. The config `iso_code` is expanded
  via the SPA's locale map.
- The listing row has no description — a bounded per-job detail fan-out supplies
  the HTML body. De-dup by `job_ad_id`; result-set sliced to `resultsWanted`.
