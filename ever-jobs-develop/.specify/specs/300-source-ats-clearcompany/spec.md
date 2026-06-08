# Spec: 300 — ClearCompany ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 300                                |
| Slug           | source-ats-clearcompany            |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 006, 013 (ATS parity batches) |

## 1. Problem Statement

ClearCompany is a Boston-based applicant-tracking and talent-management platform
that hosts the public careers sites of hundreds of small-and-mid-market employers.
Every tenant's career page is served from one shared host
(`https://careers-page.clearcompany.com/jobs/{slug}`). Ever Jobs has adapters for
many ATS platforms but **none for ClearCompany**, so ClearCompany-hosted career
sites are currently un-ingestable. A single generic, multi-tenant ClearCompany
adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-clearcompany` plugin that ingests jobs
  from **any** ClearCompany-powered careers site given a `companySlug` (the
  tenant's ClearCompany careers slug) or a custom-domain `companyUrl`.
- Use the **public** jobs feed (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'clearcompany'`, `department`).

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose feed
  is gated behind an aggressive WAF that 403s plain HTTPS is out of scope this
  iteration (graceful empty result).
- Per-job description enrichment beyond what the listing feed returns. The feed
  already embeds the full HTML `Description` per role, so no follow-up detail
  fetch is needed; a dedicated enrichment endpoint is not modelled.
- Server-side keyword/location filtering. The feed returns the tenant's full
  open-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream.
- A curated seed list of ClearCompany tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ClearCompany plugin at a
> tenant slug, so that I ingest that employer's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the ClearCompany adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug`, or from `companyUrl` (the `/jobs/{slug}` path segment or first sub-domain label). | must     |
| FR-2  | Fetch positions from the public `GET /api/v1/careers/jobs` endpoint, passing the slug via the `API-ShortName` header. | must     |
| FR-3  | Treat the single-response array as the full open-roles list; slice client-side to `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id (job GUID) within a single run.                             | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (feed returns HTTP 400) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public endpoint only            |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CLEARCOMPANY, name: 'ClearCompany', category: 'ats', isAts: true })
class ClearCompanyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://careers-page.clearcompany.com/api/v1/careers/jobs
  header: API-ShortName: {slug}
  → ClearCompanyJob[]   (flat JSON array, no pagination envelope)
```

Verified wire shape (per-job, PascalCase):

```jsonc
{
  "Id": "13fbd09a-f201-0250-6e6b-9fbdf85cf837",   // GUID → atsId, job-detail URL segment
  "OrganizationName": "ClearCompany-1132",         // tenant display name (numeric suffix stripped)
  "DepartmentName": "Sales",                        // → department
  "OfficeName": "Copley Square, Boston",            // free-text → LocationDto
  "PositionTitle": "Account Executive",             // → title
  "Description": "<p>...</p>",                       // HTML → description (format-converted)
  "OpenDate": "2013-08-10T04:00:00Z",               // ISO → datePosted (YYYY-MM-DD)
  "ApplyUrl": "https://clearcompany.clearcompany.com/careers/jobs/{id}/apply" // → applyUrl
}
```

Host resolution: the tenant is identified **only** by the `API-ShortName` header
(the careers slug). All tenants share the host `careers-page.clearcompany.com`;
there is no per-tenant sub-domain for the feed. The public job-detail page URL
is `https://careers-page.clearcompany.com/jobs/{slug}/{id}`.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (feed HTTP 400), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |

## 8. Test Plan

- E2E (`__tests__/clearcompany.e2e-spec.ts`): known tenant (`clearcompany`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-CC-1 — WAF fallback.** A small minority of ClearCompany tenants may sit
  behind a CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would
  recover them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; degrade to empty on 4xx.
- **Q-CC-2 — Location granularity.** `OfficeName` is free text
  ("Copley Square, Boston"); we heuristically split on commas into
  city/state/country. Structured `OfficeId` → office lookup is deferred.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `GET /api/v1/careers/jobs`
  feed with the `API-ShortName: {slug}` header — verified to return the tenant's
  full open-roles array without auth. The `/api/v1/careers/jobs/search` route
  exists but requires an undocumented validated query model (returns HTTP 400);
  it is not used.
- D-2: Tenant is resolved from `companySlug`, or from `companyUrl` by extracting
  the `/jobs/{slug}` path segment (falling back to the first sub-domain label).
- D-3: The feed has no pagination envelope; the full array is returned in one
  call, so we fetch once and slice client-side to `resultsWanted` (no fan-out
  needed). De-dup by job GUID guards against duplicate ids within the payload.
- D-4: `OrganizationName` numeric suffixes (e.g. "ClearCompany-1132") are
  stripped; if absent we fall back to the slug-derived company name.

## 11. References

- `packages/plugins/source-ats-clearcompany/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern).
- Public ClearCompany careers jobs feed (verified 2026-06-03).
