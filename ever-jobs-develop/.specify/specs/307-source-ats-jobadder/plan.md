# Plan 307 — JobAdder ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 307 — source-ats-jobadder`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest siblings:
`source-ats-clearcompany` for the single-host multi-tenant shape,
`source-ats-eightfold` for the bounded `Promise.allSettled` fan-out). Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public JobAdder Careerpage HTML, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-jobadder/
  package.json                       # @ever-jobs/source-ats-jobadder
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    jobadder.module.ts               # Nest DI module
    jobadder.service.ts              # @SourcePlugin + IScraper.scrape
    jobadder.types.ts                # parsed-record interfaces (listing + tenant)
    jobadder.constants.ts            # host, path templates, fan-out, defaults, headers
  __tests__/
    jobadder.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `{accountId, slug}` from `companySlug` (`{accountId}/{slug}`)
   or the first two path segments of `companyUrl`. A bare slug (no account id) is
   rejected.
2. `fetchListing(tenant)` → `GET /{accountId}/{slug}` → HTML. HTTP 400/404
   (unknown tenant) → `null` (no throw).
3. `parseListings` → one `JobAdderListing` per `job_items` card (title, jobId,
   detail URL, date, bullet items, snippet).
4. `enrichDescriptions` → bounded `Promise.allSettled` fan-out over detail pages;
   each failure logged, role kept with snippet fallback.
5. `processJob` → `JobPostDto`, de-duping by numeric job id.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- JobAdder's v2 jobs API (`GET /jobboards/{boardId}/ads`) requires OAuth2
  (`read_jobad` / `partner_jobboard` scopes) — unusable anonymously.
- The JavaScript widget (`//apps.jobadder.com/widgets/V1/Jobs/RenderJobList`,
  JSONP) returns server-rendered HTML fragments keyed by an opaque widget `key`,
  not by a tenant slug — does not fit the generic slug-addressable model.
- The hosted **Careerpage** (`https://clientapps.jobadder.com/{accountId}/{slug}`)
  is fully anonymous and slug-addressable. Verified the `84381/eq8-recruit`
  tenant returns 4 open roles as `job_items` cards; each links to a detail page
  (`/{accountId}/{slug}/{jobId}/{titleSlug}`) carrying the full description HTML.
  An unknown account/slug returns HTTP 404 → handled as empty.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `JOBADDER = 'jobadder'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1..5)

- One listing call per tenant; detail fetches fanned out with bounded
  concurrency (max 6) via `Promise.allSettled` and a polite inter-round delay.
- HTTP 400/404 → empty result; other errors caught → partial result. A single
  tenant (or a single detail page) never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-JA-1); graceful empty result.
- **Markup drift** → tolerant regex selectors (class-substring matches) plus a
  defensive anchor fallback; per-card parse failures are skipped, not fatal.
- **Mixed bullet list** → heuristic classification of location / employment type
  / department (Q-JA-2).
- **Pagination** → single-page ingest this iteration (Q-JA-3).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
