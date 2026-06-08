# Tasks: 367 — TurboHire ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 376 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-turbohire/{package.json,tsconfig.json,src/index.ts,src/turbohire.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/turbohire.types.ts`, `src/turbohire.constants.ts`
  - **Acceptance:** list + detail JSON interfaces modelled with JSDoc; API base,
    portal base, root domain, jobs path, public-job path, default results, page size,
    page cap, request headers, and remote regex defined; public surface documented
    with date 2026-06-03, the named real tenant (`tatamotors`), and an explicit
    surface-confidence note (verified=false — backing JSON shape modelled defensively).
  - **Estimate:** 0.25 day

- [x] T03 — `TurboHireService` implementing `IScraper`
  - **Files:** `src/turbohire.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url (sub-domain /
    path, reserved labels skipped); paginated JSON list walked + deduped (alternate
    envelope keys tolerated); detail object fetched + normalised; opaque `id` →
    `atsId`; HTTP 4xx → empty/skip; description format-converted; department /
    employmentType / location / remote derived; stop at `resultsWanted`; canonical
    public job URL built (prefer `publicUrl` / `applyUrl`, else synthesise);
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 376 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.TURBOHIRE` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 376 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/turbohire.e2e-spec.ts`
  - **Acceptance:** known-tenant (`tatamotors`) shape assertions (guarded; asserts
    `site === Site.TURBOHIRE`, `atsType === 'turbohire'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/367-source-ats-turbohire/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON list + detail surface, wire shape, tenant
    resolution, mapping table, surface-confidence (verified=false) and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - CONFIRMED live: platform + tenant addressing — shared careers host
    `careers.turbohire.co`, tenant careers sub-domains `{tenant}.turbohire.co`
    (named real tenant `tatamotors`, Tata Motors), and the per-role public detail host
    `portal.turbohire.co/job/publicjobs/{token}` (and `app.turbohire.co` mirror).
  - NOT confirmed live: the `api.turbohire.co` JSON list / detail wire shapes — the
    portal is a client-rendered SPA whose backing API could not be observed
    unauthenticated and TurboHire publishes no public API docs. The endpoint paths +
    field names are a DEFENSIVE model. Confidence: **defensive (verified=false)**.
- The jobs index is a SPA; the JSON API the SPA consumes is the intended public
  surface and is used here, with alternate envelope / body keys tolerated to absorb
  wire-shape uncertainty, so a wrong guess degrades to an empty result rather than a
  throw.
- The list endpoint paginates (`totalCount` / `page` / `pageSize`); the adapter walks
  pages (bounded by a page cap) only until `resultsWanted` deduped roles are collected,
  then fetches each role's detail object. De-dup is by `atsId`.
