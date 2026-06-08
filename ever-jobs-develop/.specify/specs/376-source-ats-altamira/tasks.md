# Tasks: 376 — Altamira ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 385 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-altamira/{package.json,tsconfig.json,src/index.ts,src/altamira.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/altamira.types.ts`, `src/altamira.constants.ts`
  - **Acceptance:** index-anchor + normalised interfaces modelled with JSDoc; root
    domain, host template, jobs path, default results, page cap, request headers,
    SEO + query job-link regexes, and remote regex defined; verified public surface
    documented with date 2026-06-03 and the named real tenant (`etinars`).
  - **Estimate:** 0.25 day

- [x] T03 — `AltamiraService` implementing `IScraper`
  - **Files:** `src/altamira.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; origin resolved from slug/url (preserving
    `*.sites`); index HTML walked for `/jobs/{slug}-{JobID}.htm` + `job-details?JobID=`
    links + deduped; `{JobID}` → `atsId`; title + location recovered from the SEO
    slug; description enriched best-effort from the detail body via
    `Promise.allSettled`; HTTP 4xx → empty/skip; description format-converted;
    location / remote derived; stop at `resultsWanted` (page cap); canonical public
    job URL built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 385 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ALTAMIRA` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 385 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/altamira.e2e-spec.ts`
  - **Acceptance:** known-tenant (`etinars` via `companyUrl`) shape assertions
    (guarded; asserts `site === Site.ALTAMIRA`, `atsType === 'altamira'`,
    `atsId`/`jobUrl` defined), bare-`companySlug` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network
    tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/376-source-ats-altamira/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, URL shapes, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.altamiraweb.com` (incl. the
    `*.sites.altamiraweb.com` variant), confirmed with the named real tenant
    `etinars` (Etinars, `https://etinars.sites.altamiraweb.com/`); other live tenants
    seen: `rina` (RINA), `zegnacareers` (EZ Service Srl).
  - The server-rendered `/jobs` index HTML and the per-role detail URL shapes
    `/jobs/{slug}-{JobID}.htm` (e.g.
    `…-Italia-Veneto-Padova-561445691.htm`) and `/jobs/job-details?JobID=561445691`,
    with the trailing numeric `{JobID}` as the per-role ATS id, and the detail
    `<title>` shape "{Title} in {City} | Careers at {Tenant}". Confidence: **verified**.
- The board is server-rendered HTML; no separate JSON feed / RSS / sitemap is exposed,
  and no schema.org `JobPosting` JSON-LD or `og:` meta is emitted — so the index HTML
  is enumerated for the job anchors (title + location recovered from the SEO slug) and
  each detail page is fetched only to enrich the description body (best-effort).
- The index may paginate (`?PagerAnnunci={n}`); the adapter walks pages until enough
  roles or a page adds nothing new (bounded by a page cap), deduped by `atsId`
  (`JobID`), then slices to `resultsWanted`.
