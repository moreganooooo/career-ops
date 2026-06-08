# Spec: 298 — Dayforce HCM ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 298                                |
| Slug           | source-ats-dayforce                |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 006, 013, 296 (ATS parity batches) |

## 1. Problem Statement

Ceridian **Dayforce HCM** is a major HR-suite vendor whose recruiting module
powers the public candidate career portals of many mid-to-large enterprises
(news/media groups, retail, healthcare, manufacturing, and more). Ever Jobs has
adapters for ~45 ATS platforms but **none for Dayforce**, so every
Dayforce-hosted enterprise career site is currently un-ingestable except via
brittle company-specific scrapers. A single generic, multi-tenant Dayforce
adapter unlocks a large catalogue of enterprise roles with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-dayforce` plugin that ingests jobs
  from **any** Dayforce-powered candidate portal given a `companySlug` /
  `siteNumber` (the Dayforce "client namespace") or a custom `companyUrl`.
- Use the **public** geo job-posting search feed (no auth) so no credentials are
  required.
- Map every posting into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'dayforce'`, `department`).
- Paginate efficiently with bounded concurrent page fan-out.

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Tenants behind an
  aggressive WAF that 403s plain HTTPS are out of scope for this iteration
  (tracked as a follow-up).
- Per-posting detail enrichment. The geo search feed already returns full HTML
  descriptions; a separate `Posting/View/{id}` detail fetch for tenants that omit
  descriptions in the feed is deferred to a later iteration.
- The legacy XML/RESTful "job posting feed" service (`includeActivePostingOnly`,
  date-range filters) — we model its PascalCase fields defensively but target the
  modern geo search JSON feed as the primary surface.
- A curated seed list of Dayforce tenant namespaces (handled separately by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Dayforce plugin at a tenant
> namespace, so that I ingest that enterprise's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Dayforce adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant "client namespace" from `companySlug` / `siteNumber`, or parse it from `companyUrl`. | must     |
| FR-2  | Fetch postings via `POST https://jobs.dayforcehcm.com/api/geo/{client}/jobposting/search` with `{clientNamespace, jobBoardCode, cultureCode, distanceUnit, paginationStart}`. | must     |
| FR-3  | Read total `maxCount` from the first page and paginate (server-fixed page size = 25 via `paginationStart`) until `resultsWanted`. | must     |
| FR-4  | De-duplicate postings by ATS id within a single run.                                         | must     |
| FR-5  | Map each posting to `JobPostDto` (title, url, location, department, remote, datePosted, description). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants and per-page failures without throwing (partial results OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | Remaining pages fetched concurrently         | ≤ 6 concurrent requests/tenant  |
| NFR-2  | A single failed page must not fail the batch | `Promise.allSettled` fan-out    |
| NFR-3  | No credentials / secrets required            | public endpoint only            |
| NFR-4  | Polite pacing between pagination rounds       | 300–600 ms jittered delay       |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DAYFORCE, name: 'Dayforce', category: 'ats', isAts: true })
class DayforceService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public geo search feed):

```
POST https://jobs.dayforcehcm.com/api/geo/{client}/jobposting/search
  body → { clientNamespace, jobBoardCode: "CANDIDATEPORTAL", cultureCode: "en-US", distanceUnit: 1, paginationStart: <n> }
  → { jobPostings: DayforceJobPosting[], maxCount: number, count: number }
```

Job detail (legacy candidate portal, synthesized when the feed omits a URL):

```
https://{client}.dayforcehcm.com/CandidatePortal/{cultureCode}/{client}/Posting/View/{id}
```

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, dead tenant, or all pages failed        |
| logged warn per failed page | a single page 4xx/5xx/transient — batch continues    |

## 8. Test Plan

- E2E (`__tests__/dayforce.e2e-spec.ts`): known tenant returns shaped jobs;
  no-slug returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (registered centrally by the
  orchestrator).

## 9. Open Questions

- **Q-DF-1 — WAF fallback.** Some tenants sit behind a WAF that 403s plain HTTPS.
  A browser-fingerprint fallback would recover them but adds a heavyweight
  optional dependency. **Default (proceeding):** ship public-endpoint-only;
  record WAF tenants for a follow-up spec.
- **Q-DF-2 — Description-less feeds.** A small number of tenants serve listing
  rows without `jobDescription`. Per-posting `Posting/View/{id}` enrichment is
  deferred (non-goal); descriptions remain `null` for those rows.

## 10. Decisions

- D-1: Primary endpoint is the public geo search feed
  `POST /api/geo/{client}/jobposting/search` on the shared host
  `jobs.dayforcehcm.com` (reachable cross-tenant without auth, returns full HTML
  descriptions and a true total count). The documented RESTful feed's PascalCase
  fields are modelled defensively for tenants/responses that use that casing.
- D-2: The "client namespace" is taken from `companySlug`, else `siteNumber`,
  else parsed from `companyUrl` (subdomain of `{client}.dayforcehcm.com`, or the
  path segment after the locale on the shared host, or after `CandidatePortal`).
- D-3: `jobBoardCode` defaults to `CANDIDATEPORTAL`; `cultureCode` to `en-US`.
- D-4: Page size is server-fixed at 25; pagination is via `paginationStart`.
- D-5: Job detail URL prefers the feed's `JobDetailsUrl`; otherwise synthesized as
  the legacy `CandidatePortal/.../Posting/View/{id}` view.

## 11. References

- `packages/plugins/source-ats-dayforce/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern).
- Dayforce RESTful Web Services Developer Guide — Get Job Postings.
- Public Dayforce geo job-posting search feed (`/api/geo/{client}/jobposting/search`).
