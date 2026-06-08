# Spec: 406 — Kenjo ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 406                                           |
| Slug           | source-ats-kenjo                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Kenjo (kenjo.io, Berlin/Madrid — a DE/ES SMB HR & ATS suite for small-and-medium businesses)
hosts a branded, public, candidate-facing career site for every customer tenant on a
sub-domain of the shared host `https://{tenant}.kenjo.io/` (frequently
`careers-{company}.kenjo.io`). The career site is a client-rendered Angular SPA that loads
its data from a **public, anonymous JSON API** served on the tenant's own career-site origin
— `GET /api/controller/career-site/public/{tenant}/positions` — which returns a career-site
config envelope carrying an `activePositions[]` array of the tenant's active roles. A
per-role detail endpoint (`.../positions/{customUrl}`) enriches each role with its
`jobDescription.html` body. Neither endpoint requires a bearer token, cookie, or API key —
they are the exact feed the public career site renders, so the board is directly crawlable
without authentication and without a headless browser. Ever Jobs has no adapter for
Kenjo-powered career sites, so these (DE/ES-heavy SMB) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Kenjo adapter unlocks the full catalogue of
Kenjo-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-kenjo` plugin that ingests roles from **any** Kenjo
  career site given a `companySlug` (the tenant sub-domain label, e.g. `careers`) or a
  `companyUrl` (a career-site URL on a `kenjo.io` host, from which the tenant label is
  derived).
- Use the **public, anonymous** surface (no auth, no API key): the tenant career host's
  career-site API `GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions`,
  returning a config envelope with `activePositions[]`; each role carries `_id`, `jobTitle`,
  `customUrl`, `positionType`, `companyName`, `officeName`, and (on the detail endpoint)
  `jobDescription.html`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'kenjo'`, `department`, `employmentType`).

## 3. Non-Goals

- The support-gated / authenticated `api.kenjo.io` (and `sandbox-api.kenjo.io`) REST API —
  Kenjo's docs require contacting support for endpoint access and an API key for the core
  data API. This plugin consumes only the public candidate-facing career-site controller on
  the tenant host.
- Driving the Angular SPA with a headless browser. The role data is already JSON on the
  public career-site controller, so it is consumed as a REST endpoint.
- Application submission, candidate accounts, resume drop, or any write operation
  (the second public endpoint creates candidates — out of scope).
- A curated seed list of Kenjo tenant sub-domains (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Kenjo plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full active-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Kenjo adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.kenjo.io`) or from a `companyUrl` on a `kenjo.io` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public career-site list endpoint `GET /api/controller/career-site/public/{tenant}/positions` on the tenant host as JSON. | must |
| FR-3  | Read `activePositions[]` from the returned career-site config envelope (narrowed to an array). | must |
| FR-4  | Use each role's string `_id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Enrich each role from its detail endpoint (`.../positions/{customUrl}`, keyed by `customUrl`) for the `jobDescription.html` body; bound the detail fan-out. | should |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using `{origin}/positions/{customUrl}` as the canonical detail / apply URL. | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping the role loop once collected. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-10 | Tolerate unknown tenants (HTTP 404 `"Company career site was not found."`), network errors, inactive boards, empty `activePositions[]`, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous career-site API |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; detail-fetch cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON API only   |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.KENJO, name: 'Kenjo', category: 'ats', isAts: true })
class KenjoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions
  → career-site config envelope (no bearer token):
      { "companyName":"Kenjo GmbH", "subdomain":"careers", "active":true,
        "defaultLanguage":"en", …branding…,
        "activePositions": [
          { "_id":"5dde37c7913b8600132907a9", "pinned":false,
            "jobTitle":"Initiative Application", "companyId":"…", "customUrl":"initiative",
            "officeId":"…", "positionType":"Full-time",
            "companyName":"Kenjo GmbH", "officeName":"Berlin" }
        ] }

GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions/{customUrl}
  → single role enriched with the description body (keyed by customUrl, NOT _id):
      { "_id":"…", "jobTitle":"…", "customUrl":"initiative",
        "jobDescription":{ "html":"<div>…</div>" },
        "applicationFormFields":[…], "companyCareerSite":{…},
        "companyName":"Kenjo GmbH", "officeName":"Berlin", "positionType":"Full-time" }

HTTP 404 for an absent career site:  { "code":404, "message":"Company career site was not found." }

Canonical per-role public detail / apply page:  https://{tenant}.kenjo.io/positions/{customUrl}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `_id`                                               | `atsId`, `id`           | `id` is prefixed `kenjo-{atsId}`; role skipped if absent    |
| `jobTitle`                                          | `title`                 | required; role skipped if absent                            |
| `{origin}/positions/{customUrl}`                    | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `jobDescription.html` (from detail; else `.text`)   | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `publishedAt` (else `createdAt`)                    | `datePosted`            | parsed → `YYYY-MM-DD`, when present                         |
| `city`/`officeName`, `country`                      | `location`              | structured city / country; null when none                  |
| title/location/positionType/description regex       | `isRemote`              | no structured remote flag — text regex (`remote`/`home office`/`teletrabajo`…) |
| `departmentName`                                    | `department`            | when present                                                |
| `positionType`                                      | `employmentType`        | e.g. `Full-time`                                            |
| `companyName` (else career-site / tenant name)      | `companyName`           | the role carries a real brand name                          |
| `jobDescription` text                               | `emails`                | harvested via `extractEmails`                               |
| —                                                   | `site`                  | constant `Site.KENJO`                                       |
| —                                                   | `atsType`               | constant `'kenjo'`                                          |

Tenant resolution:

- `companySlug` (e.g. `careers`) → expanded to `https://careers.kenjo.io`.
- `companySlug` containing a bare host / `kenjo.io` → tenant taken from the host.
- `companyUrl` on a `kenjo.io` host → leading sub-domain label is the tenant
  (`www` / `app` / `api` / `help` / `sandbox-api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown / absent career site (HTTP 404), inactive board, or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, detail fetch failed, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/kenjo.e2e-spec.ts`): known tenant (`companySlug: 'careers'`) returns
  shaped jobs (`site === Site.KENJO`, `atsType === 'kenjo'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-KJ-1 — Public vs authenticated API.** Kenjo exposes two API families: the
  support-gated / authenticated `api.kenjo.io` REST API (needs an API key) and the public
  per-tenant career-site controller `{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions`
  (no auth). **Default (proceeding):** use the public career-site controller only — it needs
  no credentials and is the exact source the tenant's own career site consumes.
- **Q-KJ-2 — Stable per-role id.** Each role carries a Mongo-style string `_id` and a
  human `customUrl`. **Default (proceeding):** use `_id` as the stable ATS id; the canonical
  public URL is `{origin}/positions/{customUrl}` and the detail endpoint is keyed by
  `customUrl` (NOT `_id`, which 404s).
- **Q-KJ-3 — Description body.** The list endpoint omits `jobDescription`; it lives on the
  per-role detail endpoint. **Default (proceeding):** fetch a bounded number of detail
  records to enrich each role's body; a failed detail fetch leaves the role with no body
  rather than dropping it.
- **Q-KJ-4 — Pagination.** The public list endpoint returns all active roles in a single,
  un-paginated response. **Default (proceeding):** no list pagination; bound the secondary
  detail fan-out by a fetch cap and stop once `resultsWanted` roles are collected.
- **Q-KJ-5 — Remote flag.** The public role records carry no structured remote flag.
  **Default (proceeding):** detect remote via a text regex over title / location /
  positionType / description.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant career-site controller
  `GET https://{tenant}.kenjo.io/api/controller/career-site/public/{tenant}/positions`,
  returning a config envelope with `activePositions[]`. **Confidence: verified** — the
  platform, the `{tenant}.kenjo.io` addressing, the API base
  (`/api/controller/career-site/public/{tenant}`, derived from the live Angular bundle's
  `CAREER_SITE_CONTROLLER_URL` and `host.split('.')[0]` career-site-name resolution), the
  envelope, the per-role fields, and the `/positions/{customUrl}` detail + public-page shape
  were confirmed live 2026-06-03 against the named real tenant `careers` (`careers.kenjo.io`
  — Kenjo GmbH's own active career site: 1 live role `5dde37c7913b8600132907a9`
  "Initiative Application", `customUrl` `initiative`, detail `jobDescription.html` present,
  public page `https://careers.kenjo.io/positions/initiative` HTTP 200).
- D-2: The career site is a client-rendered Angular SPA, but its data is a clean public JSON
  API on the same origin; the adapter GETs JSON and reads `activePositions[]` — no headless
  browser, and not the support-gated `api.kenjo.io` REST API.
- D-3: Each role carries a string `_id`, `jobTitle`, `customUrl`, `positionType`,
  `companyName`, `officeName`; the description body (`jobDescription.html`) is fetched from
  the per-role detail endpoint keyed by `customUrl`. The `_id` is the stable ATS id;
  `{origin}/positions/{customUrl}` is the canonical detail / apply URL.
- D-4: The list endpoint is un-paginated; the adapter reads the single `activePositions[]`
  array, dedupes by `atsId`, bounds the detail-enrichment fan-out by a fetch cap, and stops
  once `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-kenjo/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.kenjo.io`, confirmed with the named real tenant
    `careers` (Kenjo GmbH). API base + career-site-name resolution extracted from the live
    Angular bundle (`CAREER_SITE_CONTROLLER_URL = `${origin}/api/controller/career-site/public/`,
    name = `host.split('.')[0]`).
  - The public career-site list `GET /api/controller/career-site/public/careers/positions`
    returned HTTP 200 with a config envelope + `activePositions[]` (1 live role,
    `_id 5dde37c7913b8600132907a9`, `customUrl initiative`). The detail
    `.../positions/initiative` returned HTTP 200 with `jobDescription.html`. The public
    detail page `https://careers.kenjo.io/positions/initiative` returned HTTP 200. An absent
    career site returns HTTP 404 `{ "code":404, "message":"Company career site was not found." }`.
    verified=true.
