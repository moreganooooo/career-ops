# Spec: 383 — CleverConnect ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 383                                           |
| Slug           | source-ats-cleverconnect                      |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

CleverConnect (cleverconnect.com, France) is a talent-acquisition vendor whose
candidate-facing product is a hosted, branded "Career Site". Every customer tenant
publishes a branded, public career board on its own sub-domain of the shared
career-site host `https://career.{tenant}.cleverconnect.com/`. The board is an
Angular single-page application, but the server **pre-renders the full open-roles
payload** into the initial HTML document as an Angular **TransferState** JSON island
(a JSON blob whose punctuation is HTML-entity-encoded), so the open-roles set is
directly recoverable without authentication and without driving the SPA's runtime
API. Ever Jobs has no adapter for CleverConnect-powered career sites, so these
vacancies are currently un-ingestable. A single generic, multi-tenant CleverConnect
adapter unlocks the full catalogue of CleverConnect-powered career boards with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-cleverconnect` plugin that ingests
  vacancies from **any** CleverConnect career board given a `companySlug` (the tenant
  sub-domain label, e.g. `demo`) or a `companyUrl` (a career-site URL on a
  `cleverconnect.com` host, from which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  board document (`https://career.{tenant}.cleverconnect.com/jobs`), whose embedded
  Angular TransferState JSON island carries the full array of structured offer
  objects (id, title, HTML description, locality, hiring company, contract-type and
  job-family labels, canonical / short detail paths, external apply redirect).
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'cleverconnect'`, `department`, `employmentType`,
  `applyUrl`).

## 3. Non-Goals

- Any authenticated CleverConnect recruiter / admin API, or the SPA's runtime XHR
  endpoints. This plugin consumes only the public, pre-rendered board document.
- Server-side filtering by category / location / contract (the board supports these
  facets). We ingest the tenant's full open-roles payload and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, CV drop, or any write operation.
- A curated seed list of CleverConnect tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).
- Following each offer's `url.redirect` into the tenant's underlying ATS (Talentsoft,
  etc.) — the redirect is surfaced as `applyUrl` but not crawled.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the CleverConnect plugin at a
> tenant's career-site sub-domain, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the CleverConnect adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant career-site host from `companySlug` (expanded to `career.{tenant}.cleverconnect.com`) or from a `companyUrl` on a `cleverconnect.com` host (tenant label taken from the `career.{tenant}` sub-domain). | must |
| FR-2  | Fetch the public board document (`GET https://career.{tenant}.cleverconnect.com/jobs`) and decode the embedded Angular TransferState JSON island (entity-decoding `&q;` → `"`, `&a;` → `&`, `&l;`/`&g;` → `<`/`>`, `&s;` → `'`). | must |
| FR-3  | Harvest each self-contained offer object from the decoded island via a string-aware, brace-balanced scan anchored on its `/jobads/{id}` marker; parse each independently so one malformed object never sinks the rest. | must |
| FR-4  | Use the offer's numeric `id` (or the trailing numeric id of its detail path) as `atsId`; surface only `PUBLISHED` offers. | must |
| FR-5  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, description, applyUrl). | must |
| FR-7  | Convert the HTML description per `descriptionFormat` (HTML / Markdown / Plain).                       | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the offer set, bounded by a page cap.     | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown tenants (HTTP 4xx / DNS), network errors, and malformed / un-decodable bodies without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                              |
| ------ | --------------------------------------------- | ----------------------------------- |
| NFR-1  | No credentials / secrets required             | public pre-rendered board document  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client        | UA + timeouts + proxy support      |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap  |
| NFR-5  | A single bad tenant never aborts a batch       | scrape never throws                |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CLEVERCONNECT, name: 'CleverConnect', category: 'ats', isAts: true })
class CleverConnectService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://career.{tenant}.cleverconnect.com/jobs
  → server-rendered HTML embedding an Angular TransferState JSON island whose JSON
    punctuation is HTML-entity-encoded (&q;=" &a;=& &l;=< &g;=> &s;='). Decoded, the
    island carries the full open-roles array; each offer object includes:
      { "id": 2389, "title": "Conseiller commercial agence (F/H)",
        "description": "<p>…HTML body…</p>",
        "companyDescription": "<p>…</p>",
        "locality": "Guebwiller (68) - Grand Est",
        "status": "PUBLISHED", "recruiter": "Macif", "publisher": "Macif",
        "company": { "id": 1, "name": "Cleverconnect" },
        "permanent": false, "externalReference": "2026-8944",
        "url": { "jobOffer": "/candidat/offres/offre-d-emploi-…-2389",
                 "jobOfferShort": "/jobads/2389",
                 "redirect": "https://…talent-soft.com/…detailoffre.aspx?refOffre=…" },
        "labels": { "contractTypeList": [{ "value": "CDI" }],
                    "macroJobList": [{ "value": "Commercial / Vente" }],
                    "jobList": [{ "value": "Conseiller commercial (H/F)" }] } }

Canonical public detail / apply URL (short, stable):
  https://career.{tenant}.cleverconnect.com/jobads/{id}
```

Wire shape → `JobPostDto` mapping:

| Source                                                      | JobPostDto field        | Notes                                                     |
| ---------------------------------------------------------- | ----------------------- | --------------------------------------------------------- |
| offer `id` (or trailing numeric id of the detail path)     | `atsId`, `id`           | `id` is prefixed `cleverconnect-{atsId}`                  |
| `title`                                                    | `title`                 | required; role skipped if absent                          |
| `url.jobOfferShort` (`/jobads/{id}`), else `url.jobOffer`  | `jobUrl`                | absolute on the tenant host; canonical public detail URL  |
| `description` (HTML), else `companyDescription`            | `description`           | format-converted (HTML / Markdown / Plain)                |
| `locality` (e.g. "Guebwiller (68) - Grand Est")            | `location`              | split → city / state (region); null when none usable      |
| title / locality / contract / body remote markers          | `isRemote`              | remote detection (`remote` / `télétravail` / `wfh` …)     |
| `labels.macroJobList`, else `labels.jobList`               | `department`            | label values joined                                       |
| `labels.contractTypeList` (e.g. "CDI")                     | `employmentType`        | label values joined                                       |
| `recruiter` / `publisher` / `company.name`, else slug      | `companyName`           | de-slugified + title-cased fallback                       |
| `url.redirect`, else the detail URL                        | `applyUrl`              | external apply URL when present                           |
| —                                                          | `site`                  | constant `Site.CLEVERCONNECT`                             |
| —                                                          | `atsType`               | constant `'cleverconnect'`                                |
| `description` text                                         | `emails`                | harvested via `extractEmails`                             |
| —                                                          | `datePosted`            | `null` (no reliable absolute posted date in the payload)  |

Tenant resolution:

- `companySlug` (e.g. `demo`) → expanded to `https://career.demo.cleverconnect.com`.
- `companySlug` containing a `cleverconnect.com` host / full URL → tenant label parsed
  from the `career.{tenant}` sub-domain.
- `companyUrl` on a `cleverconnect.com` host (e.g.
  `https://career.demo.cleverconnect.com/jobs`) → tenant label parsed from the host
  (the label after a leading `career`/`www`, before the `cleverconnect.com` root).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx / DNS), or no roles |
| logged warn (HTTP 4xx / DNS) | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | un-decodable island / malformed offer object or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/cleverconnect.e2e-spec.ts`): known tenant (`companySlug: 'demo'`)
  returns shaped jobs (`site === Site.CLEVERCONNECT`, `atsType === 'cleverconnect'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-CC-1 — Custom career domains.** Some tenants may front the CleverConnect board
  under their own custom domain (CNAME). **Default (proceeding):** address a tenant by
  its `career.{tenant}.cleverconnect.com` sub-domain (the stable public host); a
  caller may pass a full `companyUrl` on a `cleverconnect.com` host. Custom-domain
  detection is deferred to the source-adoption backlog.
- **Q-CC-2 — Posted date.** The pre-rendered board payload carries publication
  status but no reliable absolute posted date at the listing level. **Default
  (proceeding):** leave `datePosted` null rather than fabricate a date; a future
  iteration may parse a detail page if a stable `datePosted` field is confirmed.
- **Q-CC-3 — Company display name.** The payload carries the hiring company in
  `recruiter` / `publisher` / `company.name` (the `company.name` is sometimes the
  CleverConnect tenant rather than the brand). **Default (proceeding):** prefer
  `recruiter`, then `publisher`, then `company.name`, falling back to a de-slugified
  tenant label.
- **Q-CC-4 — Apply redirect.** Many offers carry a `url.redirect` into the tenant's
  underlying ATS. **Default (proceeding):** surface it as `applyUrl` (it is the real
  apply destination) but keep `jobUrl` on the CleverConnect detail page and do not
  crawl the redirect target.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered board document on
  `career.{tenant}.cleverconnect.com/jobs`, whose embedded Angular TransferState JSON
  island carries the full open-roles array. **Confidence: verified** — the platform,
  the `career.{tenant}.cleverconnect.com` addressing, the `/jobs` board, the
  entity-encoded TransferState island, and the per-offer structured fields were
  confirmed live 2026-06-03 against the named real tenant `demo` (the CleverConnect
  demo career site, 20 PUBLISHED roles at time of research).
- D-2: The board is an Angular SPA, but the pre-rendered TransferState island is a
  stable no-auth surface — preferable to the SPA's runtime XHR endpoints, which 404
  to non-browser clients and are not a documented public API.
- D-3: The stable per-role ATS id is the offer's numeric `id` (mirrored by the
  trailing id of `/jobads/{id}` and `/candidat/offres/…-{id}`). The short
  `/jobads/{id}` path is the canonical public detail / apply URL.
- D-4: The board renders every open role in one document (no server-side pagination of
  the offer set); the adapter decodes deduped offers and slices to `resultsWanted`
  (bounded by a hard page cap). De-dup is by `atsId`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing and a string-aware brace-balanced scan, so minor payload
  drift never throws.

## 11. References

- `packages/plugins/source-ats-cleverconnect/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `career.{tenant}.cleverconnect.com`, confirmed with
    the named real tenant `demo` (CleverConnect demo career site,
    `https://career.demo.cleverconnect.com/jobs`).
  - The pre-rendered Angular TransferState JSON island (entity-encoded) and the
    per-offer structured fields — numeric `id`, `title`, `description` (HTML),
    `locality`, `recruiter`/`publisher`, `url.jobOffer` / `url.jobOfferShort`
    (`/jobads/{id}`), `labels.contractTypeList` / `labels.macroJobList` — with the
    numeric `id` as the per-role ATS id (verified=true).
