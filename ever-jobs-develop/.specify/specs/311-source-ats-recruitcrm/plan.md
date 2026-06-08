# Plan 311 — Recruit CRM ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 311 — source-ats-recruitcrm`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-niceboard` for public paginated feed + bounded fan-out).  Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public Albatross feed, and register it in the four
canonical locations (handled centrally by the orchestrator).

## Architecture

```
packages/plugins/source-ats-recruitcrm/
  package.json                         # @ever-jobs/source-ats-recruitcrm
  tsconfig.json                        # extends base, own outDir
  src/
    index.ts                           # barrel (module + service)
    recruitcrm.module.ts               # Nest DI module
    recruitcrm.service.ts              # @SourcePlugin + IScraper.scrape
    recruitcrm.types.ts                # wire-shape interfaces
    recruitcrm.constants.ts            # endpoint URLs, headers, defaults
  __tests__/
    recruitcrm.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveAccountSlug` — `companySlug` ?? last path segment of `companyUrl`.
2. `fetchPage(client, accountSlug, offset)` →
   `POST /v1/external-pages/jobs-by-account/get?account={slug}&batch=true`
   with body `{limit, offset, search_data: {}, onlyJobs: true}`.
   `status: "fail"` or HTTP 400/401/404 → empty (no throw).
3. First page seeds the job list.  When `returned.length < limit` the feed is
   exhausted.  Remaining pages fanned out with a bounded `Promise.allSettled`
   (`RECRUITCRM_MAX_CONCURRENCY`), polite delay between rounds.
4. `collect` → `processJob` → `JobPostDto`, de-duping by `slug`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The jobs-page SPA at `https://recruitcrm.io/jobs/{accountSlug}` is a Next.js
  app; its JavaScript bundle (chunk
  `app/jobs/[account_job_page_name]/page-3fb6d24bbcc5e9e5.js`) contains the
  call:

  ```js
  r = "external-pages/jobs-by-account/get?account=" + n + "&batch=true";
  u.Z.post(r, { limit, offset, search_data, onlyJobs: true });
  ```

  where `u.Z` is an axios instance with base URL
  `https://albatross.recruitcrm.io/v1`.

- Live test against `Terra_Careers`:
  `POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get?account=Terra_Careers&batch=true`
  → HTTP 200 `{"status":"success","data":{"jobs":[...]}}`, 14 jobs with fully
  shaped objects.

- CORS: `Access-Control-Allow-Origin: https://recruitcrm.io` on 200 responses;
  we always send `Origin: https://recruitcrm.io`.

- The credentialed `GET https://api.recruitcrm.io/v1/jobs` route requires a
  `Bearer` token and is not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `RECRUITCRM = 'recruitcrm'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes

- No `total_count` in the response: exhaustion is detected when
  `returned.length < limit`.
- HTTP 400/401/404 or `status: "fail"` → empty result; other errors caught →
  partial result.  A single account never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Origin header required** — Albatross validates the `Origin` header and
  returns 200 only for known origins.  We always send
  `Origin: https://recruitcrm.io`, which is the canonical public origin.
- **WAF 403 on some accounts** → graceful empty result.
- **No date field** → `datePosted` is always `null` (Q-RC-1).
- **No department field** → `department` is always `null` (Q-RC-2).
- **Custom domains** → not resolvable without extra lookup; out of scope (Q-RC-3).

## Rollout

Single PR / commit on `develop`.  CI `build` (tsc) + `test:sources` validate.
