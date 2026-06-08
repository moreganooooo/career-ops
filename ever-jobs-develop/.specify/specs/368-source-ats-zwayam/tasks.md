# Tasks: 368 — Zwayam ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 377 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-zwayam/{package.json,tsconfig.json,src/index.ts,src/zwayam.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/zwayam.types.ts`, `src/zwayam.constants.ts`
  - **Acceptance:** list + preview/detail JSON interfaces modelled with JSDoc; API
    base, public mirror, root domain, openings domain, jobs path, preview path,
    default results, page size, page cap, request headers, and remote regex defined;
    public surface documented with date 2026-06-03 and the named real tenant
    (`careers.beacon-india.com` / `tuvsud.openings.co`); surface confidence
    (verified=false) noted.
  - **Estimate:** 0.25 day

- [x] T03 — `ZwayamService` implementing `IScraper`
  - **Files:** `src/zwayam.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant (slug + career host) resolved from
    slug / `{slug}:{host}` pair / career URL; paginated JSON list walked + deduped;
    preview/detail object fetched + normalised (skipped when the list embeds the body);
    role slug → `atsId`; HTTP 4xx → empty/skip; description format-converted;
    department / employmentType / location / remote derived; stop at `resultsWanted`;
    canonical public preview URL built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 377 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ZWAYAM` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 377 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/zwayam.e2e-spec.ts`
  - **Acceptance:** known-tenant (`beacon-india:careers.beacon-india.com`) shape
    assertions (guarded; asserts `site === Site.ZWAYAM`, `atsType === 'zwayam'`,
    `atsId`/`jobUrl` defined), `companyUrl` resolution path, no-slug/url empty,
    unknown-tenant graceful, `resultsWanted` honoured. 30000 ms timeouts on network
    tests; zero results tolerated (verified=false surface).
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/368-source-ats-zwayam/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON list + preview surface, wire shape, tenant resolution,
    mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched 2026-06-03, no authentication required:
  - Platform + candidate-facing career-site addressing `{careerHost}/{tenant}/`,
    confirmed live via the 301 `careers.beacon-india.com/` → `/beacon-india/` and the
    `{tenant}.openings.co` default career host (e.g. `tuvsud.openings.co`).
  - Shared public API origin `api.zwayam.com` (mirrored `public.zwayam.com`) and the
    canonical per-role preview URL
    `https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com`,
    observed in real shared LinkedIn job links.
  - Confidence: **verified=false** — the open-roles list JSON wire shape could not be
    byte-confirmed (SPA + timing-out / 403 anonymous hosts), so it is a defensive
    design and all parsing is defensively narrowed.
- The career page is an SPA; the JSON API the SPA consumes is the documented, no-auth,
  machine-readable surface and is used here.
- The list endpoint paginates (`totalPages` / `number` / `last`); the adapter walks
  pages (bounded by a page cap) only until `resultsWanted` deduped roles are collected,
  then fetches each role's preview object when the list omits the body. De-dup is by
  `atsId`.
