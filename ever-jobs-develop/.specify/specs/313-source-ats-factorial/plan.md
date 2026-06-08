# Plan 313 — Factorial ATS Source Plugin

| Field        | Value                |
| ------------ | -------------------- |
| Spec         | spec.md              |
| Phase        | 322                  |
| Created      | 2026-06-03           |
| Last updated | 2026-06-03           |

> Implementation plan for `Spec 313 — source-ats-factorial`.

## Approach

Factorial career pages are server-rendered Rails applications with no
anonymous JSON API. The closest sibling adapter in this repo is
`source-ats-niceboard`, which also uses HTML parsing. The plan mirrors the
niceboard layout but adapts to Factorial's three-tier HTML surface: index
page, sitemap, and per-job detail pages.

## Architecture

```
packages/plugins/source-ats-factorial/
  package.json                         # @ever-jobs/source-ats-factorial
  tsconfig.json                        # extends base, own outDir
  src/
    index.ts                           # barrel (module + service)
    factorial.module.ts                # Nest DI module
    factorial.service.ts               # @SourcePlugin + IScraper.scrape
    factorial.types.ts                 # FactorialIndexJob, FactorialDetailJob
    factorial.constants.ts             # host template, paths, headers, defaults
  __tests__/
    factorial.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? first sub-domain label from `companyUrl`.
2. Fetch index page (`GET /`) + sitemap (`GET /sitemap.xml`) concurrently via
   `Promise.allSettled`; sitemap failure is tolerated (dates become `null`).
3. `parseIndexPage` — extract job entries from `data-controller='job-postings'`
   elements; build location/team id→name lookup tables from `<select>` options;
   derive office label from surrounding `<h3>` group heading.
4. `parseSitemap` — build url→lastmod map for `datePosted`.
5. Fan-out bounded concurrent detail fetches (`Promise.allSettled`,
   `FACTORIAL_MAX_CONCURRENCY=6`, polite delay between rounds).
6. `parseDetailPage` — extract description from `<div class='styledText'>`,
   apply URL from `<a href='/apply/…'>Apply now</a>`.
7. `buildJobPost` — map to `JobPostDto`; convert description per format;
   de-dup by `atsId`; trim to `resultsWanted`.

## Endpoint Discovery (verified 2026-06-03)

- Career-page index at `https://jobs-tendencys.factorialhr.com/` returned
  HTTP 200 with 22 jobs embedded in `data-controller='job-postings'`
  elements (no JS/XHR required).
- Sitemap at `/sitemap.xml` returned 22 `<url>` entries with `<lastmod>`.
- Detail page at `/job_posting/ai-developer-304592` returned HTTP 200 with
  description in `<div class='styledText'>` and apply link at
  `/apply/ai-developer-304592`.
- Factorial's authenticated REST API (`api.factorialhr.com/api/v1/ats/…`)
  requires OAuth2 credentials (HTTP 401 without them) and is not used.

## Registration (CLAUDE.md §4 — four files, applied centrally by orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `FACTORIAL = 'factorial'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes

- Index + sitemap fetched concurrently; sitemap failure degrades dates to
  `null`, never aborts the run.
- Detail fetches fanned out in chunks of `FACTORIAL_MAX_CONCURRENCY=6`
  with `Promise.allSettled`; a single page failure produces a job without
  a description rather than aborting.
- HTTP 400/404 on the index page → empty result; other errors caught →
  partial result. A single tenant never aborts a batch run.
- Result set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **No JSON API** → HTML parsing; resilient to minor layout changes via
  data-* attribute-based selectors and a flat-scan fallback.
- **N+1 detail fetches** → bounded concurrent fan-out with polite delay.
- **WAF 403 on some tenants** → out of scope (Q-FAC-1); graceful empty.
- **Custom domains** → caller passes `companyUrl`; adapter extracts the
  first sub-domain label (Q-FAC-2).

## Rollout

Single commit on `develop`. CI `build` (tsc) validates. No jest run
(network-dependent E2E excluded from unit CI).
