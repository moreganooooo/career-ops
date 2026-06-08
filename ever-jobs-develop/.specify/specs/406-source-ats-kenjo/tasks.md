# Tasks: 406 — Kenjo ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 406 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-kenjo/{package.json,tsconfig.json,src/index.ts,src/kenjo.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/kenjo.types.ts`, `src/kenjo.constants.ts`
  - **Acceptance:** career-site envelope + role + nested (jobDescription) + normalised
    interfaces modelled with JSDoc; career host suffix, root domain, public controller path,
    list/detail/detail-page url builders, default results, detail-fetch cap, request headers,
    non-tenant labels, and remote regex defined; verified public surface documented with date
    2026-06-03 and the named real tenant `careers`.
  - **Estimate:** 0.25 day

- [x] T03 — `KenjoService` implementing `IScraper`
  - **Files:** `src/kenjo.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; tenant resolved from slug/url; public career-site
    controller `GET /api/controller/career-site/public/{tenant}/positions` GETted as JSON;
    `activePositions[]` read + narrowed; string `_id` → `atsId`; deduped; per-role detail
    (keyed by `customUrl`) fetched for `jobDescription.html`, bounded by a detail-fetch cap;
    description format-converted when present; department (`departmentName`) / employmentType
    (`positionType`) / structured location (`city`/`officeName`/`country`) / remote (text
    regex) / datePosted (`publishedAt`/`createdAt`) derived; canonical detail + apply URL
    `{origin}/positions/{customUrl}`; company name from role / career-site config / de-slugified
    tenant; stop at `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` +
    `requestTimeout`; HTTP 404 / DNS / malformed → empty/partial, never throws; `tsc --noEmit`
    clean (modulo the orchestrator-supplied `Site.KENJO`).
  - **Estimate:** 0.5 day

## Phase 406 — Registration (orchestrator-owned)

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.KENJO = 'kenjo'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Note:** wired centrally by the orchestrator — this plugin edits no shared file.
  - **Estimate:** 0.25 day

## Phase 406 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/kenjo.e2e-spec.ts`
  - **Acceptance:** known-tenant (`careers`) shape assertions (guarded; asserts
    `site === Site.KENJO`, `atsType === 'kenjo'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/406-source-ats-kenjo/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public career-site JSON-API surface, list/detail strategy,
    `/positions/{customUrl}` detail shape, tenant resolution, mapping table, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.kenjo.io`, confirmed with the named real tenant
    `careers` (Kenjo GmbH's own active career site). API base + career-site-name resolution
    extracted from the live Angular bundle (`CAREER_SITE_CONTROLLER_URL =
    `${origin}/api/controller/career-site/public/`, name = `host.split('.')[0]`).
  - The public list `GET /api/controller/career-site/public/careers/positions` returned
    HTTP 200 with a config envelope + `activePositions[]` (**1 live role**, `_id`
    `5dde37c7913b8600132907a9`, `customUrl` `initiative`, `positionType` `Full-time`,
    `companyName` `Kenjo GmbH`, `officeName` `Berlin`). The detail `.../positions/initiative`
    (keyed by `customUrl`, NOT `_id`) returned HTTP 200 with `jobDescription.html`. The public
    detail page `https://careers.kenjo.io/positions/initiative` returned HTTP 200. An absent
    career site returns HTTP 404 `{ "code":404, "message":"Company career site was not found." }`.
    Confidence: **verified**.
- The role data is a clean JSON API (served by the SPA's own origin controller), so it is
  consumed as a REST endpoint; no headless browser is required.
- The support-gated / authenticated `api.kenjo.io` REST API is explicitly NOT used (it
  requires an API key obtained via Kenjo support); only the public per-tenant career-site
  controller is consumed.
- The public list endpoint is un-paginated; the adapter reads the single `activePositions[]`
  array, dedupes by `atsId`, bounds the per-role detail enrichment by a fetch cap, and stops
  once `resultsWanted` roles are collected.
