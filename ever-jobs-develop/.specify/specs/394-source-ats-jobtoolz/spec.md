# Spec: 394 — Jobtoolz ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 394                                           |
| Slug           | source-ats-jobtoolz                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 366 (Scout Talent)               |

## 1. Problem Statement

Jobtoolz (jobtoolz.com, Kortrijk — Belgium / Benelux) is an SMB applicant-tracking
system and employer-branding platform whose candidate-facing product is a hosted, branded
jobsite. Every customer tenant publishes a branded, public jobsite on its own sub-domain
of the shared hosted careers host `https://{tenant}.jobtoolz.com/`. The open-roles board
(`/{locale}`) is a thin server-rendered shell that **embeds the full open-vacancy set
directly in the HTML** as the first argument of a JavaScript bootstrap call wired through
an Alpine.js attribute on the `<div id="vacatures">` element
(`window.jobComponent([ … ], …)`), so the board is directly crawlable without
authentication and without a headless browser. Ever Jobs has no adapter for
Jobtoolz-powered jobsites, so these vacancies are currently un-ingestable. A single
generic, multi-tenant Jobtoolz adapter unlocks the full catalogue of Jobtoolz-powered
boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-jobtoolz` plugin that ingests vacancies from
  **any** Jobtoolz jobsite given a `companySlug` (the tenant sub-domain label, e.g.
  `tordale`) or a `companyUrl` (a jobsite URL on a `jobtoolz.com` host, from which the
  tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles board (`https://{tenant}.jobtoolz.com/{locale}`, with `nl` / `en` / `fr`
  locale variants) whose HTML embeds the full vacancy set as
  `window.jobComponent([ … ], …)`; the embedded (HTML-entity-encoded) JSON carries each
  role's title, location, employment type, and canonical detail URL.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'jobtoolz'`).

## 3. Non-Goals

- The authenticated Jobtoolz Content API (`api.jobtoolz.com/content/v1/jobs`) requires a
  per-tenant `Bearer` API key. This plugin consumes only the public candidate-facing
  jobsite.
- Server-side filtering by category / location / work type (the board supports these
  facets). We ingest the tenant's full embedded vacancy set and slice client-side to
  `resultsWanted`.
- Per-role detail-page enrichment (full HTML body). The board list carries no rich body;
  the description stays null and the canonical detail URL is the candidate-facing surface.
  (Format conversion is wired for parity / future enrichment.)
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Jobtoolz tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Jobtoolz plugin at a tenant's
> jobsite sub-domain, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Jobtoolz adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.jobtoolz.com`) or from a `companyUrl` on a `jobtoolz.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered board across known locale variants (`/nl`, `/en`, `/fr`) until one returns an embedded vacancy array. | must |
| FR-3  | Extract the `window.jobComponent([ … ], …)` array argument via balanced-bracket scanning, HTML-decode it (`&quot;`/`&amp;`/`&#39;`/…), and `JSON.parse` the result. | must |
| FR-4  | Use each vacancy's numeric `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, applyUrl) using the vacancy's canonical `url` as both the detail and the apply URL. | must |
| FR-6  | Honour `descriptionFormat` (HTML / Markdown / Plain) on any body present (board list carries none → null). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the embedded vacancy set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (DNS failure), HTTP 3xx/4xx, network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public embedded-JSON board page  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Per-request timeout capped at 15s             | bound BOTH `timeout` + `requestTimeout` |
| NFR-5  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-6  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-7  | No headless browser                           | parse server-embedded JSON only  |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JOBTOOLZ, name: 'Jobtoolz', category: 'ats', isAts: true })
class JobtoolzService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.jobtoolz.com/{locale}        (locale ∈ nl, en, fr)
  → server-rendered HTML embedding the full open-vacancy set as a JS bootstrap call
    wired through an Alpine.js `x-data` attribute on `<div id="vacatures">`:
      <div id="vacatures" x-data="window.jobComponent([ {…vacancy…}, … ], 999, … )">
    Because it lives inside an HTML attribute, the array's JSON text is
    HTML-entity-encoded (&quot; → ", &amp; → &, &#39; → ', …). Decode the entities,
    then JSON.parse → array of vacancy objects:
      { "id": 760208638, "title": "…", "button": "bekijk vacature",
        "url": "https://{tenant}.jobtoolz.com/{locale}/{title-slug}",
        "image_url": "…", "location": "Sint-Andries", "types": "Voltijds, Deeltijds",
        "filters": { "filterIds": [524741956], "locationId": 1608575972,
                     "types": ["fulltime","parttime"] } }

Canonical per-role detail URL:  the vacancy's own `url` (returns HTTP 200)
Canonical per-role apply URL:   the same `url` (the detail page doubles as the apply page)
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (numeric)                                      | `atsId`, `id`           | `id` is prefixed `jobtoolz-{atsId}`; role skipped if absent |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `url`                                               | `jobUrl`, `applyUrl`    | canonical public detail page (doubles as apply)             |
| `types` (else `filters.types[]`)                    | `employmentType`        | free-text (`Voltijds, Deeltijds`) or normalised tokens      |
| `location` (free-text)                              | `location`              | best-effort city / state / country split; null when none    |
| title / location / employment type                 | `isRemote`              | remote detection (`remote` / `hybride` / `thuiswerk` …)     |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the board carries no brand name                             |
| —                                                   | `description`           | null (board list has no body); format-conversion wired      |
| —                                                   | `datePosted`            | null (board list carries no date)                           |
| —                                                   | `site`                  | constant `Site.JOBTOOLZ`                                    |
| —                                                   | `atsType`               | constant `'jobtoolz'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `tordale`) → expanded to `https://tordale.jobtoolz.com`.
- `companySlug` containing a bare host / `jobtoolz.com` → tenant taken from the host.
- `companyUrl` on a `jobtoolz.com` host → leading sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (DNS failure), or no roles  |
| logged warn (HTTP 3xx/4xx)   | non-default-locale redirect / unknown path — degrades to empty, never throws |
| logged warn (parse failure)  | marker present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/jobtoolz.e2e-spec.ts`): known tenant (`companySlug: 'tordale'`) returns
  shaped jobs (`site === Site.JOBTOOLZ`, `atsType === 'jobtoolz'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-JT-1 — Locale.** Tenants localise the board and a non-default locale 302-redirects
  to the tenant's default. **Default (proceeding):** probe `/nl` (the Benelux default)
  then `/en` then `/fr`, taking the first page that renders the `window.jobComponent`
  array marker; the vacancy `url`s are absolute, so the serving locale is informational.
- **Q-JT-2 — Stable per-role id.** Each vacancy carries a numeric `id`. **Default
  (proceeding):** use the numeric `id` as the `atsId`.
- **Q-JT-3 — Company display name.** The embedded vacancy carries no brand name.
  **Default (proceeding):** de-slugify + title-case the tenant sub-domain label for
  `companyName`.
- **Q-JT-4 — Custom careers domains.** Some tenants front the board under their own custom
  domain (a CNAME to `cname.jobtoolz.com`). **Default (proceeding):** address a tenant by
  its `jobtoolz.com` sub-domain (the stable public host); custom-domain detection is
  deferred to the source-adoption backlog.
- **Q-JT-5 — Rich description body.** The board list carries no rich HTML body (only the
  detail page does). **Default (proceeding):** leave `description` null at list level;
  per-role detail-page enrichment is deferred (the format-conversion path is wired so it
  is a one-line change to add later).

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered open-roles board on
  `{tenant}.jobtoolz.com`, whose HTML embeds the full vacancy set as
  `window.jobComponent([ … ], …)`. **Confidence: verified** — the platform, the
  `{tenant}.jobtoolz.com` addressing, the embedded-JSON board, and the per-role canonical
  `url` were confirmed live 2026-06-03 against the named real tenant `tordale`: 4 live
  roles parsed, e.g. id `760208638` → `…/nl/intrapenitentiaire-ondersteuning` (HTTP 200).
- D-2: The board is a thin server-rendered shell that bootstraps with an embedded JSON
  array (not a SPA needing a headless browser, and not the separate Content API needing an
  API key); the adapter scans the array with HTML-entity-aware, string-aware bracket
  balancing (the vacancy objects contain nested `filters` arrays, so a naive non-greedy
  match would truncate), HTML-decodes it, and `JSON.parse`s the result.
- D-3: The per-role fields are `id` (numeric), `title`, the canonical `url`, `location`,
  and `types`; the board list carries no rich body or date. The numeric `id` is the stable
  per-role ATS id, and the `url` doubles as the detail + apply URL.
- D-4: The board embeds every open role in one document (no server-side pagination of the
  job set); the adapter collects the embedded vacancies, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by a probe-page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-jobtoolz/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.jobtoolz.com`, confirmed with the named real
    tenant `tordale` (`https://tordale.jobtoolz.com/nl`).
  - The server-rendered board embeds the open-vacancy set as
    `window.jobComponent([ … ], …)` (HTML-entity-encoded); balanced-bracket extraction +
    HTML-decode + `JSON.parse` yielded 4 live vacancies, each with a numeric `id` and a
    canonical `url` (verified=true). Other Jobtoolz-powered tenants seen: `boplan`,
    `vooruit`, `jobsdevleugels`, `jobs`.
