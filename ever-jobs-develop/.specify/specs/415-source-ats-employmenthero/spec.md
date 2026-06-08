# Spec: 415 — Employment Hero ATS Source Adapter

| Field          | Value                                      |
| -------------- | ------------------------------------------ |
| Spec ID        | 415                                        |
| Slug           | source-ats-employmenthero                  |
| Status         | done                                       |
| Owner          | scheduled agent (ever-jobs)                |
| Created        | 2026-06-04                                 |
| Last updated   | 2026-06-04                                 |
| Supersedes     | (none)                                     |
| Related specs  | 410, 411, 412, 413, 414                    |

## 1. Problem Statement

Employment Hero is an AU / NZ / SEA / UK all-in-one HR, payroll & recruitment platform whose
recruitment arm powers branded, candidate-facing career pages and embeddable job widgets for a
large multi-tenant base of employers. Each tenant publishes a public, anonymous job board on the
shared Employment Hero jobs host, addressed by a per-tenant organisation friendly id. Ever Jobs
has no adapter for this surface today, so roles posted through Employment Hero are invisible to
the aggregation pipeline. We want a generic, multi-tenant source adapter that ingests any
Employment Hero tenant's open roles from its public board without authentication.

Adoption rationale:

- **Market share / footprint.** Employment Hero serves 300,000+ businesses and 2M+ employees /
  jobseekers across AU, NZ, SEA and the UK; its recruitment product powers a large, growing set
  of public branded career pages — a meaningful, under-covered segment of the AU / APAC / UK job
  market.
- **Public surface stability.** Every tenant board is served from one shared, versioned public
  endpoint (`/ats/api/v1/career_page/organisations/{slug}/jobs`). A single, well-typed, anonymous
  JSON feed (versioned `v1`) is far more stable than per-tenant DOM scraping, and the slug-based
  addressing is uniform across all tenants.
- **Data quality.** The feed returns rich structured fields per role — stable UUID id, title,
  friendly id (→ canonical detail URL), HTML description, ISO country code, free-text location
  line, structured remote flags (`remote`, `workplace_type`, `remote_setting`), team name,
  employment type / term, experience level, salary fields, and an ISO creation timestamp — which
  map cleanly onto `JobPostDto` with first-class pagination meta (`page_index`, `total_pages`,
  `total_items`).

## 2. Goals

- Ingest any Employment Hero tenant's public, open roles given a `companySlug` (organisation
  friendly id) or a `companyUrl` (a `/organisations/{slug}` board URL).
- Talk only to the public, anonymous career-page jobs feed the board itself consumes — no
  authentication, no headless browser, no DOM dependence.
- Map each role to a `JobPostDto` with a stable, namespaced id and the canonical public
  detail / apply URL.
- Degrade gracefully on every failure: never throw out of `scrape()`.

## 3. Non-Goals

- No authenticated Employment Hero API (the developer-portal HR / careers-page-token APIs are out
  of scope; we only use the anonymous board feed).
- No candidate application submission — read-only ingestion of public postings.
- No editing of shared registries (site enum, plugin index, tsconfig paths, jest config) — those
  are wired by the orchestrator.

## 4. User / Caller Stories

> As the **aggregation pipeline**, I want to ingest an Employment Hero tenant's public roles by
> slug, so that Employment Hero-hosted postings appear in unified results.

> As an **operator**, I want a malformed / unknown / empty tenant to yield an empty result rather
> than an error, so that one bad tenant never nukes a batch run.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` or a `companyUrl` `/organisations/{slug}` path.            | must     |
| FR-2  | Fetch the public career-page jobs feed for the tenant slug, anonymously.                              | must     |
| FR-3  | Paginate by `page_index`, bounded by the feed's `total_pages`, a page cap, and `resultsWanted`.      | must     |
| FR-4  | Map each role → `JobPostDto` (id `employmenthero-${atsId}`, site, atsType `employmenthero`, etc.).    | must     |
| FR-5  | Build the canonical detail / apply URL from the role's `friendly_id`.                                 | must     |
| FR-6  | Emit description per `descriptionFormat` (HTML / Markdown / Plain) and extract emails from it.        | must     |
| FR-7  | Normalise `created_at` → `YYYY-MM-DD`; derive city / state from the free-text location line.          | should   |
| FR-8  | Detect remote roles from `remote`, `workplace_type`, `remote_setting`, and text fields.               | should   |
| FR-9  | Dedup roles by ATS id; cap the per-request timeout at 15s on both `timeout` and `requestTimeout`.    | must     |
| FR-10 | Never throw: every fetch / parse failure degrades to an empty / partial result.                      | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                          |
| ------ | -------------------------------------- | ------------------------------- |
| NFR-1  | Per-request HTTP timeout (cap)         | ≤ 15 s                          |
| NFR-2  | Page cap per scrape                    | ≤ 25 feed pages                 |
| NFR-3  | Default results cap (no resultsWanted) | 100 roles                       |
| NFR-4  | Logging                                | `Logger` only — no `console.*`  |

## 7. Contracts

### 7.1 API / Interface

```ts
// Public, anonymous career-page jobs feed (host services.employmenthero.com):
//   GET /ats/api/v1/career_page/organisations/{slug}/jobs?page_index={n}&item_per_page={size}
interface EmploymentHeroJobItem {
  id?: string | null; // stable UUID — the ATS id
  title?: string | null;
  friendly_id?: string | null; // → /jobs/position/{friendly_id}/
  description?: string | null; // HTML
  country_code?: string | null; // ISO-3166 alpha-2
  vendor_location_name?: string | null; // free-text location line
  remote?: boolean | null;
  workplace_type?: string | null; // e.g. remote_anywhere, hybrid
  remote_setting?: { anywhere?: boolean | null; country_code?: string | null } | null;
  team_name?: string | null; // ≈ department
  employment_type_name?: string | null;
  organisation_name?: string | null;
  organisation_logo?: string | null;
  created_at?: string | null; // ISO-8601
}
interface EmploymentHeroJobsResponse {
  data?: {
    items?: EmploymentHeroJobItem[] | null;
    page_index?: number | null;
    item_per_page?: number | null;
    total_pages?: number | null;
    total_items?: number | null;
  } | null;
}
```

The adapter implements `IScraper` and returns `JobResponseDto`.

### 7.2 Errors

| Code                          | Meaning                                                            |
| ----------------------------- | ----------------------------------------------------------------- |
| (no slug)                     | Neither `companySlug` nor `companyUrl` resolves → empty result.   |
| HTTP 404 `organisation_not_found` | Unknown tenant → reachable host, empty result.                |
| HTTP 4xx / 5xx                | Reachable host, stop draining, return partial result.             |
| transport failure (DNS/reset) | Host unreachable, stop draining, return partial result.           |

No error is thrown out of `scrape()`.

## 8. Test Plan

- E2E (`__tests__/employmenthero.e2e-spec.ts`): five tests against a known live tenant —
  (1) known tenant returns an array, shape-asserted only when non-empty; (2) empty when no
  slug / url; (3) resolve from a full `companyUrl`; (4) unknown tenant → empty; (5) respects
  `resultsWanted`. 30000 ms timeouts on network tests; zero results tolerated (live board may be
  empty).

## 9. Open Questions

(none — public surface confirmed live 2026-06-04.)

## 10. Decisions

- **Single anonymous feed, no token.** The board itself reads
  `services.employmenthero.com/ats/api/v1/career_page/organisations/{slug}/jobs` anonymously; we
  mirror exactly that, avoiding the authenticated developer-portal APIs.
- **Page-index pagination.** The feed exposes `total_pages`; we drain `page_index` until we pass
  it (or hit the page cap / `resultsWanted`).
- **Detail URL from `friendly_id`.** A role with no `friendly_id` has no canonical
  candidate-facing page and is dropped.

## 11. References

- Sibling ATS-adapter template under `packages/plugins/`.
- Public board: `https://jobs.employmenthero.com/organisations/{slug}` →
  `https://employmenthero.com/jobs/organisations/{slug}/`.
- Public feed: `https://services.employmenthero.com/ats/api/v1/career_page/organisations/{slug}/jobs`.
