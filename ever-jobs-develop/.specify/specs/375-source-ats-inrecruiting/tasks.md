# Tasks: 375 — In-recruiting (Intervieweb) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 384 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-inrecruiting/{package.json,tsconfig.json,src/index.ts,src/inrecruiting.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/inrecruiting.types.ts`, `src/inrecruiting.constants.ts`
  - **Acceptance:** index-card + JSON-LD + normalised interfaces modelled with JSDoc;
    root domain, default lang, career/jobs path segments, default results, detail cap,
    request headers, job-link regex (both addressing shapes), id-from-token regex,
    card-field regex, JSON-LD / og: / title regexes, and remote regex defined; verified
    public surface documented with date 2026-06-03 and the named real tenants
    (`rinascente`, `orbyta`).
  - **Estimate:** 0.25 day

- [x] T03 — `InRecruitingService` implementing `IScraper`
  - **Files:** `src/inrecruiting.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; target resolved from slug/url (sub-domain +
    path-tenant shapes); index HTML walked for `/jobs/{slug}-{id}/{lang}/` links +
    deduped by `{id}`; sliced to `resultsWanted` (detail cap); detail pages fetched via
    `Promise.allSettled` + normalised (JSON-LD preferred, og: / `<title>` / card
    fallbacks); trailing `{id}` → `atsId`; HTTP 4xx → empty/skip; description
    format-converted; department / employmentType / location / remote derived; canonical
    public job URL used; `tsc --noEmit` clean (modulo the centrally-added enum member).
  - **Estimate:** 0.5 day

## Phase 384 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.INRECRUITING = 'inrecruiting'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 384 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/inrecruiting.e2e-spec.ts`
  - **Acceptance:** known-tenant (`rinascente`) shape assertions (guarded; asserts
    `site === Site.INRECRUITING`, `atsType === 'inrecruiting'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/375-source-ats-inrecruiting/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, both addressing
    shapes, URL shape, tenant resolution, mapping table, and non-goals documented; tasks
    marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + both tenant-addressing shapes on `*.intervieweb.it`, confirmed with the
    named real tenants `rinascente` (RINASCENTE, sub-domain tenant,
    `https://rinascente.intervieweb.it/en/career`) and `orbyta` (ORBYTA / "Inrecruiting
    SMART", path tenant, `https://inrecruiting.intervieweb.it/orbyta/en/career`).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/jobs/{slug}-{id}/{lang}/` (e.g. `/jobs/communication-manager-410/en/`,
    `/jobs/angular-developer-401435/en/`), with the trailing numeric `{id}` segment as
    the per-role ATS id. Confidence: **verified**.
- The classic detail page embeds a schema.org `JobPosting` JSON-LD block; the "SMART"
  path-tenant detail variant omits it, so the adapter parses `og:` meta / `<title>` /
  listing-card fields (Location, Functional Area) as defensive fallbacks. No separate
  JSON feed / RSS / sitemap is relied upon — the index HTML is enumerated for
  `/jobs/{slug}-{id}/{lang}/` links and each detail page is parsed.
- The index lists every open role in one document (no server-side pagination); the
  adapter collects deduped links, slices to `resultsWanted` (bounded by a detail cap),
  then fetches each role's detail page with `Promise.allSettled`. De-dup is by `atsId`
  (`{id}`).
