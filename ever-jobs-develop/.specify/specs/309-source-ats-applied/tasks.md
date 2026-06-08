# Tasks: 309 — Applied ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Plugin package (Phase 318)

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-applied/{package.json,tsconfig.json,src/index.ts,src/applied.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/applied.types.ts`, `src/applied.constants.ts`
  - **Acceptance:** parsed HTML result interfaces modelled; base URL, path
    template, headers, concurrency, and default-results constants defined with
    full JSDoc documenting the real wire surface and live verification.
  - **Estimate:** 0.25 day

- [x] T03 — `AppliedService` implementing `IScraper`
  - **Files:** `src/applied.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; org-page cheerio parsing; bounded
    concurrent detail fan-out; HTTP 404 → empty; heuristic description
    extraction; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 2 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.APPLIED` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 3 — Tests & docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/applied.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded), no-slug empty,
    unknown-org graceful, resultsWanted honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/309-source-ats-applied/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public HTML surface, org-path resolution, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- No public anonymous JSON API exists on Applied (beapplied.com); all
  `/api/v1/` endpoints return HTTP 401 Unauthorized.  Verified 2026-06-03.
- The adapter scrapes the public HTML org listing page and individual job
  detail pages — both return HTTP 200 without credentials.
- Slug-only org paths (without the numeric orgId) return HTTP 404; callers
  must supply the `{orgId}/{orgSlug}` form.
- Description extraction uses heuristic selectors since Applied pages carry
  no JSON-LD or stable class-name anchors (Q-APP-2).
- Live test tenant: Citizens UK (`1549/citizens-uk`), verified 2026-06-03
  to have the "Digital Communications Manager" role at `/apply/cuxl7vasjy`.
