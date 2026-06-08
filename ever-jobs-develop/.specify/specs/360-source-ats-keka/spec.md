# Spec: 360 — Keka ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 360                                           |
| Slug           | source-ats-keka                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Keka (keka.com) is an India-based HR + payroll + hiring suite whose hiring
product ("Keka Hire") gives every customer tenant a branded, public candidate
career site on its own sub-domain of `keka.com` (`https://{tenant}.keka.com/careers/`).
The jobs index is a client-rendered SPA backed by a public, unauthenticated
published-jobs JSON feed, and each role additionally has a server-rendered detail
page (`/careers/jobdetails/{jobId}`) pre-rendered with schema.org `JobPosting`
JSON-LD for Google-for-Jobs. Ever Jobs has no adapter for Keka-powered career
sites, so these vacancies are currently un-ingestable. A single generic,
multi-tenant Keka adapter unlocks the full catalogue of Keka-powered career sites
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-keka` plugin that ingests vacancies
  from **any** Keka career site given a `companySlug` (the tenant sub-domain
  label, e.g. `algoworks`) or a `companyUrl` (a portal URL on `keka.com`, used
  verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the tenant
  published-jobs JSON feed to enumerate open roles, plus each role's
  server-rendered detail page carrying schema.org `JobPosting` JSON-LD for
  enrichment.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'keka'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Keka / Keka Hire admin or recruiter API
  (`developers.keka.com`, `/v1/hire/jobs`, …). This plugin consumes only the
  public candidate-facing surface.
- Server-side filtering by department / location / contract type (the portal
  supports these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Keka tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Keka plugin at a tenant's
> careers slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Keka adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the careers host from `companySlug` (→ `{slug}.keka.com`) or from a `companyUrl` on `keka.com` (origin used verbatim). | must |
| FR-2  | Fetch the public published-jobs JSON feed (`GET /k/careers/api/mwf/careers/jobs`, alias paths probed in order) and enumerate open roles. | must |
| FR-3  | Normalise each feed job; when its company name (or HTML body) is missing, enrich it from the role's detail-page schema.org `JobPosting` JSON-LD (with `og:` fallbacks); use the job id as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated role set before any detail enrichment fetch. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON payloads without throwing. | must  |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public jobs feed + detail pages  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.KEKA, name: 'Keka', category: 'ats', isAts: true })
class KekaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://{tenant}.keka.com/k/careers/api/mwf/careers/jobs   (alias paths probed in order)
  → { data: [ { id|jobId: 41450, title: "Senior Engineer",
        jobDescription: "<p>…HTML body…</p>",
        city|location: "Noida", state: "Uttar Pradesh", country: "India",
        department: "Engineering", employmentType: "Full Time",
        isRemote: false, postedDate: "2026-05-20T…",
        jobDetailUrl: "…/careers/jobdetails/41450" }, … ] }

GET https://{tenant}.keka.com/careers/jobdetails/{jobId}   (enrichment / fallback)
  → HTML carrying a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Senior Engineer",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20",
        "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "Algoworks" },
        "jobLocation": { "address": {
          "addressLocality": "Noida", "addressRegion": "Uttar Pradesh",
          "addressCountry": "IN" } },
        "identifier": { "value": "41450" },
        "jobLocationType": "TELECOMMUTE" }
    </script>
    (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| Source field                                            | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| feed `id`/`jobId`/`identifier` (else JSON-LD `identifier`) | `atsId`, `id`        | `id` is prefixed `keka-{atsId}`                            |
| feed `title` (else JSON-LD `title` / `og:title` leading) | `title`                | required; role skipped if absent                            |
| feed `jobDetailUrl`/`url` (else `/careers/jobdetails/{id}`) | `jobUrl`, `applyUrl` | absolute public detail / apply URL                          |
| feed `jobDescription` (HTML) else JSON-LD `description`  | `description`           | format-converted (HTML / Markdown / Plain)                  |
| feed `postedDate`/`createdDate` (else JSON-LD `datePosted`) | `datePosted`         | parsed → `YYYY-MM-DD`                                        |
| feed `city`/`location`/`state`/`country` (else JSON-LD address) | `location`         | city / state / country; null when none usable               |
| feed `isRemote` / `jobLocationType` / title / location   | `isRemote`              | remote detection (`remote` / `wfh` / `work from home` …)    |
| feed `department` (else JSON-LD `industry`)              | `department`            | when present                                                |
| feed `employmentType` (`FULL_TIME` → `Full Time`)        | `employmentType`        | enum normalised to a readable label                         |
| JSON-LD `hiringOrganization.name` (else tenant slug)     | `companyName`           | de-slugified + title-cased                                  |
| —                                                       | `site`                  | constant `Site.KEKA`                                       |
| —                                                       | `atsType`               | constant `'keka'`                                           |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `algoworks`) → `https://algoworks.keka.com`.
- `companySlug` containing a bare host (e.g. `algoworks.keka.com`) → used as the host.
- `companyUrl` whose hostname is / ends in `keka.com` → its origin is used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant or feed path — degrades to empty, never throws   |
| logged warn (parse failure)  | malformed page / non-JSON payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/keka.e2e-spec.ts`): known tenant (`companySlug: 'algoworks'`)
  returns shaped jobs (`site === Site.KEKA`, `atsType === 'keka'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-KK-1 — Feed path.** Keka's careers SPA loads its open roles over a public
  JSON feed; the exact path has varied across tenant versions.
  **Default (proceeding):** probe a small ordered list of documented paths
  (`/k/careers/api/mwf/careers/jobs`, `/careersapi/published-jobs`,
  `/careers/api/jobs`) and use the first that yields roles.
- **Q-KK-2 — SPA-rendered payload.** The jobs index is a client-rendered SPA, so a
  no-JS HTML fetch returns only the app shell; the exact byte-level JSON feed
  shape could not be confirmed without a JS runtime. **Default (proceeding):**
  parse the documented feed shape defensively (bare array or
  `{ data | jobs | result | records }` envelope, with cross-tenant field
  aliases), and enrich from each role's schema.org `JobPosting` JSON-LD when a
  company name / HTML body is missing, treating any malformed or absent payload
  as "no job" rather than a failure. Confidence: **unverified**.
- **Q-KK-3 — Detail URL shape.** Confirmed live: roles are addressed at
  `/careers/jobdetails/{jobId}` (e.g. `algoworks.keka.com/careers/jobdetails/41450`).
  **Default (proceeding):** prefer the feed-advertised `jobDetailUrl`; otherwise
  synthesise `{host}/careers/jobdetails/{jobId}`. The numeric job id is the stable
  ATS id.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant published-jobs JSON feed
  for role enumeration plus each role's server-rendered detail page carrying
  schema.org `JobPosting` JSON-LD for enrichment. This mirrors the sibling
  schema.org ATS adapters (Hireful, ApplicantPro). **Confidence: unverified** —
  the platform, tenant host pattern (`{tenant}.keka.com/careers/`), and the real
  detail-page URL shape (`/careers/jobdetails/{jobId}`) were confirmed live
  2026-06-03, but the career site is a JS-rendered SPA so the rendered JSON feed's
  byte-level shape could not be confirmed via a no-JS fetch; the parser is written
  defensively around the documented patterns.
- D-2: There is no public, tenant-agnostic admin JSON API without auth; the index
  is a SPA. The published-jobs feed + per-role JSON-LD detail pages are the
  documented, no-auth, crawlable surface and are used here.
- D-3: The richest structured fields per role come from the feed (`title`,
  `jobDescription`, location parts, `department`, `employmentType`, `postedDate`),
  enriched by the JSON-LD `hiringOrganization.name`. The job id (from the feed /
  detail URL / `identifier`) is the stable per-role ATS id.
- D-4: The feed enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted` before any detail enrichment fetch. De-dup is by `atsId`.
- D-5: The feed is parsed with a defensive envelope-unwrap + field-alias narrowing
  (no DTO coupling), and the detail page with a bounded `application/ld+json`
  block scan + recursive `@type === JobPosting` search (tolerating arrays /
  `@graph`) and `og:` meta fallbacks — keeping the plugin dependency-free and
  resilient to minor payload drift.

## 11. References

- `packages/plugins/source-ats-keka/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.keka.com/careers/` confirmed, with
    the real detail-page URL shape `{tenant}.keka.com/careers/jobdetails/{jobId}`
    (live example `algoworks.keka.com/careers/jobdetails/41450`). Real tenants on
    the platform include `algoworks`, `turno`, `adda247`.
  - The career site is a JS-rendered SPA; the rendered published-jobs JSON feed's
    byte-level shape could not be confirmed via an unauthenticated no-JS fetch
    (verified=false).
