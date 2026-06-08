# Plan: 356 — PageUp ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 354 (Hireful), ApplicantPro        |

> Implementation plan for `Spec 356 — source-ats-pageup`.

## Approach

Mirror the existing schema.org ATS adapter pattern (closest sibling:
`source-ats-hireful` — a multi-tenant adapter that enumerates a tenant's open
roles from a crawlable index and parses per-role detail pages into the same
`JobPostDto` contract). The key difference: PageUp's listing index is
**server-rendered** (real `…/job/{jobId}/{slug}` anchors, paginated via
`?page=&page-items=`) rather than a SPA, and its detail pages carry their
structured data as `<strong>`-labelled rows (with schema.org `JobPosting`
JSON-LD + `og:` meta only where a tenant has enabled Google-for-Jobs). The
service therefore parses the labelled fields as the primary surface and layers
JSON-LD / `og:` fallbacks in. Build a self-contained plugin package with the
standard file layout, implement `IScraper` over the public listing + detail
pages, and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-pageup/
  package.json                       # @ever-jobs/source-ats-pageup
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    pageup.module.ts                 # Nest DI module
    pageup.service.ts                # @SourcePlugin + IScraper.scrape
    pageup.types.ts                  # normalised listing/detail/JSON-LD interfaces
    pageup.constants.ts              # host template, listing path, regexes, defaults, headers
  __tests__/
    pageup.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveListingBase` — `companyUrl` on `pageuppeople.com` → origin +
   `…/{instanceId}/{caw}/{lang}/` path verbatim; else `companySlug` (numeric
   instance id) → `careers.pageuppeople.com/{id}/caw/en/` (a host/path slug is used
   directly; a non-numeric label becomes a custom sub-domain host). Empty when
   neither yields a base.
2. `fetchListing(base)` — walk `GET …/listing/?page=n&page-items=100` pages as
   text, bounded by `resultsWanted` and a hard page ceiling. HTTP 4xx or a missing
   listing → empty/stop (no throw); other errors re-thrown into the outer
   try/catch which returns partial results.
3. `parseListing(html)` — extract `…/job/{jobId}/{slug}` anchors (capture the
   numeric job id; resolve relative hrefs against the origin), de-dup by id.
4. Slice the enumerated entries to `resultsWanted`, then for each fetch the detail
   page and `parseDetail` it: read the `<strong>`-labelled `Work type:` /
   `Location:` / `Categories:` / `Advertised:` rows + `<h1>` title; layer in a
   `JobPosting` JSON-LD block (recursive over arrays / `@graph`) and
   `og:title`/`og:url`/`og:description` as fallbacks; normalise location,
   employment type, remote flag, date.
5. `processJob` for each role → `JobPostDto`; `atsId` = numeric job id; de-dup by id.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (researched + verified live 2026-06-03)

- PageUp powers each customer's candidate site on the shared platform host
  `careers.pageuppeople.com`, addressed by a numeric instance id
  (`/{instanceId}/caw/en/`); a few tenants front it under a custom
  `{tenant}.pageuppeople.com` host (e.g. `pupcareers.pageuppeople.com`).
- The jobs index is **server-rendered**: `…/listing/` carries real
  `<a href="…/job/{jobId}/{slug}">` anchors per open role, paginated via
  `?page=&page-items=`. Each detail page renders the role's fields as
  `<strong>`-labelled rows (`Job no:`, `Work type:`, `Location:`, `Categories:`,
  `Advertised:`, `Applications close:`).
- Confirmed live: the platform host, numeric instance-id addressing, the
  `…/job/{jobId}/{slug}` detail-link pattern, the `?page=&page-items=` pagination,
  and the labelled detail fields — against named real tenants: Calor (`595`),
  SA Health (`532`), La Trobe University (`533`), Thiess (`399`), Asahi (`527`),
  CSU (`873`). Custom-host pattern `pupcareers.pageuppeople.com` confirmed live.
- A schema.org `JobPosting` JSON-LD block is present only where a tenant has
  enabled Google-for-Jobs, so it is treated as an enrichment fallback rather than
  the primary surface; the labelled fields carry the role on tenants without it.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PAGEUP = 'pageup'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-pageup`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Listing fetches are bounded by `resultsWanted` and a hard page ceiling; detail
  fetches are bounded by slicing the enumerated role set to `resultsWanted`.
- HTTP 4xx (unknown instance / missing listing or removed role) → empty / skip;
  a malformed page or non-JSON JSON-LD or per-role map error → partial result.
  `scrape` never throws, so a single tenant never aborts a batch run.
- Labelled-field + JSON-LD parsing uses bounded regexes + a recursive `@type`
  search (no XML / HTML library), keeping the plugin dependency-free and tolerant
  of markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **Custom careers hosts** (Q-PU-1) → expand `careers.pageuppeople.com/{id}/caw/en/`
  from a numeric slug; a full `companyUrl` (or host/path slug) addresses a custom
  host verbatim, and enumeration follows the absolute `…/job/…` hrefs the listing
  HTML serves.
- **`caw`/`cw` + language token drift** (Q-PU-2) → build the base from `caw/en/`
  but enumerate from the absolute `…/{instanceId}/{seg}/{lang}/job/…` hrefs in the
  listing HTML, so whatever segment the tenant serves is followed.
- **Detail structured data** (Q-PU-3) → parse the `<strong>`-labelled fields as
  the primary surface; layer JSON-LD (recursive over arrays / `@graph`) + `og:`
  fallbacks; a malformed or absent block yields "use labelled fields", never a
  throw.
- **Markup / payload drift** → defensive regexes + JSON parsing; a role missing a
  title or id is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
