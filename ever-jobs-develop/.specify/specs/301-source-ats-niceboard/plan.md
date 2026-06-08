# Plan 301 — Niceboard ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 301 — source-ats-niceboard`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest siblings:
`source-ats-eightfold` for paginated fan-out and `source-ats-clearcompany` for
the single-package layout). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Niceboard board
search feed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-niceboard/
  package.json                       # @ever-jobs/source-ats-niceboard
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    niceboard.module.ts              # Nest DI module
    niceboard.service.ts             # @SourcePlugin + IScraper.scrape
    niceboard.types.ts               # wire-shape interfaces (snake_case + aliases)
    niceboard.constants.ts           # host template, path, base params, defaults, headers
  __tests__/
    niceboard.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveBoard` — `companySlug` ?? board label from `companyUrl` (first
   sub-domain label).
2. `fetchPage(host, page)` → `GET /api/jobs` with the full base-filter param set
   + `limit`/`page` → `{ jobs, count }`. HTTP 400/404 (unknown board) → empty
   (no throw).
3. First page seeds the total `count`; remaining pages fanned out with a bounded
   `Promise.allSettled` (`NICEBOARD_MAX_CONCURRENCY`), polite delay between rounds.
4. `collect` → `processJob` → `JobPostDto`, de-duping by job id.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The board page (`https://{board}.niceboard.co`) is a Vue SPA; its `fetchJobs()`
  method calls `GET /api/jobs`, passing the `filters` object with array fields
  JSON-stringified. Reproduced that call against `avajobboard.niceboard.co`:
  HTTP 200, `{ jobs: [...], count: 224, ... }` with fully shaped job objects.
- Omitting the array/object filters returns HTTP 200
  `{"success":false,"error":"validation"}`; sending the full base set fixes it.
- The private `/api/v1/jobs` route returns HTTP 401
  `{"error":true,"reason":"invalid_key"}` (needs a per-board secret) and is not
  used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `NICEBOARD = 'niceboard'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- First feed call per board yields the true `count`; remaining pages fanned out
  with a bounded `Promise.allSettled` so one transient page failure never nukes
  the batch.
- HTTP 400/404 → empty result; other errors caught → partial result. A single
  board never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some boards** → out of scope (Q-NB-1); graceful empty result.
- **Validation error on incomplete query** → a fixed full base-param set is
  always sent (`NICEBOARD_BASE_PARAMS`).
- **Wire-shape drift (snake vs camel)** → both spellings modelled in types and
  read with `??` fallbacks.
- **Free-text `location_name`** → heuristic comma-split into city/state/country
  when the structured `location` object is absent (Q-NB-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
