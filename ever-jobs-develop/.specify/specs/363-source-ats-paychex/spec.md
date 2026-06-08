# Spec: 363 — Paychex ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 363                                           |
| Slug           | source-ats-paychex                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Paychex (paychex.com) is a US payroll / HR vendor whose recruiting and
applicant-tracking product, "Paychex Flex Hiring", lets each customer publish a
branded, public candidate careers site ("post jobs to their unique career
site"). Every customer tenant exposes its open roles on a hosted careers site
addressed by a company / board id (`https://{tenant}.applybypaychex.com/`), and
some front the same product under a Paychex Apply host (e.g.
`careers.paychex.com`, `apply.paychex.com`). The careers index is a
client-rendered app, but each role's detail page is server-rendered with
schema.org `JobPosting` JSON-LD for Google-for-Jobs, and the tenant's open roles
are enumerated by a public XML sitemap. Ever Jobs has no adapter for
Paychex-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Paychex adapter unlocks the full catalogue of Flex
Hiring–powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-paychex` plugin that ingests vacancies
  from **any** Paychex Flex Hiring career site given a `companySlug` (the tenant
  sub-domain / board label, e.g. `acme`) or a `companyUrl` (a careers URL on
  `applybypaychex.com`, or a known Paychex Apply host, used verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the tenant XML
  sitemap (`/sitemap.xml`) to enumerate open roles, plus each role's
  server-rendered detail page carrying schema.org `JobPosting` JSON-LD.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'paychex'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Paychex / Flex Hiring admin or recruiter API. This plugin
  consumes only the public candidate-facing surface.
- Server-side filtering by department / location / contract type (the careers
  site supports these facets). We ingest the tenant's full open-roles list and
  slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Paychex tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Paychex plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Paychex adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the careers host from `companySlug` (→ `{slug}.applybypaychex.com`) or from a `companyUrl` on `applybypaychex.com` / a known Paychex Apply host (origin used verbatim). | must |
| FR-2  | Fetch the public XML sitemap (`GET /sitemap.xml`) and enumerate `/job/{jobId}` open-role URLs.        | must     |
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
@SourcePlugin({ site: Site.PAYCHEX, name: 'Paychex', category: 'ats', isAts: true })
class PaychexService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://{tenant}.applybypaychex.com/sitemap.xml
  → <urlset> with one <url><loc>…/job/{jobId}/{slug}</loc>
      <lastmod>{ISO date}</lastmod></url> per open role.

GET https://{tenant}.applybypaychex.com/job/{jobId}/{slug}
  → HTML carrying a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Payroll Specialist",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20",
        "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "Acme Co" },
        "jobLocation": { "address": {
          "addressLocality": "Rochester", "addressRegion": "NY",
          "addressCountry": "US" } },
        "identifier": { "value": "111237587" },
        "jobLocationType": "TELECOMMUTE" }
    </script>
    (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| JSON-LD field                                          | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| job id from `<loc>` (`/job/{id}`) / `identifier`       | `atsId`, `id`           | `id` is prefixed `paychex-{atsId}`                          |
| `title` (else `og:title` / `<title>` leading segment)  | `title`                 | required; role skipped if absent                            |
| detail-page URL (else JSON-LD `url` / `og:url`)        | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| `description` (HTML) else `og:description` (plain)      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else sitemap `<lastmod>`)                 | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobLocation.address.{addressLocality,Region,Country}` | `location`              | city / state / country; null when none usable               |
| `jobLocationType` (`TELECOMMUTE`) / title / location    | `isRemote`              | remote detection (`remote` / `home-working` / `wfh` …)      |
| `industry`                                              | `department`            | when present                                                |
| `employmentType` (`FULL_TIME` → `Full Time`)            | `employmentType`        | schema.org enum normalised to a readable label              |
| `hiringOrganization.name` (else tenant slug)            | `companyName`           | de-slugified + title-cased                                  |
| —                                                       | `site`                  | constant `Site.PAYCHEX`                                     |
| —                                                       | `atsType`               | constant `'paychex'`                                        |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `acme`) → `https://acme.applybypaychex.com`.
- `companySlug` containing a careers / Paychex Apply host (a bare host) → used as the host.
- `companyUrl` whose hostname ends in `applybypaychex.com` (or is a known Paychex
  Apply host such as `careers.paychex.com` / `apply.paychex.com`) → its origin is
  used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/paychex.e2e-spec.ts`): known tenant (`companySlug: 'demo'`)
  returns shaped jobs (`site === Site.PAYCHEX`, `atsType === 'paychex'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised;
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  honoured. Network-tolerant (zero results is acceptable; shape assertions guarded
  by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PX-1 — Careers-site host.** Flex Hiring lets each customer publish its
  "unique career site"; some front it under a Paychex Apply host
  (`careers.paychex.com`, `apply.paychex.com`). **Default (proceeding):** expand a
  bare slug to `{slug}.applybypaychex.com`; a caller may pass a full `companyUrl`
  (or a bare host as `companySlug`) to address a custom host, which is used
  verbatim.
- **Q-PX-2 — App-rendered payload.** The careers index is a client-rendered app,
  so a no-JS HTML fetch returns only the app shell; the exact byte-level JSON-LD
  shape could not be confirmed without a JS runtime. **Default (proceeding):**
  parse the documented Google-for-Jobs `JobPosting` JSON-LD defensively
  (recursively walking arrays / `@graph`), with `og:` meta tags as fallbacks,
  treating any malformed or absent block as "no job" rather than a failure.
  Confidence: **unverified**.
- **Q-PX-3 — Job URL shape.** The crawlable / sitemap form is the path
  `/job/{id}[/{slug}]`. **Default (proceeding):** match
  `/job|jobs|career|careers|position|positions|opening|openings/{digits}` in
  `<loc>` entries; the numeric id is the stable ATS id.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant XML sitemap
  (`/sitemap.xml`) for role enumeration plus each role's server-rendered detail
  page carrying schema.org `JobPosting` JSON-LD. This mirrors the sibling
  schema.org ATS adapters (Hireful, ApplicantPro). **Confidence: unverified** —
  the platform (Paychex Flex Hiring, a public-facing recruiting / ATS product that
  publishes per-customer "unique career sites") and the Paychex Apply careers host
  were confirmed live 2026-06-03, but the per-tenant careers site is a
  client-rendered app so the rendered JSON-LD payload's byte-level shape could not
  be confirmed via a no-JS fetch; the parser is written defensively around the
  documented Google-for-Jobs pattern.
- D-2: There is no public, tenant-agnostic JSON list feed; the index is an app.
  The sitemap + per-role JSON-LD detail pages are the documented, no-auth,
  crawlable surface and are used here.
- D-3: The richest structured fields available per role are the JSON-LD `title`,
  `description` (HTML), `datePosted`, `employmentType`, `hiringOrganization.name`,
  and `jobLocation.address`. The job id (from the detail URL / `identifier`) is
  the stable per-role ATS id.
- D-4: The sitemap enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted` before fetching detail pages. De-dup is by `atsId`.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and
  `og:` meta fallbacks via bounded regexes — keeping the plugin dependency-free
  and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-paychex/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform confirmed: Paychex Flex Hiring is a public-facing recruiting / ATS
    product that lets each customer "post jobs to their unique career site"
    (paychex.com/hiring/recruiting-applicant-tracking). The Paychex Apply careers
    host (`careers.paychex.com` / `apply.paychex.com`) is confirmed live and
    serves browsable, public job listings + per-job detail pages by department.
  - The per-tenant Flex Hiring careers site is a client-rendered app; the rendered
    JSON-LD payload shape could not be confirmed via an unauthenticated no-JS
    fetch (verified=false). The parser is written defensively around the
    documented Google-for-Jobs `JobPosting` pattern.
