# Spec: 391 — Greeting ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 391                                           |
| Slug           | source-ats-greeting                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 385 (Gupy), 387 (MokaHR)         |

## 1. Problem Statement

Greeting (greetinghr.com, by Dudaji — South Korea) is a Korean recruitment / HR ATS
("TRM") whose candidate-facing product is a hosted, branded career site. Every customer
tenant publishes a branded, public career site on its own sub-domain of the shared hosted
careers host `https://{tenant}.career.greetinghr.com/`. The landing page is a Next.js
shell that **embeds the full open-roles set directly in the HTML** inside the standard
`__NEXT_DATA__` script tag as a React-Query "dehydrated state" (a list of pre-fetched
queries), so the board is directly crawlable without authentication and without a headless
browser. Ever Jobs has no adapter for Greeting-powered career sites, so these vacancies are
currently un-ingestable. A single generic, multi-tenant Greeting adapter unlocks the full
catalogue of Greeting-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-greeting` plugin that ingests open roles from
  **any** Greeting career site given a `companySlug` (the tenant sub-domain label, e.g.
  `ablelabs`) or a `companyUrl` (a career-site URL on a `career.greetinghr.com` host, from
  which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered landing
  (`https://{tenant}.career.greetinghr.com/`, which 301-redirects to `/{locale}/home`)
  whose HTML embeds the full open-roles set in `__NEXT_DATA__` as the React-Query
  `["openings"]` query; the tenant `workspaceId` is carried in the `getCareerBootInfo`
  query. The richer HTML job-ad body is enriched (best-effort) from the public detail API
  `GET https://api.greetinghr.com/ats/v3.5/career/workspaces/{workspaceId}/openings/{openingId}`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'greeting'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Greeting API / applicant-account surface (`/recruit/applicant/...`
  requires a candidate session). This plugin consumes only the public candidate-facing
  career site + the public detail endpoint.
- Server-side filtering by occupation / location / employment type (the board supports
  these facets). We ingest the tenant's full embedded openings set and slice client-side
  to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Greeting tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Greeting plugin at a tenant's career
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Greeting adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.career.greetinghr.com`) or from a `companyUrl` on a `career.greetinghr.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered landing across known locale/path variants (root, `{locale}/home`, following the tenant root redirect) until one yields an embedded `__NEXT_DATA__` openings query. | must |
| FR-3  | Extract the `__NEXT_DATA__` JSON, read the React-Query dehydrated state, take the `["openings"]` query's array, and read the tenant `workspaceId` from the `getCareerBootInfo` query key. | must |
| FR-4  | Use each opening's `openingId` as the stable `atsId`; de-duplicate roles by `atsId` within a run; skip roles whose `deploy` flag is explicitly `false`. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), building the canonical detail URL `/{locale}/o/{openingId}` and apply URL `/{locale}/o/{openingId}/apply`. | must |
| FR-6  | Enrich the HTML job-ad body (best-effort, bounded) from the public detail API and convert it per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the embedded openings set, bounded by a probe-page cap and a detail-fetch cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public embedded-JSON landing + public detail API |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page + detail caps |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-embedded JSON only  |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GREETING, name: 'Greeting', category: 'ats', isAts: true })
class GreetingService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.career.greetinghr.com/            (301 → /{locale}/home)
  → server-rendered Next.js HTML embedding the full open-roles set inside the
    <script id="__NEXT_DATA__"> tag as a React-Query dehydrated state. The
    queryKey ["openings"] query's state.data is the openings array; the
    ["publicCareer","getCareerBootInfo",{ workspaceId }] query key carries the
    tenant workspaceId. Each opening object:
      { "openingId": 139155, "title": "…", "deploy": true, "fixed": false,
        "openDate": "2026-04-15T09:41:19Z", "dueDate": null,
        "group": { "name": "에이블랩스", "imageUrl": "…" },
        "openingJobPosition": { "openingJobPositions": [ {
          "workspaceOccupation": { "occupation": "소프트웨어" },
          "workspacePlace": { "location": "…", "place": "대한민국 …", "workFromHome": false },
          "jobPositionEmployment": { "employmentType": "FULL_TIME_WORKER" } } ] } }

GET https://api.greetinghr.com/ats/v3.5/career/workspaces/{workspaceId}/openings/{openingId}
  (header X-Greeting-Workspace-Id: {workspaceId})
  → { "success": true, "data": { "openingsInfo": { "openingId", "status": "OPEN",
        "title": "…", "detail": "<…HTML job-ad body…>" }, "groupInfo": { "name": "…" }, … } }

Canonical per-role detail URL:  https://{tenant}.career.greetinghr.com/{locale}/o/{openingId}
Canonical per-role apply URL:   https://{tenant}.career.greetinghr.com/{locale}/o/{openingId}/apply
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `openingId`                                         | `atsId`, `id`           | `id` is prefixed `greeting-{atsId}`; role skipped if absent |
| `title` (else detail `openingsInfo.title`)          | `title`                 | required; role skipped if absent                            |
| `/{locale}/o/{openingId}`                           | `jobUrl`                | canonical public detail URL                                 |
| `/{locale}/o/{openingId}/apply`                     | `applyUrl`              | canonical public apply URL                                  |
| detail `openingsInfo.detail` (HTML)                 | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `openDate`                                          | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `workspacePlace.place` (else `.location`)           | `location`              | best-effort country/city split; null when none              |
| `workspacePlace.workFromHome` / title / location    | `isRemote`              | remote detection (`remote` / `wfh` / `재택` / `원격` …)        |
| `workspaceOccupation.occupation`                    | `department`            | the role's occupation / job family                          |
| `jobPositionEmployment.employmentType`              | `employmentType`        | enum token mapped to a readable label                       |
| `group.name` (else tenant slug, de-slugified)       | `companyName`           |                                                             |
| —                                                   | `site`                  | constant `Site.GREETING`                                    |
| —                                                   | `atsType`               | constant `'greeting'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `ablelabs`) → expanded to `https://ablelabs.career.greetinghr.com`.
- `companySlug` containing a bare host / `career.greetinghr.com` → tenant from the host.
- `companyUrl` on a `career.greetinghr.com` host → leading sub-domain label is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | `__NEXT_DATA__` absent/unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/greeting.e2e-spec.ts`): known tenant (`companySlug: 'ablelabs'`) returns
  shaped jobs (`site === Site.GREETING`, `atsType === 'greeting'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-GR-1 — Locale / landing path.** The tenant root 301-redirects to a localised landing
  (`/{locale}/home`). **Default (proceeding):** follow the root redirect first, then probe
  `{locale}/home` across locales `''` (default redirect), `ko`, `en`, taking the first page
  whose `__NEXT_DATA__` renders the `["openings"]` query; the resolved locale is used to
  build per-role URLs.
- **Q-GR-2 — Stable per-role id.** Each opening carries `openingId` (the URL segment).
  **Default (proceeding):** use `openingId` (the canonical URL id) as `atsId`.
- **Q-GR-3 — Description source.** The listing carries no body; the rich HTML body is on the
  detail API. **Default (proceeding):** enrich the body (best-effort, bounded by
  `GREETING_MAX_DETAIL_FETCHES`) from `GET /ats/v3.5/career/workspaces/{ws}/openings/{id}`;
  roles beyond the cap (or on detail failure) still surface without the body.
- **Q-GR-4 — Custom careers domains.** Some tenants front the board under a custom domain
  (the boot info exposes `customDomain`). **Default (proceeding):** address a tenant by its
  `career.greetinghr.com` sub-domain (the stable public host); custom-domain detection is
  deferred to the source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered landing on
  `{tenant}.career.greetinghr.com`, whose HTML embeds the full open-roles set in
  `__NEXT_DATA__` as the React-Query `["openings"]` dehydrated query. **Confidence:
  verified** — the platform, the `{tenant}.career.greetinghr.com` addressing, the embedded
  `__NEXT_DATA__` openings query, the tenant `workspaceId` (1137), and the per-role URL
  shape `/{locale}/o/{openingId}` were confirmed live 2026-06-03 against the named real
  tenant `ablelabs` (에이블랩스 / ABLE Labs): a live role `openingId 139155` was parsed,
  mapping to `/ko/o/139155`.
- D-2: The landing is a Next.js shell that bootstraps with a server-embedded React-Query
  dehydrated state (not a SPA needing a headless browser, and not a separate JSON API
  needing an API key); the adapter extracts the `__NEXT_DATA__` JSON and reads the queries.
- D-3: The richer per-role HTML body lives on the public detail API
  `GET /ats/v3.5/career/workspaces/{workspaceId}/openings/{openingId}` (header
  `X-Greeting-Workspace-Id`), confirmed live returning HTTP 200 with
  `data.openingsInfo.detail`. The adapter enriches the description from it (best-effort).
- D-4: The landing embeds every open role in one document (no server-side pagination of the
  job set); the adapter collects the embedded openings, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by probe-page and detail-fetch caps).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-greeting/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.career.greetinghr.com`, confirmed with the
    named real tenant `ablelabs` (ABLE Labs, `https://ablelabs.career.greetinghr.com/` →
    `/ko/home`).
  - The server-rendered landing embeds the open-roles set in `__NEXT_DATA__` as the
    React-Query `["openings"]` query; parsing yielded a live opening (`openingId 139155`,
    "자동화 장비 제어 SW 엔지니어 (Python)") with occupation `소프트웨어`, employment
    `FULL_TIME_WORKER`, `openDate 2026-04-15`, group `에이블랩스`, mapping to the canonical
    detail URL `/ko/o/139155` (verified=true). The detail API
    `GET /ats/v3.5/career/workspaces/1137/openings/139155` returned HTTP 200 with the HTML
    body. Other Greeting-powered tenants seen: `hanwha-finance`, `maplestoryworlds`.
