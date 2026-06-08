# Tasks: 411 — Sense ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 411 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-sense/{package.json,tsconfig.json,src/index.ts,src/sense.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/sense.types.ts`, `src/sense.constants.ts`
  - **Acceptance:** feed-envelope + role + nested (office) + normalised interfaces modelled
    with JSDoc; career host suffix, root domain, feed path, detail path, page size (10), default
    results, page cap, request headers, the remote `workplace_type` token, and remote regex
    defined; verified public surface documented with date 2026-06-04 and the named real tenant
    (`sensehr`), including the 0-based page pagination.
  - **Estimate:** 0.25 day

- [x] T03 — `SenseService` implementing `IScraper`
  - **Files:** `src/sense.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; public career-site feed
    `GET /careers/api/jobs?page={n}` GETted as JSON; `{ success, data:{ count, rows } }`
    envelope read; `rows` narrowed; pages drained by 0-based index until empty / `count` /
    page cap; numeric `id` → `atsId`; deduped; description format-converted when present;
    department (`department`) / employmentType (humanised `job_type`) / structured location
    (`office`) / remote (`workplace_type` first, then regex) / datePosted (`created_on` epoch
    ms) derived; canonical detail + apply URL assembled as `{origin}/careers/jobs/{id}`;
    company name de-slugified from the tenant; stop at `resultsWanted`; per-request timeout
    capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx/5xx / DNS / malformed →
    empty/partial, never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.SENSE`).
  - **Estimate:** 0.5 day

## Phase 411 — Registration

- [ ] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SENSE = 'sense'` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Owner:** orchestrator (this plugin does not edit shared files).
  - **Estimate:** 0.25 day

## Phase 411 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/sense.e2e-spec.ts`
  - **Acceptance:** known-tenant (`sensehr`) shape assertions (guarded; asserts
    `site === Site.SENSE`, `atsType === 'sense'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/411-source-ats-sense/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON-feed surface, drain strategy, `{origin}/careers/jobs/{id}`
    detail shape, tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-04, no authentication required:
  - Platform + tenant host pattern `{tenant}.sensehq.com/careers`, confirmed with the named
    real tenant `sensehr` (Sense's own careers board). Sense's hosted career sites are powered
    by the Skillate ATS Sense absorbed.
  - The public feed `GET /careers/api/jobs?page={n}` returned the
    `{ success, data:{ count, rows } }` envelope: **15 live roles** for `sensehr` (first row id
    `217` "DevOps Engineer", `job_type` `FULLTIME`, structured `office` Bengaluru / Karnataka /
    India). `page=0` returned the first 10 rows, `page=1` the remaining 5, `page=2` an empty
    `rows` array. The canonical detail page `/careers/jobs/217` returned HTTP 200; an unknown
    tenant host returned HTTP 500. Confidence: **verified**.
- The role data is a clean JSON feed (not a JS island, not an SSR DOM), so it is consumed as a
  REST endpoint; no headless browser is required.
- Any authenticated Sense TRM API is explicitly NOT used; only the public per-tenant
  career-site feed is consumed.
- Pagination uses a 0-based `page` index at a fixed 10-row server page size (the `limit` param
  is ignored). The adapter drains pages while `rows` is non-empty and the total `count` is not
  yet reached, dedupes by `atsId`, and stops once `resultsWanted` roles are collected.
