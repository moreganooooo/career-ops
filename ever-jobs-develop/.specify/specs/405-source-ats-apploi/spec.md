# Spec: 405 — Apploi ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 405                                           |
| Slug           | source-ats-apploi                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Apploi (apploi.com, NYC — a US healthcare / hourly-workforce applicant-tracking & recruitment
platform, now part of Viventium) hosts a branded, public, candidate-facing job board for every
customer tenant on the shared host `https://jobs.apploi.com/`, addressed by a per-tenant
**company-profile slug** (`/profile/{slug}`). The board is a client-rendered SPA backed by two
**public, anonymous JSON APIs** it consumes (no bearer token — the SPA sends an empty
`Authorization: Bearer ` for anonymous visitors): a company-profile endpoint
`GET https://api.apploi.com/v1/company_profiles/{slug}` (which yields the tenant's
`teams_to_show` team ids) and a job-search feed
`GET https://ats-integrations.apploi.com/search/jobs/?teams={csv}&page={n}` returning
`{ data: [ …role… ] }`. The board is therefore directly crawlable without authentication and
without a headless browser. Ever Jobs has no adapter for Apploi-powered boards, so these
(US healthcare / hourly) vacancy catalogues are currently un-ingestable. A single generic,
multi-tenant Apploi adapter unlocks the full catalogue of Apploi-powered boards with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-apploi` plugin that ingests roles from **any**
  Apploi board given a `companySlug` (the profile slug, e.g. `apploi.com`) or a `companyUrl`
  (a `jobs.apploi.com/profile/{slug}` URL, from which the slug is derived).
- Use the **public, anonymous** surface (no auth, no API key): resolve the tenant's teams via
  `GET https://api.apploi.com/v1/company_profiles/{slug}` (`data.teams_to_show`), then drain the
  job-search feed `GET https://ats-integrations.apploi.com/search/jobs/?teams={csv}&page={n}&source=company_profile_page`,
  returning `{ data: [ … ] }`; each role carries a string `id`, `name`, `city`, `state`,
  `address`, `description` (HTML), `job_type`, `industry`, `published_date`, `brand_name`, and
  `redirect_apply_url`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'apploi'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Apploi API (the `search/jobs/` endpoint, when called from an authenticated
  session, carries the user's bearer token; this plugin uses only the anonymous board path).
- Server-side filtering by industry / location / keyword (the feed supports `industry`,
  `city`, `state`, `radius`, `searchbar` facets). We ingest the tenant's full role set and
  slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Apploi tenant profile slugs (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Apploi plugin at a tenant's profile slug,
> so that I ingest that organisation's full open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Apploi adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` or from a `companyUrl` on a `jobs.apploi.com` host (`/profile/{slug}` path). | must |
| FR-2  | Fetch the public company profile `GET /v1/company_profiles/{slug}` on `api.apploi.com`, reading `data.teams_to_show` (fallback `data.team_id`). | must |
| FR-3  | Fetch the public job-search feed `GET /search/jobs/?teams={csv}&page={n}&source=company_profile_page` on `ats-integrations.apploi.com` as JSON. | must |
| FR-4  | Read `data[]` from the `{ data, … }` envelope; drain pages by incrementing `page` until a page returns an empty `data`, bounded by a page cap. | must |
| FR-5  | Use each role's string `id` (e.g. `1736889`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title ← `name`, url ← `redirect_apply_url`, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no teams resolve. | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous board feed      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feeds only |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.APPLOI, name: 'Apploi', category: 'ats', isAts: true })
class ApploiService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-04):

```
GET https://api.apploi.com/v1/company_profiles/{slug}
  → { "data": { "id":30372, "name":"Apploi Corp", "url_slug":"apploi.com",
                "team_id":30610, "teams_to_show":"30610,32770,37756,41018,42745",
                "primary_location":"NYC, NY, USA", … } }

GET https://ats-integrations.apploi.com/search/jobs/?teams=30610,32770,…&page=1&source=company_profile_page
  → { "data": [
        { "id":"1736889", "name":"Account Executive, Enterprise",
          "city":"New York", "state":"New York",
          "address":"25 West 39th Street  New York, New York, 10018 USA",
          "location":{ "lat":40.75, "lon":-73.98 },
          "brand_name":"Apploi Corp",
          "description":"<p>…</p>",
          "job_type":"Full Time", "industry":"Healthcare",
          "published_date":"2026-05-12", "published":true, "team_id":30610,
          "redirect_apply_url":"https://jobs.apploi.com/view/1736889?utm_campaign=integration&…" }
      ],
      "elasticsearch_errors":[], "errors":[], "buckets":[] }
  (An out-of-range `page` returns an empty `data` array — drain-until-empty pagination.)

Canonical per-role detail / apply URL:  data[].redirect_apply_url
  (shape: https://jobs.apploi.com/view/{id}?…)
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `apploi-{atsId}`; role skipped if absent   |
| `name`                                              | `title`                 | required; role skipped if absent (Apploi names it `name`)   |
| `redirect_apply_url`                                | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description`                                       | `description`           | HTML; format-converted (HTML / Markdown / Plain)            |
| `published_date`                                    | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city`, `state`, country (from `country`/`address`) | `location`              | structured city / state / country; null when none           |
| `job_type` (contains `remote`) + title/location/industry regex | `isRemote`   | structured token first, then text regex (`remote`/`wfh`…)   |
| `industry`                                          | `department`            | when present                                                |
| `job_type`                                          | `employmentType`        | e.g. `Full Time`                                            |
| `brand_name` (else profile `name` / de-slugified)   | `companyName`           | role-level brand preferred                                  |
| —                                                   | `site`                  | constant `Site.APPLOI`                                      |
| —                                                   | `atsType`               | constant `'apploi'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `apploi.com`) → used directly as the profile slug.
- `companySlug` containing a board URL → slug taken from the `/profile/{slug}` path.
- `companyUrl` on a `jobs.apploi.com` host → slug taken from the `/profile/{slug}` path.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable slug, unknown tenant (HTTP 4xx), no teams, or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/apploi.e2e-spec.ts`): known tenant (`companySlug: 'apploi.com'`) returns
  shaped jobs (`site === Site.APPLOI`, `atsType === 'apploi'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AP-1 — Slug vs sub-domain addressing.** Unlike a sub-domain ATS, Apploi addresses a
  tenant by a profile slug on the shared `jobs.apploi.com` host. **Default (proceeding):**
  resolve the slug from `companySlug` directly or from a `/profile/{slug}` path in `companyUrl`.
- **Q-AP-2 — Two-hop fetch (profile → teams → jobs).** The job-search feed keys off team ids,
  not the slug; the company profile exposes `teams_to_show`. **Default (proceeding):** fetch the
  profile first, read `teams_to_show` (fallback `team_id`), then query the search feed for those
  teams in one request (CSV `teams` param).
- **Q-AP-3 — Pagination meta.** The search envelope `{ data, elasticsearch_errors, errors,
  buckets }` carries no total / has-next meta. **Default (proceeding):** drain by incrementing
  `page` until a page returns an empty `data` array, bounded by a page cap, stopping early once
  `resultsWanted` roles are collected.
- **Q-AP-4 — Anonymous bearer.** The board SPA sends `Authorization: Bearer ` (empty) for
  anonymous visitors. **Default (proceeding):** mirror the empty bearer header; the feed
  responds 200 anonymously.

## 10. Decisions

- D-1: Primary surface is the pair of public, anonymous board APIs —
  `GET https://api.apploi.com/v1/company_profiles/{slug}` (for `teams_to_show`) and
  `GET https://ats-integrations.apploi.com/search/jobs/?teams={csv}&page={n}&source=company_profile_page`
  (for roles). **Confidence: verified** — the platform, the `jobs.apploi.com/profile/{slug}` +
  `/view/{id}` addressing, the API hosts (baked into the board's client bundle), the profile
  envelope, the search envelope, the per-role fields, and drain-until-empty pagination were all
  confirmed live 2026-06-04 against the real tenant `apploi.com` (profile id `30372`, team ids
  `30610,32770,37756,41018,42745`; first role `id` `1736889`, `redirect_apply_url`
  `https://jobs.apploi.com/view/1736889?…`). The feed responds 200 anonymously (empty bearer).
- D-2: The feeds are consumed as JSON REST endpoints (not a SPA needing a headless browser, and
  not an authenticated API); the adapter GETs JSON and reads `data` / `data[]`, narrowing
  defensively.
- D-3: Each role carries a string `id`, `name` (title), `city`/`state`/`address`, `description`
  (HTML), `industry` (department), `job_type` (employment type), `published_date`, and a
  `redirect_apply_url`. The `id` is the stable per-role ATS id; `redirect_apply_url` is the
  canonical detail / apply URL.
- D-4: The feed paginates with no meta; the adapter increments `page`, stops at the first empty
  `data` (bounded by a page cap), dedupes by `atsId`, and stops once `resultsWanted` roles are
  collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-apploi/` — implementation.
- Surface verified live 2026-06-04 (no authentication):
  - Platform + addressing `jobs.apploi.com/profile/{slug}`, `jobs.apploi.com/view/{id}`;
    API hosts `api.apploi.com` + `ats-integrations.apploi.com` (from the board bundle).
  - `GET /v1/company_profiles/apploi.com` → `{ data: { id:30372, name:"Apploi Corp",
    url_slug:"apploi.com", team_id:30610, teams_to_show:"30610,32770,37756,41018,42745" } }`.
  - `GET ats-integrations.apploi.com/search/jobs/?teams=30610,…&page=1` →
    `{ data: [ { id:"1736889", name:"Account Executive, Enterprise", city:"New York",
    state:"New York", job_type:"Full Time", industry:"Healthcare",
    published_date:"2026-05-12", redirect_apply_url:"https://jobs.apploi.com/view/1736889?…" } ] }`,
    with an out-of-range `page` returning an empty `data` array. verified=true.
