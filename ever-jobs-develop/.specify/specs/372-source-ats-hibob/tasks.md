# Tasks: 372 — HiBob ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 381 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hibob/{package.json,tsconfig.json,src/index.ts,src/hibob.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hibob.types.ts`, `src/hibob.constants.ts`
  - **Acceptance:** job-ad / search / detail JSON interfaces modelled with JSDoc; API
    base, careers domain, root domain, search + detail paths, default results, page
    cap, request headers, and remote regex defined; researched public surface
    documented with date 2026-06-03, the named real tenants (`hibob-e360`, `dcbyte`),
    and the verified=false (defensive) confidence note.
  - **Estimate:** 0.25 day

- [x] T03 — `HiBobService` implementing `IScraper`
  - **Files:** `src/hibob.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; active-job-ads
    search issued + deduped; detail object fetched + normalised; opaque ad `id` →
    `atsId`; HTTP 4xx → empty/skip; description format-converted; department /
    employmentType / location / remote derived; stop at `resultsWanted`; canonical
    public job + apply URLs built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 381 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HIBOB` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 381 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hibob.e2e-spec.ts`
  - **Acceptance:** known-tenant (`dcbyte`) shape assertions (guarded; asserts
    `site === Site.HIBOB`, `atsType === 'hibob'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/372-source-ats-hibob/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public job-ads search + detail surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + tenant addressing `{tenant}.careers.hibob.com/jobs` (per-role
    `/jobs/{id}`, apply `/jobs/{id}/apply`), confirmed with named real tenants
    `hibob-e360` and `dcbyte`.
  - Public Hiring API `POST /v1/hiring/job-ads/search` (active careers-page ads) and
    `GET /v1/hiring/job-ads/{id}`, documented as anonymous, with `jobAd/applyUrl` the
    public apply link. Byte-level wire envelope not observed (apidocs.hibob.com
    gated, HTTP 403). Confidence: **verified=false (defensive)**.
- The careers page is a client-rendered SPA; the Hiring API the SPA consumes is the
  documented, no-auth, machine-readable surface and is used here, with the careers
  portal as the authoritative public URL source.
- The job-ads search returns all active ads in one response; the adapter slices to
  `resultsWanted` deduped roles (de-dup by `atsId`), then fetches each role's detail
  object. A defensive page cap guards a future cursor-paginated variant.
