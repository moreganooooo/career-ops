# Spec: 313 — Factorial ATS Source Plugin

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| Spec ID        | 313                                     |
| Phase          | 322                                     |
| Slug           | source-ats-factorial                    |
| Status         | done                                    |
| Owner          | scheduled-agent                         |
| Created        | 2026-06-03                              |
| Last updated   | 2026-06-03                              |
| Supersedes     | (none)                                  |
| Related specs  | 301 (Niceboard), 300 (ClearCompany)     |

## 1. Problem Statement

Factorial (factorialhr.com) is an HRIS platform with an integrated ATS that
hosts public career pages for every tenant at
`https://{slug}.factorialhr.com`. Ever Jobs currently has no adapter for
Factorial-powered career pages, leaving those job listings un-ingestable.
A single generic, multi-tenant Factorial adapter unlocks any tenant's open
roles given only the sub-domain slug.

## 2. Goals

- Add a generic, multi-tenant `source-ats-factorial` plugin that ingests
  jobs from any Factorial-hosted tenant career page given a `companySlug`
  (sub-domain label) or a `companyUrl`.
- Use only the **public** career-page surfaces (no credentials, no private
  API keys).
- Map every position to the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'factorial'`, `department`).

## 3. Non-Goals

- The authenticated REST API (`api.factorialhr.com/api/v1/ats/…`) which
  requires OAuth2 bearer credentials. It is explicitly not used.
- WAF / Cloudflare bypass via browser fingerprinting. Any tenant whose
  career page returns 4xx behind an aggressive WAF is out of scope this
  iteration (graceful empty result).
- Server-side keyword / location filtering. The entire job list is fetched
  and sliced client-side to `resultsWanted`.
- A curated seed list of Factorial tenants (handled separately).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Factorial plugin at a
> tenant slug so that I ingest that tenant's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Factorial adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract).

## 5. Functional Requirements

| ID    | Requirement                                                                                                          | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug`, or from the first sub-domain label of `companyUrl`.                        | must     |
| FR-2  | Fetch the career-page index (`GET /`) and parse all `data-controller='job-postings'` elements.                       | must     |
| FR-3  | Fetch the sitemap (`GET /sitemap.xml`) to obtain `lastmod` dates for each job URL.                                   | should   |
| FR-4  | Fan-out concurrent detail-page fetches (`GET /job_posting/{slug}-{id}`) to obtain descriptions and apply URLs.       | must     |
| FR-5  | De-duplicate positions by ATS id within a single run.                                                                | must     |
| FR-6  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl).          | must     |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                                               | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 400/404) and fetch failures without throwing (partial/empty results OK).        | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public HTML surfaces only       |
| NFR-2  | A fetch failure must not throw               | graceful empty/partial result   |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeout + proxy support    |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FACTORIAL, name: 'Factorial', category: 'ats', isAts: true })
class FactorialService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream surfaces (public, anonymous, verified 2026-06-03):

```
GET https://{slug}.factorialhr.com/
  → server-rendered HTML; job entries in data-controller='job-postings' elements

GET https://{slug}.factorialhr.com/sitemap.xml
  → XML with <url><loc>…/job_posting/{title-slug}-{id}</loc><lastmod>YYYY-MM-DD</lastmod></url>

GET https://{slug}.factorialhr.com/job_posting/{title-slug}-{id}
  → server-rendered HTML; description in <div class='styledText'>
    apply link at <a href='/apply/{slug}'>Apply now</a>
```

Index-page data attributes per job:
```
data-controller='job-postings'
data-job-postings-url='https://{slug}.factorialhr.com/job_posting/{title-slug}-{id}'
data-is-remote='false'
data-location-id='318886'
data-team-id='95948'
data-contract-type='indefinite'
```

Job ID extraction: last hyphen-separated numeric token in the URL path
(e.g. `ai-developer-304592` → id `304592`).

### 7.2 Errors

| Code / Behaviour            | Meaning                                                              |
| --------------------------- | -------------------------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (HTTP 400/404), or fetch failed          |
| logged warn (HTTP 400/404)  | unknown/dead tenant — degrades to empty, never throws                |
| logged warn (detail fail)   | a single detail-page fetch failed — other jobs still map             |

## 8. Test Plan

- E2E (`__tests__/factorial.e2e-spec.ts`): known tenant (`jobs-tendencys`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results
  acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: `Site.FACTORIAL` exists in the enum; module/path/jest
  mapper added centrally by the orchestrator.

## 9. Open Questions

- **Q-FAC-1 — WAF gating.** Some tenants may sit behind an aggressive CDN
  or WAF. Graceful empty result on 4xx.
- **Q-FAC-2 — Custom domains.** Some Factorial tenants may use a fully
  custom domain (e.g. `careers.company.com`) rather than the standard
  `{slug}.factorialhr.com` sub-domain. The adapter resolves the first
  sub-domain label from `companyUrl` as a best-effort fallback, but a
  truly custom (non-factorialhr.com) domain requires the caller to pass
  the full URL.

## 10. Decisions

- D-1: Use the public HTML surfaces only; the authenticated REST API
  (`api.factorialhr.com/api/v1/ats/…`) requires OAuth2 credentials and is
  not used.
- D-2: Job discovery is via the index-page HTML (data-* attributes); the
  sitemap provides `lastmod` dates; detail pages provide descriptions and
  apply URLs.
- D-3: Detail-page fetches are fanned out in bounded concurrent chunks
  (`FACTORIAL_MAX_CONCURRENCY = 6`) via `Promise.allSettled`; a single
  detail failure never aborts the batch.
- D-4: Job id is extracted as the last numeric token in the URL path slug.

## 11. References

- `packages/plugins/source-ats-factorial/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling HTML career-page adapter pattern.
- Verified live tenant: `jobs-tendencys.factorialhr.com` (2026-06-03, 22 jobs).
