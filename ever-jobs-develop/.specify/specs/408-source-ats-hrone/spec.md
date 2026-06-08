# Spec: 408 — HROne ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 408                                           |
| Slug           | source-ats-hrone                              |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 332 (HR-ON Recruit)           |

## 1. Problem Statement

HROne (hrone.cloud, an India-based HRMS founded 2016, trusted by 2000+ organisations) ships a
recruitment module whose **public, candidate-facing career portal** is served per tenant on a
sub-domain of the shared host `https://{tenant}.hrone.cloud/career-portal`. The portal is an
Angular single-page app that loads its open roles client-side from an **anonymous,
app-id-scoped job-opening feed** on the tenant API host
`https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1` (no bearer token / no
user session — the per-tenant `appId` plays the role of a publishable read key, paired with a
`domainCode`). Ever Jobs has no adapter for HROne-powered career portals, so these (India-heavy
SMB / enterprise) vacancy catalogues are currently un-ingestable. A single generic,
multi-tenant HROne adapter unlocks HROne-powered career portals with one plugin.

> **Not** HR-ON Recruit (`source-ats-hron`, hr-on.com — a Danish ATS). HROne is the Indian
> HRMS at hrone.cloud; the two are unrelated platforms kept as separate plugins.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hrone` plugin that ingests roles from **any** HROne
  career portal given a `companySlug` (the tenant sub-domain label, e.g. `joy`) or a
  `companyUrl` (a career-portal URL on a `hrone.cloud` host, from which the tenant label and
  the `appId` + `dc` read key are derived).
- Use the **public, anonymous** surface (no logged-in session): the tenant API host's
  job-opening feed `POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1`
  with body `{ positionId: 0, pagination: { pageNumber, pageSize } }` and headers
  `apiKey: {appId}`, `domainCode: {dc}`, `AccessMode: W`.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'hrone'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated internal HRMS REST API (it requires a logged-in user session token). This
  plugin consumes only the public, app-id-scoped career-portal feed on the tenant API host.
- Server-side filtering by category / location / type / experience. We ingest the tenant's
  full role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- Reproducing the SPA's anti-bot signed request token (`rqt`); the adapter sends the documented
  anonymous read headers and degrades gracefully when a tenant gates the feed.
- A curated seed list of HROne tenant sub-domains / appIds (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the HROne plugin at a tenant's career-portal
> sub-domain (and its `appId`/`dc` read key), so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the HROne adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.hrone.cloud`) or from a `companyUrl` on a `hrone.cloud` host (leading sub-domain label is the tenant; `appId` + `dc` taken from the query string; a leading `api.` host label stripped). | must |
| FR-2  | POST the public job-opening feed `/api/recruitment/referralposting/v1` on `api.{tenant}.hrone.cloud` with `{ positionId: 0, pagination }` and the anonymous `apiKey` / `domainCode` / `AccessMode: W` headers. | must |
| FR-3  | Narrow the postings array from the response envelope defensively (bare array, `{ data }`, `{ result }`, `{ items }`, `{ jobOpenings }`, `{ postings }`); drain pages bounded by a page cap, stopping on a short / empty page. | must |
| FR-4  | Use each posting's `positionId` (else `requestId` / `jobCode`) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), using the tenant career-portal page as the canonical detail / apply URL. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), missing read key (HTTP 403), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous app-id-scoped feed |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HRONE, name: 'HROne', category: 'ats', isAts: true })
class HrOneService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, app-id-scoped; surface researched live 2026-06-03):

```
POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1
  headers: { apiKey: "{appId}", domainCode: "{dc}", AccessMode: "W" }
  body:    { "positionId": 0, "pagination": { "pageNumber": 1, "pageSize": 200 } }
  → JSON envelope (shape parsed defensively — see Surface confidence):
      { "items": [
          { "positionId": 1024, "jobCode": "ENG-014", "jobTitle": "Backend Engineer",
            "cityName": "Noida", "stateName": "Uttar Pradesh", "countryName": "India",
            "departmentName": "Engineering", "employmentType": "Full Time",
            "description": "<p>…</p>", "experience": "3-5 years",
            "salary": null, "noOfPosition": 2, "postedOn": "2026-05-20T10:00:00Z" }
        ] }

Canonical per-role detail / apply URL:
  https://{tenant}.hrone.cloud/career-portal?appId={appId}&dc={dc}&positionId={positionId}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `positionId` (else `requestId` / `jobCode`)         | `atsId`, `id`           | `id` is prefixed `hrone-{atsId}`; role skipped if absent    |
| `jobTitle`                                          | `title`                 | required; role skipped if absent                            |
| portal URL (`career-portal?appId&dc&positionId`)    | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` (else `jobDescription`)               | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `postedOn` / `postingDate` / `createdOn`            | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `cityName`, `stateName`, `countryName`              | `location`              | structured city / state / country; null when none           |
| title / location / department regex                 | `isRemote`              | text regex (`remote`/`home office`/`wfh`…)                  |
| `departmentName`                                    | `department`            | when present                                                |
| `employmentType` (else `jobType`)                   | `employmentType`        | e.g. `Full Time`                                            |
| de-slugified tenant label                           | `companyName`           | the feed carries no brand name                              |
| —                                                   | `site`                  | constant `Site.HRONE`                                       |
| —                                                   | `atsType`               | constant `'hrone'`                                          |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant + read-key resolution:

- `companySlug` (e.g. `joy`) → tenant `joy`; `domainCode` defaults to the slug; no `apiKey`.
- `companySlug` containing a bare host / `hrone.cloud` → tenant + `appId`/`dc` from the URL.
- `companyUrl` on a `hrone.cloud` host → leading sub-domain label is the tenant (`api.` prefix
  stripped; `www` / `app` / `api` rejected); `appId` from `?appId=`, `dc` from `?dc=` (else
  `?domainCode=`).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), missing key (403), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant / missing read key — degrades to empty, never throws |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/hrone.e2e-spec.ts`): known tenant (`companySlug: 'joy'`) returns shaped jobs
  when reachable (`site === Site.HRONE`, `atsType === 'hrone'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path (with a real `appId` + `dc`) exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero
  results is acceptable — the live feed is gated by a signed request token; shape assertions
  guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HO-1 — Public read-key scoping.** The career-portal feed is anonymous but app-id-scoped:
  the SPA sends `apiKey` (the per-tenant `appId`) + `domainCode` headers via an
  `GetUnauthorized…WithAppId` helper (no user session). **Default (proceeding):** carry the
  `appId` + `dc` from the `companyUrl` query string; fall back to the slug as the `domainCode`
  and send no `apiKey` when only a slug is known (degrading to empty if the tenant requires a
  key).
- **Q-HO-2 — Anti-bot request token.** The live POST is gated by a per-session signed request
  token (`rqt`) the SPA mints, returning HTTP 403 to a non-browser client. **Default
  (proceeding):** send the documented anonymous read headers and treat a 403 as a graceful
  empty result; the adapter never reproduces the token (no headless browser).
- **Q-HO-3 — Response envelope shape.** The exact wrapper could not be confirmed via a clean
  anonymous fetch. **Default (proceeding):** parse defensively — try a bare array, `{ data }`,
  `{ result }`, `{ items }`, `{ jobOpenings }`, `{ postings }` — and narrow whichever yields
  the postings array, so real-shape drift never throws.
- **Q-HO-4 — Stable per-role id.** **Default (proceeding):** use `positionId`, else
  `requestId`, else `jobCode`; the canonical public URL deep-links via `positionId`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, app-id-scoped per-tenant career-portal
  job-opening feed `POST https://api.{tenant}.hrone.cloud/api/recruitment/referralposting/v1`.
  **Confidence: verified=false (defensive).** The platform, the `{tenant}.hrone.cloud`
  addressing, the `api.{tenant}.hrone.cloud` API host, the endpoint path, the
  `{ positionId, pagination }` request body, and the `apiKey` + `domainCode` + `AccessMode: W`
  header mechanism were all confirmed live 2026-06-03 from the portal's own Angular bundle + a
  real career-portal link on a named real tenant (`joy` — HROne's own demo/career portal, real
  `appId` + `dc=joy`). A live `GET .../JobOpening/Search` returned HTTP 405 (endpoint exists,
  wrong method), proving the API host + path are real. The exact JSON response envelope + role
  field names were NOT confirmable: the live `referralposting/v1` POST returned HTTP 403 behind
  a per-session signed request token (`rqt`) the SPA mints, which a non-browser client cannot
  reproduce. The role field names are derived from the bundle's own data bindings; the wrapper
  is parsed defensively. verified=false.
- D-2: The feed is consumed as a JSON REST endpoint (not a SPA needing a headless browser, and
  not the authenticated internal HRMS API needing a session); the adapter POSTs JSON and
  narrows the postings array defensively.
- D-3: Each posting carries a numeric `positionId` (stable ATS id), `jobTitle`, structured
  `cityName` / `stateName` / `countryName`, `departmentName` (department), `employmentType`
  (employment type), and a `description`. The canonical detail / apply URL is the tenant
  career-portal page deep-linked by `positionId`.
- D-4: The feed paginates; the adapter requests `pageSize=200`, drains pages bounded by a page
  cap, dedupes by `atsId`, stops on a short / empty page, and stops once `resultsWanted` roles
  are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-hrone/` — implementation.
- Surface researched live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.hrone.cloud/career-portal`, confirmed with the
    named real tenant `joy` (HROne's own demo/career portal) and its real `appId` + `dc=joy`
    read key harvested from the public link on hrone.cloud.
  - The API host `https://api.{tenant}.hrone.cloud` and endpoint path
    `POST /api/recruitment/referralposting/v1` with the `{ positionId, pagination }` body and
    the anonymous `apiKey` + `domainCode` + `AccessMode: W` headers — all extracted from the
    portal's own Angular bundle (`main.*.js`). A live `GET .../JobOpening/Search` returned HTTP
    405 (endpoint real, wrong method); the `referralposting/v1` POST returned HTTP 403 behind a
    signed request-token gate. Confidence: **verified=false** (defensive adapter from strong
    public evidence; response body shape assumed).
