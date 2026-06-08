# Tasks: 377 — Oleeo ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 386 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-oleeo/{package.json,tsconfig.json,src/index.ts,src/oleeo.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/oleeo.types.ts`, `src/oleeo.constants.ts`
  - **Acceptance:** board-fragment + normalised interfaces modelled with JSDoc; host
    template, root domain, board path, opp-path token, default results, page cap,
    page size, request headers, opp-link regex, remote regex, and date-label regex
    defined; verified public surface documented with date 2026-06-03 and the named
    real tenant (`fcdo`).
  - **Estimate:** 0.25 day

- [x] T03 — `OleeoService` implementing `IScraper`
  - **Files:** `src/oleeo.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant resolved from slug/url; board HTML
    walked for `…/opp/{ID}-{slug}` anchors + deduped (with `?start=` paging); detail
    page fetched (via `Promise.allSettled`) + normalised; numeric `{ID}` → `atsId`;
    DNS / HTTP 4xx → empty/skip; description format-converted; employmentType /
    location / remote / date derived; stop at `resultsWanted` (page cap); canonical
    public job URL preserved/built; `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 386 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.OLEEO` exists; module in `ALL_SOURCE_MODULES`; path alias +
    jest mapper present.
  - **Estimate:** 0.25 day

## Phase 386 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/oleeo.e2e-spec.ts`
  - **Acceptance:** known-tenant (`fcdo`) shape assertions (guarded; asserts
    `site === Site.OLEEO`, `atsType === 'oleeo'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/377-source-ats-oleeo/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered board + detail surface, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.tal.net`, confirmed with the named real
    tenant `fcdo` (UK FCDO, `https://fcdo.tal.net/`).
  - The server-rendered board HTML at `/candidate/jobboard/vacancy/1/adv/` and the
    per-role detail URL shape `…/opp/{ID}-{slug}/en-GB` (e.g.
    `/opp/26870-Post-Security-Manager-SRB26-006248/en-GB`,
    `/opp/26884-Administrative-Officer-Stanley-Falklands-Islands/en-GB`), with the
    leading numeric `{ID}` segment as the per-role ATS id. Confidence: **verified**.
- Detail pages are server-rendered HTML with no schema.org JSON-LD; the title is
  recovered from `og:title` / `<h1>` / `<title>`, the body from `<article>`/`<main>`,
  and labelled "Location" / "Employment Type" / "Closing date" lines from the body
  text, all narrowed defensively.
- The board lists every open role in one document for small boards; larger boards
  page via `?start=` (50 roles/page). The adapter collects deduped anchors and slices
  to `resultsWanted` (bounded by a page cap), then fans out the detail fetches with
  `Promise.allSettled`. De-dup is by `atsId` (`{ID}`).
