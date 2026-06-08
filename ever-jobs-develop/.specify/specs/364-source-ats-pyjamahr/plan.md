# Plan: 364 — PyjamaHR ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), 342 (Talentsoft)    |

> Implementation plan for `Spec 364 — source-ats-pyjamahr`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-hireful` — a
client-rendered SPA index whose stable public surface is a no-auth machine-readable
feed plus per-role detail). The key difference: PyjamaHR exposes a clean, paginated
**JSON** API (`api.pyjamahr.com/api/career/jobs/?company_slug={tenant}`) rather than
a sitemap + JSON-LD HTML, so the service walks the JSON list and fetches each role's
JSON detail object, normalising both into the same `JobPostDto` contract. Build a
self-contained plugin package with the standard file layout, implement `IScraper`
over the public list + detail endpoints, and register it in the four canonical
locations.

## Architecture

```
packages/plugins/source-ats-pyjamahr/
  package.json                       # @ever-jobs/source-ats-pyjamahr
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    pyjamahr.module.ts               # Nest DI module
    pyjamahr.service.ts              # @SourcePlugin + IScraper.scrape
    pyjamahr.types.ts                # list / detail JSON interfaces
    pyjamahr.constants.ts            # API base, paths, defaults, page cap, headers, regexes
  __tests__/
    pyjamahr.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a portal URL passed as the slug is
   reduced to its tenant token); else `companyUrl` on a `pyjamahr.com` host → tenant
   from the `/careers/{tenant}` or `/{tenant}` path segment (or sub-domain label).
   Empty when neither yields a tenant.
2. `fetchJobList(tenant)` → walk `GET /api/career/jobs/?company_slug={tenant}&page={n}`,
   accumulating deduped roles until `resultsWanted` (or `next` is null / page cap).
   HTTP 4xx → empty (no throw); other errors re-thrown into the outer try/catch which
   returns partial results.
3. For each collected list item, `processItem` fetches the JSON detail object
   (`GET /api/career/jobs/{id}/?company_slug={tenant}`); a removed-role 4xx skips the
   detail but still maps the list item.
4. `mergeJob` normalises the list item + detail into a `PyjamaHrJob` (title, HTML
   body, location, country, department, employment type, remote flag, date).
5. `processJob` for each role → `JobPostDto`; `atsId` = numeric `id`; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- PyjamaHR powers each customer's candidate portal at `jobs.pyjamahr.com/{tenant}`
  (mirrored under `app.pyjamahr.com/careers/{tenant}`).
- The jobs index is a client-rendered Next.js SPA, so the listing page carries no
  server-side job links. The crawlable public surface is the JSON API on
  `api.pyjamahr.com`: a paginated open-roles list
  (`/api/career/jobs/?company_slug={tenant}`, fields confirmed:
  `id`, `slug`, `title`, `country`, `location`, `other_locations`,
  `department_name`, `workplace_type`, `min/max_experience`) and a per-role detail
  object (`/api/career/jobs/{id}/?company_slug={tenant}`, adding `uuid`,
  `description` HTML, `job_type`, `remote`, `created_at`, `valid_through`,
  `seniority`, `currency`).
- Confirmed live: the platform, the `jobs.pyjamahr.com/{tenant}` addressing, both
  JSON wire shapes (byte-level), and the canonical public job URL
  `https://jobs.pyjamahr.com/{tenant}?job_uuid={id}`, against the named real tenant
  `jobscubicle` (11 open roles). An unknown `company_slug` returns HTTP 200 with
  `count: 0` and an empty `results[]`. (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PYJAMAHR = 'pyjamahr'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-pyjamahr`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Pagination + detail fetches are bounded: page walking stops at `resultsWanted` (or
  `next: null`, or a hard page cap), and only as many detail GETs as collected roles.
- HTTP 4xx (unknown tenant / missing list or removed role) → empty / skip; a
  malformed / non-object payload or per-role map error → partial result. `scrape`
  never throws, so a single tenant never aborts a batch run.
- An unknown tenant returns HTTP 200 with an empty `results[]`, which degrades
  naturally to an empty result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom careers domains** (Q-PJ-1) → address by `company_slug` (the stable API
  key); a `companyUrl` on a `pyjamahr.com` host derives the slug. Non-`pyjamahr.com`
  custom domains deferred to the source-adoption backlog.
- **Missing brand name** (Q-PJ-2) → de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **Unknown-tenant signalling** (Q-PJ-3) → empty `results[]` (and any 4xx) treated as
  "no roles" → empty result.
- **Payload drift** → defensive object/array narrowing on every parsed body; a role
  missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
