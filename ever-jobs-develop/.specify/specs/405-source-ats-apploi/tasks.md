# Tasks: 405 — Apploi ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 414 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-apploi/{package.json,tsconfig.json,src/index.ts,src/apploi.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/apploi.types.ts`, `src/apploi.constants.ts`
  - **Acceptance:** company-profile envelope + job-item + search envelope + geo-location +
    normalised interfaces modelled with JSDoc; board host, API hosts (`api.apploi.com`,
    `ats-integrations.apploi.com`), profile + search paths, search source token, default
    results, page cap, request headers (incl. anonymous empty bearer), the remote `job_type`
    token, and remote regex defined; verified public surface documented with date 2026-06-04
    and the named real tenant `apploi.com` (profile id `30372`, team ids
    `30610,32770,37756,41018,42745`).
  - **Estimate:** 0.25 day

- [x] T03 — `ApploiService` implementing `IScraper`
  - **Files:** `src/apploi.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; slug resolved from slug/url; public company profile
    `GET /v1/company_profiles/{slug}` GETted for `teams_to_show` (fallback `team_id`); public
    search feed `GET /search/jobs/?teams={csv}&page={n}&source=company_profile_page` GETted as
    JSON; `{ data, … }` envelope read; `data` narrowed; pages drained until an empty `data`
    bounded by a page cap; string `id` → `atsId`; deduped; description format-converted when
    present; department (`industry`) / employmentType (`job_type`) / structured location /
    remote (`job_type` first, then regex) / datePosted derived; canonical detail + apply URL
    taken from `redirect_apply_url`; company name from `brand_name` / profile / slug; stop at
    `resultsWanted`; per-request timeout capped at 15s on BOTH `timeout` + `requestTimeout`;
    HTTP 4xx / DNS / malformed → empty/partial, never throws; `tsc --noEmit` clean (modulo the
    orchestrator-supplied `Site.APPLOI`).
  - **Estimate:** 0.5 day

## Phase 414 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.APPLOI = 'apploi'` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present. (Orchestrator-owned.)
  - **Estimate:** 0.25 day

## Phase 414 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/apploi.e2e-spec.ts`
  - **Acceptance:** known-tenant (`apploi.com`) shape assertions (guarded; asserts
    `site === Site.APPLOI`, `atsType === 'apploi'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured.
    30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/405-source-ats-apploi/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** two-hop public board surface (profile → teams → search feed), drain
    strategy, `redirect_apply_url` detail shape, slug resolution, mapping table, and non-goals
    documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-04, no authentication required:
  - Platform + addressing `jobs.apploi.com/profile/{slug}` and `jobs.apploi.com/view/{id}`;
    API hosts `api.apploi.com` + `ats-integrations.apploi.com` (read from the board's client
    bundle, which builds the search request with an empty bearer for anonymous visitors).
  - `GET https://api.apploi.com/v1/company_profiles/apploi.com` returned
    `{ data: { id:30372, name:"Apploi Corp", url_slug:"apploi.com", team_id:30610,
    teams_to_show:"30610,32770,37756,41018,42745" } }`.
  - `GET https://ats-integrations.apploi.com/search/jobs/?teams=30610,…&page=1` returned
    `{ data: [ { id:"1736889", name:"Account Executive, Enterprise", city:"New York",
    state:"New York", job_type:"Full Time", industry:"Healthcare",
    published_date:"2026-05-12", redirect_apply_url:"https://jobs.apploi.com/view/1736889?…" } ],
    … }`, with an out-of-range `page` returning an empty `data` array. Confidence: **verified**.
- The role data is a clean JSON feed (behind a client-rendered SPA), so it is consumed as a REST
  endpoint; no headless browser is required.
- The search feed keys off team ids (not the slug); the company profile exposes `teams_to_show`,
  so the adapter does a two-hop fetch (profile → teams → search feed).
- The search envelope carries no pagination meta; the adapter drains pages until an empty `data`
  array, bounded by a page cap, dedupes by `atsId`, and stops once `resultsWanted` roles are
  collected.
