# Spec: 337 — Heyrecruit ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 337                                           |
| Slug           | source-ats-heyrecruit                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 328 (rexx systems), 330 (Prescreen)           |

## 1. Problem Statement

Heyrecruit (heyrecruit.de) is a German "Performance Recruiting" applicant-tracking
platform built by Artrevolver GmbH (Frankfurt am Main). Every customer tenant
publishes a public, anonymous, server-rendered careers portal on its own
Heyrecruit sub-domain (`https://{subdomain}.heyrecruit.de/?page=jobs`). Ever Jobs
has no adapter for Heyrecruit-powered portals, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Heyrecruit adapter unlocks the full
catalogue of Heyrecruit-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-heyrecruit` plugin that ingests
  vacancies from **any** Heyrecruit-powered career portal given a `companySlug`
  (the careers sub-domain label, e.g. `bodenseetherme`) or a `companyUrl` (a
  portal URL whose origin is used verbatim).
- Use the **public, anonymous careers portal** (no auth, no API key) served at
  `https://{subdomain}.heyrecruit.de/?page=jobs`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'heyrecruit'`, `department`,
  `employmentType`).

## 3. Non-Goals

- The authenticated JSON REST API at `https://app.heyrecruit.de/api/v2` (e.g.
  `companies/view-by-domain`, `jobs/index`). It is gated behind a JWT bearer
  token obtained from a per-tenant `client_id` / `client_secret` pair and is
  explicitly **not** used.
- Server-side filtering by department / employment / location. We ingest the
  tenant's full open-roles overview and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- WAF / Cloudflare bypass. Any portal gating its pages behind an aggressive WAF
  is out of scope (graceful empty result).
- A curated seed list of Heyrecruit tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Heyrecruit plugin at a
> tenant's careers sub-domain, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Heyrecruit adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` (the sub-domain label, preferred) or from a `companyUrl` origin. | must |
| FR-2  | Fetch the overview page `https://{subdomain}.heyrecruit.de/?page=jobs` and parse each `.job-tile`.  | must     |
| FR-3  | Harvest the embedded job record from each tile's `onclick="jobClickEventListener({...})"` handler.  | must     |
| FR-4  | Fall back to the visible tile title + detail anchor when the embedded JSON is absent / malformed.   | should   |
| FR-5  | De-duplicate vacancies by numeric job id (`atsId`) within a single run.                             | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) and slice client-side.                               | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-10 | Tolerate unknown / dead tenants (HTTP 400/403/404) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target                                |
| ------ | ------------------------------------------------- | ------------------------------------- |
| NFR-1  | No credentials / secrets required                 | public careers portal only            |
| NFR-2  | A fetch failure or unknown tenant must not throw  | graceful empty/partial result         |
| NFR-3  | All HTTP via `@ever-jobs/common` client           | UA + timeouts + proxy support         |
| NFR-4  | Bound result-set size                             | slice to `resultsWanted`              |
| NFR-5  | Per-tile parse failures are isolated              | one bad tile never nukes the page     |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HEYRECRUIT, name: 'Heyrecruit', category: 'ats', isAts: true })
class HeyrecruitService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against
`bodenseetherme.heyrecruit.de`):

```
GET https://{subdomain}.heyrecruit.de/?page=jobs
  → HTTP 200 HTML; one <div class="job-tile"> per open role. Each tile anchor
    carries an inline handler embedding the full job record:

      <a href="?page=job&id=91424&location=15266"
         onclick="jobClickEventListener({ ...HTML-entity-encoded JSON... })">
        <h2 class="primary-color">Rettungsschwimmer (m/w/d)</h2>
      </a>

  The embedded JSON object (mirrors the platform's jobs/index REST shape):
      {
        "id": 91424,
        "internal_title": "...",
        "publication_date": null,
        "last_modification": "2026-06-01T08:19:13+02:00",
        "default_language_id": 1,
        "company_location_jobs": [
          {
            "company_location_id": 15266,
            "publish_date": "2026-06-01T14:51:06+02:00",
            "active": true,
            "company_location": {
              "title": "Überlingen - Bodensee", "city": "Überlingen",
              "state": "Baden-Württemberg", "country": "Deutschland",
              "street": "Bahnhofstraße", "postal_code": "88662"
            }
          }
        ],
        "job_strings": [
          {
            "language_id": 1, "title": "Rettungsschwimmer (m/w/d) ",
            "subtitle": "Wir suchen ab sofort:",
            "description": "<h2>…</h2><p>…</p>",
            "employment": "Vollzeit", "department": "Bad / Sauna"
          }
        ]
      }

GET https://{subdomain}.heyrecruit.de/?page=job&id={jobId}&location={locationId}
  → the public job-detail page (the jobUrl / applyUrl we emit).
```

### 7.2 Mapping table (wire field → JobPostDto field)

| Heyrecruit wire field                                          | JobPostDto field   |
| ------------------------------------------------------------- | ------------------ |
| `id` (numeric job id; else `?id=` from detail URL)            | `atsId`            |
| `'heyrecruit-' + atsId`                                       | `id`               |
| `job_strings[default].title` (else visible tile `<h2>` text)  | `title`            |
| tenant sub-domain label (title-cased)                         | `companyName`      |
| `?page=job&id={id}&location={company_location_id}`            | `jobUrl`, `applyUrl` |
| `company_location_jobs[active].company_location.{city,state,country}` | `location`  |
| `job_strings[default].description` (HTML, format-converted)   | `description`      |
| `company_location_jobs[active].publish_date` → else `publication_date` → else `last_modification` (→ `YYYY-MM-DD`) | `datePosted` |
| `job_strings[default].employment`                             | `employmentType`   |
| `job_strings[default].department`                             | `department`       |
| remote cues in employment/department/title/location title     | `isRemote`         |
| emails harvested from the converted description               | `emails`           |
| constant `'heyrecruit'`                                        | `atsType`          |
| `Site.HEYRECRUIT`                                             | `site`             |

The default-language string bundle is the `job_strings[]` entry whose
`language_id` matches `default_language_id` (or `1`), falling back to the first
available bundle. The primary location is the first `active` join row, falling
back to the first available row.

### 7.3 Errors / graceful degradation

| Code / Behaviour             | Meaning                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or empty overview |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws            |
| logged warn (parse failure)  | HTML / embedded-JSON parse error — degrades to partial, never throws |
| logged warn (per-tile error) | a single tile mapping failure — that tile is skipped, run continues |

`scrape()` never throws: any unexpected error returns the partial results
collected so far. One bad tenant or one bad tile never aborts a batch run.

## 8. Test Plan

- E2E (`__tests__/heyrecruit.e2e-spec.ts`): known tenant
  (`companySlug: 'bodenseetherme'`) returns shaped jobs (`site === Site.HEYRECRUIT`,
  `atsType === 'heyrecruit'`, `atsId`/`jobUrl` defined); no-slug/url returns empty;
  unknown tenant degrades gracefully; `resultsWanted` is honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`). 30 000 ms
  timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HR-1 — Custom tenant domains.** Some tenants front the Heyrecruit portal
  with a custom domain (the WordPress plugin embeds the same markup). **Default
  (proceeding):** resolve `companySlug` to `{slug}.heyrecruit.de`; a fully
  qualified `companyUrl` (or a dotted slug) is used as the origin verbatim, so a
  custom domain is supported when supplied as a URL.
- **Q-HR-2 — Overview pagination.** The overview renders all open roles in one
  page for typical tenants (4 roles on the test tenant). A very large tenant could
  paginate. **Default (proceeding):** single-page overview; re-evaluate if
  truncation is observed in practice.
- **Q-HR-3 — Remote flag.** The public tile has no dedicated remote field.
  **Default (proceeding):** infer `isRemote` from German/English remote cues in
  the employment / department / title / location-title text.

## 10. Decisions

- D-1: Primary surface is the public, anonymous careers overview at
  `https://{subdomain}.heyrecruit.de/?page=jobs`. Verified live 2026-06-03 against
  `bodenseetherme.heyrecruit.de` (Bodensee-Therme Überlingen): overview HTTP 200
  with 4 `.job-tile` cards, each embedding a complete job record via
  `jobClickEventListener({...})`. **Confidence: verified** (byte-confirmed
  overview HTML with 4 embedded job objects parsed).
- D-2: The richest structured fields come straight from the embedded job JSON
  (id, localised title/description/employment/department, structured location,
  publish dates) — the same object the platform's `jobs/index` REST endpoint
  returns. The visible tile text (title, detail anchor) is a layered fallback for
  markup / embedded-JSON drift.
- D-3: The embedded JSON in the `onclick` attribute is HTML-entity-encoded; it is
  decoded (`decodeHtmlEntities`) before `JSON.parse`. A malformed block degrades
  to the visible-tile fallback.
- D-4: The authenticated JSON REST API (`app.heyrecruit.de/api/v2`, JWT bearer
  from `client_id`/`client_secret`) is not used. The public careers HTML carries
  the full per-job record already, so no credentials are required.
- D-5: De-dup is by numeric job id; the result-set is sliced client-side to
  `resultsWanted` (default 100 internally).

## 11. References

- `packages/plugins/source-ats-heyrecruit/` — implementation.
- Live portal verified 2026-06-03: `https://bodenseetherme.heyrecruit.de/?page=jobs`
  (Bodensee-Therme Überlingen), no authentication required.
- Heyrecruit official WordPress integration plugin (shortcodes such as
  `hr_jobs_list` render the same `.job-tile` markup with the embedded job record).
- Heyrecruit REST integration templates (PHP) — the authenticated
  `app.heyrecruit.de/api/v2` `jobs/index` endpoint shape (documented as a
  non-goal; the public overview embeds the same per-job object).
