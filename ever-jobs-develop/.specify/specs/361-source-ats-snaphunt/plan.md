# Plan: 361 — Snaphunt ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 361 — source-ats-snaphunt`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-hireful` — a client-rendered SPA index whose stable public surface is
the tenant XML sitemap plus per-role server-rendered detail pages carrying
schema.org `JobPosting` JSON-LD). The key Snaphunt-specific difference: it is a
marketplace, so (a) the company is a per-job field read from `hiringOrganization`,
and (b) the tenant career-site detail pages are client-rendered, so role detail is
read from the **canonical apex page** (`https://snaphunt.com/jobs/{jobId}`) rather
than the tenant career-site page. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public sitemap + apex detail
pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-snaphunt/
  package.json                       # @ever-jobs/source-ats-snaphunt
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    snaphunt.module.ts               # Nest DI module
    snaphunt.service.ts              # @SourcePlugin + IScraper.scrape
    snaphunt.types.ts                # normalised sitemap/JSON-LD interfaces
    snaphunt.constants.ts            # host templates, sitemap path, detail template, regexes, defaults, headers
  __tests__/
    snaphunt.e2e-spec.ts             # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companyUrl` on `snaphunt.com` → origin verbatim; else
   `companySlug` → `{slug}.snaphunt.com` (a bare host slug is used directly).
   Empty when neither yields a host.
2. `fetchSitemap(host)` → `GET /sitemap.xml` as text. HTTP 4xx or a missing
   sitemap → empty (no throw); other errors re-thrown into the outer try/catch
   which returns partial results.
3. `parseSitemap(xml)` — walk each `<loc>`, keep `/job/{id}` entries (capture the
   alphanumeric id + sibling `<lastmod>`), de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the
   canonical apex detail page (`https://snaphunt.com/jobs/{jobId}`) and
   `parseDetail` it: scan `application/ld+json` blocks for a `JobPosting`
   (recursive over arrays / `@graph`), with `og:title`/`og:url`/`og:description`
   fallbacks; normalise location (jobLocation, else applicant-requirement country),
   employment type (array), remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = job id; per-job company
   name from `hiringOrganization.name`; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched & verified live 2026-06-03)

- Snaphunt powers each customer's candidate career-site on its own sub-domain at
  `{tenant}.snaphunt.com`. Because it is a marketplace, the company is a per-job
  field (`hiringOrganization`).
- The per-tenant `/sitemap.xml` enumerates that tenant's open `/job/{jobId}` detail
  pages. The tenant detail pages are client-rendered, so the crawlable, fully
  server-rendered surface is the canonical apex page
  `https://snaphunt.com/jobs/{jobId}`, pre-rendered with schema.org `JobPosting`
  JSON-LD for Google-for-Jobs.
- Confirmed live: the platform, the `{tenant}.snaphunt.com` host pattern, per-tenant
  sitemaps of `/job/{jobId}` entries (named real tenants — `snappr`, `steenbok`,
  `totalshape`, `venture`, `personalbuero`), and the apex JSON-LD payload shape
  (`title`, `description` HTML, `datePosted`, `employmentType` array,
  `hiringOrganization`, `jobLocation[].address`, `applicantLocationRequirements`,
  `identifier.value`, `jobLocationType`). Confidence: **verified**.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `SNAPHUNT = 'snaphunt'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-snaphunt`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One sitemap fetch per tenant; detail-page fetches are bounded by slicing the
  enumerated role set to `resultsWanted` before fetching.
- HTTP 4xx (unknown sub-domain / missing sitemap or removed role) → empty / skip;
  a malformed page, non-JSON JSON-LD, client-shell `"undefined"` placeholder, or
  per-role map error → partial result. `scrape` never throws, so a single tenant
  never aborts a batch run.
- JSON-LD is parsed with a bounded block scan + recursive `@type` search (no XML /
  HTML library), keeping the plugin dependency-free and tolerant of markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Marketplace company resolution** (Q-SH-1) → map `companyName` per-job from
  `hiringOrganization.name`, falling back to the de-slugified tenant label.
- **Client-rendered career-site detail** (Q-SH-2) → read role detail from the
  canonical apex page (`/jobs/{jobId}`); treat literal `"undefined"` / `"null"`
  JSON-LD tokens as absent. Confidence: verified.
- **Remote-role location** (Q-SH-3) → fall back to the
  `applicantLocationRequirements` country when a role omits a physical
  `jobLocation`; flag remote from `jobLocationType: TELECOMMUTE`.
- **Markup / payload drift** → defensive JSON parsing + `og:` regex fallbacks; a
  role missing a title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
