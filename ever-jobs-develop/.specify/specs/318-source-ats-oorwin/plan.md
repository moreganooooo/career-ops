# Plan 318 — Oorwin ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 318 — source-ats-oorwin`.

## Approach

Mirror the existing paginated ATS adapter pattern (closest sibling:
`source-ats-niceboard` for the paged fan-out layout). Build a self-contained
plugin package with the standard file layout, implement `IScraper` over the
public Oorwin career portal API, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-oorwin/
  package.json                       # @ever-jobs/source-ats-oorwin
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    oorwin.module.ts                 # Nest DI module
    oorwin.service.ts                # @SourcePlugin + IScraper.scrape
    oorwin.types.ts                  # wire-shape interfaces
    oorwin.constants.ts              # API URLs, paths, page size, defaults, headers
  __tests__/
    oorwin.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` ?? first sub-domain label from `companyUrl`.
2. `fetchListPage(tenant, page)` → `POST /api/v2/careers/getJobList` with
   `sub_domain`, `limit`, `page`, etc. → `{ items, total, lastPage }`.
   Status 404 / non-1 response → returns null (unknown tenant, no throw).
3. First page seeds `total` and `lastPage`; remaining pages fanned out with a
   bounded `Promise.allSettled` (`OORWIN_MAX_CONCURRENCY`).
4. For each batch of listing items, `fetchDescriptionsAndCollect` fires
   `POST /api/v2/careers/job_view` concurrently for every item (bounded by the
   same concurrency limit); individual detail failures yield null description.
5. `processJob` → `JobPostDto`, de-duping by numeric job id.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The portal page (`https://purpledrive.oorwin.com/careers/`) is an AngularJS
  SPA. Its `jobs_list.js` controller calls `HireApiServices.post('careers/getJobList', postData)`
  where `WEB_API_URL = "https://api.oorwin.ai/api/v2/"` (from `config.js`).
- The `sub_domain` is extracted from `window.location.host.split('.')[0]`
  (i.e. the first subdomain label).
- Verified live: `POST https://api.oorwin.ai/api/v2/careers/getJobList` with
  `{sub_domain:"purpledrive", limit:5, page:1, order:"cp_published_on", sort:"desc", list_type:1, getDefaultData:true}`
  → HTTP 200, `status:1`, 2 804 total jobs, 561 pages.
- Job descriptions are not embedded in listing rows; a separate
  `POST /api/v2/careers/job_view` with `job_id: computed_sha1_job_id` returns
  the full `job_description` HTML.
- No auth headers or tokens required for either call.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `OORWIN = 'oorwin'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- First listing call per tenant yields `total` and `last_page`; remaining
  pages fanned out with a bounded `Promise.allSettled` so one transient page
  failure never nukes the batch.
- Per-job detail fetches are also fanned out with `Promise.allSettled`; a
  single detail failure yields a job with null description (still collected).
- HTTP error / unknown tenant → null from `fetchListPage` → empty result.
  Other errors caught at the top level → partial result. A single tenant
  never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **Per-job detail latency** — Each job requires a second POST; with 50 jobs
  per page this doubles the HTTP round-trips. Bounded by `OORWIN_MAX_CONCURRENCY`
  (6) concurrent detail calls per batch; individual failures tolerated (Q-OW-1).
- **Wire-shape drift** — Both listing and detail interfaces are typed with
  optional fields and `??` fallbacks; missing fields produce null, not errors.
- **Custom domains** — If `companyUrl` has no recognisable sub-domain, the
  tenant resolves to empty and the scraper returns gracefully (Q-OW-2).
- **WAF 403 on some tenants** → out of scope; graceful empty result.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
