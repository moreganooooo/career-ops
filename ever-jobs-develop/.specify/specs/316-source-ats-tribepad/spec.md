# Spec: 316 — Tribepad ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 316                                |
| Slug           | source-ats-tribepad                |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 301 (Niceboard), 291 (Eploy)       |

## 1. Problem Statement

Tribepad is a UK enterprise Applicant Tracking System used by organisations
including Tesco, Greggs, NHS Professionals, and many public-sector employers.
Each tenant's career site is publicly accessible without authentication.
Ever Jobs has no adapter for Tribepad, leaving all Tribepad-hosted career
pages un-ingestable. A generic, multi-tenant Tribepad adapter unlocks that
catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-tribepad` plugin that ingests jobs
  from **any** Tribepad-powered career site given a `companySlug` (the tenant's
  sub-domain label on `tribepad-gro.com`) or a custom-domain `companyUrl`.
- Use **only public, unauthenticated** HTTP requests; no API keys, no OAuth.
- Map each position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'tribepad'`, `department`).
- Fetch the full HTML job description from the individual detail page.

## 3. Non-Goals

- Tribepad's credentialed API (`learn.tribepad.com/apis`): requires per-tenant
  setup by Tribepad account managers and is not public.
- WAF / Cloudflare bypass. Any tenant whose pages are gated behind an
  aggressive WAF degrades to an empty result gracefully.
- Enterprise tenants on fully custom domains are supported via `companyUrl`
  but no automatic domain discovery is performed.
- Server-side keyword/location filtering. The adapter fetches all open roles
  and slices client-side to `resultsWanted`.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Tribepad plugin at a
> tenant sub-domain, so that I ingest that organisation's open roles without
> writing a bespoke scraper.

> As a **plugin host**, I want the Tribepad adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` (→ `{slug}.tribepad-gro.com`) or `companyUrl` (origin verbatim). | must |
| FR-2  | Fetch `/v2/job/search?page={n}&records_per_page={size}` and parse `.sitebuilder-job-results-item` cards. | must |
| FR-3  | Extract record id, title, location, salary, category, contract type, and closing date from each card. | must |
| FR-4  | Paginate via `?page={n}`; the `<h2>N Search Results</h2>` text yields the tenant total. Fan out remaining pages with a bounded `Promise.allSettled`. | must |
| FR-5  | Fetch each job's detail page (`/members/modules/job/detail.php?record={id}`) to retrieve the full HTML description. Detail fetch failures degrade gracefully (listing data sufficient). | should |
| FR-6  | De-duplicate positions by record id within a single run.                                     | must |
| FR-7  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-8  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                       | should |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.       | must |
| FR-10 | Tolerate unknown / dead tenants (HTTP 400/403/404) and fetch failures without throwing.      | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public HTML only                |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TRIBEPAD, name: 'Tribepad', category: 'ats', isAts: true })
class TribepadService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://{slug}.tribepad-gro.com/v2/job/search
    ?page={n}&records_per_page={size}
→ server-rendered HTML

  HTML structure:
    .sitebuilder-job-results-item         – job card container
      a[href*="detail.php?record={id}"]   – job detail link (record id in href)
      .sitebuilder-job-results-item-title – <h3> job title
      .sitebuilder-job-results-item-meta  – meta chips
        i.fa-map-marker-alt               – location
        i.fa-wallet                       – salary
        i.fa-tag                          – category
        i.fa-clock                        – contract type
        i.fa-calendar-times               – closing date (DD/MM/YY)

    <h2>{N} Search Results</h2>           – total result count

Detail page:
GET https://{slug}.tribepad-gro.com/members/modules/job/detail.php?record={id}
→ server-rendered HTML

  section.job-details-section             – full HTML description
  i.fa-calendar-check + sibling text      – closing date DD/MM/YYYY

Apply URL: /members/?j={id}
```

Verified live:

```
Tenant: getsetuk.tribepad-gro.com
HTTP 200, 18 jobs across 2 pages, verified 2026-06-03.
Tenant: ypocareers.tribepad-gro.com
HTTP 200, 3 jobs on single page, verified 2026-06-03.
```

### 7.2 Errors

| Code / Behaviour             | Meaning                                                |
| ---------------------------- | ------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws  |
| logged warn (detail failure) | single detail-page fetch failed — listing data still used |
| logged warn (card parse)     | malformed card element — skipped, other cards continue  |

## 8. Test Plan

- E2E (`__tests__/tribepad.e2e-spec.ts`): known tenant (`getsetuk`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: `Site.TRIBEPAD` exists in enum; module in
  `ALL_SOURCE_MODULES`; path alias and jest mapper present (added centrally
  by the orchestrator).

## 9. Open Questions

- **Q-TB-1 — Enterprise / custom domain.** Tesco (`apply.tesco-careers.com`)
  and other enterprise tenants use custom domains. These are supported via
  `companyUrl` but the `/v2/job/search` path must still be correct — some
  enterprise tenants may use a different path (e.g. `/v2/vacancies`).
  **Default (proceeding):** use `/v2/job/search` universally; degrade to
  empty on 404 from that path.
- **Q-TB-2 — Pagination size.** `records_per_page` is configurable per tenant
  in some Tribepad installations. We send `10` which is the default; tenants
  that enforce a lower cap will still paginate correctly (more pages, same total).

## 10. Decisions

- D-1: Tribepad has no public, anonymous JSON API. The public job-search page
  (`/v2/job/search`) is server-rendered PHP HTML. The sitebuilder template
  is consistent across tenants; parsing `.sitebuilder-job-results-item` cards
  is the correct primary approach.
- D-2: The full HTML description is only available on the per-job detail page
  (`/members/modules/job/detail.php?record={id}`). Detail page fetches are
  done as a concurrent fan-out within each pagination chunk; individual
  failures degrade to a partial record (title + metadata without description).
- D-3: Tenant host is built by substituting `companySlug` into the
  `tribepad-gro.com` template. For enterprise / custom-domain tenants,
  `companyUrl` origin is used verbatim.
- D-4: `cheerio` (already a root-workspace dependency) is used for HTML
  parsing; no additional heavyweight dependency is added.
- D-5: The total count is parsed from `<h2>N Search Results</h2>`. When this
  element is absent (e.g. on landing/vacancies pages), the item count from the
  first page seeds the total.

## 11. References

- `packages/plugins/source-ats-tribepad/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling paginated ATS adapter
  (structural pattern mirrored).
- `packages/plugins/source-ats-eploy/` — sibling HTML-scraping ATS adapter
  (cheerio usage pattern mirrored).
- Public Tribepad career sites verified live 2026-06-03:
  `getsetuk.tribepad-gro.com`, `ypocareers.tribepad-gro.com`.
