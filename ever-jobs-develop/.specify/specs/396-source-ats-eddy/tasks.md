# Tasks: 396 — Eddy ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 405 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-eddy/{package.json,tsconfig.json,src/index.ts,src/eddy.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/eddy.types.ts`, `src/eddy.constants.ts`
  - **Acceptance:** list-record + detail + normalised interfaces modelled with JSDoc;
    careers host, API origin, public list + detail endpoint builders, careers-board + job
    page URL builders, default results, detail-fetch cap, request headers, the UUID regex,
    the remote workplace token, and remote regex defined; verified public surface documented
    with date 2026-06-03 (org-UUID requirement; 400-on-vanity-slug behaviour).
  - **Estimate:** 0.25 day

- [x] T03 — `EddyService` implementing `IScraper`
  - **Files:** `src/eddy.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; organization UUID resolved from slug/url (non-UUID
    → empty); public list endpoint fetched + narrowed to an array; `jobOpeningUuid` →
    `atsId`; deduped + sliced to `resultsWanted` BEFORE the detail fan-out; bounded
    best-effort per-role detail enrichment via `Promise.allSettled`; description
    format-converted when present; employmentType normalised; remote (workplaceType first,
    then regex) / datePosted derived; canonical `/careers/{org}/{jobUuid}` detail + apply URL
    built; per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP
    4xx/400 / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.EDDY`).
  - **Estimate:** 0.5 day

## Phase 405 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EDDY = 'eddy'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 405 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/eddy.e2e-spec.ts`
  - **Acceptance:** known-tenant (organization UUID) shape assertions (guarded; asserts
    `site === Site.EDDY`, `atsType === 'eddy'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/396-source-ats-eddy/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON-API list + detail surface, org-UUID requirement, URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + careers host `app.eddy.com`; the careers SPA bundle
    (`/careers/assets/main-*.js`) builds its data calls against
    `/api/ats/public/job-opening/organization/{organizationUuid}` (list) and
    `/api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid}` (detail).
  - Both public endpoints answer anonymously and strictly require the **organization UUID**
    (a non-UUID vanity slug returns HTTP 400 "Failed to convert 'organizationUuid'"). A real
    org UUID returned HTTP 200 with a JSON role array; a real per-role detail returned HTTP
    200 with `{ title, employmentType, description, workplaceType, … }`; an empty org
    returned `[]`, exercising the empty-board path. Confidence: **verified**.
- The role data is a plain JSON API (not server-embedded HTML, not a separate authenticated
  API), so no headless browser is required.
- The list records are lightweight (`jobOpeningUuid`, `title`, `departmentId`, `locationId`,
  `postedDate`); the description / employmentType / workplaceType live on the per-role detail
  record, fetched best-effort and bounded by `EDDY_MAX_DETAIL_FETCHES` via `Promise.allSettled`.
- The anonymous surface exposes location only as an opaque `locationId` (resolvable to a
  name solely via the authenticated `/hr/location/{org}/{id}` endpoint), so `location` is
  left null; the tenant token is an opaque UUID, surfaced as the company name as-is.
