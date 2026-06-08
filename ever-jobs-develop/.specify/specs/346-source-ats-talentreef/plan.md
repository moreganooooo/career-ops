# Plan: 346 — TalentReef ATS Source Plugin

| Field         | Value             |
| ------------- | ----------------- |
| Spec          | spec.md           |
| Created       | 2026-06-03        |
| Last updated  | 2026-06-03        |
| Status        | done              |
| Owner         | scheduled-agent   |
| Supersedes    | (none)            |
| Related specs | 338 (TalentAdore) |

## Overview

Implement a generic, multi-tenant TalentReef (Mitratech) source adapter that
ingests open roles from the public, unauthenticated career-search page at
`https://apply.jobappnetwork.com/{tenant}/{lang}`. The adapter follows the exact
structure/idiom of the sibling `source-ats-talentadore` plugin.

## Files

```
packages/plugins/source-ats-talentreef/
  package.json                        # @ever-jobs/source-ats-talentreef, 0.1.0, MIT
  tsconfig.json                       # extends base; outDir dist/packages/source-ats-talentreef
  src/index.ts                        # re-export module + service
  src/talentreef.constants.ts         # host/path templates, regexes, results cap, headers + surface doc
  src/talentreef.types.ts             # defensive JobPosting JSON-LD + SPA positions interfaces
  src/talentreef.module.ts            # @Module providers/exports [TalentReefService]
  src/talentreef.service.ts           # @SourcePlugin IScraper implementation
  __tests__/talentreef.e2e-spec.ts    # network-tolerant e2e (KNOWN_TENANT = 'rtg')
```

Central registration (Site enum, ALL_SOURCE_MODULES, tsconfig.base.json paths,
jest.config.js moduleNameMapper) is wired by the orchestrator — not touched here.

## Fetch Flow

1. `scrape(input)` — return empty `JobResponseDto` immediately if neither
   `companySlug` nor `companyUrl` is provided.
2. `resolveTenant` — take `companySlug` verbatim, else parse the leading path
   segment (skipping `apply`/`clients`/`jobs`) or the first sub-domain label of
   `companyUrl`.
3. Build the HTTP client via `createHttpClient({ proxies, caCert, timeout })`
   and set browser-like headers.
4. `fetchCareerPage` — single `GET /{tenant}/{lang}` (lang defaults to `en`),
   `responseType: 'text'`. HTTP 4xx → log warn, return null (no jobs).
5. `extractJobs` — harvest two complementary public sources from the HTML:
   - All `application/ld+json` blocks → flatten (`@graph` aware) → keep nodes
     whose `@type` is `JobPosting`.
   - The SPA bootstrap blob (`window.__INITIAL_STATE__` / `__NEXT_DATA__` /
     `__PRELOADED_STATE__`) → first populated positions array
     (`jobs`/`positions`/`results`/`items`).
   - Derive `companyName` from `hiringOrganization.name` / envelope `company`,
     falling back to a tenant-derived title-cased name.
6. `collect` → `processJob` per role: require `title` + `atsId` + `jobUrl`,
   de-dup by `atsId`, map to `JobPostDto`.
7. Slice to `resultsWanted` (default 100) and return `new JobResponseDto(...)`.

## Mapping Highlights

- `atsId` from the first of `id`/`jobId`/`requisitionId`/`identifier(.value)`/
  `slug`.
- `location` from `jobLocation.address` (`addressLocality`/`addressRegion`/
  `addressCountry`), else flat `city`/`state`/`country`, else free-text blob.
- `description` HTML-preferred, converted per `descriptionFormat` via
  `markdownConverter` / `htmlToPlainText`.
- `emails` via `extractEmails(description)`.
- `isRemote` from `jobLocationType: TELECOMMUTE`, `remote`/`isRemote` flags, or
  remote/WFH text in location/title/tags.
- `employmentType` normalized from a string or string[].

## Error Handling (graceful degradation)

- No slug/url → empty result (warn).
- Unresolvable tenant → empty result (warn).
- HTTP 4xx on the career page → empty result (warn), never throws.
- Malformed JSON-LD / state blob → that block skipped (`safeJsonParse` returns
  null), parsing continues.
- Per-job map error → caught in `collect`, that job skipped (warn).
- Any unexpected throw in `scrape` → caught, returns partial results gathered
  so far. A single bad tenant never aborts a batch.

## Performance

- One HTTP fetch per tenant (the page carries the full open-roles list).
- Client-side slice to `resultsWanted`; de-dup via a `Set<atsId>`.
- Regex-based harvesting with a zero-width-match guard; no headless browser.

## Verification

- `tsc --noEmit` via the package tsconfig (CI `build`).
- Network-tolerant e2e (zero results acceptable; shape assertions guarded).
- Live public surface confirmed 2026-06-03 (`rtg`, `jibinc`, `mcm`,
  `surf-sand-careers`, `tacobellcorporate`); exact SPA wire shape modelled
  defensively (see spec.md Q-TR-1, `verified: false`).
