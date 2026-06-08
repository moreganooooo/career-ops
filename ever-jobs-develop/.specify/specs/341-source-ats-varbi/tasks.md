# Tasks: 341 — Varbi ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 341 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-varbi/{package.json,tsconfig.json,src/index.ts,src/varbi.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Parsed-shape types + constants
  - **Files:** `src/varbi.types.ts`, `src/varbi.constants.ts`
  - **Acceptance:** listing and job interfaces modelled with JSDoc; host /
    listing / job / apply path templates, row + cell regexes (`pos-title`,
    `pos-town`, `pos-subcompany`, `pos-ends`, `job-desc`, `og:` meta), default
    results cap, detail-fetch cap, and browser-like headers defined; verified
    public surface documented with verification date 2026-06-03.
  - **Estimate:** 0.25 day

- [x] T03 — `VarbiService` implementing `IScraper`
  - **Files:** `src/varbi.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; career
    page fetched + table parsed; per-role advert body enriched (bounded);
    HTTP 4xx → empty/partial; de-dup by `atsId`; description format-converted;
    slice to `resultsWanted`; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 341 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.VARBI` exists; module in `ALL_SOURCE_MODULES`; path
    alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 341 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/varbi.e2e-spec.ts`
  - **Acceptance:** known-tenant (`kth`) shape assertions (guarded; asserts
    `site === Site.VARBI`, `atsType === 'varbi'`, `atsId`/`jobUrl` defined),
    no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured,
    `companyUrl` resolution. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/341-source-ats-varbi/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-page surface, parsed wire shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03 against the KTH tenant
  (`https://kth.varbi.com/en/` → 60 open roles), no authentication required:
  - `GET https://kth.varbi.com/en/` → HTTP 200 HTML listing table; each row
    carries the `…/what:job/jobID:{jobID}/` link plus `pos-title`, `pos-town`,
    `pos-subcompany` and `pos-ends` cells.
  - `GET https://kth.varbi.com/en/what:job/jobID:935474/` → HTTP 200 job ad with
    a `<div class="job-desc">` body (≈ 6.5 KB markdown) and apply link
    `https://kth.varbi.com/se/apply/positionquick/935474/`.
  - An adapter smoke run returned 2 fully-mapped jobs; unknown slug → 0; no slug
    → 0. Confidence: **verified** (byte-confirmed listing rows + job-ad bodies).
- Varbi exposes no documented public JSON/RSS job feed; the server-rendered
  listing table is the authoritative public surface (parsed via stable
  cell-class-anchored regexes).
- The career page returns every open role in one response (no pagination);
  de-dup by `atsId` (numeric `jobID`); result-set sliced client-side to
  `resultsWanted` (default 100), detail fetches bounded to the sliced set.
