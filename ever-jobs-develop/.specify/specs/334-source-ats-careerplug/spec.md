# Spec: 334 — CareerPlug ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 334                                           |
| Slug           | source-ats-careerplug                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 317 (Eploy)                  |

## 1. Problem Statement

CareerPlug (careerplug.com) is a USA-based applicant-tracking platform focused on
small businesses and franchise brands, used by 60,000+ companies. Every customer
tenant publishes a branded, public, anonymous careers site on its own sub-domain
(`https://{tenant}.careerplug.com/`). Ever Jobs has no adapter for
CareerPlug-powered careers sites, so these vacancies are currently un-ingestable.
A single generic, multi-tenant CareerPlug adapter unlocks the full catalogue of
CareerPlug-powered careers sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-careerplug` plugin that ingests
  vacancies from **any** CareerPlug-powered careers site given a `companySlug`
  (the tenant sub-domain label, e.g. `cplugjobs`) or a `companyUrl` (a careers
  URL whose origin / first sub-domain label is the tenant).
- Use the **public, anonymous careers site** (no auth, no API key) served at
  `https://{tenant}.careerplug.com/`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'careerplug'`, `employmentType`).

## 3. Non-Goals

- CareerPlug's authenticated dashboard / app (`app.careerplug.com`) and any
  authenticated API. They are explicitly not used.
- The daily XML job-board distribution feed (a partner-distribution mechanism,
  not a public per-tenant read surface).
- Server-side filtering by position / type / location. We ingest the tenant's
  full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the CareerPlug plugin at a
> tenant's sub-domain label, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the CareerPlug adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` (sub-domain label, preferred), or from the origin / first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the `/jobs` index from `https://{tenant}.careerplug.com/jobs` and parse the embedded `schema.org` `ItemList` of `JobPosting` JSON-LD. | must |
| FR-3  | Fall back to the careers landing page (`/account`) when `/jobs` 302-redirects to a single role's application page and yields no JobPosting items (single-job tenants). | must |
| FR-4  | Pair each JSON-LD `JobPosting` (by document order) with a job-card anchor (`/jobs/{id}` or `/j/{shortcode}`) to recover the per-role public URL and ATS id. | must |
| FR-5  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the result set client-side.              | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-10 | Tolerate unknown / dead tenants (a redirect to the sign-in app, or HTTP 4xx) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public careers site only         |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | One malformed posting never aborts the page   | per-posting try/catch in `collect` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CAREERPLUG, name: 'CareerPlug', category: 'ats', isAts: true })
class CareerPlugService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `cplugjobs.careerplug.com`):

```
GET https://{tenant}.careerplug.com/jobs
  → HTML embedding a schema.org ItemList of JobPosting objects:
      <script type="application/ld+json">
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "numberOfItems": 1,
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "item": {
              "@type": "JobPosting",
              "title": "Sales Account Executive",
              "description": "…(full body)…",
              "datePosted": "2025-06-02T12:34:07+00:00",
              "employmentType": "FULL_TIME",
              "directApply": true,
              "hiringOrganization": { "@type": "Organization",
                  "name": "CareerPlug", "sameAs": "https://www.careerplug.com" },
              "jobLocationType": "TELECOMMUTE",
              "applicationLocationRequirement": { "@type": "Country", "name": "USA" },
              "baseSalary": { "@type": "MonetaryAmount", "currency": "USD",
                  "value": { "@type": "QuantitativeValue", "unitText": "YEAR", "value": "50000.00" } }
          } }
        ]
      }
      </script>
  → plus job-card anchors linking each role via /jobs/{id} (or a /j/{shortcode}
    short link), which carry the per-role public URL and numeric ATS id.

GET https://{tenant}.careerplug.com/account   (careers landing page; sub-domain root)
  → same ItemList JSON-LD; used as the list fallback for single-job tenants whose
    /jobs index 302-redirects to /jobs/{id}/apps/new.
```

Verified wire shape (`cplugjobs.careerplug.com`, CareerPlug's own careers site, 2026-06-03):
- JSON-LD `ItemList.itemListElement[].item` → one `JobPosting` per open role
- `JobPosting.title` → `title` (required; a posting without a title is skipped)
- `JobPosting.description` → `description` (format-converted HTML/Markdown/Plain)
- `JobPosting.datePosted` (ISO-8601) → `datePosted` (`YYYY-MM-DD`)
- `JobPosting.employmentType` (e.g. `FULL_TIME`) → `employmentType` (humanised)
- `JobPosting.jobLocationType: "TELECOMMUTE"` → `isRemote`
- `JobPosting.jobLocation.address` (`addressLocality`/`addressRegion`/`addressCountry`) → `location` (on-site roles)
- `JobPosting.applicationLocationRequirement.name` (e.g. `USA`) → `location.country` (remote roles)
- `JobPosting.hiringOrganization.name` → `companyName` (falls back to host-derived name)
- job-card anchor `/jobs/{id}` (or `/j/{shortcode}`) → `atsId` + `jobUrl` + `applyUrl`
  (falls back to a deterministic title+position slug when no anchor is present)

Tenant resolution:
- `companySlug` (no dots) → sub-domain label → `https://{slug}.careerplug.com`
- `companySlug` (with dots) or `companyUrl` → URL origin verbatim
- a malformed input yields an empty result (no throw)

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (redirect to sign-in / HTTP 4xx), or no JobPosting JSON-LD |
| logged warn (HTTP 4xx)       | unknown / dead tenant — degrades to empty, never throws       |
| logged warn (parse failure)  | a malformed JSON-LD block or posting — skipped, never throws  |

## 8. Test Plan

- E2E (`__tests__/careerplug.e2e-spec.ts`): known tenant
  (`companySlug: 'cplugjobs'`) returns shaped jobs (`site === Site.CAREERPLUG`,
  `atsType === 'careerplug'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`); 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-CP-1 — Listing pagination.** The `/jobs` index renders the open-roles list
  in one page for small-to-medium tenants. A very large franchise aggregator
  could paginate. **Default (proceeding):** single-page listing; re-evaluate if
  truncation is observed in practice.
- **Q-CP-2 — JSON-LD item ↔ anchor pairing.** CareerPlug omits a per-item URL /
  id in the JSON-LD, so postings are paired with job-card anchors by document
  order. **Default (proceeding):** order-based pairing; when no anchor is present
  the ATS id falls back to a deterministic title+position slug so jobs remain
  stable and de-dupable.
- **Q-CP-3 — Single-job redirect.** A tenant with exactly one open role
  302-redirects `/jobs` to `/jobs/{id}/apps/new`. **Default (proceeding):** fall
  back to the careers landing page (`/account`), which still carries the full
  `ItemList` JSON-LD.

## 10. Decisions

- D-1: Primary surface is the public, anonymous careers site at
  `https://{tenant}.careerplug.com/jobs`. Verified live 2026-06-03 against
  `cplugjobs.careerplug.com` (CareerPlug's own careers site): a `schema.org`
  `ItemList` of `JobPosting` objects embedded as `application/ld+json`, with one
  real role (`Sales Account Executive`, `FULL_TIME`, `TELECOMMUTE`, USA, posted
  2025-06-02). **Confidence: verified** (byte-confirmed JSON-LD with a live role).
- D-2: The richest structured fields come from the `JobPosting` JSON-LD (title,
  description, datePosted, employmentType, remote flag, region, employer). The
  job-card anchors supply the per-role public URL and ATS id the JSON-LD omits.
- D-3: A single-job tenant's `/jobs` index 302-redirects to the role's
  application page; the careers landing page (`/account`) still carries the full
  `ItemList`, so the adapter uses it as the list fallback.
- D-4: The authenticated dashboard (`app.careerplug.com`) and the partner XML
  distribution feed are not used. The public careers site is the only surface.
- D-5: Mapping is fully resilient: a malformed JSON-LD block is skipped, a
  posting without a title is skipped, and de-dup is by `atsId`. A single tenant
  never aborts a batch run.

## 11. References

- `packages/plugins/source-ats-careerplug/` — implementation.
- Live careers site verified 2026-06-03: `https://cplugjobs.careerplug.com/jobs`
  (and the careers landing page `https://cplugjobs.careerplug.com/account`).
- CareerPlug careers-page configuration knowledge base (support.careerplug.com).
