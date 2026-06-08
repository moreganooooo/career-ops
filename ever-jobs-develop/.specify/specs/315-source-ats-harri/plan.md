# Plan 315 — Harri ATS Source Plugin

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-06-03                         |
| Last updated | 2026-06-03                         |

> Implementation plan for `Spec 315 — source-ats-harri`.

## Approach

Mirror the Workstream HTML-scraping adapter pattern (`source-ats-workstream`,
Spec 314). Build a self-contained plugin package with the standard file layout,
implement `IScraper` over the public Harri employer careers HTML surface, and
register it in the four canonical locations.

## Architecture

```
packages/plugins/source-ats-harri/
  package.json                       # @ever-jobs/source-ats-harri
  tsconfig.json                      # extends base, own outDir
  src/
    index.ts                         # barrel (module + service)
    harri.module.ts                  # Nest DI module
    harri.service.ts                 # @SourcePlugin + IScraper.scrape
    harri.types.ts                   # wire-shape interfaces (HarriListJob, HarriDetailJob)
    harri.constants.ts               # host, path template, regex, defaults, headers
  __tests__/
    harri.e2e-spec.ts                # network-tolerant E2E
```

Data flow:

1. `resolveEmployerSlug` — `companySlug` ?? first path segment of `companyUrl`.
2. `fetchJobList(client, slug)` → `GET harri.com/{slug}` → parse all
   `/{slug}/job/{jobId}-{titleSlug}` href links from the HTML.
3. Slice to `resultsWanted`; fan out with a bounded `Promise.allSettled` over
   `fetchJobDetail(client, listJob)` → `GET harri.com/{slug}/job/{id}-{titleSlug}`.
4. `parseJobDetail(html, listJob)` → extract title, company, location, description,
   employment type, pay, remote from Open Graph meta tags + heuristic HTML extraction.
5. `processJob(listJob, detail, ...)` → `JobPostDto`, de-duping by `atsId` (jobId).
6. Trim to `resultsWanted`, wrap in `JobResponseDto`.

## Endpoint discovery (verified 2026-06-03)

- `harri.com/{slug}` returns server-rendered HTML with job links matching
  `/{slug}/job/{jobId}-{titleSlug}` patterns. Confirmed on:
  - `harri.com/riverstation-careers` (2 jobs)
  - `harri.com/careers_uk` (2 jobs)
  - Global listing `harri.com/jobs?page=N` shows dozens of employers with this
    pattern.
- Job detail pages at `harri.com/{slug}/job/{jobId}-{titleSlug}` contain
  `og:title` (job title) and `og:description` (location string) meta tags,
  plus a server-rendered HTML body with the description.
- Apply URL pattern: `/{slug}/job/{jobId}-{titleSlug}/apply/{jobId}` confirmed
  on the Harri UK careers page.
- Harri's underlying JSON API requires authentication; no public anonymous JSON
  endpoint was found after thorough investigation. The HTML surface is the only
  viable public path.

## Registration (CLAUDE.md §4 — 4 files, applied centrally by the orchestrator)

1. `packages/models/src/enums/site.enum.ts` — `HARRI = 'harri'`.
2. `packages/plugins/index.ts` — import + append to `ALL_SOURCE_MODULES`.
3. `tsconfig.base.json` — path alias.
4. `jest.config.js` — moduleNameMapper entry.

## Performance / Resilience Notes (NFR-1/2/3/4)

- Two-phase scrape: listing page → detail pages. Only `resultsWanted` detail
  pages are fetched; the listing parse is cheap (one HTML page).
- `Promise.allSettled` over detail pages: one transient fetch failure never
  aborts the batch. The partial result is always returned.
- HTTP 404/410 on the listing page → empty result; no throw.
- All I/O through `@ever-jobs/common` `createHttpClient` (UA, timeout, proxy).

## Risks / Mitigations

- **Angular SPA client-side rendering** — some tenants may load jobs via XHR
  only, yielding no links in the static HTML. Degrades to empty (Q-HR-1).
- **Meta tag absence** — location and company name fall back to heuristic
  extraction from the title tag and HTML body. Null values are acceptable per
  `JobPostDto` contract.
- **Frequent URL-slug changes** — the title slug in the job URL is cosmetic;
  only the numeric `jobId` is used as `atsId`. Slug changes do not break dedup.
- **Rate limiting / WAF** — the HARRI_HEADERS set a browser-like User-Agent
  and Accept. A brief polite delay (`HARRI_REQUEST_DELAY_MS`) is applied
  between concurrent rounds.

## Rollout

Single PR / commit on `develop`. CI `build` (tsc) + `test:sources` validate.
