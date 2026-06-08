# Spec: 390 — BeeSite ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 390                                           |
| Slug           | source-ats-beesite                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix)                    |

## 1. Problem Statement

BeeSite (beesite.de) is the enterprise recruiting / applicant-management suite by
milch & zucker (milchundzucker.de), widely deployed by large German / DACH employers
(e.g. Fraport, Drägerwerk, Ehrmann, Universitätsmedizin Frankfurt). Each customer runs
a branded, public, unauthenticated candidate-facing career portal — hosted at
`https://{slug}.beesite.de/` or mounted at `/cust/beesite/` on the customer's own
domain — driven by a PHP front controller addressed via an `ac` action parameter
(`?ac=start`, `?ac=search_result`, `?ac=jobad&id={PositionID}`). The portal exposes the
tenant's open roles both as a JobBoardApi JSON board (HR-XML `MatchedObjectDescriptor`
envelope) and as a server-rendered `?ac=search_result` list, so the board is directly
crawlable without authentication and without a headless browser. Ever Jobs has no
adapter for BeeSite-powered portals, so these vacancies are currently un-ingestable. A
single generic, multi-tenant BeeSite adapter unlocks the full catalogue of
BeeSite-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-beesite` plugin that ingests vacancies from
  **any** BeeSite career portal given a `companySlug` (expanded to the hosted
  `{slug}.beesite.de` origin) or a `companyUrl` (any BeeSite portal URL, hosted or on a
  customer custom domain — the origin is honoured as-is).
- Use the **public, anonymous** surface (no auth, no API key): the JobBoardApi JSON
  board (`/search/?data={…}`) when exposed, falling back to the server-rendered
  `?ac=search_result` HTML list of `SearchResultBox` rows linking to
  `?ac=jobad&id={PositionID}` detail pages.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'beesite'`, `department`).

## 3. Non-Goals

- Any authenticated BeeSite back-office / applicant-management API. This plugin consumes
  only the public candidate-facing portal.
- Server-side filtering by `Berufsfeld` / location / work type (the board supports these
  facets). We ingest the tenant's full open-role set and slice client-side to
  `resultsWanted`.
- Per-role detail-page follow-up GETs from the HTML fallback (the JSON board already
  carries the body; the HTML list path yields metadata-only roles).
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of BeeSite tenant slugs / portal URLs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the BeeSite plugin at a tenant's
> career portal, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the BeeSite adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the portal origin from `companySlug` (bare slug → `{slug}.beesite.de`; a URL passed as the slug honoured as-is) or from a `companyUrl` (hosted or custom-domain BeeSite portal). | must |
| FR-2  | Fetch the JobBoardApi JSON board (`/search/?data={…}`, `rest/api/search/` fallback) across languages (`EN`, `DE`), paging via `FirstItem` / `CountItem`, until the role set is exhausted or `resultsWanted` is reached. | must |
| FR-3  | When the JSON board is not exposed, fall back to the server-rendered `?ac=search_result` list, anchoring on each `?ac=jobad&id={PositionID}` link + surrounding `SearchResultBox` row text. | must |
| FR-4  | Use each role's BeeSite `PositionID` (else `MatchedObjectId`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl) building the canonical detail URL `?ac=jobad&id={PositionID}` and apply URL `?ac=application&id={PositionID}` (the API's `PositionURI` is preferred for the detail URL when present). | must |
| FR-6  | Convert the HTML job-ad body (from `PositionFormattedDescription.Content`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by bounding the page walk / slicing the role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public JSON board / HTML list    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Per-request timeout capped at 15 s            | bound BOTH `timeout` + `requestTimeout` |
| NFR-5  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-6  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-7  | No headless browser                           | parse JSON board / server HTML only |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BEESITE, name: 'BeeSite', category: 'ats', isAts: true })
class BeeSiteService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
Portal front controller (PHP, ac-action):
  https://{host}/cust/beesite/?ac=start            (portal home)
  https://{host}/index.php?ac=search_result        (open-roles search list)
  https://{host}/index.php?ac=jobad&id={PositionID} (canonical per-role detail)
  https://{host}/index.php?ac=application&id={PositionID} (apply entry point)

JobBoardApi (JSON, preferred):
  GET https://{host}/search/?data={ "LanguageCode":"EN",
        "SearchParameters": { "FirstItem":1, "CountItem":100,
          "Sort":[{ "Criterion":"PublicationStartDate","Direction":"DESC" }] },
        "SearchCriteria":[] }
    → { "SearchResult": { "SearchResultCount": N, "SearchResultItems": [
          { "MatchedObjectId":"…", "MatchedObjectDescriptor": {
            "PositionID":"…", "PositionTitle":"…", "PositionURI":"…",
            "PositionLocation":[{ "CityName":"…","CountryName":"…" }],
            "OrganizationName":"…", "PublicationStartDate":"…",
            "PositionFormattedDescription": { "Content":"<html>" } } }, … ] } }

Server-rendered list (HTML, fallback):
  GET https://{host}/index.php?ac=search_result
    → each open role in a `SearchResultBox` row linking to `?ac=jobad&id={PositionID}`.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `PositionID` (else `MatchedObjectId`)               | `atsId`, `id`           | `id` is prefixed `beesite-{atsId}`; role skipped if absent  |
| `PositionTitle`                                      | `title`                 | required; role skipped if absent                            |
| `PositionURI` (else `?ac=jobad&id={PositionID}`)     | `jobUrl`                | canonical public detail URL                                 |
| `?ac=application&id={PositionID}`                    | `applyUrl`              | canonical public apply URL                                  |
| `PositionFormattedDescription.Content` (HTML)       | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `PublicationStartDate`                              | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `PositionLocation[]` (CityName / CountryName)        | `location`              | structured city / state / country; null when none           |
| title / location / department                       | `isRemote`              | remote detection (`remote` / `home office` / `mobiles Arbeiten` …) |
| `DepartmentName`                                    | `department`            | when present                                                |
| `PositionOfferingType` / `PositionSchedule`         | `employmentType`        | first named label                                           |
| `OrganizationName` (else de-slugified tenant label) | `companyName`           | API brand name preferred                                    |
| —                                                   | `site`                  | constant `Site.BEESITE`                                     |
| —                                                   | `atsType`               | constant `'beesite'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (bare, e.g. `frontend-demo`) → expanded to `https://frontend-demo.beesite.de`.
- `companySlug` containing a host / full URL → origin honoured as-is.
- `companyUrl` (hosted `*.beesite.de` OR a customer custom domain) → origin honoured as-is.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable origin, unknown tenant (HTTP 4xx), or no roles   |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant or endpoint — degrades to empty, never throws    |
| logged warn (parse failure)  | non-JSON body (fall through to HTML) or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/beesite.e2e-spec.ts`): known tenant (`companySlug: 'frontend-demo'`)
  returns shaped jobs (`site === Site.BEESITE`, `atsType === 'beesite'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised against a live
  custom-domain portal (`erecruitment.draeger.com`); no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BS-1 — JobBoardApi endpoint path.** BeeSite releases mount the JSON board under
  `/search/` or a `/rest/api/` prefix. **Default (proceeding):** probe `search/` then
  `rest/api/search/`; the first that returns a `SearchResult` envelope wins, else fall
  back to the server-rendered `?ac=search_result` HTML.
- **Q-BS-2 — Tenant addressing.** BeeSite portals live on hosted `*.beesite.de` hosts
  AND on customer custom domains (`/cust/beesite/` mount). **Default (proceeding):**
  honour a `companyUrl`/host origin verbatim; expand a bare slug to `{slug}.beesite.de`.
- **Q-BS-3 — Stable per-role id.** Each role carries `PositionID` and `MatchedObjectId`.
  **Default (proceeding):** prefer `PositionID` (the `?ac=jobad&id=` URL id), falling
  back to `MatchedObjectId`.
- **Q-BS-4 — Company display name.** The HTML list row carries no brand name; the JSON
  board carries `OrganizationName`. **Default (proceeding):** prefer the API
  `OrganizationName`, else de-slugify + title-case the tenant host label.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JobBoardApi JSON board on the tenant
  portal, returning the HR-XML `MatchedObjectDescriptor` envelope; the server-rendered
  `?ac=search_result` `SearchResultBox` list is the fallback when the JSON board is not
  exposed. **Confidence: researched, verified=false** — the platform, the `?ac=…` portal
  addressing, the `?ac=jobad&id={PositionID}` detail-URL shape, and the `?ac=search_result`
  list action were confirmed live 2026-06-03 (demo `frontend-demo.beesite.de`, live
  tenant `erecruitment.draeger.com`), but a populated JSON listing payload could not be
  fetched during research (the hosted `*.beesite.de` demos refused the research fetcher's
  connection, and the live Dräger portal had zero active postings at fetch time), so the
  parser is written defensively against both surfaces.
- D-2: The board is a server-rendered PHP portal / JSON API (not a SPA needing a headless
  browser, and not an authenticated API needing a key); the adapter parses the JSON
  envelope first and the server HTML second.
- D-3: The richest per-role fields are `PositionTitle`, the
  `PositionFormattedDescription.Content` HTML body, `DepartmentName`, `PositionLocation`,
  and `PublicationStartDate`. The `PositionID` is the stable per-role ATS id and the
  `?ac=jobad&id=` URL segment.
- D-4: The JSON board pages via `FirstItem` / `CountItem`; the adapter pages until the
  set is exhausted, dedupes by `atsId`, and slices to `resultsWanted` (bounded by a
  probe-page cap). The HTML fallback embeds every role in one document.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-beesite/` — implementation.
- Surface researched 2026-06-03 (no authentication; verified=false):
  - Platform + portal addressing (`?ac=start`, hosted `{slug}.beesite.de` /
    `/cust/beesite/` custom-domain mount), confirmed via milch & zucker product pages and
    live portals: demo `frontend-demo.beesite.de`, live tenant
    `erecruitment.draeger.com/cust/beesite/?ac=start` (Drägerwerk AG).
  - Canonical detail URL `?ac=jobad&id={PositionID}` (demo
    `frontend-demo.beesite.de/index.php?ac=jobad&id=89`) and the search list action
    `?ac=search_result` (live on the Dräger portal, which surfaced the
    `{"Criterion":"PublicationStartDate","Direction":"DESC"}` sort criterion).
  - JobBoardApi JSON envelope (`SearchResult` / `SearchResultItems` /
    `MatchedObjectDescriptor` with `PositionID` / `PositionTitle` / `PositionURI` /
    `PositionLocation` / `PublicationStartDate`) is the documented BeeSite shape; a
    populated live payload was not fetchable during research (verified=false).
