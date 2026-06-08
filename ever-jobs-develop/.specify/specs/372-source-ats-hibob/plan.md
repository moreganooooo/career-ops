# Plan: 372 — HiBob ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 372 — source-ats-hibob`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-pyjamahr` — a
client-rendered SPA careers portal whose stable public surface is a no-auth JSON API
plus per-role detail). The key difference: HiBob's careers page is backed by the
documented, anonymous Hiring API (`api.hibob.com/v1/hiring/job-ads/...`) whose
active-job-ads search returns all roles in a single POST response (rather than a
cursor-paginated GET list), so the service issues one search request, slices to
`resultsWanted`, and fetches each role's detail object, normalising both into the
same `JobPostDto` contract. Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public search + detail endpoints, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-hibob/
  package.json                       # @ever-jobs/source-ats-hibob
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    hibob.module.ts                  # Nest DI module
    hibob.service.ts                 # @SourcePlugin + IScraper.scrape
    hibob.types.ts                   # job-ad / search / detail JSON interfaces
    hibob.constants.ts               # API base, careers domain, paths, defaults, page cap, headers, regexes
  __tests__/
    hibob.e2e-spec.ts                # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a careers URL passed as the slug is
   reduced to its tenant token); else `companyUrl` on a `hibob.com` host → tenant
   from the leading `{tenant}.careers.hibob.com` sub-domain label. Empty when neither
   yields a tenant.
2. `fetchJobAds(tenant)` → `POST /v1/hiring/job-ads/search` (empty filters → all
   active ads), probing the result-array under `jobAds` / `results` / `items`,
   accumulating deduped roles until `resultsWanted` (or the defensive page cap). HTTP
   4xx → empty (no throw); other errors re-thrown into the outer try/catch which
   returns partial results.
3. For each collected entry, `processEntry` fetches the JSON detail object
   (`GET /v1/hiring/job-ads/{id}`); a removed-role 4xx skips the detail but still maps
   the list entry.
4. `mergeJob` normalises the list entry + detail into a `HiBobJob` (title, HTML body,
   location, department, employment type, remote flag, date, canonical job/apply URL).
5. `processJob` for each role → `JobPostDto`; `atsId` = opaque ad `id` (UUID); de-dup
   by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- HiBob powers each customer's candidate careers page at
  `{tenant}.careers.hibob.com/jobs` (per-role `/jobs/{id}`, apply `/jobs/{id}/apply`,
  where `{id}` is a UUID). Confirmed live with named real tenants `hibob-e360` and
  `dcbyte`.
- The careers page is a client-rendered SPA, so the listing page carries no
  server-side job links. The documented public surface is the anonymous Hiring API on
  `api.hibob.com`: an active-job-ads search (`POST /v1/hiring/job-ads/search`,
  returning the ads promoted on the careers page) and a per-role detail object
  (`GET /v1/hiring/job-ads/{id}`). The docs state retrieving Job Ads requires no
  permission, and `jobAd/applyUrl` is the public apply link.
- NOT confirmed byte-level: the SPA is client-rendered and apidocs.hibob.com gates the
  full request/response schema (HTTP 403), so the exact tenant-identification
  mechanism and field envelope were not observed on the wire. The adapter therefore
  probes the tenant under several plausible keys, probes multiple result-array keys,
  treats every field as optional + defensively narrowed, and uses the careers portal
  as the authoritative public URL source. (verified=false)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HIBOB = 'hibob'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-hibob`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The active-job-ads search returns all roles in one response; the adapter slices to
  `resultsWanted` deduped roles and issues only as many detail GETs as collected
  roles. A defensive page cap guards a future cursor-paginated variant.
- HTTP 4xx (unknown tenant / missing board / removed role) → empty / skip; a
  malformed / non-object payload or per-role map error → partial result. `scrape`
  never throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Unconfirmed API envelope** (Q-HB-1) → send the tenant under several plausible keys
  (`companySlug` / `company` body fields + `X-Company` header) and probe multiple
  result-array keys (`jobAds` / `results` / `items`); the careers portal is the
  authoritative public URL source; any failure degrades to empty. (verified=false)
- **Missing brand name** (Q-HB-2) → de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **Custom careers domains** (Q-HB-3) → address by the careers sub-domain label; a
  `companyUrl` on a `hibob.com` host derives the slug. Non-`hibob.com` custom domains
  deferred to the source-adoption backlog.
- **Payload drift** → defensive object/array narrowing on every parsed body (multiple
  candidate keys per field); a role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
