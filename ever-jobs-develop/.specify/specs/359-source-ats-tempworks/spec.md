# Spec: 359 — TempWorks ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 359                                           |
| Slug           | source-ats-tempworks                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), Avionté (staffing job board)   |

## 1. Problem Statement

TempWorks (tempworks.com) is a US staffing-agency software vendor whose
candidate-facing product is the public "Job Board". Every customer tenant
(staffing agency) publishes a branded, public job board on a path segment of the
shared host `jobboard.ontempworks.com` (`https://jobboard.ontempworks.com/{tenant}`,
where `{tenant}` is the agency's board id, e.g. `JustInTimeStaffing`). The board
is a server-rendered (ASP.NET MVC) site: its jobs listing page enumerates every
open order, each order has a server-rendered detail page, and applications flow
through the tenant's public HRCenter. Ever Jobs has no adapter for
TempWorks-powered job boards, so these openings are currently un-ingestable. A
single generic, multi-tenant TempWorks adapter unlocks the full catalogue of
TempWorks-powered staffing boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-tempworks` plugin that ingests open
  orders from **any** TempWorks Job Board given a `companySlug` (the board id,
  e.g. `JustInTimeStaffing`) or a `companyUrl` (a board URL on
  `jobboard.ontempworks.com` whose first path segment is the tenant).
- Use the **public, anonymous** surface (no auth, no API key): the tenant jobs
  listing page (`/{tenant}/Jobs/Search`) to enumerate open orders, plus each
  order's server-rendered detail page (`/{tenant}/Jobs/Details/{orderId}`).
- Map every order into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'tempworks'`, `applyUrl` → public HRCenter).

## 3. Non-Goals

- The authenticated TempWorks OpenAPI / Job Board API (`developer.ontempworks.com`,
  Swagger, per-tenant credential). This plugin consumes only the public
  candidate-facing Job Board HTML.
- Server-side filtering by keyword / location / distance (the board supports these
  facets). We ingest the tenant's full open-orders list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation (the
  "Apply with Us" HRCenter flow is surfaced as `applyUrl` only).
- A curated seed list of TempWorks tenant board ids (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the TempWorks plugin at a
> tenant's board id, so that I ingest that agency's full open-orders list without
> writing a bespoke scraper.

> As a **plugin host**, I want the TempWorks adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the board tenant from `companySlug` (the board id) or from the first path segment of a `companyUrl` on `ontempworks.com`. | must |
| FR-2  | Fetch the public jobs listing page (`GET /{tenant}/Jobs/Search`) and enumerate `/Jobs/Details/{orderId}` open-order links (with card title + location). | must |
| FR-3  | Fetch each order's detail page and parse its `<h1>` title, description body, and HRCenter apply link; use the order id as `atsId`. | must |
| FR-4  | De-duplicate orders by `atsId` within a single run.                                                  | must     |
| FR-5  | Map each order to `JobPostDto` (title, url, location, remote, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated order set before fetching details. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed pages without throwing.           | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public listing + detail pages    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TEMPWORKS, name: 'TempWorks', category: 'ats', isAts: true })
class TempWorksService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched + confirmed live 2026-06-03):

```
GET https://jobboard.ontempworks.com/{tenant}/Jobs/Search?Keywords=&Location=
  → server-rendered HTML; each open order is a card linking to its detail page:
    <a href="/{tenant}/Jobs/Details/{orderId}?Distance=…&SortBy=…&RowNum=…">
      <h3><strong>Welder Fabricators, Welders</strong></h3>
    </a>
    <p><em>Mentor, OH</em> Long Term to Permanent 4 Weeks ago</p>

GET https://jobboard.ontempworks.com/{tenant}/Jobs/Details/{orderId}
  → server-rendered HTML carrying:
    <h1>Welder Fabricators, Welders</h1>
    … the full ad body (duties / requirements) …
    <a href="https://hrcenter.ontempworks.com/en/{tenant}?orders={orderId}">Apply with Us</a>
```

Wire shape → `JobPostDto` mapping:

| Board HTML field                                       | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| order id from `/Jobs/Details/{orderId}` link           | `atsId`, `id`           | `id` is prefixed `tempworks-{atsId}`                        |
| detail `<h1>` (else listing card heading / `og:title`) | `title`                 | required; order skipped if absent                           |
| detail-page URL                                        | `jobUrl`                | absolute public detail URL                                  |
| HRCenter "Apply with Us" href (else `jobUrl`)          | `applyUrl`              | public `hrcenter.ontempworks.com/en/{tenant}?orders={id}`   |
| description block (else `og:description` plain text)    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| card `<em>{city}, {state}</em>`                         | `location`              | city / state; null when none usable                         |
| title / location / body text                            | `isRemote`              | remote detection (`remote` / `wfh` / `telecommute` …)       |
| tenant board id (de-slugified, camel-split)             | `companyName`           | `JustInTimeStaffing` → `Just In Time Staffing`              |
| —                                                       | `site`                  | constant `Site.TEMPWORKS`                                   |
| —                                                       | `atsType`               | constant `'tempworks'`                                      |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `JustInTimeStaffing`) → board base `https://jobboard.ontempworks.com/JustInTimeStaffing`.
- `companyUrl` whose hostname ends in `ontempworks.com` → the first path segment
  (`/{tenant}/…`) is the tenant (an HRCenter apply URL's `/en/{tenant}` is also recognised).
- A bare board URL passed as `companySlug` → the tenant path segment is recovered.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or no orders  |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page or per-order map error — partial, never throws             |

## 8. Test Plan

- E2E (`__tests__/tempworks.e2e-spec.ts`): known tenant
  (`companySlug: 'JustInTimeStaffing'`) returns shaped jobs (`site === Site.TEMPWORKS`,
  `atsType === 'tempworks'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TW-1 — Board pagination.** The listing page renders the tenant's open
  orders; very large boards may lazy-load further orders via scroll/postback.
  **Default (proceeding):** parse every `/Jobs/Details/{id}` link present in the
  first listing response and slice to `resultsWanted` — sufficient for the common
  case and never over-fetches.
- **Q-TW-2 — Card CSS classes.** Per-card class names vary by board theme, and an
  unauthenticated no-JS fetch confirmed the structural markers (the
  `/Jobs/Details/{id}` link, the heading, and the `{city}, {state}` `<em>` text)
  but not exact theme classes. **Default (proceeding):** extract fields from the
  stable structural markers (link → id, nearest heading → title, `<em>` → location)
  and enrich from the detail page's `<h1>` + description block, falling back to
  `og:` meta when a block is absent.
- **Q-TW-3 — Apply flow.** Applications run through the tenant's public HRCenter
  (`hrcenter.ontempworks.com/en/{tenant}?orders={id}`). **Default (proceeding):**
  surface that link as `applyUrl`; no write / submission is performed.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant Job Board — the jobs
  listing page (`/{tenant}/Jobs/Search`) for order enumeration plus each order's
  server-rendered detail page (`/{tenant}/Jobs/Details/{orderId}`). This mirrors
  the sibling staffing job-board adapter (Avionté). **Confidence: verified** — the
  board host, listing path, detail path, and HRCenter apply URL were confirmed
  live 2026-06-03 against a real tenant (`JustInTimeStaffing`); per-card theme
  classes are handled defensively.
- D-2: The authenticated TempWorks OpenAPI (Swagger / Job Board API) is a non-goal;
  it requires a per-tenant credential and is not tenant-agnostic. The public Job
  Board HTML is the no-auth, crawlable surface and is used here.
- D-3: The richest structured fields available per order are the detail-page `<h1>`
  title, the listing card's `{city}, {state}` location, the ad body, and the
  HRCenter apply URL. The TempWorks order id (from the detail link) is the stable
  per-order ATS id.
- D-4: The listing page enumerates the tenant's open orders; the adapter slices
  the enumerated set to `resultsWanted` before fetching detail pages. De-dup is by
  `atsId`.
- D-5: HTML is parsed with bounded regexes (detail-link scan + per-card heading /
  `<em>` location + detail `<h1>` / description block + `og:` fallbacks) — keeping
  the plugin dependency-free and resilient to minor cross-theme markup drift.

## 11. References

- `packages/plugins/source-ats-tempworks/` — implementation.
- Surface researched + confirmed live 2026-06-03 (no authentication):
  - Board host `jobboard.ontempworks.com/{tenant}`, listing path
    `/{tenant}/Jobs/Search`, detail path `/{tenant}/Jobs/Details/{orderId}`, and
    HRCenter apply URL `https://hrcenter.ontempworks.com/en/{tenant}?orders={orderId}`
    all confirmed live, with named real tenants: `JustInTimeStaffing`
    (Just In Time Staffing), `jjstaff`, `RPM`.
  - The board carries no schema.org `JobPosting` JSON-LD; fields are parsed from the
    server-rendered HTML (listing cards + detail body). The authenticated TempWorks
    OpenAPI is documented at `developer.ontempworks.com` and is a non-goal.
