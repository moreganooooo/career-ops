# Spec: 386 — Welcome to the Jungle (WTTJ) ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 386                                           |
| Slug           | source-ats-wttj                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix)                    |

## 1. Problem Statement

Welcome to the Jungle (welcometothejungle.com, France / EU) is a recruitment and
employer-branding marketplace whose candidate-facing product is a branded, public company
jobs page. Every company ("organization") publishes its open roles on the shared host
`https://www.welcometothejungle.com/{lang}/companies/{slug}/jobs`. That page is powered by
a **public, anonymous Algolia search index** whose search-only credentials are embedded in
the WTTJ front-end JavaScript, so a company's roles are directly queryable without
authentication and without a headless browser. Ever Jobs has no adapter for WTTJ-powered
company boards, so these roles are currently un-ingestable. A single generic, multi-tenant
WTTJ adapter unlocks the full catalogue of WTTJ company boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-wttj` plugin that ingests roles from **any**
  WTTJ company board given a `companySlug` (the company slug, e.g. `groupe-partnaire`) or a
  `companyUrl` (a WTTJ company-jobs URL, from which the `/companies/{slug}` segment is
  derived).
- Use the **public, anonymous** surface (no auth, no API key of our own): the WTTJ public
  Algolia job index (`wttj_jobs_production_en` / `_fr`, app `CSEKHVMS53`, embedded
  search-only key), queried with a `facetFilters` of `["organization.slug:{slug}"]`; each
  Algolia hit carries the role's title, body fragments, offices, contract type, dates, the
  stable `reference` guid, and the embedded `organization` object.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'wttj'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated WTTJ "Solutions" / employer-branding API (those require a partner
  token). This plugin consumes only the public candidate-facing Algolia index.
- Server-side filtering by sector / contract type / remote (the index supports these
  facets). We ingest the company's full role set (paginated) and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of WTTJ company slugs (handled by the source-adoption backlog, not
  this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the WTTJ plugin at a company's slug, so
> that I ingest that company's full open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the WTTJ adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the company slug from `companySlug` or from a `companyUrl` on a `welcometothejungle.com` host (the path segment after `/companies/` is the slug). | must |
| FR-2  | Query the public Algolia job index (localised `_en` / `_fr` variants tried in order) with `facetFilters: [["organization.slug:{slug}"]]`, walking pages until `resultsWanted` is satisfied or pages are exhausted. | must |
| FR-3  | Use each hit's `reference` guid (then `objectID`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-4  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl) building the canonical detail URL `/{lang}/companies/{org.slug}/jobs/{job.slug}` and apply URL (`…/apply`). | must |
| FR-5  | Assemble the job-ad body from the available section fragments (`key_missions` + `profile`, else `summary`) and convert per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-6  | Honour `resultsWanted` (default 100 internally) by slicing the role set, bounded by a page cap. | must |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-8  | Tolerate unknown companies (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |
| FR-9  | Cap the per-request HTTP timeout at 15s (bounding both `timeout` and `requestTimeout`) so an unresponsive DSN degrades fast. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets of ours required     | public embedded Algolia search key |
| NFR-2  | A fetch failure or unknown company must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + capped timeouts + proxy support |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad company never aborts a batch     | scrape never throws              |
| NFR-6  | No headless browser                           | query the JSON Algolia index only |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.WTTJ, name: 'Welcome to the Jungle', category: 'ats', isAts: true })
class WelcomeToTheJungleService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
POST https://csekhvms53-dsn.algolia.net/1/indexes/wttj_jobs_production_en/query
  headers: x-algolia-application-id: CSEKHVMS53
           x-algolia-api-key: <public search-only key embedded in WTTJ front-end>
           Referer: https://www.welcometothejungle.com/   (DSN allow-lists this origin)
  body:    { "query": "", "hitsPerPage": 100, "page": 0,
             "facetFilters": [["organization.slug:groupe-partnaire"]] }
  → { "hits": [ {
        "objectID": "<guid>", "reference": "<guid>", "name": "RESPONSABLE D'AGENCE (H/F)",
        "slug": "responsable-d-agence-h-f_auxerre_GP_by35z9l", "contract_type": "full_time",
        "remote": "no", "published_at": "2026-06-03T19:01:03Z", "language": "fr",
        "offices": [ { "city": "Auxerre", "state": "Bourgogne-Franche-Comte",
                       "country": "France", "country_code": "FR" } ],
        "new_profession": { "category_name": "Business & Finance",
                            "sub_category_name": "Executive", "pivot_name": "Sector Manager" },
        "summary": "…", "key_missions": "…", "profile": "…",
        "organization": { "slug": "groupe-partnaire", "name": "Groupe Partnaire",
                          "reference": "o2Zbo5O" } }, … ],
      "nbHits": 48, "nbPages": 16, "page": 0, "hitsPerPage": 3 }

Canonical per-role detail URL:  https://www.welcometothejungle.com/{lang}/companies/{org.slug}/jobs/{job.slug}
Canonical per-role apply URL:   https://www.welcometothejungle.com/{lang}/companies/{org.slug}/jobs/{job.slug}/apply
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `reference` (else `objectID`)                       | `atsId`, `id`           | `id` is prefixed `wttj-{atsId}`; role skipped if absent     |
| `name`                                              | `title`                 | required; role skipped if absent                            |
| `/{lang}/companies/{org.slug}/jobs/{job.slug}`      | `jobUrl`                | canonical public detail URL                                 |
| `…/jobs/{job.slug}/apply`                           | `applyUrl`              | canonical public apply URL                                  |
| `key_missions` + `profile` (else `summary`)         | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `published_at` (else `published_at_date`)           | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| first usable `offices[]` entry                      | `location`              | city / state / country; null when none                      |
| `remote` token / title / location / profession      | `isRemote`              | remote detection                                            |
| `new_profession` (sub-category → category → pivot)  | `department`            | when present                                                |
| `contract_type` (e.g. `full_time` → `Full Time`)    | `employmentType`        | normalised, title-cased                                     |
| `organization.name` (else de-slugified slug)        | `companyName`           | the real brand name when present                            |
| —                                                   | `site`                  | constant `Site.WTTJ`                                        |
| —                                                   | `atsType`               | constant `'wttj'`                                           |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Company resolution:

- `companySlug` (e.g. `groupe-partnaire`) → used directly as the facet-filter key.
- `companySlug` containing a bare WTTJ URL → slug taken from the `/companies/{slug}` segment.
- `companyUrl` on a `welcometothejungle.com` host → the `/companies/{slug}` segment is the slug.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable slug, unknown company (HTTP 4xx / 0 hits), or no roles |
| logged warn (HTTP 4xx/5xx)   | reachable host with no roles on that index — degrades to empty, never throws |
| logged warn (transport fail) | DNS / refused / reset / timeout — degrades to empty/partial, never throws  |

## 8. Test Plan

- E2E (`__tests__/wttj.e2e-spec.ts`): known company (`companySlug: 'groupe-partnaire'`)
  returns shaped jobs (`site === Site.WTTJ`, `atsType === 'wttj'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  company degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-WT-1 — Localised index.** WTTJ maintains parallel `_en` / `_fr` job indexes.
  **Default (proceeding):** query `wttj_jobs_production_en` first, then `_fr`, taking the
  first index that returns hits for the company.
- **Q-WT-2 — Stable per-role id.** Each hit carries `reference` and the identical
  `objectID`. **Default (proceeding):** prefer `reference`, falling back to `objectID`.
- **Q-WT-3 — UI language segment.** The canonical detail URL embeds a `{lang}` segment.
  **Default (proceeding):** use the hit's own `language`, falling back to `en`.
- **Q-WT-4 — Company display name.** The hit embeds `organization.name`.
  **Default (proceeding):** use `organization.name`, falling back to the de-slugified slug.

## 10. Decisions

- D-1: Primary surface is the public, anonymous WTTJ Algolia job index, queried with the
  search-only credentials embedded in the WTTJ front-end and a `facetFilters` of
  `["organization.slug:{slug}"]`. **Confidence: verified** — the platform, the
  `/companies/{slug}/jobs` addressing, the index (`wttj_jobs_production_en`, app
  `CSEKHVMS53`), the Referer allow-list, and the per-role wire shape were confirmed live
  2026-06-03 against the named real company `groupe-partnaire` (Groupe Partnaire): 48 live
  roles (`nbHits: 48`), each with a `reference` guid + `slug` mapping to the canonical
  detail URL `/companies/{org.slug}/jobs/{job.slug}`.
- D-2: The board is a JSON Algolia index (not a SPA needing a headless browser, and not an
  authenticated API needing a partner token); the adapter queries the index directly and
  maps the hits.
- D-3: The richest per-role fields are `name`, the `key_missions` / `profile` / `summary`
  body fragments, `offices[]`, `contract_type`, `new_profession`, and `published_at`. The
  `reference` guid is the stable per-role ATS id.
- D-4: The index pages results; the adapter walks pages (bounded by the company's reported
  `nbPages` and a hard page cap), dedupes by `atsId`, and slices to `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-wttj/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + company host pattern `welcometothejungle.com/{lang}/companies/{slug}/jobs`,
    confirmed with the named real company `groupe-partnaire` (Groupe Partnaire).
  - The public Algolia index `wttj_jobs_production_en` (app `CSEKHVMS53`, embedded
    search-only key, Referer `https://www.welcometothejungle.com/`) answered the documented
    query with `nbHits: 48` for `facetFilters: [["organization.slug:groupe-partnaire"]]`,
    each hit carrying a `reference` guid + `slug` mapping to the canonical detail URL
    `/companies/{org.slug}/jobs/{job.slug}` (verified=true).
