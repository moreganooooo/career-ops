# Tasks: 361 — Snaphunt ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 370 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-snaphunt/{package.json,tsconfig.json,src/index.ts,src/snaphunt.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/snaphunt.types.ts`, `src/snaphunt.constants.ts`
  - **Acceptance:** normalised sitemap/JSON-LD interfaces modelled with JSDoc;
    career-site host template, sitemap path, canonical apex detail template,
    job-URL / loc / lastmod / JSON-LD / og / remote regexes, placeholder-token set,
    default results, and request headers defined; researched public surface
    documented with date 2026-06-03 and named real tenants (`snappr`, `steenbok`,
    `totalshape`, `venture`, `personalbuero`).
  - **Estimate:** 0.25 day

- [x] T03 — `SnaphuntService` implementing `IScraper`
  - **Files:** `src/snaphunt.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; tenant
    sitemap fetched + parsed; canonical apex detail pages fetched + JSON-LD
    `JobPosting` parsed defensively (recursive over arrays / `@graph`, `og:`
    fallbacks, `"undefined"`/`"null"` placeholders treated as absent); job id →
    `atsId`; HTTP 4xx → empty/skip; de-dup by `atsId`; description format-converted;
    per-job company name from `hiringOrganization.name`; department /
    employmentType / location (jobLocation, else applicant-requirement country) /
    remote derived from JSON-LD; slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 370 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SNAPHUNT` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 370 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/snaphunt.e2e-spec.ts`
  - **Acceptance:** known-tenant (`snappr`) shape assertions (guarded; asserts
    `site === Site.SNAPHUNT`, `atsType === 'snaphunt'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/361-source-ats-snaphunt/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public per-tenant sitemap + canonical apex JSON-LD detail-page
    surface, wire shape, host resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched & verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.snaphunt.com` confirmed, with named
    real tenants serving populated `/sitemap.xml` of `/job/{jobId}` entries:
    `snappr`, `steenbok`, `totalshape`, `venture`, `personalbuero`.
  - The canonical apex detail page `https://snaphunt.com/jobs/{jobId}` returns a
    fully-rendered schema.org `JobPosting` JSON-LD block (verified). The tenant
    career-site detail pages are client-rendered (their JSON-LD hydrates
    client-side with literal `"undefined"` placeholders on a no-JS fetch), so role
    detail is read from the apex page.
- Snaphunt is a marketplace, so the company is a per-job field
  (`hiringOrganization.name`), de-slugified and falling back to the tenant label.
- The per-tenant sitemap enumerates every open role in one document (no
  pagination); de-dup by `atsId`; the enumerated set is sliced client-side to
  `resultsWanted` (default 100) before detail pages are fetched.
