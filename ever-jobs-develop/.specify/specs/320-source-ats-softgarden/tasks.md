# Tasks: 320 — Softgarden ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 329 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-softgarden/{package.json,tsconfig.json,src/index.ts,src/softgarden.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/softgarden.types.ts`, `src/softgarden.constants.ts`
  - **Acceptance:** schema.org `JobPosting` / `DataFeed` field interfaces modelled
    with JSDoc; career apex, host template, feed path, job-page template, default
    results, and request headers defined with the verified wire surface doc-comment.
  - **Estimate:** 0.25 day

- [x] T03 — `SoftgardenService` implementing `IScraper`
  - **Files:** `src/softgarden.service.ts`
  - **Acceptance:** FR-1…FR-8 satisfied; public `/jobs.feed.json` DataFeed parsed;
    inline HTML description format-converted; HTTP 4xx / non-feed body → empty;
    de-dup by `identifier.value`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 329 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SOFTGARDEN` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 329 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/softgarden.e2e-spec.ts`
  - **Acceptance:** known-tenant shape assertions (guarded; `site`/`atsType`
    checked), no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/320-source-ats-softgarden/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public feed endpoint, verified wire shape, tenant resolution,
    and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET /jobs.feed.json` on the tenant origin
  (`softgarden.career.softgarden.de`) returns HTTP 200, `application/json`, a
  schema.org JobPosting `DataFeed` with `numberOfItems: 10` and 10
  `dataFeedElement` entries — no authentication required. Each `item.url`
  job-detail page also returns HTTP 200 anonymously. Confidence: verified.
- The authenticated `v2`/`v3` jobboard REST APIs (client/user access token +
  channel id) and legacy Wicket boards without `/jobs.feed.json` (Q-SG-1) are
  explicit non-goals.
- The feed embeds the full HTML description inline — no per-job detail fan-out.
  De-dup by `identifier.value`; result-set sliced client-side to `resultsWanted`.
