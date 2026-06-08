# Spec: 325 — Teamdash ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 325                                           |
| Slug           | source-ats-teamdash                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 319 (Oorwin)                     |

## 1. Problem Statement

Teamdash (teamdash.com) is an Estonian, cloud-based recruitment ATS used by
in-house recruiting teams across the Nordics and the EU. Each customer tenant
publishes a public career page on its own sub-domain under the shared apex
`teamdash.com` (e.g. `https://cr14.teamdash.com/`), or on a custom domain.
Ever Jobs has no adapter for Teamdash-powered career pages, so those vacancies
are currently un-ingestable. A single generic, multi-tenant Teamdash adapter
unlocks the full catalogue of Teamdash-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-teamdash` plugin that ingests roles
  from **any** Teamdash-powered career page given a `companyUrl` (the full
  career-page URL) or a `companySlug` (the tenant sub-domain label).
- Use the **public, anonymous** server-side-rendered career page — no auth, no
  API key. Read the embedded `window.context` JSON state directly.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'teamdash'`, `department`).

## 3. Non-Goals

- The authenticated Teamdash recruiter dashboard / private REST surface. It
  requires per-tenant credentials and is explicitly not used.
- A discovery mechanism for the opaque per-tenant career-page landing token.
  When only a `companySlug` is given the plugin makes a single best-effort
  attempt at the well-known `career-page` landing slug and otherwise degrades
  to empty; supplying the full `companyUrl` is the reliable path.
- Bot-gate / WAF bypass. A career page gated behind aggressive bot protection
  is out of scope (graceful empty result).
- A curated seed list of Teamdash tenant URLs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Teamdash plugin at a
> tenant's career-page URL, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Teamdash adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a career-page entry URL from `companyUrl` (preferred), or build a best-effort career-page URL from `companySlug` (tenant sub-domain label). | must |
| FR-2  | Fetch the career-page HTML and extract the embedded `window.context` JSON blob (balanced-brace parse, string-literal aware). | must |
| FR-3  | Read `career_page_feed_contents` (map of feed-slug → job summaries) for the listing; flatten and de-dupe by job URL. | must |
| FR-4  | Fan out (bounded `Promise.allSettled`) to each posting's landing URL and assemble the description from `landing.data.blocks[]`. | must |
| FR-5  | Map each role to `JobPostDto` (title, jobUrl, location, department, isRemote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the assembled description per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | De-duplicate roles by `atsId` (the opaque job-URL token) within a single run. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown / dead tenants (HTTP 400/401/403/404), missing blobs, and parse failures without throwing (partial/empty results OK). | must |
| FR-10 | Honour `resultsWanted` (default 100); trim the candidate list before detail fan-out. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public SSR career page only      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client        | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                          | trim to `resultsWanted`          |
| NFR-5  | Bounded detail-fetch concurrency               | `Promise.allSettled`, 6 per round |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TEAMDASH, name: 'Teamdash', category: 'ats', isAts: true })
class TeamdashService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Upstream wire shape (public, VERIFIED live 2026-06-03)

Teamdash exposes **no anonymous JSON listing API**. Every public career page and
job posting is a server-side-rendered "landing" whose full state is embedded in
the HTML as a single `window.context = { ... }` JSON assignment.

**Career page (listing)** —
`GET https://{tenant}.teamdash.com/p/job/{landingToken}/{slug}`

```jsonc
window.context = {
  "is_landing": true,
  "instance_name": "cr14",
  "landing": { "id": 4, "slug": "career-page", "data": { /* page blocks */ } },
  "career_page_feed_contents": {
    "<feedSlug>": [
      {
        "url": "https://cr14.teamdash.com/p/job/DJQJDUk1/full-stack-developer",
        "title": "Software Developer",
        "location": "Tallinn, Estonia",
        "imageUrl": "https://recruit-main.s3.eu-north-1.amazonaws.com/...",
        "customFields": [],
        "customFieldDisplayValues": []
      }
    ]
  },
  "languages": { /* ... */ }
}
```

**Job posting (detail)** —
`GET https://{tenant}.teamdash.com/p/job/{token}/{slug}`

```jsonc
window.context = {
  "full": true,
  "landing": {
    "id": 20,
    "slug": "full-stack-developer",
    "status": "active",
    "page_type": "landing",
    "default_language": "en",
    "permalink": "https://cr14.teamdash.com/p/job/DJQJDUk1/full-stack-developer",
    "display_name": "CCDCOE - landing",
    "created_at": "2025-01-21T11:46:41.000000Z",
    "updated_at": "2026-06-01T08:10:53.000000Z",
    "is_internal": false,
    "stage": { "id": 95, "name": "Submissions", "project_id": 15 },
    "data": {
      "meta": { "title": "Full Stack Developer", "description": "Full Stack Developer" },
      "blocks": [
        { "type": "LandingBgImageTextBlock", "content": { "en": "<p>Role Overview…</p>" } },
        { "type": "LandingHalfVideoTextBlock", "content": { "en": "<h2>Our mission…</h2>" } }
      ]
    }
  }
}
```

Field mapping (verified `cr14.teamdash.com`, 2026-06-03):
- feed item `url` → `jobUrl` / `applyUrl`; the opaque path token (`DJQJDUk1`) → `atsId`
- feed item `title` (fallback `landing.data.meta.title`) → `title`
- feed item `location` (free text) → split on commas → `LocationDto`
- `landing.data.blocks[].content.<lang>` HTML (+ hero heading/subheading) → `description`
- `landing.created_at` (fallback `updated_at`) ISO-8601 → `datePosted` (`YYYY-MM-DD`)
- `landing.stage.name` → `department`
- remote inferred from location/title/description (incl. Estonian "kaugtöö")
- `landing.is_internal === true` → role skipped

Tenant / entry-point resolution:
- `companyUrl` → fetched as-is (it already points at a career-page landing)
- `companySlug` with dots → treated as a bare host → `https://{slug}/p/job/career-page`
- `companySlug` without dots → `https://{slug}.teamdash.com/p/job/career-page` (best effort)

### 7.3 Errors

| Code / Behaviour             | Meaning                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 4xx), missing/malformed blob |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws         |
| logged warn (parse failure)  | `window.context` JSON parse error — degrades to empty, never throws |
| logged warn (detail failure) | one posting's landing failed — role still collected w/ null description |

## 8. Test Plan

- E2E (`__tests__/teamdash.e2e-spec.ts`): known live tenant
  (`https://cr14.teamdash.com/p/job/20eH77Ul/career-page`) returns shaped jobs;
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  is honoured. Network-tolerant (zero results acceptable; shape assertions
  guarded by `length > 0`). Asserts `job.site === Site.TEAMDASH` and
  `job.atsType === 'teamdash'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (src only) — clean.
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TD-1 — Slug-only discovery.** The career-page landing token is an opaque,
  per-tenant random string, so a `companySlug`-only caller has no deterministic
  listing URL. The plugin attempts the well-known `career-page` landing slug and
  degrades to empty otherwise.
  **Default (proceeding):** require/prefer the full `companyUrl`; treat slug-only
  as best-effort.
- **Q-TD-2 — Multi-language postings.** Postings may carry translatable block
  content keyed by language code. The plugin prefers `landing.default_language`,
  falls back to `en`, then to the first available language.
  **Default (proceeding):** default-language description; revisit if mixed-language
  output is observed.
- **Q-TD-3 — Pagination.** Observed feeds embed all roles for the career page in
  a single `career_page_feed_contents` map (no paging seen).
  **Default (proceeding):** single-document fetch; re-evaluate if truncation is
  observed in practice.

## 10. Decisions

- D-1: Primary surface is the **public SSR career page** and its embedded
  `window.context` JSON blob — no anonymous JSON API exists. Verified live
  2026-06-03 on `cr14.teamdash.com`: career page `GET /p/job/20eH77Ul/career-page`
  returned 2 open roles in `career_page_feed_contents.karjaarileht`; posting
  `GET /p/job/DJQJDUk1/full-stack-developer` returned the full landing with
  `data.meta.title`, `created_at`, `status: active`, and HTML description blocks.
- D-2: The `window.context` blob is extracted with a depth-tracking,
  string-literal-aware brace scan (not a regex), so nested objects and braces
  inside string values are handled correctly. Parse failures degrade to empty.
- D-3: The description is assembled by concatenating the translatable HTML
  `content` (and hero heading/subheading) of every `landing.data.blocks[]`,
  preferring the landing's default language.
- D-4: `atsId` is the opaque job-URL path token (`/p/job/{token}/...`), stable
  per posting and present in both the feed `url` and the posting `permalink`.
- D-5: `department` maps to the posting's pipeline `stage.name`; Teamdash has no
  dedicated department field on the public feed.
- D-6: `companyUrl` is the primary input (full career-page URL); `companySlug`
  is interpreted as a tenant sub-domain label (or a bare host when it contains
  dots) with a best-effort `career-page` landing fallback.
- D-7: Confidence: **verified** — live byte-confirmed against `cr14.teamdash.com`
  on 2026-06-03 (2 shaped jobs, correct title/location/date/department/remote and
  Markdown descriptions).

## 11. References

- `packages/plugins/source-ats-teamdash/` — implementation.
- Live career page verified 2026-06-03:
  `https://cr14.teamdash.com/p/job/20eH77Ul/career-page` (CR14, Tallinn, Estonia).
- Live posting verified 2026-06-03:
  `https://cr14.teamdash.com/p/job/DJQJDUk1/full-stack-developer`.
