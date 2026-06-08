# Spec: 388 — ELMO ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 388                                           |
| Slug           | source-ats-elmo                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 380 (Carerix)                    |

## 1. Problem Statement

ELMO (elmosoftware.com.au — formerly elmotalent.com.au, Australia / NZ / APAC) is an
Australian HR + recruitment / talent-management suite whose candidate-facing product is a
hosted, branded career board. Every customer tenant publishes a branded, public career
board on its own sub-domain of the shared hosted talent host
`https://{tenant}.elmotalent.com.au/careers/{board}` (and the NZ host
`.elmotalent.co.nz`). The open-roles index is a server-rendered HTML page that lists the
tenant's open roles inline, each role linking to its canonical detail page
`/careers/{board}/job/view/{jobId}`, so the board is directly crawlable without
authentication and without a headless browser. Ever Jobs has no adapter for ELMO-powered
career boards, so these vacancies are currently un-ingestable. A single generic,
multi-tenant ELMO adapter unlocks the full catalogue of ELMO-powered career boards with
one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-elmo` plugin that ingests roles from **any**
  ELMO career board given a `companySlug` (the tenant sub-domain label, e.g. `anzca`) or
  a `companyUrl` (a career-board URL on an `elmotalent.com.au` / `.co.nz` host, from which
  the tenant label and `{board}` segment are derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`https://{tenant}.elmotalent.com.au/careers/{board}`) whose HTML
  lists each role as a `/careers/{board}/job/view/{jobId}` link.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'elmo'`).

## 3. Non-Goals

- Any authenticated ELMO API (the ELMO User API at `developer.elmotalent.com.au` requires
  per-tenant OAuth credentials). This plugin consumes only the public candidate-facing
  career board.
- Server-side filtering by category / location / work type. We ingest the tenant's full
  rendered role set and slice client-side to `resultsWanted`.
- Fetching per-role detail pages to enrich the description / location / department (the
  listing surface yields the title + stable id + canonical URLs; detail enrichment is a
  deferred enhancement).
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of ELMO tenant sub-domains (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ELMO plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the ELMO adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.elmotalent.com.au`) or from a `companyUrl` on an `elmotalent.com.au` / `.co.nz` host (leading sub-domain label is the tenant; `/careers/{board}` path yields the board hint). | must |
| FR-2  | Fetch the public server-rendered board across candidate `{board}` segments (the input-derived board, then the tenant slug, then `careers` / `default`) until one renders a role list. | must |
| FR-3  | Scrape the role list by anchoring on the `/careers/{board}/job/view/{jobId}` links (rather than volatile CSS class names), reading the title from the anchor inner text. | must |
| FR-4  | Use each role's numeric `{jobId}` (from the `/job/view/{jobId}` URL) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, applyUrl, location, department, remote, datePosted) building the canonical detail URL `/careers/{board}/job/view/{jobId}` and apply URL `/careers/{board}/job/apply/{jobId}`. | must |
| FR-6  | Convert any HTML job-ad body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the rendered role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), 302-redirects off the board to the marketing site, network errors, empty boards, and malformed bodies without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                            |
| ------ | --------------------------------------------- | --------------------------------- |
| NFR-1  | No credentials / secrets required             | public server-rendered board page |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result  |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + capped timeouts + proxy support |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |
| NFR-6  | No headless browser                           | parse server-rendered HTML only   |
| NFR-7  | Per-request timeout capped at 15s             | bound BOTH `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ELMO, name: 'ELMO', category: 'ats', isAts: true })
class ElmoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03, verified=false):

```
GET https://{tenant}.elmotalent.com.au/careers/{board}
  → server-rendered HTML listing each open role as an anchor to its detail page:
      <a href="…/careers/{board}/job/view/{jobId}">{title}</a>

Canonical per-role detail URL:  https://{tenant}.elmotalent.com.au/careers/{board}/job/view/{jobId}
Canonical per-role apply URL:   https://{tenant}.elmotalent.com.au/careers/{board}/job/apply/{jobId}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{jobId}` (numeric, from `/job/view/{jobId}` URL)   | `atsId`, `id`           | `id` is prefixed `elmo-{atsId}`; role skipped if absent     |
| anchor inner text                                   | `title`                 | required; role skipped if absent                            |
| `/careers/{board}/job/view/{jobId}`                 | `jobUrl`                | canonical public detail URL                                 |
| `/careers/{board}/job/apply/{jobId}`                | `applyUrl`              | canonical public apply URL                                  |
| listing body (HTML, when present)                   | `description`           | format-converted (HTML / Markdown / Plain); null on listing |
| listing date (when present)                         | `datePosted`            | parsed → `YYYY-MM-DD`; relative dates → null                |
| listing location (free-text, when present)          | `location`              | best-effort city / state / country split; null when none    |
| title / location / department                       | `isRemote`              | remote detection (`remote` / `hybrid` / `wfh` …)            |
| listing department (when present)                   | `department`            | when present                                                |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the board carries no brand name                             |
| —                                                   | `site`                  | constant `Site.ELMO`                                        |
| —                                                   | `atsType`               | constant `'elmo'`                                           |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `anzca`) → expanded to `https://anzca.elmotalent.com.au`.
- `companySlug` containing a bare host / `elmotalent.com.au` → tenant + board from the URL.
- `companyUrl` on an `elmotalent.com.au` / `.co.nz` host → leading sub-domain label is the
  tenant; the first path segment after `/careers/` is the board hint.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx / 3xx-away), or no roles |
| logged warn (HTTP 4xx / 3xx) | unknown / wrong board — degrades to empty / next board, never throws       |
| logged warn (host down)      | DNS / refused / reset / timeout — aborts probe sweep, degrades to empty     |
| logged warn (parse failure)  | per-role map error — partial, never throws                                |

## 8. Test Plan

- E2E (`__tests__/elmo.e2e-spec.ts`): known tenant (`companySlug: 'anzca'`) returns
  shaped jobs (`site === Site.ELMO`, `atsType === 'elmo'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-EL-1 — Board segment.** The board lives under `/careers/{board}`, where `{board}`
  varies per tenant (the tenant slug, a brand label, or the bare `careers` segment).
  **Default (proceeding):** probe the input-derived board first, then the tenant slug,
  then `careers` / `default`, taking the first board that renders a `/job/view/{jobId}`
  link; that board is used to build per-role URLs.
- **Q-EL-2 — Stable per-role id.** **Default (proceeding):** use the numeric `{jobId}`
  from the canonical `/job/view/{jobId}` URL — the segment that addresses the role.
- **Q-EL-3 — Company display name.** The board carries no brand name in a stable place.
  **Default (proceeding):** de-slugify + title-case the tenant sub-domain label for
  `companyName`.
- **Q-EL-4 — Per-role enrichment.** The listing yields the title + stable id + canonical
  URLs; richer fields (HTML body, structured location, department, dates) live on the
  detail page. **Default (proceeding):** ship the listing-level mapping now; per-role
  detail enrichment is deferred to a follow-up enhancement.
- **Q-EL-5 — Custom careers domains.** Some tenants may front the board under their own
  custom domain. **Default (proceeding):** address a tenant by its `elmotalent.com.au` /
  `.co.nz` sub-domain (the stable public host); custom-domain detection is deferred to the
  source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered open-roles board on
  `{tenant}.elmotalent.com.au/careers/{board}`, whose HTML lists each role as a
  `/careers/{board}/job/view/{jobId}` link. **Confidence: researched, verified=false** —
  the platform, the `{tenant}.elmotalent.com.au` (+ `.co.nz`) addressing, the
  `/careers/{board}` board path, and the per-role URL shape `/careers/{board}/job/view/{jobId}`
  were confirmed from real live tenants (`securecorp`, `anzca`, and the live job-view URLs
  `avi.elmotalent.com.au/careers/careers/job/view/146`,
  `eks.elmotalent.com.au/careers/ekservices/job/view/23`). A live, parseable role list
  could not be observed during research (probed boards 302-redirected off the board to the
  ELMO marketing site or 404'd for the guessed board segment), so the parser is written
  defensively against the documented listing + URL shape.
- D-2: The board is a server-rendered HTML page (not a separate JSON API needing an API
  key, and parsed without a headless browser); the adapter anchors on the
  `/job/view/{jobId}` links rather than on volatile CSS class names so minor theme drift
  never breaks the parser.
- D-3: The richest per-role field available at the listing level is the title; the numeric
  `{jobId}` segment is the stable per-role ATS id. Detail-page enrichment is deferred.
- D-4: The board renders every open role in one document (no server-side pagination
  assumed); the adapter collects the rendered roles, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by a probe-page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive narrowing
  so minor shape drift never throws. The per-request timeout is capped at 15s by bounding
  BOTH `timeout` and `requestTimeout`.

## 11. References

- `packages/plugins/source-ats-elmo/` — implementation.
- Surface researched 2026-06-03 (no authentication; verified=false):
  - Platform + tenant host pattern `{tenant}.elmotalent.com.au` (AU) / `.co.nz` (NZ),
    confirmed with real tenants (`securecorp`, `anzca`, `centacarenenw`, `wdeaworks`,
    `healthcareers`), public board under `/careers/{board}` (e.g.
    `https://securecorp.elmotalent.com.au/careers/SECUREcorp`).
  - Canonical per-role detail URL shape `/careers/{board}/job/view/{jobId}` confirmed from
    real live tenants (`avi.elmotalent.com.au/careers/careers/job/view/146`,
    `eks.elmotalent.com.au/careers/ekservices/job/view/23`); the numeric `{jobId}` is the
    stable per-role ATS id. A live, parseable role list was not observed this run, so the
    parser is defensive (verified=false).
