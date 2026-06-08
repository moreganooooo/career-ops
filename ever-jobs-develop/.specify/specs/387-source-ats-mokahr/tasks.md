# Tasks: 387 — MokaHR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 396 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-mokahr/{package.json,tsconfig.json,src/index.ts,src/mokahr.module.ts}`
  - **Acceptance:** package compiles; barrel exports `MokaHrModule` + `MokaHrService`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/mokahr.types.ts`, `src/mokahr.constants.ts`
  - **Acceptance:** role-record + location + department + envelope + normalised
    interfaces modelled with JSDoc; root domain, app/API hosts, recruitment modes, jobs
    API URL builder, site + per-role URL builders, default results, page size, page cap,
    15s timeout cap, request headers, site-path + slug-pair regexes, and remote regex
    defined; researched public surface documented with date 2026-06-03, the named real
    tenants, and the verified=false defensive posture.
  - **Estimate:** 0.25 day

- [x] T03 — `MokaHrService` implementing `IScraper`
  - **Files:** `src/mokahr.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant slug + numeric orgId resolved from
    slug/url; listing probed across `social` / `campus` modes, paged via `limit` /
    `offset`; `{ code, msg, data }` envelope parsed with `data` narrowed across the array
    and wrapper-object forms; numeric `id` → `atsId` with `jobId` fallback; deduped;
    description format-converted from the HTML body; department / location / remote /
    datePosted derived; canonical detail + apply URLs built; stop at `resultsWanted`;
    per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx/5xx /
    DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.MOKAHR`).
  - **Estimate:** 0.5 day

## Phase 396 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.MOKAHR = 'mokahr'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 396 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/mokahr.e2e-spec.ts`
  - **Acceptance:** known-tenant (`tesla/46129`) shape assertions (guarded; asserts
    `site === Site.MOKAHR`, `atsType === 'mokahr'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, bare-slug (no orgId) empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/387-source-ats-mokahr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON listing surface, defensive posture, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required; confidence **verified=false**
  (defensive, Carerix precedent):
  - Platform + tenant addressing `app.mokahr.com/social-recruitment/{tenant}/{orgId}`
    confirmed live with real named tenants: `tesla` (46129), `smoore` (126055), `step`
    (94904), `bigo` (37723), `hanslaser` (46382), `mihoyo` (44205).
  - The career site is a client-rendered SPA behind region-host redirects; its open roles
    are served by the documented public JSON listing endpoint
    `https://api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=social` returning a
    `{ code, msg, data }` envelope of role records (`id`, `title`, `locations[]`,
    `department`, `description`, `updatedAt`). A clean live JSON listing could not be
    confirmed this run (the documented endpoint did not answer anonymously to the research
    fetcher), so the adapter implements the documented shape defensively and degrades to
    empty — a single bad tenant never aborts a batch run.
- The numeric role `id` is the per-role ATS id and the `#/job/{id}` URL segment; the
  richest per-role body is the HTML `description`.
- The listing is paged by `limit` / `offset`; the adapter walks pages (bounded by a page
  cap), dedupes by `atsId`, and slices to `resultsWanted`.
