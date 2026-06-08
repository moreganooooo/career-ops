# Spec: 303 — Recooty ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 303                                |
| Slug           | source-ats-recooty                 |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

Recooty is an SMB-focused applicant-tracking platform that lets each customer
publish a branded careers page and embed a live "Job Widget" on their own site.
The widget is a client-side bundle that reads the tenant's open roles from a
single public JSON feed; the hosted careers pages live under a shared host
(`https://careerspage.io/{slug}`). Ever Jobs has adapters for many ATS platforms
but **none for Recooty**, so Recooty-hosted careers sites are currently
un-ingestable. A single generic, multi-tenant Recooty adapter unlocks that
catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-recooty` plugin that ingests jobs from
  **any** Recooty-powered careers site given a `companySlug` (the tenant's
  dashboard-issued widget id) or a custom-URL `companyUrl`.
- Use the **public** Job Widget feed (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'recooty'`, `department`,
  `employmentType`).

## 3. Non-Goals

- WAF / CDN bypass via browser TLS fingerprinting. Any tenant whose feed is gated
  behind an aggressive WAF that 403s plain HTTPS is out of scope this iteration
  (graceful empty result).
- Per-job description enrichment beyond what the widget feed returns. The feed
  embeds the full HTML description per role, so no follow-up detail fetch is
  needed; a dedicated enrichment endpoint is not modelled.
- Server-side keyword/location filtering. The feed returns the tenant's full
  open-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream.
- A curated seed list of Recooty tenant widget ids (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Recooty plugin at a tenant
> widget id, so that I ingest that employer's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Recooty adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant widget id from `companySlug`, or from `companyUrl` (the `/widget/{id}` segment, the trailing path segment, or first sub-domain label). | must     |
| FR-2  | Fetch positions from the public `GET /api/widget/{widgetId}` endpoint.                       | must     |
| FR-3  | Treat the single envelope's `team.jobPosts` array as the full open-roles list; slice client-side to `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id (numeric job id) within a single run.                       | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead widget ids (feed returns HTTP 422) and fetch failures without throwing (partial/empty results OK). | must     |

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
@SourcePlugin({ site: Site.RECOOTY, name: 'Recooty', category: 'ats', isAts: true })
class RecootyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://standaloneapi.recooty.app/api/widget/{widgetId}?language=en
  → { career_page_url, team: { ..., jobPosts[] }, translation }   (one envelope, no pagination)
```

Verified envelope + per-job wire shape (`snake_case`):

```jsonc
{
  "career_page_url": "https://careerspage.io/",       // hosted careers-page base
  "team": {
    "id": 1518,
    "name": "XYZ",                                      // tenant display name → companyName
    "slug": "xyz",                                      // careers-page path segment
    "jobPosts": [
      {
        "id": 141,                                      // → atsId
        "title": "Business Development Executive",      // → title
        "slug": "business-development-executive-re141", // → job-detail URL segment
        "description": "<p>...</p>",                    // HTML → description (format-converted)
        "city": "Indore",                               // → LocationDto.city
        "state": "MP",                                  // → LocationDto.state
        "location_type": "ON_SITE",                     // REMOTE → isRemote
        "employment_type": "FULL_TIME",                 // → employmentType
        "department": "Sales",                          // → department
        "published_at": "2025-06-09T09:16:10.000000Z"   // ISO → datePosted (YYYY-MM-DD)
      }
    ]
  }
}
```

Tenant resolution: the tenant is addressed **only** by the `{widgetId}` path
segment — a 32-char hex token issued from the Recooty dashboard (Settings → Job
Widget) that doubles as the tenant's public read API key. There is no per-tenant
sub-domain on the API host. The public job-detail page URL is
`{career_page_url}{team.slug}/{job.slug}` and the apply URL is that plus
`/apply`.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown widget id (feed HTTP 422), or fetch failed |
| logged warn (HTTP 422/400/404) | unknown/dead widget id — degrades to empty, never throws |

## 8. Test Plan

- E2E (`__tests__/recooty.e2e-spec.ts`): known widget id returns shaped jobs;
  no-slug returns empty; unknown widget id degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RC-1 — WAF fallback.** A small minority of Recooty tenants may sit behind a
  CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would recover them
  but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; degrade to empty on 4xx.
- **Q-RC-2 — Location granularity.** The feed splits location into free-text
  `city`/`state` (country rarely present); we map them straight through and do
  not attempt structured geocoding.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `GET /api/widget/{widgetId}`
  feed — verified to return the tenant's full open-roles envelope without auth.
  An invalid widget id returns HTTP 422 `{"error":true,"message":"Invalid API
  Key."}`, handled as empty.
- D-2: Tenant is resolved from `companySlug` (the widget id), or from `companyUrl`
  by extracting the `/widget/{id}` segment (falling back to the trailing path
  segment, then the first sub-domain label).
- D-3: The feed has no pagination envelope; the full `team.jobPosts` array is
  returned in one call, so we fetch once and slice client-side to
  `resultsWanted`. De-dup by numeric job id guards against duplicate ids.
- D-4: `team.name` is used as the company name (falling back to `team.slug`, then
  the widget id). The job-detail/apply URLs are built from `career_page_url` +
  `team.slug` + `job.slug`.

## 11. References

- `packages/plugins/source-ats-recooty/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling single-call ATS adapter (pattern).
- Public Recooty Job Widget feed (verified 2026-06-03).
