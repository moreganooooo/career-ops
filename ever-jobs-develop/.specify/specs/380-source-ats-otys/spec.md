# Spec: 380 — OTYS ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 380                                           |
| Slug           | source-ats-otys                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

OTYS (otys.com / otys.nl, Houten, Netherlands) is a recruitment-technology vendor
(ATS + recruitment CRM — "OTYS Go!") whose candidate-facing product is a hosted,
branded **recruitment site** (career page). Every customer tenant publishes a public,
unauthenticated recruitment site, hosted either under the customer's own (sub)domain
(e.g. `https://vacancy.{company}.com/`, `https://www.{company}.nl/`) or under the
OTYS application host `https://{clientprefix}.otysapp.com/`. The board is
**server-rendered HTML** (OTYS feeds it to Indeed, talent.com, and Google for Jobs),
so its open-roles index and per-role detail pages are directly crawlable without
authentication. Ever Jobs has no adapter for OTYS-powered recruitment sites, so these
vacancies are currently un-ingestable. A single generic, multi-tenant OTYS adapter
unlocks the catalogue of OTYS-powered recruitment sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-otys` plugin that ingests vacancies from
  **any** OTYS recruitment site given a `companyUrl` (the recruitment-site / vacatures
  URL, whose origin is used verbatim) or a `companySlug` (a client prefix expanded to
  `https://{slug}.otysapp.com`).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`GET https://{host}/vacatures.html`) to enumerate roles, plus each
  role's server-rendered detail page (`…/vacatures/vacature-{slug}-{id}-{websiteId}.html`)
  carrying the job body and metadata (preferring a schema.org `JobPosting` JSON-LD
  block when present, with `og:` meta / `<title>` / body HTML as defensive fallbacks).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'otys'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated OTYS Web API (`https://webapi.otys.app/api/vacancies`, successor
  to the old "Job API") and the OWS JSON-RPC web services. Both require a per-tenant
  API key (an unauthenticated request to the Web API answers HTTP 401), so they are
  not a public surface. This plugin consumes only the public candidate-facing HTML.
- Server-side filtering by category / location / keyword (the board supports these
  facets). We ingest the tenant's open-roles index and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of OTYS tenant hosts (handled by the source-adoption backlog).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the OTYS plugin at a tenant's
> recruitment-site URL, so that I ingest that organisation's full published-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the OTYS adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant board host from `companyUrl` (origin used verbatim) or from `companySlug` (a URL/host reduced to its origin; a bare client prefix expanded to `{slug}.otysapp.com`). | must |
| FR-2  | Fetch the public server-rendered index (`GET https://{host}/vacatures.html`, probing `/vacatures`, `/vacancies`, `/` as fallbacks) and extract every `/vacatures/vacature-{slug}-{id}-{websiteId}.html` link. | must |
| FR-3  | Use the numeric `{id}` segment of each vacancy URL as the stable `atsId`.                            | must     |
| FR-4  | De-duplicate roles by `atsId` (`{id}`) within a single run.                                          | must     |
| FR-5  | Fetch each role's server-rendered detail page and map it to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Parse the detail page by preferring a schema.org `JobPosting` JSON-LD block, falling back to `og:` meta and the `<title>` / body HTML; convert the description per `descriptionFormat`. | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the link set and only fetching that many detail pages, bounded by a hard page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown hosts (DNS / HTTP 4xx), network errors, and malformed / non-JSON pages without throwing; fan out per-role fetches with `Promise.allSettled`. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML index + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant / role never aborts a batch | scrape never throws; `Promise.allSettled` fan-out |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OTYS, name: 'OTYS', category: 'ats', isAts: true })
class OtysService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{host}/vacatures.html
  → server-rendered HTML carrying one anchor per published vacancy:
      <a href="/vacatures/vacature-{slug}-{id}-{websiteId}.html">…</a>
    (absolute `https://{host}/vacatures/…` form also emitted; legacy underscore
     form `…vacature_{slug}_{id}_{n}.html` is auto-redirected by OTYS)

GET https://{host}/vacatures/vacature-{slug}-{id}-{websiteId}.html
  → server-rendered detail HTML; optionally embedding
      <script type="application/ld+json">{ "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20", "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "…" },
        "jobLocation": { "address": {
          "addressLocality": "Amsterdam", "addressRegion": "Noord-Holland",
          "addressCountry": "NL" } } }</script>
    plus `og:title` / `og:url` / `og:description` meta and `<title>` fallbacks.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{id}` (from `/vacatures/vacature-{slug}-{id}-{n}.html`) | `atsId`, `id`       | `id` is prefixed `otys-{atsId}`                             |
| JSON-LD `title`, else `og:title` / `<title>` / slug | `title`                 | required; role skipped if absent                            |
| canonical vacancy URL (JSON-LD `url` / `og:url` preferred) | `jobUrl`, `applyUrl` | canonical public detail / apply URL                       |
| JSON-LD `description` (HTML) / `og:description`      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted`                                | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` (locality/region/country) | `location`          | city / state / country; null when none usable               |
| JSON-LD `jobLocationType` / title / body            | `isRemote`              | remote detection (`TELECOMMUTE` / `remote` / `thuiswerk` / `hybride` / `wfh` …) |
| JSON-LD `industry`                                  | `department`            | when present                                                |
| JSON-LD `employmentType` (`FULL_TIME` → `Full Time`) | `employmentType`       | token normalised to a readable label                        |
| JSON-LD `hiringOrganization.name`, else host label  | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                   | `site`                  | constant `Site.OTYS`                                        |
| —                                                   | `atsType`               | constant `'otys'`                                           |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companyUrl` (e.g. `https://www.middendorprecruitment.nl/vacatures.html`) → its
  origin `https://www.middendorprecruitment.nl` is used verbatim as the board host.
- `companySlug` containing a `.` / a URL → reduced to its `https://host` origin.
- `companySlug` as a bare client prefix (e.g. `acme`) → expanded to
  `https://acme.otysapp.com`.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (DNS / HTTP 4xx), or no roles |
| logged warn (HTTP 4xx / DNS) | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/otys.e2e-spec.ts`): known tenant
  (`companyUrl: 'https://www.middendorprecruitment.nl/vacatures.html'`) returns shaped
  jobs (`site === Site.OTYS`, `atsType === 'otys'`, `atsId`/`jobUrl` defined);
  `companySlug` resolution path exercised; no-slug/url returns empty; unknown host
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-OT-1 — Tenant addressing.** OTYS recruitment sites are most often fronted under
  the customer's own custom domain (not a predictable OTYS sub-domain). **Default
  (proceeding):** address a tenant primarily by a full `companyUrl` (origin used
  verbatim); a bare `companySlug` is expanded to the OTYS application host
  `{slug}.otysapp.com` as a best-effort fallback.
- **Q-OT-2 — Structured detail metadata.** Detail pages render server-side; a
  schema.org `JobPosting` JSON-LD block (OTYS supports Google for Jobs) is the richest
  structured source when present, but some legacy templates omit it. **Default
  (proceeding):** prefer JSON-LD, falling back to `og:` meta, the `<title>`, the
  URL-slug title, and body HTML — all narrowed defensively.
- **Q-OT-3 — Company display name.** The JSON-LD `hiringOrganization` carries the
  tenant brand when present, but not always. **Default (proceeding):** use
  `hiringOrganization.name` when present, else de-slugify + title-case the host's
  leading label for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered OTYS recruitment site:
  the open-roles index for enumeration (the `/vacatures/vacature-{slug}-{id}-{n}.html`
  anchors) plus each role's server-rendered detail page for the body and metadata.
  **Confidence: verified** — the platform, the recruitment-site vacancy URL shape
  `/vacatures/vacature-{slug}-{id}-{websiteId}.html`, and the index HTML were confirmed
  live 2026-06-03 against the named real tenant `middendorprecruitment` (Middendorp
  Recruitment, `https://www.middendorprecruitment.nl/vacatures.html`, 15 open roles).
- D-2: The numeric `{id}` segment of the vacancy URL (e.g. `1481738`) is the stable
  per-role OTYS vacancy id and the ATS id; the trailing `{websiteId}` is the OTYS
  portal number.
- D-3: Detail pages are parsed with a schema.org `JobPosting` JSON-LD preference and
  `og:` / `<title>` / slug / body fallbacks. The observed verified tenant uses a thin
  legacy template (no JSON-LD/og:), so the adapter still emits a role from the link +
  URL-slug title and harvests any contact emails from the body via `extractEmails`.
- D-4: The index lists the tenant's open roles; the adapter collects deduped links
  (by `{id}`) and slices to `resultsWanted` (bounded by a hard page cap), then fetches
  each role's detail page with a `Promise.allSettled` fan-out.
- D-5: The authenticated OTYS Web API (`https://webapi.otys.app/api/vacancies`, 401
  without a per-tenant API key) and OWS JSON-RPC are explicitly **not** used — they are
  not a public surface. The plugin is dependency-free beyond `@ever-jobs/common`.

## 11. References

- `packages/plugins/source-ats-otys/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant addressing (customer-hosted recruitment sites and the OTYS
    application host `{clientprefix}.otysapp.com`), confirmed with the named real
    tenant `middendorprecruitment` (Middendorp Recruitment,
    `https://www.middendorprecruitment.nl/vacatures.html`).
  - The server-rendered index HTML and the per-role detail URL shape
    `/vacatures/vacature-{slug}-{id}-{websiteId}.html` (e.g.
    `/vacatures/vacature-senior-accountmanager-amsterdam-noord-holland-fulltime-1481738-11.html`,
    `/vacatures/vacature-brand-manager-32-40-uur-1481267-11.html`), with the numeric
    `{id}` segment as the per-role ATS id (verified=true).
  - OTYS Web API base `https://webapi.otys.app/api` with `/api/vacancies` — confirmed
    to require a per-tenant API key (HTTP 401 unauthenticated); documented as a
    non-goal, not used.
