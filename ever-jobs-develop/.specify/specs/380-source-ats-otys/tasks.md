# Tasks: 380 — OTYS ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 389 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-otys/{package.json,tsconfig.json,src/index.ts,src/otys.module.ts}`
  - **Acceptance:** package compiles; barrel exports `OtysModule` + `OtysService`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/otys.types.ts`, `src/otys.constants.ts`
  - **Acceptance:** index-link + JSON-LD `JobPosting` + normalised interfaces modelled
    with JSDoc; host template, root domain, alt domains, index paths, default results,
    page cap, request headers, job-link regex, JSON-LD / og: / title regexes, and
    remote regex defined; verified public surface documented with date 2026-06-03 and
    the named real tenant (`middendorprecruitment`); the authenticated Web API
    (`webapi.otys.app`, 401) documented as a non-goal.
  - **Estimate:** 0.25 day

- [x] T03 — `OtysService` implementing `IScraper`
  - **Files:** `src/otys.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from url/slug; index HTML probed
    + walked for `/vacatures/vacature-{slug}-{id}-{n}.html` links + deduped by numeric
    `{id}`; detail page fetched (`Promise.allSettled` fan-out) + normalised; `{id}` →
    `atsId`; HTTP 4xx / DNS → empty/skip; description format-converted; JSON-LD
    `JobPosting` preferred with `og:` / `<title>` / slug / body fallbacks; department /
    employmentType / location / remote derived; stop at `resultsWanted` (page cap);
    canonical public job URL built; never throws; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 389 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.OTYS` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 389 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/otys.e2e-spec.ts`
  - **Acceptance:** known-tenant (`companyUrl` for `middendorprecruitment`) shape
    assertions (guarded; asserts `site === Site.OTYS`, `atsType === 'otys'`,
    `atsId`/`jobUrl` defined), `companySlug` resolution path, no-slug/url empty,
    unknown-host graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/380-source-ats-otys/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, vacancy URL shape,
    tenant resolution, mapping table, Web-API non-goal, and risks documented; tasks
    marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant addressing (customer-hosted recruitment sites and the OTYS
    application host `{clientprefix}.otysapp.com`), confirmed with the named real
    tenant `middendorprecruitment` (Middendorp Recruitment,
    `https://www.middendorprecruitment.nl/vacatures.html`).
  - The server-rendered index HTML and the per-role detail URL shape
    `/vacatures/vacature-{slug}-{id}-{websiteId}.html` (e.g.
    `/vacatures/vacature-senior-accountmanager-amsterdam-noord-holland-fulltime-1481738-11.html`,
    `/vacatures/vacature-brand-manager-32-40-uur-1481267-11.html`), with the numeric
    `{id}` segment as the per-role ATS id. Confidence: **verified**.
- The board is server-rendered HTML fed to Google for Jobs, so detail pages are parsed
  via schema.org `JobPosting` JSON-LD with `og:` / `<title>` / URL-slug / body
  fallbacks. The observed tenant uses a thin legacy template (no JSON-LD/og:), handled
  by the slug-title + body-email fallback path.
- The OTYS REST Web API (`https://webapi.otys.app/api/vacancies`) and OWS JSON-RPC
  require a per-tenant API key (unauthenticated Web API → HTTP 401), so they are a
  non-goal; the public recruitment-site HTML is the consumed surface.
