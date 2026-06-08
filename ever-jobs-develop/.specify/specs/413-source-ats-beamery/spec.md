# Spec: 413 — Beamery ATS / Talent-CRM Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 413                                           |
| Slug           | source-ats-beamery                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Beamery (beamery.com, London, UK — an enterprise Talent Lifecycle Management / talent-CRM +
career-site platform used by large employers such as Workday, SAP, AstraZeneca, and others)
hosts a branded, public, candidate-facing career site for every customer tenant. The
candidate-facing site is addressed by a tenant host on the shared `beamery.com` domain
(Beamery's own at `careers.beamery.com`, branded tenant portals at `{tenant}.beamery.com`,
conversational "flows" at `flows.beamery.com/{tenant}/...`), or — once a customer configures
one — by a fully custom vanity domain that points at Beamery's `vanity.beamery.com` backend.
The per-role public detail page follows a confirmed, stable pattern:
`https://{host}/jobs/job/{uuid}-{title-slug}/`. Ever Jobs has no adapter for Beamery-powered
career sites, so these (large-enterprise) vacancy catalogues are currently un-ingestable. A
single generic, multi-tenant Beamery adapter unlocks Beamery-powered boards with one plugin.

Unlike a clean JSON-feed ATS, the Beamery careers site is **server-rendered**, and no clean,
anonymous JSON jobs feed that the public site consumes was found (the candidate-facing
`/api/...` routes are gated — `/api/jobs` 404s and `/api/v1/jobs` answers 403 without
credentials — and the only structured API is the authenticated `frontier.beamery.com` REST
API requiring a bearer token). The adapter is therefore **defensive**: it probes a best-effort
candidate-facing JSON route and degrades to an empty result when no anonymous JSON is served,
rather than scraping a brittle SSR DOM or driving a headless browser.

## 2. Goals

- Add a generic, multi-tenant `source-ats-beamery` plugin that ingests roles from **any**
  Beamery career site given a `companySlug` (the tenant sub-domain label, e.g. `careers` or a
  branded label such as `amazon`) or a `companyUrl` (a career-site URL on a `beamery.com`
  host, from which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): a best-effort candidate-facing
  JSON route on the tenant career host, parsing any role array under the common keys
  (`data` / `results` / `jobs` / `vacancies` / `items`, or a bare top-level array).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'beamery'`, `department`, `employmentType`), using the confirmed public
  detail URL pattern `https://{host}/jobs/job/{uuid}-{title-slug}/`.
- Degrade gracefully (empty result, never throw) when the tenant serves only SSR HTML, gates
  the JSON route, or is unknown.

## 3. Non-Goals

- The authenticated `frontier.beamery.com` REST API (it requires a bearer token). This plugin
  consumes only the public candidate-facing surface on the tenant host.
- Scraping the server-rendered careers HTML DOM or driving a headless browser. When no clean
  anonymous JSON is served, the adapter degrades to empty rather than parsing brittle markup.
- Server-side filtering by category / location / type. We ingest the tenant's role set and
  slice client-side to `resultsWanted`.
- Application submission, candidate accounts, talent-community sign-up, or any write operation.
- A curated seed list of Beamery tenant hosts / custom vanity domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Beamery plugin at a tenant's career
> host, so that I ingest that organisation's open-roles list (when an anonymous JSON surface
> is available) without writing a bespoke scraper.

> As a **plugin host**, I want the Beamery adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin, and never throws on a gated / SSR-only
> tenant.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.beamery.com`) or from a `companyUrl` on a `beamery.com` host (leading sub-domain label is the tenant; `www`/`app`/`api` rejected). | must |
| FR-2  | Probe a best-effort candidate-facing jobs JSON route on the tenant host as JSON. | must |
| FR-3  | Read the role array under any of `data` / `results` / `jobs` / `vacancies` / `items` (or a bare top-level array); drain pages while a `meta.hasNextPage` / `hasMore` flag is true, bounded by a page cap. | must |
| FR-4  | Use each role's id (`id` / `uuid` / `jobId`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using a feed-supplied URL when present, else the confirmed detail pattern `{origin}/jobs/job/{uuid}-{slug}/`. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate SSR-only HTML bodies, gated routes (4xx), unknown tenants, network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous surface         |
| NFR-2  | A fetch failure, gated route, SSR-only body, or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser, no SSR-DOM scraping      | parse a JSON surface only        |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BEAMERY, name: 'Beamery', category: 'ats', isAts: true })
class BeameryService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; best-effort — see §10 confidence):

```
GET https://{tenant}.beamery.com/api/jobs?page=1&pageSize=100
  → best-effort JSON envelope (any of):
      { "data":      [ { …role… } ], "meta": { "hasNextPage": false } }
      { "results":   [ { …role… } ] }
      { "jobs":      [ { …role… } ] }
      { "vacancies": [ { …role… } ] }
      [ { …role… } ]                              (bare top-level array)

  Each role (fields optional / multiple spellings tolerated):
      { "id" | "uuid" | "jobId": "853922ed-971c-4cc9-a430-0e772bde2a72",
        "title" | "name": "Senior Software Engineer (Data)",
        "slug": "senior-software-engineer-data",
        "url" | "jobUrl": "https://careers.beamery.com/jobs/job/853922ed-…-senior-software-engineer-data/",
        "description" | "descriptionHtml" | "descriptionText": "…",
        "location" | "locationObject" | "locations[]": "London, UK",
        "department" | "departmentName" | "team": { "name": "Engineering" },
        "employmentType" | "jobType" | "type": "Full Time",
        "remote": false,
        "publishedDate" | "publishedAt" | "postedDate" | "createdAt": "2026-05-01T…Z" }

Canonical per-role detail / apply URL (CONFIRMED live):
  https://{host}/jobs/job/{uuid}-{title-slug}/
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` / `uuid` / `jobId`                             | `atsId`, `id`           | `id` is prefixed `beamery-{atsId}`; role skipped if absent  |
| `title` / `name`                                    | `title`                 | required; role skipped if absent                            |
| `url` / `jobUrl` (else derived `/jobs/job/{uuid}-{slug}/`) | `jobUrl`          | confirmed public detail URL pattern                         |
| `applyUrl` (else the detail URL)                    | `applyUrl`              | the detail page hosts the apply flow                        |
| `description` / `descriptionHtml` / `descriptionText` | `description`         | format-converted (HTML / Markdown / Plain)                  |
| `publishedDate` / `publishedAt` / `postedDate` / `createdAt` | `datePosted`   | parsed → `YYYY-MM-DD`                                        |
| `location` / `locationObject` / `locations[]`       | `location`              | structured city / state / country; null when none           |
| `remote` / location `remote` / type contains `remote` + text regex | `isRemote` | structured flag first, then text regex (`remote`/`wfh`…)    |
| `department.name` / `departmentName` / `team`       | `department`            | when present                                                |
| `employmentType` / `jobType` / `type`               | `employmentType`        | e.g. `Full Time`                                            |
| de-slugified tenant label                           | `companyName`           | the feed carries no brand name                              |
| —                                                   | `site`                  | constant `Site.BEAMERY`                                     |
| —                                                   | `atsType`               | constant `'beamery'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `careers`) → expanded to `https://careers.beamery.com`.
- `companySlug` containing a bare host / `beamery.com` → tenant taken from the host.
- `companyUrl` on a `beamery.com` host → leading sub-domain label is the tenant
  (`www` / `app` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (4xx), SSR-only HTML, or no roles |
| logged warn (HTTP 4xx/5xx)   | gated / unknown / disabled tenant — degrades to empty, never throws       |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/beamery.e2e-spec.ts`): known tenant (`companySlug: 'careers'`) returns
  shaped jobs when available (`site === Site.BEAMERY`, `atsType === 'beamery'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero
  results is acceptable — the surface is SSR-only / gated; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BM-1 — Public vs authenticated API.** Beamery exposes the authenticated
  `frontier.beamery.com` REST API (bearer token); the candidate-facing careers site is
  server-rendered with no confirmed anonymous JSON feed (`/api/...` routes gated). **Default
  (proceeding):** probe a best-effort candidate-facing JSON route and degrade to empty when
  none is served; never use the authenticated API.
- **Q-BM-2 — Stable per-role id.** Beamery role pages key off a UUID
  (`/jobs/job/{uuid}-{slug}/`). **Default (proceeding):** use the role id (`id`/`uuid`/`jobId`)
  as the stable ATS id and build the canonical URL from the confirmed pattern when not feed-
  supplied.
- **Q-BM-3 — Company display name.** A feed (if served) carries no tenant brand name.
  **Default (proceeding):** derive a de-slugified, title-cased company name from the tenant
  sub-domain label.
- **Q-BM-4 — Envelope dialect.** With no confirmed anonymous feed, the exact envelope shape is
  unknown. **Default (proceeding):** parse the role array under any of the common keys
  (`data`/`results`/`jobs`/`vacancies`/`items`) or a bare array, and tolerate multiple field
  spellings per role.

## 10. Decisions

- D-1: Primary surface is a best-effort, anonymous, candidate-facing JSON route on the per-
  tenant Beamery career host. **Confidence: NOT verified (verified=false)** — the platform,
  the candidate-facing host model (`careers.beamery.com`, `{tenant}.beamery.com`,
  `flows.beamery.com/{tenant}`), and the per-role public detail URL pattern
  `https://{host}/jobs/job/{uuid}-{title-slug}/` WERE confirmed live 2026-06-04 against
  Beamery's own board `careers.beamery.com` (real roles e.g.
  `853922ed-971c-4cc9-a430-0e772bde2a72-senior-software-engineer-data`), but a clean anonymous
  JSON feed was NOT: the careers site is server-rendered and candidate-facing `/api/...` routes
  are gated (`/api/jobs` 404, `/api/v1/jobs` 403). The only structured API is the
  authenticated `frontier.beamery.com` REST API (bearer token).
- D-2: The adapter consumes a JSON surface only (no SSR-DOM scraping, no headless browser, no
  authenticated API). When the tenant serves only HTML or gates the JSON route, the adapter
  degrades to an empty result.
- D-3: Each role's id is the stable per-role ATS id; the canonical detail / apply URL is the
  feed-supplied URL when present, else the confirmed `{origin}/jobs/job/{uuid}-{slug}/` pattern.
- D-4: A best-effort feed may paginate; the adapter requests a generous `pageSize`, drains
  pages via a `hasNextPage` / `hasMore` flag (bounded by a page cap), dedupes by `atsId`, and
  stops once `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing and tolerant multi-key reads so shape / dialect drift never throws.

## 11. References

- `packages/plugins/source-ats-beamery/` — implementation.
- Surface researched + best-effort verified live 2026-06-04 (no authentication):
  - Platform + candidate-facing host model `careers.beamery.com` / `{tenant}.beamery.com` /
    `flows.beamery.com/{tenant}`, confirmed against Beamery's own live board.
  - Per-role public detail URL pattern `https://{host}/jobs/job/{uuid}-{title-slug}/`,
    confirmed live (real roles e.g.
    `853922ed-971c-4cc9-a430-0e772bde2a72-senior-software-engineer-data`,
    `fd514cad-823f-4647-af7a-297acfed3443-interim-vp-of-engineering`).
  - NO clean anonymous JSON feed confirmed: careers site is server-rendered; candidate-facing
    `/api/jobs` 404s and `/api/v1/jobs` 403s without auth; the only structured API is the
    authenticated `frontier.beamery.com` REST API (bearer token). Confidence: **verified=false**
    (host + detail URL confirmed; anonymous JSON feed shape NOT confirmed).
