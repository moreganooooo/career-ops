# Tasks: 381 — Umantis (Haufe Talent) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 390 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-umantis/{package.json,tsconfig.json,src/index.ts,src/umantis.module.ts}`
  - **Acceptance:** package compiles; barrel exports `UmantisModule` + `UmantisService`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/umantis.types.ts`, `src/umantis.constants.ts`
  - **Acceptance:** index-link + detail + normalised interfaces modelled with JSDoc;
    root domain, host templates (`recruitingapp-{tenantId}.umantis.com` +
    `.de.umantis.com`), index path, lang query, default results, page cap, request
    headers, vacancy-link regex, date regex, and remote regex defined; verified public
    surface documented with date 2026-06-03 and the named real tenant (`5476`, ASMPT).
  - **Estimate:** 0.25 day

- [x] T03 — `UmantisService` implementing `IScraper`
  - **Files:** `src/umantis.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; host + id resolved from slug/url; index HTML
    walked for `/Vacancies/{ID}/Description/{lang}` links + deduped; detail page fetched
    (fanned out with `Promise.allSettled`) + normalised; `{ID}` → `atsId`; HTTP 4xx →
    empty/skip; description format-converted; employmentType / location / remote /
    datePosted / applyUrl derived; stop at `resultsWanted` (page cap); canonical public
    job URL built; never throws out of `scrape()`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 390 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.UMANTIS` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 390 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/umantis.e2e-spec.ts`
  - **Acceptance:** known-tenant (`5476.de`, ASMPT) shape assertions (guarded; asserts
    `site === Site.UMANTIS`, `atsType === 'umantis'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/381-source-ats-umantis/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered index + detail surface, vacancy URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `recruitingapp-{tenantId}.umantis.com` (and the
    `.de.umantis.com` variant), confirmed with the named real tenant `5476` (ASMPT,
    `https://recruitingapp-5476.de.umantis.com/Jobs/All`). Other live tenants seen:
    `2698` (Swiss TPH), `2717` (Generali), `2388` (Haufe Group).
  - The server-rendered index HTML and the per-role detail URL shape
    `/Vacancies/{ID}/Description/{langCode}` (e.g. `/Vacancies/1410/Description/1`),
    with the numeric `{ID}` as the per-role ATS id, plus the detail page `<title>`
    ("{title} | {organisation}"), location, `DD.MM.YYYY` posting date, and apply link.
    Confidence: **verified**.
- The board is server-rendered HTML; no separate JSON feed / RSS is relied upon, so
  the `/Jobs/All` index is enumerated for `/Vacancies/{ID}/Description/{lang}` links
  and each detail page is parsed defensively (`<title>`, body, date token, apply link,
  og: fallbacks).
- The index lists every open role in one document (no server-side pagination); the
  adapter collects deduped links and slices to `resultsWanted` (bounded by a page
  cap), then fans out detail fetches with `Promise.allSettled`. De-dup is by `atsId`.
