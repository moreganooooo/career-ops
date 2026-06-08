# Spec: 358 — Namely ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 358                                           |
| Slug           | source-ats-namely                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Namely (namely.com) is a US all-in-one HR, payroll, benefits & recruiting
platform. Every customer tenant is addressed by its own sub-domain of
`namely.com` (`https://{tenant}.namely.com`) and publishes a branded, public
candidate-facing career site under it (`/careersite`). The jobs index is a
client-rendered SPA, but each role's detail page is server-rendered with
schema.org `JobPosting` JSON-LD for Google-for-Jobs, and the tenant's open roles
are enumerated by a public XML sitemap. Namely's documented JSON job/recruiting
API is OAuth-gated, so it is out of scope. Ever Jobs has no adapter for
Namely-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Namely adapter unlocks the full catalogue of
Namely-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-namely` plugin that ingests vacancies
  from **any** Namely career site given a `companySlug` (the tenant sub-domain
  label, e.g. `acme`) or a `companyUrl` (a career-site URL on `namely.com`, used
  verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the tenant XML
  sitemap (`/sitemap.xml`) to enumerate open roles, plus each role's
  server-rendered detail page carrying schema.org `JobPosting` JSON-LD.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'namely'`, `department`, `employmentType`).

## 3. Non-Goals

- Namely's authenticated, OAuth-gated job/recruiting REST API
  (`developers.namely.com`). This plugin consumes only the public candidate-facing
  surface.
- Server-side filtering by department / location / contract type (the career site
  supports these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Namely tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Namely plugin at a tenant's
> careers slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Namely adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the career-site host from `companySlug` (→ `{slug}.namely.com`) or from a `companyUrl` on `namely.com` (origin used verbatim). | must |
| FR-2  | Fetch the public XML sitemap (`GET /sitemap.xml`) and enumerate `/careersite/job/{jobId}` open-role URLs. | must |
| FR-3  | Fetch each role's detail page and parse its schema.org `JobPosting` JSON-LD (with `og:` meta fallbacks); use the job id as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated role set before fetching details. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON JSON-LD without throwing. | must  |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public sitemap + detail pages    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.NAMELY, name: 'Namely', category: 'ats', isAts: true })
class NamelyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://{tenant}.namely.com/sitemap.xml
  → <urlset> with one <url><loc>…/careersite/job/{jobId}/{slug}</loc>
      <lastmod>{ISO date}</lastmod></url> per open role.

GET https://{tenant}.namely.com/careersite/job/{jobId}/{slug}
  → HTML carrying a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Account Executive",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20",
        "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "Acme Inc" },
        "jobLocation": { "address": {
          "addressLocality": "New York", "addressRegion": "NY",
          "addressCountry": "US" } },
        "identifier": { "value": "111237587" },
        "jobLocationType": "TELECOMMUTE" }
    </script>
    (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| JSON-LD field                                          | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| job id from `<loc>` (`/job/{id}`) / `identifier`       | `atsId`, `id`           | `id` is prefixed `namely-{atsId}`                          |
| `title` (else `og:title` / `<title>` leading segment)  | `title`                 | required; role skipped if absent                            |
| detail-page URL (else JSON-LD `url` / `og:url`)         | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| `description` (HTML) else `og:description` (plain)      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else sitemap `<lastmod>`)                 | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobLocation.address.{addressLocality,Region,Country}` | `location`              | city / state / country; null when none usable               |
| `jobLocationType` (`TELECOMMUTE`) / title / location    | `isRemote`              | remote detection (`remote` / `home-working` / `wfh` …)      |
| `industry`                                              | `department`            | when present                                                |
| `employmentType` (`FULL_TIME` → `Full Time`)            | `employmentType`        | schema.org enum normalised to a readable label              |
| `hiringOrganization.name` (else tenant slug)            | `companyName`           | de-slugified + title-cased                                  |
| —                                                       | `site`                  | constant `Site.NAMELY`                                     |
| —                                                       | `atsType`               | constant `'namely'`                                        |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `acme`) → `https://acme.namely.com`.
- `companySlug` containing a bare host (e.g. `acme.namely.com`) → used as the host.
- `companyUrl` whose hostname is / ends in `namely.com` → its origin is used
  verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/namely.e2e-spec.ts`): known tenant (`companySlug`) returns
  shaped jobs (`site === Site.NAMELY`, `atsType === 'namely'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty;
  unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-NM-1 — Career-site URL shape.** Namely's candidate career site lives under
  `/careersite` on the tenant sub-domain; detail pages are addressed as
  `/careersite/job/{id}[/{slug}]`. **Default (proceeding):** expand a bare slug to
  `{slug}.namely.com`; a caller may pass a full `companyUrl` (or a bare host as
  `companySlug`) to address a tenant verbatim. The job-URL regex matches
  `/(careersite/)?(job|jobs|posting|postings)/{digits}` in `<loc>` entries.
- **Q-NM-2 — SPA-rendered payload.** The jobs index is a client-rendered SPA, so a
  no-JS HTML fetch returns only the app shell; the exact byte-level JSON-LD shape
  could not be confirmed without a JS runtime. **Default (proceeding):** parse the
  documented Google-for-Jobs `JobPosting` JSON-LD defensively (recursively walking
  arrays / `@graph`), with `og:` meta tags as fallbacks, treating any malformed or
  absent block as "no job" rather than a failure. Confidence: **unverified**.
- **Q-NM-3 — OAuth-gated API.** Namely documents a JSON job/recruiting API at
  `developers.namely.com`, but it requires OAuth. **Default (proceeding):** ignore
  the authenticated API entirely; consume only the anonymous candidate-facing
  career site (sitemap + per-role JSON-LD detail pages).

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant XML sitemap
  (`/sitemap.xml`) for role enumeration plus each role's server-rendered detail
  page carrying schema.org `JobPosting` JSON-LD. This mirrors the sibling
  schema.org ATS adapters (Hireful, ApplicantPro). **Confidence: unverified** —
  the platform and tenant host pattern (`{tenant}.namely.com`) were confirmed live
  2026-06-03, but the career sites are JS-rendered SPAs so the rendered JSON-LD
  payload's byte-level shape could not be confirmed via a no-JS fetch; the parser
  is written defensively around the documented Google-for-Jobs pattern.
- D-2: Namely's documented JSON job/recruiting API is OAuth-gated, so there is no
  public, tenant-agnostic anonymous JSON list feed; the candidate index is a SPA.
  The sitemap + per-role JSON-LD detail pages are the documented, no-auth,
  crawlable surface and are used here.
- D-3: The richest structured fields available per role are the JSON-LD `title`,
  `description` (HTML), `datePosted`, `employmentType`, `hiringOrganization.name`,
  and `jobLocation.address`. The job id (from the detail URL / `identifier`) is the
  stable per-role ATS id.
- D-4: The sitemap enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted` before fetching detail pages. De-dup is by `atsId`.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and
  `og:` meta fallbacks via bounded regexes — keeping the plugin dependency-free
  and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-namely/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.namely.com` confirmed (Namely
    addresses every company by its own sub-domain of `namely.com`, each publishing
    a public candidate-facing career site under it).
  - Namely's documented JSON job/recruiting API (`developers.namely.com`) is
    OAuth-gated and therefore out of scope.
  - The career sites are JS-rendered SPAs; the rendered JSON-LD payload shape could
    not be confirmed via an unauthenticated no-JS fetch (verified=false).
