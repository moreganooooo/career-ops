# Tasks: 356 — PageUp ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 365 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-pageup/{package.json,tsconfig.json,src/index.ts,src/pageup.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/pageup.types.ts`, `src/pageup.constants.ts`
  - **Acceptance:** normalised listing/detail/JSON-LD interfaces modelled with
    JSDoc; platform host + instance-id base template, listing path, job-href /
    JSON-LD / og / `<strong>`-label / remote regexes, pagination + default results,
    and request headers defined; researched + verified public surface documented
    with date 2026-06-03 and named real tenants (`595` Calor, `532` SA Health,
    `533` La Trobe, `399` Thiess).
  - **Estimate:** 0.25 day

- [x] T03 — `PageUpService` implementing `IScraper`
  - **Files:** `src/pageup.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; base resolved from slug/url; listing
    fetched + paginated + parsed (real `…/job/{jobId}/{slug}` anchors); detail
    pages fetched + `<strong>`-labelled fields parsed (with JSON-LD `JobPosting`
    recursive over arrays / `@graph` + `og:` fallbacks); job id → `atsId`; HTTP 4xx
    → empty/skip; de-dup by `atsId`; description format-converted; department /
    employmentType / location / remote / date derived; slice to `resultsWanted`;
    `tsc --noEmit` clean.
  - **Estimate:** 0.5 day

## Phase 365 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.PAGEUP` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 365 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/pageup.e2e-spec.ts`
  - **Acceptance:** known-tenant (`595`, Calor) shape assertions (guarded; asserts
    `site === Site.PAGEUP`, `atsType === 'pageup'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/356-source-ats-pageup/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public server-rendered listing + labelled-field detail-page
    surface, wire shape, base resolution, mapping table, and non-goals documented;
    tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched + verified live 2026-06-03, no authentication required:
  - Platform host `careers.pageuppeople.com` + numeric instance-id addressing
    (`/{instanceId}/caw/en/listing/`) confirmed, with named real tenants: Calor
    (`595`), SA Health (`532`), La Trobe University (`533`), Thiess (`399`), Asahi
    (`527`), CSU (`873`). Custom host: `pupcareers.pageuppeople.com`.
  - Server-rendered listing anchors (`…/job/{jobId}/{slug}`), `?page=&page-items=`
    pagination, and `<strong>`-labelled detail fields (`Job no:`, `Work type:`,
    `Location:`, `Categories:`, `Advertised:`, `Applications close:`) confirmed live.
  - Confidence: **verified** — the listing index is server-rendered (real anchors,
    not a SPA) and the labelled detail fields parse without a JS runtime; a
    schema.org `JobPosting` JSON-LD block is layered in only where a tenant exposes
    it, so the parser is defensive but the core surface is confirmed.
- There is no public, tenant-agnostic JSON list feed (the documented recruitment
  APIs require oAuth). The server-rendered listing (`…/listing/`) + per-role detail
  pages are the documented, no-auth, crawlable surface and are used here.
- The listing index paginates (`?page=&page-items=`); de-dup by `atsId`; the
  enumerated set is sliced client-side to `resultsWanted` (default 100) before
  detail pages are fetched, bounded by a hard page ceiling.
