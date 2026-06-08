# Tasks: 391 — Greeting ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 400 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-greeting/{package.json,tsconfig.json,src/index.ts,src/greeting.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/greeting.types.ts`, `src/greeting.constants.ts`
  - **Acceptance:** `__NEXT_DATA__` envelope + dehydrated-query + opening + detail-response +
    normalised interfaces modelled with JSDoc; career host suffix, root domain, API origin,
    index paths, locales, opening/apply path segments, default results, page + detail caps,
    request headers, workspace header, the `__NEXT_DATA__` regex, remote regex, and
    employment-type map defined; verified public surface documented with date 2026-06-03 and
    the named real tenant (`ablelabs`, workspaceId 1137).
  - **Estimate:** 0.25 day

- [x] T03 — `GreetingService` implementing `IScraper`
  - **Files:** `src/greeting.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; landing probed
    across locale/path variants (root redirect followed); `__NEXT_DATA__` extracted +
    `JSON.parse`d; `["openings"]` query array read; `workspaceId` read from the boot query
    key; `openingId` → `atsId`; deduped; `deploy === false` skipped; description enriched
    (bounded) from the detail API and format-converted; department / occupation / employment
    / location (country-split) / remote (incl. `workFromHome`, `재택`, `원격`) / datePosted
    derived; canonical detail + apply URLs built; stop at `resultsWanted`; HTTP 4xx / DNS /
    malformed → empty/partial, never throws; per-request timeout capped at 15s on BOTH
    `timeout` and `requestTimeout`; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.GREETING`).
  - **Estimate:** 0.5 day

## Phase 400 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.GREETING = 'greeting'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 400 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/greeting.e2e-spec.ts`
  - **Acceptance:** known-tenant (`ablelabs`) shape assertions (guarded; asserts
    `site === Site.GREETING`, `atsType === 'greeting'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/391-source-ats-greeting/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public embedded-`__NEXT_DATA__` landing surface, detail-API enrichment,
    URL shape, tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.career.greetinghr.com`, confirmed with the
    named real tenant `ablelabs` (ABLE Labs, `https://ablelabs.career.greetinghr.com/` →
    `/ko/home`).
  - The server-rendered landing embeds the open-roles set in the `__NEXT_DATA__` script tag
    as the React-Query `["openings"]` dehydrated query. Parsing yielded a live opening
    (`openingId 139155`, "자동화 장비 제어 SW 엔지니어 (Python)", occupation `소프트웨어`,
    employment `FULL_TIME_WORKER`, `openDate 2026-04-15`, group `에이블랩스`), mapping to the
    canonical detail URL `/ko/o/139155` and apply URL `/ko/o/139155/apply`. The tenant
    `workspaceId` (1137) is carried in the `getCareerBootInfo` query key. Confidence:
    **verified**.
  - The public detail API `GET https://api.greetinghr.com/ats/v3.5/career/workspaces/1137/openings/139155`
    (header `X-Greeting-Workspace-Id: 1137`) returned HTTP 200 with `data.openingsInfo.detail`
    (the HTML job-ad body). Other Greeting-powered tenants seen: `hanwha-finance`,
    `maplestoryworlds`.
- The openings data is server-embedded in the landing HTML; no headless browser is required.
  The richest per-role body is the detail API's `openingsInfo.detail` HTML; the `openingId`
  is the per-role ATS id.
- The landing embeds every open role in one document (no server-side pagination); the
  adapter dedupes by `atsId` and slices to `resultsWanted` (bounded by probe-page and
  detail-fetch caps).
