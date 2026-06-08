# Tasks: 414 — Symphony Talent ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 414 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-symphonytalent/{package.json,tsconfig.json,src/index.ts,src/symphonytalent.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/symphonytalent.types.ts`, `src/symphonytalent.constants.ts`
  - **Acceptance:** feed-envelope + role + normalised interfaces modelled with JSDoc (all
    optional / defensively narrowed); API host + origin, feed path, page size, default
    results, page cap, request headers, `DEFAULT_TIMEOUT_SECONDS=15`, the remote
    `location_type` token, and remote regex defined; verified public surface documented with
    date 2026-06-03 and the named real org (`Organization=2015`, Symphony Talent's own board).
  - **Estimate:** 0.25 day

- [x] T03 — `SymphonyTalentService` implementing `IScraper`
  - **Files:** `src/symphonytalent.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; numeric `Organization` id resolved from slug/url;
    public CWS feed `GET /api/job?Organization={id}&Limit=100&offset={k}` GETted as JSON;
    `{ totalHits, queryResult }` envelope read; `queryResult` narrowed; pages drained by
    advancing `offset` bounded by `totalHits` + a page cap; numeric `id` → `atsId`; deduped;
    description format-converted when present; department (`department`/`primary_category`) /
    employmentType (`employment_type`) / structured location / remote (`location_type` first,
    then regex) / datePosted derived; canonical detail URL from `url`, apply URL from
    `fndly_url`; company name from `company_name`; stop at `resultsWanted`; per-request
    timeout capped at 15s on BOTH `timeout` + `requestTimeout`; JSONP-wrapped /
    HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (verified
    against a temporary `Site.SYMPHONYTALENT`, reverted — exit 0).
  - **Estimate:** 0.5 day

## Phase 414 — Registration (orchestrator-owned)

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SYMPHONYTALENT = 'symphonytalent'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Note:** owned by the orchestrator; this plugin only references `Site.SYMPHONYTALENT`
    and edits no shared file.
  - **Estimate:** 0.25 day

## Phase 414 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/symphonytalent.e2e-spec.ts`
  - **Acceptance:** known-org (`2015`) shape assertions (guarded; asserts
    `site === Site.SYMPHONYTALENT`, `atsType === 'symphonytalent'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path (`?Organization=2015`), no-slug/url empty,
    unknown-org graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/414-source-ats-symphonytalent/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public CWS JSON-feed surface, drain strategy, `url` detail shape, org-id
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform: Symphony Talent / SmashFlyX career-site widget ("CWS"), calling the shared jobs
    API `https://jobsapi-internal.m-cloud.io/api/job` addressed by numeric `Organization` id
    (`org_id`). Confirmed by reading the live `careers.symphonytalent.com` widget config
    (`org_id: "2015"`, `api: https://jobsapi-internal.m-cloud.io/api/`).
  - A plain `GET /api/job?Organization=2015&Limit=3&offset=1` returned HTTP 200
    `application/json` with `{ totalHits: 3, queryResult: [ … ] }`; first role `23398009`
    ("Technical Project Manager - (US – Remote)", `location_type: "Remote"`, `url`
    `https://careers.symphonytalent.com/job/23398009/…`). Confidence: **verified**.
- The role data is a clean JSON feed (the browser variant is JSONP), so it is consumed as a
  REST endpoint; no headless browser is required.
- The authenticated SmashFly Console / Job-Import REST API (`recruit.smashfly.com`) is
  explicitly NOT used (it requires credentials); only the public per-org CWS feed is consumed.
- The feed paginates by `offset` (1-based, `page * Limit + 1`) with a `totalHits` total; the
  adapter requests `Limit=100`, drains pages bounded by a page cap, dedupes by `atsId`, and
  stops once `resultsWanted` roles are collected.
