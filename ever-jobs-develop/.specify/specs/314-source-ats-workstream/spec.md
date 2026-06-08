# Spec: 314 — Workstream ATS Source Plugin

| Field          | Value                                              |
| -------------- | -------------------------------------------------- |
| Spec ID        | 314                                                |
| Slug           | source-ats-workstream                              |
| Status         | done                                               |
| Owner          | scheduled-agent                                    |
| Created        | 2026-06-03                                         |
| Last updated   | 2026-06-03                                         |
| Supersedes     | (none)                                             |
| Related specs  | 301 (Niceboard), 303 (GoHire)                      |

## 1. Problem Statement

Workstream (workstream.us) is an all-in-one HR, payroll, and hiring platform built
for the hourly/deskless workforce — restaurants, retail, hospitality, and healthcare.
Hundreds of major quick-service restaurant brands, retailers, and healthcare operators
(Jamba, YMCA, IHOP, Wendy's, Chick-fil-A, etc.) use Workstream to host their public
careers pages. Ever Jobs has no adapter for Workstream, leaving this large catalogue
of hourly and frontline positions un-ingestable. A single generic, multi-tenant
Workstream adapter unlocks that catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-workstream` plugin that ingests jobs from
  **any** Workstream-powered employer given a `companySlug` in the form
  `{accountId}/{brandSlug}` (e.g. `36047dd7/jamba`) or a full `companyUrl`.
- Use only the **public, anonymous** HTML careers surface — no credentials required.
- Map every position into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'workstream'`, `employmentType`).

## 3. Non-Goals

- The Workstream REST API (`public-api.workstream.us/positions`). It requires OAuth2
  bearer tokens and is explicitly not used.
- Per-tenant UUID discovery. Callers must supply the `{accountId}/{brandSlug}` path
  (or `companyUrl`). A curated tenant directory is handled separately.
- Server-side keyword/location filtering. We fetch the full open-roles list and
  slice client-side to `resultsWanted`.
- WAF / Cloudflare bypass via browser TLS fingerprinting. Boards gated behind an
  aggressive WAF that 403s plain HTTPS degrade to empty results.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Workstream plugin at an
> employer account path, so that I ingest that employer's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Workstream adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                              | Priority |
| ----- | -------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a company path (`{accountId}/{brandSlug}`) from `companySlug`, or from `companyUrl` path.        | must     |
| FR-2  | Fetch the positions listing HTML at `/j/{companyPath}/positions` and parse all job href links.            | must     |
| FR-3  | Fan out to individual job detail pages with a bounded `Promise.allSettled` to hydrate full description and location. | must |
| FR-4  | De-duplicate positions by ATS id (8-char hex job id) within a single run.                                | must     |
| FR-5  | Map each job to `JobPostDto` (title, url, location, employmentType, isRemote, description, applyUrl).    | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                                   | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                   | must     |
| FR-8  | Tolerate unknown / dead tenants (HTTP 404/410, "Record does not exist" page) without throwing.            | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public HTML surface only        |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.WORKSTREAM, name: 'Workstream', category: 'ats', isAts: true })
class WorkstreamService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, HTML-scraped):

```
GET https://www.workstream.us/j/{accountId}/{brandSlug}/positions
  → HTML containing <a href="/j/{accountId}/{brandSlug}/{locationSlug}/{jobSlug}-{jobId}"> links

GET https://www.workstream.us/j/{accountId}/{brandSlug}/{locationSlug}/{jobSlug}-{jobId}?locale=en
  → HTML containing full job description, location, employment type, pay rate, apply URL
```

URL segment anatomy:

```
{accountId}    — 8-character hex UUID identifying the Workstream account, e.g. 36047dd7
{brandSlug}    — URL-safe brand label, e.g. jamba, ymca, ihop
{locationSlug} — City slug + numeric location id, e.g. san-jose-5497
{jobSlug}      — Hyphenated job title, e.g. general-manager
{jobId}        — 8-character hex job identifier → atsId, e.g. 68051091
```

Sample positions listing job link (from `36047dd7/jamba/positions`):
```
/j/36047dd7/jamba/san-jose-5497/general-manager-68051091
```

Sample job detail page data:
```
Title:          General Manager
Company:        Jamba
Location:       1030 El Paseo de Saratoga, San Jose, CA 95130
Employment:     Full-time
Apply URL:      .../general-manager-68051091/apply?locale=en
```

### 7.2 Errors

| Code / Behaviour            | Meaning                                                     |
| --------------------------- | ----------------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, unknown tenant (HTTP 404/410), or fetch failed |
| logged warn (HTTP 404/410)  | unknown/dead tenant — degrades to empty, never throws       |
| logged warn (detail failure)| a single job detail fetch failed — others still merge       |

## 8. Test Plan

- E2E (`__tests__/workstream.e2e-spec.ts`): known tenant (`36047dd7/jamba`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-WS-1 — UUID discovery.** Callers must know the `{accountId}` for their
  target employer. Workstream does not publish a tenant directory. A future
  enrichment job could discover UUIDs from the known public URL aliases
  (`got.work/{slug}` → 301 → `www.workstream.us/j/{accountId}/{brandSlug}`).
  **Default:** require callers to supply the full `{accountId}/{brandSlug}` path.
- **Q-WS-2 — datePosted.** The positions listing HTML does not expose a date.
  Individual detail pages may show post date in some cases but not reliably.
  **Default:** leave `datePosted` as null.

## 10. Decisions

- D-1: Primary source is the public HTML careers surface — no anonymous JSON API
  was found on the Workstream platform after investigation (2026-06-03). The REST
  API at `public-api.workstream.us` requires OAuth2.
- D-2: The `companySlug` input takes the `{accountId}/{brandSlug}` form
  (e.g. `36047dd7/jamba`). The `companyUrl` fallback extracts the same path from
  the `/j/` URL segment.
- D-3: Job id (ATS id) is the 8-char hex suffix of the job URL path
  (e.g. `68051091` from `…general-manager-68051091`). This is stable across fetches.
- D-4: The detail-page fan-out is bounded by `WORKSTREAM_MAX_CONCURRENCY` (5) and
  gated by `resultsWanted`; a polite inter-round delay is applied.

## 11. References

- `packages/plugins/source-ats-workstream/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling paginated ATS adapter (pattern).
- `packages/plugins/source-ats-gohire/` — sibling HTML+JSON ATS adapter (pattern).
- Public Workstream careers pages confirmed live 2026-06-03:
  - `https://www.workstream.us/j/36047dd7/jamba/positions`
  - `https://www.workstream.us/j/f030c4f0/ymca/positions`
  - `https://www.workstream.us/j/221e9529/ihop`
  - `https://www.workstream.us/j/3547b62e/wendys`
