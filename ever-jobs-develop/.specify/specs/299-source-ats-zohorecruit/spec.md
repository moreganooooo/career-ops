# Spec: 299 — Zoho Recruit ATS Source Plugin

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Spec ID        | 299                                |
| Slug           | source-ats-zohorecruit             |
| Status         | done                               |
| Owner          | scheduled-agent (run #299)         |
| Created        | 2026-06-03                         |
| Last updated   | 2026-06-03                         |
| Supersedes     | (none)                             |
| Related specs  | 006, 013, 296 (ATS parity batches) |

## 1. Problem Statement

Zoho Recruit is an applicant-tracking / recruiting platform that hosts public
"career sites" for a large population of staffing agencies and employers
(e.g. WorkBetterNow, BruntWork, Outsource Access, WorkBetterNow, and thousands
more). Each tenant publishes its open roles at `https://{slug}.zohorecruit.com/jobs/Careers`.
Ever Jobs has adapters for ~45 ATS platforms but **none for Zoho Recruit**, so
every Zoho-hosted career site is currently un-ingestable except via brittle
company-specific scrapers. A single generic, multi-tenant Zoho Recruit adapter
unlocks a broad catalogue of (heavily remote / LatAm / staffing) roles with one
plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-zohorecruit` plugin that ingests jobs
  from **any** Zoho-hosted career site given a `companySlug` or a custom-domain /
  non-US-datacenter `companyUrl`.
- Use the **public** career-site page (no auth) so no OAuth credentials are
  required.
- Map every opening into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'zohorecruit'`, `department`).

## 3. Non-Goals

- The OAuth-gated Zoho Recruit REST API (`/recruit/v2/...`). It requires a
  per-tenant access token and is out of scope; we read the public career-site
  payload instead.
- WAF / bot-mitigation bypass. Tenants that gate the careers page behind an
  aggressive WAF (403 on plain HTTPS) are out of scope this iteration; the
  scraper degrades to an empty result and logs a warning. (See Open Questions.)
- Per-job detail enrichment. Some tenants omit `Job_Description` from the
  listing payload; following the per-job `/jobs/Careers/{id}/{slug}` detail page
  to backfill descriptions is deferred to a later iteration.
- Lazy-load / "show more" pagination beyond the server-rendered first page.
  The embedded `jobs` array is the reliable public payload; a few high-volume
  tenants render only an initial slice and lazy-load the remainder via an
  authenticated XHR (digest-gated) — recovering those is a follow-up.
- Datacenter auto-discovery. We default to the `.com` (US) host; EU / IN / AU
  tenants are reached via an explicit `companyUrl`.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Zoho Recruit plugin at a
> tenant slug, so that I ingest that agency's open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the Zoho Recruit adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant host from `companySlug` → `https://{slug}.zohorecruit.com`, or from `companyUrl`. | must     |
| FR-2  | Fetch the public `/jobs/Careers` page and extract the embedded `<input id="jobs">` JSON array. | must     |
| FR-3  | Decode HTML entities in the value attribute and `JSON.parse` the openings array defensively.  | must     |
| FR-4  | De-duplicate openings by ATS id (`id`) within a single run.                                   | must     |
| FR-5  | Map each opening to `JobPostDto` (title, url, location, department, remote, datePosted, description). | must     |
| FR-6  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-8  | Tolerate unknown / dead tenants and parse failures without throwing (partial / empty OK).     | must     |
| FR-9  | Skip locked (`Is_Locked === true`) and explicitly unpublished (`Publish === false`) records.  | should   |
| FR-10 | Trim results to `resultsWanted` (internal default 100).                                        | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | A failed page fetch must not throw / fail an enclosing batch | `Promise.allSettled`-wrapped fetch |
| NFR-2  | No credentials / secrets required            | public career-site page only    |
| NFR-3  | All HTTP I/O via `@ever-jobs/common` client  | UA rotation, timeouts, retries   |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ZOHORECRUIT, name: 'ZohoRecruit', category: 'ats', isAts: true })
class ZohoRecruitService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, no auth):

```
GET {host}/jobs/Careers
  → text/html — open roles embedded as an HTML-entity-encoded JSON array in
    a hidden <input id="jobs" value="[ {Job_Openings fields…} ]">.
```

### 7.2 Wire shape (`Job_Openings` module, as embedded)

```jsonc
{
  "id": "746650000028689435",        // Zoho record id → atsId
  "Posting_Title": "Collections Representative",
  "Job_Opening_Name": "Collections Representative", // internal fallback title
  "Job_Description": "…HTML/plain…",  // present on most tenants
  "City": null, "State": null, "Country": null,
  "Date_Opened": "2026-01-05",        // YYYY-MM-DD (also tolerant of epoch/ISO)
  "Remote_Job": true,
  "Job_Type": "Full time",
  "Industry": "Other",                // → department
  "Work_Experience": null,
  "Publish": true, "Keep_on_Career_Site": false,
  "Is_Locked": false,
  "Currency": "USD"
}
```

Job-detail URL: `{host}/jobs/Careers/{id}/{title-slug}`.

### 7.3 Errors

| Code / Behaviour            | Meaning                                              |
| --------------------------- | --------------------------------------------------- |
| empty `JobResponseDto`      | no slug/url, dead tenant, WAF-gated, or unparseable  |
| logged warn on fetch reject | a transient 4xx/5xx — returns empty, never throws    |

## 8. Test Plan

- E2E (`__tests__/zohorecruit.e2e-spec.ts`): known tenant (`workbetternow`)
  returns shaped jobs; no-slug returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results
  acceptable).
- Type-safety: `tsc --noEmit --skipLibCheck` against the package tsconfig
  (exit 0 verified).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (orchestrator-owned).

## 9. Open Questions

- **Q-ZR-1 — WAF / lazy-load fallback.** A few tenants gate the careers page
  behind a WAF or only render an initial slice and lazy-load the remainder via a
  digest-gated XHR. A browser-fingerprint / digest-extraction fallback would
  recover them but adds a heavyweight optional dependency.
  **Default (proceeding):** ship public-embedded-payload-only; record for a
  follow-up. Logged in `docs/questions.md`.
- **Q-ZR-2 — Datacenter resolution.** EU/IN/AU tenants live on `.eu`/`.in`/`.com.au`
  hosts. **Default (proceeding):** default to `.com`; require an explicit
  `companyUrl` for other datacenters.

## 10. Decisions

- D-1: Read the **public career-site page** (`/jobs/Careers`) and parse the
  server-rendered `<input id="jobs">` JSON array, rather than the OAuth-gated
  REST API. This needs no credentials and is reachable cross-tenant.
- D-2: `atsId` = the Zoho record `id`; `id` field = `zohorecruit-{atsId}`.
- D-3: Title prefers `Posting_Title`, falling back to `Job_Opening_Name`.
- D-4: `department` is mapped from `Industry` (the only functional grouping in
  the public payload); `employmentType` from `Job_Type`.
- D-5: Job-detail URL is built as `{host}/jobs/Careers/{id}/{title-slug}`, with
  the title slug derived from `Posting_Title` (cosmetic — Zoho ignores it on
  lookup but it matches the canonical shape).

## 11. References

- `packages/plugins/source-ats-zohorecruit/` — implementation.
- `packages/plugins/source-ats-eightfold/` — sibling career-site adapter (pattern).
- Public Zoho Recruit career-site page (`/jobs/Careers`) embedded `jobs` payload.
