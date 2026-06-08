# Spec: 302 — GoHire ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 302                                |
| Slug           | source-ats-gohire                  |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 296 (Eightfold), 300 (ClearCompany) |

## 1. Problem Statement

GoHire is an applicant-tracking and recruiting platform for small-and-mid-market
employers that hosts the public careers boards of thousands of customers. Every
tenant's careers board is served from one shared host
(`https://jobs.gohire.io/{clientHash}`) and embedded on customer sites via a
careers widget. Ever Jobs has adapters for many ATS platforms but **none for
GoHire**, so GoHire-hosted career boards are currently un-ingestable. A single
generic, multi-tenant GoHire adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-gohire` plugin that ingests jobs from
  **any** GoHire-powered careers board given a `companySlug` (the tenant's
  GoHire client hash) or a custom-domain / board `companyUrl`.
- Use the **public** widget feeds (no auth) so no credentials are required.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'gohire'`, `department`).

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Any tenant whose feed
  is gated behind an aggressive WAF that 403s plain HTTPS is out of scope this
  iteration (graceful empty result).
- Server-side keyword/location filtering. The list feed returns the tenant's
  full open-roles list; we slice client-side to `resultsWanted` and do not push
  `searchTerm`/`location` upstream.
- Application submission, candidate upload, or general-application pool flows
  exposed by the widget — read-only listing only.
- A curated seed list of GoHire tenant client hashes (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the GoHire plugin at a tenant
> client hash, so that I ingest that employer's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the GoHire adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant client hash from `companySlug`, or from `companyUrl` (the board path segment's trailing `-`-suffixed hash, or first sub-domain label). | must     |
| FR-2  | Fetch positions from the public `GET /widget-jobs/{clientHash}` list feed.                   | must     |
| FR-3  | Treat the single-response `jobs` array as the full open-roles list; slice client-side to `resultsWanted`. | must     |
| FR-4  | De-duplicate positions by ATS id (numeric job id) within a single run.                       | must     |
| FR-5  | Hydrate each role via the public `GET /widget-job?clientHash&jobId` detail feed (HTML description, structured location, employer name). | should   |
| FR-6  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must     |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-9  | Tolerate unknown / dead tenants (list feed returns `{}`) and fetch failures without throwing (partial/empty results OK). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public endpoints only           |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |
| NFR-5  | Bound concurrent detail fan-out              | `Promise.allSettled`, max 8     |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GOHIRE, name: 'GoHire', category: 'ats', isAts: true })
class GoHireService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://api2.gohire.io/widget-jobs/{clientHash}
  → { generalApplication, generalPoolID, template, colour, jobs: GoHireListJob[], language }

GET https://api.gohire.io/widget-job?clientHash={clientHash}&jobId={id}
  → GoHireJobDetail   (single rich job object)
```

Verified list-job shape (camelCase):

```jsonc
{
  "id": 55596,                                       // numeric → atsId, detail jobId
  "title": "Virtual Assistant",                       // → title
  "description": "",                                  // empty in list feed
  "location": "Manila, Philippines",                  // free-text → LocationDto fallback
  "salary": "150 - 175 PHP Per hour",                 // free-text (unused)
  "type": "Contract",                                 // → department fallback
  "date": "28 May, 2026",                             // human date → datePosted (YYYY-MM-DD)
  "link": "https://jobs.gohire.io/getava-hrscgarc/virtual-assistant-55596/" // → jobUrl
}
```

Verified detail-job shape (camelCase, enrichment):

```jsonc
{
  "id": 55596,
  "client": { "name": "Getava", "country": "United States" }, // name → companyName
  "title": "Virtual Assistant",
  "type": { "id": 6, "name": "Contract" },            // name → department
  "city": "Manila",                                    // → LocationDto.city
  "county": "Manila",                                  // → LocationDto.state (when != city)
  "country": { "code": "PH", "name": "Philippines" }, // name → LocationDto.country
  "description": "<p>...</p>"                          // HTML → description (format-converted)
}
```

Host resolution: all tenants share the board host `jobs.gohire.io`; the tenant
is identified by an opaque client hash (e.g. `hrscgarc`). The public board page
URL is `https://jobs.gohire.io/{company}-{clientHash}/{job-slug}-{jobId}/`; the
list feed's `link` is used verbatim as the job URL when present.

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (list feed returns `{}`), or fetch failed |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws |
| logged warn (detail fetch)  | per-job detail failed — falls back to list-feed fields, never throws |

## 8. Test Plan

- E2E (`__tests__/gohire.e2e-spec.ts`): known tenant (`hrscgarc`) returns shaped
  jobs; no-slug returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-GH-1 — WAF fallback.** A minority of GoHire surfaces sit behind a CDN/WAF
  that 403s plain HTTPS (the widget loader host does so without a browser UA).
  The JSON feeds answer with a browser-like UA; a browser-fingerprint fallback
  would recover the rest but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-endpoint-only with a browser UA; degrade
  to empty on 4xx.
- **Q-GH-2 — Location granularity.** The list `location` is free text
  ("Manila, Philippines"); when the detail feed is reachable we prefer its
  structured `city` / `county` / `country`, else heuristically split on commas.

## 10. Decisions

- D-1: Primary endpoint is the public `GET /widget-jobs/{clientHash}` list feed
  on `api2.gohire.io` — verified to return the tenant's full open-roles `jobs`
  array without auth. The authenticated dashboard `get-jobs` route is not used.
- D-2: Roles are hydrated via the public `GET /widget-job?clientHash&jobId`
  detail feed on `api.gohire.io` for the full HTML description, structured
  location and employer name (the list feed's `description` is empty).
- D-3: Tenant is resolved from `companySlug`, or from `companyUrl` by taking the
  board path segment's trailing `-`-suffixed client hash (falling back to a bare
  segment or the first sub-domain label).
- D-4: The list feed has no pagination envelope; the full array is returned in
  one call. Detail fetches are fanned out with a bounded `Promise.allSettled`
  (max 8) so a single failure never aborts the batch; results are sliced
  client-side to `resultsWanted`. De-dup by numeric job id guards duplicates.

## 11. References

- `packages/plugins/source-ats-gohire/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter
  (bounded detail fan-out pattern).
- `packages/plugins/source-ats-clearcompany/` — sibling shared-host ATS adapter.
- Public GoHire careers widget feeds (verified 2026-06-03).
