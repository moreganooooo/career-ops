# Spec: 371 — Mindscope ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 371                                           |
| Slug           | source-ats-mindscope                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 363-ish (TempWorks), (Scout Talent) |

## 1. Problem Statement

Mindscope (mindscope.com — now part of Univerus Workforce) is a staffing &
recruiting ATS/CRM vendor (US / CA) whose candidate-facing product is a branded,
public "Candidate Portal" / job board. Every customer tenant publishes a public,
**unauthenticated** career portal on a path segment of a shared portal host,
keyed by the tenant's portal code (an opaque alphanumeric token, e.g.
`WHITEC04415`): `https://portal{N}.mindscope.com/{TENANTCODE}_V2Portal/`. The
portal is a server-rendered ASP.NET WebForms application (the "V2Portal"), and
Mindscope markets "SEO-enhanced job listings compatible with Google for Jobs",
so the public job-detail pages carry schema.org `JobPosting` structured data.
Ever Jobs has no adapter for Mindscope-powered career portals, so these vacancies
are currently un-ingestable. A single generic, multi-tenant Mindscope adapter
unlocks the catalogue of Mindscope-powered career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-mindscope` plugin that ingests vacancies
  from **any** Mindscope career portal given a `companySlug` (the tenant/portal
  code, e.g. `WHITEC04415`) or a `companyUrl` (a portal URL on a `mindscope.com`
  host, from which the tenant code + portal host are extracted).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  job-board page (`…/Modules/Candidate/JobBoard.aspx`) to enumerate postings, plus
  each posting's server-rendered detail page
  (`…/Modules/Candidate/JobDetails.aspx?JobId={id}`), preferring its schema.org
  `JobPosting` JSON-LD (with `og:` meta / `<title>` / body HTML fallbacks).
- Map every posting into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'mindscope'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Mindscope candidate / recruiter portal area. This plugin
  consumes only the public candidate-facing job board + detail pages.
- Server-side filtering by category / location (the board supports facets). We
  ingest the tenant's full open-postings list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Mindscope tenant codes (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Mindscope plugin at a tenant's
> portal code, so that I ingest that organisation's full open-postings list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Mindscope adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant (portal origin + code) from `companySlug` (the portal code, used directly; a portal URL passed as the slug is reduced to its code) or from a `companyUrl` on a `mindscope.com` host (code taken from the `{code}_V2Portal` path segment; the `portal{N}` origin preserved). | must |
| FR-2  | Fetch the public server-rendered job-board page (`GET …/Modules/Candidate/JobBoard.aspx`) and enumerate every `JobDetails.aspx?JobId={id}` link, capturing `{id}` as the ATS id. | must |
| FR-3  | Fetch each posting's server-rendered detail page (`GET …/Modules/Candidate/JobDetails.aspx?JobId={id}`); prefer its schema.org `JobPosting` JSON-LD, with `og:` meta / `<title>` / body HTML as fallbacks. | must |
| FR-4  | De-duplicate postings by `atsId` within a single run.                                                | must     |
| FR-5  | Map each posting to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the board links before fetching details, bounded by a hard page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network / DNS errors, and malformed / non-JSON JSON-LD payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public board + detail pages      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MINDSCOPE, name: 'Mindscope', category: 'ats', isAts: true })
class MindscopeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; DEFENSIVE — surface researched 2026-06-03, see §10):

```
GET https://portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/JobBoard.aspx
  → server-rendered HTML; each open posting links to its detail page:
      <a href="…JobDetails.aspx?JobId={jobId}">{title}</a>

GET https://portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/JobDetails.aspx?JobId={jobId}
  → HTML detail page, preferably embedding
      <script type="application/ld+json">{ "@type": "JobPosting",
        "title": "…", "description": "<p>…HTML body…</p>",
        "datePosted": "2026-05-20", "employmentType": "FULL_TIME",
        "hiringOrganization": { "name": "…" },
        "jobLocation": { "address": { "addressLocality": "Toronto",
          "addressRegion": "ON", "addressCountry": "CA" } } }</script>
      and `<meta property="og:title|og:description|og:url" …>` as fallbacks.
```

Wire shape → `JobPostDto` mapping:

| Source field                                                  | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `JobId` (from the board link)                                 | `atsId`, `id`           | `id` is prefixed `mindscope-{atsId}`                        |
| JSON-LD `title` → `og:title` → `<title>`                      | `title`                 | required; posting skipped if absent                         |
| `…/JobDetails.aspx?JobId={id}`                                | `jobUrl`, `applyUrl`    | canonical public detail / apply URL (JSON-LD `url` preferred for apply) |
| JSON-LD `description` (HTML) → `og:description` (text)         | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted`                                          | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| JSON-LD `jobLocation.address` (locality / region / country)   | `location`              | null when none usable                                       |
| `jobLocationType` / title / location                          | `isRemote`              | remote detection (`telecommute` / `remote` / `wfh` …)       |
| JSON-LD `occupationalCategory` / `industry`                   | `department`            | when present                                                |
| JSON-LD `employmentType` (`FULL_TIME` → `Full Time`)          | `employmentType`        | token normalised to a readable label                        |
| JSON-LD `hiringOrganization.name`, else the tenant code       | `companyName`           | de-slugified + title-cased when derived from the code       |
| —                                                             | `site`                  | constant `Site.MINDSCOPE`                                   |
| —                                                             | `atsType`               | constant `'mindscope'`                                      |
| `description` text                                            | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `WHITEC04415`) → used directly as the portal code on the
  default `portal2.mindscope.com` host; a trailing `_V2Portal` suffix is stripped.
- `companySlug` containing a portal URL / `mindscope.com` host → the portal code +
  `portal{N}` origin are extracted from the URL.
- `companyUrl` on a `mindscope.com` host
  (`portal{N}.mindscope.com/{code}_V2Portal/…`) → the code is taken from the
  `{code}_V2Portal` path segment and the origin is preserved.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or no postings |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-posting map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/mindscope.e2e-spec.ts`): known tenant
  (`companySlug: 'WHITEC04415'`) returns shaped jobs (`site === Site.MINDSCOPE`,
  `atsType === 'mindscope'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-MS-1 — Portal host enumeration.** Tenants live across multiple numbered portal
  hosts (`portal2`, `portal3`, …). **Default (proceeding):** address a tenant by its
  portal code on the default `portal2.mindscope.com` host; a caller may pass a full
  `companyUrl` (or `host/code` slug) to pin a non-default `portal{N}` host. Host
  enumeration / discovery is deferred to the source-adoption backlog.
- **Q-MS-2 — Company display name.** The public board derives no guaranteed tenant
  brand name. **Default (proceeding):** prefer JSON-LD `hiringOrganization.name`,
  else de-slugify + title-case the tenant code for `companyName`; downstream
  enrichment may override.
- **Q-MS-3 — Public page names.** The exact public job-board / job-detail page names
  and the `JobId` query key could not be confirmed live without authentication.
  **Default (proceeding):** use the documented V2Portal candidate-module page paths
  (`JobBoard.aspx`, `JobDetails.aspx?JobId={id}`) and parse defensively around the
  stable structural markers (the detail link, JSON-LD `JobPosting`, `og:` meta, and
  `<title>` / body HTML); any 4xx / missing page / malformed body degrades to an
  empty result. (verified=false — DEFENSIVE.)

## 10. Decisions

- D-1: Primary surface is the public, anonymous, server-rendered candidate portal on
  `portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/…`: the
  `JobBoard.aspx` page for enumeration plus each posting's `JobDetails.aspx?JobId={id}`
  detail page (preferring its schema.org `JobPosting` JSON-LD). **Confidence:
  DEFENSIVE (verified=false)** — the platform and the tenant portal pattern
  `portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/…` were confirmed
  live 2026-06-03 against the named real tenant portal `WHITEC04415` on
  `portal2.mindscope.com` (a public `…/CandidateLogin.aspx` candidate portal); the
  exact public job-board / job-detail page names and JSON-LD presence could NOT be
  confirmed without authentication and follow Mindscope's documented public portal /
  Google for Jobs surface and the sibling server-HTML ATS adapters.
- D-2: The portal is a server-rendered ASP.NET WebForms app (not a SPA); the
  server-rendered HTML (board links + detail JSON-LD / og: / body) is the documented,
  no-auth surface and is used here. No public JSON list feed was discoverable.
- D-3: The richest structured fields available per posting are the detail page's
  JSON-LD `title`, `description` (HTML), `datePosted`, `employmentType`,
  `occupationalCategory` / `industry`, `hiringOrganization.name`, and
  `jobLocation.address`; the `JobId` query parameter is the stable per-posting ATS id.
- D-4: The board lists every open posting in one document; the adapter fetches it
  once, de-dups by `atsId`, slices to `resultsWanted` (bounded by a page cap), then
  fetches each wanted posting's detail page.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all payloads are parsed with
  defensive object/array narrowing + try/catch around JSON-LD parsing so minor wire
  drift never throws.

## 11. References

- `packages/plugins/source-ats-mindscope/` — implementation.
- Surface researched 2026-06-03 (no authentication — DEFENSIVE, verified=false):
  - Platform + tenant portal pattern
    `portal{N}.mindscope.com/{TENANTCODE}_V2Portal/Modules/Candidate/…`, confirmed
    with the named real tenant portal `WHITEC04415` on `portal2.mindscope.com`
    (a public `…/Modules/Candidate/CandidateLogin.aspx` candidate portal; the portal
    is a server-rendered ASP.NET WebForms "V2Portal" app).
  - Mindscope markets "SEO-enhanced job listings compatible with Google for Jobs",
    so detail pages are parsed JSON-LD-first; the exact public job-board /
    job-detail page names and the `JobId` query key could not be confirmed live
    without authentication and follow the documented V2Portal candidate-module
    surface + the sibling server-HTML ATS adapters (verified=false).
