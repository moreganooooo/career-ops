# Spec: 414 — Symphony Talent ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 414                                           |
| Slug           | source-ats-symphonytalent                     |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 397 (PeopleStrong)            |

## 1. Problem Statement

Symphony Talent (symphonytalent.com — an enterprise recruitment-marketing / candidate-CRM
vendor that absorbed SmashFly Technologies; its flagship product is **SmashFlyX**) powers
branded, public, candidate-facing career sites for large enterprise customers (more than 100
customers, including many of the Fortune 500). Every such career site renders its job board
through the same "CWS" career-website widget, which consumes **one shared, public, anonymous
JSON jobs API** on Symphony Talent's hosting cloud (`m-cloud.io`), addressing the tenant
purely by a **numeric organisation id** (`Organization` / `org_id`):

```
GET https://jobsapi-internal.m-cloud.io/api/job?Organization={orgId}&Limit={n}&offset={k}
```

The endpoint requires no bearer token / API key — it is the exact feed the tenant's own
public career site calls cross-origin (as JSONP), and it also answers a plain `GET` with
`Content-Type: application/json`. It returns a flat envelope `{ totalHits, queryResult }`
whose `queryResult[]` array holds the tenant's open roles. Ever Jobs has no adapter for
Symphony Talent / SmashFlyX career sites, so these (enterprise) vacancy catalogues are
currently un-ingestable. A single generic, multi-tenant Symphony Talent adapter unlocks the
full catalogue of SmashFlyX-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-symphonytalent` plugin that ingests roles from
  **any** Symphony Talent / SmashFlyX career site given a `companySlug` (the numeric
  `Organization` id, e.g. `2015`) or a `companyUrl` (a URL carrying an `Organization=` query
  param, from which the id is derived).
- Use the **public, anonymous** surface (no auth, no API key): the shared jobs API
  `GET https://jobsapi-internal.m-cloud.io/api/job?Organization={orgId}&Limit={n}&offset={k}`,
  returning `{ totalHits, queryResult }`; each role carries a numeric `id`, `title`, an HTML
  `description`, `primary_city` / `primary_state` / `primary_country`, `department` /
  `primary_category`, `employment_type`, `location_type`, `open_date`, `company_name`, a
  canonical public `url`, and an `fndly_url` apply link.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'symphonytalent'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated SmashFly Console / Job-Import REST API (`recruit.smashfly.com`) and the
  contact / CRM extract APIs (they require credentials). This plugin consumes only the public
  candidate-facing CWS jobs feed on the shared `m-cloud.io` host.
- Server-side faceting by category / location / type (the feed supports `facet` aggregations).
  We ingest the tenant's role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list / directory of Symphony Talent `Organization` ids (handled by the
  source-adoption backlog, not this plugin).
- Resolving an arbitrary branded career-site domain → org id by fetching + parsing the page's
  injected `org_id`. The plugin addresses tenants by the numeric `Organization` id (or a URL
  that carries it as a query param).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Symphony Talent plugin at a tenant's
> numeric organisation id, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Symphony Talent adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant's numeric `Organization` id from `companySlug` (a bare numeric id, or a URL carrying `Organization=`) or from a `companyUrl` carrying `Organization=` (or a numeric path segment on the API / vendor host). | must |
| FR-2  | Fetch the public jobs feed `GET https://jobsapi-internal.m-cloud.io/api/job?Organization={orgId}&Limit=100&offset={k}` as JSON. | must |
| FR-3  | Read `queryResult[]` from the `{ totalHits, queryResult }` envelope; drain pages by advancing `offset` while roles remain (bounded by `totalHits` and a page cap). | must |
| FR-4  | Use each role's numeric `id` (e.g. `23398009`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using the role's `url` as the canonical detail URL and `fndly_url` (else the detail URL) as the apply URL. | must |
| FR-6  | Convert the role description (HTML) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided (or no org id resolves). | must |
| FR-9  | Tolerate unknown org ids (HTTP 4xx), network errors, empty boards, JSONP-wrapped bodies, and malformed payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous CWS jobs feed   |
| NFR-2  | A fetch failure or unknown org must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SYMPHONYTALENT, name: 'Symphony Talent', category: 'ats', isAts: true })
class SymphonyTalentService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://jobsapi-internal.m-cloud.io/api/job?Organization=2015&Limit=100&offset=1
  → JSON envelope (no bearer token):
      { "aggregations": …, "titles": …, "totalHits": 3,
        "queryResult": [
          { "id": 23398009,
            "title": "Technical Project Manager - (US – Remote)",
            "company_name": "Symphony Talent",
            "description": "<div …>…</div>",
            "primary_city": "Atlanta", "primary_state": "GA",
            "primary_country": "US", "primary_zip": "30312",
            "department": "Implementation & Project Management",
            "primary_category": "Project Management",
            "function": "Project Manager",
            "employment_type": "Exempt",
            "location_type": "Remote",
            "open_date": "2026-05-18T16:02:35.22Z",
            "url": "https://careers.symphonytalent.com/job/23398009/technical-project-manager-us-remote-remote/",
            "fndly_url": "https://d.hodes.com/r/tp2?…",
            "ref": "41546", "scout_orgid": 2015 }
        ] }

Canonical per-role detail URL:  queryResult[].url
  (shape: {tenantCareerHost}/job/{id}/{seo-slug})
Apply URL:                      queryResult[].fndly_url  (else the detail url)
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                          |
| --------------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `symphonytalent-{atsId}`; role skipped if absent |
| `title`                                             | `title`                 | required; role skipped if absent                               |
| `url`                                               | `jobUrl`                | canonical public detail URL; role skipped if absent            |
| `fndly_url` (else `url`)                            | `applyUrl`              | apply / tracking redirect                                      |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                     |
| `open_date`                                         | `datePosted`            | parsed → `YYYY-MM-DD`                                           |
| `primary_city`, `primary_state`, `primary_country`  | `location`              | structured city / state / country; null when none             |
| `location_type` (contains `remote`) + title/location/category regex | `isRemote` | structured token first, then text regex (`remote`/`wfh`…)     |
| `department` (else `primary_category`)              | `department`            | when present                                                   |
| `employment_type` (else `job_type`)                 | `employmentType`        | e.g. `Full Time`, `Exempt`                                     |
| `company_name` (else `Organization {orgId}`)        | `companyName`           | the feed DOES carry the tenant brand                           |
| —                                                   | `site`                  | constant `Site.SYMPHONYTALENT`                                 |
| —                                                   | `atsType`               | constant `'symphonytalent'`                                    |
| `description` text                                  | `emails`                | harvested via `extractEmails`                                  |

Tenant resolution:

- `companySlug` = a bare numeric `Organization` id (e.g. `2015`) → used directly.
- `companySlug` / `companyUrl` carrying `?Organization={id}` (or `org_id` / `org`) →
  id taken from the query param (case-insensitive).
- `companyUrl` on the API host (`jobsapi-internal.m-cloud.io`) or a `symphonytalent.com`
  host with a numeric path segment → that segment is the id.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable org id, unknown org (HTTP 4xx), or no roles      |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled org — degrades to empty, never throws                  |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/symphonytalent.e2e-spec.ts`): known org (`companySlug: '2015'`) returns
  shaped jobs (`site === Site.SYMPHONYTALENT`, `atsType === 'symphonytalent'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised (`?Organization=2015`);
  no-slug/url returns empty; unknown org degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-ST-1 — Public vs authenticated API.** Symphony Talent exposes the authenticated
  SmashFly Console / Job-Import REST API (`recruit.smashfly.com`, credentials) and the public
  per-org CWS jobs feed `jobsapi-internal.m-cloud.io/api/job` (no token). **Default
  (proceeding):** use the public CWS feed only — it needs no credentials and is the exact
  source the tenant's own career site consumes.
- **Q-ST-2 — Tenant addressing.** The feed is addressed by a numeric `Organization` id
  (`org_id`), not a sub-domain slug. **Default (proceeding):** treat `companySlug` as the
  numeric org id; also accept a URL carrying `?Organization={id}`.
- **Q-ST-3 — Stable per-role id.** Each role carries a numeric `id` (e.g. `23398009`).
  **Default (proceeding):** use `id` (stringified) directly as the stable ATS id; the
  canonical public URL is taken from the role's own `url`.
- **Q-ST-4 — Pagination.** The feed pages by `offset` (1-based, `page * Limit + 1`) with a
  `totalHits` total. **Default (proceeding):** request `Limit=100` and drain pages while roles
  remain and `offset` ≤ `totalHits`, bounded by a page cap, stopping early once
  `resultsWanted` roles are collected.
- **Q-ST-5 — Career-site host.** The feed is host-agnostic (one API host serves all orgs) but
  each role's `url` already carries that org's branded career-site host. **Default
  (proceeding):** take the detail URL from the role's `url`; skip a role that omits it.

## 10. Decisions

- D-1: Primary surface is the public, anonymous shared CWS jobs feed
  `GET https://jobsapi-internal.m-cloud.io/api/job?Organization={orgId}&Limit={n}&offset={k}`,
  returning `{ totalHits, queryResult }`. **Confidence: verified** — the API host, the
  `Organization`-id addressing, the envelope, the per-role fields, and the `url` detail shape
  were confirmed live 2026-06-03: reading the live Symphony Talent CWS widget
  (`careers.symphonytalent.com` injects `org_id: "2015"`, `api:
  https://jobsapi-internal.m-cloud.io/api/`, builds `criteria.Organization = options.org_id`,
  `criteria.Limit`, `criteria.offset`), then a plain `GET ...?Organization=2015&Limit=3&offset=1`
  returned HTTP 200 `application/json` with `{ totalHits: 3, queryResult: [ … ] }` (first
  role `23398009`, `url`
  `https://careers.symphonytalent.com/job/23398009/technical-project-manager-us-remote-remote/`).
- D-2: The feed is consumed as a JSON REST endpoint (not a SPA needing a headless browser,
  and not the authenticated SmashFly Console API needing credentials). The browser variant is
  JSONP; the adapter GETs JSON and also defensively unwraps a `callback(...)` wrapper.
- D-3: Each role carries a numeric `id`, `title`, HTML `description`, `primary_city` /
  `primary_state` / `primary_country`, `department` / `primary_category`, `employment_type`,
  `location_type`, `open_date`, `company_name`, a `url`, and an `fndly_url`. The `id` is the
  stable per-role ATS id; `url` is the canonical detail URL, `fndly_url` the apply link.
- D-4: The feed paginates by `offset`; the adapter requests `Limit=100`, drains pages bounded
  by `totalHits` + a page cap, dedupes by `atsId`, and stops once `resultsWanted` roles are
  collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-symphonytalent/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform: Symphony Talent / SmashFlyX career-site widget ("CWS"), which calls the shared
    jobs API `https://jobsapi-internal.m-cloud.io/api/job` addressed by numeric
    `Organization` id (`org_id`).
  - The public CWS feed `GET /api/job?Organization=2015&Limit=N&offset=1` returned
    `{ totalHits, queryResult }` with live roles for org `2015` (Symphony Talent's own board),
    e.g. role `23398009` ("Technical Project Manager - (US – Remote)", `url`
    `https://careers.symphonytalent.com/job/23398009/…`). No bearer token. verified=true.
