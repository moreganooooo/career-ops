# Plan: 368 — Zwayam ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 364 (PyjamaHR), 354 (Hireful)      |

> Implementation plan for `Spec 368 — source-ats-zwayam`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-pyjamahr` — a
client-rendered SPA career portal whose stable public surface is a no-auth JSON list
plus per-role JSON detail). The key difference: Zwayam keys its public API by **two**
values — a tenant slug (path) and a `host=` career-host query parameter — and the
canonical per-role surface is the public `/job_preview/` endpoint. So the service
resolves both slug + host, walks the JSON open-roles list, and fetches each role's
preview / detail object (when the list omits the body), normalising both into the same
`JobPostDto` contract. Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public list + preview endpoints, and register it
in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-zwayam/
  package.json                       # @ever-jobs/source-ats-zwayam
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    zwayam.module.ts                 # Nest DI module
    zwayam.service.ts                # @SourcePlugin + IScraper.scrape
    zwayam.types.ts                  # list / detail JSON interfaces
    zwayam.constants.ts              # API base, paths, defaults, page cap, headers, regexes
  __tests__/
    zwayam.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly (a career URL passed as the slug is
   reduced to slug + host; a `{slug}:{host}` pair is split; a bare slug assumes the
   `{slug}.openings.co` career host); else `companyUrl` → host = career host, tenant =
   first path segment (else sub-domain / brand label). Null when neither yields a
   tenant.
2. `fetchJobList(tenant)` → walk
   `GET /company/{tenant}/jobs?host={careerHost}&page={n}&size={k}`, accumulating
   deduped roles until `resultsWanted` (or the last page / page cap). HTTP 4xx → empty
   (no throw); other errors re-thrown into the outer try/catch which returns partial
   results.
3. For each collected list item, `processItem` fetches the JSON preview object
   (`GET /job_preview/?jobUrl={jobSlug}&host={careerHost}`) when the list omits the
   body; a removed-role 4xx skips the detail but still maps the list item.
4. `mergeJob` normalises the list item + detail into a `ZwayamJob` (title, HTML body,
   location, country, department, employment type, remote flag, date).
5. `processJob` for each role → `JobPostDto`; `atsId` = role slug; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03 — verified=false)

- Zwayam powers each customer's candidate career site under a custom career domain
  (`{tenant}.openings.co` or a vanity host such as `careers.beacon-india.com`), with
  the career page under a tenant slug path (`{careerHost}/{tenant}/`). Confirmed live
  via the 301 `careers.beacon-india.com/` → `/beacon-india/`.
- The career page is a client-rendered SPA, so the listing page carries no
  server-side job links. The machine-readable public surface is the JSON API on the
  shared origin `api.zwayam.com` (mirrored `public.zwayam.com`): a paginated
  open-roles list (`/company/{tenant}/jobs?host={careerHost}`) and a per-role preview /
  detail object (`/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com`).
- Confirmed live: the platform, the `{careerHost}/{tenant}/` addressing, the shared
  API origin, and the canonical per-role preview URL (observed in real shared LinkedIn
  job links for `tuvsud.openings.co` and `careers.beacon-india.com`). NOT byte-confirmed:
  the exact open-roles *list* JSON wire shape — the SPA + the live API hosts time out /
  403 to anonymous crawlers, so the list field set is a defensive superset (Spring
  `content[]` / `jobs[]` / bare array; camelCase aliases). (verified=false)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `ZWAYAM = 'zwayam'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-zwayam`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Pagination + detail fetches are bounded: page walking stops at `resultsWanted` (or
  the last page, or a hard page cap), and only as many preview GETs as collected roles
  (skipped entirely when the list embeds the body).
- HTTP 4xx (unknown tenant / missing list or removed role) → empty / skip; a malformed
  / non-object payload or per-role map error → partial result. `scrape` never throws,
  so a single tenant never aborts a batch run.
- An unknown tenant returns an empty list (or HTTP 4xx), which degrades naturally to an
  empty result.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy, optional
  CA cert).

## Risks / Mitigations

- **Career host vs. slug** (Q-ZW-1) → accept a `{slug}:{host}` pair or a full career
  URL; default to the Zwayam-hosted `{slug}.openings.co` career host when only a bare
  slug is given.
- **Missing brand name** (Q-ZW-2) → de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **List wire shape** (Q-ZW-3, verified=false) → parse a defensive superset of the
  documented public surface; degrade any fetch / parse failure to empty / partial.
- **Payload drift** → defensive object/array narrowing on every parsed body; a role
  missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
