# Spec: 301 — Niceboard ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 301                                |
| Slug           | source-ats-niceboard               |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

Niceboard is a hosted job-board platform used by communities, associations and
staffing firms to run their own branded job boards. Every tenant board is
served from its own sub-domain under the shared apex `niceboard.co`
(e.g. `https://avajobboard.niceboard.co`), with some fronted by a custom domain.
Ever Jobs has adapters for many ATS and career-site platforms but **none for
Niceboard**, so Niceboard-hosted boards are currently un-ingestable. A single
generic, multi-tenant Niceboard adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-niceboard` plugin that ingests jobs
  from **any** Niceboard-powered board given a `companySlug` (the board's
  sub-domain label) or a custom-domain `companyUrl`.
- Use the **public** board search feed (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'niceboard'`, `department`).

## 3. Non-Goals

- The credentialed private API (`/api/v1/jobs?key=…`). It requires a per-board
  secret key (HTTP 401 `invalid_key` without it) and is explicitly not used.
- WAF / Cloudflare bypass via browser TLS fingerprinting. Any board whose feed
  is gated behind an aggressive WAF that 403s plain HTTPS is out of scope this
  iteration (graceful empty result).
- Per-job description enrichment beyond what the listing feed returns. The feed
  already embeds the full HTML `description_html` per role, so no follow-up
  detail fetch is needed.
- Server-side keyword/location filtering. We pass the board the unfiltered
  base query and slice client-side to `resultsWanted`; we do not push
  `searchTerm`/`location` upstream.
- A curated seed list of Niceboard tenant boards (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Niceboard plugin at a
> board sub-domain, so that I ingest that board's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Niceboard adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a board sub-domain from `companySlug`, or from `companyUrl` (first sub-domain label). | must     |
| FR-2  | Fetch positions from the public `GET /api/jobs` endpoint on the board sub-domain, sending the full required base-filter param set. | must     |
| FR-3  | Page via `limit` + `page`; the first response's `count` is the tenant total. Fan out remaining pages with a bounded `Promise.allSettled`. | must     |
| FR-4  | De-duplicate positions by ATS id (job id) within a single run.                               | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead boards (feed returns HTTP 400/404) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public endpoint only            |
| NFR-2  | A fetch failure or unknown board must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.NICEBOARD, name: 'Niceboard', category: 'ats', isAts: true })
class NiceboardService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://{board}.niceboard.co/api/jobs
  ?keyword=&company=all&sortby=newest
  &jobtype=[]&category=[]&secondary_category=[]
  &city=[]&state=[]&country=[]&tags=[]&custom_fields={}
  &remote_ok=false&remote_only=false
  &salary_timeframe=&salary_min=&salary_max=
  &limit={n}&page={p}
  → { jobs: NiceboardJob[], count: number, ... facet aggregations }
```

Verified wire shape (per-job, `snake_case`):

```jsonc
{
  "id": 2361466,                                  // numeric → atsId, job-detail URL segment
  "uid": "cxkM4L9pMh",                            // short public id
  "title": "Talent & Brand Coordinator",          // → title
  "slug": "talent-and-brand-coordinator",         // → job-detail URL segment
  "description_html": "<p>...</p>",                // HTML → description (format-converted)
  "is_remote": true, "remote_only": true,          // → isRemote
  "apply_url": null, "apply_email": "x@y.com",     // → applyUrl (mailto: fallback)
  "published_at": "2026-05-27T16:06:28.248Z",      // ISO → datePosted (YYYY-MM-DD)
  "location": { "city_long": "Denver", "state_long": "Colorado", "country_long": "United States" },
  "company_name": "Tomlinson Management Group",    // → companyName
  "company_slug": "tomlinson-management-group",     // → job-detail URL segment
  "anonymity_enabled": false,                       // hides company slug in URL when true
  "category": { "name": "Full Time" },              // → department
  "jobtype": { "name": "Full time" }
}
```

Board resolution: the tenant is identified by the board sub-domain label (from
`companySlug`, or the first sub-domain label of `companyUrl`). The host is
`https://{board}.niceboard.co`. The public job-detail page URL is
`/job/{id}-{slug}-{companySlug}` (or `/job/{id}-{slug}` when anonymity is on).

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown board (feed HTTP 400/404), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead board — degrades to empty, never throws |
| logged warn (page failure)  | a single page fetch failed — other pages still merge |

## 8. Test Plan

- E2E (`__tests__/niceboard.e2e-spec.ts`): known tenant (`avajobboard`)
  returns shaped jobs; no-slug returns empty; unknown board degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-NB-1 — WAF fallback.** A minority of Niceboard boards may sit behind a
  CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would recover
  them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; degrade to empty on 4xx.
- **Q-NB-2 — Location granularity.** When the structured `location` object is
  absent we fall back to splitting the free-text `location_name` on commas into
  city/state/country.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `GET /api/jobs` board search
  feed — the same call the board's own front-end SPA makes — verified to return
  the tenant's jobs without auth. The private `/api/v1/jobs?key=…` route needs a
  per-board secret (HTTP 401 `invalid_key`) and is not used.
- D-2: The feed rejects an incomplete query with `{"success":false,"error":"validation"}`;
  array filters must be JSON-encoded (`[]`) and `custom_fields` as `{}`. A fixed
  base-param set is always sent.
- D-3: The feed paginates via `limit` + `page` and reports the tenant total as
  `count` on every page; the first page seeds the total and remaining pages are
  fanned out with a bounded `Promise.allSettled`. De-dup by job id guards
  against duplicate ids across pages.
- D-4: `company_name` (flattened) is preferred for `companyName`, falling back
  to the embedded `company.name` then the board-derived name.

## 11. References

- `packages/plugins/source-ats-niceboard/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling paginated career-site adapter (pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling single-host ATS adapter (pattern).
- Public Niceboard board search feed (verified live 2026-06-03).
