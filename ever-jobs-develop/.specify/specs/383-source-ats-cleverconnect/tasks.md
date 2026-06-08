# Tasks: 383 — CleverConnect ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 392 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-cleverconnect/{package.json,tsconfig.json,src/index.ts,src/cleverconnect.module.ts}`
  - **Acceptance:** package compiles; barrel exports `CleverConnectModule` +
    `CleverConnectService`; tsconfig extends the base + emits to
    `dist/packages/source-ats-cleverconnect`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/cleverconnect.types.ts`, `src/cleverconnect.constants.ts`
  - **Acceptance:** embedded-offer + label + normalised interfaces modelled with
    JSDoc (all fields optional + defensively narrowed); host template, root domain,
    board path, `/jobads/` path, default results, page cap, request headers,
    TransferState entity-decode map, offer-id regex, and remote regex defined; the
    verified public surface documented with date 2026-06-03 and the named real tenant
    (`demo`).
  - **Estimate:** 0.25 day

- [x] T03 — `CleverConnectService` implementing `IScraper`
  - **Files:** `src/cleverconnect.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant resolved from slug/url; board
    document fetched + entity-decoded; TransferState island harvested via a
    string-aware, brace-balanced scan anchored on `/jobads/{id}`; each offer parsed
    independently (never throws); numeric `id` → `atsId`; only `PUBLISHED` offers
    surfaced + deduped; description format-converted; department / employmentType /
    location / remote / applyUrl derived; stop at `resultsWanted` (page cap);
    canonical `/jobads/{id}` job URL built; HTTP 4xx / DNS → empty/partial;
    `tsc --noEmit` clean; `Logger` (no `console.log`).
  - **Estimate:** 0.5 day

## Phase 392 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.CLEVERCONNECT = 'cleverconnect'` exists; module in
    `ALL_SOURCE_MODULES`; path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 392 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/cleverconnect.e2e-spec.ts`
  - **Acceptance:** known-tenant (`demo`) shape assertions (guarded; asserts
    `site === Site.CLEVERCONNECT`, `atsType === 'cleverconnect'`, `atsId`/`jobUrl`
    defined), `companyUrl` resolution path, no-slug/url empty, unknown-tenant
    graceful, `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/383-source-ats-cleverconnect/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public pre-rendered board surface, TransferState decode, offer
    fields, URL shape, tenant resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `career.{tenant}.cleverconnect.com`, confirmed with
    the named real tenant `demo` (CleverConnect demo career site,
    `https://career.demo.cleverconnect.com/jobs`).
  - The board pre-renders the full open-roles array into the HTML as an Angular
    TransferState JSON island whose punctuation is HTML-entity-encoded
    (`&q;`=`"`, `&a;`=`&`, `&l;`=`<`, `&g;`=`>`, `&s;`=`'`). Each offer carries a
    numeric `id` (the stable ATS id), `title`, `description` (HTML), `locality`,
    `recruiter`/`publisher`, `url.jobOffer` / `url.jobOfferShort` (`/jobads/{id}`),
    `url.redirect` (external apply), and `labels.contractTypeList` /
    `labels.macroJobList`. Confidence: **verified**.
- The SPA's runtime XHR endpoints (`/api/offers`, `/seam/resource/rest/offer*`, …)
  404 to non-browser clients, so the pre-rendered TransferState island is the
  documented no-auth surface. The board renders every open role in one document (no
  server-side pagination of the offer set); the adapter decodes deduped offers and
  slices to `resultsWanted` (bounded by a page cap). De-dup is by `atsId`.
