# Plan: 357 — BrassRing ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), iCIMS (gateway JSON)|

> Implementation plan for `Spec 357 — source-ats-brassring`.

## Approach

Combine the two closest sibling patterns: the gateway-JSON listing pattern
(`source-ats-icims` — a JSON envelope fetched from the portal's own AJAX endpoint)
for role enumeration, and the schema.org detail-enrichment pattern
(`source-ats-hireful` — recursively walking a `JobPosting` JSON-LD block) for
per-role enrichment. The key difference from the sub-domain ATSes: BrassRing
addresses a tenant by a `partnerid` + `siteid` pair on the shared host
`sjobs.brassring.com`, so tenant resolution parses that pair from `companySlug`
or `companyUrl` rather than expanding a sub-domain. Build a self-contained plugin
package with the standard file layout, implement `IScraper` over the public AJAX
endpoint + detail pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-brassring/
  package.json                       # @ever-jobs/source-ats-brassring
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    brassring.module.ts              # Nest DI module
    brassring.service.ts             # @SourcePlugin + IScraper.scrape
    brassring.types.ts               # MatchedJobs envelope + JSON-LD interfaces
    brassring.constants.ts           # host, AJAX/detail paths, regexes, defaults, headers
  __tests__/
    brassring.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companyUrl` on `brassring.com` carrying `partnerid` + `siteid`
   query params → the pair verbatim; else `companySlug` (`partnerid:siteid` and
   common delimiter variants, or a `partnerid=…&siteid=…` fragment) → parsed pair.
   Null when neither yields a complete pair.
2. `fetchAllJobs(tenant)` → page `POST /TgNewUI/Search/Ajax/MatchedJobs`. HTTP 4xx
   or an empty envelope → empty (no throw); other errors re-thrown into the outer
   try/catch which returns partial results. Paging bounded by `JobsCount`,
   `MAX_PAGES`, and `resultsWanted`.
3. `normaliseJob(raw)` — pick the requisition id (`Autoreqid`/`Areq`, else numeric
   `Jobid`) as `atsId`, the title (`Title`/`JobTitle`), free-text location, listing
   summary; build the detail URL; de-dup by `atsId`.
4. `enrichFromDetail(job)` — best-effort `GET` of the `PageType=JobDetails&…&Areq={req}`
   page; when it carries a schema.org `JobPosting` JSON-LD block (recursive over
   arrays / `@graph`), fill gaps (HTML body, company, employment type, structured
   location, date). A 4xx / missing block leaves listing fields untouched.
5. `processJob` for each role → `JobPostDto`; `atsId` = requisition / job id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- BrassRing hosts every customer's Talent Gateway under the shared host
  `sjobs.brassring.com` (regional mirrors `krb-sjobs.brassring.com`,
  `jobs.brassring.com`). A tenant is addressed by a `partnerid` + `siteid` pair, e.g.
  `…/TGnewUI/Search/Home/Home?partnerid=25212&siteid=5164`.
- The jobs index is a client-rendered SPA ("TGnewUI"), so the listing page carries
  no server-side job links. The crawlable public surface is the portal's own AJAX
  search endpoint `POST /TgNewUI/Search/Ajax/MatchedJobs`, returning a JSON envelope
  `{ Jobs: [...], JobsCount, Facets, SortFields }` (the `ProcessSortAndShowMoreJobs`
  variant pages the same envelope). Each role's detail page is addressed by the
  requisition id (`PageType=JobDetails&…&Areq={req}`).
- Confirmed live: the shared host, the `partnerid`/`siteid` addressing model, named
  real tenants — AAFES (`25212`/`5164`), Peace Corps (`25332`/`5414`), U.S. Steel
  (`25307`/`5238`), Fairfax County Public Schools (`25103`/`5041`), Archer Daniels
  Midland (`25416`/`5998`) — the AJAX endpoint, the `{ Jobs, JobsCount }` envelope,
  and the `Areq` detail-page URL pattern.
- NOT confirmed (SPA limitation): the exact per-role field names inside `Jobs[]`,
  because an unauthenticated no-JS fetch returns only the app shell. The parser is
  therefore written defensively around the documented envelope (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `BRASSRING = 'brassring'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-brassring`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- AJAX paging bounded by `JobsCount`, `BRASSRING_MAX_PAGES` (20), and
  `resultsWanted`; detail-page enrichment is per-role and best-effort.
- HTTP 4xx (unknown `partnerid`/`siteid` or removed role) → empty / skip; a malformed
  envelope, non-JSON JSON-LD, or per-role map error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- Listing JSON + detail JSON-LD parsed with bounded scans (no XML / HTML library),
  keeping the plugin dependency-free and tolerant of payload drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Tenant addressing** (Q-BR-1) → parse the `partnerid`+`siteid` pair from
  `companySlug` (multiple delimiter forms / `partnerid=…&siteid=…`) or a full
  `companyUrl` query string.
- **SPA-rendered payload** (Q-BR-2) → parse the documented `{ Jobs, JobsCount }`
  envelope defensively, tolerating common BrassRing/Kenexa field-name spellings; a
  missing field is "missing", never a throw. Confidence: unverified.
- **Detail-page enrichment** (Q-BR-3) → enrich from JSON-LD when present (recursive
  over arrays / `@graph`); fall back entirely to listing fields when absent.
- **Payload drift** → defensive narrowing + field aliases; a role missing a title or
  id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
