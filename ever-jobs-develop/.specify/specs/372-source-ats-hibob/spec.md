# Spec: 372 — HiBob ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 372                                           |
| Slug           | source-ats-hibob                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

HiBob ("Bob", hibob.com) is an HR platform whose Hiring module lets each customer
publish a branded, public, **unauthenticated** careers page. Every customer tenant
is addressed by its company slug on the shared careers host
`https://{tenant}.careers.hibob.com/jobs` (an individual role lives at
`/jobs/{jobId}`, its application form at `/jobs/{jobId}/apply`, where `{jobId}` is
an opaque UUID). The careers page is a client-rendered SPA, but it is backed by the
documented, anonymous **Hiring API** on `api.hibob.com` (the docs state retrieving
Job Ads requires no permission). Ever Jobs has no adapter for HiBob-powered career
sites, so these vacancies are currently un-ingestable. A single generic,
multi-tenant HiBob adapter unlocks the full catalogue of HiBob-powered career sites
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hibob` plugin that ingests vacancies from
  **any** HiBob career site given a `companySlug` (the careers sub-domain label,
  e.g. `dcbyte`) or a `companyUrl` (a careers URL on a `hibob.com` host, from which
  the tenant slug is extracted).
- Use the **public, anonymous** surface (no auth, no API key): the active-job-ads
  search (`POST /v1/hiring/job-ads/search`) to enumerate roles, plus each role's
  JSON detail object (`GET /v1/hiring/job-ads/{id}`) carrying the full body and
  metadata; the careers portal supplies the canonical public job / apply URLs.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'hibob'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated HiBob HR / recruiter API (people, payroll, workforce planning).
  This plugin consumes only the public candidate-facing job-ads surface.
- Server-side filtering by department / location. We ingest the tenant's active
  job-ads list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of HiBob tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the HiBob plugin at a tenant's
> careers slug, so that I ingest that organisation's active job ads without writing
> a bespoke scraper.

> As a **plugin host**, I want the HiBob adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` (used directly) or from a `companyUrl` on a `hibob.com` host (tenant taken from the leading `{tenant}.careers.hibob.com` sub-domain label). | must |
| FR-2  | Fetch the public active-job-ads search (`POST /v1/hiring/job-ads/search` with empty filters → all active ads), collecting up to `resultsWanted` deduped roles. | must |
| FR-3  | Fetch each role's JSON detail object (`GET /v1/hiring/job-ads/{id}`); use the opaque ad `id` (UUID) as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, applyUrl, location, department, employmentType, remote, datePosted, description). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping detail fetches once collected.           | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 200 empty / HTTP 4xx), network errors, and malformed / non-object payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public job-ads search + detail API |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HIBOB, name: 'HiBob', category: 'ats', isAts: true })
class HiBobService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03, DEFENSIVE / verified=false):

```
POST https://api.hibob.com/v1/hiring/job-ads/search
  body: { "filters": [], "fields": [] }   // empty filters → all active ads
  → { "jobAds": [
        { "jobAd": { "id": "1fde23e9-…", "title": "Senior Engineer",
                     "description": "<html body>", "location": "London, UK",
                     "department": "Engineering", "employmentType": "Full-time",
                     "remote": true,
                     "applyUrl": "https://{tenant}.careers.hibob.com/jobs/{id}/apply",
                     "url": "https://{tenant}.careers.hibob.com/jobs/{id}",
                     "createdAt": "2024-01-12T…" } }, … ] }

GET https://api.hibob.com/v1/hiring/job-ads/{id}
  → { "jobAd": { …same shape as a list entry… } }
```

Wire shape → `JobPostDto` mapping:

| JSON field                                          | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `jobAd.id` (list / detail)                          | `atsId`, `id`           | `id` is prefixed `hibob-{atsId}`                            |
| `jobAd.title` (detail, else list; `name` fallback)  | `title`                 | required; role skipped if absent                            |
| `jobAd.url` else `{tenant}.careers.hibob.com/jobs/{id}` | `jobUrl`            | canonical public detail URL                                 |
| `jobAd.applyUrl` else `.../jobs/{id}/apply`         | `applyUrl`              | canonical public apply URL                                  |
| `jobAd.description` (HTML)                           | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `jobAd.createdAt` / `publishedAt`                   | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobAd.location` / `city` / `state` / `country`     | `location`              | structured city/state/country; null when none usable        |
| `jobAd.remote` / `workplaceType` / title / location | `isRemote`              | remote detection (`remote` / `wfh` …)                       |
| `jobAd.department` / `team`                         | `department`            | when present                                                |
| `jobAd.employmentType` / `jobType`                  | `employmentType`        | token normalised to a readable label                        |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the API carries no brand name on the public surface         |
| —                                                   | `site`                  | constant `Site.HIBOB`                                       |
| —                                                   | `atsType`               | constant `'hibob'`                                          |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `dcbyte`) → used directly as the tenant label.
- `companySlug` containing a careers URL / `hibob.com` host → tenant extracted from URL.
- `companyUrl` on a `hibob.com` host (`{tenant}.careers.hibob.com/jobs`) → tenant
  taken from the leading sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 200 empty / 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed / non-object payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/hibob.e2e-spec.ts`): known tenant (`companySlug: 'dcbyte'`)
  returns shaped jobs (`site === Site.HIBOB`, `atsType === 'hibob'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HB-1 — API tenant identification.** The careers SPA is client-rendered and the
  apidocs.hibob.com portal gates the full request/response schema (HTTP 403), so the
  exact mechanism by which `POST /v1/hiring/job-ads/search` is scoped to a tenant
  (request host, a company key in the body, or a header) could not be observed on the
  wire. **Default (proceeding):** send the tenant under several plausible keys
  (`companySlug` / `company` body fields + an `X-Company` header) and probe multiple
  result-array keys (`jobAds` / `results` / `items`); any failure degrades to empty.
  Confidence: **verified=false** (defensive).
- **Q-HB-2 — Company display name.** The public job-ads surface carries no tenant
  brand name. **Default (proceeding):** de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **Q-HB-3 — Custom careers domains.** Some tenants may front the careers page under
  their own custom domain. **Default (proceeding):** address a tenant by its careers
  sub-domain label; a caller may pass a full `companyUrl` on a `hibob.com` host to
  derive the slug. Custom-domain detection beyond `hibob.com` hosts is deferred to
  the source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous Hiring API on `api.hibob.com`: the
  active-job-ads search (`POST /v1/hiring/job-ads/search`) for enumeration plus each
  role's detail object (`GET /v1/hiring/job-ads/{id}`) for the body and metadata; the
  careers portal `{tenant}.careers.hibob.com` supplies the canonical public job /
  apply URLs. **Confidence: verified=false (defensive)** — the platform + tenant
  addressing were confirmed live 2026-06-03 (real tenants `hibob-e360`, `dcbyte`) and
  the job-ads endpoints are documented as anonymous (`jobAd/applyUrl` is the public
  apply link), but the byte-level request/response envelope is gated, so the wire
  shape is probed defensively.
- D-2: There is no JS-free server-rendered HTML surface (the careers page is a SPA);
  the Hiring API the SPA consumes is the documented, no-auth surface and is used here.
- D-3: The richest structured fields available per role are the ad's `title`,
  `description` (HTML), `createdAt`, `employmentType`, `department`, `location`,
  `remote`, and `applyUrl`. The opaque ad `id` (UUID) is the stable per-role ATS id.
- D-4: The job-ads search returns all active ads in one response; the adapter slices
  to `resultsWanted` deduped roles (de-dup by `atsId`), then fetches each role's
  detail object. A defensive page cap guards a future cursor-paginated variant.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all payloads are parsed with
  defensive object/array narrowing (multiple candidate keys per field) so wire drift
  never throws.

## 11. References

- `packages/plugins/source-ats-hibob/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + tenant addressing `{tenant}.careers.hibob.com/jobs` (per-role
    `/jobs/{id}`, apply `/jobs/{id}/apply`), confirmed with named real tenants
    `hibob-e360` and `dcbyte`.
  - Public Hiring API endpoints `POST /v1/hiring/job-ads/search` (active careers-page
    ads) and `GET /v1/hiring/job-ads/{id}`, documented as anonymous, with
    `jobAd/applyUrl` carrying the public apply link (apidocs.hibob.com). Byte-level
    wire envelope not observed (docs gated) → **verified=false**.
