# Spec: 304 — Polymer ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 304                                |
| Slug           | source-ats-polymer                 |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

Polymer is a modern applicant-tracking and careers-page platform that hosts the
public job boards of many small-and-mid-market employers. Every tenant's open
roles are exposed through one shared, documented **Public API**
(`https://api.polymer.co/v1/hire/organizations/{slug}/jobs`), addressed by an
organization slug. Ever Jobs has adapters for many ATS platforms but **none for
Polymer**, so Polymer-hosted career sites are currently un-ingestable. A single
generic, multi-tenant Polymer adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-polymer` plugin that ingests jobs from
  **any** Polymer-powered careers site given a `companySlug` (the tenant's
  Polymer organization slug) or a `companyUrl`.
- Use the **public** jobs API (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'polymer'`, `department`,
  `employmentType`).

## 3. Non-Goals

- The authenticated **Customer API** (candidates, applications, bulk exports). We
  use only the unauthenticated Public API job feeds.
- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant gated behind
  an aggressive WAF that 403s plain HTTPS is out of scope this iteration
  (graceful empty result).
- Server-side keyword/location filtering. The feed returns the tenant's full
  open-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream.
- A curated seed list of Polymer tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Polymer plugin at a tenant
> slug, so that I ingest that employer's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Polymer adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug`, or from `companyUrl` (the `/organizations/{slug}` or `jobs.polymer.co/{slug}` path segment, else the first sub-domain label). | must     |
| FR-2  | Fetch positions from the public `GET /v1/hire/organizations/{slug}/jobs` endpoint, paginating via `meta.is_last` / `meta.next_page`. | must     |
| FR-3  | Hydrate each role's HTML `description` + `department` from the per-job detail endpoint (`GET .../jobs/{id}`) with a bounded concurrent fan-out. | must     |
| FR-4  | De-duplicate positions by ATS id (numeric `id`, else `hash_id`) within a single run.         | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (empty `items` or HTTP 400/404) and fetch failures without throwing (partial/empty results OK). | must     |
| FR-9  | Honour `resultsWanted` (default 100 internally); slice the result-set client-side.            | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public endpoint only            |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size + page count           | slice to `resultsWanted`, page ceiling |
| NFR-5  | Detail fan-out is bounded + politely paced   | `Promise.allSettled`, max concurrency 5 |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.POLYMER, name: 'Polymer', category: 'ats', isAts: true })
class PolymerService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://api.polymer.co/v1/hire/organizations/{slug}/jobs?page={n}&per_page=50
  → { items: PolymerJob[], meta: { total, count, page, is_first, is_last, next_page, organization_name } }

GET https://api.polymer.co/v1/hire/organizations/{slug}/jobs/{id}
  → PolymerJobDetail   (list row + `description` (HTML) + `department`)
```

Verified list-row wire shape (snake_case):

```jsonc
{
  "id": 15394,                                       // numeric → atsId
  "hash_id": "wUShs3ITY0br",                          // URL-safe key (fallback id)
  "title": "Senior Web Designer",                     // → title
  "city": "Charlotte",                                // ┐
  "state_region": "NC",                               // ├ → LocationDto
  "country": "US",                                    // ┘
  "display_location": "Charlotte, NC",                // formatted location label
  "remoteness_pretty": "Remote",                      // → isRemote heuristic
  "kind_pretty": "Full-time",                         // → employmentType
  "job_post_url": "https://jobs.polymer.co/{slug}/{id}", // → jobUrl / applyUrl
  "organization_name": "Aperture Labs",               // → companyName
  "job_category_name": "Design & User Experience",    // category
  "published_at": "2020-09-13T14:33:11.225Z",         // ISO → datePosted (YYYY-MM-DD)
  "published_at_timestamp": 1600007591                // epoch-sec mirror
}
```

The per-job detail document adds `description` (HTML string) and `department`
(string or `null`).

Host resolution: every tenant is addressed by the organization slug in the path
under the shared host `api.polymer.co`. The public job-detail page URL is
`https://jobs.polymer.co/{slug}/{id}` (also echoed per-row as `job_post_url`).

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (empty items / HTTP 400/404), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |
| logged warn (detail fail)   | per-job detail fetch failed — job kept with null description |

## 8. Test Plan

- E2E (`__tests__/polymer.e2e-spec.ts`): known tenant (`teton`) returns shaped
  jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PM-1 — WAF fallback.** A small minority of tenants may sit behind a CDN/WAF
  that 403s plain HTTPS. A browser-fingerprint fallback would recover them but
  adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only; degrade to empty on 4xx.
- **Q-PM-2 — Detail fan-out cost.** Descriptions live only on the per-job detail
  endpoint, so ingesting N roles costs N+pages requests. Bounded concurrency
  (5) plus a `resultsWanted` cap keeps this proportionate; a future list-only
  fast path (no description) is deferred.

## 10. Decisions

- D-1: Primary endpoints are the public list feed
  (`GET /v1/hire/organizations/{slug}/jobs`) and the per-job detail endpoint
  (`GET .../jobs/{id}`) — both verified to return tenant data without auth.
- D-2: Tenant is resolved from `companySlug`, or from `companyUrl` by extracting
  the `/organizations/{slug}` or `jobs.polymer.co/{slug}` path segment (falling
  back to the first sub-domain label).
- D-3: The list feed paginates (`per_page` rows per page); we walk pages via
  `meta.is_last` / `meta.next_page` up to a page ceiling derived from
  `resultsWanted`, then slice client-side. De-dup by ATS id guards against
  duplicate rows across pages.
- D-4: List rows carry no body, so descriptions + department are hydrated from
  the detail endpoint with a bounded `Promise.allSettled` fan-out; a failed
  detail fetch keeps the role with a null description rather than dropping it.
- D-5: ATS id is the numeric `id` when present, else the URL-safe `hash_id`.

## 11. References

- `packages/plugins/source-ats-polymer/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling paginated career-site adapter (pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling single-feed ATS adapter (pattern).
- Polymer Public API docs + live feeds (verified 2026-06-03).
