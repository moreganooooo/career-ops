# Plan 310 — CATS ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 310 — source-ats-catsone`.

## Approach

Mirror the existing HTML-scrape ATS adapter pattern (closest sibling: `source-ats-avature` for cheerio-based HTML parsing; `source-ats-niceboard` for the package layout and paginated fan-out). Build a self-contained plugin package with the standard file layout, implement `IScraper` over the public CATS portal HTML surface, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-catsone/
  package.json                       # @ever-jobs/source-ats-catsone
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    catsone.module.ts                # Nest DI module
    catsone.service.ts               # @SourcePlugin + IScraper.scrape
    catsone.types.ts                 # parsed types (stub, detail, tenant context)
    catsone.constants.ts             # host template, paths, page size, defaults, headers
  __tests__/
    catsone.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — derives host + optional portal path from `companySlug` / `companyUrl`.
2. `discoverPortalPath` — fetches `/careers/` HTML and extracts the first `/careers/{id}-{name}` anchor when no portal path is already known.
3. `parseListingPage` (loop, `?page=N`) — cheerio-parses `.cats-job` elements into stubs (title, url, location, category). Terminates on a short page or `resultsWanted` cap.
4. `fetchDescriptions` — bounded `Promise.allSettled` fan-out; a failed detail request still produces a stub with `descriptionHtml: null`.
5. `processJob` — maps each `CatsoneJobDetail` to `JobPostDto` (description format-converted, location parsed, remote detected).
6. Return `JobResponseDto` trimmed to `resultsWanted`.

## Endpoint discovery (verified 2026-06-03)

- CATS portals are server-rendered PHP/HTML pages. No anonymous JSON feed exists.
- The public REST API (`GET api.catsone.com/v3/portals/{id}/jobs`) requires `Authorization: Token <key>` — HTTP 401 without it. Not used.
- All listing data is in HTML `.cats-job` wrapper elements documented in the CATS Job Widget CSS guide.
- Verified against `authoritypartnersinc.catsone.com/careers/86212-General`: HTTP 200, 28 jobs in `.cats-job-title` / `.cats-job-location` / `.cats-job-category` nodes.
- Pagination via `?page=N` confirmed: `?page=2` on `swan.catsone.com/careers/26625-EPCM-Portal` → HTTP 200, ~50 more jobs.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `CATSONE = 'catsone'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Per-job detail requests are the only fan-out; bounded at `CATSONE_DETAIL_CONCURRENCY` (5). Only triggered when `descriptionFormat` is set.
- HTTP 400/404 → empty result; other errors caught → partial result. A single tenant never aborts a batch run.
- Polite delay (`CATSONE_REQUEST_DELAY_MS` = 300 ms) between pagination rounds.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-310-1); graceful empty result.
- **HTML structure drift** → cascade of CSS selectors (`.cats-job` → table row fallback → anchor-link fallback) guards against minor template changes.
- **Custom-domain tenants** → caller must supply `companyUrl` pointing at the correct host; slug-only resolution requires the `catsone.com` sub-domain (Q-310-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
