# Plan: 354 — Hireful ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft), ApplicantPro     |

> Implementation plan for `Spec 354 — source-ats-hireful`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-applicantpro` — a client-rendered SPA index whose stable public
surface is the tenant XML sitemap plus per-role server-rendered detail pages).
The key difference: Hireful's (LiveVacancies') detail pages carry their
structured data as a schema.org `JobPosting` **JSON-LD** block rather than
`og:`/inline-mount metadata, so the service parses JSON-LD defensively
(recursively walking arrays / `@graph`) into the same `JobPostDto` contract.
Build a self-contained plugin package with the standard file layout, implement
`IScraper` over the public sitemap + detail pages, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-hireful/
  package.json                       # @ever-jobs/source-ats-hireful
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    hireful.module.ts                # Nest DI module
    hireful.service.ts               # @SourcePlugin + IScraper.scrape
    hireful.types.ts                 # normalised sitemap/JSON-LD interfaces
    hireful.constants.ts             # host templates, sitemap path, regexes, defaults, headers
  __tests__/
    hireful.e2e-spec.ts              # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `livevacancies.co.uk` (or a known custom
   careers host) → origin verbatim; else `companySlug` → `{slug}.livevacancies.co.uk`
   (a bare host slug is used directly). Empty when neither yields a host.
2. `fetchSitemap(host)` → `GET /sitemap.xml` as text. HTTP 4xx or a missing
   sitemap → empty (no throw); other errors re-thrown into the outer try/catch
   which returns partial results.
3. `parseSitemap(xml)` — walk each `<loc>`, keep `/vacancy/{id}` entries (capture
   the numeric id + sibling `<lastmod>`), de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the detail
   page and `parseDetail` it: scan `application/ld+json` blocks for a `JobPosting`
   (recursive over arrays / `@graph`), with `og:title`/`og:url`/`og:description`
   fallbacks; normalise location, employment type, remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = vacancy id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched 2026-06-03)

- Hireful powers each customer's candidate portal on the LiveVacancies platform at
  `{tenant}.livevacancies.co.uk` (some tenants front it under a custom careers host
  such as `agency.hireful.com` / `www.hirefulcareers.co.uk`).
- The jobs index is a client-rendered, hashbang-routed SPA (`#!/`), so the listing
  page carries no server-side job links. The crawlable public surface is the tenant
  XML sitemap (`/sitemap.xml`) enumerating `/vacancy/{vacancyId}` detail pages, each
  pre-rendered with schema.org `JobPosting` JSON-LD for Google-for-Jobs.
- Confirmed live: the platform, the `{tenant}.livevacancies.co.uk` host pattern, and
  named real tenants — `thebigissue` (The Big Issue), `tkat` (TKAT), `hirefulagency`
  (hireful Agency), `planinternationaluk` (Plan International UK), `glide`,
  `transforminglearning`.
- NOT confirmed (SPA limitation): the exact byte-level JSON-LD payload, because an
  unauthenticated no-JS fetch returns only the app shell. The parser is therefore
  written defensively around the documented Google-for-Jobs `JobPosting` pattern
  (verified=false).

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HIREFUL = 'hireful'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-hireful`.
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

- **Custom careers hosts** (Q-HF-1) → expand `{slug}.livevacancies.co.uk` from a
  slug; a full `companyUrl` (or bare host slug) addresses a custom host verbatim.
- **SPA-rendered payload** (Q-HF-2) → parse the documented JSON-LD `JobPosting`
  defensively (recursive over arrays / `@graph`) with `og:` fallbacks; a malformed
  or absent block yields "no job", never a throw. Confidence: unverified.
- **Vacancy URL shape** (Q-HF-3) → match `/vacancy|vacancies|job|jobs/{digits}` in
  sitemap `<loc>` entries; the numeric id is the stable ATS id.
- **Markup / payload drift** → defensive JSON parsing + `og:` regex fallbacks; a
  role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
