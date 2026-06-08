# Spec: 332 — HR-ON Recruit ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 332                                           |
| Slug           | source-ats-hron                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 318 (rexx systems)           |

## 1. Problem Statement

HR-ON Recruit (hr-on.com) is a Danish e-recruitment suite built by HR-ON ApS
(Odense, Denmark). Every customer tenant publishes a branded, public,
GDPR-compliant career page rendered by HR-ON. A core selling point of the
product is that "candidates remain on the company's own website throughout the
application process" — there is no separate candidate sub-domain and no
documented anonymous JSON feed; the public surface is server-rendered HTML.
Ever Jobs has no adapter for HR-ON-powered career pages, so these vacancies are
currently un-ingestable. A single generic, multi-tenant HR-ON adapter unlocks
the catalogue of HR-ON-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hron` plugin that ingests vacancies
  from **any** HR-ON Recruit career page given a `companyUrl` (the tenant's
  public career-page URL, e.g. `https://hr-on.com/careers/`) or a `companySlug`
  (expanded against the HR-ON hosted career path).
- Use the **public, anonymous career page** (no auth, no API key).
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'hron'`, `employmentType`).

## 3. Non-Goals

- Any authenticated HR-ON REST/Open API. It is explicitly not used.
- Server-side filtering by country / city / department. We ingest the tenant's
  full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- WAF / Cloudflare bypass. Any career page gating its pages behind an aggressive
  WAF is out of scope (graceful empty result).
- A curated seed list of HR-ON tenant career URLs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the HR-ON plugin at a tenant's
> public career-page URL, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the HR-ON adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a career-page URL from `companyUrl` (preferred), or expand a bare `companySlug` against the HR-ON hosted path. | must |
| FR-2  | Fetch the career page and harvest every job-detail link matching `/jobposts*?jobid={ID}`.            | must     |
| FR-3  | For each listed role, fetch the detail page (`/jobposts_en?jobid={ID}`) and extract its fields from the rendered HTML (and a schema.org `JobPosting` JSON-LD block when a theme injects one). | must |
| FR-4  | Build the description from the detail page's job-ad body (or the JSON-LD summary as a fallback).      | should   |
| FR-5  | De-duplicate vacancies by numeric job id (`atsId`) within a single run.                              | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) and bound the detail fan-out.                         | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).   | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                      | Target                              |
| ------ | ------------------------------------------------ | ----------------------------------- |
| NFR-1  | No credentials / secrets required                | public career page only             |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result       |
| NFR-3  | All HTTP via `@ever-jobs/common` client          | UA + timeouts + proxy support        |
| NFR-4  | Bound result-set size and fan-out                | slice to `resultsWanted`; `Promise.allSettled` |
| NFR-5  | Detail fan-out uses `Promise.allSettled`         | one failure never nukes the batch    |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HRON, name: 'HR-ON Recruit', category: 'ats', isAts: true })
class HrOnService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against
`https://hr-on.com/careers/` — HR-ON ApS' own career page):

```
GET {careerPageUrl}
  → HTML rendering one block per open role. Each role links to its detail page
    via an anchor whose href matches:
        /jobposts_en?jobid={ID}        (English UI)
        /jobposts?jobid={ID}           (Danish / default UI)
    The numeric {ID} (e.g. 318814) is the stable HR-ON job id (ATS id). The
    job-block also carries the title text and a "Work location : …" /
    "Arbejdssted : …" string.

GET {origin}/jobposts_en?jobid={ID}
  → server-rendered HTML detail page carrying the job title (<h1>/<h2>/<title>),
    the work-location text, the company name, the application deadline, and the
    full job-ad body. A tenant theme MAY additionally embed a schema.org
    JobPosting JSON-LD block (datePosted, employmentType, jobLocation.address,
    jobLocationType, hiringOrganization.name) — parsed defensively when present.
```

Verified surface (`hr-on.com/careers/`, HR-ON ApS, 2026-06-03):
- career page HTTP 200 with 6 `/jobposts_en?jobid={ID}` role links
  (e.g. jobid 325335, 324307, 318814, 310098, 267899, 266515).
- detail page `/jobposts_en?jobid=318814` HTTP 200, server-rendered HTML for
  "Senior Backend Engineer — Postgres / Node.js / Typescript / GraphQL",
  company "HR-ON", location "Odense C".

Mapping table (wire → `JobPostDto`):

| Wire field                                              | JobPostDto field         |
| ------------------------------------------------------- | ------------------------ |
| `?jobid={ID}` (numeric)                                 | `atsId`, `id` (`hron-{ID}`) |
| detail `<h1>`/`<h2>`/`<title>` or JSON-LD `title`       | `title`                  |
| detail page company / JSON-LD `hiringOrganization.name` | `companyName` (falls back to URL/slug-derived name) |
| detail URL (`/jobposts_en?jobid={ID}`)                  | `jobUrl`, `applyUrl`     |
| JSON-LD `jobLocation.address` / "Work location" text    | `location` (`LocationDto`) |
| JSON-LD `jobLocationType: "TELECOMMUTE"` / remote text  | `isRemote`               |
| JSON-LD `datePosted` (`YYYY-MM-DD`)                     | `datePosted`             |
| JSON-LD `employmentType`                                | `employmentType`, `department` |
| detail job-ad body HTML / JSON-LD `description`         | `description` (format-converted) |
| emails parsed from the description                      | `emails`                 |

Tenant resolution:
- `companyUrl` (preferred) → used verbatim (scheme prepended if missing).
- `companySlug` with scheme/`.`+`/` → treated as a host/URL.
- `companySlug` with a dot → `https://{slug}/careers/`.
- bare `companySlug` → `https://hr-on.com/{slug}/careers/` (HR-ON hosted path).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 4xx), or no `?jobid=` links |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | HTML / JSON-LD parse error — degrades to partial, never throws |
| logged warn (detail failure) | a single detail fetch failure — degrades to partial via `Promise.allSettled` (listing title/location used) |

## 8. Test Plan

- E2E (`__tests__/hron.e2e-spec.ts`): known tenant
  (`companyUrl: 'https://hr-on.com/careers/'`) returns shaped jobs
  (`site === Site.HRON`, `atsType === 'hron'`, `atsId`/`jobUrl` defined);
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HO-1 — Tenant addressing.** HR-ON keeps candidates on each company's own
  domain, so career-page URLs vary per tenant. **Default (proceeding):** key the
  adapter on `companyUrl`; treat a bare `companySlug` as an HR-ON-hosted
  `/{slug}/careers/` page as a best-effort convenience.
- **Q-HO-2 — Career-page pagination.** The career page renders all open roles in
  one document for small-to-medium tenants (6 roles on the test tenant). A very
  large tenant could lazy-load more. **Default (proceeding):** single-document
  listing; re-evaluate if truncation is observed in practice.
- **Q-HO-3 — Description language.** The detail page is requested via the English
  (`jobposts_en`) path; tenants whose ads are Danish-only return the Danish body.
  **Default (proceeding):** accept whatever language the page serves.

## 10. Decisions

- D-1: Primary surface is the public, anonymous HR-ON career page. Verified live
  2026-06-03 against `https://hr-on.com/careers/` (HR-ON ApS): career page
  HTTP 200 with six `/jobposts_en?jobid={ID}` role links; detail pages HTTP 200
  with server-rendered title / company / location / body.
  **Confidence: verified** (byte-confirmed listing links and detail HTML).
- D-2: Job-detail links are harvested by the `/jobposts*?jobid={ID}` pattern
  (theme-independent regex over the markup) rather than brittle CSS classes,
  because each tenant brands its own career page. A DOM enrichment pass attaches
  the title / location text co-located with each link as a layered fallback.
- D-3: The numeric `?jobid=` value is the stable ATS id (`atsId`); the detail
  URL is the `jobUrl` and `applyUrl`. De-dup is by `atsId`.
- D-4: The detail page's rendered HTML is the primary source for title, company,
  location, and the description body. A schema.org `JobPosting` JSON-LD block is
  parsed defensively when a tenant theme injects one (Google for Jobs), adding
  structured dates, employment type, structured address, and the remote flag.
- D-5: No documented anonymous JSON feed exists; the authenticated HR-ON Open
  API is an explicit non-goal.
- D-6: Detail fetches fan out under a bounded `Promise.allSettled` (concurrency
  6, ~250 ms polite delay between rounds); a single failure degrades to a
  partial result (listing title/location) and never aborts the run.

## 11. References

- `packages/plugins/source-ats-hron/` — implementation.
- HR-ON Recruit career-page product page (hr-on.com/career-page/).
- Live career page verified 2026-06-03: `https://hr-on.com/careers/` (and its
  `/jobposts_en?jobid={ID}` detail pages).
