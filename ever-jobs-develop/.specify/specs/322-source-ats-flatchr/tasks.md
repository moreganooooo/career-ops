# Tasks: 322 — Flatchr ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 331 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-flatchr/{package.json,tsconfig.json,src/index.ts,src/flatchr.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/flatchr.types.ts`, `src/flatchr.constants.ts`
  - **Acceptance:** `items[].vacancy` field interfaces modelled with JSDoc;
    careers host, JSON path template, vacancy-page template, default results,
    remote sentinel, and request headers defined. Verification date 2026-06-03
    documented in the constants doc-comment.
  - **Estimate:** 0.25 day

- [x] T03 — `FlatchrService` implementing `IScraper`
  - **Files:** `src/flatchr.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public `/company/{slug}.json` listing
    fetched and mapped; multi-part HTML merged + format-converted; HTTP 4xx /
    `{ message }` → empty; de-dup by `atsId`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 331 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.FLATCHR` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 331 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/flatchr.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded by `length > 0`),
    no-slug/url empty, unknown-tenant graceful (empty), `resultsWanted` honoured;
    asserts `job.site === Site.FLATCHR` and `job.atsType === 'flatchr'`;
    nullable fields guarded with `toBeDefined()` / `?? ''`.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/322-source-ats-flatchr/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public JSON listing endpoint, verified wire shape, tenant
    resolution, and non-goals documented; live verification + confidence level
    recorded in Decisions; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET https://careers.flatchr.io/company/{slug}.json`
  returns HTTP 200 with `{ items: [...] }` and the FULL vacancy record embedded
  per item (no detail fan-out needed); no authentication required. Confirmed on
  `flatchr` (3 vacancies) and `groupeaudeo` (2 vacancies). Unknown slug → HTTP
  404 `{ message }`.
- Confidence: **verified** — endpoint URL, request shape, and per-field response
  shape byte-confirmed against the live `flatchr` tenant.
- The authenticated REST API at `api.flatchr.io` and WAF-gated career sites
  (Q-FL-1) are explicit non-goals.
- Listing delivers all roles (with descriptions) in one document — no pagination.
  De-dup by resolved `atsId`; result-set sliced client-side to `resultsWanted`.
