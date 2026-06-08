# Tasks: 342 — Talentsoft ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 342 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-talentsoft/{package.json,tsconfig.json,src/index.ts,src/talentsoft.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/talentsoft.types.ts`, `src/talentsoft.constants.ts`
  - **Acceptance:** normalised feed/offer interfaces modelled with JSDoc; career
    host templates, RSS handler path, default LCID, item/tag/reference/link/remote
    regexes, default results, and request headers defined; verified public RSS
    surface documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `TalentsoftService` implementing `IScraper`
  - **Files:** `src/talentsoft.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; RSS export
    fetched + parsed defensively (CDATA + entity decode); reference → `atsId`;
    HTTP 4xx → empty; de-dup by `atsId`; description format-converted; department
    / employmentType / location / remote derived from categories + body; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 342 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TALENTSOFT` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 342 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/talentsoft.e2e-spec.ts`
  - **Acceptance:** known-tenant (`elis`) shape assertions (guarded; asserts
    `site === Site.TALENTSOFT`, `atsType === 'talentsoft'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/342-source-ats-talentsoft/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public RSS-export surface, wire shape, host resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the Elis tenant
  (`https://elis-recrute.talent-soft.com/`), no authentication required:
  - `/offre-de-emploi/tous-les-flux-rss.aspx` advertises the all-offers feed
    `/handlers/offerRss.ashx?LCID=1036`.
  - `GET https://elis-recrute.talent-soft.com/handlers/offerRss.ashx?LCID=1036`
    → HTTP 200 RSS XML with ~326 `<item>` offers.
  - Sibling tenants on the same host pattern: `seloger`, `matmut`, `apave`,
    `groupeadp`, `macsf`.
  Confidence: **verified** (feed page + item structure confirmed live).
- The official Cegid HR JSON streaming APIs (vacancies / candidates) require
  OAuth2 client credentials and are an explicit non-goal; job data is taken from
  the public RSS export only.
- The feed returns every published offer in one response (no pagination); de-dup
  by `atsId`; result-set sliced client-side to `resultsWanted` (default 100).
