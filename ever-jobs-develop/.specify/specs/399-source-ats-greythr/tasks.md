# Tasks: 399 — greytHR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 408 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-greythr/{package.json,tsconfig.json,src/index.ts,src/greythr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/greythr.types.ts`, `src/greythr.constants.ts`
  - **Acceptance:** published-role + response + normalised interfaces modelled with JSDoc;
    careers host suffix, root domain, published-roles endpoint path, job-detail path,
    default results, request headers, the empty POST body, and the remote regex defined;
    verified public surface documented with date 2026-06-03 and named real tenants
    (`greytip`, `fint`).
  - **Estimate:** 0.25 day

- [x] T03 — `GreytHrService` implementing `IScraper`
  - **Files:** `src/greythr.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; published-roles
    endpoint POSTed with an empty body; `data` narrowed to an array; UUID `id` → `atsId`;
    deduped; description format-converted when present; designation → department,
    `job_type` → employmentType, `is_remote` (then regex) → isRemote, datePosted derived;
    server-built `apply_url` used as detail + apply URL (slug fallback); company name from
    de-slugified tenant; stop at `resultsWanted`; per-request timeout capped at 15s on BOTH
    `timeout` + `requestTimeout`; HTTP 4xx/5xx / DNS / malformed → empty/partial, never
    throws; `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.GREYTHR`).
  - **Estimate:** 0.5 day

## Phase 408 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.GREYTHR = 'greythr'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 408 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/greythr.e2e-spec.ts`
  - **Acceptance:** known-tenant (`greytip`) shape assertions (guarded; asserts
    `site === Site.GREYTHR`, `atsType === 'greythr'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/399-source-ats-greythr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public published-roles JSON surface, fetch strategy, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.greythr.com/hire/jobs/`, confirmed with named
    real tenants `greytip` (Greytip Software Pvt. Ltd.) and `fint` (FINT Solutions Pvt.
    Ltd.).
  - The careers SPA fetches the published-role set from
    `POST /hire/api/career/published_jobs/` (body `{}`) → `{ data: [ … ] }`. The response
    carried multiple live roles for `greytip` and 2 for `fint`, each with a UUID `id`, HTML
    `description`, `job_type`, `is_remote`, and a server-built `apply_url` whose detail page
    (`/hire/jobs/{slug}`) returned HTTP 200. The endpoint returns HTTP 405 on GET and the
    role array on POST. Confidence: **verified**.
- The role data is plain JSON from the endpoint (not embedded in the SPA landing HTML), so
  no headless browser is required.
- The anonymous payload's `locations` is an array of opaque numeric location-id strings with
  no public name resolution; location is left null pending a future per-location pass.
- The endpoint returns the full published-role set in one response (no server-side
  pagination); the adapter dedupes by `atsId` and slices to `resultsWanted`.
