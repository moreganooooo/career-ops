# Spec: 400 — Recruitly ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 400                                           |
| Slug           | source-ats-recruitly                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

Recruitly (recruitly.io — a UK-headquartered recruitment-agency CRM / ATS) lets every
tenant publish a candidate-facing job board and exposes that board's published roles
through a single, **public, anonymous JSON endpoint** on its shared API host
(`https://api.recruitly.io/api/job?apiKey={apiKey}`), addressed by the tenant's public
board **API key** (the per-tenant board credential Recruitly issues for embedding the
board on the tenant's own site / WordPress / Wix iframe — not the private back-office
token). The endpoint answers a `{ "data": [ … ] }` envelope of published roles, so the
board is directly crawlable without authentication and without a headless browser. Ever
Jobs has no adapter for Recruitly-powered boards, so these (UK-agency-heavy) vacancy
catalogues are currently un-ingestable. A single generic, multi-tenant Recruitly adapter
unlocks the full catalogue of Recruitly-powered boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-recruitly` plugin that ingests roles from **any**
  Recruitly board given a `companySlug` (the public board API key) or a `companyUrl` (a
  Recruitly board / widget / API URL carrying an `apiKey` query parameter, from which the
  key is derived).
- Use the **public, anonymous** surface (no auth challenge, no private token): the
  published-roles JSON feed `https://api.recruitly.io/api/job?apiKey={apiKey}` whose body
  is a `{ "data": [ … ] }` envelope; each role carries an `id`, `reference`, `title`,
  `status`, `jobType` / `employmentType`, `remoteWorking`, `companyName`, a structured
  `location`, a `pay` block, a `postedOn` date, an HTML `description`, and a public
  `applyUrl`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'recruitly'`, `employmentType`).

## 3. Non-Goals

- The authenticated Recruitly back-office REST API (the private, per-tenant management
  token issued at `secure.recruitly.io/settings/api`). This plugin consumes only the
  public, candidate-facing board feed keyed by the public board API key.
- Server-side filtering by sector / location / job type (the board supports these facets).
  We ingest the board's full published role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Recruitly board API keys (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Recruitly plugin at a tenant's public
> board API key, so that I ingest that agency's full published-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Recruitly adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the public board API key from `companySlug` (the bare key) or from a `companyUrl` on a `recruitly.io` host (`apiKey` query parameter). | must |
| FR-2  | Fetch the public published-roles JSON feed `https://api.recruitly.io/api/job?apiKey={apiKey}`.       | must |
| FR-3  | Narrow the role array from the `{ "data": [ … ] }` envelope (tolerating a bare array body).          | must |
| FR-4  | Use each role's `id` (else `uniqueId`, else `reference`) as the stable `atsId`; de-duplicate by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl), preferring the role's own `applyUrl` else building `https://jobs.recruitly.io/widget/apply/{id}`. | must |
| FR-6  | Convert the HTML role description per `descriptionFormat` (HTML / Markdown / Plain).                  | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the role set.                              | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must |
| FR-9  | Tolerate unknown / revoked keys (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |
| FR-10 | Skip non-`OPEN` (CLOSED / archived) roles so only live, applyable vacancies are ingested.            | should |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / private token required       | public board-API-key JSON feed   |
| NFR-2  | A fetch failure or unknown key must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`         |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.RECRUITLY, name: 'Recruitly', category: 'ats', isAts: true })
class RecruitlyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://api.recruitly.io/api/job?apiKey={apiKey}
  → JSON envelope: { "data": [ role, … ] }, each role:
      { "id": "hire88033975b9a947d6ac2dcdf2665804a1",
        "uniqueId": 3842, "reference": "JB-3842",
        "title": "HTML & React.js Developer", "status": "OPEN",
        "jobType": null, "employmentType": null, "remoteWorking": false,
        "companyName": "…",
        "location": { "addressLine": "…", "cityName": "…", "regionName": "…",
          "postCode": "…", "countryCode": "GB", "countryName": "United Kingdom",
          "latitude": 0, "longitude": 0 },
        "pay": { "currency": { "code":"USD","symbol":"$" },
          "tenure": { "code":"MONTH" }, "minPay": 100, "maxPay": 100,
          "range": false, "jobPayLabel": "USD100 Per Month" },
        "postedOn": "02/06/2026",
        "description": "<p>…HTML…</p>",
        "applyUrl": "https://jobs.recruitly.io/widget/apply/hire88033975b9a947d6ac2dcdf2665804a1" }

Canonical per-role public apply / detail URL:
  https://jobs.recruitly.io/widget/apply/{id}   (also carried on the role as applyUrl)
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` → `uniqueId` → `reference`                     | `atsId`, `id`           | `id` is prefixed `recruitly-{atsId}`; role skipped if none  |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `applyUrl` (else `/widget/apply/{id}`)              | `jobUrl`, `applyUrl`    | the apply-widget page is the public detail + apply surface  |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `postedOn` (`DD/MM/YYYY`)                           | `datePosted`            | normalised explicitly → `YYYY-MM-DD`                        |
| `location.{cityName, regionName, countryName/countryCode}` | `location`       | structured city / state / country; null when none           |
| `remoteWorking` + title/location/employmentType regex | `isRemote`           | structured flag first, then text regex (`remote`/`home working`/`wfh`…) |
| `employmentType` (else `jobType`)                   | `employmentType`        | when present                                                |
| `companyName`                                       | `companyName`           | the hiring brand the agency is recruiting for               |
| —                                                   | `site`                  | constant `Site.RECRUITLY`                                   |
| —                                                   | `atsType`               | constant `'recruitly'`                                      |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Board-key resolution:

- `companySlug` (the bare key) → used directly as the `apiKey`.
- `companySlug` containing a Recruitly URL / `recruitly.io` host → key taken from the
  `apiKey` query parameter.
- `companyUrl` on a `recruitly.io` host → key taken from its `apiKey` query parameter.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable key, unknown / revoked key (HTTP 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / revoked board key — degrades to empty, never throws             |
| logged warn (parse failure)  | body present but unusable, or per-role map error — partial, never throws  |

## 8. Test Plan

- E2E (`__tests__/recruitly.e2e-spec.ts`): known board key returns shaped jobs
  (`site === Site.RECRUITLY`, `atsType === 'recruitly'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown key degrades
  gracefully; `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-RC-1 — Tenant addressing.** Recruitly's public board is keyed by a board API key
  rather than a sub-domain slug. **Default (proceeding):** treat the public board API key
  as the tenant identifier, accepting it bare via `companySlug` or extracting it from the
  `apiKey` query parameter of a board / widget / API `companyUrl`.
- **Q-RC-2 — Stable per-role id.** Each role carries a `hire…`-prefixed string `id`, a
  numeric `uniqueId`, and an agency `reference`. **Default (proceeding):** use `id` (the
  apply-URL segment and the most stable ATS id), falling back to `uniqueId` then
  `reference`.
- **Q-RC-3 — Apply / detail URL.** Each role carries its own public `applyUrl`. **Default
  (proceeding):** prefer the role's `applyUrl` when it is a usable absolute Recruitly URL,
  else build `https://jobs.recruitly.io/widget/apply/{id}`.
- **Q-RC-4 — Role lifecycle.** The feed may include non-live (`CLOSED`) roles. **Default
  (proceeding):** ingest only `status === 'OPEN'` roles (skip closed / archived), and where
  the field is absent treat the role as live.
- **Q-RC-5 — Date format.** `postedOn` is `DD/MM/YYYY` (UK format). **Default
  (proceeding):** parse it explicitly to `YYYY-MM-DD` (a bare `new Date` mis-reads it as
  `MM/DD/YYYY`).

## 10. Decisions

- D-1: Primary surface is the public, anonymous published-roles JSON feed
  `https://api.recruitly.io/api/job?apiKey={apiKey}`, keyed by the tenant's public board
  API key. **Confidence: verified** — the endpoint, the board-API-key addressing, the
  `{ "data": [ … ] }` envelope, the per-role field set (`id`, `reference`, `title`,
  `status`, structured `location`, `pay`, `postedOn`, HTML `description`, public
  `applyUrl`), and the per-role apply URL shape `https://jobs.recruitly.io/widget/apply/{id}`
  were confirmed live 2026-06-03 against a real demo board key (`WEAV…A21`), which returned
  HTTP 200 with a populated `data` array of `OPEN` roles. The documented public board-embed
  surfaces (`secure.recruitly.io/public/jobs/t?theme={n}&apiKey={apiKey}` iframe and
  `jobs.recruitly.io/widget/apply/{id}` apply widget) corroborate the public, anonymous,
  board-API-key model.
- D-2: The board is a JSON API (not an SSR HTML island needing a parser, and not a SPA
  needing a headless browser); the adapter GETs the feed and narrows `data` to an array.
- D-3: The role's `id` is the stable per-role ATS id and the apply-URL segment; `uniqueId`
  and `reference` are fallbacks. `companyName` is the hiring brand the agency recruits for.
- D-4: The feed returns the full published role set in one document (no server-side
  pagination of the public board feed); the adapter dedupes by `atsId`, skips non-`OPEN`
  roles, and slices to `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-recruitly/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Public published-roles feed `GET https://api.recruitly.io/api/job?apiKey={apiKey}`
    answered HTTP 200 with a `{ "data": [ … ] }` envelope of `OPEN` roles for a real demo
    board key (`WEAV1001764028E594BF49688A653966A1729A21`), each role carrying a `hire…`
    `id`, a `reference` (`JB-3842`), a structured `location`, a `pay` block, a `postedOn`
    (`DD/MM/YYYY`) date, an HTML `description`, and a public `applyUrl`
    (`https://jobs.recruitly.io/widget/apply/{id}`). Confidence: **verified**.
  - The documented public board-embed surfaces — the iframe board
    `https://secure.recruitly.io/public/jobs/t?theme={n}&apiKey={apiKey}` (Recruitly Wix /
    iframe integration docs) and the apply widget `https://jobs.recruitly.io/widget/apply/{id}`
    — corroborate the public, anonymous, board-API-key addressing model.
