# Plan: 358 — Namely ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 358 — source-ats-namely`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered SPA index whose stable public surface is
the tenant XML sitemap plus per-role server-rendered detail pages carrying a
schema.org `JobPosting` JSON-LD block). Namely addresses every tenant by its own
sub-domain of `namely.com` and publishes a public candidate career site under it;
its documented JSON job API is OAuth-gated and out of scope. The service parses
JSON-LD defensively (recursively walking arrays / `@graph`) into the same
`JobPostDto` contract. Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public sitemap + detail pages, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-namely/
  package.json                       # @ever-jobs/source-ats-namely
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    namely.module.ts                 # Nest DI module
    namely.service.ts                # @SourcePlugin + IScraper.scrape
    namely.types.ts                  # normalised sitemap/JSON-LD interfaces
    namely.constants.ts              # host templates, sitemap path, regexes, defaults, headers
  __tests__/
    namely.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `namely.com` → origin verbatim; else
   `companySlug` → `{slug}.namely.com` (a bare host slug is used directly). Empty
   when neither yields a host.
2. `fetchSitemap(host)` → `GET /sitemap.xml` as text. HTTP 4xx or a missing
   sitemap → empty (no throw); other errors re-thrown into the outer try/catch
   which returns partial results.
3. `parseSitemap(xml)` — walk each `<loc>`, keep `/careersite/job/{id}` entries
   (capture the numeric id + sibling `<lastmod>`), de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the detail
   page and `parseDetail` it: scan `application/ld+json` blocks for a `JobPosting`
   (recursive over arrays / `@graph`), with `og:title`/`og:url`/`og:description`
   fallbacks; normalise location, employment type, remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = job id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Namely (namely.com, US HR / payroll / benefits / recruiting) addresses every
  customer tenant by its own sub-domain of `namely.com` (`{tenant}.namely.com`)
  and publishes a public candidate career site under it (`/careersite`).
- The jobs index is a client-rendered SPA, so the listing page carries no
  server-side job links. The crawlable public surface is the tenant XML sitemap
  (`/sitemap.xml`) enumerating `/careersite/job/{jobId}` detail pages, each
  pre-rendered with schema.org `JobPosting` JSON-LD for Google-for-Jobs.
- Namely's documented JSON job/recruiting API (`developers.namely.com`) is
  OAuth-gated and therefore out of scope; only the anonymous candidate-facing
  surface is consumed.
- Confirmed live: the platform and the `{tenant}.namely.com` host pattern.
- NOT confirmed (SPA limitation): the exact byte-level JSON-LD payload, because an
  unauthenticated no-JS fetch returns only the app shell. The parser is therefore
  written defensively around the documented Google-for-Jobs `JobPosting` pattern
  (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `NAMELY = 'namely'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-namely`.
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

- **Career-site URL shape** (Q-NM-1) → expand `{slug}.namely.com` from a slug; a
  full `companyUrl` (or bare host slug) addresses a tenant verbatim. The job-URL
  regex matches `/(careersite/)?(job|jobs|posting|postings)/{digits}`.
- **SPA-rendered payload** (Q-NM-2) → parse the documented JSON-LD `JobPosting`
  defensively (recursive over arrays / `@graph`) with `og:` fallbacks; a malformed
  or absent block yields "no job", never a throw. Confidence: unverified.
- **OAuth-gated API** (Q-NM-3) → ignore the authenticated API; consume only the
  anonymous candidate-facing career site.
- **Markup / payload drift** → defensive JSON parsing + `og:` regex fallbacks; a
  role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
