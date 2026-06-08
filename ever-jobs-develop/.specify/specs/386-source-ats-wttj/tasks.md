# Tasks: 386 — Welcome to the Jungle (WTTJ) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 395 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-wttj/{package.json,tsconfig.json,src/index.ts,src/wttj.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/wttj.types.ts`, `src/wttj.constants.ts`
  - **Acceptance:** Algolia hit + office + organization + normalised interfaces modelled
    with JSDoc; root domain, web origin, Algolia app id / search key / localised indexes,
    DSN query-URL + canonical company-jobs URL builders, default lang, page size, default
    results, page cap, capped request timeout, request headers (incl. Referer allow-list +
    `x-algolia-*`), and remote regex defined; verified public surface documented with date
    2026-06-03 and the named real company (`groupe-partnaire`).
  - **Estimate:** 0.25 day

- [x] T03 — `WelcomeToTheJungleService` implementing `IScraper`
  - **Files:** `src/wttj.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; slug resolved from slug/url; index queried across
    localised variants with `facetFilters: [["organization.slug:{slug}"]]`, paged + deduped
    by `atsId`; `reference` → `atsId` with `objectID` fallback; description assembled from
    `key_missions`/`profile`/`summary` and format-converted; department / location /
    employmentType / remote / datePosted derived; canonical detail + apply URLs built;
    stop at `resultsWanted`; per-request timeout capped at 15s (both `timeout` +
    `requestTimeout`); HTTP 4xx / 5xx / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.WTTJ`).
  - **Estimate:** 0.5 day

## Phase 395 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.WTTJ = 'wttj'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 395 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/wttj.e2e-spec.ts`
  - **Acceptance:** known-company (`groupe-partnaire`) shape assertions (guarded; asserts
    `site === Site.WTTJ`, `atsType === 'wttj'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-company graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/386-source-ats-wttj/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public Algolia index surface, query strategy, URL shape, slug
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + company host pattern `welcometothejungle.com/{lang}/companies/{slug}/jobs`,
    confirmed with the named real company `groupe-partnaire` (Groupe Partnaire).
  - The public Algolia index `wttj_jobs_production_en` (app `CSEKHVMS53`, embedded
    search-only key) answered the documented POST query — with a Referer of
    `https://www.welcometothejungle.com/` (the DSN allow-lists this origin; without it the
    DSN returns "Method not allowed with this referer") — returning **48 live roles**
    (`nbHits: 48`) for `facetFilters: [["organization.slug:groupe-partnaire"]]`, each with a
    `reference` guid + `slug` mapping to the canonical detail URL
    `/companies/{org.slug}/jobs/{job.slug}`. Confidence: **verified**.
- The role data is the Algolia hit set; no separate JSON feed / RSS is needed, and no
  headless browser is required. The richest per-role body is assembled from the
  `key_missions` / `profile` / `summary` fragments; the `reference` guid is the per-role
  ATS id.
- The index pages results; the adapter walks pages (bounded by the company's reported
  `nbPages` and a hard page cap), dedupes by `atsId`, and slices to `resultsWanted`.
- The structured `remote` token is the authoritative remote signal (any value other than a
  bare "no" / "onsite" marks the role remote-capable); a regex over title / location /
  profession is a defensive fallback.
