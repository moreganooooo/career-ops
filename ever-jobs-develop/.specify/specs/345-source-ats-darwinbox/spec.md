# Spec: 345 — Darwinbox ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 345                                           |
| Slug           | source-ats-darwinbox                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 330 (Prescreen)            |

## 1. Problem Statement

Darwinbox (darwinbox.com) is a large, India-headquartered, end-to-end cloud HRMS
suite widely deployed across India and South-East Asia. Every customer tenant
publishes a branded, public careers portal on its own sub-domain of the regional
Darwinbox host (`https://{tenant}.darwinbox.in/ms/candidate/careers`, or the
`.darwinbox.com` global region). That portal is a single-page Angular
application that hydrates its open roles client-side from the tenant's candidate
backend (`/ms/candidateapi/...`). Ever Jobs has no adapter for Darwinbox-powered
career pages, so these vacancies are currently un-ingestable. A single generic,
multi-tenant Darwinbox adapter unlocks the catalogue of Darwinbox-powered career
pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-darwinbox` plugin that ingests
  vacancies from **any** Darwinbox-powered careers portal given a `companySlug`
  (the tenant sub-domain label, e.g. `dbox`) or a `companyUrl` (a careers URL
  whose leading sub-domain label is the tenant).
- Use the **public, anonymous** candidate careers surface (no auth, no API key):
  the careers portal at `/ms/candidate/careers` and the candidate API at
  `/ms/candidateapi/...`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'darwinbox'`, `department`).
- Degrade gracefully — a Cloudflare bot challenge, an unknown tenant, an HTTP
  4xx, or a malformed payload returns an empty (or partial) result, never
  throws, so a single bad tenant never breaks a batch run.

## 3. Non-Goals

- Any authenticated Darwinbox recruiter / HRMS admin API (the `Fetch Job List`
  / `Fetch Job Detail` integration APIs require Basic-Auth or OAuth credentials
  granted on request; out of scope).
- Solving the Cloudflare Turnstile / WAF bot challenge that fronts the candidate
  backend (no headless-browser / CAPTCHA solving).
- Server-side filtering by department / location / function. We ingest the
  tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Darwinbox tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. Public Surface / API

```ts
@SourcePlugin({ site: Site.DARWINBOX, name: 'Darwinbox', category: 'ats', isAts: true })
class DarwinboxService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, probed live 2026-06-03 against `dbox`):

```
GET https://{tenant}.darwinbox.in/ms/candidate/careers
  → HTTP 200, an Angular SPA shell:
      <app-root></app-root>  with  <base href="/ms/candidate/">
    The lazy careers bundle defines the candidate-API base
      apiURL: "/ms/candidateapi/"
    and the job-data store (getTotalJobs, selectAllJobData, …).

GET https://{tenant}.darwinbox.in/ms/candidateapi/{jobListPath}?subdomain={tenant}
  → JSON envelope (when not bot-challenged):
      {
        "status": "success",
        "data": {
          "company_name": "…",
          "jobs": [
            {
              "id": "…", "job_title": "…", "department": "…",
              "location": "…", "city": "…", "country": "…",
              "employment_type": "Full Time", "work_mode": "Remote",
              "job_description": "…full job-ad HTML…",
              "posted_on": "2026-05-21",
              "apply_url": "https://{tenant}.darwinbox.in/ms/candidate/careers/…"
            }
          ]
        }
      }
```

**Live-verification note (2026-06-03, no authentication).** The careers portal
and the `{status,data}` candidate-API contract were both observed live:
`GET /ms/candidate/careers` → HTTP 200 Angular SPA; `GET
/ms/candidateapi/getCompanyDetails` → HTTP 404 with
`{"status":"error","data":{"message":"The requested resource could not be found
…"}}`, byte-confirming the envelope shape. However, the candidate backend sits
behind a **Cloudflare WAF / Turnstile** bot gate: most anonymous endpoint
variants return an HTTP 403 Cloudflare challenge page rather than JSON, so the
exact public job-list endpoint segment and its full job-record field names could
**not** be observed end-to-end without solving the challenge. The job-list path
and record fields below are therefore modelled **defensively** (multiple
candidate paths tried in order; snake_case primary + camelCase aliases), and the
adapter's returned metadata is marked **`verified: false`**. The adapter still
compiles, fetches once per tenant, and degrades gracefully on every failure mode.

## 5. Data Mapping

Defensive wire shape → `JobPostDto` mapping:

| Source field (first non-empty alias)                                  | JobPostDto field      | Notes                                                  |
| --------------------------------------------------------------------- | --------------------- | ------------------------------------------------------ |
| `id` / `job_id` / `vacancy_id` / `job_key`                            | `atsId`, `id`         | `id` is prefixed `darwinbox-{atsId}`                   |
| `job_title` / `title` / `name` / `designation`                        | `title`               | required; job skipped if absent                        |
| `apply_url` / `job_url` / `url` / `link` (else `/careers/{key}`)      | `jobUrl`, `applyUrl`  | absolute; relative anchored to the live host           |
| `job_description` / `description_html` / `description` (else text)   | `description`         | format-converted (HTML / Markdown / Plain)             |
| `posted_on` / `created_at` / `updated_at`                            | `datePosted`          | ISO-8601 / `YYYY-MM-DD` → `YYYY-MM-DD`                 |
| `city` / `state` / `region` / `country` (else free-text `location`)  | `location`            | `region` → `state`; falls back to free-text location   |
| `is_remote` / `work_mode` / location / title text                     | `isRemote`            | `remote` / `work from home` / `wfh` detection          |
| `department` / `function`                                            | `department`          | structured department / function label                 |
| `employment_type` / `job_type`                                       | `employmentType`      | free-text label                                        |
| `company_name` (envelope `data`)                                     | `companyName`         | falls back to tenant-derived name                      |
| —                                                                     | `site`                | constant `Site.DARWINBOX`                              |
| —                                                                     | `atsType`             | constant `'darwinbox'`                                 |
| `description` text                                                    | `emails`              | harvested via `extractEmails`                          |

Tenant / host resolution:

- `companySlug` is the tenant sub-domain label (e.g. `dbox`), used verbatim.
- `companyUrl` → leading host label of a `*.darwinbox.in` / `*.darwinbox.com`
  URL (else the trailing path segment).
- The live host (region) is resolved by probing the careers portal on
  `.darwinbox.in` then `.darwinbox.com`, accepting the first that responds 2xx
  (or a 403 bot gate, which still indicates a live host).

## 6. Acceptance Criteria

| ID    | Criterion                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------ | -------- |
| AC-1  | Resolve a tenant label from `companySlug` (preferred) or the host/path of `companyUrl`.                | must     |
| AC-2  | Resolve the live regional host by probing the public careers portal on `.darwinbox.in` then `.com`.    | must     |
| AC-3  | Fetch the candidate job list (trying each candidate path) and read its jobs array.                     | must     |
| AC-4  | De-duplicate vacancies by `atsId` within a single run.                                                 | must     |
| AC-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| AC-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                              | should   |
| AC-7  | Honour `resultsWanted` (default 100 internally) by slicing the result list.                            | must     |
| AC-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                 | must     |
| AC-9  | Tolerate unknown tenants, the Cloudflare bot gate (HTTP 403), other 4xx, and parse failures without throwing (partial/empty OK). | must |
| AC-10 | All HTTP goes through the `@ever-jobs/common` client (UA, timeouts, proxy, caCert).                    | must     |

## 7. Risks

- **R-1 — Bot gate (primary risk).** The candidate backend is fronted by
  Cloudflare Turnstile / WAF; anonymous scripted requests may receive an HTTP
  403 challenge instead of JSON. *Mitigation:* the adapter treats 403 as a soft
  failure and degrades to an empty result; callers needing reliable ingestion
  can route through residential proxies (`input.proxies`). `verified: false`
  reflects this uncertainty.
- **R-2 — Endpoint-name drift.** The exact job-list path could not be confirmed
  past the bot gate. *Mitigation:* the adapter tries a list of candidate paths
  (`DARWINBOX_JOB_LIST_PATHS`) and accepts the first well-formed `{status,data}`
  envelope; the constant is easy to extend when a path is confirmed live.
- **R-3 — Field-name drift across tenants/versions.** *Mitigation:* the record
  type models snake_case primaries plus camelCase aliases and multiple synonyms
  per field; missing fields degrade to `null`, never throw.
- **R-4 — Region split.** Tenants live on `.darwinbox.in` or `.darwinbox.com`.
  *Mitigation:* probe both hosts in order and use the first that is live.
- **R-5 — Empty / private tenants.** Some portals require login. *Mitigation:*
  zero jobs is a valid, non-throwing outcome; tests tolerate it.

## 8. References

- `packages/plugins/source-ats-darwinbox/` — implementation.
- Live probe 2026-06-03: `https://dbox.darwinbox.in/ms/candidate/careers`
  (HTTP 200 Angular SPA exposing `apiURL: "/ms/candidateapi/"`); candidate-API
  envelope confirmed via `GET /ms/candidateapi/getCompanyDetails` → HTTP 404
  `{"status":"error","data":{...}}`.
- Public Darwinbox careers portals observed: `dbox`, `mordorintelligence`,
  `hetero`, `delhivery`, `spinzone` (all on `*.darwinbox.in/ms/candidate/careers`).
