# Spec: 311 — Recruit CRM ATS Source Plugin

| Field          | Value                               |
| -------------- | ----------------------------------- |
| Spec ID        | 311                                 |
| Slug           | source-ats-recruitcrm               |
| Status         | done                                |
| Owner          | scheduled-agent                     |
| Created        | 2026-06-03                          |
| Last updated   | 2026-06-03                          |
| Supersedes     | (none)                              |
| Related specs  | 301 (Niceboard), 300 (ClearCompany) |

## 1. Problem Statement

Recruit CRM is a recruiting-agency CRM and ATS used by staffing firms in over
100 countries.  Each agency can publish a branded public jobs page at
`https://recruitcrm.io/jobs/{accountSlug}`.  Ever Jobs has adapters for many
ATS and career-site platforms but **none for Recruit CRM**, so the job listings
published via Recruit CRM-powered pages are currently un-ingestable.  A single
generic, multi-tenant adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-recruitcrm` plugin that ingests jobs
  from **any** Recruit CRM-powered public jobs page given a `companySlug` (the
  agency's account slug) or a `companyUrl`
  (e.g. `https://recruitcrm.io/jobs/Terra_Careers`).
- Use the **public, anonymous** Albatross feed — the same endpoint the
  `recruitcrm.io/jobs` SPA calls — so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'recruitcrm'`).

## 3. Non-Goals

- The credentialed Recruit CRM private REST API
  (`GET https://api.recruitcrm.io/v1/jobs` with a Bearer token).  It requires
  a per-account API key and is explicitly not used.
- WAF / Cloudflare bypass via browser TLS fingerprinting.  Any account whose
  feed is gated behind an aggressive WAF that 403s plain HTTPS is out of scope
  this iteration (graceful empty result).
- Server-side keyword / location filtering.  We pass `search_data: {}` and
  slice client-side to `resultsWanted`.
- A curated seed list of Recruit CRM tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Recruit CRM plugin at an
> agency's account slug, so that I ingest that agency's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Recruit CRM adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID   | Requirement                                                                                  | Priority |
| ---- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1 | Resolve an account slug from `companySlug`, or from the last path segment of `companyUrl`.   | must     |
| FR-2 | Fetch positions from `POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get?account={slug}&batch=true` with `Origin: https://recruitcrm.io`. | must |
| FR-3 | Page via `limit` + `offset`; when the returned array is shorter than `limit` the feed is exhausted.  Fan out remaining pages with a bounded `Promise.allSettled`. | must |
| FR-4 | De-duplicate positions by `slug` (ATS id) within a single run.                               | must     |
| FR-5 | Map each job to `JobPostDto` (title, url, location, remote, description, applyUrl).           | must     |
| FR-6 | Convert description per `descriptionFormat` (HTML / Markdown / Plain); prefer `jdtext` (HTML), fall back to `description` (plain). | should |
| FR-7 | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8 | Tolerate unknown / suspended accounts (`status: "fail"`, HTTP 400/401/404) and fetch failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID    | Requirement                                  | Target                          |
| ----- | -------------------------------------------- | ------------------------------- |
| NFR-1 | No credentials / secrets required            | public endpoint only            |
| NFR-2 | A fetch failure or unknown account must not throw | graceful empty/partial result |
| NFR-3 | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4 | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.RECRUITCRM, name: 'Recruit CRM', category: 'ats', isAts: true })
class RecruitCrmService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
POST https://albatross.recruitcrm.io/v1/external-pages/jobs-by-account/get
     ?account={accountSlug}&batch=true
  Headers:
    Origin: https://recruitcrm.io
    Content-Type: application/json
  Body:
    { "limit": N, "offset": M, "search_data": {}, "onlyJobs": true }

  → {
      "status":       "success",
      "message":      "",
      "message_type": "is-success",
      "data": { "jobs": [RecruitCrmJob, ...] }
    }
```

Verified wire shape (per-job, `snake_case`):

```jsonc
{
  "slug":        "17798145903860064349Ukx",  // unique id → atsId + job-detail URL key
  "srno":        "145",                       // serial number (unused)
  "name":        "Ingeniero/a de Sonido…",   // → title
  "companyname": "Acme Recruiting",           // → companyName (when showcompany != 0)
  "showcompany": 2,                           // 0 = hide company name
  "jobcode":     null,                        // optional job code (unused)
  "description": "",                          // plain-text summary fallback
  "jdtext":      "<h1>…</h1>",               // full HTML → description (format-converted)
  "city":        "New York",                  // → location.city
  "locality":    "Manhattan",                 // → location.state (sub-region)
  "remote":      "Remote",                    // non-empty → isRemote true
  "postalcode":  "10001"                      // unused in mapping
}
```

Job-detail URL: `https://recruitcrm.io/jobs/{slug}` (verified HTTP 200).

Account resolution: the tenant is identified by the `accountSlug` supplied via
`companySlug`, or parsed from the last path segment of `companyUrl`.

### 7.2 Errors

| Code / Behaviour              | Meaning                                               |
| ----------------------------- | ----------------------------------------------------- |
| empty `JobResponseDto`        | no slug/url, unknown account (`status: "fail"`), or fetch failed |
| logged warn (`status: "fail"`) | unknown/suspended account — degrades to empty, never throws |
| logged warn (page failure)    | a single page fetch failed — other pages still merge  |

## 8. Test Plan

- E2E (`__tests__/recruitcrm.e2e-spec.ts`): known tenant (`Terra_Careers`)
  returns shaped jobs; no-slug returns empty; unknown account degrades
  gracefully; `resultsWanted` is honoured.  Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-RC-1 — No publish date.** The public feed does not expose a job
  `created_at` or `published_at` field.  `datePosted` is set to `null`.
  **Default (proceeding):** null; a future enhancement could scrape the detail
  page for a date if needed.
- **Q-RC-2 — No department field.** The public feed does not include a
  department/category field.  `department` is set to `null`.
- **Q-RC-3 — Custom domains.** Agencies may use a custom domain that forwards
  to their Recruit CRM jobs page.  Custom-domain URLs are not resolvable to an
  `accountSlug` without an extra lookup; they are out of scope this iteration.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `POST` feed on the Albatross
  service — the same call the `recruitcrm.io/jobs` SPA makes — verified to
  return the agency's jobs without auth when `Origin: https://recruitcrm.io`
  is present.  The credentialed API (`Bearer` token) is not used.
- D-2: No `total_count` is returned; we detect exhaustion when the returned
  array is shorter than `limit`.
- D-3: `jdtext` (HTML) is the primary description source; `description`
  (plain-text) is the fallback.
- D-4: `showcompany === 0` → use the slug-derived display name; otherwise use
  `companyname` from the feed.
- D-5: The `remote` field is a free-text string; any non-empty value sets
  `isRemote: true`.

## 11. References

- `packages/plugins/source-ats-recruitcrm/` — implementation.
- `packages/plugins/source-ats-niceboard/` — closest pattern (public anonymous
  paginated feed, bounded fan-out).
- Public Recruit CRM jobs-page SPA source (`recruitcrm.io/jobs/Terra_Careers`)
  — Albatross endpoint extracted from page bundle.
- Albatross feed verified live 2026-06-03 against account `Terra_Careers`.
