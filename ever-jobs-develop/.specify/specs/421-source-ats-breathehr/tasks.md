# Tasks: 421 — Breathe HR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 430 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-breathehr/{package.json,tsconfig.json,src/index.ts,src/breathehr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service; `outDir` points at
    `dist/packages/source-ats-breathehr`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/breathehr.types.ts`, `src/breathehr.constants.ts`
  - **Acceptance:** vacancy-ref + raw-page + normalised `BreatheHrJob` interfaces modelled with
    JSDoc; root domain, vacancy host (`hr.breathehr.com`), origin, `/v/` path prefix, the vacancy
    URL builder, the share-link / bare-token / trailing-id regexes, default results (100), page
    cap (100), `DEFAULT_TIMEOUT_SECONDS = 15`, request headers, and the remote regex defined;
    verified public surface documented with date 2026-06-04 and the named real tenant "Partners
    in Advocacy" (`/v/finance-administration-officer-43173`, `/v/advocacy-worker-43996`).
  - **Estimate:** 0.25 day

- [x] T03 — `BreatheHrService` implementing `IScraper`
  - **Files:** `src/breathehr.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; a direct `/v/{slug}-{id}` URL / bare token resolves to
    one vacancy; otherwise `companyUrl` is fetched as HTML and every embedded
    `hr.breathehr.com/v/{slug}-{id}` link harvested (deduped by vacancy id); each per-role page
    GETted as server-rendered HTML and parsed by class selector (`.job-title`,
    `.vacancy-company`, `.salary`, `.location`, the two `.vacancy-date` blocks, `.trix-content`,
    `og:url`); trailing numeric vacancy id → `atsId`; deduped; description format-converted;
    free-text location split into city/region; remote detected by regex; `datePosted` parsed from
    "Vacancy listed" `DD/MM/YYYY` → `YYYY-MM-DD`; canonical detail + apply URL from `og:url`;
    company name from `.vacancy-company` ("Vacancy at " stripped) / `<title>`; stop at
    `resultsWanted` (bounded by the page cap); per-request timeout capped at 15s on BOTH
    `timeout` + `requestTimeout`; transport failure aborts the drain while HTTP 4xx / malformed
    HTML → empty/partial; never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.BREATHEHR`).
  - **Estimate:** 0.5 day

## Phase 430 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BREATHEHR = 'breathehr'` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present. (Orchestrator-owned.)
  - **Estimate:** 0.25 day

## Phase 430 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/breathehr.e2e-spec.ts`
  - **Acceptance:** known-vacancy (`advocacy-worker-43996`) shape assertions (guarded; asserts
    `site === Site.BREATHEHR`, `atsType === 'breathehr'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/421-source-ats-breathehr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** the public, anonymous `/v/{slug}-{id}` share-page surface, the
    careers-page harvest strategy, the trailing-id ATS-id rule, the class-selector parse, the
    mapping table, and the non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-04, no authentication required:
  - Per-role public share page `GET https://hr.breathehr.com/v/{slug}-{id}` returns 200
    server-rendered HTML (e.g. `/v/finance-administration-officer-43173`,
    `/v/advocacy-worker-43996`); an unknown token returns HTTP 404. `app.breathehr.com`
    301-redirects to `hr.breathehr.com`; `/recruitment/vacancies` 302-redirects to
    `login.breathehr.com`.
  - Page markup confirmed: `<div class='job-title'>`, `<p class='vacancy-company'>` ("Vacancy at
    Partners in Advocacy"), `<div class='salary'>`, `<div class='location'>`, the two
    `<div class='vacancy-date'>` blocks ("Vacancy listed" 25/09/2025, "Application deadline"
    21/11/2025), and the `<div class='trix-content'>` description body.
  - End-to-end parse confirmed live: `/v/advocacy-worker-43996` → title "Advocacy Worker",
    company "Partners in Advocacy", location "Edinburgh", `atsId` "43996",
    `atsType` "breathehr", a parsed `datePosted`, and a non-empty description. Confidence:
    **verified**.
- The role data is server-rendered HTML (no JSON-LD, no machine feed), so it is parsed by class
  selector; no headless browser is required.
- Breathe hosts no public per-tenant index (the tenant sub-domain and management board redirect to
  login), so the multi-tenant index is the tenant's OWN careers page (`companyUrl`); the adapter
  harvests the embedded `/v/{slug}-{id}` share links, dedupes by ATS id, and stops once
  `resultsWanted` roles are collected.
