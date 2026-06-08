# Plan 306 — Occupop ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 306 — source-ats-occupop`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest siblings:
`source-ats-clearcompany` for the single-feed shape, `source-ats-eightfold` for
the multi-tenant host resolution). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Occupop careers
GraphQL gateway, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-occupop/
  package.json                       # @ever-jobs/source-ats-occupop
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    occupop.module.ts                # Nest DI module
    occupop.service.ts               # @SourcePlugin + IScraper.scrape
    occupop.types.ts                 # wire-shape interfaces (camelCase + aliases)
    occupop.constants.ts             # endpoint, query, host template, defaults, headers
  __tests__/
    occupop.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? slug from `companyUrl` (first sub-domain
   label of `{slug}.occupop-careers.com`).
2. `fetchJobs(slug)` → `POST /graphql` (`LiveJobs`, `companyKey: {slug}`) →
   `OccupopJob[]`. GraphQL `"Invalid company key!"` or HTTP 400/404 → `[]`
   (no throw).
3. `collect` → `processJob` → `JobPostDto`, de-duping by job uuid.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The careers page (`{slug}.occupop-careers.com`) is a client-rendered SPA
  (vite-plugin-ssr + Apollo). Reading its JS bundle revealed the Apollo gateway
  `https://gateway.server.occupop.com/graphql` and the verbatim `LiveJobs`
  operation (`careersPage { liveJobs(companyKey, tags, includeAllBrandsJobs) }`).
- Confirmed live: `companyKey: "molloygroup"` returns 3 shaped roles
  (`uuid/title/description/publishedAt/companyName/location/hiringCompany/period/subsectors`);
  `companyKey: "occupop"` returns `liveJobs: []`; an unknown key returns HTTP 200
  with a GraphQL `errors` entry `"Invalid company key!"` → handled as empty.
- The `/rest/jobs` REST endpoint requires a per-tenant API token
  (`"not authorized (or invalid auth token)"`); the `api.occupop.com/api/jobs-frame/{token}`
  route returns an HTML iframe widget (not JSON). Neither is used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `OCCUPOP = 'occupop'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Single GraphQL call per tenant (no pagination envelope); no fan-out required.
- GraphQL `errors` / HTTP 400/404 → empty result; other errors caught → partial
  result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-OP-1); graceful empty result.
- **Wire-shape drift (camelCase vs snake_case dates)** → both spellings modelled
  in types and read with `??` fallbacks.
- **Coarse `location` (city/country only)** → `state` left null; a defensive
  `region` alias is read if present (Q-OP-2).

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
