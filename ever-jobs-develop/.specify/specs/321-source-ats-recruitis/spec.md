# Spec: 321 — Recruitis ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 321                                           |
| Slug           | source-ats-recruitis                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 311 (Oorwin)                     |

## 1. Problem Statement

Recruitis (recruitis.io) is a Czech Applicant Tracking System widely used by
Central-European employers. Every customer tenant is served a public, branded,
server-rendered career site under the shared apex `jobs.recruitis.io` at a
per-tenant path (e.g. `https://jobs.recruitis.io/recruitisio`). Ever Jobs has
no adapter for Recruitis-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Recruitis adapter unlocks the
full catalogue of Recruitis-hosted career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-recruitis` plugin that ingests
  vacancies from **any** Recruitis-hosted career site given a `companySlug`
  (the tenant token, preferred) or a `companyUrl`
  (`https://jobs.recruitis.io/{tenant}`).
- Use the **public, anonymous career site** (server-rendered HTML, no auth, no
  API key) at `jobs.recruitis.io/{tenant}`, parsed with cheerio.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'recruitis'`, `department`).

## 3. Non-Goals

- The authenticated REST API at `app.recruitis.io/api2/jobs`
  (also `api.recruitis.io`). It requires a per-company bearer token issued in
  the Recruitis admin; an anonymous request is redirected to the admin login
  HTML page. Explicitly not used.
- Server-side keyword filtering. The career site returns all open roles for the
  tenant; we slice client-side to `resultsWanted`.
- WAF / CDN bypass. Any career site gating its HTML behind an aggressive WAF is
  out of scope (graceful empty result).
- A curated seed list of Recruitis tenant tokens (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Recruitis plugin at a
> tenant token, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Recruitis adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug` (preferred), or from the first path segment of `companyUrl`. | must   |
| FR-2  | Fetch the public career-site HTML from `https://jobs.recruitis.io/{tenant}?page={n}`.               | must     |
| FR-3  | Parse each `div.row.job` block with cheerio to extract title, detail href, and meta chips.          | must     |
| FR-4  | Derive `atsId` as the leading numeric segment of the detail href; de-duplicate by `atsId` per run.  | must     |
| FR-5  | Fan-out per-role detail fetches (`Promise.allSettled`) to extract the HTML description from `#job-description`. | must |
| FR-6  | Map each role to `JobPostDto` (title, jobUrl, location, department, remote, description, applyUrl).  | must     |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                          | should   |
| FR-8  | Paginate `?page=n` until the "next" control is disabled, a page yields no new roles, or the cap is reached. | should |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-10 | Tolerate unknown tenants (HTTP 404/400/403) and parse failures without throwing (partial/empty OK).| must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target                           |
| ------ | ------------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required                 | public career site only          |
| NFR-2  | A fetch failure or unknown tenant must not throw  | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client           | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size + bounded fan-out           | slice to `resultsWanted`; concurrency cap 6 |
| NFR-5  | Polite pacing between pagination rounds            | randomised delay ~250ms          |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.RECRUITIS, name: 'Recruitis', category: 'ats', isAts: true })
class RecruitisService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Upstream (public, VERIFIED live 2026-06-03)

Listing page — `GET https://jobs.recruitis.io/{tenant}?page={n}` (HTTP 200, HTML):

```html
<div class="row job g-mt-30">
  <div class="col-sm-9">
    <h3><a href="/{tenant}/490653-obchodni-zastupce-...">Obchodní zástupce ... senior 3</a></h3>
    <p class="row-info g-mt-10">
      <span class="job-item ..."><i class="icon-location-pin"></i>&nbsp;Hradec Králové,&nbsp;CZ</span>
      <span class="job-item ..."><i class="icon-tag"></i>&nbsp;Administrativa</span>
      <span class="job-item ..."><i class="icon-directions"></i>&nbsp;Práce na plný úvazek</span>
      <span class="job-item ..."><i class="icon-graduation"></i> Vzdělání není podstatné</span>
    </p>
  </div>
  <div class="col-sm-3"><a href="/{tenant}/490653-..." class="btn u-btn-blue">zobrazit inzerát</a></div>
</div>
```

Detail page — `GET https://jobs.recruitis.io/{tenant}/{jobId}-{slug}` (HTTP 200, HTML):

```html
<main class="row">
  <div class="col-lg-12" id="job-description">
    <p>...full HTML description...</p>
  </div>
</main>
```

Verified wire-shape mapping (`recruitisio` + `allwyn`, 2026-06-03):
- detail href leading numeric segment → `atsId` (e.g. `490653`)
- `h3 a` text → `title`
- detail href resolved against `https://jobs.recruitis.io` → `jobUrl` / `applyUrl`
- chip #1 (location-pin icon) → `location`, comma-split into city/state/country
- chip #2 (tag icon) → `department` (category)
- chip #3 (directions icon) → employment type (used for remote heuristic)
- chip #4 (graduation icon) → education (not mapped to output)
- `#job-description` inner HTML → `description` (format-converted)
- pagination summary `.pagination-summary` ("Zobrazeno 1 až N inzerátů z TOTAL") → total count
- next control `a[aria-label="Další"]`; class `u-pagination-v1-4--disabled` → last page

Tenant resolution:
- `companySlug` (preferred) → used verbatim (e.g. `recruitisio`, `allwyn`)
- `companyUrl` → first path segment of `https://jobs.recruitis.io/{tenant}`;
  falls back to first non-`www`/`jobs` sub-domain label for custom domains

### 7.3 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 404/400/403), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | HTML parse error — degrades to empty/partial, never throws   |
| logged warn (detail failure) | per-role detail fetch failed — role emitted with null description |

## 8. Test Plan

- E2E (`__tests__/recruitis.e2e-spec.ts`): known tenant (`recruitisio`)
  returns shaped jobs; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results
  acceptable; shape assertions guarded by `length > 0`). Asserts
  `job.site === Site.RECRUITIS` and `job.atsType === 'recruitis'`; nullable
  fields (`atsId`, `jobUrl`) guarded with `toBeDefined()`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`) — clean.
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RC-1 — WAF-gated tenants.** A subset of Recruitis career sites may sit
  behind a CDN/WAF blocking unauthenticated server-side requests.
  **Default (proceeding):** degrade to empty on 4xx (NFR-2).
- **Q-RC-2 — datePosted absent on the public page.** The public career-site
  HTML does not expose a machine-readable publish date on either the listing or
  detail markup observed. `datePosted` is left null rather than guessed. The
  authenticated API exposes `date_created` but is out of scope.
  **Default (proceeding):** `datePosted = null`.
- **Q-RC-3 — Czech-language chips.** Meta chips and remote markers are localised
  (Czech). Remote detection includes Czech markers (`home office`, `na dálku`)
  in addition to English. Field positions (chip order) are stable across the two
  verified tenants; ordinal extraction is used with graceful absence.

## 10. Decisions

- D-1: Primary surface is the **public, anonymous career site HTML** at
  `jobs.recruitis.io/{tenant}` — no authentication needed. **Verified live
  2026-06-03** byte-confirmed against two independent tenants: `recruitisio`
  (HTTP 200, 6 roles, full HTML descriptions) and `allwyn` (HTTP 200, 4 roles,
  identical markup contract). An unknown tenant returns HTTP 404 with zero job
  blocks. **Confidence: verified.**
- D-2: HTML is parsed with cheerio (default HTML mode). Roles are `div.row.job`
  blocks; the description is the inner HTML of `#job-description` on the detail
  page. The authenticated REST API (`app.recruitis.io/api2/jobs`, bearer token)
  is not used.
- D-3: `atsId` is the leading numeric segment of the detail href; de-dup by
  `atsId` guards against duplicates across pages.
- D-4: Detail descriptions are fetched with a bounded concurrent
  `Promise.allSettled` fan-out (concurrency 6); a per-role failure degrades to a
  null description rather than aborting the run.
- D-5: Pagination walks `?page=n` until the "next" control gains the
  `--disabled` class, a page adds no new roles, or `resultsWanted` / the safety
  page cap (20) is reached. The pagination summary supplies the total count.
- D-6: `companySlug` is the primary input (the tenant token). `companyUrl`'s
  first path segment is used as a fallback tenant resolver.

## 11. References

- `packages/plugins/source-ats-recruitis/` — implementation.
- Recruitis API documentation (docs.recruitis.io/api) — authenticated surface,
  not used; consulted only to confirm field semantics.
- Live career sites verified 2026-06-03:
  `https://jobs.recruitis.io/recruitisio`, `https://jobs.recruitis.io/allwyn`.
