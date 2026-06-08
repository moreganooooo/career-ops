# Plan 300 — ClearCompany ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 300 — source-ats-clearcompany`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest sibling:
`source-ats-eightfold`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public ClearCompany careers jobs
feed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-clearcompany/
  package.json                       # @ever-jobs/source-ats-clearcompany
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    clearcompany.module.ts           # Nest DI module
    clearcompany.service.ts          # @SourcePlugin + IScraper.scrape
    clearcompany.types.ts            # wire-shape interfaces (PascalCase + aliases)
    clearcompany.constants.ts        # host, path, header, defaults, headers
  __tests__/
    clearcompany.e2e-spec.ts         # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? slug from `companyUrl` (`/jobs/{slug}` path
   segment, else first sub-domain label).
2. `fetchJobs(slug)` → `GET /api/v1/careers/jobs` with `API-ShortName: {slug}` →
   `ClearCompanyJob[]`. HTTP 400/404 (unknown tenant) → `[]` (no throw).
3. `collect` → `processJob` → `JobPostDto`, de-duping by job GUID.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The careers page (`/jobs/{slug}`) is a thin SPA shell; job data is fetched via
  XHR. Direct probing of the API surface found the public feed:
  `GET /api/v1/careers/jobs` returns the tenant's full open-roles array **only**
  when the `API-ShortName: {slug}` header is supplied (otherwise HTTP 400
  `"Unknown or missing API-ShortName header value."`).
- Confirmed the `clearcompany` tenant returns 4 shaped roles; an unknown slug
  returns HTTP 400 with the same message → handled as empty.
- The `/api/v1/careers/jobs/search` route exists but requires an undocumented
  validated query model (HTTP 400 for all tried params); not used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `CLEARCOMPANY = 'clearcompany'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Single feed call per tenant (no pagination envelope); no fan-out required.
- HTTP 400/404 → empty result; other errors caught → partial result. A single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-CC-1); graceful empty result.
- **Wire-shape drift (Pascal vs lower-case)** → both spellings modelled in types
  and read with `??` fallbacks.
- **Free-text `OfficeName`** → heuristic comma-split into city/state/country
  (Q-CC-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
