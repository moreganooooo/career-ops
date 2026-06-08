# Spec: 297 — Cornerstone OnDemand (CSOD) ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 297                                |
| Slug           | source-ats-cornerstone             |
| Status         | done                               |
| Owner          | scheduled-agent (run #401)         |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 006, 013, 296 (ATS parity batches) |

## 1. Problem Statement

Cornerstone OnDemand (CSOD) Recruiting hosts the public careers sites of a large
number of enterprises, universities, healthcare systems, and public-sector
employers. Each tenant lives at `https://{client}.csod.com` with a candidate
career site at `/ux/ats/careersite/{careerSiteId}/home`. Ever Jobs has adapters
for ~46 ATS platforms but **none for Cornerstone**, so every CSOD-hosted career
site is currently un-ingestable except via brittle company-specific scrapers. A
single generic, multi-tenant Cornerstone adapter unlocks a large catalogue of
roles (especially government / education / healthcare) with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-cornerstone` plugin that ingests jobs
  from **any** CSOD-powered careers site given a `companySlug` or a
  custom-domain `companyUrl`.
- Use the **public** career-site job-search API (no operator/OAuth credentials)
  so no secrets are required.
- Map every requisition into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'cornerstone'`, `department`).
- Paginate efficiently with bounded concurrent page fan-out.

## 3. Non-Goals

- WAF / Cloudflare bypass via browser TLS fingerprinting. Tenants behind an
  aggressive WAF that 403s plain HTTPS are out of scope for this iteration
  (tracked as a follow-up; see Open Questions).
- OAuth 2.0 / ClientId+ClientSecret integration against the official CSOD
  Recruiting REST API (`/services/api/...`, `/services/x/job-requisition/...`).
  That path requires per-tenant operator credentials and is explicitly avoided;
  this plugin only uses the anonymous candidate-facing flow.
- Per-requisition detail enrichment for fields not present in the listing search
  payload. The external search response already embeds `externalDescription`, so
  no follow-up GET per job is needed in the common case.
- Multi-portal `careerSiteId` auto-discovery. We default to `1` (the single-portal
  norm) and accept an override via `siteNumber`; enumerating every portal of a
  multi-site tenant is deferred.
- A curated seed list of CSOD tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Cornerstone plugin at a
> tenant slug, so that I ingest that employer's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Cornerstone adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` → `https://{slug}.csod.com`, or from `companyUrl`.   | must     |
| FR-2  | Bootstrap an anonymous bearer token + regional cloud API host by scraping the public career-site page. | must     |
| FR-3  | Search requisitions via `POST {cloud}/rec-job-search/external/jobs` with `careerSiteId`, `pageNumber`, `pageSize`. | must     |
| FR-4  | Read `totalCount` from the first page and paginate (page size = 25) until `resultsWanted`.    | must     |
| FR-5  | De-duplicate requisitions by ATS id within a single run.                                      | must     |
| FR-6  | Map each requisition to `JobPostDto` (title, url, location, department, remote, datePosted, description). | must     |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                         | should   |
| FR-8  | Build canonical detail URL `/ux/ats/careersite/{siteId}/home/requisition/{reqId}?c={slug}`.   | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.         | must     |
| FR-10 | Tolerate unknown / dead tenants, missing tokens, and per-page failures without throwing.       | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | Remaining pages fetched concurrently         | ≤ 6 concurrent requests/tenant  |
| NFR-2  | A single failed page must not fail the batch | `Promise.allSettled` fan-out    |
| NFR-3  | No operator credentials / secrets required   | anonymous public token only     |
| NFR-4  | Polite pacing between pagination rounds       | 300–600 ms jittered delay       |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CORNERSTONE, name: 'Cornerstone', category: 'ats', isAts: true })
class CornerstoneService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, two-step):

```
# Step 1 — bootstrap (scrape token + regional cloud host)
GET https://{slug}.csod.com/ux/ats/careersite/{siteId}/home?c={slug}
  → HTML embedding  "token":"eyJ..."  and  "endpoints":{"cloud":"https://us.api.csod.com"}

# Step 2 — paged requisition search
POST {cloud}/rec-job-search/external/jobs
  Authorization: Bearer {token}
  { careerSiteId, careerSitePageId:1, pageNumber, pageSize:25, cultureId:1, cultureName:"en-US", searchText:"", … }
  → { data: { totalCount: number, requisitions: CornerstoneRequisition[] } }
```

### 7.2 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, dead tenant, no public token, or all pages failed |
| logged warn per failed page | a single page 4xx/5xx/transient — batch continues    |

## 8. Test Plan

- E2E (`__tests__/cornerstone.e2e-spec.ts`): known tenant (`ouc`, siteId 6)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (handled centrally by orchestrator).

## 9. Open Questions

- **Q-CS-1 — WAF fallback.** Some CSOD tenants sit behind a WAF that 403s plain
  HTTPS. A browser-fingerprint fallback would recover them but adds a heavyweight
  optional dependency. **Default (proceeding):** ship public-endpoint-only;
  record WAF tenants for a follow-up. Logged in `docs/questions.md`.
- **Q-CS-2 — Multi-portal siteId discovery.** Multi-portal tenants expose several
  `careerSiteId`s (2, 4, 5, 6, …). **Default (proceeding):** default to `1`,
  accept `siteNumber` override; auto-discovery deferred.

## 10. Decisions

- D-1: Primary flow is the **anonymous candidate** path: scrape the page-embedded
  JWT (whose `rurls` claim whitelists `rec-job-search/external`) and the regional
  `cloud` endpoint, then POST `/rec-job-search/external/jobs`. The official OAuth
  Recruiting REST API is rejected because it needs per-tenant credentials.
- D-2: `careerSiteId` defaults to `1`; overridable via `ScraperInputDto.siteNumber`.
  Culture defaults to `1` / `en-US`.
- D-3: Regional cloud host is read from the page (`"cloud":"https://…csod.com"`);
  falls back to `https://us.api.csod.com` when absent.
- D-4: Token is minted fresh per run from the bootstrap page, so ~1h expiry is a
  non-issue within a single scrape.
- D-5: `externalDescription` + `externalQualifications` are concatenated into the
  description, then converted per `descriptionFormat`.

## 11. References

- `packages/plugins/source-ats-cornerstone/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern, Spec 296).
- Public CSOD career-site job-search endpoint `rec-job-search/external/jobs`
  (verified live against the `ouc` tenant: page embeds anonymous token + `us.api.csod.com`).
- Canonical detail URL form `…/ux/ats/careersite/{siteId}/home/requisition/{reqId}?c={slug}`
  (verified across multiple live tenants).
