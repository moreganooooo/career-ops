# Spec: 309 — Applied ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 309                                |
| Slug           | source-ats-applied                 |
| Status         | done                               |
| Owner          | scheduled-agent                    |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 301 (Niceboard), 305 (JazzHR)      |

## 1. Problem Statement

Applied (beapplied.com) is a values-based, bias-reducing ATS used by hundreds
of UK and US organisations to run fair hiring processes.  Every tenant's open
roles are publicly visible at `https://app.beapplied.com/org/{orgId}/{orgSlug}`.
Ever Jobs has no adapter for Applied, so roles hosted on this platform are
currently un-ingestable.  A single generic, multi-tenant adapter unlocks that
catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-applied` plugin that ingests jobs
  from any Applied-powered org given a `companySlug` in the form
  `{orgId}/{orgSlug}` (e.g. `"1549/citizens-uk"`) or a full `companyUrl`.
- Scrape the **public, unauthenticated** org HTML page — no credentials required.
- Fan out to individual job detail pages to enrich each listing with title,
  company, location, salary, employment type, and description.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'applied'`).

## 3. Non-Goals

- The Applied REST API (`/api/v1/...`).  It requires a valid session token
  (HTTP 401 Unauthorized) and is explicitly not used.
- JSON-LD schema.org parsing.  Applied pages carry no JobPosting structured data.
- Support for slug-only org resolution (without numeric `orgId`).  Applied's
  routing returns HTTP 404 for slug-only paths.
- Server-side keyword/location filtering.
- A curated seed list of Applied tenant orgs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Applied plugin at an org
> path, so that I ingest that organisation's open roles without writing a
> bespoke scraper.

> As a **plugin host**, I want the Applied adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve an org path (`{orgId}/{orgSlug}`) from `companySlug` or from `companyUrl` (path after `/org/`). | must     |
| FR-2  | Fetch the public org HTML page and parse all `/apply/{slug}` job-link anchors.                    | must     |
| FR-3  | Fan out to individual job detail pages with bounded `Promise.allSettled` concurrency.             | must     |
| FR-4  | De-duplicate positions by job slug (atsId) within a single run.                                   | must     |
| FR-5  | Map each job to `JobPostDto` (title, jobUrl, location, isRemote, description, employmentType, atsId). | must  |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.            | must     |
| FR-8  | Return empty `JobResponseDto` when `companySlug` lacks a numeric `orgId` (slug-only form).        | must     |
| FR-9  | Tolerate unknown / dead orgs (HTTP 404) and per-job detail failures without throwing (partial/empty results OK). | must |
| FR-10 | Degrade gracefully on detail fetch failure by emitting a minimal post from org-page data only.    | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public HTML pages only          |
| NFR-2  | A fetch failure must not throw               | graceful empty/partial result   |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.APPLIED, name: 'Applied', category: 'ats', isAts: true })
class AppliedService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Public HTML surfaces used (no JSON API exists):

```
Org listing page:
  GET https://app.beapplied.com/org/{orgId}/{orgSlug}
  → HTML; contains: <a href="/apply/{jobSlug}">…title…</a> per open role.

Job detail page:
  GET https://app.beapplied.com/apply/{jobSlug}
  → HTML; contains: title, company, location, salary, employment type,
    closing date, full description prose.
```

Verified live (2026-06-03):

```
org page  GET https://app.beapplied.com/org/1549/citizens-uk
  → HTTP 200; contains /apply/cuxl7vasjy link for "Digital Communications Manager"
job page  GET https://app.beapplied.com/apply/cuxl7vasjy
  → HTTP 200; title "Digital Communications Manager",
    company "Citizens UK", location "Hybrid · London, City of, UK",
    salary "£39,560 pa, +£3,472 London Weighting",
    closing "11:59pm, 7th Jun 2026 BST"
api probe GET https://app.beapplied.com/api/v1/organisations/1549/jobs
  → HTTP 401 Unauthorized (no public JSON API)
```

Org-path resolution rules:
- `companySlug` must be in the form `"{orgId}/{orgSlug}"` (slash required).
- `companyUrl` path starting with `/org/` has the remainder used as the org path.
- Slug-only forms (no slash) return empty immediately.

### 7.2 Errors

| Code / Behaviour                | Meaning                                                      |
| ------------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`          | no slug/url, slug-only form, unknown org (HTTP 404), or fatal org-page fetch |
| logged warn (HTTP 404)          | unknown/dead org — degrades to empty, never throws           |
| logged warn (detail page fail)  | one job detail failed — minimal post emitted from org-page data |

## 8. Test Plan

- E2E (`__tests__/applied.e2e-spec.ts`): known tenant (`1549/citizens-uk`)
  returns shaped jobs; no-slug returns empty; unknown org degrades gracefully;
  `resultsWanted` is honoured.  Network-tolerant (zero results acceptable;
  shape assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig.
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-APP-1 — Numeric orgId requirement.**  Applied's routing demands a numeric
  org ID in the URL path; the slug alone returns HTTP 404.  There is no public
  directory to look up numeric IDs from slugs, so callers must supply the full
  `{orgId}/{orgSlug}` form.  Acceptable for an operator-driven tool.
- **Q-APP-2 — Description extraction fragility.**  Applied pages are server-
  rendered HTML with no stable class names.  The heuristic container selector
  may degrade on future theme changes; a re-pin of the selector would be needed.

## 10. Decisions

- D-1: Primary surface is the public HTML org listing page (`/org/{orgId}/{orgSlug}`)
  plus individual job detail pages (`/apply/{jobSlug}`).  The REST API returns
  HTTP 401 without credentials and is explicitly not used.
- D-2: Org-path resolution requires a slash in `companySlug` (the `{orgId}/{orgSlug}`
  form); slug-only values return empty so callers get clear feedback.
- D-3: Detail pages are fetched with bounded `Promise.allSettled` fan-out
  (max 4 concurrent); a single failure degrades to a minimal post, not a crash.
- D-4: Description is extracted using a heuristic "largest prose container"
  strategy since Applied pages carry no JSON-LD or stable CSS class names.

## 11. References

- `packages/plugins/source-ats-applied/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling HTML+JSON hybrid adapter (pattern).
- `packages/plugins/source-ats-jazzhr/` — sibling cheerio HTML scraping adapter (pattern).
- Public Applied org page (verified live 2026-06-03): `app.beapplied.com/org/1549/citizens-uk`.
