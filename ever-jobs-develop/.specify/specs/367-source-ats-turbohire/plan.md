# Plan: 367 — TurboHire ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 367 — source-ats-turbohire`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-pyjamahr` — a
client-rendered SPA careers portal whose stable public surface is a no-auth paginated
JSON list plus per-role JSON detail). TurboHire follows the same shape: a paginated
**JSON** API (`api.turbohire.co/api/careerpage/publicjobs?companySlug={tenant}`)
backing a SPA, so the service walks the JSON list and fetches each role's JSON detail
object, normalising both into the same `JobPostDto` contract. Build a self-contained
plugin package with the standard file layout, implement `IScraper` over the public
list + detail endpoints, and register it in the four canonical locations.

The key difference from PyjamaHR: TurboHire's backing JSON wire shape could **not** be
confirmed unauthenticated (the portal is a SPA, no public API docs), so the design is
**defensive** (verified=false) — alternate envelope keys (`data` / `results` / `jobs`)
and body keys (`descriptionHtml` / `description` / `jobDescription`) are tolerated, and
every network call degrades gracefully so a wrong guess never throws.

## Architecture

```
packages/plugins/source-ats-turbohire/
  package.json                        # @ever-jobs/source-ats-turbohire
  tsconfig.json                       # extends base, own outDir
  src/
    index.ts                          # barrel (module + service)
    turbohire.module.ts               # Nest DI module
    turbohire.service.ts              # @SourcePlugin + IScraper.scrape
    turbohire.types.ts                # list / detail JSON interfaces
    turbohire.constants.ts            # API base, paths, defaults, page cap, headers, regexes
  __tests__/
    turbohire.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a portal URL passed as the slug is
   reduced to its tenant token); else `companyUrl` on a `turbohire.co` host → tenant
   from the `{tenant}.turbohire.co` sub-domain label (or the first path segment on a
   shared host). `careers` / `portal` / `app` / `api` / `www` are reserved labels.
   Empty when neither yields a tenant.
2. `fetchJobList(tenant)` → walk
   `GET /api/careerpage/publicjobs?companySlug={tenant}&page={n}&pageSize={size}`,
   accumulating deduped roles until `resultsWanted` (or the page is short / the
   reported `totalCount` is reached / the page cap). HTTP 4xx → empty (no throw);
   other errors re-thrown into the outer try/catch which returns partial results.
3. For each collected list item, `processItem` fetches the JSON detail object
   (`GET /api/careerpage/publicjobs/{id}?companySlug={tenant}`); a removed-role 4xx
   skips the detail but still maps the list item.
4. `mergeJob` normalises the list item + detail into a `TurboHireJob` (title, HTML
   body, location, department, employment type, remote flag, date).
5. `processJob` for each role → `JobPostDto`; `atsId` = opaque `id` / public token;
   de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- TurboHire powers each customer's candidate portal on a tenant careers sub-domain
  (`{tenant}.turbohire.co`) and the shared host `careers.turbohire.co`, with per-role
  public detail pages on `portal.turbohire.co/job/publicjobs/{token}` (mirrored on
  `app.turbohire.co`). CONFIRMED live, including the named real tenant `tatamotors`
  (Tata Motors, `https://tatamotors.turbohire.co/dashboardv2?orgId=39ddba0d-…`).
- The jobs index is a client-rendered SPA, so the listing page carries no server-side
  job links. The intended public surface is the JSON API the SPA consumes on
  `api.turbohire.co`. That backing API could NOT be observed unauthenticated and
  TurboHire publishes no public API docs, so the list / detail paths
  (`/api/careerpage/publicjobs`) and field names are a DEFENSIVE model based on the
  documented public URL pattern and sibling-adapter conventions. (verified=false)
- The adapter tolerates alternate envelope keys (`data` / `results` / `jobs`) and body
  keys, prefers an absolute `publicUrl` / `applyUrl` when present, and otherwise
  synthesises the documented `portal.turbohire.co/job/publicjobs/{token}` URL.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `TURBOHIRE = 'turbohire'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-turbohire`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Pagination + detail fetches are bounded: page walking stops at `resultsWanted` (or a
  short page / `totalCount` reached / a hard page cap), and only as many detail GETs
  as collected roles.
- HTTP 4xx (unknown tenant / missing list or removed role) → empty / skip; a
  malformed / non-object payload or per-role map error → partial result. `scrape`
  never throws, so a single tenant never aborts a batch run.
- An unknown tenant returns an empty list (or a 4xx), which degrades naturally to an
  empty result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy, optional
  CA cert).

## Risks / Mitigations

- **Unconfirmed wire shape** (Q-TH-1) → defensive parsing of alternate envelope / body
  keys, optional fields, graceful degradation on every call. A wrong path / field
  yields an empty result, never a throw.
- **Custom careers domains** (Q-TH-2) → address by careers sub-domain label / org slug
  (the stable API key); a `companyUrl` on a `turbohire.co` host derives the slug.
  Non-`turbohire.co` custom domains deferred to the source-adoption backlog.
- **Missing brand name** (Q-TH-3) → use detail `companyName` when present, else
  de-slugify + title-case the tenant slug; downstream enrichment may override.
- **Payload drift** → defensive object/array narrowing on every parsed body; a role
  missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
