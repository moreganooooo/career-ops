# Plan: 360 — Keka ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 360 — source-ats-keka`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered SPA index whose stable public surface is
a no-auth feed plus per-role server-rendered detail pages carrying schema.org
`JobPosting` JSON-LD). The key difference: Keka's open roles are loaded over a
public **published-jobs JSON feed** (richer per-role data than a sitemap), so the
service enumerates and normalises that feed directly and only consults each role's
detail-page JSON-LD for enrichment (company name / HTML body) when the feed object
omits it. Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public feed + detail pages, and register it in the
four canonical locations.

## Architecture

```
packages/plugins/source-ats-keka/
  package.json                       # @ever-jobs/source-ats-keka
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    keka.module.ts                   # Nest DI module
    keka.service.ts                  # @SourcePlugin + IScraper.scrape
    keka.types.ts                    # normalised feed/JSON-LD interfaces
    keka.constants.ts                # host template, feed paths, detail path, regexes, defaults, headers
  __tests__/
    keka.e2e-spec.ts                 # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `keka.com` → origin verbatim; else
   `companySlug` → `{slug}.keka.com` (a bare host slug is used directly). Empty
   when neither yields a host.
2. `fetchJobs(host)` — probe the ordered published-jobs feed paths as JSON; the
   first that yields roles wins. HTTP 4xx on a path → try the next; other errors
   re-thrown into the outer try/catch which returns partial results.
3. `extractJobsArray` — unwrap a bare array or a
   `{ data | jobs | result | records }` envelope (parsing a JSON string body
   first); `normaliseApiJob` maps each raw object (with cross-tenant field
   aliases) → `KekaJob`, de-duped by id.
4. Slice the normalised entries to `resultsWanted`, then for each role
   `enrichFromDetail` it only when the company name / HTML body is missing: fetch
   the detail page and scan `application/ld+json` blocks for a `JobPosting`
   (recursive over arrays / `@graph`), with `og:title`/`og:url`/`og:description`
   fallbacks; normalise location, employment type, remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = job id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Keka powers each customer's candidate career site on its own sub-domain at
  `{tenant}.keka.com/careers/`.
- The jobs index is a client-rendered SPA, so the listing page carries no
  server-side job links. The crawlable public surface is the published-jobs JSON
  feed the SPA calls on boot (`/k/careers/api/mwf/careers/jobs`, with alias paths)
  enumerating roles, each addressed by a detail page
  `/careers/jobdetails/{jobId}` pre-rendered with schema.org `JobPosting` JSON-LD
  for Google-for-Jobs.
- Confirmed live: the platform, the `{tenant}.keka.com/careers/` host pattern, and
  the real detail-page URL shape `/careers/jobdetails/{jobId}` (live example
  `algoworks.keka.com/careers/jobdetails/41450`). Real tenants include
  `algoworks`, `turno`, `adda247`.
- NOT confirmed (SPA limitation): the exact byte-level JSON feed payload, because
  an unauthenticated no-JS fetch returns only the app shell. The parser is
  therefore written defensively around the documented feed + `JobPosting` JSON-LD
  patterns (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `KEKA = 'keka'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-keka`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One feed fetch per tenant (at most a few alias-path probes); detail-page
  enrichment fetches are bounded by slicing the enumerated role set to
  `resultsWanted` first, and are skipped entirely when the feed already carries
  the company name + HTML body.
- HTTP 4xx (unknown sub-domain / missing feed / removed role) → empty / skip; a
  malformed page or non-JSON payload or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- The feed is parsed with an envelope-unwrap + field-alias narrowing and the
  detail page with a bounded JSON-LD block scan + recursive `@type` search (no XML
  / HTML library), keeping the plugin dependency-free and tolerant of payload drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Feed path drift** (Q-KK-1) → probe an ordered list of documented feed paths;
  the first that yields roles wins.
- **SPA-rendered payload** (Q-KK-2) → parse the documented feed shape defensively
  (bare array / `{ data | jobs | result | records }` envelope, cross-tenant field
  aliases) and enrich from JSON-LD `JobPosting` (recursive over arrays / `@graph`)
  with `og:` fallbacks; a malformed or absent payload yields "no job", never a
  throw. Confidence: unverified.
- **Detail URL shape** (Q-KK-3) → prefer the feed-advertised `jobDetailUrl`; else
  synthesise `{host}/careers/jobdetails/{jobId}`. The numeric job id is the stable
  ATS id.
- **Markup / payload drift** → defensive JSON parsing + `og:` regex fallbacks; a
  role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
