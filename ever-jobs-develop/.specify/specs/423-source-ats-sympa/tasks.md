# Tasks: 423 — Sympa ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 432 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-sympa/{package.json,tsconfig.json,src/index.ts,src/sympa.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/sympa.types.ts`, `src/sympa.constants.ts`
  - **Acceptance:** offer envelope + offer item + nested-location + normalised interfaces
    modelled with JSDoc; careers root domain (`recruitee.com`), feed path (`/api/offers/`), URL
    builders, published-status token, default results, offer cap, 15s timeout cap, request
    headers, and remote regex defined; verified public surface documented with date 2026-06-04
    and Sympa's own tenant `sympa.recruitee.com` (`{ "offers": [] }`) plus a populated tenant
    example (first role `id` `2620732`, `status` `published`).
  - **Estimate:** 0.25 day

- [x] T03 — `SympaService` implementing `IScraper`
  - **Files:** `src/sympa.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; slug resolved from slug/url (left-most sub-domain
    label on `*.recruitee.com`); public offers feed `GET /api/offers/` GETted once as JSON;
    `{ offers }` envelope read; `offers` narrowed; only `published` roles kept (lenient on
    missing status); numeric `id` → `atsId`; deduped; description (`description` + `requirements`
    combined) format-converted; department (`department`/`category_code`) / employmentType
    (`employment_type_code`) / structured location / remote (`remote`/`hybrid` first, then regex)
    / datePosted (`published_at`/`created_at`, `… UTC` normalised) derived; canonical detail +
    apply URLs from `careers_url` / `careers_apply_url`; company name from `company_name` / slug;
    emails from description + `mailbox_email`; stop at `resultsWanted` bounded by offer cap;
    per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS /
    malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.SYMPA`).
  - **Estimate:** 0.5 day

## Phase 432 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.SYMPA = 'sympa'` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present. (Orchestrator-owned.)
  - **Estimate:** 0.25 day

## Phase 432 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/sympa.e2e-spec.ts`
  - **Acceptance:** known-tenant (`bunq`) shape assertions (guarded; asserts
    `site === Site.SYMPA`, `atsType === 'sympa'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/423-source-ats-sympa/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** single public board offers-feed surface, single-GET drain strategy,
    `careers_url` / `careers_apply_url` detail+apply shape, sub-domain slug resolution, mapping
    table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-04, no authentication required:
  - Platform + addressing `{slug}.recruitee.com`; fixed feed path `/api/offers/` (read from the
    board's client bundle, which fetches the feed anonymously).
  - `GET https://sympa.recruitee.com/api/offers/` returned `{ "offers": [] }` (Sympa's own
    tenant, no currently-open roles — drains to an empty result).
  - An active tenant `GET https://{slug}.recruitee.com/api/offers/` returned
    `{ "offers": [ { id: 2620732, slug: "aml-branch-manager-romania",
    title: "AML Branch Manager, Romania", status: "published",
    careers_url: "https://…/o/aml-branch-manager-romania",
    careers_apply_url: "https://…/o/…/c/new", city: "Bucharest", country: "Romania",
    country_code: "RO", department: "Support & Operations",
    employment_type_code: "fulltime_permanent", hybrid: true,
    published_at: "2026-05-29 09:45:21 UTC", description: "<p>…</p>" } ] }`.
  - An unknown tenant host answered HTTP 404. Confidence: **verified**.
- The role data is a clean JSON feed (behind a client-rendered board), so it is consumed as a
  REST endpoint; no headless browser is required.
- The feed returns the tenant's full open-role set in a single envelope (no query-cursor
  pagination), so the adapter does a single GET, keeps only `published` roles, dedupes by
  `atsId`, and stops once `resultsWanted` roles are collected.
