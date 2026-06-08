# Tasks: 408 — HROne ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 408 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hrone/{package.json,tsconfig.json,src/index.ts,src/hrone.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hrone.types.ts`, `src/hrone.constants.ts`
  - **Acceptance:** job-opening request + posting + envelope + normalised interfaces modelled
    with JSDoc; career host suffix, root domain, API-host helper, feed path, header names
    (`apiKey` / `domainCode` / `AccessMode`), page size, default results, page cap, request
    headers, and remote regex defined; researched public surface documented with date
    2026-06-03, the named real tenant (`joy`), and a clear verified=false confirmed-vs-assumed
    note (endpoint/body/headers confirmed; response envelope assumed).
  - **Estimate:** 0.25 day

- [x] T03 — `HrOneService` implementing `IScraper`
  - **Files:** `src/hrone.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant + `appId`/`dc` resolved from slug/url; public
    career-portal feed `POST /api/recruitment/referralposting/v1` POSTed as JSON on
    `api.{tenant}.hrone.cloud` with anonymous `apiKey` / `domainCode` / `AccessMode: W`
    headers; postings array narrowed defensively from several candidate envelopes; pages
    drained bounded by a page cap, stopping on a short / empty page; `positionId` (else
    `requestId` / `jobCode`) → `atsId`; deduped; description format-converted when present;
    department (`departmentName`) / employmentType (`employmentType`/`jobType`) / structured
    location / remote (regex) / datePosted derived; canonical detail + apply URL is the tenant
    career-portal page deep-linked by `positionId`; company name de-slugified from the tenant;
    stop at `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` +
    `requestTimeout`; HTTP 4xx / 403 / DNS / malformed → empty/partial, never throws; no
    `console.log` (uses `Logger`); `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.HRONE`).
  - **Estimate:** 0.5 day

## Phase 408 — Registration (orchestrator-owned)

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HRONE = 'hrone'` exists; `HrOneModule` in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present. (Owned by the orchestrator — this plugin edits no shared file;
    verified locally by a temporary enum entry that produced a clean `tsc --noEmit`.)
  - **Estimate:** 0.25 day

## Phase 408 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hrone.e2e-spec.ts`
  - **Acceptance:** known-tenant (`joy`) shape assertions (guarded; asserts
    `site === Site.HRONE`, `atsType === 'hrone'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path (with a real `appId` + `dc`), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. Tolerates zero results (the live feed is gated by a signed
    request token). 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/408-source-ats-hrone/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-portal JSON-feed surface, drain strategy, career-portal
    detail-URL shape, tenant + read-key resolution, mapping table, non-goals, and the
    verified=false confirmed-vs-assumed note documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched live 2026-06-03, no authentication required; confidence **verified=false**
  (defensive adapter from strong public evidence):
  - CONFIRMED: platform + tenant host pattern `{tenant}.hrone.cloud/career-portal`, the named
    real tenant `joy` (HROne's own demo/career portal) and its real `appId` + `dc=joy` read key
    (harvested from the public link on hrone.cloud); the API host
    `https://api.{tenant}.hrone.cloud`; the endpoint path
    `POST /api/recruitment/referralposting/v1` with the `{ positionId, pagination }` body; and
    the anonymous `apiKey` + `domainCode` + `AccessMode: W` header mechanism (all from the
    portal's Angular bundle). A live `GET .../JobOpening/Search` returned HTTP 405 (endpoint
    real, wrong method).
  - ASSUMED: the JSON response envelope + per-role field names. The live `referralposting/v1`
    POST returned HTTP 403 behind a per-session signed request token (`rqt`) the SPA mints,
    which a non-browser client cannot reproduce. Role field names are derived from the bundle's
    data bindings; the wrapper is parsed defensively.
- Distinct from `source-ats-hron` (HR-ON Recruit, hr-on.com — a Danish ATS); unrelated
  platform, kept as a separate plugin.
- The role data is a JSON feed (not an SSR DOM), so it is consumed as a REST endpoint; no
  headless browser is required, and the SPA's anti-bot `rqt` token is never reproduced.
- The authenticated internal HRMS REST API is explicitly NOT used (it requires a logged-in
  session); only the public, app-id-scoped career-portal feed is consumed.
