# Tasks: 403 — Workforce.com ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 412 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-workforce/{package.json,tsconfig.json,src/index.ts,src/workforce.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/workforce.types.ts`, `src/workforce.constants.ts`
  - **Acceptance:** schema.org JobPosting ld+json + postal-address + location + org + job-ref +
    normalised interfaces modelled with JSDoc; region hosts, apply path segment, defensive
    board paths, default results, detail + board page caps, request headers, the apply-link
    harvest regex, the ld+json / `<title>` / `og:` regexes, the UUID validator, and the remote
    regex + `TELECOMMUTE` token defined; surface confidence documented with date 2026-06-03
    (per-role apply page verified live against Workforce.com's own hiring, real UUID
    `f384bcf7-d2b2-467a-a4b3-37752859629e`; board enumeration documented-but-unverified).
  - **Estimate:** 0.25 day

- [x] T03 — `WorkforceService` implementing `IScraper`
  - **Files:** `src/workforce.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; role refs collected from a board URL (link harvest),
    a single apply URL, a bare UUID slug (region probe), or a tenant slug (defensive board-path
    probe); each role's apply page parsed (ld+json JobPosting first, then `<title>` / `og:`
    meta); UUID → `atsId`; deduped; description format-converted when present; structured
    location / employmentType / remote (`TELECOMMUTE` first, then regex) / datePosted derived;
    canonical `/ats/apply/job/{uuid}` apply URL built; brand from `hiringOrganization.name`;
    stop at `resultsWanted` (bounded by detail + board caps); per-request timeout capped at 15s
    on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS / malformed → empty/partial, never
    throws; `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.WORKFORCE`).
  - **Estimate:** 0.5 day

## Phase 412 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.WORKFORCE = 'workforce'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 412 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/workforce.e2e-spec.ts`
  - **Acceptance:** known-board (`companyUrl` of the public Workforce.com careers page) shape
    assertions (guarded; asserts `site === Site.WORKFORCE`, `atsType === 'workforce'`,
    `atsId`/`jobUrl` defined), direct `/ats/apply/job/{uuid}` apply-URL resolution path,
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on
    network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/403-source-ats-workforce/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public anonymous apply surface, link-harvest enumeration strategy, URL
    shape, tenant resolution, mapping table, non-goals, and honest surface-confidence
    (verified=false) documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Per-role apply page `https://{region}.workforce.com/ats/apply/job/{uuid}` (region ∈
    { `app` (US / default), `eu` (Europe) }) confirmed live + anonymous against Workforce.com's
    own hiring (a real, named tenant): the apply page for UUID
    `f384bcf7-d2b2-467a-a4b3-37752859629e` server-rendered a live "Sales Development
    Representative" role (Workforce.com, London) with a postal-address location line and a full
    description, plus a multi-step application form. A `/ats/apply/job/general/{uuid}` variant
    exists. **Confidence: verified** for the role-detail surface.
  - A single enumerable per-tenant board-listing endpoint / tenant-slug-addressed board was NOT
    confirmed anonymously; the link-harvest (from a board `companyUrl`) + slug-probe board-
    enumeration paths are documented-but-unverified and built defensively. **Overall plugin
    confidence: verified=false.**
- The role detail is server-rendered in the apply HTML (schema.org JobPosting ld+json when
  present, else `<title>` / `og:` meta), so it is parsed directly; no headless browser is
  required.
- The adapter harvests `/ats/apply/job/{uuid}` links, dedupes by `atsId` (UUID), and slices to
  `resultsWanted` (bounded by a detail fan-out cap and a board-probe cap).
- DISTINCT from the existing `source-ats-workstream` plugin (a separate platform); no
  competitor platform is named.
