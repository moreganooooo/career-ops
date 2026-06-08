# Spec: 307 — JobAdder ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 307                                |
| Slug           | source-ats-jobadder                |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

JobAdder is a recruitment platform that hosts the public careers sites
("Careerpages") of thousands of staffing agencies and employers. Every tenant's
Careerpage is served from one shared host
(`https://clientapps.jobadder.com/{accountId}/{slug}`). Ever Jobs has adapters
for many ATS platforms but **none for JobAdder**, so JobAdder-hosted career
sites are currently un-ingestable. A single generic, multi-tenant JobAdder
adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-jobadder` plugin that ingests jobs
  from **any** JobAdder-hosted Careerpage given a `companySlug`
  (`{accountId}/{slug}`) or a Careerpage `companyUrl`.
- Use the **public** Careerpage (no auth) so no credentials are required.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'jobadder'`, `department`, `employmentType`).

## 3. Non-Goals

- Use of JobAdder's structured v2 jobs API (`/jobboards/{boardId}/ads`). That
  endpoint requires OAuth2 (`read_jobad` / `partner_jobboard` scopes) and is
  out of scope for an anonymous, multi-tenant adapter.
- Use of the JavaScript widget endpoints (`/widgets/V1/Jobs/RenderJobList`).
  They return server-rendered HTML fragments keyed by an opaque widget key, not
  by a tenant slug, so they do not fit the generic slug-addressable model.
- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose
  Careerpage is gated behind an aggressive WAF that 403s plain HTTPS is out of
  scope this iteration (graceful empty result).
- A curated seed list of JobAdder tenant `{accountId}/{slug}` pairs (handled by
  the source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the JobAdder plugin at a
> tenant's Careerpage coordinates, so that I ingest that employer's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the JobAdder adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant (`accountId` + `slug`) from `companySlug` (`{accountId}/{slug}`) or from `companyUrl` (the first two path segments). | must     |
| FR-2  | Fetch the public Careerpage listing HTML from `GET /{accountId}/{slug}` and parse each `job_items` card. | must     |
| FR-3  | Enrich each role with its full description from the job-detail page (`/{accountId}/{slug}/{jobId}/{titleSlug}`) via bounded `Promise.allSettled` fan-out. | should   |
| FR-4  | De-duplicate roles by ATS id (the numeric job id) within a single run.                       | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants (HTTP 404) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public Careerpage only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |
| NFR-5  | Bound concurrent detail fetches              | `Promise.allSettled`, max 6     |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JOBADDER, name: 'JobAdder', category: 'ats', isAts: true })
class JobAdderService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://clientapps.jobadder.com/{accountId}/{slug}
  → server-rendered HTML listing of the tenant's open roles

GET https://clientapps.jobadder.com/{accountId}/{slug}/{jobId}/{titleSlug}
  → server-rendered HTML job-detail page (full description)
```

Verified listing-card markup (per role):

```html
<div class="col-md-6 col-xs-12 job_items">
  <div class="pricing-item price_item2">
    <h2><a href="/84381/eq8-recruit/600604/field-sales-representative-logistics"
           class="viewjob">Field Sales Representative | Logistics</a></h2>   <!-- → title + jobId -->
    <h3><sub>20th May, 2026</sub></h3>                                        <!-- → datePosted -->
    <ul class="list">
      <li>Supply Chain &amp; Logistics</li>                                  <!-- → department -->
      <li>Sales</li>
      <li>Dar es Salaam, Tanzania</li>                                       <!-- → location -->
      <li>Permanent Job</li>                                                 <!-- → employmentType -->
    </ul>
    <p class="job_snippet">Support business growth across ...</p>            <!-- snippet fallback -->
  </div>
</div>
```

Tenant resolution: a JobAdder Careerpage is addressed by **two** path segments —
a numeric `accountId` and a board `slug` (e.g. `84381/eq8-recruit`). The
`accountId` is mandatory, so a bare slug is rejected; the pair is taken from
`companySlug` (`{accountId}/{slug}`) or the first two path segments of
`companyUrl`. The job id is the numeric segment of the detail-page path.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unresolvable tenant, unknown tenant (HTTP 404), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |
| logged warn (detail fetch)  | a single detail-page failure → role kept with snippet fallback |

## 8. Test Plan

- E2E (`__tests__/jobadder.e2e-spec.ts`): known tenant (`84381/eq8-recruit`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-JA-1 — WAF fallback.** A minority of JobAdder Careerpages may sit behind a
  CDN/WAF that 403s plain HTTPS. A browser-fingerprint fallback would recover
  them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-Careerpage-only; degrade to empty on 4xx.
- **Q-JA-2 — Bullet classification.** The listing `<ul>` mixes classifications,
  the free-text location, and the employment type with no per-item labels; we
  classify heuristically (comma/"remote" → location, "... Job" → employment
  type, remainder → department). Structured fields are only available via the
  OAuth2 API (Non-Goal).
- **Q-JA-3 — Pagination.** The observed Careerpages render every open role on a
  single page (no pager links). If a large tenant paginates, only the first page
  is ingested this iteration; multi-page support is deferred.

## 10. Decisions

- D-1: Primary (and only) anonymous surface is the hosted **Careerpage** HTML at
  `https://clientapps.jobadder.com/{accountId}/{slug}` — verified to return the
  tenant's open roles without auth. The v2 `/jobboards/{boardId}/ads` JSON API
  requires OAuth2 and the widget `RenderJobList` endpoints return opaque-key HTML
  fragments; neither is used.
- D-2: Tenant is resolved as an `{accountId, slug}` pair from `companySlug`
  (`{accountId}/{slug}`) or the first two path segments of `companyUrl`.
- D-3: The listing page carries no full description; we lazily fetch each role's
  detail page (bounded `Promise.allSettled` fan-out) for the description HTML,
  falling back to the listing snippet when a detail fetch fails.
- D-4: De-dup by numeric job id guards against duplicate cards within the page.
- D-5: Company name is taken from the Careerpage `<title>` ("Jobs at {Company}"),
  falling back to the slug-derived name.

## 11. References

- `packages/plugins/source-ats-jobadder/` — implementation.
- `packages/plugins/source-ats-clearcompany/` — sibling career-site adapter (pattern).
- `packages/plugins/source-ats-eightfold/` — bounded-fan-out pattern reference.
- Public JobAdder Careerpage (verified 2026-06-03).
