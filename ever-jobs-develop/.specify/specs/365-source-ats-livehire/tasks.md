# Tasks: 365 — LiveHire ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 374 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-livehire/{package.json,tsconfig.json,src/index.ts,src/livehire.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/livehire.types.ts`, `src/livehire.constants.ts`
  - **Acceptance:** widget-fragment + normalised role interfaces modelled with JSDoc;
    base URL, root domain, widget path, careers path, default results, page cap,
    request headers, job-link regex, and remote regex defined; verified public
    surface documented with date 2026-06-03 and the named real tenant (`perthmint`).
  - **Estimate:** 0.25 day

- [x] T03 — `LiveHireService` implementing `IScraper`
  - **Files:** `src/livehire.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; widget HTML
    fetched as text + parsed by anchoring on the canonical job-link pattern; labelled
    card fields recovered; opaque `{ID}` → `atsId`; HTTP 4xx/5xx/DNS → empty/skip;
    description format-converted; employmentType / location / remote / date derived;
    stop at `resultsWanted`; canonical public job URL built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 374 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.LIVEHIRE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 374 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/livehire.e2e-spec.ts`
  - **Acceptance:** known-tenant (`perthmint`) shape assertions (guarded; asserts
    `site === Site.LIVEHIRE`, `atsType === 'livehire'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/365-source-ats-livehire/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered widget surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant addressing `www.livehire.com/careers/{tenant}/jobs`, mirrored
    by the public server-rendered widget
    `www.livehire.com/widgets/job-listings/{tenant}`, confirmed with the named real
    tenant `perthmint` (The Perth Mint, 14 open roles). Other live tenants observed:
    `melbourneairport`, `livehire`, `workandtraining`, `juniper`, `nextsource`.
  - The canonical public job URL shape
    `https://www.livehire.com/careers/{tenant}/job/{CODE}/{ID}/{title-slug}` and the
    labelled card fields (title, Location, Work Type, Salary Range, Published At)
    confirmed in the widget HTML. Confidence: **verified**.
- The careers board (`/careers/{tenant}/jobs`) is a client-rendered SPA whose backing
  JSON API answers HTTP 403 to non-browser clients; the server-rendered widget — which
  exposes the same tenant's roles without auth — is the surface used here.
- The widget renders the full tenant board in one document (with a client-side
  "Show more" control); the adapter parses all roles, dedupes by `atsId`, and stops
  at `resultsWanted`. A page loop (bounded by a page cap) guards future pagination.
