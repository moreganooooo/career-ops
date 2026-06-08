# Plan: 363 — Paychex ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 363 — source-ats-paychex`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered careers index whose stable public
surface is the tenant XML sitemap plus per-role server-rendered detail pages
carrying schema.org `JobPosting` JSON-LD). Paychex Flex Hiring's per-tenant
careers site follows the same shape: the service enumerates roles from the
public sitemap, then parses each detail page's `JobPosting` JSON-LD defensively
(recursively walking arrays / `@graph`) into the same `JobPostDto` contract.
Build a self-contained plugin package with the standard file layout, implement
`IScraper` over the public sitemap + detail pages, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-paychex/
  package.json                       # @ever-jobs/source-ats-paychex
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    paychex.module.ts                # Nest DI module
    paychex.service.ts               # @SourcePlugin + IScraper.scrape
    paychex.types.ts                 # normalised sitemap/JSON-LD interfaces
    paychex.constants.ts             # host templates, sitemap path, regexes, defaults, headers
  __tests__/
    paychex.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `applybypaychex.com` (or a known Paychex Apply
   host) → origin verbatim; else `companySlug` → `{slug}.applybypaychex.com`
   (a bare host slug is used directly). Empty when neither yields a host.
2. `fetchSitemap(host)` → `GET /sitemap.xml` as text. HTTP 4xx or a missing
   sitemap → empty (no throw); other errors re-thrown into the outer try/catch
   which returns partial results.
3. `parseSitemap(xml)` — walk each `<loc>`, keep `/job/{id}` entries (capture
   the numeric id + sibling `<lastmod>`), de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the detail
   page and `parseDetail` it: scan `application/ld+json` blocks for a `JobPosting`
   (recursive over arrays / `@graph`), with `og:title`/`og:url`/`og:description`
   fallbacks; normalise location, employment type, remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = job id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Paychex Flex Hiring is a public-facing recruiting / ATS product that lets each
  customer "post jobs to their unique career site". Tenants are addressed by a
  company / board id; the careers-site host is modelled as
  `{tenant}.applybypaychex.com` (some tenants front it under a Paychex Apply host
  such as `careers.paychex.com` / `apply.paychex.com`).
- The careers index is a client-rendered app, so the listing page carries no
  server-side job links. The crawlable public surface is the tenant XML sitemap
  (`/sitemap.xml`) enumerating `/job/{jobId}` detail pages, each pre-rendered with
  schema.org `JobPosting` JSON-LD for Google-for-Jobs.
- Confirmed live: the platform (Paychex Flex Hiring publishes per-customer career
  sites) and the Paychex Apply careers host (`careers.paychex.com` /
  `apply.paychex.com`) serving browsable, public job listings + per-job detail
  pages by department.
- NOT confirmed (app limitation): the exact byte-level JSON-LD payload, because an
  unauthenticated no-JS fetch returns only the app shell. The parser is therefore
  written defensively around the documented Google-for-Jobs `JobPosting` pattern
  (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PAYCHEX = 'paychex'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-paychex`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One sitemap fetch per tenant; detail-page fetches are bounded by slicing the
  enumerated role set to `resultsWanted` before fetching.
- HTTP 4xx (unknown sub-domain / missing sitemap or removed role) → empty / skip;
  a malformed page or non-JSON JSON-LD or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- JSON-LD is parsed with a bounded block scan + recursive `@type` search (no XML /
  HTML library), keeping the plugin dependency-free and tolerant of markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Careers-site host** (Q-PX-1) → expand `{slug}.applybypaychex.com` from a slug;
  a full `companyUrl` (or bare host slug) addresses a Paychex Apply host verbatim.
- **App-rendered payload** (Q-PX-2) → parse the documented JSON-LD `JobPosting`
  defensively (recursive over arrays / `@graph`) with `og:` fallbacks; a malformed
  or absent block yields "no job", never a throw. Confidence: unverified.
- **Job URL shape** (Q-PX-3) → match
  `/job|jobs|career|careers|position|positions|opening|openings/{digits}` in
  sitemap `<loc>` entries; the numeric id is the stable ATS id.
- **Markup / payload drift** → defensive JSON parsing + `og:` regex fallbacks; a
  role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
