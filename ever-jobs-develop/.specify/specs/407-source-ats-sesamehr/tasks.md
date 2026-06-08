# Tasks: 407 — Sesame HR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 416 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-sesamehr/{package.json,tsconfig.json,src/index.ts,src/sesamehr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/sesamehr.types.ts`, `src/sesamehr.constants.ts`
  - **Acceptance:** region-finder + feed-envelope + role + nested (category / scheduleType) +
    normalised interfaces modelled with JSDoc; portal origin/host, root domain, region-finder
    origin/path, backend-origin helper, default region, feed path, detail/apply URL helpers,
    page size, default results, page cap, request headers, the remote `modality` token, and
    bilingual remote regex defined; verified public surface documented with date 2026-06-03
    and named real tenants (`Sesame`, `ForwardKeys`).
  - **Estimate:** 0.25 day

- [x] T03 — `SesameHrService` implementing `IScraper`
  - **Files:** `src/sesamehr.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; company resolved from slug/url (casing preserved);
    region resolved via anonymous finder (fallback `EU1`); public feed
    `GET /api/v3/companies/{company}/public-vacancies?page={n}` GETted as JSON; `{ data, meta }`
    envelope read; `data` narrowed; pages drained via `meta.currentPage`/`meta.lastPage`
    bounded by a page cap; UUID `id` → `atsId`; deduped; description format-converted when
    present; department (`category.name`) / employmentType (`scheduleType.name` else
    `contractType`) / structured location / remote (`modality` first, then regex) / datePosted
    derived; canonical detail + apply URL synthesised from the portal route; company name
    de-slugified; stop at `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout`
    + `requestTimeout`; region-finder failure / HTTP 4xx / DNS / malformed → empty/partial,
    never throws; `tsc --noEmit` clean (verified against a temporary `Site.SESAMEHR`).
  - **Estimate:** 0.5 day

## Phase 416 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SESAMEHR = 'sesamehr'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 416 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/sesamehr.e2e-spec.ts`
  - **Acceptance:** known-tenant (`Sesame`) shape assertions (guarded; asserts
    `site === Site.SESAMEHR`, `atsType === 'sesamehr'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured (against the multi-page `Sesame` board). 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/407-source-ats-sesamehr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public portal JSON-feed surface, region detection, drain strategy,
    synthesised detail/apply shape, company resolution, mapping table, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + portal pattern `app.sesametime.com/jobs/{company}/…`, confirmed with named real
    tenants `Sesame` (Sesame HR) and `ForwardKeys`.
  - Region finder `GET login.sesametime.com/private/login-finder/v1/company/Sesame` returned
    `{ data: { region: "EU1" } }`; the public feed
    `GET https://back-eu1.sesametime.com/api/v3/companies/Sesame/public-vacancies?page=1`
    returned `{ data, meta }`: **36 roles across 2 pages of 20** for `Sesame` (first role
    `599a9c9f-dbac-409b-b890-c63e71d9dd2f` "Outbound SDR Team Lead") and **0 roles** for
    `ForwardKeys`. The portal routes `app.sesametime.com/jobs/Sesame/{id}` and `…/apply` both
    answered HTTP 200. No bearer token. Confidence: **verified**.
- The role data is a clean JSON feed (the SPA's own backend), so it is consumed as a REST
  endpoint; no headless browser is required.
- The authenticated `api-{region}.sesametime.com` public API is explicitly NOT used (it
  requires a bearer token); only the public per-tenant portal feed is consumed.
- The company segment is case-sensitive on the API (`Sesame` resolves; `sesame` 404s), so the
  adapter preserves the caller's casing — unlike sub-domain-addressed ATS adapters.
- The feed paginates (`meta.currentPage` / `meta.lastPage`, 20/page); the adapter drains pages
  via `?page={n}` bounded by a page cap, dedupes by `atsId`, and stops once `resultsWanted`
  roles are collected.
