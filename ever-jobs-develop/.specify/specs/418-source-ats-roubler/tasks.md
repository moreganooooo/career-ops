# Tasks: 418 — Roubler ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 427 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-roubler/{package.json,tsconfig.json,src/index.ts,src/roubler.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service; `package.json` name
    `@ever-jobs/source-ats-roubler` v0.1.0 (main+types `src/index.ts`, MIT); `tsconfig.json`
    outDir `../../../dist/packages/source-ats-roubler`.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/roubler.types.ts`, `src/roubler.constants.ts`
  - **Acceptance:** advert-item + envelope + location + normalised interfaces modelled with JSDoc
    (multi-key probing for id / title / description / location / employmentType / department /
    company / date / apply-url); board host (`app.roubler.com`), region-sharded API origin
    (`graphql.au.roubler.com`), `/static/careers/{companyId}/adverts` feed-URL builder, board +
    advert URL builders, default results (100), page cap (25), `DEFAULT_TIMEOUT_SECONDS = 15`,
    request headers, remote token + regex defined; surface confidence documented with date
    2026-06-04 and **verified=FALSE** (anonymous careers JSON not capturable; defensive model).
  - **Estimate:** 0.25 day

- [x] T03 — `RoublerService` implementing `IScraper`
  - **Files:** `src/roubler.service.ts`
  - **Acceptance:** FR-1…FR-10 satisfied; company id resolved from slug/url; public careers feed
    `GET /static/careers/{companyId}/adverts?page={n}` GETted as JSON; role array narrowed from
    `data` / `adverts` / `results` / bare array; pages drained until an empty array bounded by a
    page cap; id (`id`/`advertId`/`uuid`) → `atsId`; deduped; description format-converted when
    present; department / employmentType / structured location / remote (flag → token → regex) /
    datePosted derived; canonical detail + apply URL from `applyUrl`/`url`/`link` (else derived);
    company name from `companyName`/`brand`/id; stop at `resultsWanted`; per-request timeout
    capped at 15s on BOTH `timeout` + `requestTimeout`; transport-failure vs HTTP-status
    distinguished; HTTP 4xx / DNS / malformed → empty/partial, never throws; `Logger` (no
    `console.log`); `tsc --noEmit` clean (modulo orchestrator-supplied `Site.ROUBLER`).
  - **Estimate:** 0.5 day

## Phase 427 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ROUBLER = 'roubler'` exists; module in `ALL_SOURCE_MODULES`; path alias
    + jest mapper present. (Orchestrator-owned.)
  - **Estimate:** 0.25 day

## Phase 427 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/roubler.e2e-spec.ts`
  - **Acceptance:** known-tenant (`roubler`) shape assertions (guarded; asserts
    `site === Site.ROUBLER`, `atsType === 'roubler'`, `atsId`/`jobUrl` defined), `companyUrl`
    resolution path, no-slug/url empty, unknown-tenant graceful, `resultsWanted` honoured. Because
    the surface is **verified=FALSE**, every network test tolerates zero results. 30000 ms timeouts
    on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/418-source-ats-roubler/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** single-host careers-feed surface, drain strategy, defensive multi-key
    normalisation, slug/url resolution, mapping table, graceful-degradation contract, and non-goals
    documented; surface confidence verified=FALSE with the 2026-06-04 live-research evidence; tasks
    marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface researched live 2026-06-04, no authentication — **verified=FALSE**:
  - Platform + shared candidate host `https://app.roubler.com/` (HTTP 200, an Expo /
    React-Native-Web SPA served by nginx); region aliases `https://app.roubler.com.au/` and
    `https://production.roubler.net/` both 301 → `app.roubler.com`.
  - Board runtime `https://app.roubler.com/config.js` advertises the region-sharded backend host
    `https://graphql.au.roubler.com/` and its `/static/` namespace (it pins the public
    `/static/clock/` + `/static/clock/log/` endpoints there).
  - `graphql.au.roubler.com/graphql` answers an authentication error anonymously, and every
    `/static/*` path answers HTTP 403 anonymously; the SPA shell ships an empty `<title>` with no
    server-rendered JobPosting JSON-LD. No anonymous careers-feed JSON response was capturable, so
    the feed path / shape / pagination are a defensive best-effort model of the documented public
    careers surface.
- The role data is modelled as a clean JSON feed (behind a client-rendered SPA), consumed as a
  REST endpoint; no headless browser is required.
- The careers feed is single-host (no two-hop profile lookup); the adapter pages it directly,
  narrows the role array across alternate keys, dedupes by `atsId`, and stops once `resultsWanted`
  roles are collected.
