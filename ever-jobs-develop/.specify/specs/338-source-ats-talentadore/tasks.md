# Tasks: 338 — TalentAdore ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 338 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-talentadore/{package.json,tsconfig.json,src/index.ts,src/talentadore.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/talentadore.types.ts`, `src/talentadore.constants.ts`
  - **Acceptance:** feed-envelope and job interfaces modelled with JSDoc; ATS
    host, feed path/query templates, careers host template, feed-key regex,
    default results, and request headers defined; verified wire surface
    documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `TalentAdoreService` implementing `IScraper`
  - **Files:** `src/talentadore.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; feed key
    resolved verbatim or harvested from the career page; positions feed parsed;
    HTTP 4xx → empty; de-dup by `atsId`; description format-converted; slice to
    `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 338 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TALENTADORE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 338 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/talentadore.e2e-spec.ts`
  - **Acceptance:** known-tenant (`amersports`) shape assertions (guarded;
    asserts `site === Site.TALENTADORE`, `atsType === 'talentadore'`,
    `atsId`/`jobUrl` defined), no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/338-source-ats-talentadore/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public positions-feed surface, JSON wire shape, tenant /
    feed-key resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the Amer Sports tenant
  (`https://amersports.careers.talentadore.com/` → feed key `mwRcjSn`), no
  authentication required:
  - `GET https://ats.talentadore.com/positions/mwRcjSn/json?v=2&display_description=job_description`
    → HTTP 200, envelope `{ version, company, generated_at, jobs[] }` with 36
    open roles.
  - Empty tenants (e.g. Beamex `nyNS3Sd`) → HTTP 200 with `jobs: []`.
  Confidence: **verified** (byte-confirmed envelope + job items).
- The careers sub-domain's WordPress `/feed/` RSS returns blog posts, not job
  ads, and is an explicit non-goal; job data lives only in the
  `ats.talentadore.com` positions feed.
- The feed returns every open role in one envelope (no pagination); de-dup by
  `atsId`; result-set sliced client-side to `resultsWanted` (default 100).
