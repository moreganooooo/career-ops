# Spec: 395 — Hirehive ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 395                                           |
| Slug           | source-ats-hirehive                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply), 366 (Scout Talent)   |

## 1. Problem Statement

Hirehive (hirehive.com, Cork, Ireland — an EU/Irish SMB applicant-tracking system used by
hundreds of companies) hosts a branded, public, candidate-facing career site for every
customer tenant on its own sub-domain of the shared host `https://{tenant}.hirehive.com/`.
Each tenant career site is backed by a **public, anonymous JSON feed** on the same host —
`GET /api/v2/jobs?page={n}&page_size={k}&source=CareerSite` — that returns a JSON:API-style
envelope `{ meta, links, items }` whose `items[]` array holds the tenant's open roles. The
endpoint advertises `security: []` (no bearer token) in Hirehive's published OpenAPI spec
and is the exact feed the tenant's own career site consumes, so the board is directly
crawlable without authentication and without a headless browser. Ever Jobs has no adapter
for Hirehive-powered career sites, so these (EU-heavy SMB) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Hirehive adapter unlocks the full catalogue
of Hirehive-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hirehive` plugin that ingests roles from **any**
  Hirehive career site given a `companySlug` (the tenant sub-domain label, e.g. `hirehive`)
  or a `companyUrl` (a career-site URL on a `hirehive.com` host, from which the tenant label
  is derived).
- Use the **public, anonymous** surface (no auth, no API key): the tenant career host's
  jobs feed `GET https://{tenant}.hirehive.com/api/v2/jobs?page={n}&page_size={k}&source=CareerSite`,
  returning `{ meta, links, items }`; each role carries a string `id`, `title`, `location`,
  `state_code`, `country` ({ name, code }), `description` ({ html, text }), `category`
  ({ id, name }), `type` ({ type, name }), `published_date`, and `hosted_url`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'hirehive'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated `api.hirehive.com/v1.0/{company_id}/...` REST API (it requires a bearer
  token per Hirehive's docs). This plugin consumes only the public candidate-facing
  CareerSite feed on the tenant host.
- Server-side filtering by category / location / type / experience (the feed supports these
  facets). We ingest the tenant's full role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Hirehive tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Hirehive plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Hirehive adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.hirehive.com`) or from a `companyUrl` on a `hirehive.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public CareerSite jobs feed `GET /api/v2/jobs?page={n}&page_size=100&source=CareerSite` on the tenant host as JSON. | must |
| FR-3  | Read `items[]` from the `{ meta, links, items }` envelope; drain pages while `meta.has_next_page` is true, bounded by a page cap. | must |
| FR-4  | Use each role's string `id` (e.g. `job_QxZUlo`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using the role's `hosted_url` as the canonical detail / apply URL. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous CareerSite feed |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HIREHIVE, name: 'Hirehive', category: 'ats', isAts: true })
class HirehiveService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.hirehive.com/api/v2/jobs?page=1&page_size=100&source=CareerSite
  → JSON envelope (security: [] — no bearer token):
      { "meta":  { "page":1, "page_size":100, "total_items":11, "total_pages":1,
                   "has_next_page":false, "has_previous_page":false },
        "links": { "first":"…", "last":"…", "next":null, "previous":null },
        "items": [
          { "id":"job_QxZUlo", "title":"Human Resources Assistant",
            "location":"San Francisco", "state_code":"CA",
            "country":{ "name":"United States", "code":"US" },
            "salary":null,
            "description":{ "html":"…", "text":"…" },
            "category":{ "id":"cat_cQIJoW", "name":"HR" },
            "type":{ "type":"FullTime", "name":"Full Time" },
            "experience":{ "type":"EntryLevel", "name":"Entry Level" },
            "language":{ "name":"English", "code":"en-US" },
            "published_date":"2018-05-16T10:36:01.3Z",
            "created_date":"2018-05-16T10:35:50.67Z",
            "hosted_url":"https://hirehive-testing-account.hirehive.com/human-resources-assistant-san-francisco-QxZUlo",
            "compensation_tiers":[] }
        ] }

Canonical per-role detail / apply URL:  items[].hosted_url
  (shape: https://{tenant}.hirehive.com/{title}-{location}-{shortId})
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `hirehive-{atsId}`; role skipped if absent |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `hosted_url`                                         | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description.html` (else `description.text`)        | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `published_date`                                    | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `location`, `state_code`, `country.name`/`code`     | `location`              | structured city / state / country; null when none           |
| `type.type` (contains `remote`) + title/location/category regex | `isRemote`  | structured token first, then text regex (`remote`/`home office`/`wfh`…) |
| `category.name`                                     | `department`            | when present                                                |
| `type.name`                                         | `employmentType`        | e.g. `Full Time`                                            |
| de-slugified tenant label                           | `companyName`           | the feed carries no brand name                              |
| —                                                   | `site`                  | constant `Site.HIREHIVE`                                    |
| —                                                   | `atsType`               | constant `'hirehive'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `hirehive`) → expanded to `https://hirehive.hirehive.com`.
- `companySlug` containing a bare host / `hirehive.com` → tenant taken from the host.
- `companyUrl` on a `hirehive.com` host → leading sub-domain label is the tenant
  (`www` / `app` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/hirehive.e2e-spec.ts`): known tenant (`companySlug: 'hirehive'`) returns
  shaped jobs (`site === Site.HIREHIVE`, `atsType === 'hirehive'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured (against the multi-page
  `hirehive-testing-account` demo board). Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HH-1 — Public vs authenticated API.** Hirehive exposes two API families: the
  authenticated `api.hirehive.com/v1.0/{company_id}/...` REST API (bearer token) and the
  public per-tenant CareerSite feed `{tenant}.hirehive.com/api/v2/jobs` (`security: []`).
  **Default (proceeding):** use the public CareerSite feed only — it needs no credentials
  and is the exact source the tenant's own career site consumes.
- **Q-HH-2 — Stable per-role id.** Each role carries a string `id` (e.g. `job_QxZUlo`).
  **Default (proceeding):** use `id` directly as the stable ATS id; the canonical public
  URL is taken from the role's own `hosted_url` (which already encodes the short id).
- **Q-HH-3 — Company display name.** The feed records carry no tenant brand name. **Default
  (proceeding):** derive a de-slugified, title-cased company name from the tenant
  sub-domain label.
- **Q-HH-4 — Pagination.** The feed is paginated (`page` / `page_size` ≤ 100, with
  `meta.has_next_page`). **Default (proceeding):** request `page_size=100` and drain pages
  while `has_next_page` is true, bounded by a page cap, stopping early once `resultsWanted`
  roles are collected.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant CareerSite jobs feed
  `GET https://{tenant}.hirehive.com/api/v2/jobs?...&source=CareerSite`, returning
  `{ meta, links, items }`. **Confidence: verified** — the platform, the
  `{tenant}.hirehive.com` addressing, the feed envelope, the per-role fields, and the
  `hosted_url` detail shape were confirmed live 2026-06-03 against named real tenants:
  `hirehive` (HireHive's own board — 1 live role, `job_fVDsSf` "Speculative Application"),
  `hirehive-testing-account` (HireHive demo — 11 live roles across multiple pages,
  exercising pagination), and `amcsgroup` (AMCS Group, with public `/Embed/Job/{id}`
  pages). The feed advertises `security: []` (no bearer token) in Hirehive's published
  OpenAPI spec.
- D-2: The feed is consumed as a JSON REST endpoint (not a SPA needing a headless browser,
  and not the authenticated `api.hirehive.com` REST API needing credentials); the adapter
  GETs JSON and reads `items[]`, narrowing it to an array defensively.
- D-3: Each role carries a string `id`, `title`, `location` / `state_code` / `country`,
  `description` ({ html, text }), `category` (department), `type` (employment type), and a
  `hosted_url`. The `id` is the stable per-role ATS id; `hosted_url` is the canonical
  detail / apply URL.
- D-4: The feed paginates; the adapter requests `page_size=100`, drains pages via
  `has_next_page` (bounded by a page cap), dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-hirehive/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.hirehive.com`, confirmed with named real
    tenants `hirehive` (HireHive), `hirehive-testing-account` (HireHive demo), `amcsgroup`
    (AMCS Group).
  - The public CareerSite feed `GET /api/v2/jobs?page=1&page_size=N&source=CareerSite`
    returned `{ meta, links, items }` with 1 live role for `hirehive` (`job_fVDsSf`,
    `hosted_url` `https://hirehive.hirehive.com/speculative-application-cork-fVDsSf`) and
    11 roles across 2+ pages for `hirehive-testing-account` (first role `job_QxZUlo`,
    `hosted_url` `.../human-resources-assistant-san-francisco-QxZUlo`). The endpoint is
    documented `security: []` (no bearer token). verified=true.
