# Spec: 352 — Avionté ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 352                                           |
| Slug           | source-ats-avionte                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft)                              |

## 1. Problem Statement

Avionté (avionte.com — "AviontéBOLD") is a US staffing & recruiting ATS used by
staffing agencies to publish their posted jobs on branded careers pages. Every
customer "build" exposes a public, unauthenticated RSS/XML job feed at
`https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}` (with
`&format=xml` for the extended variant), and hosts a branded portal on
`{slug}.aviontego.com`. Ever Jobs has no adapter for Avionté-powered careers
pages, so these vacancies are currently un-ingestable. A single generic,
multi-tenant Avionté adapter unlocks the full catalogue of Avionté-powered
staffing job boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-avionte` plugin that ingests
  vacancies from **any** Avionté build given a `companySlug` (used as the
  `compid` build id) or a `companyUrl` (a feed URL, or a `*.aviontego.com`
  portal URL / `?CompanyID=` query from which the build id is recovered).
- Use the **public, anonymous RSS/XML job export** (no auth, no API key) served
  at `https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}&format=xml`.
- Map every job into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'avionte'`, `department`, `employmentType`).

## 3. Non-Goals

- The documented **JSON Jobs feed** (`/staff/jsonjobsv3.aspx?ID={apiKey}`). It
  carries the same job set but is gated by a per-build API key issued from the
  build's editor, so it is not tenant-agnostic without a credential.
- The **Web Apply API** or any application-submission / candidate write path.
- Server-side filtering by category / location (the portal search form supports
  these facets). We ingest the build's full posted-jobs list and slice
  client-side to `resultsWanted`.
- A curated seed list of Avionté build ids (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Avionté plugin at a
> build's id, so that I ingest that staffing agency's full posted-jobs list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Avionté adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the build id from `companySlug` (used verbatim as `compid`) or from a `companyUrl` (`compid` / `CompanyID` query, else the first `*.aviontego.com` sub-domain label). | must |
| FR-2  | Fetch the public RSS/XML export (`GET /buildjobs_rss.aspx?compid={id}&format=xml`) and parse its `<item>` jobs. | must |
| FR-3  | Extract the stable per-job id (from `<guid>` / id element, else the id mined from `<link>`) as `atsId`. | must |
| FR-4  | De-duplicate jobs by `atsId` within a single run.                                                    | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-response feed.                 | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown builds (HTTP 4xx), network errors, and non-XML / parse failures without throwing.   | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public RSS/XML export only        |
| NFR-2  | A fetch failure or unknown build must not throw | graceful empty/partial result  |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad build never aborts a batch       | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.AVIONTE, name: 'Avionté', category: 'ats', isAts: true })
class AvionteService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface documented by Avionté, see §10/§11):

```
GET https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}&format=xml
  → application/rss+xml / text/xml:
    <rss><channel>
      <title>{build / company name}</title>
      <link>{public careers page}</link>
      <item>
        <title>{job title}</title>
        <link>{absolute public job / apply URL}</link>
        <category>{job category}</category>
        <location>{City, State}</location>
        <description>&lt;p&gt;…HTML-encoded job body…&lt;/p&gt;</description>
        <pubDate>{RFC-822 posted date}</pubDate>
        <guid>{stable job id}</guid>
      </item>
      … (every posted job for the build) …
    </channel></rss>
```

Wire shape → `JobPostDto` mapping:

| RSS/XML field                                      | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `<guid>` / id element (else id mined from `<link>`)| `atsId`, `id`           | `id` is prefixed `avionte-{atsId}`                          |
| `<title>`                                          | `title`                 | required; job skipped if absent                             |
| `<link>`                                           | `jobUrl`, `applyUrl`    | absolute public job / apply URL                             |
| `<description>` (HTML-encoded → decoded)           | `description`           | format-converted (HTML / Markdown / Plain); may be absent   |
| `<pubDate>` (RFC-822 / ISO)                        | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `<city>`/`<state>`/`<country>` or `<location>`     | `location`              | structured fields, else split "City, State[, Country]"      |
| `<title>` / `<location>` / `<category>` / body text| `isRemote`              | US remote detection (`remote` / `wfh` / `telecommute` …)    |
| `<category>`                                       | `department`            | job-family / industry tag                                   |
| `<employmenttype>` / `<jobtype>`                   | `employmentType`        | extended XML only                                           |
| channel `<title>` (else slug / build id)           | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                  | `site`                  | constant `Site.AVIONTE`                                     |
| —                                                  | `atsType`               | constant `'avionte'`                                        |
| `<description>` text                               | `emails`                | harvested via `extractEmails`                               |

Build resolution:

- `companySlug` → used verbatim as the `compid`.
- `companyUrl` with a `?compid=` / `?CompanyID=` query → that value.
- `companyUrl` on `*.aviontego.com` → its first non-`www` sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable build, unknown build (HTTP 4xx), or no `<item>` |
| logged warn (HTTP 4xx)       | unknown / disabled build feed — degrades to empty, never throws          |
| logged warn (parse failure)  | non-XML / malformed payload or per-job map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/avionte.e2e-spec.ts`): known tenant (`companySlug: 'mdr'` —
  Meador Staffing Services) returns shaped jobs (`site === Site.AVIONTE`,
  `atsType === 'avionte'`, `atsId`/`jobUrl` defined); `companyUrl` resolution
  path exercised; no-slug/url returns empty; unknown build degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AV-1 — Build id discovery.** The `compid` is a per-build identifier set in
  the build's Careers Page editor; a public build id could not be enumerated
  without a tenant's editor access. **Default (proceeding):** treat `companySlug`
  as the `compid` and recover it from a `?compid=` / `?CompanyID=` query or the
  `*.aviontego.com` sub-domain label of a `companyUrl`; an unknown build degrades
  gracefully to empty.
- **Q-AV-2 — Base RSS vs extended XML.** The base RSS feed carries only
  category/title/location/url; `&format=xml` adds description/posted-date/
  employment-type. **Default (proceeding):** always request `&format=xml` (a
  superset) and parse defensively so a base-RSS response still yields jobs.
- **Q-AV-3 — Structured location.** Tenants vary between a `<location>` label and
  structured `<city>`/`<state>` fields. **Default (proceeding):** prefer the
  structured fields, falling back to splitting the free-text label on commas;
  leave location null when nothing usable is found (never fabricated).

## 10. Decisions

- D-1: Primary surface is the public, anonymous RSS/XML job export at
  `https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}&format=xml`.
  The host + path are documented by Avionté ("The RSS feed URL will always start
  with https://www.myavionte.com/buildjobs_rss.aspx and end with a unique ID for
  your build"; appending `&format=xml` returns the extended XML). `GET
  buildjobs_rss.aspx` with no `compid` returns a .NET null-reference error,
  confirming the endpoint exists and requires the build id. Real AviontéBOLD
  tenants confirmed live on the sibling `*.aviontego.com` portal host include
  `mdr` (Meador Staffing Services), `crs` (Career Strategies Inc) and `gsf`
  (Go-Staff, Inc). **Confidence: documented, not byte-verified** — a specific
  public build id could not be enumerated without editor access, so the
  field-level wire shape is taken from Avionté's published feed docs and the
  parser is written defensively (verified=false).
- D-2: The JSON Jobs feed (`/staff/jsonjobsv3.aspx?ID={apiKey}`) carries the same
  job set but is per-build API-key gated and therefore unsuitable for an
  unauthenticated, tenant-agnostic scraper; it is an explicit non-goal. The RSS/
  XML export is the documented, no-auth surface.
- D-3: The branded `*.aviontego.com` portal is a server-rendered ASP.NET search
  form whose results load via postback and carry no static schema.org
  JobPosting JSON-LD, so it is unsuitable as the structured surface; it is used
  only to recover a build slug from a `companyUrl`.
- D-4: The feed returns every posted job in one response (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`. De-dup is by `atsId`.
- D-5: RSS/XML is parsed with bounded, defensive regexes (item split + per-tag
  extraction + entity decode) rather than a heavyweight XML dependency, keeping
  the plugin dependency-free and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-avionte/` — implementation.
- Public surface (documented by Avionté, reviewed 2026-06-03; no authentication):
  - `https://www.myavionte.com/buildjobs_rss.aspx?compid={buildId}` — RSS feed
    (Job Category, Job Title, Job Location, Job URL per item).
  - `…&format=xml` — extended XML variant (adds description / posted date /
    employment type / id).
  - `GET https://www.myavionte.com/buildjobs_rss.aspx` (no `compid`) → .NET
    null-reference error (endpoint present; build id required).
  - Real tenants on the sibling portal host `*.aviontego.com`: `mdr` (Meador
    Staffing Services), `crs` (Career Strategies Inc), `gsf` (Go-Staff, Inc).
