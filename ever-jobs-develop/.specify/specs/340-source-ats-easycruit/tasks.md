# Tasks: 340 — EasyCruit ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 340 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-easycruit/{package.json,tsconfig.json,src/index.ts,src/easycruit.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/easycruit.types.ts`, `src/easycruit.constants.ts`
  - **Acceptance:** parsed vacancy / version / department interfaces modelled with
    JSDoc; host/path templates, default iso + results cap, request headers, and
    vacancy/version/department block regexes defined; verified wire surface
    documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `EasyCruitService` implementing `IScraper`
  - **Files:** `src/easycruit.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; vacancy-list
    feed fetched as text and parsed with the tolerant in-house XML parser; preferred
    language version selected; HTTP 4xx → empty; de-dup by `atsId`; description
    synthesised + format-converted; slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 340 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EASYCRUIT` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 340 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/easycruit.e2e-spec.ts`
  - **Acceptance:** known-tenant (`esvagt`) shape assertions (guarded;
    asserts `site === Site.EASYCRUIT`, `atsType === 'easycruit'`,
    `atsId`/`jobUrl` defined), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/340-source-ats-easycruit/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public vacancy-list-feed surface, XML wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the Esvagt A/S tenant
  (`https://esvagt.easycruit.com/export/xml/vacancy/list.xml`), no authentication
  required:
  - `GET https://esvagt.easycruit.com/export/xml/vacancy/list.xml` → HTTP 200,
    `VacancyList` (namespace `urn:EasyCruit`) with `Vacancy` elements carrying
    `id`/`date_start`/`date_end`/`date_modified` attributes,
    `Versions/Version[@language]` (Title, Location, Engagement, Region,
    Categories) and `Departments/Department[@id]` (Name, VacancyURL,
    ApplicationURL).
  - Public HTML career page `https://esvagt.easycruit.com/?iso=gb` links jobs as
    `/vacancy/{vacancyId}/{departmentId}?iso=gb`.
  Confidence: **verified** (byte-confirmed feed root + vacancy items + HTML page).
- Schema published at `https://www.easycruit.com/dtd/vacancy-list.xsd`.
- The authenticated Reporting API (OAuth2 via Visma Connect) is an explicit
  non-goal; job data lives only in the anonymous vacancy-list feed.
- The feed returns every open role in one envelope (no pagination); de-dup by
  `atsId`; result-set sliced client-side to `resultsWanted` (default 100).
- No XML-parser dependency added; the flat feed is parsed with tolerant in-house
  regexes (CDATA + entity decoding).
