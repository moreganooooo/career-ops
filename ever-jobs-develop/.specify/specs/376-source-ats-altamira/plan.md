# Plan: 376 — Altamira ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 366 (Scout Talent), 364 (PyjamaHR) |

> Implementation plan for `Spec 376 — source-ats-altamira`.

## Approach

Mirror the existing ATS adapter pattern (closest sibling: `source-ats-scouttalent` —
a multi-tenant board whose stable public surface is server-rendered HTML enumerated
then parsed per role). Like Scout Talent, Altamira's board is fully server-rendered
(not a SPA), so the open-roles index page itself carries the job links. The key
difference: Altamira encodes the **title + location in the SEO anchor slug** and the
**stable ATS id as a trailing numeric `{JobID}`**, and emits no JSON-LD / og: meta —
so the listing anchor alone yields a complete role (title, location, url, atsId), and
the detail page is fetched only to *enrich* the description body (best-effort). Build
a self-contained plugin package with the standard file layout, implement `IScraper`
over the public index + detail pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-altamira/
  package.json                          # @ever-jobs/source-ats-altamira
  tsconfig.json                         # extends base, own outDir
  src/
    index.ts                            # barrel (module + service)
    altamira.module.ts                  # Nest DI module
    altamira.service.ts                 # @SourcePlugin + IScraper.scrape
    altamira.types.ts                   # index-anchor + normalised interfaces
    altamira.constants.ts               # host template, root domain, jobs path, defaults, page cap, headers, link/remote regexes
  __tests__/
    altamira.e2e-spec.ts                # network-tolerant E2E
```

Data flow:

1. `resolveOrigin` — `companySlug` expanded to `https://{tenant}.altamiraweb.com`
   (a bare host / full URL passed as the slug uses its origin verbatim); else
   `companyUrl` on an `altamiraweb.com` host → origin used verbatim (preserving the
   `*.sites.altamiraweb.com` variant). Empty when neither yields a host.
2. `fetchJobList(origin)` → `GET {origin}/jobs`, walk pages (`?PagerAnnunci={n}`)
   until enough roles or a page adds nothing. `parseIndex` extracts every
   `/jobs/{slug}-{JobID}.htm` anchor (preferred) plus `/jobs/job-details?JobID={JobID}`
   anchors (fallback), capturing `{JobID}` as the ATS id and deduping by it. HTTP 4xx
   → empty (no throw); other errors degrade to the partial set already collected.
3. Slice the deduped roles to `min(resultsWanted, page cap)`.
4. `enrichDescription` fan-out (`Promise.allSettled`) fetches each role's detail page
   and extracts the body plain text; a removed-role 4xx / parse failure → null, the
   role still maps fully from its slug.
5. `processItem` → `normaliseJob` (slug → title + Country/Region/City location,
   remote detection) → `processJob` → `JobPostDto`; `atsId` = `{JobID}`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified live 2026-06-03)

- Altamira (altamirahrm.com, Italy — "Altamira Recruiting") powers each customer's
  candidate board on a sub-domain of the shared host `altamiraweb.com`:
  `{tenant}.altamiraweb.com` and the newer `{tenant}.sites.altamiraweb.com` variant.
- The board is server-rendered HTML (Altamira markets the career site as
  SEO-friendly / search-indexed), so the index page `/jobs` lists every open role
  with anchors of the form `/jobs/{Title-Country-Region-City-slug}-{JobID}.htm` and
  the equivalent `/jobs/job-details?JobID={JobID}`. No separate JSON feed / RSS is
  exposed. The detail page is server-rendered HTML whose `<title>` reads
  "{Title} in {City} | Careers at {Tenant}" and whose body carries the full ad; it
  emits no schema.org JSON-LD or `og:` meta.
- Confirmed live: the platform, the `{tenant}.altamiraweb.com` (and `*.sites`)
  addressing, the server-rendered `/jobs` index HTML, both per-role detail URL shapes
  (e.g.
  `/jobs/Desktop-Support-Engineer-Space-Sector-Information-Technology-or-Computer-Science-Italia-Veneto-Padova-561445691.htm`
  and `/jobs/job-details?JobID=561445691`), and the detail `<title>` shape, against
  the named real tenant `etinars` (Etinars). The trailing numeric `{JobID}` is the
  stable per-role ATS id. (verified=true)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `ALTAMIRA = 'altamira'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-altamira`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Detail enrichment is bounded: the deduped role set is sliced to
  `min(resultsWanted, page cap)`, so only as many detail GETs as collected roles, run
  via `Promise.allSettled` so one slow / failing detail never aborts the batch.
- HTTP 4xx (unknown tenant / missing index or removed role) → empty / null; a
  malformed page / per-role map / enrich error → partial result. `scrape` never
  throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Hosting variants / custom domains** (Q-AL-1) → a plain slug expands to
  `{tenant}.altamiraweb.com`; the `*.sites` variant (and any `altamiraweb.com`-fronted
  custom host) is reached via a full `companyUrl` whose origin is used verbatim.
  Non-`altamiraweb.com` custom domains deferred to the source-adoption backlog.
- **No structured detail metadata** (Q-AL-2) → title + location come from the SEO
  slug (always present); description enriched best-effort from the body;
  `department` / `employmentType` / `datePosted` left null on this surface.
- **Missing brand name** (Q-AL-3) → de-slugify + title-case the tenant sub-domain
  label for `companyName`.
- **Markup drift** → defensive narrowing on every parsed value; a role missing a
  title or id is skipped, not fatal; the slug split degrades to "whole slug = title"
  when no country marker is found.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
