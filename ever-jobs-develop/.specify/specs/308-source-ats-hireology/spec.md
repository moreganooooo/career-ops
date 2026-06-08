# Spec: 308 — Hireology ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 308                                |
| Slug           | source-ats-hireology               |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

Hireology is a Chicago-based applicant-tracking and talent-management platform
that hosts the public careers sites of thousands of small-and-mid-market
employers, concentrated in the automotive, healthcare, and multi-location
services verticals. Every tenant's career page is served from one shared host
(`https://careers.hireology.com/{slug}`). Ever Jobs has adapters for many ATS
platforms but **none for Hireology**, so Hireology-hosted career sites are
currently un-ingestable. A single generic, multi-tenant Hireology adapter
unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hireology` plugin that ingests jobs
  from **any** Hireology-powered careers site given a `companySlug` (the
  tenant's Hireology careers path) or a custom-domain `companyUrl`.
- Use the **public** jobs feed (anonymous bearer token, no login) so no
  credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'hireology'`, `department`).

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose feed
  is gated behind an aggressive WAF that 403s plain HTTPS is out of scope this
  iteration (graceful empty result).
- Per-job description enrichment beyond what the listing feed returns. The feed
  already embeds the full HTML `job_description` per role, so no follow-up
  detail fetch is needed.
- Server-side keyword/location filtering. The feed supports `department`,
  `location`, and `job_family` filters, but we ingest the tenant's full
  open-roles list and slice client-side to `resultsWanted`.
- A curated seed list of Hireology tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Hireology plugin at a
> tenant slug, so that I ingest that employer's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Hireology adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug`, or from `companyUrl` (the first careers path segment, else the first sub-domain label). | must     |
| FR-2  | Acquire the anonymous public bearer token by fetching the careers shell and scraping `startingData.apiToken`. | must     |
| FR-3  | Fetch positions from the public `GET /v2/public/careers/{slug}` endpoint with the bearer token; page via `page`/`page_size` using the envelope `count`. | must     |
| FR-4  | De-duplicate positions by ATS id (job id) within a single run.                               | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, employmentType, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (HTTP 404 / no bootstrap token) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public endpoint + public token  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |
| NFR-5  | Page fan-out resilient                       | bounded concurrency + `Promise.allSettled` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HIREOLOGY, name: 'Hireology', category: 'ats', isAts: true })
class HireologyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://careers.hireology.com/{slug}
  → HTML shell; inline `window.startingData.apiToken` = anonymous public JWT

GET https://api.hireology.com/v2/public/careers/{slug}?page={n}&page_size={k}
  header: Authorization: Bearer {apiToken}
  → { data: HireologyJob[], count, page, page_size }
```

The bearer token is **not** a private credential: it is minted unauthenticated
into every careers page load and only authorizes the read-only public feed.

Verified wire shape (per-job, snake_case):

```jsonc
{
  "id": 2754565,                                   // → atsId, job-detail URL segment
  "name": "Major Account Executive",               // → title
  "job_description": "<p>...</p>",                  // HTML → description (format-converted)
  "created_at": "2026-05-08T18:32:10.808Z",         // ISO → datePosted (YYYY-MM-DD)
  "status": "Open",                                 // posting status
  "employment_status": "Full Time - ...",           // → employmentType
  "remote": false,                                  // → isRemote
  "locations": [{ "city": "Chicago", "state": "IL", "zip_code": "60602" }], // → LocationDto
  "organization": { "id": 313, "name": "Hireology", "type": "Company" },     // → companyName
  "job_family": { "id": 9, "name": "General" },     // name → department
  "career_site_url": "https://careers.hireology.com/{slug}/{id}/description", // → jobUrl
  "application_path": "/careers/{id}/application"   // → applyUrl
}
```

Slug resolution: the tenant is the first path segment of the careers URL
(`careers.hireology.com/{slug}`); all tenants share the host. The public
job-detail page URL is `https://careers.hireology.com/{slug}/{id}/description`.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (HTTP 404 / no token), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |
| logged warn (page failed)   | one fan-out page failed — other pages still merged   |

## 8. Test Plan

- E2E (`__tests__/hireology.e2e-spec.ts`): known tenant (`hireology2`) returns
  shaped jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HR-1 — WAF fallback.** A small minority of Hireology tenants may sit
  behind a CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would
  recover them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; degrade to empty on 4xx.
- **Q-HR-2 — Token lifetime.** The bootstrap token is short-lived (≈1 day). We
  re-scrape a fresh token at the start of every scrape, so expiry is a non-issue
  for a single run; token caching across runs is deferred.

## 10. Decisions

- D-1: Primary endpoint is the public `GET /v2/public/careers/{slug}` feed with
  an anonymous `Authorization: Bearer {token}` header — verified to return the
  tenant's open-roles array without auth. The token is scraped from the careers
  page's inline `window.startingData.apiToken`.
- D-2: Tenant is resolved from `companySlug`, or from `companyUrl` by taking the
  first careers path segment (falling back to the first sub-domain label).
- D-3: The feed is paginated (`{ data, count, page, page_size }`); the first
  page yields the true `count`, and remaining pages are fanned out with bounded
  concurrency and merged via `Promise.allSettled`. De-dup by job id guards
  against duplicates across page boundaries.
- D-4: `organization.name` is used as the company name when present, else the
  slug-derived name; `job_family.name` is the department label.

## 11. References

- `packages/plugins/source-ats-hireology/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling paginated career-site adapter (pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling single-feed adapter (pattern).
- Public Hireology careers jobs feed (verified 2026-06-03).
