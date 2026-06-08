# Spec: 410 — Recruiteze ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 410                                           |
| Slug           | source-ats-recruiteze                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Recruiteze (recruiteze.com — a US SMB applicant-tracking system / recruiting software used by
hundreds of small businesses and staffing agencies) hosts a branded, public, candidate-facing
career board for every customer tenant on its own sub-domain of the shared host
`https://{tenant}.recruiteze.com/Jobs/AllJobs`. The board is an ASP.NET MVC page whose role
list is rendered client-side by a jQuery DataTables grid; that grid loads its rows from a
**public, anonymous** server-side DataTables endpoint on the same host —
`POST /Jobs/LoadFilteredJobs` — that returns a `{ draw, recordsTotal, recordsFiltered, data }`
JSON envelope whose `data[]` array holds the tenant's open roles. The endpoint needs no bearer
token, cookie, or API key; it is the exact source the tenant's own career board consumes, so
the board is directly crawlable without authentication and without a headless browser (the
only catch: the grid is keyed by an opaque per-tenant encrypted `companyId` token, which the
board page renders into a hidden `#hdnCompanyID` input — one cheap GET harvests it). Ever Jobs
has no adapter for Recruiteze-powered career boards, so these (US-heavy SMB / staffing)
vacancy catalogues are currently un-ingestable. A single generic, multi-tenant Recruiteze
adapter unlocks the full catalogue of Recruiteze-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-recruiteze` plugin that ingests roles from **any**
  Recruiteze career board given a `companySlug` (the tenant sub-domain label, e.g. `spearmc`)
  or a `companyUrl` (a career-site URL on a `recruiteze.com` host, from which the tenant label
  is derived).
- Use the **public, anonymous** surface (no auth, no API key): GET the tenant board page once
  to harvest the encrypted `companyId` from `#hdnCompanyID`, then POST the grid endpoint
  `POST https://{tenant}.recruiteze.com/Jobs/LoadFilteredJobs` (`companyId`, `stateId=0`,
  `jobTypeId=0`, `draw`/`start`/`length`), returning `{ draw, recordsTotal, recordsFiltered,
  data }`; each role carries `ID`, `RecruitezeID`, `JobTitle`, `Location`/`LocationWithComma`/
  `City`/`State`, `Snippet`, `PostedDate`, and `Url`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'recruiteze'`).

## 3. Non-Goals

- The authenticated Recruiteze application / candidate-management APIs (account, pipeline,
  resume drop). This plugin consumes only the public candidate-facing career-board grid.
- Server-side filtering by state / job-type (the grid supports `stateId` / `jobTypeId`
  facets). We ingest the tenant's full role set and slice client-side to `resultsWanted`.
- Per-role detail-page enrichment (full HTML job body). The grid's `Snippet` is used as the
  description; fetching every `/jobs/jobdetail` page would add an N-per-tenant fan-out for
  marginal gain and is left to a future enhancement.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Recruiteze tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Recruiteze plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Recruiteze adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.recruiteze.com`) or from a `companyUrl` on a `recruiteze.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | GET the tenant board page `/Jobs/AllJobs` and harvest the encrypted `companyId` from the hidden `#hdnCompanyID` input. | must |
| FR-3  | POST the public grid endpoint `/Jobs/LoadFilteredJobs` with `companyId` + paging fields; read `data[]` from the `{ draw, recordsTotal, recordsFiltered, data }` envelope. | must |
| FR-4  | Drain pages via `start` + `length` while more rows remain (`recordsFiltered`), bounded by a page cap. | must |
| FR-5  | Use each role's numeric `ID` (fallback `RecruitezeID`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, remote, datePosted, description, applyUrl), using the role's `Url` as the canonical detail / apply URL. | must |
| FR-7  | Convert any role description body (the `Snippet`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when the `companyId` token is absent. | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, missing tokens, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous career-board grid |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | harvest token + parse JSON grid only |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.RECRUITEZE, name: 'Recruiteze', category: 'ats', isAts: true })
class RecruitezeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
1) GET https://{tenant}.recruiteze.com/Jobs/AllJobs
     → HTML carrying  <input id="hdnCompanyID" … value="{encryptedCompanyId}" />

2) POST https://{tenant}.recruiteze.com/Jobs/LoadFilteredJobs
     body (x-www-form-urlencoded):
       companyId={token}&appId=&stateId=0&jobTypeId=0&custom=
       &draw=1&start=0&length=100&search[value]=&search[regex]=false
     → JSON DataTables envelope (no bearer token):
       { "draw":1, "recordsTotal":9, "recordsFiltered":9,
         "data":[
           { "ID":15293, "RecruitezeID":15729,
             "JobTitle":"Grants/PPM Lead for PeopleSoft to Oracle Cloud Migration",
             "Location":"Remote/California", "LocationWithComma":"Remote, California",
             "City":"Remote", "State":"California",
             "Snippet":"SpearMC is seeking motivated and experienced …",
             "PostedDate":"30 Jan 2025",
             "Url":"https://SpearMC.recruiteze.com/jobs/jobdetail?id=urbC%2ftDVyBjlfvk6Aeq5fg%3d%3d",
             "DisplayText":"…", "GridDisplay":"<a href='…'>…</a>",
             "AppliedForJob":false, "TotalCount":9 }
         ] }

Canonical per-role detail / apply URL:  data[].Url
  (shape: https://{tenant}.recruiteze.com/jobs/jobdetail?id={encryptedId})
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                          |
| --------------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `ID` (else `RecruitezeID`)                          | `atsId`, `id`           | `id` is prefixed `recruiteze-{atsId}`; role skipped if absent  |
| `JobTitle`                                          | `title`                 | required; role skipped if absent                               |
| `Url`                                               | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)        |
| `Snippet` (else `DisplayText`)                      | `description`           | format-converted (HTML / Markdown / Plain)                     |
| `PostedDate`                                        | `datePosted`            | parsed → `YYYY-MM-DD`                                           |
| `City` / `State`                                    | `location`              | structured city / state; null when none                        |
| title / location regex (`remote`/`wfh`/…)           | `isRemote`              | text regex over title + location                               |
| de-slugified tenant label                           | `companyName`           | the grid carries no brand name                                 |
| —                                                   | `site`                  | constant `Site.RECRUITEZE`                                     |
| —                                                   | `atsType`               | constant `'recruiteze'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                                  |

Tenant resolution:

- `companySlug` (e.g. `spearmc`) → expanded to `https://spearmc.recruiteze.com`.
- `companySlug` containing a bare host / `recruiteze.com` → tenant taken from the host.
- `companyUrl` on a `recruiteze.com` host → leading sub-domain label is the tenant
  (`www` / `app` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, missing companyId token, unknown tenant (HTTP 4xx), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | grid body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/recruiteze.e2e-spec.ts`): known tenant (`companySlug: 'spearmc'`) returns
  shaped jobs (`site === Site.RECRUITEZE`, `atsType === 'recruiteze'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RZ-1 — Token-keyed grid.** The grid endpoint is keyed by an opaque encrypted
  `companyId` rather than the bare slug. **Default (proceeding):** GET the public board page
  once to harvest the token from `#hdnCompanyID`, then POST the grid; a missing token degrades
  to an empty result.
- **Q-RZ-2 — Stable per-role id.** Each role carries a numeric `ID` and a `RecruitezeID`.
  **Default (proceeding):** use `ID` as the stable ATS id (fallback `RecruitezeID`); the
  canonical public URL is the role's own `Url` (which encodes the encrypted detail id).
- **Q-RZ-3 — Description granularity.** The grid carries a truncated `Snippet`, not the full
  job body. **Default (proceeding):** use the `Snippet` as the description; per-role detail
  enrichment is out of scope (avoids an N-per-tenant fan-out).
- **Q-RZ-4 — Company display name.** The grid records carry no tenant brand name. **Default
  (proceeding):** derive a de-slugified, title-cased company name from the tenant sub-domain
  label.
- **Q-RZ-5 — Pagination.** The grid is a server-side DataTables source (`start` / `length`,
  with `recordsFiltered`). **Default (proceeding):** request `length=100` and drain pages by
  `start` while drained < `recordsFiltered`, bounded by a page cap, stopping early once
  `resultsWanted` roles are collected.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant career-board DataTables grid
  `POST https://{tenant}.recruiteze.com/Jobs/LoadFilteredJobs`, returning
  `{ draw, recordsTotal, recordsFiltered, data }`, keyed by the encrypted `companyId` harvested
  from the board page's hidden `#hdnCompanyID` input. **Confidence: verified** — the platform,
  the `{tenant}.recruiteze.com` addressing, the token harvest, the grid envelope, the per-role
  fields, and the `Url` detail shape were confirmed live 2026-06-03 against named real tenants:
  `spearmc` (SpearMC Consulting — 9 live roles, first role `ID` 15293, `Url`
  `https://SpearMC.recruiteze.com/jobs/jobdetail?id=urbC%2ftDVyBjlfvk6Aeq5fg%3d%3d`),
  `allianceepc` (Alliance Engineers & Project Consultants, token `olfnCQ6yuy5CRRnPWrVw0g==`),
  `mobility4all` (Mobility4All, token `FmDrMk5wVnZ8uphAwrFdUg==`), `infostructures`
  (InfoStructures, Inc.), `augustineinstitute` (Augustine Institute). The grid endpoint
  required no bearer token, cookie, or API key.
- D-2: The grid is consumed as a JSON DataTables endpoint (not a SPA needing a headless
  browser, and not the authenticated application APIs); the adapter POSTs the form body and
  reads `data[]`, narrowing it to an array defensively.
- D-3: Each role carries a numeric `ID` / `RecruitezeID`, a `JobTitle`, `City`/`State`/
  `Location`, a `Snippet`, a `PostedDate`, and a `Url`. The `ID` is the stable per-role ATS id;
  `Url` is the canonical detail / apply URL.
- D-4: The grid paginates; the adapter requests `length=100`, drains pages by `start` (bounded
  by a page cap) while drained < `recordsFiltered`, dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-recruiteze/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.recruiteze.com/Jobs/AllJobs`, confirmed with named
    real tenants `spearmc` (SpearMC), `allianceepc`, `mobility4all`, `infostructures`,
    `augustineinstitute`.
  - The hidden `#hdnCompanyID` token harvested per tenant (`spearmc` →
    `8RhggVIrTZ8wPYlGstD7LA==`, `allianceepc` → `olfnCQ6yuy5CRRnPWrVw0g==`, `mobility4all` →
    `FmDrMk5wVnZ8uphAwrFdUg==`).
  - The public grid `POST /Jobs/LoadFilteredJobs` returned the
    `{ draw, recordsTotal, recordsFiltered, data }` envelope with **9 live roles** for
    `spearmc` (first role `ID` 15293 "Grants/PPM Lead for PeopleSoft to Oracle Cloud Migration",
    `Location` `Remote/California`, `PostedDate` `30 Jan 2025`, `Url`
    `https://SpearMC.recruiteze.com/jobs/jobdetail?id=urbC%2ftDVyBjlfvk6Aeq5fg%3d%3d`). The
    endpoint needed no bearer token. verified=true.
