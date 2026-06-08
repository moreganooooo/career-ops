# Tasks: 324 — Skeeled ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 333 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-skeeled/{package.json,tsconfig.json,src/index.ts,src/skeeled.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/skeeled.types.ts`, `src/skeeled.constants.ts`
  - **Acceptance:** offer-wrapper field interfaces modelled with JSDoc (all
    optional/nullable); host, board/offer path templates, object-id regexes,
    data-island id, fallback selectors, language fallbacks, default results, and
    request headers defined; verified wire surface documented (2026-06-03).
  - **Estimate:** 0.25 day

- [x] T03 — `SkeeledService` implementing `IScraper`
  - **Files:** `src/skeeled.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; board page fetched once; `__NUXT_DATA__`
    island decoded + dereferenced (primary) with HTML card-scrape fallback;
    i18n language resolution; de-dup by public offer id; HTTP 4xx → empty;
    `Promise.allSettled` not required (single request, no fan-out); never
    throws to caller; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 333 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SKEELED = 'skeeled'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 333 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/skeeled.e2e-spec.ts`
  - **Acceptance:** known-board shape assertions (guarded), no-slug/url empty,
    unknown-board graceful, `resultsWanted` honoured; asserts `site` and
    `atsType`; nullable fields guarded.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/324-source-ats-skeeled/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public board endpoint, SSR data-island wire shape, tenant
    resolution, language handling, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Endpoint verified live 2026-06-03: `GET https://app.skeeled.com/board/{boardId}`
  returns HTTP 200 SSR HTML with a `__NUXT_DATA__` JSON island carrying every
  offer (title/description i18n maps, structured address, contract, category,
  salary, canonical offer URL). No authentication required. Confirmed on boards
  `63ff6b1561114076fed6be2d` (CBL s.a, LU; 2 offers) and
  `62729efbe4a2052d5d569fcd` (BE; 44 offers). Confidence: **verified**.
- The documented REST API (`app.skeeled.com/public/apidoc/`, credentialed) and
  WAF-gated boards are explicit non-goals.
- One request per board — the island carries all offers, so no pagination and
  no per-offer detail fan-out. De-dup by public offer id; result-set sliced
  client-side to `resultsWanted`.
- Layered parse: `__NUXT_DATA__` decode (primary) → HTML offer-card scrape
  (fallback). i18n title/description resolved by language preference
  (en → fr → nl → de → first available).
