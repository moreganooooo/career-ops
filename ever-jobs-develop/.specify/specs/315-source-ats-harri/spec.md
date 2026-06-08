# Spec: 315 — Harri ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 315                                |
| Slug           | source-ats-harri                   |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 314 (Workstream), 301 (Niceboard)  |

## 1. Problem Statement

Harri (harri.com) is an all-in-one workforce management and talent acquisition
platform built for the hospitality and service industries. Employers on the
platform host public careers pages at `harri.com/{employerSlug}` that list open
positions. Ever Jobs has no adapter for Harri, so all Harri-hosted employer
careers pages are currently un-ingestable. A single generic, multi-tenant
adapter unlocks the platform for any employer.

## 2. Goals

- Add a generic, multi-tenant `source-ats-harri` plugin that ingests jobs from
  **any** Harri-powered employer page given a `companySlug` (the employer's path
  segment, e.g. `riverstation-careers`) or a full `companyUrl`.
- Use the **public** server-rendered HTML careers page — no authentication is
  required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'harri'`).

## 3. Non-Goals

- Harri's authenticated REST API (requires OAuth tokens). Not used.
- The global `harri.com/jobs` listing (cross-employer aggregation). This plugin
  is employer-scoped.
- Dynamic filter parameters (location, category) passed to the Angular SPA via
  the authenticated API. The public HTML surface is used as-is.
- Per-job description enrichment beyond what the server-rendered detail page
  provides.
- A curated seed list of Harri employer slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Harri plugin at an
> employer slug, so that I ingest that employer's open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Harri adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                   | Priority |
| ----- | --------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve an employer slug from `companySlug`, or from the first path segment of `companyUrl`.  | must     |
| FR-2  | Fetch the employer careers page at `harri.com/{slug}` and extract all job href links from the server-rendered HTML. | must     |
| FR-3  | Fan out to each job-detail page (`harri.com/{slug}/job/{id}-{titleSlug}`) with a bounded `Promise.allSettled`. | must     |
| FR-4  | Extract title, location, description, employment type, and remote status from each detail page's Open Graph meta tags and HTML body. | must     |
| FR-5  | De-duplicate positions by job id (ATS id) within a single run.                                | must     |
| FR-6  | Map each job to `JobPostDto` (title, url, location, remote, datePosted=null, description, applyUrl). | must     |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                         | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.         | must     |
| FR-9  | Tolerate unknown / dead employers (HTTP 404/410) and fetch failures without throwing.           | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public HTML surface only        |
| NFR-2  | A fetch failure or unknown employer must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HARRI, name: 'Harri', category: 'ats', isAts: true })
class HarriService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, HTML-only, verified 2026-06-03):

```
GET https://harri.com/{employerSlug}
  → Server-rendered HTML with job listing links

Job link pattern:
  /{employerSlug}/job/{jobId}-{titleSlug}
  e.g. /riverstation-careers/job/2734396-deputy-general-manager

Job detail page:
  GET https://harri.com/{employerSlug}/job/{jobId}-{titleSlug}
  → Server-rendered HTML with Open Graph meta tags (og:title, og:description)
    and a body containing the job description, employment type, and pay info.

Apply URL pattern:
  https://harri.com/{employerSlug}/job/{jobId}-{titleSlug}/apply/{jobId}
```

Observed HTML structure on detail pages:

```html
<meta property="og:title" content="Deputy General Manager">
<meta property="og:description" content="Bristol, UK">
<meta property="og:site_name" content="Riverstation">
```

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown employer (HTTP 404/410), or fetch failed |
| logged warn (HTTP 404/410)  | unknown/dead employer — degrades to empty, never throws |
| logged warn (detail failure) | a single detail-page fetch failed — other jobs still collected |

## 8. Test Plan

- E2E (`__tests__/harri.e2e-spec.ts`): known tenant (`riverstation-careers`)
  returns shaped jobs; no-slug returns empty; unknown employer degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HR-1 — Angular SPA rendering.** Some Harri employer pages may use
  client-side rendering only (Angular Universal off), yielding no job links in
  the static HTML. In that case the listing page returns no links and the
  scraper degrades to empty — no jobs available.
  **Default (proceeding):** deploy HTML scraper; degrade to empty when Angular
  SPA renders client-side only.
- **Q-HR-2 — Meta tag coverage.** Not all detail pages may have Open Graph
  meta tags for location. The heuristic address-extraction fallback handles the
  common US and UK postcode patterns; other formats silently produce null
  location.

## 10. Decisions

- D-1: Use only the public server-rendered HTML — no authenticated API,
  no headless browser. The Angular SPA on Harri employer pages is partially
  server-side rendered (og:title / og:description / job links are present in
  the static HTML on many tenants).
- D-2: Two-phase scrape: (1) parse all job links from the employer listing page,
  (2) fan out to each detail page with a bounded `Promise.allSettled`. Per-page
  failures never abort the batch.
- D-3: `datePosted` is null — the public HTML surface does not expose publish
  dates for individual jobs.
- D-4: Apply URL constructed as `{jobUrl}/apply/{jobId}` based on observed
  URL patterns across multiple tenants.

## 11. References

- `packages/plugins/source-ats-harri/` — implementation.
- `packages/plugins/source-ats-workstream/` — sibling HTML-scraping ATS adapter (pattern).
- `packages/plugins/source-ats-niceboard/` — sibling JSON API adapter (pattern).
- Public Harri employer careers pages (verified HTML structure 2026-06-03).
