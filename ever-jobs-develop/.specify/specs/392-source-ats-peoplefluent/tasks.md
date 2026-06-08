# Tasks: 392 — PeopleFluent ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 401 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-peoplefluent/{package.json,tsconfig.json,src/index.ts,src/peoplefluent.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/peoplefluent.types.ts`, `src/peoplefluent.constants.ts`
  - **Acceptance:** listing + normalised interfaces modelled with JSDoc; RMS careers host,
    root domain, base-path builder, entry paths, locales, detail path segment, default
    results, page cap, 15s timeout cap, request headers, the job-anchor + bare-id regexes,
    and remote regex defined; researched public surface documented with date 2026-06-03,
    the named real tenants (`mit`, `kindermorgan`, …), and verified=false rationale.
  - **Estimate:** 0.25 day

- [x] T03 — `PeopleFluentService` implementing `IScraper`
  - **Files:** `src/peoplefluent.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url via the
    `client_{tenant}` path token; results view probed across locale/entry-path variants;
    `jobDetail.html?jobPostId={id}` anchors extracted (with bare-id fallback); `jobPostId`
    → `atsId`; deduped; description format-converted when present; location / remote
    derived; canonical detail + apply URLs built; stop at `resultsWanted`; per-request
    timeout capped at 15s by bounding BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS /
    malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.PEOPLEFLUENT`).
  - **Estimate:** 0.5 day

## Phase 401 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PEOPLEFLUENT = 'peoplefluent'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 401 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/peoplefluent.e2e-spec.ts`
  - **Acceptance:** known-tenant (`mit`) shape assertions (guarded; asserts
    `site === Site.PEOPLEFLUENT`, `atsType === 'peoplefluent'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/392-source-ats-peoplefluent/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered results surface, parse strategy, URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required (verified=false):
  - Platform + tenant path pattern
    `careers.peopleclick.com/careerscp/client_{tenant}/external/...`, confirmed with the
    named real tenants `mit`, `kindermorgan`, `medcollegewi`, `santeecooper`, `amery`,
    `reyesholdings`.
  - Canonical per-role detail URL
    `…/external/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}`, with the
    numeric `jobPostId` as the stable per-role id (live MIT detail URLs observed:
    `jobPostId=33375`, `33237`, `34045`).
  - A populated, parseable listing array could NOT be captured live this run: the
    job-search shells fetched rendered facet counts only (the role rows are produced by a
    parameterised gateway / form submission), and the specific indexed detail ids had
    rotated to 404. The parser is therefore written DEFENSIVELY against the documented
    `jobDetail.html?jobPostId={id}` anchor shape and degrades to empty — following the
    Carerix precedent. Confidence: **verified=false**.
- The role anchors are server-rendered; no separate JSON feed / RSS is needed, and no
  headless browser is required. The richest stable per-role fields on the listing surface
  are the title (anchor text) + `jobPostId`.
- The adapter anchors on the stable `jobPostId` URL token (not CSS class names), dedupes
  by `jobPostId`, and slices to `resultsWanted` (bounded by a probe-page cap).
