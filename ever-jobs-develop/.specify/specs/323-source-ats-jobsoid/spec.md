# Spec: 323 — Jobsoid ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 323                                           |
| Slug           | source-ats-jobsoid                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 315 (Oorwin)                     |

## 1. Problem Statement

Jobsoid (jobsoid.com) is a cloud-based applicant tracking and recruitment
platform. Every customer tenant gets a public, branded careers portal served
from its own sub-domain under the shared apex `jobsoid.com`
(e.g. `https://simpler.jobsoid.com/`). Ever Jobs has no adapter for
Jobsoid-powered careers portals, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Jobsoid adapter unlocks the full
catalogue of Jobsoid-powered careers portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-jobsoid` plugin that ingests jobs
  from **any** Jobsoid-powered careers portal given a `companySlug` (the tenant
  sub-domain label) or a `companyUrl` (the tenant's portal URL).
- Use the **public, anonymous JSON jobs feed** (no auth, no API key) that every
  Jobsoid careers portal exposes at `/api/v1/jobs`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'jobsoid'`, `department`).

## 3. Non-Goals

- Any authenticated Jobsoid backend / recruiter API. Only the anonymous public
  careers feed is used.
- Server-side filtering or pagination. The feed returns all open roles for the
  tenant in a single response and does not honour `offset` / `limit` query
  params (observed: `?limit=1` still returned the full set); we slice
  client-side to `resultsWanted`.
- WAF / Cloudflare bypass. Any portal gating its feed behind an aggressive WAF
  is out of scope (graceful empty result).
- A curated seed list of Jobsoid tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Jobsoid plugin at a
> tenant's careers-portal sub-domain, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Jobsoid adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant sub-domain label from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the public JSON feed from `https://{tenant}.jobsoid.com/api/v1/jobs`.                          | must     |
| FR-3  | Parse the flat JSON array of full job records (description embedded inline).                         | must     |
| FR-4  | De-duplicate jobs by numeric `id` within a single run.                                               | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert `description` HTML per `descriptionFormat` (HTML / Markdown / Plain).                         | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-8  | Tolerate unknown tenants (`[]` HTTP 200), HTTP 4xx, and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public feed only                 |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JOBSOID, name: 'Jobsoid', category: 'ats', isAts: true })
class JobsoidService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified live 2026-06-03 against `simpler.jobsoid.com`):

```
GET https://{tenant}.jobsoid.com/api/v1/jobs
  → HTTP 200, application/json
  → a flat JSON array of full job objects, e.g.:
    [
      {
        "id": 91392,
        "code": "BD-IT",
        "title": "Head of Business Development & Partnerships – Italy (Remote)",
        "description": "<p><strong>About …</strong></p> …",     // HTML, inline
        "industry": "Computer Software",
        "postedDate": "2026-05-12T01:00:23.013",
        "closingDate": null,
        "attributes": [],
        "location": { "id": 42940, "title": "Milan - Milan",
                      "city": "Milan", "state": "Lombardy",
                      "country": "Italy", "zip": "" },
        "department": null,
        "division": [],
        "function": { "id": 647841, "title": "Business Development" },
        "type": "", "positions": 1, "experience": "", "salary": "",
        "hostedUrl": "https://simpler.jobsoid.com/j/91392/head-of-…",
        "applyUrl": "https://simpler.jobsoid.com/apply/91392",
        "slug": "head-of-business-development-partnerships-italy-remote",
        "company": "Simpler"
      }
    ]
```

A single job is also fetchable at `GET /api/v1/jobs/{id}` (same object shape),
but is unused — the list feed already embeds the full record.

Verified wire mapping (simpler.jobsoid.com, 2026-06-03):
- `id` numeric → `atsId` (`String(id)`), used in hosted / apply URLs
- `title` → `title`
- `description` HTML (inline) → `description` (format-converted)
- `location.{city,state,country}` → `LocationDto`; fall back to `location.title`
- `function.title` / `department.title` / `industry` → `department`
- `postedDate` ISO-8601-ish → `datePosted` (`YYYY-MM-DD`)
- `hostedUrl` → `jobUrl` (fallback: `/j/{id}/{slug}` template)
- `applyUrl` → `applyUrl` (fallback: `/apply/{id}` template)
- `company` → `companyName` (fallback: name derived from the tenant label)
- remote: heuristic on title / location / type (no dedicated flag in feed)

Tenant resolution:
- `companySlug` (bare label `simpler`, or first label of a dotted host) — preferred
- `companyUrl` → first sub-domain label of the hostname (skip `www`)
- Host built as `https://{tenant}.jobsoid.com`

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url; unknown tenant (`[]` HTTP 200); HTTP 4xx; fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | non-array / malformed payload — degrades to empty, never throws |

## 8. Test Plan

- E2E (`__tests__/jobsoid.e2e-spec.ts`): known tenant (`simpler`) returns shaped
  jobs (guarded by `length > 0`); no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` is honoured. Network-tolerant (zero
  results is acceptable). Asserts `job.site === Site.JOBSOID` and
  `job.atsType === 'jobsoid'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-JS-1 — WAF-gated tenants.** A subset of Jobsoid tenants may host their
  portal behind a CDN/WAF that blocks unauthenticated server-side requests.
  Graceful empty result is the fallback (NFR-2).
  **Default (proceeding):** degrade to empty on 4xx.
- **Q-JS-2 — Pagination / large feeds.** The `/api/v1/jobs` feed returns all
  open roles in a single array and ignores `offset`/`limit` params. If a future
  tenant has thousands of roles, the feed may be truncated server-side.
  **Default (proceeding):** single fetch; slice client-side; re-evaluate if
  truncation is observed in practice.

## 10. Decisions

- D-1: Primary (and only) endpoint is the public `GET /api/v1/jobs` JSON feed
  on the tenant sub-domain. No authentication is needed. **Verified live
  2026-06-03** on `simpler.jobsoid.com` (HTTP 200, 3 full job objects).
  **Confidence: verified** — byte-confirmed the exact JSON field names and the
  inline HTML `description` against a live tenant.
- D-2: The list feed embeds the full job record (HTML description, structured
  location, hosted/apply URLs) — so NO per-job detail fan-out is required. A
  single GET per tenant minimises request count.
- D-3: The feed ignores `offset`/`limit` (observed `?limit=1` returned the full
  set) — so the result-set is sliced client-side to `resultsWanted`. De-dup by
  numeric `id` guards against duplicate entries.
- D-4: Unknown tenants resolve via DNS wildcard and the API returns `[]`
  (HTTP 200) — mapped to an empty result, no error. HTTP 4xx (if a WAF blocks)
  also degrades to empty.
- D-5: `company` is returned per job; `companyName` falls back to a name derived
  from the tenant sub-domain label when absent.
- D-6: `jobUrl` / `applyUrl` prefer the API-provided `hostedUrl` / `applyUrl`;
  canonical templates (`/j/{id}/{slug}`, `/apply/{id}`) are the fallback.

## 11. References

- `packages/plugins/source-ats-jobsoid/` — implementation.
- Live feed verified 2026-06-03: `https://simpler.jobsoid.com/api/v1/jobs`
  (HTTP 200, 3 full job objects) and `…/api/v1/jobs/91392` (single object).
