# Spec: 374 — Softy ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 374                                           |
| Slug           | source-ats-softy                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 365 (LiveHire)            |

## 1. Problem Statement

Softy (softy.pro) is a 100% French ATS / recruitment suite (created in Dijon, with
support, team and data hosting in France) whose candidate-facing product is a hosted,
branded careers board. Every customer tenant publishes a branded, public career site
on its own sub-domain of the shared application host
`https://{tenant}.softy.pro/`. Unlike a client-rendered SPA, the open-roles index is
**server-rendered HTML**, so its listing and per-role detail pages are directly
crawlable without authentication. Ever Jobs has no adapter for Softy-powered career
boards, so these vacancies are currently un-ingestable. A single generic,
multi-tenant Softy adapter unlocks the full catalogue of Softy-powered career boards
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-softy` plugin that ingests vacancies from
  **any** Softy career board given a `companySlug` (the tenant sub-domain label, e.g.
  `groupecls`) or a `companyUrl` (a board URL on a `softy.pro` host, from which the
  tenant sub-domain label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.softy.pro/offres`) to enumerate roles and read
  the labelled card fields (title, location city, contract type, "Mise en ligne le
  DD/MM/YYYY"), plus each role's server-rendered detail page
  (`…/offre/{ID}-{title-slug}`) fetched best-effort for a richer description body.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'softy'`, `employmentType`, `applyUrl`).

## 3. Non-Goals

- Any authenticated Softy admin / recruiter API. This plugin consumes only the public
  candidate-facing board.
- Server-side filtering by category / location / contract (the board supports these
  facets). We ingest the tenant's full open-roles index and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Softy tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Softy plugin at a tenant's
> careers sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Softy adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant careers host from `companySlug` (expanded to `{tenant}.softy.pro`) or from a `companyUrl` on a `softy.pro` host (leading sub-domain label used as the tenant). | must |
| FR-2  | Fetch the public server-rendered index (`GET https://{tenant}.softy.pro/offres`) and extract every `/offre/{ID}-{title-slug}` anchor. | must |
| FR-3  | Use the leading numeric `{ID}` segment of each anchor as the stable `atsId`.                          | must |
| FR-4  | De-duplicate roles by `atsId` (`{ID}`) within a single run.                                          | must     |
| FR-5  | Read the labelled card text around each anchor (location city, contract type, "Mise en ligne le DD/MM/YYYY") for location / employmentType / datePosted. | should |
| FR-6  | Fetch each role's server-rendered detail page best-effort for a richer description body (bounded by a detail-fetch cap, via `Promise.allSettled`). | should |
| FR-7  | Map each role to `JobPostDto` (title, jobUrl, location, employmentType, isRemote, datePosted, description, applyUrl, emails). | must |
| FR-8  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-9  | Honour `resultsWanted` (default 100 internally) by slicing the parsed card set.                       | must     |
| FR-10 | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-11 | Tolerate unknown tenants (HTTP 4xx), network / DNS errors, and malformed pages without throwing.      | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML index + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; detail-fetch cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws; `Promise.allSettled` fan-out |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SOFTY, name: 'Softy', category: 'ats', isAts: true })
class SoftyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.softy.pro/offres
  → server-rendered HTML carrying one card per open role:
      <a href="/offre/{ID}-{title-slug}">…</a>
    with labelled card text: the role title, a location city (e.g. "Toulouse"),
    a contract type ("CDI" | "CDD" | "Apprentissage - 24 Mois" | "Stage - 4 Mois" | …),
    and a "Mise en ligne le DD/MM/YYYY" published-date line.

GET https://{tenant}.softy.pro/offre/{ID}-{title-slug}
  → server-rendered detail HTML (job body under "L'entreprise" / "Le poste" /
    "Profil recherché" headings; location + contract repeated under "Conditions
    pratiques" / "Localisations"). No schema.org JobPosting JSON-LD and no og: meta
    are present; the visible body text is recovered best-effort as the description.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{ID}` (from `/offre/{ID}-{slug}`)                  | `atsId`, `id`           | `id` is prefixed `softy-{atsId}`                            |
| card title heading, else de-slugified `{slug}`      | `title`                 | required; role skipped if absent                            |
| `https://{tenant}.softy.pro/offre/{ID}-{slug}`      | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                        |
| detail-page body (best-effort), else location line  | `description`           | format-converted (HTML / Markdown / Plain)                 |
| "Mise en ligne le DD/MM/YYYY" (day-first)           | `datePosted`            | parsed → `YYYY-MM-DD`                                       |
| card location city                                  | `location`              | city; null when none usable                                |
| title / location / contract                         | `isRemote`              | remote detection (`remote` / `télétravail` / `distanciel` …) |
| card contract type (`CDI` / `Apprentissage - …`)    | `employmentType`        | short codes kept upper-case; longer labels title-cased     |
| de-slugified + title-cased tenant label             | `companyName`           | the card carries no brand name                             |
| —                                                   | `site`                  | constant `Site.SOFTY`                                       |
| —                                                   | `atsType`               | constant `'softy'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                              |
| —                                                   | `department`            | null (the card carries no department facet)                |

Tenant resolution:

- `companySlug` (e.g. `groupecls`) → expanded to `https://groupecls.softy.pro/offres`.
- `companySlug` containing a bare host / `softy.pro` → the leading sub-domain label is used.
- `companyUrl` on a `softy.pro` host (e.g. `https://groupecls.softy.pro/offres`) →
  the leading sub-domain label is the tenant token (the bare apex / `www` yields none).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page or per-role map error — partial, never throws              |

## 8. Test Plan

- E2E (`__tests__/softy.e2e-spec.ts`): known tenant (`companySlug: 'groupecls'`)
  returns shaped jobs (`site === Site.SOFTY`, `atsType === 'softy'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SF-1 — Custom careers domains.** Some tenants may front the board under their
  own custom domain. **Default (proceeding):** address a tenant by its
  `{tenant}.softy.pro` sub-domain (the stable public host); a caller may pass a full
  `companyUrl` on a `softy.pro` host. Custom-domain detection is deferred to the
  source-adoption backlog.
- **Q-SF-2 — Structured detail metadata.** Detail pages render server-side but carry
  no schema.org `JobPosting` JSON-LD and no og: meta. **Default (proceeding):** the
  index card text is the structured listing-level data (title, location, contract,
  date); the detail page body is recovered best-effort as the description, narrowed
  defensively.
- **Q-SF-3 — Company display name.** The public board carries no brand name on the
  card. **Default (proceeding):** de-slugify + title-case the tenant sub-domain label
  for `companyName`.
- **Q-SF-4 — Index pagination.** The index renders the full board in one document; a
  `?page=N` query form 404s on the surveyed tenants. **Default (proceeding):** parse
  the single index document for all `/offre/{ID}-{slug}` anchors and slice to
  `resultsWanted` (no server-side page walk).

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on
  `{tenant}.softy.pro`: the open-roles index (`/offres`) for enumeration (the
  `/offre/{ID}-{slug}` anchors + labelled card fields) plus each role's server-rendered
  detail page for a richer description body. **Confidence: verified** — the platform,
  the `{tenant}.softy.pro` addressing, the index HTML, the labelled card fields, and
  the per-role detail URL shape `…/offre/{ID}-{slug}` were confirmed live 2026-06-03
  against named real tenants `ensio` (ENSIO, 85 open roles), `groupecls` (Groupe CLS)
  and `recrutcl` (ReCrut').
- D-2: The board is server-rendered HTML (not a SPA), so the HTML itself is the
  documented no-auth surface. The index card text carries the structured listing-level
  fields; the detail page (no JSON-LD / og:) is parsed best-effort for the body text.
- D-3: The leading numeric `{ID}` segment of each detail URL is the stable per-role
  ATS id. The card fields are title, location city, contract type, and the
  "Mise en ligne le DD/MM/YYYY" date.
- D-4: The index lists every open role in one document (no `?page=N` server-side
  pagination of the job set); the adapter collects deduped anchors and slices to
  `resultsWanted`, then fetches each role's detail body via `Promise.allSettled`
  (bounded by a detail-fetch cap). De-dup is by `atsId` (`{ID}`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-softy/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.softy.pro`, confirmed with named real
    tenants `ensio` (`https://ensio.softy.pro/offres`, 85 open roles), `groupecls`
    (`https://groupecls.softy.pro/offres`) and `recrutcl` (`https://recrutcl.softy.pro/offers`).
  - The server-rendered index HTML and the per-role detail URL shape
    `…/offre/{ID}-{slug}` (e.g. `/offre/208303-responsable-marches-produits-product-manager-h-f`,
    `/offre/209208-technicien-installation-equipement-surete-electronique-h-f`), with
    the leading numeric `{ID}` segment as the per-role ATS id (verified=true). The
    detail page carries no JSON-LD / og:, so body parsing is written defensively.
