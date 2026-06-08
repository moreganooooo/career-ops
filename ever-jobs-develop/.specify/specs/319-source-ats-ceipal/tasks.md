# Tasks: 319 — Ceipal ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 328 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-ceipal/{package.json,tsconfig.json,src/index.ts,src/ceipal.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/ceipal.types.ts`, `src/ceipal.constants.ts`
  - **Acceptance:** DRF envelope + per-row interfaces modelled with JSDoc (all
    fields optional/nullable); API base, `job-postings/` path, page param/size,
    concurrency, page ceiling, default results, and request headers defined; the
    verified wire surface documented with the 2026-06-03 verification date.
  - **Estimate:** 0.25 day

- [x] T03 — `CeipalService` implementing `IScraper`
  - **Files:** `src/ceipal.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; anonymous
    `https://api.ceipal.com/{apiKey}/job-postings/?page={n}` listing walked with
    `Promise.allSettled`; description enriched via `job-postings/{id}/` only when
    missing; de-dup by `atsId`; HTTP 400/404 → empty; never throws; Logger only;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 328 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CEIPAL` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 328 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/ceipal.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded by `length > 0`),
    no-slug/url empty, unknown-key graceful, `resultsWanted` honoured; asserts
    `site === Site.CEIPAL` and `atsType === 'ceipal'`; nullable fields guarded.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/319-source-ats-ceipal/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-portal endpoint, wire shape, tenant resolution,
    non-goals, and the live-verification confidence note documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint family verified live 2026-06-03: the Ceipal-hosted reference client
  `https://api.ceipal.com/careers_v3/js/app.min.js` (HTTP 200) declares the
  `api_url + api_key + '/'` base and the `job-postings/` + `job-postings/{id}/`
  resources; `GET https://api.ceipal.com/{key}/countries-list/` returns the
  documented key-validation envelope, proving active `{apiKey}/{resource}/`
  routing.
- Per-row field mapping is taken from the reference client (sampled tenant keys
  were rotated at verification time — see Q-CE-1). Confidence: heuristic, with
  layered fallbacks + graceful degradation.
- The authenticated ATS v1 REST API (`/v1/getJobPostingsList`, DRF token) and
  the login-gated candidate portal are explicit non-goals.
