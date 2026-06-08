# Spec: 412 — Radancy (TalentBrew) ATS Source Plugin

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| Spec ID        | 412                                                |
| Slug           | source-ats-radancy                                 |
| Status         | done                                               |
| Owner          | scheduled-agent                                    |
| Created        | 2026-06-04                                         |
| Last updated   | 2026-06-04                                         |
| Supersedes     | (none)                                             |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)            |

## 1. Problem Statement

Radancy (radancy.com — the enterprise Talent Acquisition Cloud, formerly TMP Worldwide; its
branded career sites are marketed as **TalentBrew**) powers public, candidate-facing career
sites for large enterprise employers. Unlike the slug-on-a-shared-host SMB ATS platforms,
Radancy is **hostname-multi-tenant**: each customer's career site lives on its own host — a
vanity host (`careers.{brand}.com`), a Radancy-managed host (`{brand}.jobs`), or the Radancy
demo board (`jobs.radancy.com`). All run the same TalentBrew front-end and expose the same
**public, anonymous job-results endpoint** on their own host —
`GET /{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage={k}&FacetType=0` —
which returns a small JSON envelope `{ filters, results, hasJobs, hasContent }`. The
`results` value is the exact server-rendered HTML fragment (a `<ul>` of job tiles) the career
site's own search page consumes, so the board is directly crawlable without authentication
and without a headless browser. Ever Jobs has no adapter for Radancy/TalentBrew career sites,
so these (enterprise, high-volume) vacancy catalogues are currently un-ingestable. A single
generic, multi-tenant Radancy adapter unlocks any TalentBrew-powered career board with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-radancy` plugin that ingests roles from **any**
  Radancy/TalentBrew career site given a `companyUrl` (the career-site host) or a
  `companySlug` (a host, or a bare label expanded best-effort to `{label}.radancy.com`).
- Use the **public, anonymous** surface (no auth, no API key): the tenant host's results feed
  `GET https://{host}/{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage={k}&FacetType=0`,
  returning `{ filters, results, hasJobs, hasContent }`; parse the per-role anchor (title +
  canonical detail href + `data-job-id`), the adjacent `job-location` span, and the
  save-button `data-org-id` out of the `results` HTML.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'radancy'`).

## 3. Non-Goals

- The per-role detail page (description body, department, employment type, posted date). The
  list fragment carries only title / location / detail URL / org id / job id; richer fields
  live on the detail page and are intentionally NOT fetched here (one request per board page,
  no N+1 detail fan-out).
- Any authenticated Radancy API, the Radancy XML job-feed ingest channel, or an ATS-specific
  back-end API.
- Server-side facet filtering by category / location / type (the feed supports facets via
  `ActiveFacetID` / `FacetType`). We ingest the tenant's full role set and slice client-side
  to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Radancy/TalentBrew tenant hosts (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Radancy plugin at a TalentBrew career
> site host, so that I ingest that employer's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Radancy adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant host from `companyUrl` (its hostname) or from `companySlug` (a host as-is, or a bare dot-less label expanded to `{label}.radancy.com`). | must |
| FR-2  | Fetch the public results feed `GET /{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage={k}&FacetType=0` on the tenant host as JSON. | must |
| FR-3  | Read the `results` HTML fragment from the `{ filters, results, hasJobs, hasContent }` envelope; parse per-role tiles; drain pages via `CurrentPage`, stopping on an empty / short page or `hasJobs === false`, bounded by a page cap. | must |
| FR-4  | Use each role's `data-job-id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, remote, applyUrl), using the anchor href resolved against the tenant host as the canonical detail / apply URL. | must |
| FR-6  | Format the (absent) description per `descriptionFormat` for shape parity (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown hosts (HTTP 4xx / DNS), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                              |
| ------ | --------------------------------------------- | ----------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous results feed       |
| NFR-2  | A fetch failure or unknown host must not throw | graceful empty/partial result      |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support       |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap   |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws                 |
| NFR-6  | No headless browser                           | parse the public results fragment   |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.RADANCY, name: 'Radancy', category: 'ats', isAts: true })
class RadancyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{host}/en/search-jobs/results?ActiveFacetID=0&CurrentPage=1&RecordsPerPage=50&FacetType=0
  → JSON envelope (no bearer token):
      { "filters":  "<html sidebar…>",
        "results":  "<ul> … job tiles … </ul>",
        "hasJobs":  true,
        "hasContent": true }

  where each `results` tile is:
      <li class="… links-with-hover-lines__item">
        <h2><a class="links-with-hover-lines__link"
               href="/en/job/atlanta/customer-success-manager/47123/95942349392"
               data-job-id="95942349392">Customer Success Manager</a></h2>
        <span class="job-location">Atlanta, Georgia</span>
        <button class="js-save-job-btn" data-job-id="95942349392" data-org-id="47123">…</button>
      </li>

Canonical per-role detail / apply URL:  the anchor href, resolved against the tenant host
  (shape: https://{host}/{lang}/job/{location}/{slug}/{orgId}/{jobId})
```

Wire shape → `JobPostDto` mapping:

| Source                                       | JobPostDto field        | Notes                                                       |
| -------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| anchor `data-job-id`                         | `atsId`, `id`           | `id` is prefixed `radancy-{atsId}`; role skipped if absent  |
| anchor inner text                            | `title`                 | required; role skipped if absent                            |
| anchor `href` (resolved to absolute)         | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `<span class="job-location">` text           | `location`              | single line split on commas → city / state / country        |
| title / location regex                       | `isRemote`              | text regex (`remote`/`home office`/`wfh`/`virtual`…)        |
| de-slugified host label                      | `companyName`           | the fragment carries no brand name                          |
| —                                            | `description`           | null (body lives on the unfetched detail page)              |
| —                                            | `datePosted`            | null (not present in the list fragment)                     |
| —                                            | `department`            | null (not present in the list fragment)                     |
| —                                            | `employmentType`        | null (not present in the list fragment)                     |
| —                                            | `site`                  | constant `Site.RADANCY`                                     |
| —                                            | `atsType`               | constant `'radancy'`                                        |

Tenant resolution:

- `companyUrl` → hostname used directly as the tenant host.
- `companySlug` that is a URL or contains a dot → reduced to its hostname.
- `companySlug` that is a bare dot-less label → expanded best-effort to `{label}.radancy.com`
  (Radancy has no single shared host suffix; callers with a real host should pass it).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown host (HTTP 4xx / DNS), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled host — degrades to empty, never throws                 |
| logged warn (parse failure)  | feed body unparseable, or per-tile parse error — partial, never throws    |

## 8. Test Plan

- E2E (`__tests__/radancy.e2e-spec.ts`): known tenant (`companySlug: 'jobs.radancy.com'`)
  returns shaped jobs (`site === Site.RADANCY`, `atsType === 'radancy'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown host
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RAD-1 — Tenant addressing.** Radancy is hostname-multi-tenant with no single shared
  host suffix (vanity / `.jobs` / managed hosts). **Default (proceeding):** treat `companyUrl`
  / a dotted `companySlug` as the exact host; expand a bare dot-less label to
  `{label}.radancy.com` as a best-effort fallback only.
- **Q-RAD-2 — HTML fragment vs JSON.** The `results` field is server-rendered HTML, not
  per-field JSON. **Default (proceeding):** defensively regex-parse the per-role anchor +
  location + org id out of the fragment; tolerate template-class drift.
- **Q-RAD-3 — Richer per-role fields.** Description / department / employment type / posted
  date live on the detail page, not the list fragment. **Default (proceeding):** ingest only
  the list-level fields (title / location / URL / ids); leave the richer fields null rather
  than firing an N+1 detail fetch per role.
- **Q-RAD-4 — Pagination.** The feed paginates via `CurrentPage` / `RecordsPerPage`. **Default
  (proceeding):** request `RecordsPerPage=50` and drain pages until an empty / short page or
  `hasJobs === false`, bounded by a page cap, stopping early once `resultsWanted` collected.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant TalentBrew results feed
  `GET https://{host}/{lang}/search-jobs/results?...`, returning
  `{ filters, results, hasJobs, hasContent }`. **Confidence: verified** — the platform, the
  hostname-multi-tenant model, the endpoint, the envelope, and the per-tile HTML shape were
  confirmed live 2026-06-03 against Radancy's own board `jobs.radancy.com` (org id `47123`;
  real job tile `href="/en/job/atlanta/customer-success-manager/47123/95942349392"`
  `data-job-id="95942349392"`, `<span class="job-location">Atlanta, Georgia</span>`,
  `data-org-id="47123"`), and the envelope shape re-confirmed on a second tenant host
  (`careers.aldi.us`). The sitemap confirmed the canonical detail URL shape
  `/{lang}/job/{location}/{slug}/{orgId}/{jobId}`.
- D-2: The feed is consumed as a JSON endpoint whose `results` field is server-rendered HTML;
  the adapter GETs JSON and regex-parses the per-role anchor + location + org id out of the
  fragment (no headless browser, no authenticated API).
- D-3: The `data-job-id` is the stable per-role ATS id; the anchor href (resolved absolute) is
  the canonical detail / apply URL. Description / department / employment type / posted date
  are not in the list fragment and are left null (no N+1 detail fetch).
- D-4: The feed paginates; the adapter requests `RecordsPerPage=50`, drains pages via
  `CurrentPage` (bounded by a page cap), dedupes by `atsId`, and stops once `resultsWanted`
  roles are collected or a page is empty / short / `hasJobs === false`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive narrowing so
  template / shape drift never throws.

## 11. References

- `packages/plugins/source-ats-radancy/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + hostname-multi-tenant model, confirmed against `jobs.radancy.com` (Radancy's
    own board, org id `47123`) and `careers.aldi.us`.
  - The public results feed `GET /{lang}/search-jobs/results?ActiveFacetID=0&CurrentPage={n}&RecordsPerPage={k}&FacetType=0`
    returned `{ filters, results, hasJobs, hasContent }`; the `results` HTML carried real job
    tiles with `data-job-id` anchors, `job-location` spans, and `data-org-id` save buttons.
    The sitemap confirmed the detail URL shape `/{lang}/job/{location}/{slug}/{orgId}/{jobId}`.
    No bearer token. verified=true (envelope + endpoint + URL shape); per-tile HTML class
    names may drift across TalentBrew template versions, so the parser is defensive.
