# Tasks: 369 — TrackerRMS ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 378 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-trackerrms/{package.json,tsconfig.json,src/index.ts,src/trackerrms.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Parsed-shape types + constants
  - **Files:** `src/trackerrms.types.ts`, `src/trackerrms.constants.ts`
  - **Acceptance:** raw-item + normalised-job interfaces modelled with JSDoc; regional
    portal hosts, root domain, jobs/apply paths, requested field set, default results,
    item cap, request headers, and the item/title/link/jobcode/reference/remote
    regexes defined; public surface documented with date 2026-06-03 and the named real
    tenant (`Tracker_PrecisionResources`); surface-confidence note (verified=false).
  - **Estimate:** 0.25 day

- [x] T03 — `TrackerRmsService` implementing `IScraper`
  - **Files:** `src/trackerrms.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; database + region resolved from slug/url; HTML
    feed fetched once + split into `<li>` blocks; each block parsed (heading → title,
    anchor → apply URL + `jobcode` reference → `atsId`, residual markup → description,
    labelled free-text → location / worktype); HTTP 4xx / empty feed → empty;
    description format-converted; employmentType / location / remote derived; de-dup by
    `atsId`; stop at `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 378 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TRACKERRMS` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 378 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/trackerrms.e2e-spec.ts`
  - **Acceptance:** known-tenant (`Tracker_PrecisionResources`) shape assertions
    (guarded; asserts `site === Site.TRACKERRMS`, `atsType === 'trackerrms'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network
    tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/369-source-ats-trackerrms/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public EVO Portal HTML feed surface, parsed shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface observed live 2026-06-03, no authentication required:
  - Platform + tenant addressing
    `https://evoportal{us|uk|ca}.tracker-rms.com/{database}/jobs?fields={csv}`,
    confirmed with the named real tenant `Tracker_PrecisionResources` (Precision
    Resources, a US staffing firm) whose feed renders live `<li>` role blocks with
    apply links of the form `…/PrecisionResources/apply?jobcode=…`.
  - The feed is server-rendered HTML whose per-field DOM layout is tenant-configured;
    confidence: **defensive (verified=false)**.
- TrackerRMS exposes no public JSON job API; the documented no-auth surface is the
  "Publish Jobs to your Website" / "Jobs+" HTML feed and is used here.
- The feed is a single document (no pagination); the adapter fetches once, splits into
  `<li>` blocks (bounded by an item cap), dedupes by `atsId`, and slices to
  `resultsWanted` client-side. De-dup is by `atsId` (the `jobcode` reference).
