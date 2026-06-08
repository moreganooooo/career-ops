# Spec: 357 — BrassRing ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 357                                           |
| Slug           | source-ats-brassring                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), iCIMS (gateway JSON)           |

## 1. Problem Statement

BrassRing (IBM Kenexa / Infinite BrassRing) is an enterprise applicant-tracking
system whose candidate-facing "Talent Gateway" portals are all hosted under the
shared host `https://sjobs.brassring.com/` (a few tenants on the regional mirror
`krb-sjobs.brassring.com` / `jobs.brassring.com`). Unlike sub-domain-addressed
ATSes, a BrassRing tenant is addressed by a **`partnerid` + `siteid` pair** carried
as query parameters, e.g.
`https://sjobs.brassring.com/TGnewUI/Search/Home/Home?partnerid=25212&siteid=5164`.
The jobs index is a client-rendered SPA ("TGnewUI"), but the portal exposes a
public AJAX search endpoint that returns a JSON envelope of matched roles, and each
role has a server-rendered detail page (addressed by the requisition id `Areq`).
Ever Jobs has no adapter for BrassRing-powered career sites, so these large,
enterprise vacancy sets are currently un-ingestable. A single generic, multi-tenant
BrassRing adapter unlocks the full catalogue of Talent Gateway sites with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-brassring` plugin that ingests vacancies
  from **any** BrassRing Talent Gateway given a `companySlug` (the
  `partnerid:siteid` pair, e.g. `25212:5164`) or a `companyUrl` (a Talent Gateway
  URL whose `partnerid` / `siteid` query params identify the tenant).
- Use the **public, anonymous** surface (no auth, no API key): the portal's AJAX
  search endpoint (`POST /TgNewUI/Search/Ajax/MatchedJobs`) to enumerate open roles,
  plus each role's server-rendered detail page carrying schema.org `JobPosting`
  JSON-LD (best-effort enrichment when present).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'brassring'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated BrassRing / Kenexa recruiter or admin API. This plugin consumes
  only the public candidate-facing surface.
- Server-side filtering by department / location / facet (the portal supports
  these). We ingest the tenant's full open-roles list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of BrassRing `partnerid`/`siteid` pairs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the BrassRing plugin at a
> tenant's `partnerid:siteid` pair, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the BrassRing adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant `partnerid` + `siteid` pair from `companySlug` (`partnerid:siteid`, `partnerid/siteid`, or `partnerid=…&siteid=…`) or from a `companyUrl` on `brassring.com` carrying both query params. | must |
| FR-2  | Call the public AJAX search endpoint (`POST /TgNewUI/Search/Ajax/MatchedJobs`) and read its `Jobs[]` / `JobsCount` JSON envelope, paging client-side. | must |
| FR-3  | Use the requisition id (`Areq` / `Autoreqid`) as `atsId` when present, else the numeric job id; build the detail-page URL from it. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Enrich each role from its detail page's schema.org `JobPosting` JSON-LD (HTML body, company, employment type, structured location, date) when present — best-effort, never fatal. | should |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by bounding paging + slicing.                        | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided (or the pair is unresolvable). | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public AJAX endpoint + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | page cap + slice to `resultsWanted` |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BRASSRING, name: 'BrassRing', category: 'ats', isAts: true })
class BrassRingService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
POST https://sjobs.brassring.com/TgNewUI/Search/Ajax/MatchedJobs
  body: { partnerId, siteId, keyword, location, pageNumber, noOfRecords, ... }
  → { Jobs: [ { Title, Jobid, Autoreqid, JobUrl, Location, PostingDate, … } ],
      JobsCount, Facets, SortFields }

GET https://sjobs.brassring.com/TGnewUI/Search/home/HomeWithPreLoad
      ?PageType=JobDetails&partnerid={P}&siteid={S}&Areq={req}
  → HTML; many tenants pre-render a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20", "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "…" },
        "jobLocation": { "address": {
          "addressLocality": "Dallas", "addressRegion": "TX",
          "addressCountry": "US" } } }
    </script>
```

Wire shape → `JobPostDto` mapping:

| Source field                                              | JobPostDto field        | Notes                                                       |
| -------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `Autoreqid` / `Areq` (else `Jobid`)                      | `atsId`, `id`           | `id` is prefixed `brassring-{atsId}`                       |
| `Title` (else detail JSON-LD `title`)                    | `title`                 | required; role skipped if absent                            |
| `JobUrl` (else built `PageType=JobDetails&…&Areq={req}`) | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| detail JSON-LD `description` (HTML) else listing summary | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `PostingDate` / detail `datePosted`                      | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `Location` text / detail `jobLocation.address`           | `location`              | city / state / country; null when none usable               |
| title / location / `jobLocationType`                     | `isRemote`              | remote detection (`remote` / `wfh` / `telecommute` …)       |
| `Department` / `Category` / detail `industry`            | `department`            | when present                                                |
| `EmploymentType` / detail `employmentType`               | `employmentType`        | schema.org enum normalised to a readable label              |
| detail `hiringOrganization.name` (else `partnerid/siteid`)| `companyName`          | de-slugified + title-cased; pair fallback when no name      |
| —                                                        | `site`                  | constant `Site.BRASSRING`                                  |
| —                                                        | `atsType`               | constant `'brassring'`                                     |
| `description` text                                       | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` `25212:5164` / `25212/5164` / `25212-5164` / `partnerid=25212&siteid=5164`
  → `{ partnerId: '25212', siteId: '5164' }`.
- `companyUrl` on `brassring.com` carrying `partnerid` + `siteid` query params →
  the pair is used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable pair, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed envelope / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/brassring.e2e-spec.ts`): known tenant
  (`companySlug: '25212:5164'`, AAFES) returns shaped jobs (`site === Site.BRASSRING`,
  `atsType === 'brassring'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BR-1 — Tenant addressing.** BrassRing addresses tenants by a `partnerid` +
  `siteid` pair, not a sub-domain or slug. **Default (proceeding):** accept the pair
  via `companySlug` (`partnerid:siteid` and common delimiter variants, or a
  `partnerid=…&siteid=…` fragment) or extract it from a full `companyUrl`'s query
  string.
- **Q-BR-2 — SPA-rendered payload.** The jobs index is a client-rendered SPA, so the
  exact per-role field names inside the MatchedJobs `Jobs[]` array could not be
  confirmed without a JS runtime / network capture. **Default (proceeding):** parse
  the documented envelope (`{ Jobs, JobsCount }`) defensively, tolerating the common
  BrassRing/Kenexa field-name spellings (`Title`/`JobTitle`, `Autoreqid`/`Areq`,
  `Location`/`JobLocation`, `PostingDate`/`PostedDate`), treating any malformed or
  absent field as "missing" rather than a failure. Confidence: **unverified**.
- **Q-BR-3 — Detail-page enrichment.** Some tenants pre-render a schema.org
  `JobPosting` JSON-LD block on the `PageType=JobDetails` page; others do not.
  **Default (proceeding):** enrich from JSON-LD when present (recursively walking
  arrays / `@graph`), and fall back entirely to the listing fields when absent —
  enrichment is strictly best-effort and never fatal.

## 10. Decisions

- D-1: Primary surface is the public, anonymous AJAX search endpoint
  (`POST /TgNewUI/Search/Ajax/MatchedJobs`) for role enumeration plus each role's
  server-rendered detail page carrying schema.org `JobPosting` JSON-LD. This mirrors
  the gateway-JSON sibling adapters (iCIMS) for listing and the schema.org siblings
  (Hireful) for detail enrichment. **Confidence: unverified** — the shared host, the
  `partnerid`/`siteid` addressing model, named real tenants, the AJAX endpoint, and
  the `{ Jobs, JobsCount }` envelope were confirmed live 2026-06-03, but the portal
  is a JS-rendered SPA so the exact per-role field names could not be confirmed via a
  no-JS fetch; the parser is written defensively around the documented envelope.
- D-2: There is no sub-domain-addressed JSON list feed; a tenant is the
  `partnerid`+`siteid` pair on the shared host. The AJAX `MatchedJobs` envelope is
  the documented, no-auth surface and is used here.
- D-3: The stable per-role ATS id is the requisition id (`Areq` / `Autoreqid`, a
  `…BR`-suffixed Kenexa number) when present, else the numeric job id. The
  detail-page URL is built from it (`PageType=JobDetails&…&Areq={req}`).
- D-4: The MatchedJobs envelope returns a page of roles plus a `JobsCount` total;
  the adapter pages client-side (bounded by `MAX_PAGES` and `resultsWanted`) and
  de-dups by `atsId`.
- D-5: JSON-LD on the detail page is parsed with a bounded `application/ld+json`
  block scan + a recursive `@type === JobPosting` search (tolerating arrays /
  `@graph`) — keeping the plugin dependency-free and resilient to markup drift.

## 11. References

- `packages/plugins/source-ats-brassring/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Shared host + `partnerid`/`siteid` addressing model confirmed, with named real
    tenants: AAFES (`25212`/`5164`), Peace Corps (`25332`/`5414`), U.S. Steel
    (`25307`/`5238`), Fairfax County Public Schools (`25103`/`5041`), Archer Daniels
    Midland (`25416`/`5998`).
  - AJAX listing endpoint `POST /TgNewUI/Search/Ajax/MatchedJobs` confirmed; its JSON
    envelope carries a `Jobs` array + `JobsCount` (plus `Facets`, `SortFields`).
  - Detail-page URL `PageType=JobDetails&…&Areq={req}` confirmed.
  - The portal is a JS-rendered SPA; the exact per-role field names inside `Jobs[]`
    could not be confirmed via an unauthenticated no-JS fetch (verified=false).
