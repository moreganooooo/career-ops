# Spec: 373 — Taleez ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 373                                           |
| Slug           | source-ats-taleez                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 354 (Hireful)             |

## 1. Problem Statement

Taleez (taleez.com) is a French applicant-tracking system (ATS) / recruitment software
for SMEs and mid-market companies. Every customer tenant publishes a branded, public,
unauthenticated candidate-facing careers board on the shared host, addressed by its
tenant token either as a sub-domain (`https://{tenant}.taleez.com/`) or via a path
(`https://taleez.com/careers/{tenant}`). The board *shell* is server-rendered, but its
open-roles *list* is client-rendered (an Angular SPA), so the board document itself
carries no role anchors and the authenticated Taleez data API
(`https://api.taleez.com/0/jobs`) answers 403 to anonymous callers. Each role's
**detail / apply page** (`https://taleez.com/apply/{slug}`), however, is fully
server-rendered and embeds a schema.org `JobPosting` JSON-LD block, making it directly
parseable without authentication. Ever Jobs has no adapter for Taleez-powered career
sites, so these vacancies are currently un-ingestable. A single generic, multi-tenant
Taleez adapter unlocks the catalogue of Taleez-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-taleez` plugin that ingests vacancies from
  **any** Taleez careers board given a `companySlug` (the tenant token, e.g. `tehtris`)
  or a `companyUrl` (a board URL on a `taleez.com` host — sub-domain or `/careers/`
  path — or a direct `…/apply/{slug}` role URL).
- Use the **public, anonymous** surface (no auth, no API key): harvest the canonical
  `https://taleez.com/apply/{slug}` detail anchors from the tenant board HTML when
  Taleez server-renders them, then fetch each role's server-rendered detail page,
  preferring its schema.org `JobPosting` JSON-LD (with `og:` meta / `<title>` / body
  HTML as defensive fallbacks).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId` = the role `{slug}`, `atsType: 'taleez'`, `department`,
  `employmentType`, `applyUrl`).

## 3. Non-Goals

- Any authenticated Taleez data API (the `api.taleez.com` jobs endpoint requires an
  API key + secret). This plugin consumes only the public candidate-facing surface.
- Driving the board's client-side SPA (headless browser / JS execution) to render the
  role list. The adapter only reads server-rendered HTML; a board that lists roles
  purely client-side (and exposes no `/apply/{slug}` anchors server-side) degrades to
  an empty result.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Taleez tenant tokens (handled by the source-adoption backlog).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Taleez plugin at a tenant's
> careers board (slug or URL), so that I ingest that organisation's open roles without
> writing a bespoke scraper.

> As a **plugin host**, I want the Taleez adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant token from `companySlug` or from a `companyUrl` on a `taleez.com` host (sub-domain label, `/careers/{tenant}` path, or `/apply/{slug}` URL). | must |
| FR-2  | When the input addresses a single role directly (`…/apply/{slug}`), fetch only that role's detail page. | must |
| FR-3  | Otherwise fetch the tenant board (`https://{tenant}.taleez.com/`, then the `/careers/{tenant}` alias) and harvest every `https://taleez.com/apply/{slug}` anchor. | must |
| FR-4  | De-duplicate roles by `{slug}` (the ATS id) within a single run.                                     | must     |
| FR-5  | Fetch each role's server-rendered detail page and parse its schema.org `JobPosting` JSON-LD (with `og:` / `<title>` / body fallbacks). | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl); `{slug}` → `atsId`. | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the link set and only fetching that many detail pages, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network / DNS errors, an anchor-less (SPA) board, and malformed / non-JSON pages without throwing. | must |
| FR-11 | Use `Promise.allSettled` for the per-role detail fan-out so one bad role never fails the batch. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                              |
| ------ | --------------------------------------------- | ----------------------------------- |
| NFR-1  | No credentials / secrets required             | public board HTML + detail pages    |
| NFR-2  | A fetch failure / unknown tenant / SPA board must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support       |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap  |
| NFR-5  | A single bad tenant / role never aborts a batch | scrape never throws; `allSettled` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TALEEZ, name: 'Taleez', category: 'ats', isAts: true })
class TaleezService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.taleez.com/        (or https://taleez.com/careers/{tenant})
  → server-rendered board shell; the role list is client-rendered (SPA). When the
    board server-renders role anchors, they take the canonical form:
      <a href="https://taleez.com/apply/{slug}">…</a>

GET https://taleez.com/apply/{slug}
  → server-rendered detail HTML embedding
      <script type="application/ld+json">{ "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "qualifications": "<p>…HTML…</p>",
        "identifier": { "@type": "PropertyValue", "name": "{Tenant}",
                        "value": "{slug}" },
        "datePosted": "2025-05-16T10:19:50+0200",
        "employmentType": ["FULL_TIME"],
        "jobLocationType": "TELECOMMUTE",
        "hiringOrganization": { "@type": "Organization", "name": "{Tenant}" },
        "jobLocation": { "address": { "addressLocality": "…",
                          "addressRegion": "…", "addressCountry": "…" } } }</script>
    plus `og:title` / `og:url` / `og:description` meta fallbacks. The application form
    is at `…/apply/{slug}/applying`.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{slug}` (JSON-LD `identifier.value` / `/apply/{slug}`) | `atsId`, `id`        | `id` is prefixed `taleez-{atsId}`                           |
| JSON-LD `title`, else `og:title` / `<title>`        | `title`                 | required; role skipped if absent                            |
| `https://taleez.com/apply/{slug}`                   | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| JSON-LD `description` + `qualifications` (HTML), else `og:description` | `description` | format-converted (HTML / Markdown / Plain)         |
| JSON-LD `datePosted`                                | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` (locality/region/country) | `location`          | city / state / country; null when none usable               |
| JSON-LD `jobLocationType` (`TELECOMMUTE`) / title / location | `isRemote`     | remote detection (`telecommute` / `remote` / `télétravail` / `wfh` …) |
| JSON-LD `industry`                                  | `department`            | when present                                                |
| JSON-LD `employmentType` (`FULL_TIME` → `Full Time`) | `employmentType`       | token (or first of an array) normalised to a readable label |
| JSON-LD `hiringOrganization.name`, else tenant token | `companyName`          | de-slugified + title-cased fallback                         |
| —                                                   | `site`                  | constant `Site.TALEEZ`                                      |
| —                                                   | `atsType`               | constant `'taleez'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `tehtris`) → tenant token used directly; board fetched at
  `https://tehtris.taleez.com/` (then the `/careers/tehtris` alias).
- `companySlug` / `companyUrl` containing a `taleez.com` host → tenant taken from the
  sub-domain label or the `/careers/{tenant}` path segment.
- `companyUrl` of the form `https://taleez.com/apply/{slug}` → addresses a single role
  directly (only that detail page is fetched).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), an anchor-less (SPA) board, or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant or role — degrades to empty / skip, never throws |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/taleez.e2e-spec.ts`): known tenant (`companySlug: 'tehtris'`)
  returns shaped jobs **or** tolerates an anchor-less (SPA) board (`site ===
  Site.TALEEZ`, `atsType === 'taleez'`, `atsId`/`jobUrl` defined when present);
  `companyUrl` resolution path exercised; a direct `…/apply/{slug}` companyUrl scrapes
  a single role; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TZ-1 — Client-rendered board role list.** The tenant board's role list is
  rendered client-side (Angular SPA), so a board document may carry no server-rendered
  `/apply/{slug}` anchors. **Default (proceeding):** harvest anchors when present and
  degrade to an empty result otherwise; a caller may always address a single role
  directly via a `…/apply/{slug}` `companyUrl`. A headless-browser render path is
  deferred to the source-adoption backlog.
- **Q-TZ-2 — Custom careers domains.** Some tenants front the board under their own
  custom domain (e.g. `jobs.taleez.com` is Taleez's own custom-domain board).
  **Default (proceeding):** address a tenant by its `taleez.com` sub-domain or
  `/careers/{tenant}` path (the stable public hosts); custom-domain detection beyond
  `taleez.com` hosts is deferred to the source-adoption backlog.
- **Q-TZ-3 — Company display name.** **Default (proceeding):** use the JSON-LD
  `hiringOrganization.name` (or `identifier.name`) when present, else de-slugify +
  title-case the tenant token for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered per-role detail page
  on `https://taleez.com/apply/{slug}`, parsed via its schema.org `JobPosting` JSON-LD
  (with `og:` / `<title>` / body fallbacks); role links are harvested from the tenant
  board HTML, with direct `…/apply/{slug}` addressing supported. **Confidence:
  verified** — the platform, the `{tenant}.taleez.com` + `/careers/{tenant}`
  addressing, and the per-role detail surface with its `JobPosting` JSON-LD were
  confirmed live 2026-06-03 against the named real tenant `tehtris` (TEHTRIS,
  `https://tehtris.taleez.com/`, with detail page
  `https://taleez.com/apply/mdr-analyst-niveau-3-f-m-x-tehtris-cdi`).
- D-2: The board's role list is client-rendered (SPA) and the authenticated Taleez
  data API (`api.taleez.com/0/jobs`) is 403 to anonymous callers, so the detail page's
  JSON-LD is the documented no-auth per-role surface; anchor harvesting + direct
  `/apply/{slug}` addressing are the enumeration paths.
- D-3: The JSON-LD `identifier.value` (the role `{slug}`) is the stable per-role ATS
  id; the richest per-role fields are `title`, `description` + `qualifications` (HTML),
  `datePosted`, `employmentType`, `hiringOrganization.name`, `jobLocationType`, and
  `jobLocation.address`.
- D-4: The board lists every open role in one document (no server-side pagination of
  the job set); the adapter collects deduped `/apply/{slug}` links and slices to
  `resultsWanted` (bounded by a hard page cap), then fetches each role's detail page
  with `Promise.allSettled`. De-dup is by `{slug}`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-taleez/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant addressing `{tenant}.taleez.com` / `taleez.com/careers/{tenant}`,
    confirmed with the named real tenant `tehtris` (TEHTRIS,
    `https://tehtris.taleez.com/`, HTTP 200). Other live tenants seen: `oversight`,
    `at-home`, `sce`, `reseauad`, `grandannecy`, `cerfrance-bfc`, `ufcv-emploi`.
  - The server-rendered detail surface `https://taleez.com/apply/{slug}` with its
    schema.org `JobPosting` JSON-LD (`identifier.value` = `{slug}` = the per-role ATS
    id), e.g. `…/apply/mdr-analyst-niveau-3-f-m-x-tehtris-cdi` (verified=true). The
    board role list is client-rendered, so anchor harvesting / direct `/apply/{slug}`
    addressing are written defensively around the documented server-rendered surface.
