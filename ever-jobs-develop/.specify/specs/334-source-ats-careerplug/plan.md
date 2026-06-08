# Plan: 334 — CareerPlug ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 334                                           |
| Slug           | source-ats-careerplug                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 317 (Eploy)                  |

> Implementation plan for `Spec 334 — source-ats-careerplug`.

## Approach

Mirror the existing ATS adapter pattern. Closest sibling for the cheerio
HTML-scrape + `schema.org` JSON-LD extraction style is `source-ats-rexx`; the
constants / types / module / barrel layout follows `source-ats-recooty`. Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public CareerPlug careers site, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-careerplug/
  package.json                       # @ever-jobs/source-ats-careerplug
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    careerplug.module.ts             # Nest DI module
    careerplug.service.ts            # @SourcePlugin + IScraper.scrape
    careerplug.types.ts              # wire-shape interfaces (ItemList + JobPosting JSON-LD)
    careerplug.constants.ts          # host template, paths, selectors, regexes, defaults, headers
  __tests__/
    careerplug.e2e-spec.ts           # network-tolerant E2E
```

Data flow:

1. `resolveHost` — `companySlug` (sub-domain label → `https://{slug}.careerplug.com`,
   or verbatim origin when it contains a dot / scheme) ?? `companyUrl` origin.
2. `fetchJobs(host, '/jobs')` → `GET https://{tenant}.careerplug.com/jobs` →
   `parseJobs`. HTTP 400/403/404 → empty (no throw).
3. Fallback: if `/jobs` yields no JobPosting items (single-job tenants redirect
   to `/jobs/{id}/apps/new`), `fetchJobs(host, '/account')` re-reads the careers
   landing page, which still carries the full `ItemList` JSON-LD.
4. `parseJobs` (cheerio):
   - `extractPostings` — harvest every `JobPosting` from `application/ld+json`
     blocks (tolerates `ItemList`, `@graph`, arrays, and a standalone JobPosting).
   - `extractAnchors` — harvest job-card anchors (`/jobs/{id}` or `/j/{shortcode}`)
     in document order for the per-role URL + ATS id.
   - Pair postings with anchors by index.
5. `mapToJobPost` for each merged record → `JobPostDto`; `atsId` = anchor id
   (else a deterministic title+position slug); de-dup by `atsId` in `collect`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- CareerPlug exposes no anonymous JSON / XML feed per tenant; the public surface
  is the server-rendered careers site at `https://{tenant}.careerplug.com/`.
- The careers landing page and the `/jobs` index embed a `schema.org` `ItemList`
  of `JobPosting` objects as `application/ld+json` — the structured, stable data
  source.
- Verified live against `cplugjobs.careerplug.com` (CareerPlug's own careers
  site):
  - `GET /jobs` (single-job tenant) → 302 to `/jobs/{id}/apps/new`; the careers
    landing page `GET /account` → HTTP 200 with the `ItemList` JSON-LD carrying
    one real `JobPosting` (`Sales Account Executive`, `FULL_TIME`,
    `TELECOMMUTE`, `applicationLocationRequirement.name = USA`,
    `datePosted = 2025-06-02T12:34:07+00:00`, `baseSalary` USD 50000/YEAR).
  - Detail / application pages render `.job-name`, `.job-location`,
    `.job-compensation`, `.job-description-container` markup.
- An unknown tenant sub-domain redirects to the CareerPlug sign-in app (or
  returns HTTP 4xx); both are treated as an empty result.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `CAREERPLUG = 'careerplug'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-careerplug`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Listing is a single fetch per tenant (one fallback fetch for single-job
  tenants); the JSON-LD carries the full description inline, so no per-role
  detail fan-out is needed.
- A redirect to the sign-in app / HTTP 400/403/404 → empty result; a malformed
  JSON-LD block is skipped; a posting without a title is skipped. A single
  tenant never aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Listing pagination on huge aggregators** (Q-CP-1) → single-page listing
  observed; re-evaluate if truncation appears.
- **Posting ↔ anchor pairing** (Q-CP-2) → order-based pairing; deterministic
  title+position ATS-id fallback keeps jobs stable and de-dupable when an anchor
  is absent.
- **Single-job redirect** (Q-CP-3) → careers landing page (`/account`) fallback
  still carries the full `ItemList`.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
