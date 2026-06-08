# Spec: 347 — ApplicantStack ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 347                                           |
| Slug           | source-ats-applicantstack                     |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft), ApplicantPro (schema/HTML)  |

## 1. Problem Statement

ApplicantStack (applicantstack.com, owned by SwipeClock / WorkforceHub) is a US
small/medium-business applicant-tracking system. Every customer tenant publishes
a branded, public, unauthenticated job board on its own sub-domain at
`https://{tenant}.applicantstack.com/x/openings` — a server-rendered HTML table
of open roles, each linking to a `/x/detail/{jobId}` page that carries the full
job-ad body. Ever Jobs has no adapter for ApplicantStack-powered career sites, so
these vacancies are currently un-ingestable. A single generic, multi-tenant
ApplicantStack adapter unlocks the full catalogue of ApplicantStack-powered
career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-applicantstack` plugin that ingests
  vacancies from **any** ApplicantStack-powered career site given a
  `companySlug` (the tenant sub-domain label, e.g. `atwork443`) or a `companyUrl`
  (any board URL whose first sub-domain label is the tenant).
- Use the **public, anonymous, server-rendered openings table** (no auth, no API
  key) served at `https://{tenant}.applicantstack.com/x/openings`, enriching each
  surfaced role from its `/x/detail/{jobId}` page.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'applicantstack'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated ApplicantStack / SwipeClock / WorkforceHub recruiter or
  candidate API. Those are credentialed and unsuitable for a generic,
  tenant-agnostic, unauthenticated scraper.
- Server-side filtering by category / city / industry (the openings table
  supports client-side sort columns only). We ingest the tenant's full open-roles
  table and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation (the apply
  form at `/x/apply/{jobId}` is surfaced as `applyUrl` only).
- A curated seed list of ApplicantStack tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ApplicantStack plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the ApplicantStack adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (→ `{slug}.applicantstack.com`) or from a `companyUrl` on the `applicantstack.com` domain (first non-`www` sub-domain label). | must |
| FR-2  | Fetch the public openings index (`GET /x/openings`) and parse its `<table>` rows into open roles. | must |
| FR-3  | Extract the opaque `{jobId}` from each row's `/x/detail/{jobId}` anchor as `atsId`.                 | must     |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Enrich each surfaced role from its detail page (`/x/detail/{jobId}`) — full body, company, summary fields. | should |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the single-table listing.                 | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), retired-board placeholders, network errors, and parse failures without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public openings table only        |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`; detail fetches capped at `resultsWanted` |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.APPLICANTSTACK, name: 'ApplicantStack', category: 'ats', isAts: true })
class ApplicantStackService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `atwork443`):

```
GET https://atwork443.applicantstack.com/x/openings
  → text/html — sortable listings table:
    <thead><tr>
      <th>Title</th><th>Date Posted</th>
      <th>Industry - Job Category</th><th>City</th>
    </tr></thead>
    <tbody>
      <tr class="oddrow">
        <td><a href="https://atwork443.applicantstack.com/x/detail/a2v6venn6ji9">Account Manager</a></td>
        <td>03/12/2026</td>
        <td>Professional Services</td>
        <td>Riverside</td>
      </tr>
      … (~404 rows for At Work Group) …
    </tbody>

GET https://atwork443.applicantstack.com/x/detail/a2v6venn6ji9
  → text/html:
    <title>Account Manager - AtWork Personnel</title>
    <meta property="og:title"       content="At Work Group - Account Manager">
    <meta property="og:description"  content="Account Manager at At Work Group">
    <meta property="og:site_name"    content="At Work Group - Account Manager">
    <table> … <th>ID:</th><td class="noinput">56380612782CBH</td> …
              <th>Date Posted:</th><td>03/12/2026</td>
              <th>City:</th><td>Riverside</td> … </table>
    <div class="listing_description"><h2>Job post summary</h2> … full HTML body … </div>
    (apply form at /x/apply/a2v6venn6ji9)
```

Verified wire shape → `JobPostDto` mapping (`atwork443`, At Work Group, 2026-06-03):

| Source field                                       | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{jobId}` from `/x/detail/{jobId}` anchor          | `atsId`, `id`           | `id` is prefixed `applicantstack-{atsId}`                   |
| detail anchor link text (table) / `og:title`       | `title`                 | required; role skipped if absent                            |
| `…/x/detail/{jobId}`                               | `jobUrl`                | absolute public detail URL                                  |
| `…/x/apply/{jobId}`                                | `applyUrl`              | derived from the detail URL                                 |
| `<div class="listing_description">` (HTML body)    | `description`           | format-converted (HTML / Markdown / Plain); `og:description` fallback |
| "Date Posted" cell / detail summary `MM/DD/YYYY`   | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| "City" cell / detail summary                       | `location`              | surfaced as `city` (and `state` when a `City, ST` pair)     |
| "Industry - Job Category" (leading "{Industry}")   | `department`            | leading segment of the column                               |
| Full/Part-time hint mined from title / body        | `employmentType`        | matched against a known employment-type set; null when none |
| title / city / category / body text                | `isRemote`              | remote detection (`remote` / `wfh` / `telecommute` / …)     |
| `og:site_name` / `<title>` tail / tenant slug      | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                  | `site`                  | constant `Site.APPLICANTSTACK`                              |
| —                                                  | `atsType`               | constant `'applicantstack'`                                 |
| description text                                   | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `atwork443`) → `https://atwork443.applicantstack.com`.
- `companySlug` containing `applicantstack.com` (a bare host) → first non-`www`
  label is the tenant.
- `companyUrl` whose hostname ends in `applicantstack.com` → its first non-`www`
  sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), retired board, or no rows |
| logged warn (HTTP 4xx)       | unknown / disabled board — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page or per-role map error — partial result, never throws      |

## 8. Test Plan

- E2E (`__tests__/applicantstack.e2e-spec.ts`): known tenant
  (`companySlug: 'atwork443'`) returns shaped jobs (`site === Site.APPLICANTSTACK`,
  `atsType === 'applicantstack'`, `atsId`/`jobUrl` defined); `companyUrl`
  resolution path exercised; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on
  network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AS-1 — JSON-LD absence.** The detail pages carry `og:` metadata and a
  server-rendered summary table but **no** schema.org `JobPosting` JSON-LD.
  **Default (proceeding):** parse the openings table (authoritative for title /
  date / category / city) and the detail page's summary table + `listing_description`
  body; never depend on JSON-LD.
- **Q-AS-2 — Structured location granularity.** Rows expose only a "City" column;
  most tenants emit a bare city, some a `City, ST` pair. **Default (proceeding):**
  surface the city, splitting a `City, ST` pair into `city` + `state` when present,
  leaving location null when nothing usable is found (never fabricated).
- **Q-AS-3 — Employment type.** Openings rows carry no structured employment
  type. **Default (proceeding):** mine a Full/Part-time (or temp / contract /
  seasonal / internship) hint from the title / body; leave null when absent.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, server-rendered openings table
  at `https://{tenant}.applicantstack.com/x/openings`, with per-role enrichment
  from `/x/detail/{jobId}`. Verified live 2026-06-03 against the At Work Group
  tenant (`atwork443`): the openings page returned HTTP 200 HTML with a ~404-row
  listings table, and a sampled detail page (`/x/detail/a2v6venn6ji9`,
  "Account Manager") returned HTTP 200 HTML with `og:` metadata, a "Job post
  summary" table, and a `listing_description` body. **Confidence: verified** (live
  fetch of both the openings table and a detail page confirmed the field set).
- D-2: ApplicantStack exposes no public JSON list feed and no schema.org JSON-LD;
  the openings table is the richest unauthenticated surface (it already carries
  title / detail link / date / category / city per row), so the adapter enumerates
  the tenant from that one document and fetches detail pages only for the roles it
  surfaces (capped at `resultsWanted`).
- D-3: The opaque alphanumeric `{jobId}` in the detail URL is the stable per-role
  ATS id; the apply URL is derived by swapping `/x/detail/` → `/x/apply/`.
- D-4: The openings table lists every open role in one response (no server-side
  pagination of the job set); the adapter parses it once and slices client-side to
  `resultsWanted`. De-dup is by `atsId`.
- D-5: HTML is parsed with bounded, defensive regexes (row split + per-cell + per
  summary-field extraction + entity decode) rather than a heavyweight DOM/HTML
  dependency, keeping the plugin dependency-free and resilient to minor markup
  drift.

## 11. References

- `packages/plugins/source-ats-applicantstack/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `https://atwork443.applicantstack.com/x/openings` → HTTP 200 HTML, ~404-row
    listings table (At Work Group).
  - `https://atwork443.applicantstack.com/x/detail/a2v6venn6ji9` → HTTP 200 HTML
    ("Account Manager") with `og:` metadata, "Job post summary" table, and
    `listing_description` body; apply at `/x/apply/a2v6venn6ji9`.
  - Sibling tenants on the same `{tenant}.applicantstack.com/x/openings` host
    pattern: `jayco`, `qrm`, `fwcc`, `acesrch`, `solutionsbyfusion`.
