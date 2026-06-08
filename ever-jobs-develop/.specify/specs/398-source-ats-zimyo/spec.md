# Spec: 398 — Zimyo ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 398                                           |
| Slug           | source-ats-zimyo                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

Zimyo (zimyo.com, India — a fast-growing HRMS + recruitment / ATS suite serving 2500+
organisations) hosts a public, candidate-facing career board for every customer tenant,
keyed by a numeric **organisation id**. The candidate-facing site is a single-page
(Vite/React) widget app at `https://zimyo.work/recruit`; it ships no embedded role data
and hydrates from a **public JSON widget API** on the ATS backend host
(`https://ats.zimyo.work/ats/ats`) with no authentication, no API key, and no per-tenant
token. So every Zimyo tenant board is directly ingestable without a headless browser.
Ever Jobs has no adapter for Zimyo-powered career boards, so these (India-heavy) vacancy
catalogues are currently un-ingestable. A single generic, multi-tenant Zimyo adapter
unlocks the full catalogue of Zimyo-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-zimyo` plugin that ingests roles from **any**
  Zimyo career board given a `companySlug` (the numeric tenant org id, e.g. `1`) or a
  `companyUrl` (a `zimyo.work` career URL whose path encodes the base64 org id, which the
  adapter decodes).
- Use the **public, anonymous** widget API (no auth, no API key): the paginated
  `widget/joblist2?id={orgId}` open-roles list, enriched per-role from
  `widget/jobDetails?jobId={JOB_ID}` (the full HTML body + structured workplace type), and
  the tenant brand from `widget/orgDetails?org_id={orgId}`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'zimyo'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Zimyo ATS dashboard API (the `jobs/*`, `candidate/*`, and
  `configuration/*` routes require a logged-in recruiter token / per-tenant context). This
  plugin consumes only the public candidate-facing widget API.
- Server-side filtering by department / location / work type (the board supports these
  facets via `department_id` / `location_id` / `job_type`). We ingest the tenant's full
  role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Zimyo tenant org ids (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Zimyo plugin at a tenant's org id,
> so that I ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Zimyo adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the org id from `companySlug` (a bare numeric org id) or from a `companyUrl` on a `zimyo.work` host (the base64 path segment decodes to the org id). | must |
| FR-2  | Page the public `widget/joblist2?id={orgId}&per_page={n}&page={p}` list until `resultsWanted` / the reported `totalCount` is reached, bounded by a page cap. | must |
| FR-3  | Read each role's `JOB_ID` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-4  | Enrich each role from `widget/jobDetails?jobId={JOB_ID}` for the HTML `JOB_DESCRIPTION` + structured `ALL_DETAILS.WORKPLACE_TYPE`; degrade to the list fields when the detail call fails. | should |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `/recruit/career/details/{base64(jobId)}/{base64(orgId)}`. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the paged role set, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown orgs (HTTP 4xx / `error:true`), network errors, empty boards, and malformed payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous widget API      |
| NFR-2  | A fetch failure or unknown org must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | call the public JSON widget API  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ZIMYO, name: 'Zimyo', category: 'ats', isAts: true })
class ZimyoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://ats.zimyo.work/ats/ats/widget/joblist2?id={orgId}&per_page={n}&page={p}
  → { "error": false, "code": 200, "data": {
        "result": [ { "JOB_ID": 11268, "JOB_TITLE": "Software Engineer Intern",
                      "DEPARTMENT_NAME": "Engineering", "LOCATION_NAME": "…",
                      "EMPLOYEMENT": "Interns", "CREATED_ON": "12/08/2024" }, … ],
        "totalCount": 0, "page": 1 } }

GET https://ats.zimyo.work/ats/ats/widget/jobDetails?jobId={JOB_ID}
  → { "data": { "jobDetail": {
        "JOB_TITLE": "…", "JOB_ID": 11268, "ORG_ID": 1, "DEPARTMENT_NAME": "Engineering",
        "STREET_ADDRESS": "Rider House, Sector 44, Gurugram, Haryana 122003, India",
        "JOB_DESCRIPTION": "<p>…HTML…</p>", "ENTITY_NAME": "Zimyo",
        "CREATED_ON": "12/08/2024", "OPEN_TILL_DATE": "31/12/2024",
        "ALL_DETAILS": "{\"WORKPLACE_TYPE\":\"On-site\",\"EMPLOYEMENT_TYPE\":\"Interns\",…}" } } }

GET https://ats.zimyo.work/ats/ats/widget/orgDetails?org_id={orgId}
  → { "data": [ { "ORG_NAME": "Zimyo", "ORG_ADDRESS": "…", "ORG_LOGO": "…" } ] }

Canonical per-role detail / apply URL:
  https://zimyo.work/recruit/career/details/{base64(JOB_ID)}/{base64(orgId)}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `JOB_ID`                                            | `atsId`, `id`           | `id` is prefixed `zimyo-{atsId}`; role skipped if absent     |
| `JOB_TITLE`                                         | `title`                 | required; role skipped if absent                            |
| `/recruit/career/details/{b64(JOB_ID)}/{b64(orgId)}` | `jobUrl`, `applyUrl`  | canonical public detail URL (also hosts the apply flow)     |
| `JOB_DESCRIPTION` (detail, HTML)                    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `CREATED_ON` (`DD/MM/YYYY`)                         | `datePosted`            | reordered + parsed → `YYYY-MM-DD`                           |
| `LOCATION_NAME` / `STREET_ADDRESS`                  | `location`              | free-text location (city slot); null when none              |
| `ALL_DETAILS.WORKPLACE_TYPE` (`Remote`) + title/location/department regex | `isRemote` | structured flag first, then text regex          |
| `DEPARTMENT_NAME`                                   | `department`            | when present                                                |
| `EMPLOYEMENT` / `ALL_DETAILS.EMPLOYEMENT_TYPE`      | `employmentType`        | when present                                                |
| `orgDetails.ORG_NAME` / `ENTITY_NAME` (else org id) | `companyName`          | the list records carry no brand name                        |
| —                                                   | `site`                  | constant `Site.ZIMYO`                                       |
| —                                                   | `atsType`               | constant `'zimyo'`                                          |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Org resolution:

- `companySlug` (e.g. `1`) → used directly as the org id.
- `companySlug` containing a bare host / `zimyo.work` URL → org from the base64 path segment.
- `companyUrl` on a `zimyo.work` host → the last base64-numeric path segment is the org id
  (career routes `/recruit/career/details/{b64(jobId)}/{b64(orgId)}` and
  `/recruit/career/joblist/{b64(orgId)}`).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable org, unknown org (HTTP 4xx / `error:true`), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled org — degrades to empty, never throws                  |
| logged warn (detail failure) | per-role detail enrich failed — list fields still map, never throws       |

## 8. Test Plan

- E2E (`__tests__/zimyo.e2e-spec.ts`): known org (`companySlug: '1'`) returns shaped jobs
  (`site === Site.ZIMYO`, `atsType === 'zimyo'`, `atsId`/`jobUrl` defined); `companyUrl`
  (base64 path segment) resolution path exercised; no-slug/url returns empty; unknown org
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-ZI-1 — Tenant key.** Zimyo boards are keyed by a numeric org id, not a slug.
  **Default (proceeding):** accept the bare numeric org id as `companySlug`, and decode it
  from the base64 career-URL path segment for `companyUrl`.
- **Q-ZI-2 — Description location.** The list records are lightweight (id / title /
  department / location / employment / date); the full HTML body lives on the
  `jobDetails` endpoint. **Default (proceeding):** enrich each role from `jobDetails` for
  the body + structured workplace type, degrading to a null description when that call
  fails.
- **Q-ZI-3 — Company display name.** The list records carry no brand name. **Default
  (proceeding):** read `orgDetails.ORG_NAME` once per run (then `jobDetail.ENTITY_NAME`),
  falling back to a `Zimyo Org {id}` label.
- **Q-ZI-4 — Pagination end.** `joblist2` paginates and reports `totalCount`. **Default
  (proceeding):** page until `resultsWanted` / `totalCount` is reached or a short page
  signals the last page, bounded by a hard page cap.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON **widget API** on
  `https://ats.zimyo.work/ats/ats` that the candidate-facing SPA at `zimyo.work/recruit`
  hydrates from. **Confidence: verified** — the platform, the widget host (extracted from
  the SPA bundle's `BASE_URL`), and the endpoint shapes were confirmed live 2026-06-03:
  `widget/joblist2?id=1` returned `{ data: { result: [], totalCount: 0, page: 1 } }`
  (org `1` — Zimyo's own board, 0 live roles, exercising the empty-board path);
  `widget/jobDetails?jobId=11268` returned a real role (`Software Engineer Intern`,
  Engineering, Gurugram; full HTML body; `ALL_DETAILS.WORKPLACE_TYPE = "On-site"`);
  `widget/orgDetails?org_id=1` returned `{ ORG_NAME: "Zimyo", … }`. The canonical public
  detail URL `/recruit/career/details/MTEyNjg=/MQ==` base64-decodes to jobId `11268` /
  orgId `1`.
- D-2: The board is a client-rendered SPA (no SSR data island, no separate credentialed
  API); the adapter calls the public JSON widget API directly — no headless browser.
- D-3: Each list role carries `JOB_ID`, `JOB_TITLE`, `DEPARTMENT_NAME`, `LOCATION_NAME`,
  `EMPLOYEMENT`, `CREATED_ON`. The numeric `JOB_ID` is the stable per-role ATS id; the
  rich HTML body + structured `WORKPLACE_TYPE` come from the per-role detail endpoint.
- D-4: `joblist2` paginates; the adapter pages it, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by a page cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing (including the stringified `ALL_DETAILS` JSON) so minor shape
  drift never throws.

## 11. References

- `packages/plugins/source-ats-zimyo/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + public widget host `https://ats.zimyo.work/ats/ats` (from the SPA bundle's
    `BASE_URL`), candidate-facing SPA at `https://zimyo.work/recruit`.
  - `widget/joblist2?id=1` → HTTP 200 `{ data: { result, totalCount, page } }` (0 live
    roles for org `1`, exercising the empty-board path); `widget/jobDetails?jobId=11268`
    → a real role with a full HTML `JOB_DESCRIPTION` and `ALL_DETAILS.WORKPLACE_TYPE`;
    `widget/orgDetails?org_id=1` → `{ ORG_NAME: "Zimyo" }`. The canonical detail URL
    `/recruit/career/details/MTEyNjg=/MQ==` decodes to jobId `11268` / orgId `1`
    (verified=true).
