# Tasks: 353 — ExactHire ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 353 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-exacthire/{package.json,tsconfig.json,src/index.ts,src/exacthire.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/exacthire.types.ts`, `src/exacthire.constants.ts`
  - **Acceptance:** normalised sitemap/job/JSON-LD interfaces modelled with JSDoc;
    career host template, root domain, sitemap path, job-URL/id, sitemap-loc,
    lastmod, JSON-LD, og:/title/keywords and remote regexes, default results, and
    request headers defined; public sitemap + detail-page surface documented with
    verification date 2026-06-03 (and the live-fetch caveat / verified=false).
  - **Estimate:** 0.25 day

- [x] T03 — `ExactHireService` implementing `IScraper`
  - **Files:** `src/exacthire.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; sitemap
    fetched + parsed for `/jobs/{id}.html` entries; detail pages parsed (JSON-LD
    preferred, `og:`/`<title>` fallback); URL job id → `atsId`; HTTP 4xx → empty/
    skip; de-dup by `atsId`; description format-converted; department /
    employmentType / location / remote / company derived; slice to `resultsWanted`
    before fetching details; manual type-review clean.
  - **Estimate:** 0.5 day

## Phase 353 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EXACTHIRE = 'exacthire'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 353 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/exacthire.e2e-spec.ts`
  - **Acceptance:** known-tenant (`aflcio`) shape assertions (guarded; asserts
    `site === Site.EXACTHIRE`, `atsType === 'exacthire'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/353-source-ats-exacthire/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + detail-page surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface confirmed 2026-06-03 via the public Google index (ExactHire ships its
  ATS as "HireCentric"; tenants front a public board at
  `{tenant}.hirecentric.com/jobsearch/`, detail pages at `/jobs/{id}.html`):
  - `https://aflcio.hirecentric.com/jobsearch/` — AFL-CIO public board.
  - `https://aflcio.hirecentric.com/jobs/230695.html` — indexed as
    "Senior Social Media Strategist - Washington, DC - AFL-CIO Jobs".
  - Sibling tenants on the same `{tenant}.hirecentric.com/jobs/{id}.html` pattern:
    `myus`, `coadvantage`, `phihelico`, `ambu`, `spokaneproduce`, `employindy`,
    `cumminsbhs`, `apexbg`.
  Confidence: **plausible/documented (verified=false)** — the tenant
  `*.hirecentric.com` sub-domains were not directly reachable from the build
  environment's DNS resolver (apex `hirecentric.com` resolved; `www…/jobsearch/`
  returned a real HTTP 404), so a live unauthenticated 200 could not be captured.
- No authenticated ExactHire / HireCentric API is used; job data is taken from
  the public sitemap + detail pages only.
- The sitemap enumerates every open role in one document (no pagination); de-dup
  by `atsId`; role set sliced to `resultsWanted` before fetching details (default 100).
