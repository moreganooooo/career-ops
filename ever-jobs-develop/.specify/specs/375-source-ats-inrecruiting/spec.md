# Spec: 375 — In-recruiting (Intervieweb) ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 375                                           |
| Slug           | source-ats-inrecruiting                       |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 365 (LiveHire)            |

## 1. Problem Statement

In-recruiting (in-recruiting.com) is the Applicant Tracking System / recruiting
software built by Intervieweb Srl (Turin, Italy; part of the Zucchetti Group). Every
customer tenant publishes a branded, public, unauthenticated candidate-facing career
site on the shared host `*.intervieweb.it`. The open-roles index and per-role detail
pages are **server-rendered HTML** (not a SPA), so they are directly crawlable without
authentication, and detail pages frequently embed a schema.org `JobPosting` JSON-LD
block. Ever Jobs has no adapter for In-recruiting-powered career sites, so these
vacancies are currently un-ingestable. A single generic, multi-tenant In-recruiting
adapter unlocks the full catalogue of In-recruiting-powered career boards with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-inrecruiting` plugin that ingests vacancies
  from **any** In-recruiting career site given a `companySlug` (the tenant slug, e.g.
  `rinascente`, or a path-tenant slug like `orbyta`) or a `companyUrl` (a career / job
  URL on an `intervieweb.it` host, from which the tenant + index URL are derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.intervieweb.it/{lang}/career`, or
  `https://{host}.intervieweb.it/{tenant}/{lang}/career` for path tenants) to enumerate
  roles, plus each role's server-rendered detail page (`…/jobs/{slug}-{id}/{lang}/`)
  carrying the job body and metadata (preferring a schema.org `JobPosting` JSON-LD block
  when present, with `og:` meta / `<title>` / listing-card fields as defensive
  fallbacks).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'inrecruiting'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated In-recruiting / Intervieweb admin or recruiter API. This plugin
  consumes only the public candidate-facing board.
- Server-side filtering by category / location / language facet. We ingest the tenant's
  full open-roles index and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of In-recruiting tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the In-recruiting plugin at a tenant's
> career site, so that I ingest that organisation's full open-roles list without writing
> a bespoke scraper.

> As a **plugin host**, I want the In-recruiting adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant + index URL from `companySlug` (expanded to `{slug}.intervieweb.it/{lang}/career`) or from a `companyUrl` on an `intervieweb.it` host (sub-domain and/or path tenant derived). | must |
| FR-2  | Fetch the public server-rendered index and extract every `/jobs/{slug}-{id}/{lang}/` link across both addressing shapes. | must |
| FR-3  | Use the trailing numeric `{id}` segment of the job URL as `atsId`.                                    | must     |
| FR-4  | De-duplicate roles by `atsId` (`{id}`) within a single run.                                           | must     |
| FR-5  | Fetch each role's server-rendered detail page; prefer a schema.org `JobPosting` JSON-LD block, falling back to `og:` meta / `<title>` / listing-card fields. | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the link set and only fetching that many detail pages, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON pages without throwing; fan out across detail pages with `Promise.allSettled`. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML index + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; detail cap |
| NFR-5  | A single bad tenant / role never aborts a batch | scrape never throws; `Promise.allSettled` fan-out |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.INRECRUITING, name: 'In-recruiting (Intervieweb)', category: 'ats', isAts: true })
class InRecruitingService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.intervieweb.it/{lang}/career                     (sub-domain tenant)
GET https://{host}.intervieweb.it/{tenant}/{lang}/career              (path tenant, "SMART")
  → server-rendered HTML carrying one `vacancy__` card per open role, each with:
      <a href="https://…/jobs/{slug}-{id}/{lang}/"><h3>{title}</h3></a>
      <span class="subtitle__informations" title="Location">{location}</span>
      <span class="subtitle__informations" title="Functional Area">{department}</span>

GET https://{tenant}.intervieweb.it/jobs/{slug}-{id}/{lang}/          (detail / apply page)
  → server-rendered detail HTML, often embedding
      <script type="application/ld+json">{ "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-14", "validThrough": "2026-06-13",
        "hiringOrganization": { "name": "RINASCENTE" },
        "jobLocation": { "address": {
          "addressLocality": "Milano", "addressRegion": "MI",
          "postalCode": "20146", "addressCountry": "IT" } } }</script>
    plus `og:title` / `og:url` / `og:description` meta fallbacks. The "SMART" path-tenant
    detail variant omits JSON-LD, so og: / <title> / listing-card fields are used.
```

Wire shape → `JobPostDto` mapping:

| Source                                                  | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| trailing `{id}` of `/jobs/{slug}-{id}/`                 | `atsId`, `id`           | `id` is prefixed `inrecruiting-{atsId}`                     |
| JSON-LD `title`, else `og:title` / card `<h3>` / token  | `title`                 | required; role skipped if absent                            |
| `https://…/jobs/{slug}-{id}/{lang}/`                    | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| JSON-LD `description` (HTML) / `og:description`          | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted`                                    | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` (locality/region/country), else card `Location` | `location` | city / state / country; null when none usable |
| JSON-LD `jobLocationType` / title / location / dept     | `isRemote`              | remote detection (`TELECOMMUTE` / `remote` / `smart working` / `da remoto` …) |
| JSON-LD `industry`, else card `Functional Area`         | `department`            | when present                                                |
| JSON-LD `employmentType` (`FULL_TIME` → `Full Time`)    | `employmentType`        | token normalised to a readable label                        |
| JSON-LD `hiringOrganization.name`, else tenant slug     | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                       | `site`                  | constant `Site.INRECRUITING`                                |
| —                                                       | `atsType`               | constant `'inrecruiting'`                                   |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `rinascente`) → expanded to
  `https://rinascente.intervieweb.it/en/career`.
- `companySlug` containing a bare host / `intervieweb.it` URL → parsed as a URL.
- `companyUrl` on an `intervieweb.it` host → tenant is the leading path segment (path
  tenant) when present, else the host sub-domain label; the index URL is rebuilt from
  the resolved host + path tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/inrecruiting.e2e-spec.ts`): known tenant
  (`companySlug: 'rinascente'`) returns shaped jobs (`site === Site.INRECRUITING`,
  `atsType === 'inrecruiting'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-IR-1 — Custom careers domains.** Some tenants may front the board under their own
  custom domain. **Default (proceeding):** address a tenant by its `intervieweb.it` host
  (the stable public host); a caller may pass a full `companyUrl` on an `intervieweb.it`
  host. Custom-domain detection beyond `intervieweb.it` hosts is deferred to the
  source-adoption backlog.
- **Q-IR-2 — Structured detail metadata.** Detail pages render server-side; a schema.org
  `JobPosting` JSON-LD block is the richest structured source when present, but the
  "SMART" path-tenant detail variant omits it. **Default (proceeding):** prefer JSON-LD,
  falling back to `og:` meta, the `<title>`, and the listing-card location / functional-
  area fields, all narrowed defensively.
- **Q-IR-3 — Company display name.** The public board carries the tenant brand in the
  JSON-LD `hiringOrganization` when present, but not always. **Default (proceeding):**
  use `hiringOrganization.name` when present, else de-slugify + title-case the tenant
  slug for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML career board on
  `*.intervieweb.it`: the open-roles index for enumeration (the
  `/jobs/{slug}-{id}/{lang}/` anchors) plus each role's server-rendered detail page for
  the body and metadata. **Confidence: verified** — the platform, both addressing
  shapes, the index HTML, and the per-role detail URL shape were confirmed live
  2026-06-03 against the named real tenants `rinascente` (RINASCENTE, sub-domain) and
  `orbyta` (ORBYTA / "Inrecruiting SMART", path tenant).
- D-2: The board is server-rendered HTML (not a SPA), so the HTML itself is the
  documented no-auth surface; per-role detail pages are parsed with a schema.org
  `JobPosting` JSON-LD preference and `og:` / `<title>` / listing-card fallbacks.
- D-3: The richest per-role fields are the detail page's `title`, body `description`
  (HTML), `datePosted`, `employmentType`, location (`jobLocation.address`), plus the
  listing card's `Location` and `Functional Area`. The trailing numeric `{id}` segment
  of the detail URL is the stable per-role ATS id.
- D-4: The index lists every open role in one document (no server-side pagination of the
  job set); the adapter collects deduped links, slices to `resultsWanted` (bounded by a
  hard detail cap), then fetches each role's detail page with `Promise.allSettled`. De-
  dup is by `atsId` (`{id}`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-inrecruiting/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + both tenant-addressing shapes on `*.intervieweb.it`, confirmed with the
    named real tenants `rinascente` (`https://rinascente.intervieweb.it/en/career`,
    sub-domain tenant) and `orbyta`
    (`https://inrecruiting.intervieweb.it/orbyta/en/career`, path tenant).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/jobs/{slug}-{id}/{lang}/` (e.g. `/jobs/communication-manager-410/en/`,
    `/jobs/angular-developer-401435/en/`), with the trailing numeric `{id}` segment as
    the per-role ATS id, and the classic detail page's schema.org `JobPosting` JSON-LD
    block (verified=true). The "SMART" path-tenant detail variant omits JSON-LD, handled
    by the og: / `<title>` / listing-card fallbacks.
