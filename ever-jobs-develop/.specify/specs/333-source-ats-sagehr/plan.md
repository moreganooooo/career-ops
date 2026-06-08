# Plan: 333 — Sage HR ATS Source Plugin

| Field         | Value             |
| ------------- | ----------------- |
| Spec ID       | 333               |
| Slug          | source-ats-sagehr |
| Status        | done              |
| Owner         | scheduled-agent   |
| Created       | 2026-06-03        |
| Last updated  | 2026-06-03        |
| Supersedes    | (none)            |
| Related specs | 330 (Prescreen), 328 (rexx systems) |

> Implementation plan for `Spec 333 — source-ats-sagehr`.

## Approach

Mirror the existing ATS adapter pattern. Closest siblings: `source-ats-rexx` for
the listing → detail cheerio fan-out shape, and `source-ats-prescreen` for the
public, anonymous candidate-portal scrape with graceful degradation. Build a
self-contained plugin package with the standard file layout, implement
`IScraper` over the public Sage HR careers site, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-sagehr/
  package.json                       # @ever-jobs/source-ats-sagehr
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    sagehr.module.ts                 # Nest DI module
    sagehr.service.ts                # @SourcePlugin + IScraper.scrape
    sagehr.types.ts                  # wire-shape interfaces (listing row + detail)
    sagehr.constants.ts              # host, path templates, selectors, defaults, headers
  __tests__/
    sagehr.e2e-spec.ts               # network-tolerant E2E
```

Data flow:

1. `resolveCareerSiteId` — `companySlug` (verbatim) ?? the segment preceding
   `vacancies` in `companyUrl` (`/{careerSiteId}/vacancies`), else the first
   UUID-shaped path segment, else any UUID embedded in the raw string.
2. `fetchListing(careerSiteId)` → `GET https://talent.sage.hr/{careerSiteId}/vacancies`
   → parse `div.job` cards for `{positionId, title, location, detailUrl}` and the
   tenant name from `<h1>`. HTTP 400/403/404 → empty (no throw).
3. Bounded `Promise.allSettled` fan-out over the wanted slice → `fetchDetail`:
   - `GET /jobs/{positionId}` → extract employment-type chip, location chip,
     company name (logo `alt`), and the concatenated `.block-content` description.
4. `mapToJobPost` for each merged record → `JobPostDto`; `atsId` = position id;
   de-dup by `atsId`.
5. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- Sage HR (formerly CakeHR) publishes a public candidate careers site
  ("Vacancies") on the shared recruitment host `talent.sage.hr`, keyed by the
  tenant's career site UUID.
- Verified live against career site `cf0157f8-8d5e-4d2a-a9f7-0a80b348b097`
  (Newstel Worldwide HQ, a known Sage HR customer):
  - `GET /{careerSiteId}/vacancies` → HTTP 200, HTML with the tenant name in
    `<h1>` and two `div.job` cards (`a.title[href="/jobs/{uuid}"]` + `.location`).
  - `GET /jobs/{positionId}` → HTTP 200, detail / apply page with the
    `ul.with-ticks` employment-type / location chips, the company logo `alt`, and
    six `.block-content` description blocks.
- The authenticated REST API (`/api/recruitment/positions`, `X-Auth-Token`
  header) returns the same published positions but requires a per-tenant token;
  it is a non-goal. No anonymous JSON / RSS feed is exposed — probed `*.json`,
  RSS / atom, and `/api/...` paths returned the app's HTML 404.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `SAGEHR = 'sagehr'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-sagehr`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- Listing is a single fetch per tenant; detail fetches fan out under a bounded
  `Promise.allSettled` (concurrency 5, 250 ms polite delay between rounds).
- HTTP 400/403/404 → empty result; HTML parse error → partial result; a single
  detail failure → that row degrades to listing-only. A single tenant never
  aborts a batch run.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set and fan-out bounded by `resultsWanted` (default 100 internally).

## Risks / Mitigations

- **Career site id churn** (Q-SH-1) → treat the UUID as the stable, caller-supplied
  tenant key; no slug→UUID directory maintained here.
- **Listing pagination on huge tenants** (Q-SH-2) → single-page listing observed;
  re-evaluate if truncation appears.
- **Missing detail enrichment** → fall back to the listing row's title +
  location; `atsId` is the position id from the listing anchor.
- **Description language** (Q-SH-3) → accept whatever language the careers site
  serves.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
