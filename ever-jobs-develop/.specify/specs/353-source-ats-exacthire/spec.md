# Spec: 353 — ExactHire ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 353                                           |
| Slug           | source-ats-exacthire                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | (ApplicantPro — schema.org/HTML sibling)      |

## 1. Problem Statement

ExactHire (exacthire.com) is a US small/medium-business ATS that ships its
applicant-tracking product under the "HireCentric" brand. Every customer tenant
publishes a branded, public, unauthenticated job board on its own
`hirecentric.com` sub-domain (`https://{tenant}.hirecentric.com/jobsearch/`),
with per-role server-rendered detail pages at `/jobs/{jobId}.html` that carry
structured metadata (a schema.org JobPosting JSON-LD block when present, plus
`og:` meta tags and a cross-tenant `<title>` pattern). Ever Jobs has no adapter
for ExactHire-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant ExactHire adapter unlocks the full
catalogue of ExactHire/HireCentric-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-exacthire` plugin that ingests
  vacancies from **any** ExactHire/HireCentric-powered career board given a
  `companySlug` (the tenant sub-domain label, e.g. `aflcio`) or a `companyUrl`
  (a board URL whose first sub-domain label is the tenant).
- Use the **public, anonymous** XML sitemap (`/sitemap.xml`) to enumerate open
  roles and the **public** per-role detail pages (`/jobs/{jobId}.html`) to read
  structured metadata — no auth, no API key.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'exacthire'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated ExactHire / HireCentric recruiter or candidate API. The
  plugin uses only the public, unauthenticated career-board surface.
- Server-side filtering by keyword / location / employment type / business unit
  (the `/jobsearch/` UI supports these facets). We ingest the tenant's full
  open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of ExactHire tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the ExactHire plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the ExactHire adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (→ `{slug}.hirecentric.com`) or from a `companyUrl` (the first non-`www` sub-domain label of a `hirecentric.com` host). | must |
| FR-2  | Fetch the public XML sitemap (`GET /sitemap.xml`) and extract every `/jobs/{jobId}.html` open-role entry (with `<lastmod>`). | must |
| FR-3  | Fetch + parse each role's detail page — prefer the schema.org JobPosting JSON-LD block, else the `og:` meta tags / `<title>` pattern. | must |
| FR-4  | Use the URL job id (`/jobs/{jobId}.html`) as `atsId`; de-duplicate by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated role set before fetching details. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed pages without throwing.            | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public sitemap + detail pages    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EXACTHIRE, name: 'ExactHire', category: 'ats', isAts: true })
class ExactHireService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface confirmed 2026-06-03 via the public Google
index — see §10 on the live-fetch caveat):

```
GET https://{tenant}.hirecentric.com/sitemap.xml
  → <urlset> with one <url><loc>…/jobs/{jobId}.html</loc>
      <lastmod>{ISO date}</lastmod></url> per open role.

GET https://{tenant}.hirecentric.com/jobs/{jobId}.html
  → text/html with:
    <title>{title} - {city}, {state} - {company} Jobs</title>
      e.g. "Senior Social Media Strategist - Washington, DC - AFL-CIO Jobs"
    <meta property="og:title"       content="{title} - {city}, {state}">
    <meta property="og:description" content="{body}">
    <meta name="keywords"           content="{title}, {city}, {state}, …">
    <script type="application/ld+json"> { "@type": "JobPosting", … } </script>
      (on schema.org-enabled tenants)
```

Wire shape → `JobPostDto` mapping:

| Source field                                              | JobPostDto field     | Notes                                              |
| --------------------------------------------------------- | -------------------- | -------------------------------------------------- |
| job id from `/jobs/{jobId}.html`                          | `atsId`, `id`        | `id` is prefixed `exacthire-{atsId}`               |
| JSON-LD `title` (else `<title>`/`og:title` lead segment)  | `title`              | required; role skipped if absent                   |
| sitemap `<loc>` / `og:url`                                | `jobUrl`, `applyUrl` | absolute public detail / apply URL                 |
| JSON-LD `description` (else `og:description`)              | `description`        | format-converted (HTML / Markdown / Plain)         |
| JSON-LD `datePosted` (else sitemap `<lastmod>`)           | `datePosted`         | parsed → `YYYY-MM-DD`                              |
| JSON-LD `jobLocation.address` (else `<title>` location)   | `location`           | `{city, state, country}`; null when none usable    |
| title / location / employment / body text                | `isRemote`           | remote detection (`remote` / `wfh` / `home-based`) |
| `keywords` trailing segment                               | `department`         | when present beyond the location tuple             |
| JSON-LD `employmentType` (e.g. `FULL_TIME`)               | `employmentType`     | normalised to a title-cased label                  |
| JSON-LD `hiringOrganization.name` (else `<title>` tail)   | `companyName`        | de-slugified + title-cased fallback to slug        |
| —                                                         | `site`               | constant `Site.EXACTHIRE`                          |
| —                                                         | `atsType`            | constant `'exacthire'`                             |
| `description` text                                        | `emails`             | harvested via `extractEmails`                      |

Tenant resolution:

- `companySlug` (e.g. `aflcio`) → `https://aflcio.hirecentric.com`.
- `companySlug` containing `hirecentric.com` (a bare host) → its first non-`www`
  label is the tenant.
- `companyUrl` on a `hirecentric.com` host → its first non-`www` sub-domain label
  is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or empty sitemap |
| logged warn (HTTP 4xx)       | unknown sub-domain / missing sitemap / closed role — degrades, never throws |
| logged warn (parse failure)  | malformed detail page or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/exacthire.e2e-spec.ts`): known tenant
  (`companySlug: 'aflcio'`) returns shaped jobs (`site === Site.EXACTHIRE`,
  `atsType === 'exacthire'`, `atsId`/`jobUrl` defined); `companyUrl` resolution
  path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: manual type-review against the package tsconfig (the `Site.EXACTHIRE`
  enum member is registered centrally by the orchestrator).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-EH-1 — Sub-domain vs. custom-domain boards.** Most tenants front their
  board at `{tenant}.hirecentric.com`; some white-label it under a custom domain.
  **Default (proceeding):** build `{slug}.hirecentric.com` from a bare slug; a
  caller may pass a full `companyUrl` (or a bare host as `companySlug`) to address
  the board directly.
- **Q-EH-2 — Structured metadata availability.** Not every tenant emits a
  schema.org JobPosting JSON-LD block. **Default (proceeding):** prefer JSON-LD
  when present; fall back to the `og:` meta tags and the cross-tenant `<title>`
  pattern "{title} - {city}, {state} - {company} Jobs"; never fabricate fields.
- **Q-EH-3 — Compound job ids.** Some tenants use a compound id
  (`{jobId}-{subId}.html`, e.g. `232783-35332`); others use a plain id
  (`230695`). **Default (proceeding):** capture the full id token as the `atsId`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous HireCentric career board —
  the tenant XML sitemap (`/sitemap.xml`) for role enumeration and the per-role
  detail pages (`/jobs/{jobId}.html`) for structured metadata.
  **Confidence: plausible/documented (verified=false).** The surface structure
  was confirmed 2026-06-03 from the public Google index — the detail-page URL
  pattern and the `<title>` shape are consistent across many live tenants
  (`aflcio`, `myus`, `coadvantage`, `phihelico`, `ambu`, `spokaneproduce`,
  `employindy`, `cumminsbhs`, `apexbg`) — but the tenant `*.hirecentric.com`
  sub-domains were **not directly reachable** from the build environment's DNS
  resolver, so a live unauthenticated HTTP 200 could not be captured here. The
  parser is therefore written defensively and the e2e tests tolerate empty results.
- D-2: schema.org JobPosting JSON-LD is the preferred structured source; the
  `og:` meta tags and the `<title>` pattern are the documented fallback. This
  mirrors the ApplicantPro adapter (the closest schema.org/HTML sibling).
- D-3: The job id embedded in the detail-page URL is the stable per-role ATS id.
  Compound ids (`{jobId}-{subId}`) are captured whole.
- D-4: The sitemap enumerates every open role in one document (no server-side
  pagination of the job set); the adapter slices to `resultsWanted` **before**
  fetching detail pages (bounding the per-tenant request count), and de-dups by
  `atsId`.
- D-5: Pages are parsed with bounded, defensive regexes + a JSON-LD `JSON.parse`
  (with a recursive `@graph`/array walk to find the JobPosting node) rather than
  a heavyweight HTML/XML dependency, keeping the plugin dependency-free and
  resilient to minor cross-tenant markup drift.

## 11. References

- `packages/plugins/source-ats-exacthire/` — implementation.
- `packages/plugins/source-ats-applicantpro/` — schema.org/HTML sibling adapter
  (sitemap + detail-page parse) used as the structural template.
- Surface confirmed 2026-06-03 via the public Google index (not directly
  fetchable from the build environment — see D-1):
  - `https://aflcio.hirecentric.com/jobsearch/` — AFL-CIO public board.
  - `https://aflcio.hirecentric.com/jobs/230695.html` — indexed as
    "Senior Social Media Strategist - Washington, DC - AFL-CIO Jobs".
  - Sibling tenants on the same `{tenant}.hirecentric.com/jobs/{id}.html` pattern:
    `myus`, `coadvantage`, `phihelico`, `ambu`, `spokaneproduce`, `employindy`,
    `cumminsbhs`, `apexbg`.
