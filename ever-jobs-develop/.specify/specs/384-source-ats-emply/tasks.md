# Tasks: 384 — Emply (Visma) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 393 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-emply/{package.json,tsconfig.json,src/index.ts,src/emply.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/emply.types.ts`, `src/emply.constants.ts`
  - **Acceptance:** embedded-vacancy + translation + normalised interfaces modelled
    with JSDoc; career host suffix, root domain, index paths, locales, ad/apply path
    segments, default results, page cap, request headers, the `proceedBatch` batch
    regex, and remote regex defined; verified public surface documented with date
    2026-06-03 and the named real tenant (`au`).
  - **Estimate:** 0.25 day

- [x] T03 — `EmplyService` implementing `IScraper`
  - **Files:** `src/emply.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; index probed
    across locale/path variants; `proceedBatch` payload extracted via a left-to-right
    JS-string-literal decoder (no `eval`) + `JSON.parse`; `shortId` → `atsId` with
    `publishingId`/`number` fallbacks; deduped; description format-converted from the
    translation HTML body; department / location / remote / datePosted derived;
    canonical detail + apply URLs built (external links preferred); stop at
    `resultsWanted`; HTTP 4xx / DNS / malformed → empty/partial, never throws;
    `tsc --noEmit` clean (modulo the orchestrator-supplied `Site.EMPLY`).
  - **Estimate:** 0.5 day

## Phase 393 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.EMPLY = 'emply'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 393 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/emply.e2e-spec.ts`
  - **Acceptance:** known-tenant (`au`) shape assertions (guarded; asserts
    `site === Site.EMPLY`, `atsType === 'emply'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/384-source-ats-emply/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public embedded-JSON index surface, decode strategy, URL shape,
    tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.career.emply.com`, confirmed with the
    named real tenant `au` (Aarhus University,
    `https://au.career.emply.com/en/vacant-positions`).
  - The server-rendered index embeds the open-vacancy set as
    `proceedBatch({ vacancies : JSON.parse('[…]') })`. Decoding the single-quoted JS
    string literal + `JSON.parse` yielded **6 live vacancies**, each with a `shortId` +
    `titleAsUrl` mapping to the canonical detail URL `/{locale}/ad/{titleAsUrl}/{shortId}`
    (e.g. `/en/ad/virksomhedskonsulent-til-…/vgxqup`). Confidence: **verified**.
- The vacancy data is server-embedded in the index HTML; no separate JSON feed / RSS is
  needed, and no headless browser is required. The richest per-role body is the
  `translations[].content` HTML; the `shortId` segment is the per-role ATS id.
- The index embeds every open role in one document (no server-side pagination); the
  adapter dedupes by `atsId` and slices to `resultsWanted` (bounded by a probe-page cap).
- The earlier assumption that apostrophes were escaped as `\x27` proved wrong on live
  data: the JS literal escapes `\\`, `\"`, `\'`, `\/` and standard whitespace/unicode
  escapes; the adapter decodes the literal exactly as the browser does (left-to-right
  single pass) rather than via a naive global replace.
