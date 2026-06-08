# Tasks: 410 — Recruiteze ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 410 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-recruiteze/{package.json,tsconfig.json,src/index.ts,src/recruiteze.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/recruiteze.types.ts`, `src/recruiteze.constants.ts`
  - **Acceptance:** grid-envelope + role + normalised interfaces modelled with JSDoc; career
    host suffix, root domain, board path, grid path, companyId regex, page size, default
    results, page cap, request headers, and remote regex defined; verified public surface
    documented with date 2026-06-03 and named real tenants (`spearmc`, `allianceepc`,
    `mobility4all`, `infostructures`, `augustineinstitute`).
  - **Estimate:** 0.25 day

- [x] T03 — `RecruitezeService` implementing `IScraper`
  - **Files:** `src/recruiteze.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant resolved from slug/url; board page GETted and
    encrypted `companyId` harvested from `#hdnCompanyID`; public grid `POST /Jobs/LoadFilteredJobs`
    POSTed with the form body; `{ draw, recordsTotal, recordsFiltered, data }` envelope read;
    `data` narrowed; pages drained by `start`+`length` bounded by a page cap and
    `recordsFiltered`; numeric `ID` → `atsId`; deduped; description (`Snippet`) format-converted
    when present; structured location / remote (regex) / datePosted derived; canonical detail +
    apply URL taken from `Url`; company name de-slugified from the tenant; stop at
    `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`;
    missing token / HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit`
    clean (modulo the orchestrator-supplied `Site.RECRUITEZE`).
  - **Estimate:** 0.5 day

## Phase 410 — Registration (orchestrator-owned)

- [ ] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RECRUITEZE = 'recruiteze'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Note:** owned by the orchestrator wiring step; this plugin does not edit shared files.
  - **Estimate:** 0.25 day

## Phase 410 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/recruiteze.e2e-spec.ts`
  - **Acceptance:** known-tenant (`spearmc`) shape assertions (guarded; asserts
    `site === Site.RECRUITEZE`, `atsType === 'recruiteze'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/410-source-ats-recruiteze/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-board grid surface, token harvest, drain strategy, `Url`
    detail shape, tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.recruiteze.com/Jobs/AllJobs`, confirmed with named
    real tenants `spearmc` (SpearMC), `allianceepc`, `mobility4all`, `infostructures`,
    `augustineinstitute`.
  - The hidden `#hdnCompanyID` token harvested per tenant (`spearmc` → `8RhggVIrTZ8wPYlGstD7LA==`,
    `allianceepc` → `olfnCQ6yuy5CRRnPWrVw0g==`, `mobility4all` → `FmDrMk5wVnZ8uphAwrFdUg==`).
  - The public grid `POST /Jobs/LoadFilteredJobs` returned the
    `{ draw, recordsTotal, recordsFiltered, data }` envelope: **9 live roles** for `spearmc`
    (first role `ID` 15293 "Grants/PPM Lead for PeopleSoft to Oracle Cloud Migration",
    `Location` `Remote/California`, `PostedDate` `30 Jan 2025`, `Url`
    `https://SpearMC.recruiteze.com/jobs/jobdetail?id=urbC%2ftDVyBjlfvk6Aeq5fg%3d%3d`). The
    endpoint needed no bearer token. Confidence: **verified**.
- The role data is a clean JSON DataTables endpoint (not a JS island, not an SSR DOM), so it is
  consumed as a REST endpoint; no headless browser is required. The only HTML touched is the
  one-time GET of the board page to harvest the `companyId` token.
- The grid paginates (server-side DataTables `start` / `length`, `recordsFiltered`); the adapter
  requests `length=100`, drains pages bounded by a page cap, dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected.
- `department` / `employmentType` are emitted null: the grid carries no structured category /
  employment-type facet on each row (only state / job-type filter facets, used server-side).
