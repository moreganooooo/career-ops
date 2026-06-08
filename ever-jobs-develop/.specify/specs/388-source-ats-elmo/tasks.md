# Tasks: 388 — ELMO ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 397 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-elmo/{package.json,tsconfig.json,src/index.ts,src/elmo.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/elmo.types.ts`, `src/elmo.constants.ts`
  - **Acceptance:** listing + normalised interfaces modelled with JSDoc; talent host
    suffixes (AU + NZ), root domains, careers/view/apply path segments, board fallbacks,
    default results, page cap, capped timeout, request headers, the `/job/view/{jobId}`
    anchor regex, and remote regex defined; researched public surface documented with date
    2026-06-03 and named real tenants (`securecorp`, `anzca`) — verified=false.
  - **Estimate:** 0.25 day

- [x] T03 — `ElmoService` implementing `IScraper`
  - **Files:** `src/elmo.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant + board resolved from slug/url; board
    probed across candidate segments with `maxRedirects: 0`; role list scraped by anchoring
    on `/job/view/{jobId}` links; numeric `{jobId}` → `atsId`; deduped; canonical detail +
    apply URLs built; description format-converted; department / location / remote /
    datePosted derived; stop at `resultsWanted`; HTTP 3xx/4xx/5xx → next board, host-down →
    abort sweep, malformed → empty/partial, never throws; per-request timeout capped at 15s
    via BOTH `timeout` + `requestTimeout`; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.ELMO`).
  - **Estimate:** 0.5 day

## Phase 397 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ELMO = 'elmo'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 397 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/elmo.e2e-spec.ts`
  - **Acceptance:** known-tenant (`anzca`) shape assertions (guarded; asserts
    `site === Site.ELMO`, `atsType === 'elmo'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/388-source-ats-elmo/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered board surface, anchor-scrape strategy, URL
    shape, tenant + board resolution, mapping table, and non-goals documented; tasks marked
    done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required (verified=false):
  - Platform + tenant host pattern `{tenant}.elmotalent.com.au` (AU) / `.co.nz` (NZ),
    confirmed with real tenants (`securecorp`, `anzca`, `centacarenenw`, `wdeaworks`,
    `healthcareers`); public board under `/careers/{board}` (e.g.
    `https://securecorp.elmotalent.com.au/careers/SECUREcorp`).
  - Canonical per-role detail URL shape `/careers/{board}/job/view/{jobId}` confirmed from
    real live tenants (`avi.elmotalent.com.au/careers/careers/job/view/146`,
    `eks.elmotalent.com.au/careers/ekservices/job/view/23`); the numeric `{jobId}` is the
    stable per-role ATS id.
  - A live, parseable role list could not be observed this run: probed boards
    302-redirected off the board to the ELMO marketing site (`elmosoftware.com.au`) or
    404'd for the guessed board segment. The adapter is therefore written defensively
    against the documented listing + URL shape (verified=false), degrading to empty results
    when a board does not render a role list — mirroring the Carerix precedent.
- The role links are server-rendered in the board HTML; no separate JSON feed / RSS is
  needed, and no headless browser is required. The numeric `{jobId}` is the per-role ATS
  id; per-role detail enrichment (HTML body, structured location, department, dates) is a
  deferred follow-up.
- The board renders every open role in one document (no server-side pagination assumed);
  the adapter dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe cap).
