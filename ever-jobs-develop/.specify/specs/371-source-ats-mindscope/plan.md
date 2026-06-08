# Plan: 371 — Mindscope ATS Source Plugin

| Field        | Value                                       |
| ------------ | ------------------------------------------- |
| Spec         | spec.md                                     |
| Created      | 2026-06-03                                  |
| Last updated | 2026-06-03                                  |
| Status       | done                                        |
| Owner        | scheduled-agent                             |
| Supersedes   | (none)                                      |
| Related specs| 364 (PyjamaHR), (TempWorks), (Scout Talent) |

> Implementation plan for `Spec 371 — source-ats-mindscope`.

## Approach

Mirror the existing server-HTML ATS adapter pattern (closest siblings:
`source-ats-scouttalent` — a server-rendered board whose detail pages are parsed
JSON-LD-first with `og:` / `<title>` / body fallbacks — and `source-ats-tempworks`
— a staffing board addressed by a path-segment tenant on a shared host). The key
difference: Mindscope tenants are keyed by an opaque portal code in a
`{TENANTCODE}_V2Portal` path segment on a numbered `portal{N}.mindscope.com` host,
and the candidate portal is a server-rendered ASP.NET WebForms app. The service
reads the tenant's `JobBoard.aspx` page, enumerates its `JobDetails.aspx?JobId={id}`
links, and fetches each posting's detail page, preferring its schema.org
`JobPosting` JSON-LD. Build a self-contained plugin package with the standard file
layout, implement `IScraper` over the public board + detail pages, and register it
in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-mindscope/
  package.json                       # @ever-jobs/source-ats-mindscope
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    mindscope.module.ts              # Nest DI module
    mindscope.service.ts             # @SourcePlugin + IScraper.scrape
    mindscope.types.ts               # job-link + JSON-LD JobPosting + normalised interfaces
    mindscope.constants.ts           # portal origin/domain, page paths, defaults, page cap, headers, regexes
  __tests__/
    mindscope.e2e-spec.ts            # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` used directly as the portal code on the default
   `portal2.mindscope.com` host (a portal URL passed as the slug is reduced to its
   code + origin); else `companyUrl` on a `mindscope.com` host → code from the
   `{code}_V2Portal` path segment, `portal{N}` origin preserved. Null when neither
   yields a tenant.
2. `fetchJobLinks(tenant)` → `GET …/Modules/Candidate/JobBoard.aspx`, parse every
   `JobDetails.aspx?JobId={id}` link into `{ jobId, url }` (deduped). HTTP 4xx →
   empty (no throw); other errors re-thrown into the outer try/catch which returns
   partial results.
3. Slice the deduped links to `min(resultsWanted, MAX_PAGES)`.
4. For each link, `processLink` fetches the detail page; a removed-posting 4xx is
   skipped without failing the batch.
5. `parseDetail` extracts the schema.org `JobPosting` JSON-LD (scanning every
   `application/ld+json` block, narrowing arrays / `@graph`), with `og:title` /
   `og:description` / `og:url` / `<title>` / body HTML as defensive fallbacks →
   normalised `MindscopeJob`.
6. `processJob` for each posting → `JobPostDto`; `atsId` = `JobId`; de-dup by id.
7. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03 — DEFENSIVE, verified=false)

- Mindscope (Univerus Workforce) powers each tenant's public candidate portal /
  job board at `portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/…`.
- Confirmed live: the platform and the tenant portal pattern, against the named real
  tenant portal `WHITEC04415` on `portal2.mindscope.com` (a public
  `…/Modules/Candidate/CandidateLogin.aspx` candidate portal). The portal is a
  server-rendered ASP.NET WebForms "V2Portal" app.
- NOT confirmed live (no authentication): the exact public job-board / job-detail
  page names and the `JobId` query key, and JSON-LD presence. These follow
  Mindscope's documented public portal surface — it markets "SEO-enhanced job
  listings compatible with Google for Jobs" (implying schema.org `JobPosting`
  structured data on public detail pages) — and the sibling server-HTML ATS
  adapters. The parser therefore reads JSON-LD-first and degrades to `og:` / `<title>`
  / body HTML, and any 4xx / missing page / malformed body degrades to an empty
  result. (verified=false)

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `MINDSCOPE = 'undefined'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-mindscope`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- The board is read once; detail fetches are bounded — the deduped link set is
  sliced to `min(resultsWanted, MAX_PAGES)` before any detail GET, so a
  pathologically large board can never spin unbounded.
- HTTP 4xx (unknown tenant / missing board or removed posting) → empty / skip; a
  malformed page / non-JSON JSON-LD / per-posting map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Portal host enumeration** (Q-MS-1) → default `portal2.mindscope.com`; a
  `companyUrl` (or `host/code` slug) pins a non-default `portal{N}` host. Host
  discovery deferred to the source-adoption backlog.
- **Missing brand name** (Q-MS-2) → prefer JSON-LD `hiringOrganization.name`, else
  de-slugify + title-case the tenant code; downstream enrichment may override.
- **Unconfirmed public page names** (Q-MS-3) → documented V2Portal candidate-module
  page paths + defensive structural parsing; any 4xx / malformed body → empty.
- **Markup / payload drift** → JSON-LD parsed inside try/catch with array / `@graph`
  narrowing; a posting missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
