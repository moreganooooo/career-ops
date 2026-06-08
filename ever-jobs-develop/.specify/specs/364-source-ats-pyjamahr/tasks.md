# Tasks: 364 — PyjamaHR ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 373 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-pyjamahr/{package.json,tsconfig.json,src/index.ts,src/pyjamahr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/pyjamahr.types.ts`, `src/pyjamahr.constants.ts`
  - **Acceptance:** list + detail JSON interfaces modelled with JSDoc; API base,
    portal base, root domain, jobs path, default results, page cap, request
    headers, and remote regex defined; verified public surface documented with date
    2026-06-03 and the named real tenant (`jobscubicle`).
  - **Estimate:** 0.25 day

- [x] T03 — `PyjamaHrService` implementing `IScraper`
  - **Files:** `src/pyjamahr.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; paginated
    JSON list walked + deduped; detail object fetched + normalised; numeric `id` →
    `atsId`; HTTP 4xx → empty/skip; description format-converted; department /
    employmentType / location / remote derived; stop at `resultsWanted`; canonical
    public job URL built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 373 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PYJAMAHR` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 373 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/pyjamahr.e2e-spec.ts`
  - **Acceptance:** known-tenant (`jobscubicle`) shape assertions (guarded; asserts
    `site === Site.PYJAMAHR`, `atsType === 'pyjamahr'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/364-source-ats-pyjamahr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON list + detail surface, wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant addressing `jobs.pyjamahr.com/{tenant}` (mirrored
    `app.pyjamahr.com/careers/{tenant}`), backed by the JSON API
    `api.pyjamahr.com/api/career/jobs/?company_slug={tenant}`, confirmed with the
    named real tenant `jobscubicle` (Jobscubicle, 11 open roles).
  - Both JSON wire shapes (list + per-role detail) confirmed byte-level, plus the
    canonical public job URL `https://jobs.pyjamahr.com/{tenant}?job_uuid={id}`.
    Confidence: **verified**.
- The jobs index is a Next.js SPA; the JSON API the SPA consumes is the documented,
  no-auth, machine-readable surface and is used here.
- The list endpoint paginates (`count` / `next`); the adapter walks pages (bounded
  by a page cap) only until `resultsWanted` deduped roles are collected, then fetches
  each role's detail object. De-dup is by `atsId`.
