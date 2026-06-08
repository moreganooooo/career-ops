# Tasks: 389 — isolved Hire ATS Source Plugin

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 398 — Plugin package

- [x] T01 — Scaffold package files
  - **Files:** `packages/plugins/source-ats-isolved/{package.json,tsconfig.json,src/index.ts,src/isolved.module.ts}`
  - **Acceptance:** package compiles; barrel exports module + service.
  - **Estimate:** 0.25 day

- [x] T02 — Wire-shape types + constants
  - **Files:** `src/isolved.types.ts`, `src/isolved.constants.ts`
  - **Acceptance:** JSON-LD `JobPosting` + sitemap-ref + normalised interfaces modelled
    with JSDoc; career host suffix, root domain, sitemap path, detail-URL builder,
    default results, detail-fetch cap, concurrency cap, timeout cap, request headers, the
    sitemap `<loc>` job regex, the `application/ld+json` regex, and the remote regex
    defined; verified public surface documented with date 2026-06-03 and the named real
    tenant (`americavotes`).
  - **Estimate:** 0.25 day

- [x] T03 — `IsolvedService` implementing `IScraper`
  - **Files:** `src/isolved.service.ts`
  - **Acceptance:** FR-1…FR-9 satisfied; tenant resolved from slug/url; per-tenant
    sitemap fetched (`maxRedirects: 0`) and open-role refs extracted + deduped by
    `jobId`; bounded `Promise.allSettled` detail fan-out parses each embedded JSON-LD
    `JobPosting` (bare / array / `@graph` narrowing); `jobId` → `atsId` with
    `identifier.sameAs` fallback; description format-converted from the posting HTML body;
    location / employmentType / remote / datePosted derived; canonical detail + apply URL
    = `/jobs/{jobId}.html`; stop at `resultsWanted`; per-request timeout capped at 15s by
    bounding BOTH `timeout` + `requestTimeout`; HTTP 3xx/4xx / DNS / malformed →
    empty/partial, never throws; `tsc --noEmit` clean (modulo the orchestrator-supplied
    `Site.ISOLVED`).
  - **Estimate:** 0.5 day

## Phase 398 — Registration

- [x] T04 — Register in the four canonical locations (applied centrally by orchestrator)
  - **Files:** `packages/models/src/enums/site.enum.ts`, `packages/plugins/index.ts`,
    `tsconfig.base.json`, `jest.config.js`
  - **Acceptance:** `Site.ISOLVED = 'isolved'` exists; module in `ALL_SOURCE_MODULES`;
    path alias + jest mapper present.
  - **Estimate:** 0.25 day

## Phase 398 — Tests and docs

- [x] T05 — Network-tolerant E2E test
  - **Files:** `__tests__/isolved.e2e-spec.ts`
  - **Acceptance:** known-tenant (`americavotes`) shape assertions (guarded; asserts
    `site === Site.ISOLVED`, `atsType === 'isolved'`, `atsId`/`jobUrl` defined),
    `companyUrl` resolution path, no-slug/url empty, unknown-tenant graceful,
    `resultsWanted` honoured. 30000 ms timeouts on network tests.
  - **Estimate:** 0.25 day

- [x] T06 — Spec artefacts
  - **Files:** `.specify/specs/389-source-ats-isolved/{spec.md,plan.md,tasks.md}`
  - **Acceptance:** public sitemap + JSON-LD surface, fan-out strategy, URL shape, tenant
    resolution, mapping table, and non-goals documented; tasks marked done.
  - **Estimate:** 0.25 day

## Notes

- Surface verified live 2026-06-03, no authentication required:
  - Platform + tenant host pattern `{tenant}.isolvedhire.com`, confirmed with the named
    real tenant `americavotes` (America Votes) and others (`isolved` — 67 open roles,
    `lyrasis`, `pantheondata`, `uasystem`).
  - The per-tenant `/job_site_map.xml` enumerates open roles as `/jobs/{jobId}.html`
    (robots.txt advertises the sitemap host `feeds.isolvedhire.com`). Each detail page
    embeds a Google-for-Jobs JSON-LD `JobPosting`; a live role (`…/jobs/1765310.html`,
    "Florida State Director") parsed with title, HTML body, `datePosted`,
    `employmentType: FULL_TIME`, `hiringOrganization.name`, and `jobLocation.address`
    (Miami / FL / US). Confidence: **verified**.
- The `/jobs/` board itself is a Vue SPA; the adapter intentionally avoids a headless
  browser by reading the server-side sitemap XML + server-embedded JSON-LD.
- The sitemap enumerates every open role in one document (no server-side pagination); the
  adapter dedupes by `jobId`, slices to `resultsWanted`, and bounds the detail fan-out
  with `Promise.allSettled` + a concurrency cap so one bad role never nukes the batch.
- An unknown / parked tenant 302-redirects off the board host; `maxRedirects: 0` surfaces
  that as a fast, skippable null rather than burning a timeout chasing the marketing site.
