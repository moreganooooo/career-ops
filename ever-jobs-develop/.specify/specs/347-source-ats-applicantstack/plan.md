# Plan: 347 — ApplicantStack ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |
| Status       | done                               |
| Owner        | scheduled-agent                    |
| Supersedes   | (none)                             |
| Related specs| 342 (Talentsoft), ApplicantPro     |

> Implementation plan for `Spec 347 — source-ats-applicantstack`.

## Approach

Mirror the existing server-rendered-HTML ATS adapter pattern (closest sibling:
`source-ats-applicantpro` — a per-tenant sub-domain board enumerated from a
single document, then enriched per-role from a server-rendered detail page). The
key difference: ApplicantStack's enumeration surface is a server-rendered HTML
`<table>` at `/x/openings` (not a sitemap), so the service parses table rows
defensively (no DOM dependency) into the same `JobPostDto` contract. Build a
self-contained plugin package with the standard file layout, implement `IScraper`
over the public openings table + detail pages, and register it in the four
canonical locations.

## Architecture

```
packages/plugins/source-ats-applicantstack/
  package.json                       # @ever-jobs/source-ats-applicantstack
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    applicantstack.module.ts         # Nest DI module
    applicantstack.service.ts        # @SourcePlugin + IScraper.scrape
    applicantstack.types.ts          # opening / detail / normalised job interfaces
    applicantstack.constants.ts      # host template, paths, regexes, defaults, headers
  __tests__/
    applicantstack.e2e-spec.ts       # network-tolerant E2E
```

Data flow:

1. `resolveTenant` — `companySlug` → tenant token (a bare `applicantstack.com`
   host slug yields its first non-`www` label); else `companyUrl` on
   `applicantstack.com` → its first non-`www` sub-domain label. Empty when neither
   yields a tenant.
2. `fetchOpenings(host)` → `GET /x/openings` as text. HTTP 4xx or a retired-board
   placeholder → empty (no throw); other errors re-thrown into the outer try/catch
   which returns partial results.
3. `parseOpenings(html)` — split into `<tr>` blocks, capture each row's
   `/x/detail/{jobId}` anchor (jobId + title) and remaining cells (Date Posted,
   "Industry - Job Category", City). De-dup by `jobId`.
4. Slice to `resultsWanted`, then for each surfaced opening `fetchDetail` →
   `parseDetail` (og metadata company, summary-table fields, `listing_description`
   body). A failed detail fetch leaves the table-derived row values in place.
5. `assembleJob` merges row + detail; `processJob` → `JobPostDto`; `atsId` =
   `{jobId}`; apply URL derived by `/x/detail/` → `/x/apply/`.
6. Wrap in `JobResponseDto`.

## Endpoint Discovery (verified 2026-06-03)

- ApplicantStack tenants front their public career board at
  `{tenant}.applicantstack.com/x/openings` — a server-rendered, sortable HTML
  listings table (Title / Date Posted / "Industry - Job Category" / City columns),
  each title cell linking to `/x/detail/{jobId}`.
- Each role's detail page (`/x/detail/{jobId}`) is server-rendered with `og:`
  metadata, a "Job post summary" `<th>/<td>` table, and a
  `<div class="listing_description">` body; the apply form lives at
  `/x/apply/{jobId}`.
- There is **no** public JSON list feed and **no** schema.org JSON-LD; the
  openings table is the richest unauthenticated enumeration surface.
- Verified live against the At Work Group tenant:
  - `https://atwork443.applicantstack.com/x/openings` → HTTP 200 HTML, ~404-row
    listings table.
  - `https://atwork443.applicantstack.com/x/detail/a2v6venn6ji9` → HTTP 200 HTML
    ("Account Manager"), `og:title`/`og:description`/`og:site_name`, summary table
    (`ID: 56380612782CBH`, `Date Posted: 03/12/2026`, `City: Riverside`), and a
    `listing_description` body.
  - Sibling tenants on the same host pattern: `jayco`, `qrm`, `fwcc`, `acesrch`,
    `solutionsbyfusion`.
- The credentialed ApplicantStack / SwipeClock / WorkforceHub recruiter and
  candidate APIs are an explicit non-goal.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `APPLICANTSTACK = 'applicantstack'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias `@ever-jobs/source-ats-applicantstack`.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1…5)

- One openings fetch per tenant enumerates every open role; detail fetches are
  capped at `resultsWanted`, so the work and result-set are both bounded.
- HTTP 4xx (unknown sub-domain / disabled board) or a retired-board placeholder →
  empty result; a malformed page or per-role map error → partial result. `scrape`
  never throws, so a single tenant never aborts a batch run.
- HTML is parsed with bounded regexes (no DOM library), keeping the plugin
  dependency-free and tolerant of minor markup drift.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy,
  optional CA cert).

## Risks / Mitigations

- **No JSON-LD** (Q-AS-1) → parse the authoritative openings table + the detail
  summary table / `listing_description` body; never depend on schema.org markup.
- **Location granularity** (Q-AS-2) → surface the "City" column, splitting a
  `City, ST` pair into `city` + `state`; never fabricate a location.
- **No structured employment type** (Q-AS-3) → mine a Full/Part-time (temp /
  contract / seasonal / internship) hint from the title / body; null when absent.
- **Markup drift** → defensive row / cell / summary-field regexes with entity
  decode; a row missing a detail anchor or title is skipped, not fatal.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
