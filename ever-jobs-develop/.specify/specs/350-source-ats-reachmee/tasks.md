# Tasks: 350 — ReachMee ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 350 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-reachmee/{package.json,tsconfig.json,src/index.ts,src/reachmee.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/reachmee.types.ts`, `src/reachmee.constants.ts`
  - **Acceptance:** normalised feed/vacancy/target interfaces modelled with JSDoc;
    feed host template, RSS export path, default installation coordinates
    (host / customer / installation / site id / lang), item/tag/link-id/slug/remote
    regexes, default results, and request headers defined; verified public RSS
    surface documented with verification date 2026-06-03 and the real tenant
    (Örebro University).
  - **Estimate:** 0.25 day

- [x] T03 — `ReachMeeService` implementing `IScraper`
  - **Files:** `src/reachmee.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; installation resolved from slug/url; RSS
    export fetched + parsed defensively (attribute-tolerant tags + CDATA + entity
    decode); `<CommAdSeqNo>` → `atsId` (else `rmjob=` from link); HTTP 4xx → empty;
    de-dup by `atsId`; description format-converted; department / employmentType /
    location (Area1/Area2/country) / remote derived from item elements; slice to
    `resultsWanted`; `tsc --noEmit` clean apart from the not-yet-registered
    `Site.REACHMEE` member.
  - **Estimate:** 0.5 day

## Phase 350 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.REACHMEE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 350 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/reachmee.e2e-spec.ts`
  - **Acceptance:** known-installation (`oru@I003:12#site106`) shape assertions
    (guarded; asserts `site === Site.REACHMEE`, `atsType === 'reachmee'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-installation graceful, `resultsWanted` honoured. 30000 ms timeouts on
    network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/350-source-ats-reachmee/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public RSS-export surface, wire shape, installation
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the Örebro University installation
  (`oru`), no authentication required:
  - `GET https://site106.reachmee.com/Public/rssfeed/external.ashx?id=12&InstallationID=I003&CustomerName=oru&lang=UK`
    → HTTP 200 RSS XML, channel `<title>Available vacancies</title>`, with live
    `<item>` vacancies (each `<CommAdSeqNo>` + `<title>` + HTML `<description>` +
    location / org / employment elements + absolute `<link>` on `web103.reachmee.com`).
  - Sibling installation on the same host pattern: Linköping University
    (`I011`, site `7`, career host `web103.reachmee.com/ext/I011/853/main?site=7&…`).
  Confidence: **verified** (feed fetched + item structure confirmed live).
- The authenticated Talentech / ReachMee REST API requires API-key / OAuth
  credentials and is an explicit non-goal; job data is taken from the public RSS
  export only.
- The feed returns every published vacancy in one response (no pagination);
  de-dup by `atsId`; result-set sliced client-side to `resultsWanted` (default 100).
