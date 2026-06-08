# Spec: 366 — Scout Talent ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 366                                           |
| Slug           | source-ats-scouttalent                        |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

Scout Talent (scouttalent.com.au / scouttalent.com) is an AU/NZ talent-acquisition
vendor (recruitment CRM + ATS) whose candidate-facing product is a hosted, branded
careers board. Every customer tenant publishes a branded, public career site on
its own sub-domain of the shared application portal
`https://{tenant}.applynow.net.au/`. Unlike a client-rendered SPA, the board is
**server-rendered HTML**, so its open-roles index and per-role detail pages are
directly crawlable without authentication. Ever Jobs has no adapter for Scout
Talent-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Scout Talent adapter unlocks the full catalogue of
Scout Talent-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-scouttalent` plugin that ingests
  vacancies from **any** Scout Talent career board given a `companySlug` (the
  tenant sub-domain label, e.g. `krg`) or a `companyUrl` (a portal URL on an
  `applynow.net.au` host, from which the tenant host is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.applynow.net.au/`) to enumerate roles, plus
  each role's server-rendered detail page (`…/jobs/{code}-{slug}`) carrying the job
  body and metadata (preferring a schema.org `JobPosting` JSON-LD block when
  present, with `og:` meta / `<title>` / body HTML as defensive fallbacks).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'scouttalent'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Scout Talent admin or recruiter API. This plugin consumes only
  the public candidate-facing board.
- Server-side filtering by category / location / work type (the board supports
  these facets). We ingest the tenant's full open-roles index and slice client-side
  to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Scout Talent tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Scout Talent plugin at a
> tenant's careers sub-domain, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Scout Talent adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant careers host from `companySlug` (expanded to `{tenant}.applynow.net.au`) or from a `companyUrl` on an `applynow.net.au` host (origin used verbatim). | must |
| FR-2  | Fetch the public server-rendered index (`GET https://{tenant}.applynow.net.au/`) and extract every `/jobs/{code}-{slug}` link. | must |
| FR-3  | Fetch each role's server-rendered detail page (`GET …/jobs/{code}-{slug}`); use the leading `{code}` segment as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` (`code`) within a single run.                                          | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the link set and only fetching that many detail pages, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON pages without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML index + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SCOUTTALENT, name: 'Scout Talent', category: 'ats', isAts: true })
class ScoutTalentService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.applynow.net.au/
  → server-rendered HTML carrying one anchor per open role:
      <a href="https://{tenant}.applynow.net.au/jobs/{code}-{slug}">…</a>
    (relative `/jobs/{code}-{slug}` form also emitted)

GET https://{tenant}.applynow.net.au/jobs/{code}-{slug}
  → server-rendered detail HTML (Job No `{code}`, location, work type, closing date,
    body); optionally embedding
      <script type="application/ld+json">{ "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20", "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "…" },
        "jobLocation": { "address": {
          "addressLocality": "Gordon", "addressRegion": "NSW",
          "addressCountry": "AU" } } }</script>
    plus `og:title` / `og:url` / `og:description` meta fallbacks.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{code}` (from `/jobs/{code}-{slug}`)               | `atsId`, `id`           | `id` is prefixed `scouttalent-{atsId}`                      |
| JSON-LD `title`, else `og:title` / `<title>`        | `title`                 | required; role skipped if absent                            |
| `https://{tenant}.applynow.net.au/jobs/{code}-{slug}` | `jobUrl`, `applyUrl`  | canonical public detail / apply URL (JSON-LD `url` preferred for apply) |
| JSON-LD `description` (HTML) / `og:description`      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted`                                | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` (locality/region/country) | `location`          | city / state / country; null when none usable               |
| JSON-LD `jobLocationType` / title / location        | `isRemote`              | remote detection (`TELECOMMUTE` / `remote` / `wfh` …)       |
| JSON-LD `industry`                                  | `department`            | when present                                                |
| JSON-LD `employmentType` (`FULL_TIME` → `Full Time`) | `employmentType`       | token normalised to a readable label                        |
| JSON-LD `hiringOrganization.name`, else tenant slug | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                   | `site`                  | constant `Site.SCOUTTALENT`                                 |
| —                                                   | `atsType`               | constant `'scouttalent'`                                    |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `krg`) → expanded to `https://krg.applynow.net.au`.
- `companySlug` containing a bare host / `applynow.net.au` → used verbatim as the host.
- `companyUrl` on an `applynow.net.au` host (e.g. `https://krg.applynow.net.au/`) →
  its origin is used verbatim; the tenant token is the leading sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/scouttalent.e2e-spec.ts`): known tenant (`companySlug: 'krg'`)
  returns shaped jobs (`site === Site.SCOUTTALENT`, `atsType === 'scouttalent'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-ST-1 — Custom careers domains.** Some tenants may front the board under their
  own custom domain. **Default (proceeding):** address a tenant by its
  `applynow.net.au` sub-domain (the stable public host); a caller may pass a full
  `companyUrl` on an `applynow.net.au` host. Custom-domain detection beyond
  `applynow.net.au` / `applynow.com.au` hosts is deferred to the source-adoption
  backlog.
- **Q-ST-2 — Structured detail metadata.** Detail pages render server-side; a
  schema.org `JobPosting` JSON-LD block is the richest structured source when
  present. **Default (proceeding):** prefer JSON-LD, falling back to `og:` meta and
  the `<title>` / body HTML, all narrowed defensively.
- **Q-ST-3 — Company display name.** The public board carries the tenant brand in
  the JSON-LD `hiringOrganization` when present, but not always. **Default
  (proceeding):** use `hiringOrganization.name` when present, else de-slugify +
  title-case the tenant sub-domain label for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on
  `{tenant}.applynow.net.au`: the open-roles index for enumeration (the
  `/jobs/{code}-{slug}` anchors) plus each role's server-rendered detail page for
  the body and metadata. **Confidence: verified** — the platform, the
  `{tenant}.applynow.net.au` addressing, the index HTML, and the per-role detail
  URL shape `…/jobs/{code}-{slug}` were confirmed live 2026-06-03 against the named
  real tenant `krg` (Ku-ring-gai Council).
- D-2: The board is server-rendered HTML (not a SPA), so the HTML itself is the
  documented no-auth surface; per-role detail pages are parsed with a schema.org
  `JobPosting` JSON-LD preference and `og:` / `<title>` / body fallbacks.
- D-3: The richest per-role fields are the detail page's `title`, body
  `description` (HTML), `datePosted`, `employmentType`, `industry`, location
  (`jobLocation.address`), and `jobLocationType`. The leading `{code}` segment of
  the detail URL is the stable per-role ATS id.
- D-4: The index lists every open role in one document (no server-side pagination
  of the job set); the adapter collects deduped links and slices to `resultsWanted`
  (bounded by a hard page cap), then fetches each role's detail page. De-dup is by
  `atsId` (`code`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-scouttalent/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.applynow.net.au`, confirmed with the
    named real tenant `krg` (Ku-ring-gai Council, `https://krg.applynow.net.au/`).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/jobs/{code}-{slug}` (e.g. `/jobs/J9380-manager-corporate-finance`,
    `/jobs/PP05040-parking-ranger`), with the leading `{code}` segment as the
    per-role ATS id (verified=true). JSON-LD / og: detail parsing is written
    defensively around the documented server-rendered detail surface.
