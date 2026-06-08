# Spec: 310 — CATS ATS Source Plugin

| Field          | Value                                   |
| -------------- | --------------------------------------- |
| Spec ID        | 310                                     |
| Slug           | source-ats-catsone                      |
| Status         | done                                    |
| Owner          | scheduled-agent                         |
| Created        | 2026-06-03                              |
| Last updated   | 2026-06-03                              |
| Supersedes     | (none)                                  |
| Related specs  | 301 (Niceboard), 006 (Avature)          |

## 1. Problem Statement

CATS (catsone.com) is a recruiting ATS used by staffing agencies, executive search firms, and direct employers to manage open roles. Every customer tenant is served from its own sub-domain under `catsone.com` (e.g. `https://authoritypartnersinc.catsone.com`). Ever Jobs has adapters for many ATS platforms but **none for CATS**, so CATS-hosted career portals are currently un-ingestable. A single generic, multi-tenant adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-catsone` plugin that ingests jobs from **any** CATS-hosted portal given a `companySlug` (the tenant sub-domain label) or a `companyUrl`.
- Use only the **public, anonymous** HTML surface — no credentials are required.
- Map every position into the standard `JobPostDto` contract, including ATS-specific metadata (`atsId`, `atsType: 'catsone'`, `department`).

## 3. Non-Goals

- The authenticated REST API (`GET https://api.catsone.com/v3/portals/{id}/jobs` with `Authorization: Token <key>`). It requires a per-tenant secret and is not used.
- Automatic discovery across all CATS tenants (handled by the source-adoption backlog, not this plugin).
- Server-side keyword/location filtering. We pass the portal the unfiltered default query and slice client-side.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the CATS plugin at a tenant portal, so that I ingest that portal's full open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the CATS adapter to behave like every other ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                                         | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant host from `companySlug` (→ `https://{slug}.catsone.com`) or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Discover the portal listing path from the tenant root (`/careers/`) when `companyUrl` does not already contain one. | must |
| FR-3  | Page the portal listing via `?page=N`; a short page (fewer entries than the page size) signals the final page.      | must |
| FR-4  | Parse job stubs (title, URL, location, category) from `.cats-job` HTML elements with `.cats-job-title`, `.cats-job-location`, `.cats-job-category` children. | must |
| FR-5  | Fan out per-job detail fetches to retrieve HTML description; bounded concurrency via `Promise.allSettled`.           | should   |
| FR-6  | De-duplicate positions by ATS id (numeric job ID) within a single run.                                              | must     |
| FR-7  | Map each job to `JobPostDto` (title, url, location, department, remote, description, atsId, atsType).               | must     |
| FR-8  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                                              | should   |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                              | must     |
| FR-10 | Tolerate unknown / dead tenants (HTTP 400/404) and all fetch failures without throwing (partial/empty results OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                               | Target                         |
| ------ | ----------------------------------------- | ------------------------------ |
| NFR-1  | No credentials / secrets required         | public HTML surface only       |
| NFR-2  | A fetch failure must not throw            | graceful empty/partial result  |
| NFR-3  | All HTTP via `@ever-jobs/common` client   | UA + timeouts + proxy support  |
| NFR-4  | Bound result-set size                     | slice to `resultsWanted`       |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CATSONE, name: 'CATS', category: 'ats', isAts: true })
class CatsoneService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Public HTML surface (verified 2026-06-03):

```
GET https://{slug}.catsone.com/careers/
  → HTML listing portals; anchors match /careers/{portalID}-{name}

GET https://{slug}.catsone.com/careers/{portalID}-{name}[?page=N]
  → HTML table/list of open positions (.cats-job elements)
    Each .cats-job contains:
      .cats-job-title  <a href="/careers/{portalID}-{name}/jobs/{jobID}-{slug}"> title </a>
      .cats-job-location  → location text
      .cats-job-category  → category/department text

GET https://{slug}.catsone.com/careers/{portalID}-{name}/jobs/{jobID}-{slug}
  → HTML job detail page with full description
```

Live verification samples (2026-06-03):
- `https://authoritypartnersinc.catsone.com/careers/86212-General` — 28 positions, `.cats-job-title` anchors present, `?page=2` → same layout confirmed.
- `https://swan.catsone.com/careers/26625-EPCM-Portal?page=2` — page 2 with ~50 positions confirmed.

### 7.2 Errors

| Code / Behaviour        | Meaning                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| empty `JobResponseDto`  | no slug/url, unknown tenant (HTTP 400/404), or fetch failed      |
| logged warn (404)       | portal not found — degrades to empty, never throws               |
| logged warn (page fail) | listing page fetch failed — stops pagination, returns partial    |
| logged warn (detail fail) | description fetch failed — job still included, description null |

## 8. Test Plan

- E2E (`__tests__/catsone.e2e-spec.ts`): known tenant (`authoritypartnersinc`, portal `86212-General`) returns shaped jobs; no-slug returns empty; unknown tenant degrades gracefully; `resultsWanted` is honoured. Network-tolerant (zero results acceptable; shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-310-1 — WAF protection on some tenants.** Some CATS portals may be proxied behind a CDN or WAF that 403s plain HTTPS. Graceful empty result is the accepted degradation.
- **Q-310-2 — Custom domains.** Some CATS tenants front their portal with a custom domain (not `.catsone.com`). The adapter accepts any `companyUrl` and derives the slug from the first sub-domain label; fully custom domains (e.g. `careers.acmecorp.com`) would require the caller to pass the correct URL directly.

## 10. Decisions

- D-1: Use server-rendered HTML (`.cats-job` element selectors) — the only anonymous public surface. The authenticated v3 API is not used.
- D-2: Discover the portal path by fetching `/careers/` when not already present in `companyUrl`, then use the first portal link found.
- D-3: Paginate via `?page=N`; a short page terminates pagination. Hard cap of `CATSONE_MAX_LISTING_PAGES` guards against infinite loops.
- D-4: Per-job description fetches are batched with `Promise.allSettled` at `CATSONE_DETAIL_CONCURRENCY` — a single failed detail request yields a job with `description: null`, never drops the job entirely.
- D-5: Description fetches are only triggered when the caller sets `descriptionFormat`.

## 11. References

- `packages/plugins/source-ats-catsone/` — implementation.
- `packages/plugins/source-ats-avature/` — sibling HTML-scrape ATS adapter (cheerio pattern).
- `packages/plugins/source-ats-niceboard/` — sibling JSON-feed ATS adapter (pagination pattern).
- CATS career portal CSS classes (public widget documentation at `help.catsone.com`).
- Live tenants verified: `authoritypartnersinc.catsone.com`, `swan.catsone.com`, `quantumservices.catsone.com`, `linkspartners.catsone.com`.
