# Plan 314 — Workstream ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 314 — source-ats-workstream`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-niceboard`
for the two-level fetch architecture and `source-ats-gohire` for HTML+detail
fan-out). Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public Workstream HTML careers surface, and register
it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-workstream/
  package.json                       # @ever-jobs/source-ats-workstream
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    workstream.module.ts             # Nest DI module
    workstream.service.ts            # @SourcePlugin + IScraper.scrape
    workstream.types.ts              # WorkstreamListJob + WorkstreamDetailJob
    workstream.constants.ts          # host, path templates, concurrency, defaults, headers
  __tests__/
    workstream.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveCompanyPath` — `companySlug` (e.g. `36047dd7/jamba`) ?? path extracted
   from `companyUrl`.
2. `fetchPositionsList(companyPath)` → `GET /j/{companyPath}/positions` (HTML) →
   parse all `<a href>` links matching the job-URL pattern → `WorkstreamListJob[]`.
   HTTP 404/410 → empty (no throw).
3. Fan out to `fetchJobDetail(listJob)` with bounded `Promise.allSettled`
   (`WORKSTREAM_MAX_CONCURRENCY = 5`), polite delay between rounds.
4. `parseJobDetail(html)` → `WorkstreamDetailJob` (regex-based extraction of title,
   company name, location, employment type, pay, description).
5. `processJob(listJob, detail)` → `JobPostDto`, de-duping by jobId.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (heuristic, investigated 2026-06-03)

- The Workstream public careers pages at `www.workstream.us/j/{accountId}/{brandSlug}`
  are server-rendered HTML. The positions listing (`/positions`) enumerates all open
  roles as anchor links.
- Individual job detail pages contain the full description, location (via og:meta or
  inline address text), employment type, and pay rate.
- No public anonymous JSON API was found. The REST API (`public-api.workstream.us`)
  requires OAuth2 bearer tokens and is not used.
- Confirmed live tenants: `36047dd7/jamba`, `f030c4f0/ymca`, `221e9529/ihop`,
  `3547b62e/wendys` (all returned HTTP 200 HTML, 2026-06-03).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `WORKSTREAM = 'workstream'` (already present).
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- The positions listing is a single HTML fetch per tenant; detail pages are fanned
  out with a bounded `Promise.allSettled` so one transient page failure never nukes
  the batch.
- HTTP 404/410 or "Record does not exist" page → empty result; other errors caught
  at the outer level → partial result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope; graceful empty result.
- **HTML structure drift** → lightweight regex-based extraction with defensive
  fallbacks; humanised slug fallback when detail data is absent.
- **UUID requirement** → callers must know `{accountId}/{brandSlug}`. The `got.work`
  redirect path and the `companyUrl` fallback reduce the lookup burden (Q-WS-1).
- **datePosted unavailability** → field left null; recorded as Q-WS-2.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
