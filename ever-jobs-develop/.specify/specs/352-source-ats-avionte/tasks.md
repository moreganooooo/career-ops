# Tasks: 352 — Avionté ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 352 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-avionte/{package.json,tsconfig.json,src/index.ts,src/avionte.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/avionte.types.ts`, `src/avionte.constants.ts`
  - **Acceptance:** normalised feed/job interfaces modelled with JSDoc; feed
    origin + RSS path, `format=xml` query, item/tag/compid/job-id/remote regexes,
    default results, and request headers defined; documented public RSS/XML
    surface described with review date 2026-06-03 and the real tenant confirmed.
  - **Estimate:** 0.25 day

- [x] T03 — `AvionteService` implementing `IScraper`
  - **Files:** `src/avionte.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; build id resolved from slug/url; RSS/XML
    export fetched + parsed defensively (CDATA + entity decode); guid/id (else id
    mined from link) → `atsId`; HTTP 4xx → empty; de-dup by `atsId`; description
    format-converted; department / employmentType / location / remote derived;
    slice to `resultsWanted`; manual type-review clean against template imports.
  - **Estimate:** 0.5 day

## Phase 352 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.AVIONTE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 352 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/avionte.e2e-spec.ts`
  - **Acceptance:** known-tenant (`mdr` — Meador Staffing Services) shape
    assertions (guarded; asserts `site === Site.AVIONTE`, `atsType === 'avionte'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on
    network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/352-source-ats-avionte/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public RSS/XML-export surface, wire shape, build resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Public surface reviewed 2026-06-03 (documented by Avionté; no authentication):
  - RSS feed `https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}`
    (Job Category, Job Title, Job Location, Job URL per item); `&format=xml` adds
    description / posted date / employment type / id.
  - `GET https://www.myavionte.com/buildjobs_rss.aspx` (no `compid`) → .NET
    null-reference error (endpoint present; build id required).
  - Real tenants on the sibling portal host `*.aviontego.com`: `mdr` (Meador
    Staffing Services), `crs` (Career Strategies Inc), `gsf` (Go-Staff, Inc).
  Confidence: **documented, not byte-verified** (a specific public build id could
  not be enumerated without editor access; parser written defensively).
- The documented JSON Jobs feed (`/staff/jsonjobsv3.aspx?ID={apiKey}`) is per-
  build API-key gated and is an explicit non-goal; job data is taken from the
  public RSS/XML export only.
- The feed returns every posted job in one response (no pagination); de-dup by
  `atsId`; result-set sliced client-side to `resultsWanted` (default 100).
