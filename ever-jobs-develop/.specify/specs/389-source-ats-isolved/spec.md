# Spec: 389 — isolved Hire ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 389                                           |
| Slug           | source-ats-isolved                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix), 388 (Elmo)        |

## 1. Problem Statement

isolved Hire (isolvedhire.com — the candidate-facing job-board product of the isolved
People Cloud HCM suite) is a US SMB ATS whose candidate-facing product is a hosted,
branded career board. Every customer tenant publishes a public career board on its own
sub-domain of the shared host `https://{tenant}.isolvedhire.com/`. The human-facing
board (`/jobs/`) is a Vue single-page-app shell, but each tenant board ALSO exposes a
clean, machine-readable public **job sitemap** (`/job_site_map.xml`) that enumerates
every open role as a `/jobs/{jobId}.html` detail URL, and each detail page embeds a
complete Google-for-Jobs JSON-LD `JobPosting`. So the board is directly crawlable
without authentication and without a headless browser. Ever Jobs has no adapter for
isolved-Hire-powered career boards, so these vacancies are currently un-ingestable. A
single generic, multi-tenant adapter unlocks the full catalogue of isolved Hire boards
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-isolved` plugin that ingests vacancies from
  **any** isolved Hire career board given a `companySlug` (the tenant sub-domain label,
  e.g. `americavotes`) or a `companyUrl` (a board URL on an `isolvedhire.com` host, from
  which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the per-tenant job
  sitemap (`https://{tenant}.isolvedhire.com/job_site_map.xml`) for the open-role index,
  and each role's detail page (`/jobs/{jobId}.html`) for the embedded JSON-LD
  `JobPosting` (title, HTML body, datePosted, employmentType, hiringOrganization,
  jobLocation, identifier).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'isolved'`).

## 3. Non-Goals

- Any authenticated isolved People Cloud API. This plugin consumes only the public
  candidate-facing career board.
- Driving the Vue `/jobs/` SPA via a headless browser (the sitemap + JSON-LD give the
  same data server-side).
- Server-side filtering by category / unit / location (the board supports these facets).
  We ingest the tenant's full open board and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of isolved Hire tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the isolved Hire plugin at a tenant's
> career sub-domain, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the isolved Hire adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.isolvedhire.com`) or from a `companyUrl` on an `isolvedhire.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public per-tenant job sitemap (`/job_site_map.xml`) and extract every open-role detail URL (`/jobs/{jobId}.html`); de-duplicate by `jobId`. | must |
| FR-3  | Fan out (bounded, `Promise.allSettled`) to each role detail page and extract its embedded JSON-LD `JobPosting`, narrowing defensively (bare object, array, or `@graph`). | must |
| FR-4  | Use each role's numeric `jobId` (then the posting `identifier.sameAs`) as the stable `atsId`. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl); the detail page `/jobs/{jobId}.html` is the canonical detail / apply URL. | must |
| FR-6  | Convert the HTML job-ad body (`JobPosting.description`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the open-role set, bounded by a detail-fetch cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown / parked tenants (302 off the board, HTTP 4xx), network errors, empty sitemaps, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public sitemap + JSON-LD detail  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Per-request timeout capped at 15s             | bound BOTH `timeout` + `requestTimeout` |
| NFR-5  | Bound result-set size                         | slice at `resultsWanted`; detail-fetch cap |
| NFR-6  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-7  | No headless browser                           | parse sitemap XML + JSON-LD only |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ISOLVED, name: 'isolved Hire', category: 'ats', isAts: true })
class IsolvedService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.isolvedhire.com/job_site_map.xml
  → <urlset><url>
       <loc>https://{tenant}.isolvedhire.com/jobs/{jobId}.html</loc>
       <lastmod>2026-05-27</lastmod>
     </url> … </urlset>

GET https://{tenant}.isolvedhire.com/jobs/{jobId}.html
  → <script type="application/ld+json">
       { "@type":"JobPosting", "title":"…", "url":"…/jobs/{jobId}.html",
         "description":"<p>…HTML body…</p>", "datePosted":"2026-05-06 00:00:00",
         "employmentType":"FULL_TIME",
         "hiringOrganization":{ "name":"…" },
         "jobLocation":{ "address":{ "addressLocality":"Miami",
           "addressRegion":"FL", "addressCountry":"US" } },
         "identifier":{ "sameAs":"{jobId}" } }
     </script>

Canonical per-role detail / apply URL:  https://{tenant}.isolvedhire.com/jobs/{jobId}.html
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| sitemap `jobId` (else `identifier.sameAs`)          | `atsId`, `id`           | `id` is prefixed `isolved-{atsId}`; role skipped if absent  |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `/jobs/{jobId}.html` (posting `url`, else ref url)  | `jobUrl`, `applyUrl`    | the detail page is the canonical detail + apply URL         |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else sitemap `lastmod`)               | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobLocation.address.{addressLocality,Region,Country}` | `location`           | city / state / country; null when none                      |
| title / location / employmentType                   | `isRemote`              | remote detection (`remote` / `virtual` / `wfh` …)           |
| `employmentType` (`FULL_TIME` …)                    | `employmentType`        | normalised to readable title-case                           |
| `hiringOrganization.name` (else slug)               | `companyName`           | de-slugified, title-cased tenant slug fallback              |
| —                                                   | `department`            | constant `null` (isolved Hire JSON-LD carries no department)|
| —                                                   | `site`                  | constant `Site.ISOLVED`                                     |
| —                                                   | `atsType`               | constant `'isolved'`                                        |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `americavotes`) → expanded to `https://americavotes.isolvedhire.com`.
- `companySlug` containing a bare host / `isolvedhire.com` → tenant taken from the host.
- `companyUrl` on an `isolvedhire.com` host → leading sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown/parked tenant (302/4xx), or no roles |
| logged warn (HTTP 3xx/4xx)   | unknown / parked tenant — degrades to empty, never throws                 |
| logged warn (parse failure)  | sitemap / JSON-LD unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/isolved.e2e-spec.ts`): known tenant (`companySlug: 'americavotes'`)
  returns shaped jobs (`site === Site.ISOLVED`, `atsType === 'isolved'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`). 30000 ms
  timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-IS-1 — Listing surface.** The `/jobs/` board is a Vue SPA. **Default (proceeding):**
  consume the public `/job_site_map.xml` (advertised in robots.txt via
  `feeds.isolvedhire.com`) as the open-role index, then fan out to detail pages — no
  headless browser.
- **Q-IS-2 — Stable per-role id.** **Default (proceeding):** the numeric `jobId` from the
  `/jobs/{jobId}.html` URL (also surfaced as `identifier.sameAs`).
- **Q-IS-3 — Department.** The JSON-LD `JobPosting` carries no department/unit field (the
  board exposes "unit" only as a facet query). **Default (proceeding):** emit
  `department: null`.
- **Q-IS-4 — Custom careers domains.** Some tenants may front the board under a custom
  domain. **Default (proceeding):** address a tenant by its `isolvedhire.com` sub-domain
  (the stable public host); custom-domain detection is deferred to the source-adoption
  backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant job sitemap
  (`/job_site_map.xml`) for the open-role index plus each role's `/jobs/{jobId}.html`
  detail page for the embedded JSON-LD `JobPosting`. **Confidence: verified** — the
  platform, the `{tenant}.isolvedhire.com` addressing, the sitemap shape, the
  `/jobs/{jobId}.html` URL form, and the JSON-LD `JobPosting` fields were confirmed live
  2026-06-03 against the named real tenant `americavotes` (America Votes): a live role
  `…/jobs/1765310.html` ("Florida State Director", Miami, FL, `FULL_TIME`) was parsed.
- D-2: The board's `/jobs/` page is a Vue SPA; rather than a headless browser, the adapter
  reads the server-side sitemap (XML) + the server-embedded JSON-LD (standard
  Google-for-Jobs schema), both of which are stable, machine-readable public surfaces.
- D-3: The richest per-role fields are `title`, the `description` HTML body, `datePosted`,
  `employmentType`, `hiringOrganization.name`, and `jobLocation.address`. The numeric
  `jobId` is the stable per-role ATS id and builds the canonical detail / apply URL.
- D-4: The sitemap enumerates every open role in one document; the adapter dedupes by
  `jobId`, slices to `resultsWanted`, and fans out the bounded detail fetches with
  `Promise.allSettled` (never `Promise.all`) so one bad role never nukes the batch.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-isolved/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.isolvedhire.com`, confirmed with the named
    real tenant `americavotes` (America Votes) and others (`isolved` — 67 open roles,
    `lyrasis`, `pantheondata`, `uasystem`).
  - The per-tenant `/job_site_map.xml` enumerates open roles as `/jobs/{jobId}.html`;
    robots.txt advertises the sitemap host `feeds.isolvedhire.com`. Each detail page
    embeds a JSON-LD `JobPosting`; a live role (`…/jobs/1765310.html`) parsed with title,
    HTML body, `datePosted`, `employmentType: FULL_TIME`, `hiringOrganization.name`, and
    `jobLocation.address` (Miami / FL / US). Confidence: **verified=true**.
