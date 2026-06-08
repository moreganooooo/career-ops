# Tasks: 374 — Softy ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 383 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-softy/{package.json,tsconfig.json,src/index.ts,src/softy.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/softy.types.ts`, `src/softy.constants.ts`
  - **Acceptance:** index-card + normalised interfaces modelled with JSDoc; root
    domain, scheme, offers path, offer path, default results, detail-fetch cap,
    request headers, offer-link regex, published-date regex, contract regex, and
    remote regex defined; verified public surface documented with date 2026-06-03
    and the named real tenants (`ensio`, `groupecls`, `recrutcl`).
  - **Estimate:** 0.25 day

- [x] T03 — `SoftyService` implementing `IScraper`
  - **Files:** `src/softy.service.ts`
  - **Acceptance:** FR-1…FR-11 satisfied; tenant resolved from slug/url; index HTML
    walked for `/offre/{ID}-{slug}` anchors + deduped; labelled card fields recovered
    (location, contract, "Mise en ligne le"); `{ID}` → `atsId`; detail body fetched
    best-effort via `Promise.allSettled`; HTTP 4xx / DNS → empty/skip; description
    format-converted; employmentType / location / remote / datePosted derived; stop at
    `resultsWanted` (detail-fetch cap); canonical public job URL built; `scrape()`
    never throws; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 383 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SOFTY = 'softy'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 383 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/softy.e2e-spec.ts`
  - **Acceptance:** known-tenant (`groupecls`) shape assertions (guarded; asserts
    `site === Site.SOFTY`, `atsType === 'softy'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/374-source-ats-softy/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.softy.pro`, confirmed with named real
    tenants `ensio` (`https://ensio.softy.pro/offres`, 85 open roles), `groupecls`
    (`https://groupecls.softy.pro/offres`) and `recrutcl` (`https://recrutcl.softy.pro/offers`).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/offre/{ID}-{slug}` (e.g. `/offre/208303-responsable-marches-produits-product-manager-h-f`,
    `/offre/209208-technicien-installation-equipement-surete-electronique-h-f`), with
    the leading numeric `{ID}` segment as the per-role ATS id. Confidence: **verified**.
- The board is server-rendered HTML; the detail pages carry no schema.org `JobPosting`
  JSON-LD and no og: meta. The index card text (title, location, contract,
  "Mise en ligne le DD/MM/YYYY") is the structured listing-level data; each detail
  page body is fetched best-effort for a richer description.
- The index lists every open role in one document; a `?page=N` query form 404s on the
  surveyed tenants, so the adapter parses the single index document for all
  `/offre/{ID}-{slug}` anchors and slices to `resultsWanted` (no server-side page
  walk), then fetches each role's detail body via `Promise.allSettled`. De-dup is by
  `atsId` (`{ID}`).
