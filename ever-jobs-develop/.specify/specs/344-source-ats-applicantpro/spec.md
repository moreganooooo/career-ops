# Spec: 344 — ApplicantPro ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 344                                           |
| Slug           | source-ats-applicantpro                       |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 301 (Niceboard)            |

## 1. Problem Statement

ApplicantPro (applicantpro.com) is a US small/medium-business applicant-tracking
system. Every customer tenant publishes a branded, public, unauthenticated job
board on its own sub-domain (`https://{tenant}.applicantpro.com/jobs/`). Ever
Jobs has no adapter for ApplicantPro-powered career pages, so these vacancies
are currently un-ingestable. A single generic, multi-tenant ApplicantPro adapter
unlocks the full catalogue of ApplicantPro-powered boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-applicantpro` plugin that ingests
  vacancies from **any** ApplicantPro-powered job board given a `companySlug`
  (the tenant board sub-domain label, e.g. `pharrtx`) or a `companyUrl` (a board
  URL whose first sub-domain label is the tenant).
- Use the **public, anonymous** surface (no auth, no API key): the tenant XML
  sitemap (`/sitemap.xml`) to enumerate open roles, and each role's
  server-rendered detail page (`/jobs/{jobId}.html`) for its structured
  metadata.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'applicantpro'`, `department`).

## 3. Non-Goals

- Any authenticated ApplicantPro admin / recruiter API.
- Driving the client-rendered listing page's internal, run-time-computed data
  API. We enumerate roles via the stable public sitemap instead.
- Server-side filtering by category / department / location. We ingest the
  tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of ApplicantPro tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ApplicantPro plugin at a
> tenant's board slug, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the ApplicantPro adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant token from `companySlug` (preferred), or from the first sub-domain label of `companyUrl` (else an `/openings/{tenant}/…` path segment). | must |
| FR-2  | Fetch the tenant sitemap (`GET /sitemap.xml`) and extract every `/jobs/{jobId}.html` open-role URL (with `<lastmod>`). | must |
| FR-3  | Fetch each role's detail page (`GET /jobs/{jobId}.html`) and parse its structured metadata. | must |
| FR-4  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by limiting the detail-page fetches. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 4xx), missing sitemaps, closed roles (404), and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public sitemap + detail pages    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | limit detail fetches to `resultsWanted` |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.APPLICANTPRO, name: 'ApplicantPro', category: 'ats', isAts: true })
class ApplicantProService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `pharrtx` /
`communitybridge`):

```
GET https://{tenant}.applicantpro.com/sitemap.xml
  → <urlset>
      <url><loc>https://{tenant}.applicantpro.com/jobs/</loc> …</url>
      <url><loc>https://{tenant}.applicantpro.com/jobs/{jobId}.html</loc>
           <lastmod>2026-05-04 13:49:50</lastmod> …</url>
      …
    </urlset>

GET https://{tenant}.applicantpro.com/jobs/{jobId}.html
  → HTML carrying:
      <title>{title} - {city}, {state} - {company} Jobs</title>
      <meta property="og:title"   content="{title} - {city}, {state}">
      <meta property="og:url"      content="https://www.applicantpro.com/openings/{tenant}/jobs/{jobId}/{state-slug}/{city}/{title-slug}">
      <meta property="og:description" content="Company: {company}…{body}">
      <meta name="keywords"        content="{title}, {city}, {state}, {country}, {department}">
    + inline JobDetail mount object:
      { domainTitle: "{company}", jobListingId: {jobId},
        jobInfo: { mdiCalendar: "Posted 06-Feb-2019 (EST)",
                   mdiMapMarker: "Washington, DC, USA",
                   mdiInbox: "Full Time" } }
```

Verified wire shape → `JobPostDto` mapping (`communitybridge`, Community Bridge,
2026-06-03):

| Source field                                          | JobPostDto field        | Notes                                                   |
| ----------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| sitemap `/jobs/{jobId}.html` (`jobId`)                | `atsId`, `id`           | `id` is prefixed `applicantpro-{atsId}`                 |
| `og:title` head (else keywords[0] / `<title>` head)   | `title`                 | required; job skipped if absent                         |
| sitemap `<loc>` URL                                   | `jobUrl`                | absolute detail / apply URL                             |
| `og:url` canonical (`/openings/{tenant}/jobs/{id}/…`) | `applyUrl`              | canonical apply URL, falls back to `jobUrl`             |
| `og:description` (plain body)                         | `description`           | format-converted (HTML / Markdown / Plain)              |
| `jobInfo.mdiCalendar` "Posted …" (else `<lastmod>`)   | `datePosted`            | parsed → `YYYY-MM-DD`                                    |
| `jobInfo.mdiMapMarker` (else keywords city/state/country) | `location`          | `city` / `state` / `country`                            |
| location / title / employment-type / body text       | `isRemote`              | `remote` / `work from home` / `telecommute` / `wfh`     |
| keywords trailing segment                             | `department`            | org-unit / department label                             |
| `jobInfo.mdiInbox`                                    | `employmentType`        | free-text label (e.g. "Full Time")                      |
| `JobDetail` mount `domainTitle`                       | `companyName`           | falls back to tenant-derived name                       |
| —                                                     | `site`                  | constant `Site.APPLICANTPRO`                            |
| —                                                     | `atsType`               | constant `'applicantpro'`                               |
| `description` text                                    | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` → used verbatim as the board sub-domain label (e.g. `pharrtx`).
- `companyUrl` → first sub-domain label of `{tenant}.applicantpro.com` (skips
  `www`), else an `/openings/{tenant}/…` path segment, else the trailing path
  segment.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), missing sitemap, or zero open-role entries |
| logged warn (HTTP 4xx)       | unknown/dead tenant, missing sitemap, or closed role (detail 404) — degrades to empty/partial, never throws |
| logged warn (parse failure)  | malformed sitemap / detail page or per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/applicantpro.e2e-spec.ts`): known tenant
  (`companySlug: 'pharrtx'`) returns shaped jobs (`site === Site.APPLICANTPRO`,
  `atsType === 'applicantpro'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AP-1 — Client-rendered listing page.** The board's `/jobs/` index is
  rendered client-side (a Vue web component fetching rows from an internal,
  run-time-computed API), so it carries no server-side job links. **Default
  (proceeding):** enumerate roles from the stable public XML sitemap
  (`/sitemap.xml`), which lists every open `/jobs/{id}.html`, rather than driving
  the undocumented internal listing API.
- **Q-AP-2 — Description fidelity.** The detail page exposes the body as a
  plain-text `og:description` blob (a richer in-body HTML block also exists but
  is markup-variable across tenants). **Default (proceeding):** use the
  `og:description` plain-text body, format-converting it per
  `descriptionFormat`; HTML is preferred when a clean HTML body is available.
- **Q-AP-3 — Posted-date precision.** `jobInfo.mdiCalendar` carries a
  `DD-Mon-YYYY` posted date with a timezone label; the sitemap `<lastmod>` is a
  fallback. **Default (proceeding):** prefer the posted date, fall back to
  `<lastmod>`, normalise to `YYYY-MM-DD`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant XML sitemap
  (`https://{tenant}.applicantpro.com/sitemap.xml`) plus the server-rendered
  detail pages (`/jobs/{jobId}.html`). Verified live 2026-06-03:
  `pharrtx` sitemap → HTTP 200 `text/xml` enumerating `/jobs/{id}.html` rows;
  `communitybridge/jobs/995117.html` → HTTP 200 HTML with `og:*`, `keywords`,
  and the inline `JobDetail` mount object. **Confidence: verified**
  (byte-confirmed sitemap rows + detail-page metadata).
- D-2: The board listing page is client-rendered (a Vue web component whose data
  comes from an internal, run-time-computed "courier" API); it is **not** used.
  The sitemap is the stable, crawlable enumeration surface (also referenced from
  the tenant `robots.txt`).
- D-3: The richest structured fields come from the detail page's Open Graph
  meta, the `keywords` meta (title / city / state / country / department), and
  the inline `JobDetail` mount object (`domainTitle` = company,
  `jobInfo.mdiCalendar` = posted date, `jobInfo.mdiMapMarker` = location,
  `jobInfo.mdiInbox` = employment type).
- D-4: The sitemap lists every open role in one document (no server-side
  pagination of the job set); the adapter limits detail-page fetches to
  `resultsWanted` and de-dups by `atsId`. A closed role's detail page 404s and
  is skipped without failing the run.

## 11. References

- `packages/plugins/source-ats-applicantpro/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `https://pharrtx.applicantpro.com/sitemap.xml` (City of Pharr, TX) → HTTP 200
    `text/xml` enumerating `/jobs/{id}.html` open-role URLs.
  - `https://communitybridge.applicantpro.com/jobs/995117.html` (Community
    Bridge) → HTTP 200 HTML with `og:title`/`og:url`/`og:description`,
    `meta[keywords]`, and the inline `JobDetail` mount object.
  - Tenant `robots.txt` advertises the sitemap surface.
