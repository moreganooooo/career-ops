# Tasks: 412 — Radancy (TalentBrew) ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 412 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-radancy/{package.json,tsconfig.json,src/index.ts,src/radancy.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/radancy.types.ts`, `src/radancy.constants.ts`
  - **Acceptance:** results-envelope + parsed-tile + normalised interfaces modelled with
    JSDoc; root domain, host helper, default lang, results path, page size, default results,
    page cap, request headers, and remote regex defined; verified public surface documented
    with date 2026-06-03 and named real tenants (`jobs.radancy.com` org `47123`,
    `careers.aldi.us`).
  - **Estimate:** 0.25 day

- [x] T03 — `RadancyService` implementing `IScraper`
  - **Files:** `src/radancy.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; host resolved from slug/url; public results feed
    `GET /{lang}/search-jobs/results?...` GETted as JSON; `{ filters, results, hasJobs,
    hasContent }` envelope read; `results` HTML defensively regex-parsed into tiles; pages
    drained via `CurrentPage` (stop on empty / short page or `hasJobs === false`) bounded by a
    page cap; `data-job-id` → `atsId`; deduped; structured location split from the
    `job-location` line; remote via regex; canonical detail + apply URL from the anchor href
    resolved absolute; company name de-slugified from the host; stop at `resultsWanted`;
    per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`; HTTP 4xx / DNS /
    malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.RADANCY`).
  - **Estimate:** 0.5 day

## Phase 412 — Registration (orchestrator-owned)

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.RADANCY = 'radancy'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present. (Wired by the orchestrator, not this plugin.)
  - **Estimate:** 0.25 day

## Phase 412 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/radancy.e2e-spec.ts`
  - **Acceptance:** known-host (`jobs.radancy.com`) shape assertions (guarded; asserts
    `site === Site.RADANCY`, `atsType === 'radancy'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-host graceful, `resultsWanted`
    honoured. 30000 ms timeouts on network tests; zero results tolerated.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/412-source-ats-radancy/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public results-feed surface, drain strategy, detail-URL shape, host
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform is hostname-multi-tenant (one TalentBrew host per customer), confirmed against
    `jobs.radancy.com` (Radancy's own board, org id `47123`) and `careers.aldi.us`.
  - The public results feed `GET /{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage={k}&FacetType=0`
    returned `{ filters, results, hasJobs, hasContent }`; the `results` HTML carried real job
    tiles, e.g. `href="/en/job/atlanta/customer-success-manager/47123/95942349392"`
    `data-job-id="95942349392"`, `<span class="job-location">Atlanta, Georgia</span>`,
    `data-org-id="47123"`. The sitemap confirmed the detail URL shape
    `/{lang}/job/{location}/{slug}/{orgId}/{jobId}`. Confidence: **verified** (envelope +
    endpoint + URL shape); per-tile HTML class names may drift across TalentBrew template
    versions, so the parser is defensive.
- The `results` payload is server-rendered HTML, not per-field JSON, so the per-role fields
  are limited to title / location / detail URL / org id / job id; description / department /
  employment type / posted date live on the detail page and are intentionally left null (no
  N+1 detail fetch).
- The feed paginates (`CurrentPage` / `RecordsPerPage`); the adapter requests
  `RecordsPerPage=50`, drains pages bounded by a page cap, dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected or a page is empty / short.
