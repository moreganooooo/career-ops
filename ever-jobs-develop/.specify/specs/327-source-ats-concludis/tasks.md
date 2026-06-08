# Tasks: 327 — Concludis ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 336 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-concludis/{package.json,tsconfig.json,src/index.ts,src/concludis.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/concludis.types.ts`, `src/concludis.constants.ts`
  - **Acceptance:** listing-row + JSON-LD `JobPosting` interfaces modelled with
    JSDoc; host/list-path templates, CSS selectors, pagination, concurrency,
    default results, and request headers defined; verified wire surface
    documented with date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `ConcludisService` implementing `IScraper`
  - **Files:** `src/concludis.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; listing parsed via cheerio; per-job
    JSON-LD enrichment via bounded `Promise.allSettled`; HTTP 4xx → empty;
    detail redirect / missing JSON-LD → listing-teaser fallback; de-dup by
    `oid`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 336 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CONCLUDIS` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 336 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/concludis.e2e-spec.ts`
  - **Acceptance:** known-tenant (`hwk-stuttgart`) shape assertions (guarded),
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured;
    asserts `site === Site.CONCLUDIS` and `atsType === 'concludis'`; nullable
    fields guarded with `toBeDefined()` / `?? ''`.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/327-source-ats-concludis/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public listing endpoint + JSON-LD detail shape, tenant
    resolution, non-goals, and live-verification decisions documented; tasks
    marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoints verified live 2026-06-03 (no authentication required):
  - Listing: `GET /prj/lst/{hash}/GesamtlisteOffenePositionen.htm[?page=N]` —
    HTTP 200, `div[id="line_*"]` rows, "N Stellen gefunden" total; `hwk-stuttgart`
    (3 roles) and `smurfitkappa` (206 roles, 25/page) confirmed.
  - Detail: `GET /prj/shw/{hash}_0/{oid}/{slug}.htm?b=0` — `hwk-stuttgart`
    returns HTTP 200 with schema.org JSON-LD `JobPosting`; `smurfitkappa`
    returns HTTP 302 (gating) → handled by best-effort degradation.
- Detail enrichment is best-effort: redirect / empty / missing JSON-LD degrades
  to the listing teaser + tenant-derived company name. De-dup by `oid`;
  result-set sliced client-side to `resultsWanted`; page + concurrency ceilings
  bound total work.
- Confidence: **verified** (listing surface + JSON-LD shape byte-confirmed live);
  enrichment availability is tenant-variable (Q-CO-1).
