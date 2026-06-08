# Spec: 376 — Altamira ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 376                                           |
| Slug           | source-ats-altamira                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Altamira (altamirahrm.com, Italy — "Altamira Recruiting") is an applicant tracking
system whose candidate-facing product is a hosted, branded career site. Every
customer tenant publishes a branded, public career site on a sub-domain of the
shared host `altamiraweb.com` — `https://{tenant}.altamiraweb.com/` (and a newer
`https://{tenant}.sites.altamiraweb.com/` variant). Altamira advertises the career
site as SEO-friendly (indexed by Google/Bing), so the board is **server-rendered
HTML**: its open-roles index and per-role detail pages are directly crawlable
without authentication. Ever Jobs has no adapter for Altamira-powered career sites,
so these vacancies are currently un-ingestable. A single generic, multi-tenant
Altamira adapter unlocks the full catalogue of Altamira-powered career boards with
one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-altamira` plugin that ingests vacancies
  from **any** Altamira career board given a `companySlug` (the tenant sub-domain
  label, e.g. `etinars`) or a `companyUrl` (a careers URL on an `altamiraweb.com`
  host, whose origin is used verbatim — preserving the `*.sites.altamiraweb.com`
  variant).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.altamiraweb.com/jobs`) to enumerate roles,
  plus each role's server-rendered detail page (`…/jobs/{slug}-{JobID}.htm`)
  best-effort for the body text.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'altamira'`).

## 3. Non-Goals

- Any authenticated Altamira admin / recruiter API. This plugin consumes only the
  public candidate-facing board.
- Server-side filtering by category / location / contract type (the board supports
  these facets). We ingest the tenant's full open-roles index and slice client-side
  to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Altamira tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Altamira plugin at a tenant's
> careers sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Altamira adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant careers origin from `companySlug` (expanded to `{tenant}.altamiraweb.com`) or from a `companyUrl` on an `altamiraweb.com` host (origin used verbatim, preserving `*.sites`). | must |
| FR-2  | Fetch the public server-rendered index (`GET {origin}/jobs`) and extract every `/jobs/{slug}-{JobID}.htm` and `/jobs/job-details?JobID={JobID}` link. | must |
| FR-3  | Use the trailing numeric `{JobID}` as the `atsId`; recover title + location from the SEO slug. | must |
| FR-4  | De-duplicate roles by `atsId` (`JobID`) within a single run.                                          | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, remote, description, applyUrl).                  | must     |
| FR-6  | Enrich the description from the role's detail-page body (best-effort) and convert per `descriptionFormat`. | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the role set, bounded by a page cap.      | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed pages without throwing.           | must     |
| FR-10 | Per-role detail fan-out uses `Promise.allSettled` so one bad role never aborts the batch.            | must     |

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
@SourcePlugin({ site: Site.ALTAMIRA, name: 'Altamira', category: 'ats', isAts: true })
class AltamiraService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.altamiraweb.com/jobs
  → server-rendered HTML carrying one anchor per open role, in two interchangeable
    forms:
      <a href="/jobs/{Title-Country-Region-City-slug}-{JobID}.htm">…</a>
      <a href="/jobs/job-details?JobID={JobID}">…</a>
    (the trailing numeric {JobID} is the stable ATS id; the SEO slug encodes the
     title head and a Country-Region-City location tail)

GET https://{tenant}.altamiraweb.com/jobs/{slug}-{JobID}.htm
  → server-rendered detail HTML with <title> "{Title} in {City} | Careers at {Tenant}"
    and the full job-ad body (no schema.org JSON-LD / og: meta is emitted).
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| trailing `{JobID}` (numeric)                        | `atsId`, `id`           | `id` is prefixed `altamira-{atsId}`                         |
| SEO slug head (de-slugified)                        | `title`                 | required; role skipped if absent                            |
| `{origin}/jobs/{slug}-{JobID}.htm`                  | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| detail-page body (best-effort), else slug location  | `description`           | format-converted (HTML / Markdown / Plain)                  |
| SEO slug location tail (Country-Region-City)        | `location`              | country / state / city; null when none usable               |
| title / location / slug                             | `isRemote`              | remote detection (`remote` / `remoto` / `smart working` …)  |
| tenant sub-domain label (de-slugified + title-cased)| `companyName`           | board carries no brand name in the index                    |
| —                                                   | `site`                  | constant `Site.ALTAMIRA`                                    |
| —                                                   | `atsType`               | constant `'altamira'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |
| —                                                   | `department`, `employmentType`, `datePosted` | null (not exposed on the public index/detail surface) |

Tenant resolution:

- `companySlug` (e.g. `etinars`) → expanded to `https://etinars.altamiraweb.com`.
- `companySlug` containing a bare host / `altamiraweb.com` → its origin is used verbatim.
- `companyUrl` on an `altamiraweb.com` host (e.g. `https://etinars.sites.altamiraweb.com/jobs`)
  → its origin is used verbatim; the tenant token is the leading sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / per-role map / enrich error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/altamira.e2e-spec.ts`): known tenant (`companyUrl` for `etinars`)
  returns shaped jobs (`site === Site.ALTAMIRA`, `atsType === 'altamira'`,
  `atsId`/`jobUrl` defined); bare-`companySlug` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-AL-1 — Hosting variants.** Tenants are hosted on both bare
  `{tenant}.altamiraweb.com` and `{tenant}.sites.altamiraweb.com`. **Default
  (proceeding):** a plain `companySlug` expands to the bare `{tenant}.altamiraweb.com`
  host; a caller targeting the `*.sites` variant (or a custom domain fronting the
  board) passes a full `companyUrl`, whose origin is used verbatim. Custom-domain
  auto-detection beyond `altamiraweb.com` hosts is deferred to the source-adoption
  backlog.
- **Q-AL-2 — Structured detail metadata.** Detail pages render server-side but emit
  no schema.org `JobPosting` JSON-LD or `og:` meta. **Default (proceeding):** derive
  the title + location from the SEO slug (always present on the index anchor) and
  enrich the description from the detail-page body best-effort; `department`,
  `employmentType`, and `datePosted` are left null on this surface.
- **Q-AL-3 — Company display name.** The public index carries no brand name.
  **Default (proceeding):** de-slugify + title-case the tenant sub-domain label for
  `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on a
  sub-domain of `altamiraweb.com`: the open-roles index `/jobs` for enumeration (the
  `/jobs/{slug}-{JobID}.htm` and `/jobs/job-details?JobID={JobID}` anchors) plus each
  role's server-rendered detail page for the body. **Confidence: verified** — the
  platform, the `{tenant}.altamiraweb.com` (and `*.sites`) addressing, the index
  HTML, the per-role detail URL shapes, and the detail `<title>` shape were confirmed
  live 2026-06-03 against the named real tenant `etinars` (Etinars).
- D-2: The board is server-rendered HTML (not a SPA), so the index HTML itself is the
  documented no-auth surface; the trailing numeric `{JobID}` is the stable per-role
  ATS id and the SEO slug carries title + location.
- D-3: No JSON-LD / og: is emitted, so title + location come from the slug (always
  present) and the description is enriched best-effort from the detail body; the role
  is still complete from the index alone if enrichment fails.
- D-4: The index may paginate (`?PagerAnnunci={n}`); the adapter walks pages until it
  has enough roles or a page yields nothing new (bounded by a hard page cap), deduped
  by `atsId` (`JobID`), then slices to `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws, and the per-role detail fan-out uses
  `Promise.allSettled`.

## 11. References

- `packages/plugins/source-ats-altamira/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.altamiraweb.com` (incl. the
    `*.sites.altamiraweb.com` variant), confirmed with the named real tenant
    `etinars` (Etinars, `https://etinars.sites.altamiraweb.com/`); other live tenants
    seen: `rina` (RINA), `zegnacareers` (EZ Service Srl).
  - The server-rendered `/jobs` index HTML and the per-role detail URL shapes
    `/jobs/{slug}-{JobID}.htm` (e.g.
    `/jobs/Desktop-Support-Engineer-...-Italia-Veneto-Padova-561445691.htm`) and
    `/jobs/job-details?JobID=561445691`, with the trailing numeric `{JobID}` as the
    per-role ATS id and the detail `<title>` shape "{Title} in {City} | Careers at
    {Tenant}" (verified=true). Body / location parsing is written defensively around
    the documented server-rendered surface.
