# Spec: 349 — Arcoro ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 349                                           |
| Slug           | source-ats-arcoro                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 348 (ApplicantPro), 342 (Talentsoft)          |

## 1. Problem Statement

Arcoro (arcoro.com — its ATS/job-board engine was historically branded
"BirdDogHR") is a US construction / skilled-trades / blue-collar HR suite. Every
customer tenant publishes a branded, public career site on its own sub-domain of
`birddoghr.com` (`https://{tenant}.birddoghr.com/`), all served by the same
server-side ASP.NET MVC application; tenants without a vanity sub-domain are
served on the shared `https://jobs.ourcareerpages.com/` host. Each open role has
a public, unauthenticated, **server-rendered** detail page at `/job/{jobId}`.
Ever Jobs has no adapter for Arcoro-powered career sites, so these vacancies are
currently un-ingestable. A single generic, multi-tenant Arcoro adapter unlocks
the catalogue of Arcoro/BirdDogHR-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-arcoro` plugin that ingests vacancies
  from **any** Arcoro/BirdDogHR-powered career site given a `companySlug` (the
  tenant sub-domain label, e.g. `engineeringjobs`) or a `companyUrl` (any board
  URL on the `birddoghr.com` / `ourcareerpages.com` domain, whose origin is used
  verbatim — including a direct `/job/{id}` deep link).
- Use the **public, anonymous** server-rendered surface (no auth, no API key):
  enumerate `/job/{jobId}` links from the listing/sitemap, then parse each
  detail page (schema.org `JobPosting` JSON-LD preferred, then Open Graph meta
  tags, then visible HTML).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'arcoro'`, `employmentType`).

## 3. Non-Goals

- Any authenticated / partner-gated Arcoro / BirdDogHR REST API. Those require
  OAuth / partner credentials and are unsuitable for a generic, tenant-agnostic,
  unauthenticated scraper.
- Driving the client-rendered `/JobSearchAdvanced` search UI or its run-time row
  API; we harvest server-side `/job/{id}` links and parse detail pages instead.
- Server-side filtering by category / region (the board supports facet search).
  We ingest the tenant's full open-roles list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Arcoro tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Arcoro plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Arcoro adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the career host from `companySlug` (→ `{slug}.birddoghr.com`, or the shared host for `jobs`/`ourcareerpages`) or from a `companyUrl` on the `birddoghr.com` / `ourcareerpages.com` domain (origin used verbatim). | must |
| FR-2  | Enumerate `/job/{jobId}` links from the listing page (`/JobSearchAdvanced`, then `/`) and, as a fallback, the `/sitemap.xml`. | must |
| FR-3  | Honour a direct `/job/{id}` `companyUrl` deep link as the single role to fetch. | should |
| FR-4  | Parse each detail page, preferring a schema.org `JobPosting` JSON-LD block, then `og:*` meta tags, then the visible HTML title / location / employment-type lines. | must |
| FR-5  | Use the numeric job id as `atsId`; de-duplicate roles by `atsId` within a run. | must     |
| FR-6  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by fetching only that many detail pages.             | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed pages without throwing.           | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public detail pages only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | fetch at most `resultsWanted` detail pages |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ARCORO, name: 'Arcoro', category: 'ats', isAts: true })
class ArcoroService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03):

```
GET https://jobs.ourcareerpages.com/job/{jobId}
  → text/html (server-rendered), carrying:
    <title>{title} - {company} Jobs</title>
    <h1>{title}</h1>
    … "{City}, {ST} {ZIP}" location line …
    … "{employment type}" label …
    … full job-ad body …
  (some tenants additionally emit:)
    <script type="application/ld+json">{ "@type": "JobPosting", … }</script>
    <meta property="og:title" content="{title}">
    <meta property="og:description" content="{body}">
    <meta property="og:url" content="{canonical role url}">
```

Verified wire shape → `JobPostDto` mapping (`jobs.ourcareerpages.com`, 2026-06-03):

| Detail-page field                                  | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{jobId}` from `/job/{jobId}`                      | `atsId`, `id`           | `id` is prefixed `arcoro-{atsId}`                           |
| JSON-LD `title` / `og:title` / `<h1>` / `<title>` | `title`                 | required; role skipped if absent                            |
| `/job/{jobId}` URL                                 | `jobUrl`                | absolute public detail URL                                  |
| JSON-LD `url` / `og:url` (else `jobUrl`)          | `applyUrl`              | canonical / public role URL                                 |
| JSON-LD `description` (HTML) / `og:description`    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted` (ISO)                        | `datePosted`            | parsed → `YYYY-MM-DD`; null when absent                     |
| JSON-LD `jobLocation.address` / "City, ST ZIP"    | `location`              | `city` / `state` / `country`; null when none usable         |
| JSON-LD `jobLocationType` / title / body          | `isRemote`              | US remote detection (`remote` / `wfh` / `telecommute` …)    |
| JSON-LD `employmentType` / body label             | `employmentType`        | humanised ("FULL_TIME" → "Full Time"), else body match      |
| JSON-LD `hiringOrganization.name` (else tenant)   | `companyName`           | de-slugified + title-cased fallback from the host label     |
| —                                                  | `site`                  | constant `Site.ARCORO`                                      |
| —                                                  | `atsType`               | constant `'arcoro'`                                         |
| description text                                   | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `engineeringjobs`) → `https://engineeringjobs.birddoghr.com`.
- `companySlug` `jobs` / `ourcareerpages` → the shared `https://jobs.ourcareerpages.com` host.
- `companySlug` containing `birddoghr.com` / `ourcareerpages.com` (a bare host) → used as the host.
- `companyUrl` whose hostname ends in `birddoghr.com` / `ourcareerpages.com` →
  its origin is used verbatim; a `/job/{id}` path is honoured as a deep link.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no `/job/{id}` links |
| logged warn (HTTP 4xx)       | unknown / disabled tenant board / closed role — degrades to empty, never throws |
| logged warn (parse failure)  | malformed page or per-role map error — partial, never throws             |

## 8. Test Plan

- E2E (`__tests__/arcoro.e2e-spec.ts`): known tenant
  (`companySlug: 'engineeringjobs'`) returns shaped jobs (`site === Site.ARCORO`,
  `atsType === 'arcoro'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AR-1 — Listing is client-rendered.** The `/JobSearchAdvanced` page fetches
  its rows at run time, so it carries no guaranteed server-side job links.
  **Default (proceeding):** enumerate `/job/{id}` links defensively from the
  listing HTML and the `/` landing page, then the `/sitemap.xml`; a caller may
  also pass a direct `/job/{id}` `companyUrl` deep link.
- **Q-AR-2 — JSON-LD availability varies.** Not every tenant emits a schema.org
  `JobPosting` block. **Default (proceeding):** prefer JSON-LD when present, then
  fall back to `og:*` meta tags and the visible HTML title / "City, ST ZIP" /
  employment-type lines (never fabricated).
- **Q-AR-3 — Shared vs vanity host.** Some tenants use a vanity
  `{tenant}.birddoghr.com` sub-domain; others are served on the shared
  `jobs.ourcareerpages.com` host. **Default (proceeding):** build
  `{slug}.birddoghr.com` from a bare slug, route the `jobs`/`ourcareerpages`
  slugs to the shared host, and accept either domain on a full `companyUrl`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, server-rendered detail page at
  `https://{host}/job/{jobId}`. Verified live 2026-06-03 against the shared
  career-pages host: `https://jobs.ourcareerpages.com/job/77551` → HTTP 200 HTML
  ("Mid-Market Software Sales Representative", company "BirdDogHR", "Atlanta, GA
  30313", "full-time, exempt") and `…/job/62256` → HTTP 200 HTML
  ("Implementation & Support Specialist", "Urbandale, IA 50322"). **Confidence:
  verified** (detail-page surface + field set confirmed live; JSON-LD path
  designed defensively as tenant-dependent).
- D-2: The listing/search page is client-rendered, so role enumeration harvests
  `/job/{id}` links from the listing/landing HTML and the sitemap rather than
  driving the search UI. A direct `/job/{id}` `companyUrl` is honoured.
- D-3: Detail parsing prefers a schema.org `JobPosting` JSON-LD block (richest
  structured source), then Open Graph meta tags, then the visible HTML — so the
  adapter degrades gracefully across tenants with differing markup.
- D-4: The numeric job id (`/job/{id}`) is the stable per-role ATS id; roles are
  de-duplicated by `atsId` and the detail-page set is bounded to `resultsWanted`.
- D-5: HTML / JSON-LD is parsed with bounded, defensive regexes + `JSON.parse`
  rather than a heavyweight DOM/XML dependency, keeping the plugin dependency-free
  and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-arcoro/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `https://jobs.ourcareerpages.com/job/77551` → HTTP 200 server-rendered HTML
    ("Mid-Market Software Sales Representative", BirdDogHR, Atlanta GA).
  - `https://jobs.ourcareerpages.com/job/62256` → HTTP 200 server-rendered HTML
    ("Implementation & Support Specialist", Urbandale IA).
  - Tenant career centers on the `{tenant}.birddoghr.com` host pattern:
    `jobs`, `engineeringjobs`, `procoreconstructionjobboard`, `agciajobs`,
    `agcksjobs`.
