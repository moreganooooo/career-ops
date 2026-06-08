# Spec: 387 — MokaHR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 387                                           |
| Slug           | source-ats-mokahr                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix)                    |

## 1. Problem Statement

MokaHR (mokahr.com, China) is a leading China-region recruitment / ATS SaaS whose
candidate-facing product is a hosted, branded career site. Each customer organisation
publishes a public career site addressed by a `{tenant}` company slug plus a numeric
`{orgId}` organisation identifier on the shared application host
`https://app.mokahr.com/social-recruitment/{tenant}/{orgId}`. The career site is a
client-rendered single-page app whose open roles are served by a public, anonymous JSON
listing endpoint, so the board is ingestable without authentication and without a
headless browser. Ever Jobs has no adapter for MokaHR-powered career sites, so these
roles are currently un-ingestable. A single generic, multi-tenant MokaHR adapter unlocks
the full catalogue of MokaHR-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-mokahr` plugin that ingests roles from **any**
  MokaHR career site given a `companySlug` (the `{tenant}/{orgId}` pair, e.g.
  `tesla/46129`) or a `companyUrl` (a social-/campus-recruitment URL on a `mokahr.com`
  host, from which both the tenant slug and numeric orgId are derived).
- Use the **public, anonymous** surface (no auth, no API key): the documented JSON
  listing endpoint `https://api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=social`
  whose `{ code, msg, data }` envelope carries each role's title, HTML body, department,
  locations, dates, and stable numeric `id`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'mokahr'`, `department`).

## 3. Non-Goals

- Any authenticated MokaHR open-platform API (the `api-platform` OAuth endpoints require
  per-tenant clientId / clientSecret / accessToken). This plugin consumes only the public
  candidate-facing listing surface.
- Server-side filtering by location / function / keyword (the board supports these
  facets). We ingest the tenant's full open-role set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of MokaHR tenant `{tenant}/{orgId}` pairs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the MokaHR plugin at a tenant's
> `{tenant}/{orgId}` pair, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the MokaHR adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug + numeric orgId from `companySlug` (the `{tenant}/{orgId}` pair, or a full URL passed as the slug) or from a `companyUrl` on a `mokahr.com` host (parsed from its `/(social|campus)-recruitment/{tenant}/{orgId}` path). | must |
| FR-2  | Fetch the public JSON listing endpoint (`api-platform/v1/jobs/{orgId}?mode=…`) across known recruitment modes (`social`, `campus`), paging via `limit` / `offset` until exhausted or `resultsWanted` met. | must |
| FR-3  | Parse the `{ code, msg, data }` envelope, narrowing `data` to the role array directly or to a wrapper object's `jobs` / `list` / `items` / `content` array. | must |
| FR-4  | Use each role's numeric `id` (then `jobId`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `…/apply/{tenant}/{orgId}#/job/{jobId}`. | must |
| FR-6  | Convert the HTML job-ad body (from the role `description` / `jobDescription`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the open-role set, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no numeric orgId can be resolved. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx/5xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous JSON listing    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Per-request timeout capped at 15s             | bound BOTH `timeout` + `requestTimeout` |
| NFR-5  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-6  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-7  | No headless browser                           | parse public JSON listing only   |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MOKAHR, name: 'MokaHR', category: 'ats', isAts: true })
class MokaHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; documented shape, surface researched 2026-06-03):

```
GET https://api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=social&limit=&offset=
  → standard MokaHR envelope:
      { "code": 0, "msg": "ok", "data": [ {…role…}, … ] }      (or data.{jobs|list|items|content})
    Each role object:
      { "id": 1234567, "title": "…", "department": { "id": 1, "name": "…" },
        "locations": [ { "id": 9, "city": "Shanghai", "province": "…", "address": "…" } ],
        "description": "<p>…HTML body…</p>", "updatedAt": "2026-05-26T12:21:57",
        "publishedAt": "…", "employmentType": "…" }

Canonical career-site URL:  https://app.mokahr.com/social-recruitment/{tenant}/{orgId}
Canonical per-role detail / apply URL:  https://app.mokahr.com/apply/{tenant}/{orgId}#/job/{jobId}/apply
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (else `jobId`)                                 | `atsId`, `id`           | `id` is prefixed `mokahr-{atsId}`; role skipped if absent   |
| `title` (else `jobTitle` / `name`)                  | `title`                 | required; role skipped if absent                            |
| `…/apply/{tenant}/{orgId}#/job/{id}` (or role `url`) | `jobUrl` / `applyUrl`  | canonical public detail / apply URL                         |
| `description` (else `jobDescription` / `requirement`) (HTML) | `description`  | format-converted (HTML / Markdown / Plain)                  |
| `publishedAt` (else `updatedAt` / `createdAt`)      | `datePosted`            | parsed → `YYYY-MM-DD` (ISO or epoch s/ms)                   |
| `locations[].city/province/country` (else `location` / `city`) | `location`   | best-effort city / state / country; null when none          |
| title / location / department                       | `isRemote`              | remote detection (`remote` / `hybrid` / `wfh` / 远程 …)      |
| `department.name` (else `departmentName`)           | `department`            | when present                                                |
| `employmentType` (else `jobType`)                   | `employmentType`        | when present                                                |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the listing carries no brand name                           |
| —                                                   | `site`                  | constant `Site.MOKAHR`                                      |
| —                                                   | `atsType`               | constant `'mokahr'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` of the form `{tenant}/{orgId}` (e.g. `tesla/46129`) → both parts parsed.
- `companySlug` containing a bare host / `mokahr.com` URL → both parts from the path.
- `companyUrl` on a `mokahr.com` host → `{tenant}` + `{orgId}` from the
  `/(social|campus)-recruitment/{tenant}/{orgId}` path.
- A bare tenant slug with no orgId is not resolvable → empty result.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable orgId, unknown tenant (HTTP 4xx/5xx), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled listing — degrades to empty, never throws              |
| logged warn (parse failure)  | body present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/mokahr.e2e-spec.ts`): known tenant (`companySlug: 'tesla/46129'`)
  returns shaped jobs (`site === Site.MOKAHR`, `atsType === 'mokahr'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; bare slug
  (no orgId) returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-MK-1 — Recruitment mode.** Tenants publish under `social` and/or `campus`.
  **Default (proceeding):** probe `social` then `campus`, taking the first mode that
  returns any roles.
- **Q-MK-2 — Listing endpoint shape.** The career SPA is client-rendered and sits behind
  region-host redirects; the exact internal XHR could not be confirmed live this run.
  **Default (proceeding):** consume the DOCUMENTED public listing shape
  (`api-platform/v1/jobs/{orgId}?mode=…`) defensively, narrowing `data` across the array
  and wrapper-object forms and degrading to empty when it does not answer.
- **Q-MK-3 — Stable per-role id.** Each role carries `id` (the numeric URL id) and an
  alternate `jobId`. **Default (proceeding):** prefer `id`, falling back to `jobId`.
- **Q-MK-4 — Company display name.** The listing carries no brand name.
  **Default (proceeding):** de-slugify + title-case the tenant slug for `companyName`.
- **Q-MK-5 — Custom careers domains.** Some tenants front the board under a region host
  (e.g. `hire-r1.mokahr.com`) or their own domain. **Default (proceeding):** address a
  tenant by its `{tenant}/{orgId}` pair and the documented API host; region/custom-host
  detection is deferred to the source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON listing endpoint on the platform API
  host (`api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=…`), preferred over (a) the
  authenticated open-platform OAuth endpoints (need per-tenant credentials) and (b)
  driving the client-rendered SPA with a headless browser. **Confidence: defensive
  (verified=false)** — the platform + the `{tenant}/{orgId}` tenant addressing were
  confirmed live 2026-06-03 against real named tenants (`tesla`/46129, `smoore`/126055,
  `step`/94904, `bigo`/37723, `hanslaser`/46382, `mihoyo`/44205), but a clean live JSON
  listing could not be confirmed this run (the SPA sits behind region-host redirects and
  the documented endpoint did not answer anonymously to the research fetcher). The
  adapter implements the documented shape defensively and degrades to empty.
- D-2: The adapter consumes JSON (not server-embedded HTML, not a SPA needing a browser);
  the `{ code, msg, data }` envelope is narrowed defensively, with `data` accepted as a
  bare role array or a wrapper object (`jobs` / `list` / `items` / `content`).
- D-3: The richest per-role fields are `title`, the HTML `description` body, `department`,
  `locations[]`, and `publishedAt` / `updatedAt`. The numeric `id` is the stable per-role
  ATS id and the `#/job/{id}` URL segment.
- D-4: The listing is paged by `limit` / `offset`; the adapter walks pages (bounded by a
  page cap), dedupes by `atsId`, and slices to `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-mokahr/` — implementation.
- Surface researched 2026-06-03 (no authentication; verified=false):
  - Platform + tenant addressing `app.mokahr.com/social-recruitment/{tenant}/{orgId}`,
    confirmed with real named tenants: `tesla` (46129), `smoore` (126055), `step`
    (94904), `bigo` (37723), `hanslaser` (46382), `mihoyo` (44205).
  - Documented public listing endpoint
    `https://api.mokahr.com/api-platform/v1/jobs/{orgId}?mode=social` returning a
    `{ code, msg, data }` envelope of role records (`id`, `title`, `locations[]`,
    `department`, `description`, `updatedAt`). A clean live JSON listing could not be
    confirmed this run; the adapter is defensive and degrades to empty.
