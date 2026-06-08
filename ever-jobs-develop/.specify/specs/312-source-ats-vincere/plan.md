# Plan 312 — Vincere ATS Source Plugin

| Field        | Value                               |
| ------------ | ----------------------------------- |
| Spec         | spec.md                             |
| Created      | 2026-06-03                          |
| Last updated | 2026-06-03                          |

> Implementation plan for `Spec 312 — source-ats-vincere`.

## Approach

Mirror the existing Niceboard ATS adapter pattern (closest sibling for the
paginated HTML-board layout). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Vincere AJAX search
feed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-vincere/
  package.json                       # @ever-jobs/source-ats-vincere
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    vincere.module.ts                # Nest DI module
    vincere.service.ts               # @SourcePlugin + IScraper.scrape
    vincere.types.ts                 # wire-shape interfaces
    vincere.constants.ts             # host template, paths, defaults, headers
  __tests__/
    vincere.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? first sub-domain label from `companyUrl`.
2. `fetchCsrfToken(host)` → `GET /careers/` → extract
   `<meta name="csrf-token">` + `laravel_session` cookie.
3. If no CSRF token → return empty `JobResponseDto` (unknown/dead board).
4. `fetchPage(host, csrfToken, sessionCookie, page)` →
   `POST /careers/ajax/search-jobs` → `{ items, total, more }`.
   HTTP 4xx (unknown board) → empty (no throw).
5. First page seeds the total; remaining pages fanned out with a bounded
   `Promise.allSettled` (`VINCERE_MAX_CONCURRENCY`), polite delay between rounds.
6. `collect` → `processJob` → `JobPostDto`, de-duping by job id.
7. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

The `careers/` page is a PHP/Laravel application:

1. **Initial GET** — `GET https://nordicjobsworldwide.vincere.io/careers/`
   returns HTTP 200 with server-rendered HTML including:
   - Jobs in `<article class="job">` (first 10)
   - `<meta name="csrf-token" content="...">` for the AJAX endpoint
   - `Set-Cookie: laravel_session=...` session cookie
   - JS init: `EH.index.generatePagination(193)` → total = 193 jobs

2. **AJAX search POST** — `POST /careers/ajax/search-jobs` with
   `X-CSRF-TOKEN` header + `laravel_session` cookie + form body `page=1`:
   ```json
   {
     "items": [ /* 10 VincereJob objects */ ],
     "total": 193,
     "more": true,
     "facets": { ... },
     "html": "<article class=\"job\">...</article>"
   }
   ```
   Each `VincereJob` item includes: `id`, `job_title`, `location`, `job_type`,
   `employment_type`, `published_date`, `public_description`, `job_summary`.

3. **Private API (NOT used)** — `GET /api/v2/job/search/` requires
   `x-api-key` + `id-token` OAuth2 credentials and is not available without
   a Vincere account.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `VINCERE = 'vincere'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- First AJAX call per tenant yields the true `total`; remaining pages fanned
  out with a bounded `Promise.allSettled` so one transient failure never nukes
  the batch.
- CSRF bootstrap failure (unknown/dead board) → empty result; HTTP 4xx on
  search → empty result; other errors caught → partial result. A single tenant
  never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **CSRF expiry on very long runs** → Q-V-1 (open); current fix: one token per
  `scrape()` call. The Laravel session lifetime is 120 minutes by default —
  well beyond any single scrape run.
- **WAF 403 on some boards** → Q-V-2 (out of scope); graceful empty result.
- **Custom-domain tenants with no sub-domain** → slug resolution returns empty;
  scraper degrades to empty result.
- **Wire-shape drift** → both `job_title` and `jobTitle` modelled as aliases.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
