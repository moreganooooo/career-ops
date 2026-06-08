# Tasks: 366 — Scout Talent ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 375 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-scouttalent/{package.json,tsconfig.json,src/index.ts,src/scouttalent.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/scouttalent.types.ts`, `src/scouttalent.constants.ts`
  - **Acceptance:** index-link + JSON-LD + normalised interfaces modelled with
    JSDoc; host template, root domain, alt domains, index path, default results,
    page cap, request headers, job-link regex, JSON-LD / og: / title regexes, and
    remote regex defined; verified public surface documented with date 2026-06-03
    and the named real tenant (`krg`).
  - **Estimate:** 0.25 day

- [x] T03 — `ScoutTalentService` implementing `IScraper`
  - **Files:** `src/scouttalent.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; index HTML
    walked for `/jobs/{code}-{slug}` links + deduped; detail page fetched +
    normalised; `{code}` → `atsId`; HTTP 4xx → empty/skip; description
    format-converted; department / employmentType / location / remote derived; stop
    at `resultsWanted` (page cap); canonical public job URL built; `tsc --noEmit`
    clean.
  - **Estimate:** 0.5 day

## Phase 375 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SCOUTTALENT` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 375 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/scouttalent.e2e-spec.ts`
  - **Acceptance:** known-tenant (`krg`) shape assertions (guarded; asserts
    `site === Site.SCOUTTALENT`, `atsType === 'scouttalent'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/366-source-ats-scouttalent/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.applynow.net.au`, confirmed with the
    named real tenant `krg` (Ku-ring-gai Council, `https://krg.applynow.net.au/`).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/jobs/{code}-{slug}` (e.g. `/jobs/J9380-manager-corporate-finance`,
    `/jobs/PP05040-parking-ranger`), with the leading `{code}` segment as the
    per-role ATS id. Confidence: **verified**.
- The board is server-rendered HTML; no separate JSON feed / RSS / sitemap is
  exposed (`/jobs.json`, `/jobs.rss`, `/sitemap.xml` all 404), so the index HTML
  is enumerated for `/jobs/{code}-{slug}` links and each detail page is parsed via
  schema.org `JobPosting` JSON-LD with `og:` / `<title>` / body fallbacks.
- The index lists every open role in one document (no server-side pagination); the
  adapter collects deduped links and slices to `resultsWanted` (bounded by a page
  cap), then fetches each role's detail page. De-dup is by `atsId` (`code`).
