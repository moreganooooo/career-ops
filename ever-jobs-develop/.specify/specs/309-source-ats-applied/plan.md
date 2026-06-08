# Plan 309 — Applied ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 309 — source-ats-applied`.

## Approach

Mirror the HTML-scraping ATS adapter pattern (closest siblings:
`source-ats-jazzhr` for cheerio-based HTML parsing, `source-ats-niceboard`
for bounded concurrent fan-out).  Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the publicly accessible
Applied org HTML page and per-job detail pages, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-applied/
  package.json                       # @ever-jobs/source-ats-applied
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    applied.module.ts                # Nest DI module
    applied.service.ts               # @SourcePlugin + IScraper.scrape
    applied.types.ts                 # parsed HTML result interfaces
    applied.constants.ts             # URLs, headers, concurrency, defaults
  __tests__/
    applied.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveOrgPath` — `companySlug` (requires `{orgId}/{orgSlug}` form) or
   path extracted from `companyUrl`.
2. `GET /org/{orgPath}` (org listing page) — parsed with cheerio to extract
   all `/apply/{slug}` anchors.
3. For each job link (up to `resultsWanted`): concurrent bounded fan-out with
   `Promise.allSettled` to `GET /apply/{slug}` (job detail page).
4. `parseJobDetailPage` — heuristic extraction of title, company, location,
   salary, employment type, closing date, description HTML.
5. `buildJobPost` → `JobPostDto`, de-duping by job slug.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- All `/api/v1/` paths return HTTP 401 Unauthorized without a session token;
  no public anonymous JSON API exists.
- The org listing page (`/org/1549/citizens-uk`) returns HTTP 200 HTML with
  `/apply/cuxl7vasjy` links for open roles.
- The job detail page (`/apply/cuxl7vasjy`) returns HTTP 200 HTML with role
  title, salary, location, closing date, and description prose.
- Slug-only org paths (`/org/citizens-uk`) return HTTP 404.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `APPLIED = 'applied'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Org listing page fetched once; job links bounded by `resultsWanted`.
- Job detail pages fanned out with `Promise.allSettled` (max 4 concurrent)
  so one transient failure never nukes the batch.
- HTTP 404 on org page → empty result; other errors → partial result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **No stable CSS selectors** → cheerio heuristics (container size, keyword
  matching for metadata) tolerate minor theme changes.
- **Numeric orgId required** → slug-only inputs return empty immediately with
  a clear warning; documented in spec as Q-APP-1.
- **Detail page HTML fragility** → on failure, degrade to minimal post from
  org-page anchor data (title + URL); degraded posts still match contract.
- **WAF / rate limiting** → polite delay between concurrent batches; degrade
  gracefully on 4xx/5xx.

## Rollout

Single PR / commit on `develop`.  CI `build` (tsc) validates.
