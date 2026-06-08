# Plan 329 — PCRecruiter ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 329 — source-ats-pcrecruiter`.

## Approach

Mirror the existing ATS adapter pattern. The closest siblings are
`source-ats-tribepad` (multi-tenant HTML scrape with cheerio + listing →
detail fan-out) and `source-ats-oorwin` (bounded concurrent detail fan-out with
`Promise.allSettled`). Build a self-contained plugin package with the standard
file layout, implement `IScraper` over the public PCRecruiter job board HTML,
and register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-pcrecruiter/
  package.json                       # @ever-jobs/source-ats-pcrecruiter
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    pcrecruiter.module.ts            # Nest DI module
    pcrecruiter.service.ts           # @SourcePlugin + IScraper.scrape
    pcrecruiter.types.ts             # wire-shape interfaces (listing + JSON-LD)
    pcrecruiter.constants.ts         # host, board path, selectors, defaults, headers
  __tests__/
    pcrecruiter.e2e-spec.ts          # network-tolerant E2E
```

Data flow:

1. `resolveBoardUrl` — `companyUrl` (verbatim) ?? `companySlug` as the `uid`
   value → `…/pcrbin/jobboard.aspx?uid={encoded slug}` on the default host.
2. `fetchListingHtml(boardUrl)` → first listing page HTML. HTTP 400/403/404/410
   (unknown board) → empty (no throw).
3. `parseListing(html)` — cheerio → `PCRecruiterListingItem[]` (recordid, title,
   detailUrl, location, datePosted). `parsePagingState(html)` → fresh `pcr-id`
   token, `unifiedsearch` cursor, total count.
4. `collectItems` — bounded `Promise.allSettled` (6 at a time) fan-out to each
   detail page; `parseDetail` extracts the schema.org `JobPosting` JSON-LD
   (description HTML, employer, structured location, employmentType, datePosted),
   falling back to the `#jobdesc` marker-bracketed HTML block. `mapToJobPost`
   → `JobPostDto`; de-dup by `recordid`.
5. Best-effort pagination: POST the board's `googlePage` form
   (`morecount={pageIndex*24}$${pageIndex}`, `pcr-id`, `unifiedsearch`) while
   `jobPosts.length < effectiveTotal`, up to `PCRECRUITER_MAX_PAGES`.
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- The PCRecruiter public job board is served at
  `https://www2.pcrecruiter.net/pcrbin/jobboard.aspx`. A tenant is addressed by
  `?uid={Display Name}.{databasename}` (human-readable) or by a server-issued
  `?pcr-id={token}` SessionID.
- Verified live against `?uid=alliance staffing.alliancestaffing` (a US staffing
  board): HTTP 200, header `1-24 of 38`, 24 `<table id="joblist">` rows on page
  1, each carrying `recordid`, title anchor, `td_location`, `td_positionid`.
- The detail page (`?action=detail&recordid={ID}&pcr-id={TOKEN}`) embeds a
  `<script type="application/ld+json">` schema.org `JobPosting` with full HTML
  `description`, `hiringOrganization.name`, structured `jobLocation.address`,
  `employmentType`, and ISO `datePosted`. Byte-confirmed on recordid
  `203988647552144` ("Safety Coordinator", Apollo Technical, Spring/TX).
- There is no public JSON API; HTML is scraped with cheerio. No authentication
  is used.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `PCRECRUITER = 'pcrecruiter'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-pcrecruiter`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…NFR-5)

- Detail fetches fan out with bounded concurrency (`Promise.allSettled`, 6 at a
  time) and a polite inter-round delay (~300 ms). A single tenant never aborts
  a batch run.
- HTTP 400/403/404/410 → empty result; HTML/JSON-LD parse error → empty/partial
  result; pagination POST failure → keep page-1 results and stop paging.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).
- Result-set bounded by `resultsWanted` (default 100 internally); pagination
  bounded by `PCRECRUITER_MAX_PAGES` (20).

## Risks / Mitigations

- **Pagination cursor fragility** (Q-PCR-1) → best-effort POST; page-1 results
  always retained; never throws.
- **Alternate hosts** (Q-PCR-2) → default host for `uid`-only input; full
  `companyUrl` honoured verbatim for `host.pcrecruiter.net` etc.
- **JSON-LD absence on custom templates** (Q-PCR-3) → layered `#jobdesc` HTML
  fallback; listing-only job emitted when both are absent.
- **WAF 403/4xx on some boards** → out of scope; graceful empty result.
- **Free-text listing location** → heuristic comma-split into city/state; the
  structured JSON-LD address takes priority when present.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
