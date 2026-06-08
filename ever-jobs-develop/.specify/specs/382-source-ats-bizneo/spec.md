# Spec: 382 — Bizneo HR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 382                                           |
| Slug           | source-ats-bizneo                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 354 (Hireful)             |

## 1. Problem Statement

Bizneo HR (bizneo.com) is a Spanish talent-acquisition suite (recruiting CRM + ATS)
whose candidate-facing product is a hosted, branded Career Site. Every customer
tenant publishes a branded, public, unauthenticated careers board on its own
sub-domain of the shared platform host `https://{tenant}.bizneo.com/jobs`. The
board's open-roles index is **server-rendered** enough to enumerate roles — each
open vacancy renders as a `/jobs/{slug}` anchor with labelled card text (title,
location, optional brand, work-mode) — while each per-role detail body is hydrated
client-side. Ever Jobs has no adapter for Bizneo HR-powered career sites, so these
vacancies are currently un-ingestable. A single generic, multi-tenant Bizneo
adapter unlocks the full catalogue of Bizneo-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-bizneo` plugin that ingests vacancies
  from **any** Bizneo HR career board given a `companySlug` (the tenant sub-domain
  label, e.g. `groundforce`) or a `companyUrl` (a board URL on a `bizneo.com` host,
  from which the tenant board host is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.bizneo.com/jobs`) to enumerate roles, anchored
  on each `/jobs/{slug}` job link with the labelled card text immediately around it
  (title, location, optional brand, "On-site" / "Remote" / "Hybrid" work-mode), and
  an optional schema.org `JobPosting` JSON-LD block as a defensive enrichment when
  the board emits one.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId` = `{slug}`, `atsType: 'bizneo'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Bizneo HR admin / recruiter API. This plugin consumes only the
  public candidate-facing board.
- Scraping the JS-hydrated per-role detail DOM (a headless browser). The adapter
  parses the server-rendered index; the `{slug}` is the stable id and the detail URL
  is the canonical apply URL.
- Server-side filtering by brand / location / work mode (the board supports these
  facets). We ingest the tenant's full open-roles index and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Bizneo tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Bizneo plugin at a tenant's
> careers sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Bizneo adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant board host from `companySlug` (expanded to `{tenant}.bizneo.com`) or from a `companyUrl` on a `bizneo.com` host (origin used verbatim; the bare `bizneo.com` / `www.bizneo.com` marketing host is rejected). | must |
| FR-2  | Fetch the public server-rendered index (`GET https://{tenant}.bizneo.com/jobs`) and extract every `/jobs/{slug}` link, skipping reserved/utility tokens. | must |
| FR-3  | Use the `{slug}` segment as the stable per-role `atsId`; build the canonical detail / apply URL `https://{tenant}.bizneo.com/jobs/{slug}`. | must |
| FR-4  | De-duplicate roles by `atsId` (`slug`) within a single run.                                          | must     |
| FR-5  | Recover the title, location, optional brand, and work-mode from the card text around each anchor; enrich from a server-rendered `JobPosting` JSON-LD block when present. | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by accumulating only that many deduped roles, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), DNS / network errors, and malformed pages without throwing.     | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML board                |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | accumulate to `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BIZNEO, name: 'Bizneo HR', category: 'ats', isAts: true })
class BizneoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.bizneo.com/jobs
  → server-rendered HTML carrying one anchor per open role:
      <a href="/jobs/{slug}">…</a>   (absolute form on the same host also emitted)
    alongside labelled card text: the role title, a location line, an optional
    brand label, and an "On-site" / "Remote" / "Hybrid" work-mode token.

(canonical detail / apply URL)
  https://{tenant}.bizneo.com/jobs/{slug}
  → per-role detail page; its body is hydrated client-side, so the adapter does not
    depend on it. The {slug} segment is the stable per-role ATS id (e.g.
    `operario-a-almacen-aeropuerto-de-malaga`; some slugs carry a trailing UUID).
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{slug}` (from `/jobs/{slug}`)                      | `atsId`, `id`           | `id` is prefixed `bizneo-{atsId}`                           |
| card heading text, else JSON-LD `title`, else slug  | `title`                 | required; role skipped if absent                            |
| `https://{tenant}.bizneo.com/jobs/{slug}`           | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| location line (else location-line / JSON-LD body)   | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted` when present                   | `datePosted`            | parsed → `YYYY-MM-DD`; else null                            |
| location line / JSON-LD `jobLocation.address`       | `location`              | city / state / country; null when none usable               |
| work-mode token / title / location                  | `isRemote`              | remote detection (`Remote` / `Remoto` / `Teletrabajo` …)    |
| brand label                                         | `department`            | when present                                                |
| JSON-LD `employmentType` when present               | `employmentType`        | token normalised to a readable label; else null            |
| brand label, else tenant slug                       | `companyName`           | de-slugified + title-cased fallback                         |
| —                                                   | `site`                  | constant `Site.BIZNEO`                                      |
| —                                                   | `atsType`               | constant `'bizneo'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `groundforce`) → expanded to `https://groundforce.bizneo.com`.
- `companySlug` containing a bare host / full board URL → used verbatim as the host.
- `companyUrl` on a `bizneo.com` host (e.g. `https://groundforce.bizneo.com/jobs`) →
  its origin is used verbatim; the tenant token is the leading sub-domain label
  (or the second label for `jobs.{tenant}.bizneo.com`). The marketing host
  `bizneo.com` / `www.bizneo.com` is rejected.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/bizneo.e2e-spec.ts`): known tenant (`companySlug: 'groundforce'`)
  returns shaped jobs (`site === Site.BIZNEO`, `atsType === 'bizneo'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BZ-1 — Custom careers domains.** Some tenants may front the board under their
  own custom domain. **Default (proceeding):** address a tenant by its
  `bizneo.com` sub-domain (the stable public host); a caller may pass a full
  `companyUrl` on a `bizneo.com` host. Custom-domain detection beyond `bizneo.com`
  hosts is deferred to the source-adoption backlog.
- **Q-BZ-2 — Per-role detail metadata.** Detail bodies are hydrated client-side, so
  there is no reliable server-rendered per-role body. **Default (proceeding):**
  enumerate + describe roles from the server-rendered index card text, enriching
  from a `JobPosting` JSON-LD block when one is server-rendered; the location line
  is the listing-level description otherwise.
- **Q-BZ-3 — Company display name.** The public board card carries an optional brand
  label (e.g. "PizzaHut", "Groundforce Handling"), but not always. **Default
  (proceeding):** use the brand label when present, else de-slugify + title-case the
  tenant sub-domain label for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on
  `{tenant}.bizneo.com/jobs`: the open-roles index for enumeration (the
  `/jobs/{slug}` anchors plus the labelled card text). **Confidence: verified** —
  the platform, the `{tenant}.bizneo.com` addressing, the index HTML, and the
  per-role detail URL shape `…/jobs/{slug}` were confirmed live 2026-06-03 against
  the named real tenant `groundforce` (Groundforce, airport handling, Spain).
- D-2: The `{slug}` path segment is the stable per-role ATS id; the detail URL
  `https://{tenant}.bizneo.com/jobs/{slug}` is the canonical apply URL. The detail
  body is hydrated client-side, so the adapter parses the index rather than the
  detail DOM (mirroring the LiveHire board-parsing variant).
- D-3: The richest reliably-available per-role fields are the index card's title,
  location line, optional brand label, and work-mode token; an optional
  server-rendered `JobPosting` JSON-LD block enriches title / location / date /
  employment-type when present.
- D-4: The index lists every open role in one document (no server-side pagination of
  the job set); the adapter accumulates deduped roles and stops at `resultsWanted`
  (bounded by a hard page cap). De-dup is by `atsId` (`slug`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-bizneo/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.bizneo.com`, confirmed with the named
    real tenant `groundforce` (Groundforce, `https://groundforce.bizneo.com/jobs`,
    multiple open roles rendering live with title + location + work-mode).
  - The per-role detail URL shape `…/jobs/{slug}` (e.g.
    `/jobs/operario-a-almacen-aeropuerto-de-malaga`,
    `/jobs/agentes-de-rampa-aeropuerto-de-bilbao-9821c8a8-1aca-4e1a-afd6-9ec384a509ef`),
    with the `{slug}` segment as the per-role ATS id (verified=true). Another live
    tenant seen on the same host pattern: `telepizza` (Telepizza / Food Delivery
    Brands), reachable as `jobs.telepizza.bizneo.com`. JSON-LD enrichment is written
    defensively around the documented server-rendered index surface.
