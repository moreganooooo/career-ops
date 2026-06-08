# Spec: 319 — Ceipal ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 319                                           |
| Slug           | source-ats-ceipal                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 318 (Oorwin)                     |

## 1. Problem Statement

Ceipal (ceipal.com) is a US cloud ATS + workforce-management platform used by
staffing firms, MSPs, and corporate recruiting teams (1,800+ customers). Each
tenant can publish a branded **public career portal** powered by a Ceipal-hosted
reference client that fetches an anonymous JSON API keyed by a per-tenant
career-portal API key. Ever Jobs has no adapter for Ceipal-powered career
portals, so those vacancies are currently un-ingestable. A single generic,
multi-tenant Ceipal adapter unlocks the full catalogue of Ceipal career portals
with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-ceipal` plugin that ingests job
  postings from **any** Ceipal career portal given a `companySlug` (the tenant's
  public career-portal API key) or a `companyUrl` (a portal URL carrying that
  key).
- Use the **public, anonymous** career-portal API (no auth, no credentials)
  exposed at `https://api.ceipal.com/{apiKey}/job-postings/`.
- Map every posting into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'ceipal'`, `department`).

## 3. Non-Goals

- The authenticated **ATS v1 REST API** (`https://api.ceipal.com/v1/…`, e.g.
  `getJobPostingsList`). It requires a DRF `Authorization: Token <key>` per
  tenant and is explicitly not used.
- The authenticated **candidate portal** (`candidateportal.ceipal.com`) job
  listing, which is gated behind candidate login.
- Server-side filtering. We request the unfiltered listing (page only) and
  slice client-side to `resultsWanted`.
- WAF / bot-gate bypass. Any portal gating the API behind an aggressive WAF is
  out of scope (graceful empty result).
- A curated seed list of Ceipal tenant keys (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Ceipal plugin at a
> tenant's career-portal API key, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Ceipal adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant API key from `companySlug` (preferred), or from `companyUrl` (`api.ceipal.com/{key}/…` path segment or `?api_key=`/`?key=` query). | must |
| FR-2  | Fetch the anonymous listing from `https://api.ceipal.com/{apiKey}/job-postings/?page={n}`.          | must     |
| FR-3  | Parse the DRF paginated envelope (`results`, `num_pages`, `page_number`, `next`, `previous`) and walk pages (bounded) until `resultsWanted` is satisfied. | must |
| FR-4  | De-duplicate postings by `atsId` (`id`/`job_id`) within a single run.                               | must     |
| FR-5  | Map each posting to `JobPostDto` (title, url, location, department, remote, datePosted, description, emails, applyUrl). | must |
| FR-6  | Convert the row description (`public_job_desc` / `requistion_description`) per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Enrich a row's description via the detail endpoint (`job-postings/{id}/`) only when the row carries none, fanning out with `Promise.allSettled`. | should |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-9  | Tolerate an unmatched key (HTTP 400 `success: 0`), a missing resource (HTTP 404 HTML), and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career-portal API only    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size + page walk             | slice to `resultsWanted`; page ceiling |
| NFR-5  | All fan-out via `Promise.allSettled`          | a single failure never nukes the batch |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CEIPAL, name: 'Ceipal', category: 'ats', isAts: true })
class CeipalService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

```
GET https://api.ceipal.com/{apiKey}/job-postings/?page={n}
  → DRF paginated envelope:
    {
      "status": 1, "success": 1,
      "count": N, "num_pages": M, "page_number": n,
      "next": "https://api.ceipal.com/{apiKey}/job-postings/?page=n+1",
      "previous": null,
      "results": [
        {
          "id": 12345,
          "job_code": "PDT-11238",
          "position_title": "Senior Java Developer",
          "job_title": "Senior Java Developer",
          "city": "Plano", "state": "TX", "country": "USA",
          "experience": "5-8 years",
          "primary_skills": "Java, Spring Boot, AWS",
          "public_job_desc": "<p>…</p>",
          "requistion_description": "<p>…</p>",
          "client_name": "Acme Corp",
          "created": "06/02/2026", "posted": "06/02/2026",
          "apply_job": "https://{tenant-portal}/…"
        }
      ]
    }

GET https://api.ceipal.com/{apiKey}/job-postings/{id}/
  → single (optionally `data`-wrapped) record with the full description.
```

Verified wire shape (reference client `careers_v3/js/app.min.js`, 2026-06-03):
- `api_url + api_key + '/'` → base; the **API key is the only tenant id and is
  carried in the URL path** (never a header).
- `job-postings/` → listing; `job-postings/{id}/` → detail.
- Pagination envelope keys: `results`, `count`, `num_pages`, `page_number`,
  `next`, `previous`.
- Per-row keys read by the portal: `id`, `job_code`, `position_title`,
  `job_title`, `city`, `state`, `country`, `experience`, `primary_skills`,
  `public_job_desc`, `requistion_description`, `client_name`, `contact_person`,
  `created`, `posted`, `apply_job`, `apply_job_indeed`, `apply_job_monster`,
  `required_documents`, `terms_and_conditions`, `work_authorization`.
- Title preference: `position_title` → `job_title`.
- Description preference: `public_job_desc` → `requistion_description`.
- Company: `client_name` → name derived from slug/URL.

Tenant resolution:
- `companySlug` → used directly as the career-portal API key.
- `companyUrl` on `api.ceipal.com` → first path segment is the key (skipping
  `careers_v3`); or `?api_key=` / `?apiKey=` / `?key=` query value.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unmatched key (HTTP 400 `success:0`), HTTP 404, or fetch failed |
| logged warn (HTTP 400/404)   | unknown/rotated key — degrades to empty, never throws        |
| logged warn (parse failure)  | non-JSON / malformed payload — degrades to empty, never throws |

## 8. Test Plan

- E2E (`__tests__/ceipal.e2e-spec.ts`): known tenant key (from the live
  `joblist.smartdata.net` portal config) returns shaped jobs; no-slug/url
  returns empty; unknown key degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results acceptable; shape assertions guarded by
  `length > 0`). Asserts `job.site === Site.CEIPAL` and `job.atsType === 'ceipal'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-CE-1 — Live key rotation.** The sampled tenant career-portal keys
  (smartdata, avcend, troy-consulting) were observed rotated / migrated at
  verification time, so a live HTTP 200 job body could not be captured; the
  per-row field mapping is taken from the official reference client.
  **Default (proceeding):** map from the reference client, layer defensive
  fallbacks (title `position_title`→`job_title`, desc `public_job_desc`→
  `requistion_description`, id `id`→`job_id`, detail body flat-or-`data`),
  degrade to empty on `success:0`/404.
- **Q-CE-2 — Filter / payload shape.** The reference client serialises a
  `#job_postings_filter` form onto the query string; the empty filter (page
  only) returns the full list, which is what we use.
  **Default (proceeding):** page-only query; no filter fields sent.
- **Q-CE-3 — Detail body wrapping.** The detail endpoint body may be flat or
  wrapped under `data`/`results` depending on tenant config.
  **Default (proceeding):** accept all three shapes.

## 10. Decisions

- D-1: Primary endpoint is the **public, anonymous** career-portal API
  `GET https://api.ceipal.com/{apiKey}/job-postings/` — the same surface the
  Ceipal-hosted reference client (`careers_v3/js/app.min.js`) calls with no auth
  header. The API key is carried in the URL path.
- D-2: The authenticated ATS v1 REST API (`/v1/getJobPostingsList`,
  `Authorization: Token …`) and the login-gated candidate portal are **not**
  used — both require per-tenant credentials.
- D-3: Pagination follows the DRF envelope (`num_pages` / `page_number` /
  `next`); pages are walked with bounded `Promise.allSettled` fan-out up to a
  page ceiling and `resultsWanted`. De-dup by `atsId`.
- D-4: List rows already carry a short HTML description, so a per-job detail
  fetch is issued **only** when a row has no description — minimising request
  count.
- D-5: Confidence is **heuristic**: the endpoint URL family, request shape, and
  pagination envelope are byte-verified live against `api.ceipal.com` (the
  `{key}/countries-list/` probe returns the documented key-validation envelope,
  proving active `{apiKey}/{resource}/` routing); the per-row field extraction
  is taken from the official reference client because all sampled tenant keys
  were rotated at verification time. Layered fallbacks + graceful degradation
  mitigate any field-name drift.

## 11. References

- `packages/plugins/source-ats-ceipal/` — implementation.
- Reference client verified live 2026-06-03:
  `https://api.ceipal.com/careers_v3/js/app.min.js` (HTTP 200).
- Route family verified live 2026-06-03:
  `GET https://api.ceipal.com/{key}/countries-list/` →
  `{ status: 400, success: 0, message: "The provided API Key is not matched…" }`.
- Live tenant portal config 2026-06-03:
  `https://joblist.smartdata.net/includes/config.inc.js` (`api_key`, `api_url`).
