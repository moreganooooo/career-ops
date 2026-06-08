# Plan: 349 — Arcoro ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 348 (ApplicantPro), 342 (Talentsoft) |

> Implementation plan for `Spec 349 — source-ats-arcoro`.

## Approach

Mirror the existing server-rendered-detail-page ATS adapter pattern (closest
sibling: `source-ats-applicantpro`, Spec 348 — a client-rendered listing whose
roles are enumerated by link/sitemap harvesting and parsed per detail page). The
key difference: Arcoro's per-role detail page exposes its fields primarily as
visible HTML (title / "City, ST ZIP" / employment-type lines) and, on some
tenants, a schema.org `JobPosting` JSON-LD block plus Open Graph meta tags. The
service prefers JSON-LD, then `og:*`, then visible HTML — degrading gracefully
across tenants — and maps each role into the same `JobPostDto` contract. Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public detail pages, and register it in the four canonical
locations.

## Architecture

```
packages/plugins/source-ats-arcoro/
  package.json                       # @ever-jobs/source-ats-arcoro
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    arcoro.module.ts                 # Nest DI module
    arcoro.service.ts                # @SourcePlugin + IScraper.scrape
    arcoro.types.ts                  # normalised job / JSON-LD interfaces
    arcoro.constants.ts              # host templates, paths, regexes, defaults, headers
  __tests__/
    arcoro.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `birddoghr.com` / `ourcareerpages.com` →
   origin verbatim; else `companySlug` → `{slug}.birddoghr.com` (the
   `jobs`/`ourcareerpages` slugs route to the shared host; a bare host slug is
   used directly). Empty when neither yields a host.
2. `directLink(companyUrl)` — a `/job/{id}` deep link short-circuits enumeration.
3. `fetchJobLinks(host)` — GET `/JobSearchAdvanced`, then `/`, then
   `/sitemap.xml`; harvest `/job/{id}` links (sitemap `<loc>` + inline anchors),
   de-dup by id. HTTP 4xx on a source → skip it; other errors re-thrown into the
   outer try/catch which returns partial results.
4. `processLink` for each id (bounded to `resultsWanted`) → GET `/job/{id}`,
   `parseDetail` (JSON-LD → `og:*` → visible HTML), → `JobPostDto`.
5. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Arcoro/BirdDogHR tenants front their public board at
  `{tenant}.birddoghr.com` (shared host: `jobs.ourcareerpages.com`), all served
  by the same server-side MVC app with `/JobSearchAdvanced` (listing) and
  `/job/{id}` (detail) routes.
- The listing/search page is client-rendered (rows fetched at run time), so it
  carries no guaranteed server-side job set; the stable surface is the
  per-role, server-rendered `/job/{id}` detail page.
- Verified live (no authentication):
  - `https://jobs.ourcareerpages.com/job/77551` → HTTP 200 HTML
    ("Mid-Market Software Sales Representative", company "BirdDogHR",
    "Atlanta, GA 30313", "full-time, exempt").
  - `https://jobs.ourcareerpages.com/job/62256` → HTTP 200 HTML
    ("Implementation & Support Specialist", "Urbandale, IA 50322").
  - Tenant career centers on the `{tenant}.birddoghr.com` pattern: `jobs`,
    `engineeringjobs`, `procoreconstructionjobboard`, `agciajobs`, `agcksjobs`.
- The official Arcoro/BirdDogHR REST APIs are partner/OAuth gated and an explicit
  non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `ARCORO = 'arcoro'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-arcoro`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One listing/sitemap fetch per tenant to enumerate roles, then at most
  `resultsWanted` detail-page GETs (bounded fan-out).
- HTTP 4xx (unknown sub-domain / disabled board / closed role) → empty/skip; a
  malformed page or per-role map error → partial result. `scrape` never throws,
  so a single tenant never aborts a batch run.
- HTML / JSON-LD parsed with bounded regexes + `JSON.parse` (no DOM/XML library),
  keeping the plugin dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Client-rendered listing** (Q-AR-1) → harvest `/job/{id}` links from the
  listing/landing HTML and the sitemap; accept a direct `/job/{id}` deep link.
- **JSON-LD availability varies** (Q-AR-2) → prefer JSON-LD, fall back to `og:*`
  meta and visible HTML; never fabricate fields.
- **Shared vs vanity host** (Q-AR-3) → build `{slug}.birddoghr.com`; route
  `jobs`/`ourcareerpages` to the shared host; accept either domain on a URL.
- **Markup drift** → defensive regex extraction + entity decode; a role missing
  a title is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
