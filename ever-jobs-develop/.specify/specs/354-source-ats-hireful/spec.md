# Spec: 354 — Hireful ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 354                                           |
| Slug           | source-ats-hireful                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft), ApplicantPro (schema.org)   |

## 1. Problem Statement

Hireful (hireful.com / hireful.co.uk) is a UK ATS & recruitment-software vendor
whose candidate-facing product is the "LiveVacancies" careers portal. Every
customer tenant publishes a branded, public career site on its own sub-domain of
`livevacancies.co.uk` (`https://{tenant}.livevacancies.co.uk/`), and some front
the same portal under a custom careers host (e.g. `agency.hireful.com`,
`www.hirefulcareers.co.uk`). The jobs index is a client-rendered SPA, but each
role's detail page is server-rendered with schema.org `JobPosting` JSON-LD for
Google-for-Jobs, and the tenant's open roles are enumerated by a public XML
sitemap. Ever Jobs has no adapter for Hireful-powered career sites, so these
vacancies are currently un-ingestable. A single generic, multi-tenant Hireful
adapter unlocks the full catalogue of LiveVacancies-powered career sites with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hireful` plugin that ingests vacancies
  from **any** Hireful (LiveVacancies) career site given a `companySlug` (the
  tenant sub-domain label, e.g. `thebigissue`) or a `companyUrl` (a portal URL on
  `livevacancies.co.uk`, or a known custom careers host, used verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the tenant XML
  sitemap (`/sitemap.xml`) to enumerate open roles, plus each role's
  server-rendered detail page carrying schema.org `JobPosting` JSON-LD.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'hireful'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Hireful / LiveVacancies admin or recruiter API. This plugin
  consumes only the public candidate-facing surface.
- Server-side filtering by department / location / contract type (the portal
  supports these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Hireful tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Hireful plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Hireful adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the careers host from `companySlug` (→ `{slug}.livevacancies.co.uk`) or from a `companyUrl` on `livevacancies.co.uk` / a known custom careers host (origin used verbatim). | must |
| FR-2  | Fetch the public XML sitemap (`GET /sitemap.xml`) and enumerate `/vacancy/{vacancyId}` open-role URLs. | must |
| FR-3  | Fetch each role's detail page and parse its schema.org `JobPosting` JSON-LD (with `og:` meta fallbacks); use the vacancy id as `atsId`. | must |
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
@SourcePlugin({ site: Site.HIREFUL, name: 'Hireful', category: 'ats', isAts: true })
class HirefulService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://{tenant}.livevacancies.co.uk/sitemap.xml
  → <urlset> with one <url><loc>…/vacancy/{vacancyId}/{slug}</loc>
      <lastmod>{ISO date}</lastmod></url> per open role.

GET https://{tenant}.livevacancies.co.uk/vacancy/{vacancyId}/{slug}
  → HTML carrying a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Procurement Specialist",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20",
        "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "hireful Agency" },
        "jobLocation": { "address": {
          "addressLocality": "Birmingham", "addressRegion": "West Midlands",
          "addressCountry": "GB" } },
        "identifier": { "value": "111237587" },
        "jobLocationType": "TELECOMMUTE" }
    </script>
    (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| JSON-LD field                                          | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| vacancy id from `<loc>` (`/vacancy/{id}`) / `identifier` | `atsId`, `id`         | `id` is prefixed `hireful-{atsId}`                          |
| `title` (else `og:title` / `<title>` leading segment)  | `title`                 | required; role skipped if absent                            |
| detail-page URL (else JSON-LD `url` / `og:url`)         | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| `description` (HTML) else `og:description` (plain)      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else sitemap `<lastmod>`)                 | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobLocation.address.{addressLocality,Region,Country}` | `location`              | city / state / country; null when none usable               |
| `jobLocationType` (`TELECOMMUTE`) / title / location    | `isRemote`              | remote detection (`remote` / `home-working` / `wfh` …)      |
| `industry`                                              | `department`            | when present                                                |
| `employmentType` (`FULL_TIME` → `Full Time`)            | `employmentType`        | schema.org enum normalised to a readable label              |
| `hiringOrganization.name` (else tenant slug)            | `companyName`           | de-slugified + title-cased                                  |
| —                                                       | `site`                  | constant `Site.HIREFUL`                                     |
| —                                                       | `atsType`               | constant `'hireful'`                                        |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `thebigissue`) → `https://thebigissue.livevacancies.co.uk`.
- `companySlug` containing a portal / custom host (a bare host) → used as the host.
- `companyUrl` whose hostname ends in `livevacancies.co.uk` (or is a known custom
  careers host such as `agency.hireful.com` / `hirefulcareers.co.uk`) → its origin
  is used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/hireful.e2e-spec.ts`): known tenant
  (`companySlug: 'thebigissue'`) returns shaped jobs (`site === Site.HIREFUL`,
  `atsType === 'hireful'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HF-1 — Custom careers hosts.** Some tenants front the LiveVacancies portal
  under their own host (`agency.hireful.com`, `www.hirefulcareers.co.uk`).
  **Default (proceeding):** expand a bare slug to `{slug}.livevacancies.co.uk`; a
  caller may pass a full `companyUrl` (or a bare host as `companySlug`) to address
  a custom host, which is used verbatim.
- **Q-HF-2 — SPA-rendered payload.** The jobs index is a client-rendered SPA, so a
  no-JS HTML fetch returns only the app shell; the exact byte-level JSON-LD shape
  could not be confirmed without a JS runtime. **Default (proceeding):** parse the
  documented Google-for-Jobs `JobPosting` JSON-LD defensively (recursively walking
  arrays / `@graph`), with `og:` meta tags as fallbacks, treating any malformed or
  absent block as "no job" rather than a failure. Confidence: **unverified**.
- **Q-HF-3 — Vacancy URL shape.** LiveVacancies uses hashbang routing
  (`#!/vacancy/{id}`) in the SPA; the crawlable/sitemap form is the flattened path
  `/vacancy/{id}[/{slug}]`. **Default (proceeding):** match `/vacancy|vacancies|job|jobs/{digits}`
  in `<loc>` entries; the numeric id is the stable ATS id.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant XML sitemap
  (`/sitemap.xml`) for role enumeration plus each role's server-rendered detail
  page carrying schema.org `JobPosting` JSON-LD. This mirrors the sibling
  schema.org ATS adapter (ApplicantPro). **Confidence: unverified** — the platform,
  tenant host pattern (`{tenant}.livevacancies.co.uk`), and named real tenants were
  confirmed live 2026-06-03, but the portals are JS-rendered SPAs so the rendered
  JSON-LD payload's byte-level shape could not be confirmed via a no-JS fetch; the
  parser is written defensively around the documented Google-for-Jobs pattern.
- D-2: There is no public, tenant-agnostic JSON list feed; the index is a SPA.
  The sitemap + per-role JSON-LD detail pages are the documented, no-auth,
  crawlable surface and are used here.
- D-3: The richest structured fields available per role are the JSON-LD `title`,
  `description` (HTML), `datePosted`, `employmentType`, `hiringOrganization.name`,
  and `jobLocation.address`. The vacancy id (from the detail URL / `identifier`)
  is the stable per-role ATS id.
- D-4: The sitemap enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted` before fetching detail pages. De-dup is by `atsId`.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and
  `og:` meta fallbacks via bounded regexes — keeping the plugin dependency-free
  and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-hireful/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.livevacancies.co.uk` confirmed, with
    named real tenants: `thebigissue` (The Big Issue), `tkat` (TKAT),
    `hirefulagency` (hireful Agency), `planinternationaluk` (Plan International UK),
    `glide`, `transforminglearning`.
  - Custom careers hosts confirmed: `agency.hireful.com`, `www.hirefulcareers.co.uk`.
  - The portals are JS-rendered SPAs; the rendered JSON-LD payload shape could not
    be confirmed via an unauthenticated no-JS fetch (verified=false).
