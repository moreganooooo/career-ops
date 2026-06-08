# Plan 320 — Softgarden ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 320 — source-ats-softgarden`.

## Approach

Mirror the existing ATS adapter pattern (closest siblings: `source-ats-oorwin`
for the multi-tenant JSON-API layout; `source-ats-eploy` for a public,
anonymous single-document feed). Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public Softgarden
JobPosting DataFeed, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-softgarden/
  package.json                       # @ever-jobs/source-ats-softgarden
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    softgarden.module.ts             # Nest DI module
    softgarden.service.ts            # @SourcePlugin + IScraper.scrape
    softgarden.types.ts              # wire-shape interfaces (schema.org JobPosting)
    softgarden.constants.ts          # feed path, career apex, host template, defaults, headers
  __tests__/
    softgarden.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveOrigin` — `companySlug` (no dots → `{slug}.career.softgarden.de`;
   dots → bare host) ?? `companyUrl` (`new URL(...).origin`).
2. `fetchFeed(origin)` → `GET {origin}/jobs.feed.json` → parsed
   `SoftgardenFeedResponse`. HTTP 400/403/404 (unknown tenant / legacy board)
   or a non-DataFeed body → null (no throw).
3. Iterate `dataFeedElement[]`; `processElement` maps each `.item`
   (`JobPosting`) → `JobPostDto`; de-dup by `identifier.value`.
4. Trim to `resultsWanted`, wrap in `JobResponseDto`.

The full HTML description is embedded inline in `item.description`, so there is
no per-job detail fan-out — a single fetch per tenant yields complete records.

## Endpoint Discovery (verified 2026-06-03)

- The modern (React) Softgarden career page publishes a machine-readable
  schema.org JobPosting DataFeed at `{tenantOrigin}/jobs.feed.json`, the same
  feed used for search-engine / aggregator syndication. It is fully anonymous
  (no client token, no channel id).
- Verified live against `softgarden.career.softgarden.de` (softgarden
  e-recruiting GmbH's own career page): HTTP 200, `application/json`,
  `numberOfItems: 10`, 10 `dataFeedElement` entries with the full field set
  (`title`, `url`, `datePosted`, `identifier.value`, inline HTML `description`,
  `employmentType`, `hiringOrganization`, structured `jobLocation.address`).
  Each `item.url` job-detail page also returns HTTP 200 anonymously.
- The documented authenticated jobboard REST APIs
  (`/api/rest/v2/frontend/jobboards/{channelID}/jobs`,
  `/api/rest/v3/frontend/jobslist/{channelId}`) require a client/user access
  token + channel id and are NOT used.
- The legacy (non-React, Wicket-rendered) boards at some `*.softgarden.io`
  hosts do not expose `/jobs.feed.json` (HTTP 404) — out of scope (Q-SG-1).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `SOFTGARDEN = 'softgarden'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-softgarden`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- The feed returns all active roles in a single JSON document — no pagination
  or fan-out required. One request per tenant minimises request count.
- HTTP 400/403/404 → empty result; non-DataFeed / HTML body → empty result;
  per-element processing errors are caught and skipped (partial result). A
  single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally); de-dup by
  `identifier.value`.

## Risks / Mitigations

- **Legacy Wicket boards (404 on feed)** → out of scope (Q-SG-1); graceful empty.
- **Large feeds / potential truncation** → observed feed delivers all roles in
  one document. Re-evaluate if truncation is observed (Q-SG-2).
- **Aggregator boards** carrying many employers → real employer name is read
  from `hiringOrganization.name` per posting, not the tenant.
- **String-typed JSON body** (some hosts answer with `text/...`) → defensively
  `JSON.parse` a string body that starts with `{`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
