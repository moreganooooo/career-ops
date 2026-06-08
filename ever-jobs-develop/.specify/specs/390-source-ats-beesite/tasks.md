# Tasks: 390 — BeeSite ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 399 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-beesite/{package.json,tsconfig.json,src/index.ts,src/beesite.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/beesite.types.ts`, `src/beesite.constants.ts`
  - **Acceptance:** JSON-envelope (`MatchedObjectDescriptor` / `SearchResultItems`) +
    list-row + normalised interfaces modelled with JSDoc; root domain, hosted-origin
    builder, index path, `ac` actions, JobBoardApi endpoint paths, languages, default
    results, page size, page cap, 15 s timeout cap, request headers, the `?ac=jobad&id=`
    link regex, the `SearchResultBox` regex, and remote regex defined; researched public
    surface documented with date 2026-06-03, the demo (`frontend-demo.beesite.de`), and a
    live tenant (`erecruitment.draeger.com`).
  - **Estimate:** 0.25 day

- [x] T03 — `BeeSiteService` implementing `IScraper`
  - **Files:** `src/beesite.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; origin resolved from slug/url (hosted +
    custom-domain); JSON board probed across endpoint/language with `FirstItem`/
    `CountItem` paging; HTML `?ac=search_result` fallback anchored on `?ac=jobad&id=`
    links + `SearchResultBox` rows; `PositionID` → `atsId` with `MatchedObjectId`
    fallback; deduped; description format-converted from `PositionFormattedDescription`;
    department / location / employmentType / remote / datePosted derived; canonical
    detail + apply URLs built (`PositionURI` preferred for detail); `extractEmails` over
    the description; `id` = `beesite-{atsId}`, `site` = `Site.BEESITE`, `atsType` =
    `'beesite'`; per-request timeout capped at 15 s via BOTH `timeout` + `requestTimeout`;
    HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean
    (modulo the orchestrator-supplied `Site.BEESITE`).
  - **Estimate:** 0.5 day

## Phase 399 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.BEESITE = 'beesite'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 399 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/beesite.e2e-spec.ts`
  - **Acceptance:** known-tenant (`frontend-demo`) shape assertions (guarded; asserts
    `site === Site.BEESITE`, `atsType === 'beesite'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path (live custom-domain portal), no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/390-source-ats-beesite/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JobBoardApi-JSON + server-rendered-HTML surfaces, probe
    strategy, URL shape, origin resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required (verified=false):
  - Platform + portal addressing (`?ac=start`, hosted `{slug}.beesite.de` /
    `/cust/beesite/` custom-domain mount), confirmed via milch & zucker product pages and
    live portals: demo `frontend-demo.beesite.de`, live tenant
    `erecruitment.draeger.com/cust/beesite/?ac=start` (Drägerwerk AG).
  - Canonical detail URL `?ac=jobad&id={PositionID}` (demo
    `frontend-demo.beesite.de/index.php?ac=jobad&id=89`) and search list action
    `?ac=search_result` (live on the Dräger portal, which surfaced the
    `{"Criterion":"PublicationStartDate","Direction":"DESC"}` sort criterion).
  - The JobBoardApi JSON envelope (`SearchResult` / `SearchResultItems` /
    `MatchedObjectDescriptor`) is the documented BeeSite shape; a populated live listing
    payload could not be fetched during research (the hosted `*.beesite.de` demos refused
    the research fetcher's connection, and the live Dräger portal had zero active postings
    at fetch time), so the adapter is written defensively against BOTH the JSON board and
    the server-rendered `SearchResultBox` HTML, each failing closed to an empty result.
- The adapter honours a `companyUrl` / host origin verbatim (BeeSite portals live on
  hosted `*.beesite.de` AND on customer custom domains), expanding only a bare slug to
  `{slug}.beesite.de`.
