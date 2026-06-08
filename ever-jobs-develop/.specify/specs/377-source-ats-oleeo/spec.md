# Spec: 377 — Oleeo ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 377                                           |
| Slug           | source-ats-oleeo                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Oleeo (oleeo.com, UK) is an enterprise e-recruitment / ATS vendor (formerly WCN /
"tal.net") used widely across the UK public sector, policing, government, and
financial-services firms. Every customer tenant publishes a branded, public,
candidate-facing careers portal on its own sub-domain of the shared application
host `https://{tenant}.tal.net/`. The candidate-facing job board is
**server-rendered HTML**, so its open-roles index and per-role detail pages are
directly crawlable without authentication. Ever Jobs has no adapter for
Oleeo-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Oleeo adapter unlocks the full catalogue of
Oleeo-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-oleeo` plugin that ingests vacancies from
  **any** Oleeo career board given a `companySlug` (the tenant sub-domain label,
  e.g. `fcdo`) or a `companyUrl` (a portal URL on a `tal.net` host, from which the
  tenant host is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  job board (`https://{tenant}.tal.net/candidate/jobboard/vacancy/1/adv/`) to
  enumerate opportunities, plus each role's server-rendered detail page
  (`…/opp/{ID}-{slug}/en-GB`) carrying the title, body, location, employment type,
  and closing/posted date.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'oleeo'`, `employmentType`).

## 3. Non-Goals

- Any authenticated Oleeo admin / recruiter API. This plugin consumes only the
  public candidate-facing board.
- Server-side filtering by category / region / work type (the board supports these
  facets). We ingest the tenant's full open-roles set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, talent-bank registration, or any write
  operation.
- A curated seed list of Oleeo tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Oleeo plugin at a tenant's
> careers sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Oleeo adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant careers host from `companySlug` (expanded to `{tenant}.tal.net`) or from a `companyUrl` on a `tal.net` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered board (`GET https://{tenant}.tal.net/candidate/jobboard/vacancy/1/adv/`) and extract every `…/opp/{ID}-{slug}/en-GB` anchor. | must |
| FR-3  | Fetch each role's server-rendered detail page (`GET …/opp/{ID}-{slug}/en-GB`); use the leading numeric `{ID}` segment as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` (`{ID}`) within a single run.                                          | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by walking the board (`?start=` paging) and only fetching that many detail pages, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (DNS / HTTP 4xx), network errors, and malformed pages without throwing.      | must     |
| FR-10 | Fan out per-role detail fetches with `Promise.allSettled` so one bad page never aborts the batch.    | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                            |
| ------ | --------------------------------------------- | --------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML board + detail pages  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result  |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support     |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OLEEO, name: 'Oleeo', category: 'ats', isAts: true })
class OleeoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.tal.net/candidate/jobboard/vacancy/1/adv/
  → server-rendered HTML carrying one anchor per open opportunity:
      <a href="https://{tenant}.tal.net/vx/…/candidate/so/pm/4/pl/1/
        opp/{ID}-{title-slug}/en-GB">…</a>
    Larger boards page via ?start={offset} (50 roles/page).

GET https://{tenant}.tal.net/…/opp/{ID}-{slug}/en-GB
  → server-rendered detail HTML (title, location, free-text body, employment type,
    closing date). No schema.org JSON-LD is emitted, so the title is taken from
    og:title / <title> / <h1> and the body from the <article>/<main> region, all
    narrowed defensively.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{ID}` (from `…/opp/{ID}-{slug}`)                   | `atsId`, `id`           | `id` is prefixed `oleeo-{atsId}`                            |
| detail `og:title` / `<h1>` / `<title>`, else slug   | `title`                 | required; role skipped if absent                            |
| `https://{tenant}.tal.net/…/opp/{ID}-{slug}/en-GB`  | `jobUrl`, `applyUrl`    | canonical public detail / apply URL                         |
| detail `<article>`/`<main>` body HTML               | `description`           | format-converted (HTML / Markdown / Plain)                  |
| labelled "Closing date" / "Posted" line             | `datePosted`            | parsed → `YYYY-MM-DD` when absolute; null for relative      |
| labelled "Location" / "Country" line                | `location`              | city / state / country; null when none usable               |
| title / location / body remote markers              | `isRemote`              | remote detection (`remote` / `wfh` / `home working` …)      |
| labelled "Employment Type" / "Working Pattern" line | `employmentType`        | token normalised to a readable label                        |
| tenant sub-domain label                             | `companyName`           | de-slugified + title-cased                                  |
| —                                                   | `site`                  | constant `Site.OLEEO`                                       |
| —                                                   | `atsType`               | constant `'oleeo'`                                          |
| —                                                   | `department`            | not exposed on the public board → `null`                   |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `fcdo`) → expanded to `https://fcdo.tal.net`.
- `companySlug` containing a bare host / `tal.net` → tenant taken from its leading
  sub-domain label.
- `companyUrl` on a `tal.net` host (e.g. `https://fcdo.tal.net/candidate`) → the
  leading sub-domain label is the tenant; the board host is rebuilt from it.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (DNS / HTTP 4xx), or no roles |
| logged warn (HTTP 4xx / DNS) | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page or per-role map error — partial, never throws              |

## 8. Test Plan

- E2E (`__tests__/oleeo.e2e-spec.ts`): known tenant (`companySlug: 'fcdo'`) returns
  shaped jobs (`site === Site.OLEEO`, `atsType === 'oleeo'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty;
  unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`). 30000 ms
  timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-OL-1 — Custom careers domains.** Some tenants may front the board under their
  own custom domain (e.g. a vanity careers host CNAME'd to tal.net). **Default
  (proceeding):** address a tenant by its `tal.net` sub-domain (the stable public
  host); a caller may pass a full `companyUrl` on a `tal.net` host. Custom-domain
  detection beyond `tal.net` hosts is deferred to the source-adoption backlog.
- **Q-OL-2 — Structured detail metadata.** Detail pages render server-side with no
  schema.org `JobPosting` JSON-LD. **Default (proceeding):** take the title from
  `og:title` / `<h1>` / `<title>`, the body from the `<article>`/`<main>` region,
  and labelled "Location" / "Employment Type" / "Closing date" lines from the body
  text, all narrowed defensively.
- **Q-OL-3 — Appcentre / brand IDs.** The fuller vacancy URLs embed appcentre /
  brand / xf tokens that vary per tenant and rotate. **Default (proceeding):**
  enumerate via the brand-agnostic short board path and consume the absolute hrefs
  the board itself emits for each `/opp/{ID}` link, rather than reconstructing the
  token-laden URL.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on
  `{tenant}.tal.net`: the brand-agnostic board path
  (`/candidate/jobboard/vacancy/1/adv/`) for enumeration (the `…/opp/{ID}-{slug}`
  anchors) plus each role's server-rendered detail page for the body and metadata.
  **Confidence: verified** — the platform, the `{tenant}.tal.net` addressing, the
  board HTML, and the per-role detail URL shape `…/opp/{ID}-{slug}/en-GB` were
  confirmed live 2026-06-03 against the named real tenant `fcdo` (UK Foreign,
  Commonwealth & Development Office, 68 open opportunities).
- D-2: The board is server-rendered HTML (not a SPA), so the HTML itself is the
  documented no-auth surface; per-role detail pages are parsed via `og:`/`<h1>`/
  `<title>` title recovery and `<article>`/`<main>` body extraction (no JSON-LD).
- D-3: The leading numeric `{ID}` segment of the detail URL is the stable per-role
  ATS id; the title slug provides a readable fallback title.
- D-4: The board lists every open role in one document for small boards; larger
  boards page via `?start=` (50 roles/page). The adapter collects deduped anchors,
  slices to `resultsWanted` (bounded by a hard page cap), then fans out the detail
  fetches with `Promise.allSettled`. De-dup is by `atsId` (`{ID}`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-oleeo/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.tal.net`, confirmed with the named real
    tenant `fcdo` (UK FCDO, `https://fcdo.tal.net/`).
  - The server-rendered board HTML at `/candidate/jobboard/vacancy/1/adv/` and the
    per-role detail URL shape `…/opp/{ID}-{slug}/en-GB` (e.g.
    `/opp/26870-Post-Security-Manager-SRB26-006248/en-GB`,
    `/opp/26884-Administrative-Officer-Stanley-Falklands-Islands/en-GB`), with the
    leading numeric `{ID}` segment as the per-role ATS id (verified=true). Title /
    body / labelled-field parsing is written defensively around the documented
    server-rendered detail surface. Other live tenants seen: `fco`,
    `homeofficejobs`, `environmentagencyjobs`, `oleeo-jobs`.
