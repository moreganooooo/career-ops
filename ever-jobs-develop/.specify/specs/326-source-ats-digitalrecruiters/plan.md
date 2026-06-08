# Plan 326 — DigitalRecruiters ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 326 — source-ats-digitalrecruiters`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-oorwin`
for the JSON-API + per-job detail fan-out, and `source-ats-tribepad` for the
multi-tenant host/slug resolution). Build a self-contained plugin package with
the standard file layout, implement `IScraper` over the public DigitalRecruiters
career-site JSON API, and register it in the four canonical locations (done
centrally by the orchestrator).

## Architecture

```
packages/plugins/source-ats-digitalrecruiters/
  package.json                          # @ever-jobs/source-ats-digitalrecruiters
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    digitalrecruiters.module.ts         # Nest DI module
    digitalrecruiters.service.ts        # @SourcePlugin + IScraper.scrape
    digitalrecruiters.types.ts          # wire-shape interfaces (config/list/detail)
    digitalrecruiters.constants.ts      # endpoints, locale map, page size, defaults, headers
  __tests__/
    digitalrecruiters.e2e-spec.ts       # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` → `{slug}.digitalrecruiters.com`; else the
   host of `companyUrl`. Returns `{ tenant, host }`.
2. `fetchSiteConfig(host)` → `GET /careers/v1/careers-sites/{host}` → canonical
   `domain_name`, default locale, company name. HTTP 4xx / offline → empty.
3. `resolveLocale` expands the config `iso_code` to a region-qualified locale.
4. `fetchListPage(domainName, locale, page)` →
   `POST /public/v1/careers-site/job-ads?domainName=&limit=&page=&locale=` →
   `{ count, items[] }`. Page 1 yields the true `count`; remaining pages are
   fanned out with bounded `Promise.allSettled`.
5. `fetchDetailsAndCollect` — per listing row, `GET .../job-ads/{job_ad_id}` for
   the HTML description + structured address (bounded fan-out). Map →
   `JobPostDto`; de-dup by `job_ad_id`. Detail failures degrade to listing-only.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- The career-site SPA (`https://{tenant}.digitalrecruiters.com/`) embeds its
  public API base in the Nuxt runtime config: `apiBaseURL = .../careers/v1`
  (config) and `commonApiBaseUrl = .../public/v1` (job-ads). The SPA bundle's
  HTTP layer builds `/careers-site/job-ads?...` (POST list) and
  `/careers-site/job-ads/{id}?...` (GET detail) under the `public/v1` base, and
  `/careers-sites/{host}` (config) under the `careers/v1` base.
- Byte-confirmed live against `careers.segulatechnologies.com` (Segula
  Technologies, a known DigitalRecruiters customer): config HTTP 200
  (`domain_name=careers.segulatechnologies.com`, `internal_id=dRjVLJRz`);
  listing HTTP 200 (`count=683`); detail HTTP 200 (job_ad_id 4428717, HTML
  description + jsonld). A second tenant `recrutement.la-boucherie.fr` returned
  HTTP 200 (`count=58`), confirming the surface is generic, not tenant-specific.
- The job-ads endpoints require a region-qualified locale; bare `iso_code`
  values are rejected with HTTP 400. The SPA's locale-expansion table is
  replicated in `digitalrecruiters.constants.ts`.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `DIGITALRECRUITERS = 'digitalrecruiters'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-digitalrecruiters`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Page-1 `count` drives a bounded paginated fan-out; per-page and per-detail
  calls use `Promise.allSettled` so one failure never nukes the batch.
- Config 4xx / offline → empty; listing 4xx → empty; per-detail failure →
  listing-only `JobPostDto`; any uncaught error → partial result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally); polite delay
  between pagination rounds.

## Risks / Mitigations

- **Region-locale rejection** → expand `iso_code` via the SPA locale map; fall
  back to `en_GB` (Q-DR-1 / D-2).
- **Custom-domain config miss (404)** → graceful empty result (Q-DR-2).
- **Sparse description / empty `profile`** → concatenate `description` + `profile`
  when present; tolerate either being absent (Q-DR-3).
- **WAF gating on some tenants** → out of scope; graceful empty result.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
