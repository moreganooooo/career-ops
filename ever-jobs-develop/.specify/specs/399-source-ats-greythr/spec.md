# Spec: 399 — greytHR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 399                                           |
| Slug           | source-ats-greythr                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

greytHR (greythr.com, by Greytip Software — India's largest cloud HR & Payroll suite,
23,000+ organisations, 2.3 M+ users) hosts a branded, public, candidate-facing careers
board for every customer tenant on its own sub-domain of the shared host
`https://{tenant}.greythr.com/hire/jobs/`. That board is a **client-rendered single-page
app** (a `<div id="app">` hydrated by a Semantic-UI bundle), so the open roles are not in
the landing HTML; the SPA fetches the full published-role set from a **public, anonymous**
JSON endpoint on the same host (`POST /hire/api/career/published_jobs/`, body `{}` →
`{ "data": [ … ] }`). The board is therefore directly crawlable without authentication and
without a headless browser. Ever Jobs has no adapter for greytHR-powered careers boards, so
these (India-SMB-heavy) vacancy catalogues are currently un-ingestable. A single generic,
multi-tenant greytHR adapter unlocks the full catalogue of greytHR-powered careers boards
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-greythr` plugin that ingests roles from **any**
  greytHR careers board given a `companySlug` (the tenant sub-domain label, e.g. `greytip`)
  or a `companyUrl` (a careers-site URL on a `greythr.com` host, from which the tenant
  label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the published-roles JSON
  endpoint `POST https://{tenant}.greythr.com/hire/api/career/published_jobs/` (body `{}`),
  whose `data` array holds every published role; each role carries a UUID `id`, `title`,
  `slug`, HTML `description`, `job_type`, `is_remote`, `designation`, and a server-built
  `apply_url`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'greythr'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated OAuth2 greytHR REST API (`api.greythr.com`) and any tenant-scoped admin
  Recruit API — these require credentials. This plugin consumes only the public
  candidate-facing careers endpoint.
- Resolving the opaque numeric `locations` ids in the anonymous payload to human-readable
  place names (no public name-resolution in the anonymous payload); location is left null.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of greytHR tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the greytHR plugin at a tenant's careers
> sub-domain, so that I ingest that organisation's full published-roles list without writing
> a bespoke scraper.

> As a **plugin host**, I want the greytHR adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.greythr.com`) or from a `companyUrl` on a `greythr.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public published-roles endpoint `POST /hire/api/career/published_jobs/` (body `{}`) on the tenant origin. | must |
| FR-3  | Read `data` from the JSON response, narrowing it defensively to an array. | must |
| FR-4  | Use each role's UUID `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, department, employmentType, remote, datePosted, description, applyUrl), using the server-built `apply_url` as the canonical detail / apply URL. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the returned role set. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous JSON endpoint   |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`         |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | call the JSON endpoint directly  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GREYTHR, name: 'GreytHR', category: 'ats', isAts: true })
class GreytHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
POST https://{tenant}.greythr.com/hire/api/career/published_jobs/
  body: {}                       (an empty JSON object; GET is rejected HTTP 405)
  → { "data": [ {
        "id": "9477dc95-87e3-4834-a5ee-3469a0b18373",
        "title": "Associate Director - Compensation & Benefits",
        "slug": "associate-director-compensation-benefits",
        "req_id": "1328",
        "created_at": "2026-05-29T10:13:52Z",
        "published_on_career_page": "2026-05-29T10:14:32Z",
        "locations": ["4"],
        "description": "<p>…HTML…</p>",
        "job_type": "Full-time",
        "is_remote": false,
        "designation": "",
        "apply_url": "https://{tenant}.greythr.com/hire/jobs/associate-director-compensation-benefits"
      }, … ] }

Canonical per-role detail / apply URL:  the role's `apply_url`
  (fallback `https://{tenant}.greythr.com/hire/jobs/{slug}`).
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (UUID)                                         | `atsId`, `id`           | `id` is prefixed `greythr-{atsId}`; role skipped if absent  |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `apply_url` (else `/hire/jobs/{slug}`)              | `jobUrl`, `applyUrl`    | server-built canonical detail URL (also hosts the apply flow) |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `published_on_career_page` → `created_at`           | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| (opaque numeric `locations` ids — not resolvable)   | `location`              | left null (no public name resolution in anonymous payload)  |
| `is_remote` (boolean) + title/designation regex     | `isRemote`              | structured flag first, then text regex                      |
| `designation`                                       | `department`            | when present                                                |
| `job_type`                                          | `employmentType`        | e.g. `Full-time`                                            |
| de-slugified tenant slug                            | `companyName`           | the anonymous payload carries no brand name                 |
| —                                                   | `site`                  | constant `Site.GREYTHR`                                     |
| —                                                   | `atsType`               | constant `'greythr'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `greytip`) → expanded to `https://greytip.greythr.com`.
- `companySlug` containing a bare host / `greythr.com` → tenant taken from the host.
- `companyUrl` on a `greythr.com` host → leading sub-domain label is the tenant
  (`www` / `portal` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | body present but no `data` array, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/greythr.e2e-spec.ts`): known tenant (`companySlug: 'greytip'`) returns
  shaped jobs (`site === Site.GREYTHR`, `atsType === 'greythr'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-GR-1 — Endpoint verb.** The published-roles view rejects GET (HTTP 405) and answers
  POST. **Default (proceeding):** POST an empty JSON body `{}` (mirroring the SPA's own
  request) and read `data`.
- **Q-GR-2 — Stable per-role id.** Each role carries a UUID `id` and a human `req_id`.
  **Default (proceeding):** use the UUID `id` directly as the stable ATS id.
- **Q-GR-3 — Company display name.** The anonymous payload carries no tenant brand name (the
  `get_company_details` endpoint is not consistently anonymous). **Default (proceeding):**
  derive a de-slugified, title-cased tenant sub-domain label.
- **Q-GR-4 — Location resolution.** `locations` is an array of opaque numeric location-id
  strings with no human-readable name in the anonymous payload. **Default (proceeding):**
  leave location null; a future per-location resolution pass could map the ids via the
  tenant's dropdown endpoint.

## 10. Decisions

- D-1: Primary surface is the public, anonymous published-roles JSON endpoint
  `POST https://{tenant}.greythr.com/hire/api/career/published_jobs/` (body `{}`), whose
  `data` array holds every published role. **Confidence: verified** — the platform, the
  `{tenant}.greythr.com/hire/jobs/` addressing, the endpoint shape, and the per-role
  `apply_url` were confirmed live 2026-06-03 against named real tenants: `greytip` (Greytip
  Software Pvt. Ltd. — multiple live roles) and `fint` (FINT Solutions Pvt. Ltd. — 2 live
  roles). A role's `apply_url` detail page (`/hire/jobs/{slug}`) returned HTTP 200; the
  endpoint returns HTTP 405 on GET and the role array on POST.
- D-2: The careers board is a client-rendered SPA (`<div id="app">` + Semantic-UI), so the
  roles are fetched from the JSON endpoint rather than scraped from the DOM (no headless
  browser) and rather than via the authenticated OAuth2 REST API (no credentials).
- D-3: Each role carries a UUID `id`, `title`, `slug`, HTML `description`, `job_type`,
  `is_remote`, `designation`, and a server-built `apply_url`. The UUID `id` is the stable
  per-role ATS id; the de-slugified tenant slug is the company display name.
- D-4: The endpoint returns the full published-role set in one response (no server-side
  pagination); the adapter dedupes by `atsId` and slices to `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-greythr/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.greythr.com/hire/jobs/`, confirmed with named
    real tenants `greytip` (Greytip Software) and `fint` (FINT Solutions).
  - The careers SPA fetches the published-role set from
    `POST /hire/api/career/published_jobs/` (body `{}`) → `{ data: [ … ] }`; the response
    carried roles with a UUID `id`, HTML `description`, `job_type`, `is_remote`, and a
    server-built `apply_url` whose detail page returned HTTP 200 (verified=true).
