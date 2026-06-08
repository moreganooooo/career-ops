# Tasks: 343 — Beetween ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 343 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-beetween/{package.json,tsconfig.json,src/index.ts,src/beetween.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/beetween.types.ts`, `src/beetween.constants.ts`
  - **Acceptance:** inlined-state payload, job, and scraped-offer interfaces
    modelled with JSDoc; portal host/context, portal path template, offer-link /
    public-id / inline-state regexes, default results, and request headers
    defined; public career surface documented with verification date 2026-06-03
    and the `verified: false` note.
  - **Estimate:** 0.25 day

- [x] T03 — `BeetweenService` implementing `IScraper`
  - **Files:** `src/beetween.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug (portal path)
    or url (verbatim); career page fetched once; inlined-JSON parsed first then
    HTML offer-link scrape fallback; HTTP 4xx → empty; de-dup by `atsId`;
    description format-converted; slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 343 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BEETWEEN` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 343 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/beetween.e2e-spec.ts`
  - **Acceptance:** known-tenant (Beetween's own career site via `companyUrl` and
    `companySlug: 'beetween'`) shape assertions (guarded; asserts
    `site === Site.BEETWEEN`, `atsType === 'beetween'`, `atsId`/`jobUrl`
    defined), no-slug/url empty, unknown-tenant graceful, `resultsWanted`
    honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/343-source-ats-beetween/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-page surface, wire shape, tenant resolution,
    mapping table, and non-goals documented; verification gap recorded
    (`verified: false`); tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Public career surface confirmed live 2026-06-03 against Beetween's own career
  site (`https://recrutement.beetween.fr/offres-emploi/` → 13 open roles at
  `/poste/{publicId}-{slug}/`, ids such as `ulx92rl1lu`, `koau35qzz6`,
  `23wloovpz9`), no authentication required; canonical portal at
  `https://emploi.beetween.com/WeaselWeb/p/`.
- Beetween's documented API is a PUSH connector (offers pushed OUT to job boards)
  plus an application-submission endpoint; there is **no documented public READ
  JSON endpoint** for a tenant's offer list, and the career SPA / `api` hosts were
  not reachable from the verification sandbox. The adapter consumes the public
  career page (inlined-JSON-first, `/poste/{publicId}-{slug}/` link-scrape
  fallback). Confidence: **`verified: false`** (public surface confirmed; no
  byte-confirmed JSON read endpoint).
- The career page lists every open role in one document (no pagination consumed);
  de-dup by `atsId` (public id); result-set sliced client-side to `resultsWanted`
  (default 100).
