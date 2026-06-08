# Spec: 411 — Sense ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 411                                           |
| Slug           | source-ats-sense                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Sense (sensehq.com — a US recruiting CRM / talent-engagement & TRM platform whose hosted
career sites are powered by the Skillate ATS it absorbed) hosts a branded, public,
candidate-facing career site for every customer tenant on its own sub-domain of the shared
host `https://{tenant}.sensehq.com/careers`. Each tenant career site is backed by a **public,
anonymous JSON feed** on the same host — `GET /careers/api/jobs?page={n}` — that returns a
`{ success, data: { count, rows } }` envelope whose `data.rows[]` array holds the tenant's
open roles. The feed needs no bearer token and no API key (it is the exact feed the career
site's own front-end consumes), so the board is directly crawlable without authentication and
without a headless browser. Ever Jobs has no adapter for Sense-powered career sites, so these
(US-heavy mid-market / staffing) vacancy catalogues are currently un-ingestable. A single
generic, multi-tenant Sense adapter unlocks the full catalogue of Sense-powered career boards
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-sense` plugin that ingests roles from **any** Sense
  career site given a `companySlug` (the tenant sub-domain label, e.g. `sensehr`) or a
  `companyUrl` (a career-site URL on a `sensehq.com` host, from which the tenant label is
  derived).
- Use the **public, anonymous** surface (no auth, no API key): the tenant career host's jobs
  feed `GET https://{tenant}.sensehq.com/careers/api/jobs?page={n}`, returning
  `{ success, data: { count, rows } }`; each role carries a numeric `id`, `title`, `location`,
  `department`, `description_external` (HTML), `job_type`, `workplace_type`, a structured
  `office` ({ city, state, country, … }), and `created_on` / `updated_on` epoch-ms timestamps.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'sense'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Sense TRM API. This plugin consumes only the public candidate-facing
  career-site feed on the tenant host.
- The embedded-iframe (`/careers/iframe/jobs`) HTML rendering path — the adapter consumes the
  clean JSON feed (`/careers/api/jobs`) behind it instead.
- Server-side filtering by department / location / type (the feed supports facets). We ingest
  the tenant's full role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, talent-pool signup, or any write
  operation.
- A curated seed list of Sense tenant sub-domains (handled by the source-adoption backlog, not
  this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sense plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Sense adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.sensehq.com`) or from a `companyUrl` on a `sensehq.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public jobs feed `GET /careers/api/jobs?page={n}` on the tenant host as JSON. | must |
| FR-3  | Read `data.rows[]` from the `{ success, data: { count, rows } }` envelope; drain pages by 0-based index until `rows` is empty / `count` is reached, bounded by a page cap. | must |
| FR-4  | Use each role's numeric `id` (e.g. `217`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using `{origin}/careers/jobs/{id}` as the canonical detail / apply URL. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 5xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous career-site feed |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SENSE, name: 'Sense', category: 'ats', isAts: true })
class SenseService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-04):

```
GET https://{tenant}.sensehq.com/careers/api/jobs?page=0
  → JSON envelope (no bearer token):
      { "success": true,
        "data": { "count": 15,
                  "rows": [
                    { "id": 217,
                      "title": "DevOps Engineer",
                      "location": "Bengaluru",
                      "department": "India", "department_id": 1,
                      "description_external": "<ul>…</ul>",
                      "job_type": "FULLTIME",
                      "code": "IND00217",
                      "workplace_type": null,
                      "office": { "city":"Bengaluru", "state":"Karnataka",
                                  "country":"India", "location":"…", "name":"India HQ",
                                  "pin_code":"560029" },
                      "open_positions": 1,
                      "experience_start": 2, "experience_end": 4,
                      "organization_id": 5012,
                      "job_status": "OPEN",
                      "created_on": 1779689800339, "updated_on": 1779690587800 }
                  ] } }

Pagination:  `page` is 0-based; the server returns a fixed 10-row page size (any `limit`
             query value is ignored). `page=0` (== no param) → first 10 rows; `page=1` → next
             slice; an out-of-range page → empty `rows` (with `count` still populated).

Canonical per-role detail / apply URL:  https://{tenant}.sensehq.com/careers/jobs/{id}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (numeric)                                      | `atsId`, `id`           | `id` is prefixed `sense-{atsId}`; role skipped if absent    |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `{origin}/careers/jobs/{id}`                        | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description_external`                              | `description`           | rendered HTML; format-converted (HTML / Markdown / Plain)   |
| `created_on` (epoch ms)                             | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `office.city`/`location`, `office.state`, `office.country` | `location`       | structured city / state / country; null when none           |
| `workplace_type` (contains `remote`) + title/location/department regex | `isRemote` | structured token first, then text regex (`remote`/`wfh`…) |
| `department`                                        | `department`            | when present                                                |
| `job_type`                                          | `employmentType`        | humanised (`FULLTIME` → `Full Time`)                         |
| de-slugified tenant label                           | `companyName`           | the feed carries no brand name                              |
| —                                                   | `site`                  | constant `Site.SENSE`                                       |
| —                                                   | `atsType`               | constant `'sense'`                                          |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `sensehr`) → expanded to `https://sensehr.sensehq.com`.
- `companySlug` containing a bare host / `sensehq.com` → tenant taken from the host.
- `companyUrl` on a `sensehq.com` host → leading sub-domain label is the tenant
  (`www` / `app` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 5xx), or no roles     |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/sense.e2e-spec.ts`): known tenant (`companySlug: 'sensehr'`) returns shaped
  jobs (`site === Site.SENSE`, `atsType === 'sense'`, `atsId`/`jobUrl` defined); `companyUrl`
  resolution path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured (against the multi-page `sensehr` board). Network-tolerant (zero
  results is acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on
  network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SE-1 — Public vs authenticated API.** Sense exposes a public per-tenant career-site feed
  `{tenant}.sensehq.com/careers/api/jobs` (no token) in addition to the authenticated Sense
  TRM API. **Default (proceeding):** use the public career-site feed only — it needs no
  credentials and is the exact source the tenant's own career site consumes.
- **Q-SE-2 — Stable per-role id.** Each role carries a numeric `id` (e.g. `217`). **Default
  (proceeding):** use `id` (stringified) directly as the stable ATS id; the canonical public
  URL is assembled as `{origin}/careers/jobs/{id}` (confirmed HTTP 200 live).
- **Q-SE-3 — Company display name.** The feed records carry no tenant brand name (only a
  numeric `organization_id`). **Default (proceeding):** derive a de-slugified, title-cased
  company name from the tenant sub-domain label.
- **Q-SE-4 — Pagination.** The feed is paginated with a 0-based `page` index and a fixed
  10-row server page size (the `limit` param is ignored). **Default (proceeding):** drain
  pages 0,1,2,… while `rows` is non-empty and `(page+1)·10 < count`, bounded by a page cap,
  stopping early once `resultsWanted` roles are collected.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant career-site jobs feed
  `GET https://{tenant}.sensehq.com/careers/api/jobs?page={n}`, returning
  `{ success, data: { count, rows } }`. **Confidence: verified** — the platform, the
  `{tenant}.sensehq.com/careers` addressing, the feed envelope, the per-role fields, the
  0-based page pagination (fixed 10-row size), and the `{origin}/careers/jobs/{id}` detail
  shape were confirmed live 2026-06-04 against the named real tenant `sensehr` (Sense's own
  board — 15 live roles, first id `217` "DevOps Engineer"; detail page `/careers/jobs/217`
  returned HTTP 200). An unknown tenant host answered HTTP 500.
- D-2: The feed is consumed as a JSON REST endpoint (not the SSR / iframe HTML rendering, and
  not the authenticated Sense TRM API); the adapter GETs JSON and reads `data.rows[]`,
  narrowing it to an array defensively.
- D-3: Each role carries a numeric `id`, `title`, `location` / structured `office`,
  `description_external` (HTML), `department`, `job_type` (employment type), and a
  `workplace_type`. The `id` is the stable per-role ATS id; the detail URL is assembled from
  it as `{origin}/careers/jobs/{id}`.
- D-4: The feed paginates with a 0-based `page` index at a fixed 10-row server page size; the
  adapter drains pages while `rows` is non-empty and the total `count` is not yet reached
  (bounded by a page cap), dedupes by `atsId`, and stops once `resultsWanted` roles are
  collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-sense/` — implementation.
- Surface verified live 2026-06-04 (no authentication):
  - Platform + tenant host pattern `{tenant}.sensehq.com/careers`, confirmed with the named
    real tenant `sensehr` (Sense's own careers board).
  - The public feed `GET /careers/api/jobs?page=0` returned
    `{ success:true, data:{ count:15, rows:[…] } }` with 15 live roles (first row id `217`,
    "DevOps Engineer", `job_type` `FULLTIME`, structured `office` Bengaluru / Karnataka /
    India). `page=1` returned the remaining 5 rows; `page=2` returned an empty `rows` array.
    The canonical detail page `/careers/jobs/217` returned HTTP 200; an unknown tenant host
    returned HTTP 500. verified=true.
