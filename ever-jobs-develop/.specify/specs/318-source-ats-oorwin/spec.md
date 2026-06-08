# Spec: 318 — Oorwin ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 318                                |
| Slug           | source-ats-oorwin                  |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 301 (Niceboard), 312 (Vincere)     |

## 1. Problem Statement

Oorwin is a cloud-based staffing and talent management platform (ATS + CRM +
HRMS) used primarily by staffing firms and recruitment agencies. Every customer
tenant has a public career portal served from its own sub-domain under the
shared apex `oorwin.com` (e.g. `https://purpledrive.oorwin.com/careers/`).
Ever Jobs has no adapter for Oorwin, so Oorwin-hosted career portals are
currently un-ingestable. A single generic, multi-tenant Oorwin adapter unlocks
that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-oorwin` plugin that ingests jobs
  from **any** Oorwin-powered career portal given a `companySlug` (the portal's
  sub-domain label) or a custom-domain `companyUrl`.
- Use the **public, anonymous** listing and detail APIs so no credentials are
  required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'oorwin'`, `department`).

## 3. Non-Goals

- The Oorwin private REST API at `https://app.theneo.io/oorwin-labs-inc/apiv2`
  which requires authentication. It is not used.
- Server-side keyword or location filtering; we pass the unfiltered base query
  and slice client-side to `resultsWanted`.
- WAF / CDN bypass via browser TLS fingerprinting. Any portal gated behind an
  aggressive WAF that 403s plain HTTPS is out of scope (graceful empty result).
- A curated seed list of Oorwin tenant portals (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Oorwin plugin at a tenant
> sub-domain, so that I ingest that portal's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Oorwin adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant sub-domain from `companySlug`, or from `companyUrl` (first sub-domain label). | must   |
| FR-2  | Fetch position summaries from `POST /api/v2/careers/getJobList` with `sub_domain`, `limit`, `page`, `order`, `sort`, `list_type`. | must |
| FR-3  | Fetch HTML description for each job from `POST /api/v2/careers/job_view` using `computed_sha1_job_id`. | must |
| FR-4  | Page via `limit` + `page`; the first response's `total` is the tenant total. Fan out remaining pages with a bounded `Promise.allSettled`. | must |
| FR-5  | De-duplicate positions by ATS id (numeric `id`) within a single run.                         | must  |
| FR-6  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must  |
| FR-9  | Tolerate unknown / dead tenants (`status: 404`) and fetch failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public anonymous endpoints only |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OORWIN, name: 'Oorwin', category: 'ats', isAts: true })
class OorwinService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
POST https://api.oorwin.ai/api/v2/careers/getJobList
  Body: { sub_domain, limit, page, order, sort, list_type, getDefaultData }
  → { status: 1, data: { list_details: { data: OorwinJobListItem[], total, last_page } } }

POST https://api.oorwin.ai/api/v2/careers/job_view
  Body: { sub_domain, job_id: "{computed_sha1_job_id}", view_type: "1" }
  → { status: 1, data: { job_details: { job_description: "<html>..." } } }
```

Verified wire shape (`getJobList` row, `snake_case`):

```jsonc
{
  "id": 12373,                                         // numeric → atsId, job page URL
  "computed_sha1_job_id": "c7f674bd...",               // SHA-1 hash → job_view body
  "title": "Guidewire Development Lead – PolicyCenter", // → title
  "job_type": "Full Time",                             // → department
  "experience_range": "10-12",                         // years of experience
  "code": "PDT - 11238",                               // short reference code
  "cp_published_on": "2026-06-02 20:01:19.000",        // ISO-ish → datePosted (YYYY-MM-DD)
  "remote_status": "Remote",                           // "Remote" / "OnSite" / "Hybrid" → isRemote
  "city": "Plano, TX",                                 // free-text city/state → location.city
  "state_format_name": "Texas",                        // full state name → location.state
  "country_format_name": "USA"                         // full country name → location.country
}
```

`job_view` job_details includes `job_description` (full HTML) — fetched per job.

Tenant resolution: the tenant is identified by the sub-domain label (from
`companySlug`, or the first sub-domain label of `companyUrl`). Host:
`https://{tenant}.oorwin.com`. Public job-detail page URL:
`https://{tenant}.oorwin.com/careers/#/job/{id}`.

### 7.2 Errors

| Code / Behaviour            | Meaning                                                |
| --------------------------- | ------------------------------------------------------ |
| empty `JobResponseDto`      | no slug/url, unknown tenant (status 404), or fetch failed |
| logged warn (status 404)    | unknown/dead tenant — degrades to empty, never throws  |
| logged warn (page failure)  | a single page fetch failed — other pages still merge   |
| logged warn (detail failure)| a single detail fetch failed — job collected with null description |

## 8. Test Plan

- E2E (`__tests__/oorwin.e2e-spec.ts`): known tenant (`purpledrive`) returns
  shaped jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`). Timeout: 60 s (detail fetches add latency).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-OW-1 — Per-job detail latency.** Each job requires a separate `job_view`
  POST call to obtain the HTML description. With a large results set this adds
  significant latency. A future optimisation could cache or skip descriptions
  when `descriptionFormat` is not requested.
  **Default (proceeding):** always fetch detail; individual failures degrade to
  null description.

- **Q-OW-2 — Custom domains.** Some Oorwin tenants may front their portal with
  a custom domain. In that case `companyUrl` is preferred; its first sub-domain
  label is used as the `sub_domain` value. This may fail if the tenant uses a
  root domain with no sub-domain.
  **Default (proceeding):** if URL parsing yields no usable label, return empty.

## 10. Decisions

- D-1: Primary listing endpoint is `POST /api/v2/careers/getJobList` — the
  same anonymous call the portal SPA makes — verified to return the tenant's
  jobs without auth (live test 2026-06-03: `purpledrive`, 2 804 total jobs).
- D-2: The listing endpoint returns compact rows without description HTML. A
  second `POST /api/v2/careers/job_view` call per job retrieves the full HTML.
  Both calls are anonymous.
- D-3: Pagination is driven by `limit` + `page`; the first page's `total` seeds
  the cap and `last_page` bounds the fan-out. Remaining pages are fanned out
  with a bounded `Promise.allSettled`; individual detail failures produce jobs
  with null descriptions.
- D-4: `remote_status === "Remote"` (case-sensitive) maps to `isRemote: true`;
  "OnSite" and "Hybrid" map to false (and the title is also checked).
- D-5: `job_type` (e.g. "Full Time", "Contractual") maps to `department` as the
  closest available classification — Oorwin does not expose a separate department
  field on the listing endpoint.

## 11. References

- `packages/plugins/source-ats-oorwin/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling paginated ATS adapter (pattern).
- Public Oorwin career portal API (verified live 2026-06-03 against `purpledrive`).
