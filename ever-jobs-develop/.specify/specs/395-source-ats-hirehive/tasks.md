# Tasks: 395 — Hirehive ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 404 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-hirehive/{package.json,tsconfig.json,src/index.ts,src/hirehive.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/hirehive.types.ts`, `src/hirehive.constants.ts`
  - **Acceptance:** feed-envelope + role + nested (country / description / category / type /
    experience / language) + normalised interfaces modelled with JSDoc; career host suffix,
    root domain, feed path, source token, page size, default results, page cap, request
    headers, the remote `type` token, and remote regex defined; verified public surface
    documented with date 2026-06-03 and named real tenants (`hirehive`,
    `hirehive-testing-account`, `amcsgroup`).
  - **Estimate:** 0.25 day

- [x] T03 — `HirehiveService` implementing `IScraper`
  - **Files:** `src/hirehive.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; public CareerSite
    feed `GET /api/v2/jobs?...&source=CareerSite` GETted as JSON; `{ meta, links, items }`
    envelope read; `items` narrowed; pages drained via `meta.has_next_page` bounded by a
    page cap; string `id` → `atsId`; deduped; description format-converted when present;
    department (`category.name`) / employmentType (`type.name`) / structured location /
    remote (`type.type` first, then regex) / datePosted derived; canonical detail + apply
    URL taken from `hosted_url`; company name de-slugified from the tenant; stop at
    `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`;
    HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo
    the orchestrator-supplied `Site.HIREHIVE`).
  - **Estimate:** 0.5 day

## Phase 404 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.HIREHIVE = 'hirehive'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 404 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/hirehive.e2e-spec.ts`
  - **Acceptance:** known-tenant (`hirehive`) shape assertions (guarded; asserts
    `site === Site.HIREHIVE`, `atsType === 'hirehive'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured (against the multi-page `hirehive-testing-account` demo board).
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/395-source-ats-hirehive/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public CareerSite JSON-feed surface, drain strategy, `hosted_url` detail
    shape, tenant resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.hirehive.com`, confirmed with named real
    tenants `hirehive` (HireHive), `hirehive-testing-account` (HireHive demo), `amcsgroup`
    (AMCS Group).
  - The public CareerSite feed `GET /api/v2/jobs?page={n}&page_size={k}&source=CareerSite`
    returned the `{ meta, links, items }` envelope: **1 live role** for `hirehive`
    (`job_fVDsSf`, `hosted_url`
    `https://hirehive.hirehive.com/speculative-application-cork-fVDsSf`) and **11 roles
    across 2+ pages** for `hirehive-testing-account` (first role `job_QxZUlo`, `hosted_url`
    `.../human-resources-assistant-san-francisco-QxZUlo`). The endpoint is documented
    `security: []` (no bearer token). Confidence: **verified**.
- The role data is a clean JSON feed (not a JS island, not an SSR DOM), so it is consumed as
  a REST endpoint; no headless browser is required.
- The authenticated `api.hirehive.com/v1.0/{company_id}/...` REST API is explicitly NOT used
  (it requires a bearer token); only the public per-tenant CareerSite feed is consumed.
- The feed paginates (`page` / `page_size` ≤ 100, `meta.has_next_page`); the adapter
  requests `page_size=100`, drains pages bounded by a page cap, dedupes by `atsId`, and
  stops once `resultsWanted` roles are collected.
