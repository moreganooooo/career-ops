# Spec: 305 — VivaHR ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 305                                |
| Slug           | source-ats-vivahr                  |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

VivaHR is a small-and-mid-market applicant-tracking and recruiting platform that
hosts the public careers sites of thousands of employers. Every tenant's careers
page is served from one shared careers host
(`https://jobs.avahr.com/{tenant}/jobs`, where `{tenant}` is an `{id}-{slug}`
token such as `236-avahr`). Ever Jobs has adapters for many ATS platforms but
**none for VivaHR**, so VivaHR-hosted careers sites are currently un-ingestable.
A single generic, multi-tenant VivaHR adapter unlocks that catalogue with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-vivahr` plugin that ingests jobs from
  **any** VivaHR-powered careers site given a `companySlug` (the tenant's
  `{id}-{slug}` careers token) or a custom-domain `companyUrl`.
- Use the **public** careers pages (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'vivahr'`, `employmentType`).

## 3. Non-Goals

- Use of the authenticated developer API (`developer.vivahr.com`), which
  requires a per-tenant API key. No anonymous JSON API exists, so this plugin
  intentionally scrapes the public HTML + embedded JSON-LD instead.
- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose pages
  are gated behind an aggressive WAF that 403s plain HTTPS is out of scope this
  iteration (graceful empty result).
- Server-side keyword/location filtering. The listing page returns the tenant's
  full open-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream.
- A curated seed list of VivaHR tenant tokens (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the VivaHR plugin at a tenant
> token, so that I ingest that employer's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the VivaHR adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant token from `companySlug`, or from `companyUrl` (the first `{id}-{slug}` path segment, else first sub-domain label). | must     |
| FR-2  | Fetch the public listing page `GET /{tenant}/jobs` and enumerate each role's detail-page URL. | must     |
| FR-3  | Fetch each role's detail page and parse the embedded schema.org `JobPosting` JSON-LD; slice client-side to `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id (`identifier.value`) within a single run.                   | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (HTTP 404 / redirect to marketing) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public pages only               |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size + bounded fan-out      | slice to `resultsWanted`; concurrency cap |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.VIVAHR, name: 'VivaHR', category: 'ats', isAts: true })
class VivaHRService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://jobs.avahr.com/{tenant}/jobs
  → HTML listing; anchors link to each role detail page:
    https://jobs.avahr.com/{tenant}/{jobId}-{jobSlug}/

GET https://jobs.avahr.com/{tenant}/{jobId}-{jobSlug}/
  → HTML detail page with a <script type="application/ld+json"> JobPosting block
```

Verified wire shape (per-job, schema.org `JobPosting` JSON-LD):

```jsonc
{
  "@type": "JobPosting",
  "url": "https://jobs.avahr.com/236-avahr/79122-sales-development-representative-inbound/", // → jobUrl
  "title": "Sales Development Representative (Inbound)",   // → title
  "description": "<p>...</p>",                              // HTML → description (format-converted)
  "datePosted": "2026-03-27",                              // ISO → datePosted (YYYY-MM-DD)
  "employmentType": "FULL_TIME",                           // → employmentType
  "industry": "Information Technology & Services",          // → department
  "identifier": { "@type": "PropertyValue", "name": "AvaHR", "value": "79122" }, // value → atsId
  "hiringOrganization": { "name": "AvaHR", "sameAs": "https://avahr.com", "logo": "..." }, // → companyName/Url/Logo
  "baseSalary": { "currency": "USD", "value": { "minValue": "60000", "maxValue": "95000", "unitText": "YEAR" } },
  "jobLocationType": "TELECOMMUTE",                        // → isRemote
  "jobLocation": { "address": { "addressLocality": "Gilbert", "addressRegion": "Arizona", "addressCountry": "US" } } // → LocationDto
}
```

Tenant resolution: tenants share the careers host `jobs.avahr.com`; each is
identified by the first path segment `{id}-{slug}` (e.g. `236-avahr`). The
public job-detail page URL is `https://jobs.avahr.com/{tenant}/{jobId}-{jobSlug}/`.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (HTTP 404 / redirect), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |
| logged warn (per-detail)    | a single detail-page fetch/parse failure is skipped; the rest are kept |

## 8. Test Plan

- E2E (`__tests__/vivahr.e2e-spec.ts`): known tenant (`236-avahr`) returns shaped
  jobs; no-slug returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-VH-1 — WAF fallback.** A minority of VivaHR tenants may sit behind a
  CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would recover
  them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-page-only; degrade to empty on 4xx.
- **Q-VH-2 — Pagination.** The listing page observed returns the tenant's full
  open-roles set in one HTML response; no paging control was found. If very large
  tenants paginate, a `?page=` follow-up can be added without changing the DTO
  contract.

## 10. Decisions

- D-1: The public surface is server-rendered HTML; there is no anonymous JSON
  API (the developer API needs a key). We fetch the listing page to enumerate
  role URLs, then parse the schema.org `JobPosting` JSON-LD embedded in each
  detail page — verified to expose title, description, dates, employment type,
  location, salary, and a stable `identifier.value` id without auth.
- D-2: Tenant is resolved from `companySlug`, or from `companyUrl` by extracting
  the first `{id}-{slug}` path segment (falling back to the first sub-domain
  label).
- D-3: Detail-page fetches are fanned out with a bounded concurrency
  (`VIVAHR_MAX_CONCURRENCY`) via `Promise.allSettled`, so a single failed detail
  page never aborts the run. De-dup by `identifier.value` guards against repeats.
- D-4: `isRemote` is taken from `jobLocationType === "TELECOMMUTE"` (with a title
  keyword fallback); `department` maps from the `industry` label.

## 11. References

- `packages/plugins/source-ats-vivahr/` — implementation.
- `packages/plugins/source-ats-clearcompany/` — sibling shared-host ATS adapter (pattern).
- `packages/plugins/source-ats-eightfold/` — sibling adapter (bounded fan-out pattern).
- Public VivaHR careers pages + embedded JSON-LD (verified 2026-06-03).
