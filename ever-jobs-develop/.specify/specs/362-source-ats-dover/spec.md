# Spec: 362 — Dover ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 362                                           |
| Slug           | source-ats-dover                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Dover (dover.com) is a modern recruiting-automation ATS whose candidate-facing
product is a no-code, hosted/embeddable careers board on `app.dover.com`. Every
customer tenant publishes a branded, public board addressed either by a short
slug (`https://app.dover.com/jobs/{slug}`) or by a company + careers-page UUID
(`https://app.dover.com/{company}/careers/{careersPageId}`). The board is a
client-rendered SPA backed by a public, unauthenticated careers-page JSON feed,
and each board is pre-rendered with schema.org `JobPosting` JSON-LD for
Google-for-Jobs. Ever Jobs has no adapter for Dover-powered career boards, so
these vacancies are currently un-ingestable. A single generic, multi-tenant Dover
adapter unlocks the full catalogue of Dover-powered boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-dover` plugin that ingests vacancies
  from **any** Dover careers board given a `companySlug` (the board slug, e.g.
  `dover`) or a `companyUrl` (a board URL on `app.dover.com`, whose slug is parsed
  from `/jobs/{slug}` or `/{company}/careers/{uuid}`).
- Use the **public, anonymous** surface (no auth, no API key): the careers-page
  JSON feed (`/api/v1/careers-page/{slug}`), with each board's pre-rendered
  schema.org `JobPosting` JSON-LD as a defensive fallback.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'dover'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Dover API (the external API that adds candidates / lists
  hired candidates and requires an API key). This plugin consumes only the public
  candidate-facing surface.
- Server-side filtering by department / location / commitment (the board supports
  these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Dover tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Dover plugin at a tenant's
> board slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Dover adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the board slug from `companySlug` or from a `companyUrl` on `app.dover.com` (slug parsed from `/jobs/{slug}` or `/{company}/careers/{uuid}`). | must |
| FR-2  | Fetch the public careers-page JSON feed (`GET /api/v1/careers-page/{slug}`) and enumerate the tenant's open roles. | must |
| FR-3  | Fall back to scanning the board HTML for pre-rendered schema.org `JobPosting` JSON-LD when the feed yields nothing; use the role id (or `identifier`) as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated role set.                  | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed / non-JSON payloads without throwing. | must  |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public careers feed + board page |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DOVER, name: 'Dover', category: 'ats', isAts: true })
class DoverService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://app.dover.com/api/v1/careers-page/{slug}
  → { jobs: [ { id, title, location, description, url, department,
               employmentType, datePosted, isRemote }, … ] }
    (the public board feed; a bare array or a `results` / `data`
     envelope is also tolerated)

Fallback — board HTML pre-rendered for Google-for-Jobs:
GET https://app.dover.com/jobs/{slug}
  → HTML carrying schema.org JobPosting JSON-LD block(s):
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Software Engineer",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20",
        "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "Dover" },
        "jobLocation": { "address": {
          "addressLocality": "San Francisco", "addressRegion": "CA",
          "addressCountry": "US" } },
        "identifier": { "value": "abc123" } }
    </script>
```

Wire shape → `JobPostDto` mapping:

| Source field                                           | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| feed `id` / `uuid` / `jobId` (else JSON-LD `identifier` / title slug) | `atsId`, `id` | `id` is prefixed `dover-{atsId}`                          |
| feed `title` / `name` (else JSON-LD `title`)           | `title`                 | required; role skipped if absent                            |
| feed `url` / `jobUrl` (else board URL / JSON-LD `url`)  | `jobUrl`, `applyUrl`    | absolute public board / apply URL                           |
| feed `description` (HTML or text) else JSON-LD `description` | `description`      | format-converted (HTML / Markdown / Plain)                  |
| feed `datePosted` / `publishedAt` / `createdAt` (else JSON-LD `datePosted`) | `datePosted` | parsed → `YYYY-MM-DD`                                  |
| feed `location` / `locations` (string or object) else JSON-LD `jobLocation.address` | `location` | city / state / country; null when none usable             |
| feed `isRemote` / `remote` / JSON-LD `jobLocationType` / title / location | `isRemote`     | remote detection (`remote` / `distributed` / `wfh` …)       |
| feed `department` / `team` (else JSON-LD `industry`)    | `department`            | when present                                                |
| feed `employmentType` / `commitment` (else JSON-LD `employmentType`) | `employmentType` | enum normalised to a readable label                       |
| feed envelope `companyName` / JSON-LD `hiringOrganization.name` (else slug) | `companyName` | de-slugified + title-cased                              |
| —                                                       | `site`                  | constant `Site.DOVER`                                       |
| —                                                       | `atsType`               | constant `'dover'`                                          |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Slug resolution:

- `companySlug` (e.g. `dover`) → used as-is to address the careers feed.
- `companyUrl` on `app.dover.com` → slug parsed from `/jobs/{slug}` or the
  `{company}` label of `/{company}/careers/{uuid}`.
- A full board URL or a bare `jobs/{slug}` / `{company}/careers/{uuid}` fragment
  passed as `companySlug` is also parsed for the slug.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable slug, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed feed / non-JSON payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/dover.e2e-spec.ts`): known tenant (`companySlug: 'dover'`)
  returns shaped jobs (`site === Site.DOVER`, `atsType === 'dover'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-DV-1 — Board addressing forms.** Dover boards are addressed both by a short
  slug (`/jobs/{slug}`) and by a company + careers-page UUID
  (`/{company}/careers/{uuid}`). **Default (proceeding):** treat a bare slug as the
  feed key; parse the slug (`/jobs/{slug}` label, or the `{company}` label) from a
  full `companyUrl` or a bare path fragment.
- **Q-DV-2 — SPA-rendered feed.** The board is a client-rendered SPA, so a no-JS
  HTML fetch returns only the app shell; the exact byte-level careers-feed JSON
  shape could not be confirmed without a JS runtime. **Default (proceeding):** read
  the documented public careers feed defensively (tolerating a bare array or
  `jobs`/`results`/`data` envelopes and several id/url/location aliases), with
  pre-rendered schema.org `JobPosting` JSON-LD as a fallback; any malformed or
  absent payload yields "no job" rather than a failure. Confidence: **unverified**.
- **Q-DV-3 — Role id.** The careers feed exposes a stable per-role id; the JSON-LD
  fallback uses `identifier` (or a title-derived slug). **Default (proceeding):**
  prefer `id`/`uuid`/`jobId`, then JSON-LD `identifier`, then a title slug, as the
  ATS id.

## 10. Decisions

- D-1: Primary surface is the public, anonymous careers-page JSON feed
  (`/api/v1/careers-page/{slug}`) for role enumeration, with each board's
  pre-rendered schema.org `JobPosting` JSON-LD as a defensive fallback. **Confidence:
  unverified** — the platform, the two board URL forms (`app.dover.com/jobs/{slug}`
  and `app.dover.com/{company}/careers/{uuid}`), and named real tenants were
  confirmed live 2026-06-03, but the boards are JS-rendered SPAs so the careers
  feed JSON's byte-level shape could not be confirmed via a no-JS fetch; the parser
  is written defensively.
- D-2: The authenticated external Dover API (add candidates / list hired
  candidates) is out of scope; only the public candidate-facing careers surface is
  consumed.
- D-3: The richest structured fields available per role are the feed `title`,
  `description`, `location`, `department`, `employmentType`, and `datePosted`; the
  feed id (or JSON-LD `identifier`) is the stable per-role ATS id.
- D-4: The careers feed enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted`. De-dup is by `atsId`.
- D-5: The feed JSON and JSON-LD are parsed with bounded, dependency-free scans
  (tolerant of envelope shapes, field aliases, arrays / `@graph`), keeping the
  plugin resilient to minor wire drift.

## 11. References

- `packages/plugins/source-ats-dover/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + both board URL forms (`app.dover.com/jobs/{slug}`,
    `app.dover.com/{company}/careers/{uuid}`) confirmed, with named real tenants:
    `dover` (Dover), `beimpact`, `unthread` (Unthread), `backbone` (Backbone),
    `paces` (Paces), `daysheets` (Daysheets).
  - The boards are JS-rendered SPAs; the careers-feed JSON payload shape could not
    be confirmed via an unauthenticated no-JS fetch (verified=false).
