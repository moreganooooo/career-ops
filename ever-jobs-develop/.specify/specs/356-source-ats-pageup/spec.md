# Spec: 356 — PageUp ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 356                                           |
| Slug           | source-ats-pageup                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

PageUp (pageuppeople.com) is a global/APAC enterprise recruitment & talent
vendor whose candidate-facing product is a hosted careers site. Every customer
tenant publishes a branded, public career site on the shared platform host
`careers.pageuppeople.com`, addressed by a numeric **instance id**
(`https://careers.pageuppeople.com/{instanceId}/caw/en/`), and a few front the
same product under a custom `{tenant}.pageuppeople.com` host. Unlike SPA-style
portals, PageUp's listing index is **server-rendered**: the `…/listing/` page
carries real `<a href="…/job/{jobId}/{slug}">` anchors for every open role, and
each detail page renders the role's fields as `<strong>`-labelled rows (with
schema.org `JobPosting` JSON-LD for Google-for-Jobs where a tenant enables it).
Ever Jobs has no adapter for PageUp-powered career sites, so these vacancies are
currently un-ingestable. A single generic, multi-tenant PageUp adapter unlocks
the full catalogue of PageUp-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-pageup` plugin that ingests vacancies
  from **any** PageUp career site given a `companySlug` (the numeric instance id,
  e.g. `595`) or a `companyUrl` (a portal URL whose path carries the instance id,
  or a custom careers host, used verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  listing index (`/{instanceId}/caw/en/listing/`, paginated) to enumerate open
  roles, plus each role's server-rendered detail page (`<strong>`-labelled fields,
  with schema.org `JobPosting` JSON-LD / `og:` meta as fallbacks).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'pageup'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated PageUp recruitment API (the documented developer APIs require
  an oAuth JWT). This plugin consumes only the public candidate-facing surface.
- Server-side filtering by category / location / work-type (the portal supports
  these facets). We ingest the tenant's open-roles list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of PageUp tenant instance ids (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the PageUp plugin at a tenant's
> instance id, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the PageUp adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the listing base from `companySlug` (→ `careers.pageuppeople.com/{id}/caw/en/`) or from a `companyUrl` on `pageuppeople.com` (instance path / custom host origin used verbatim). | must |
| FR-2  | Fetch the public server-rendered listing index (`GET /{instanceId}/caw/en/listing/?page=&page-items=`) and enumerate `…/job/{jobId}/{slug}` open-role URLs across pages. | must |
| FR-3  | Fetch each role's detail page and parse its `<strong>`-labelled fields (with schema.org `JobPosting` JSON-LD + `og:` meta fallbacks); use the numeric job id as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by bounding the pages walked and slicing the enumerated role set before fetching details. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON JSON-LD without throwing. | must  |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public listing + detail pages    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`; page ceiling |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PAGEUP, name: 'PageUp', category: 'ats', isAts: true })
class PageUpService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched + verified live 2026-06-03):

```
GET https://careers.pageuppeople.com/{instanceId}/caw/en/listing/?page=1&page-items=100
  → server-rendered HTML with one
      <a href="/{instanceId}/caw/en/job/{jobId}/{slug}">{title}</a>
      anchor per open role (paginated via ?page=&page-items=).

GET https://careers.pageuppeople.com/{instanceId}/caw/en/job/{jobId}/{slug}
  → server-rendered HTML carrying labelled fields:
    <strong>Job no:</strong> 509302
    <strong>Work type:</strong> Permanent
    <strong>Location:</strong> Newbury
    <strong>Categories:</strong> Logistics
    <strong>Advertised:</strong> 03 Jun 2026 GMT Daylight Time
    <strong>Applications close:</strong> 30 Jun 2026 GMT Daylight Time
    (plus an h1 title, og:title / og:url / og:description meta, and a schema.org
     JobPosting JSON-LD block where the tenant has enabled Google-for-Jobs)
```

Wire shape → `JobPostDto` mapping:

| Source field                                                  | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| job id from `…/job/{id}/…` href (else `Job no:` / `identifier`) | `atsId`, `id`         | `id` is prefixed `pageup-{atsId}`                          |
| `<h1>` (else JSON-LD `title` / `og:title` / `<title>` lead)   | `title`                 | required; role skipped if absent                            |
| detail-page URL (else JSON-LD `url` / `og:url`)               | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| JSON-LD `description` (HTML) else `og:description` (plain)     | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `Advertised:` row (else JSON-LD `datePosted`)                 | `datePosted`            | timezone stripped, parsed → `YYYY-MM-DD`                    |
| `Location:` row / JSON-LD `jobLocation.address.{locality,…}`  | `location`              | city / state / country; null when none usable               |
| `jobLocationType` / `Location:` / title                       | `isRemote`              | remote detection (`remote` / `home-working` / `wfh` / `hybrid` …) |
| `Categories:` row (else JSON-LD `industry`)                   | `department`            | when present                                                |
| `Work type:` row (else JSON-LD `employmentType`)              | `employmentType`        | free-text / schema.org enum normalised to a readable label  |
| JSON-LD `hiringOrganization.name` (else instance id)          | `companyName`           | de-slugified + title-cased                                  |
| —                                                             | `site`                  | constant `Site.PAGEUP`                                      |
| —                                                             | `atsType`               | constant `'pageup'`                                         |
| `description` text                                            | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` numeric (e.g. `595`) → `https://careers.pageuppeople.com/595/caw/en/`.
- `companySlug` containing a `pageuppeople.com` host/path → used as the base.
- `companyUrl` whose hostname is / ends in `pageuppeople.com` → its origin + the
  `…/{instanceId}/{caw}/{lang}/` path segment is used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable base, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled instance — degrades to empty, never throws             |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/pageup.e2e-spec.ts`): known tenant (`companySlug: '595'`,
  Calor) returns shaped jobs (`site === Site.PAGEUP`, `atsType === 'pageup'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PU-1 — Custom careers hosts.** A few tenants front the PageUp product under
  their own host (e.g. `pupcareers.pageuppeople.com`) with a flatter URL scheme.
  **Default (proceeding):** expand a numeric slug to
  `careers.pageuppeople.com/{id}/caw/en/`; a caller may pass a full `companyUrl`
  (or a host/path as `companySlug`) to address a custom host, whose origin +
  `…/{caw}/{lang}/` segment is used verbatim, and we enumerate via the absolute
  `…/job/…` hrefs the listing HTML actually serves.
- **Q-PU-2 — `caw` vs `cw` and language token.** Most tenants serve `caw/en/`;
  some serve `cw/`, localised languages (`en-us`), or a `mob/` mobile variant.
  **Default (proceeding):** build the base from `caw/en/`, but enumerate roles
  from the absolute `…/{instanceId}/{seg}/{lang}/job/…` hrefs parsed out of the
  listing HTML, so whatever segment the tenant actually serves is followed.
- **Q-PU-3 — Detail structured data.** PageUp detail pages reliably render
  `<strong>`-labelled fields (`Job no:`, `Work type:`, `Location:`, `Categories:`,
  `Advertised:`); a schema.org `JobPosting` JSON-LD block is present only where the
  tenant has enabled Google-for-Jobs. **Default (proceeding):** parse the labelled
  fields as the primary surface, layering JSON-LD (recursively walking arrays /
  `@graph`) and `og:` meta as fallbacks; any malformed / absent block degrades to
  "use the labelled fields", never a failure.

## 10. Decisions

- D-1: Primary surface is the public, anonymous **server-rendered** listing index
  (`/{instanceId}/caw/en/listing/`) for role enumeration (parsing real
  `…/job/{jobId}/{slug}` anchors) plus each role's server-rendered detail page
  (`<strong>`-labelled fields). **Confidence: verified** — the platform host
  `careers.pageuppeople.com`, numeric instance-id addressing, the
  `…/job/{jobId}/{slug}` detail-link pattern, the `?page=&page-items=` pagination,
  and the labelled detail fields were confirmed live 2026-06-03 against real,
  named tenants (Calor `595`, SA Health `532`, La Trobe `533`, Thiess `399`).
- D-2: There is no public, tenant-agnostic JSON list feed (the documented
  recruitment APIs require oAuth). The server-rendered listing + per-role detail
  pages are the documented, no-auth, crawlable surface and are used here.
- D-3: The richest structured fields available per role are the labelled
  `Work type:`, `Location:`, `Categories:`, and `Advertised:` rows (plus JSON-LD
  `title` / `description` / `datePosted` / `employmentType` / `hiringOrganization`
  / `jobLocation` where present). The numeric job id (from the detail URL / `Job
  no:`) is the stable per-role ATS id.
- D-4: The listing index paginates (`?page=&page-items=`); the adapter walks pages
  bounded by `resultsWanted` (and a hard page ceiling), de-dups by `atsId`, and
  slices the enumerated set to `resultsWanted` before fetching detail pages.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and the
  labelled fields + `og:` meta via bounded regexes — keeping the plugin
  dependency-free and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-pageup/` — implementation.
- Surface researched + verified live 2026-06-03 (no authentication):
  - Platform host `careers.pageuppeople.com` and numeric instance-id addressing
    (`/{instanceId}/caw/en/listing/`) confirmed, with named real tenants: Calor
    (`595`), SA Health (`532`), La Trobe University (`533`), Thiess (`399`), Asahi
    (`527`), CSU (`873`).
  - Server-rendered listing anchors (`…/job/{jobId}/{slug}`), `?page=&page-items=`
    pagination, and `<strong>`-labelled detail fields (`Job no:`, `Work type:`,
    `Location:`, `Categories:`, `Advertised:`, `Applications close:`) confirmed live.
  - Custom-host pattern (`pupcareers.pageuppeople.com`) also confirmed live.
