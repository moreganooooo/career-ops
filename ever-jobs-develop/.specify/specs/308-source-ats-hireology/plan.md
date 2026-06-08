# Plan 308 — Hireology ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 308 — source-ats-hireology`.

## Approach

Mirror the existing career-site ATS adapter pattern (closest siblings:
`source-ats-eightfold` for paginated fan-out, `source-ats-clearcompany` for the
shared-host package layout). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Hireology careers
jobs feed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-hireology/
  package.json                       # @ever-jobs/source-ats-hireology
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    hireology.module.ts              # Nest DI module
    hireology.service.ts             # @SourcePlugin + IScraper.scrape
    hireology.types.ts               # wire-shape interfaces (snake_case + aliases)
    hireology.constants.ts           # hosts, paths, token regex, page size, defaults, headers
  __tests__/
    hireology.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveSlug` — `companySlug` ?? slug from `companyUrl` (first careers path
   segment, else first sub-domain label).
2. `fetchPublicToken(slug)` → `GET careers.hireology.com/{slug}` (as text) →
   regex `startingData.apiToken`. HTTP 404 / no token → `''` (no throw).
3. `fetchPage(slug, token, page)` → `GET api.hireology.com/v2/public/careers/{slug}`
   with `Authorization: Bearer {token}` → `{ data, count, page, page_size }`.
   First page yields the true `count`; remaining pages fanned out with bounded
   concurrency + `Promise.allSettled`.
4. `collect` → `processJob` → `JobPostDto`, de-duping by job id.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- The careers page (`careers.hireology.com/{slug}`) is a thin React SPA shell.
  Its inline `window.startingData` blob carries `apiUrl`
  (`https://api.hireology.com/v2`) and an anonymous, short-lived public
  `apiToken` (JWT). The bundled `career_site` JS builds the jobs request as
  `${apiUrl}/public/careers/${careersPath}` and sends `Authorization: Bearer
  {apiToken}`.
- Confirmed the `hireology2` tenant returns shaped roles in the envelope
  `{ data, count, page, page_size }`; `page`/`page_size` query params paginate.
- An unknown slug returns HTTP 404 (and the careers shell yields no token) →
  handled as empty.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HIREOLOGY = 'hireology'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One token fetch + paginated feed calls per tenant; remaining pages fanned out
  with bounded concurrency (`HIREOLOGY_MAX_CONCURRENCY`) via `Promise.allSettled`
  so one page failure never aborts the batch.
- HTTP 400/404 / missing token → empty result; other errors caught → partial
  result. A single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally; DTO default 15).

## Risks / Mitigations

- **WAF 403 on some tenants** → out of scope (Q-HR-1); graceful empty result.
- **Token expiry** → re-scraped fresh per run (Q-HR-2); no cross-run caching.
- **Wire-shape drift (snake vs camel)** → both spellings modelled in types and
  read with `??` fallbacks.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
