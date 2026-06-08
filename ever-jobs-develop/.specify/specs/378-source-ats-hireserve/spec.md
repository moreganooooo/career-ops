# Spec: 378 — Hireserve ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 378                                           |
| Slug           | source-ats-hireserve                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Hireserve (hireserve.com, UK) is an applicant-tracking system for in-house
recruitment teams. Every customer tenant publishes a branded, public,
unauthenticated candidate careers portal powered by Hireserve's Oracle PL/SQL
"wd_portal" web application. A tenant portal is addressed by a **host** plus a
numeric **web-site id** (`p_web_site_id`); the candidate-facing hosts are
`{tenant}.hireserve-projects.com` (production), `{tenant}.hireserve-test.com`
(staging), and the shared `ats8.hireserve.com`. The portal renders a
server-rendered open-vacancies listing and per-role detail pages, so it is directly
crawlable without authentication. Ever Jobs has no adapter for Hireserve-powered
career portals, so these vacancies are currently un-ingestable. A single generic,
multi-tenant Hireserve adapter unlocks the full catalogue of Hireserve-powered
career portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hireserve` plugin that ingests vacancies
  from **any** Hireserve career portal given a `companyUrl` (a portal URL carrying
  the `p_web_site_id`) or a `companySlug` of the form `{host}:{siteId}` /
  `{tenant}:{siteId}` / a full portal URL.
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-vacancies listing
  (`/wd/plsql/wd_portal.list?p_web_site_id={id}&p_function=map&p_title=Current+Vacancies`)
  to enumerate roles (the `/vacancy/{slug}-{ID}.html` anchors), plus each role's
  server-rendered detail page for the body and metadata.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId` = `p_web_page_id`, `atsType: 'hireserve'`, `department`,
  `employmentType`).

## 3. Non-Goals

- Any authenticated Hireserve admin / recruiter / candidate API. This plugin
  consumes only the public candidate-facing portal.
- Server-side filtering by location / job-type / hours (the portal supports these
  facets). We ingest the tenant's full current-vacancies listing and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, CV upload, or any write operation.
- Resolving a bare tenant slug with no numeric site id (the listing is keyed by
  `p_web_site_id`, so a site id is required to enumerate the board).
- A curated seed list of Hireserve tenant hosts / site ids (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Hireserve plugin at a tenant's
> careers portal URL, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Hireserve adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the portal target (host + numeric `p_web_site_id`) from `companyUrl` (a Hireserve-host URL carrying `p_web_site_id`) or from a `companySlug` of the form `{host}:{siteId}` / `{tenant}:{siteId}` / a full portal URL. | must |
| FR-2  | Fetch the public server-rendered listing (`GET …/wd/plsql/wd_portal.list?p_web_site_id={id}&p_function=map&p_title=Current+Vacancies`) and extract every `/vacancy/{slug}-{ID}.html` anchor. | must |
| FR-3  | Use the trailing numeric `{ID}` (`p_web_page_id`) of each vacancy URL as the stable `atsId`; the pretty `/vacancy/{slug}-{ID}.html` URL is the canonical detail / apply URL. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Fetch each role's server-rendered detail page (best-effort) for the title, body, location, employment type, department, and closing date. | should |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by slicing the anchor set, bounded by a page cap.    | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no host+siteId target can be resolved. | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx / "Unauthorised"), network errors, and malformed pages without throwing. | must |
| FR-11 | Fan out per-role detail fetches with `Promise.allSettled` so a single bad role never aborts the run. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                              |
| ------ | --------------------------------------------- | ----------------------------------- |
| NFR-1  | No credentials / secrets required             | public listing + detail pages       |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result    |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support       |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap  |
| NFR-5  | A single bad tenant / role never aborts a batch | scrape never throws; allSettled   |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.HIRESERVE, name: 'Hireserve', category: 'ats', isAts: true })
class HireserveService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{host}/wd/plsql/wd_portal.list?p_web_site_id={siteId}&p_function=map&p_title=Current+Vacancies
  → server-rendered HTML carrying one anchor per open role:
      <a href="/vacancy/{title-slug}-{ID}.html">{Job Title}</a>
    where {ID} is the stable Hireserve p_web_page_id.

GET https://{host}/vacancy/{title-slug}-{ID}.html
  → 301 → /wd/plsql/wd_portal.show_job?p_web_site_id={siteId}&p_web_page_id={ID}&p_lang=DEFAULT
  → server-rendered detail HTML (title heading, reference number, employment-type
    line e.g. "Full Time fixed hours", optional salary / location / closing-date
    lines, body). No schema.org JSON-LD; parsed defensively with og: / <title> /
    labelled-line fallbacks.
```

Wire shape → `JobPostDto` mapping:

| Source                                                  | JobPostDto field      | Notes                                                       |
| ------------------------------------------------------- | --------------------- | ----------------------------------------------------------- |
| trailing `{ID}` of `/vacancy/{slug}-{ID}.html` (`p_web_page_id`) | `atsId`, `id` | `id` is prefixed `hireserve-{atsId}`                        |
| anchor text, else detail `og:title` / `<title>`         | `title`               | required; role skipped if absent                            |
| `https://{host}/vacancy/{slug}-{ID}.html`               | `jobUrl`, `applyUrl`  | canonical public detail / apply URL                         |
| detail body HTML, else listing location line            | `description`         | format-converted (HTML / Markdown / Plain)                  |
| detail closing-date line (absolute only)                | `datePosted`          | parsed → `YYYY-MM-DD`; relative values yield null           |
| detail / listing location line                          | `location`            | city / state / country split; null when none usable         |
| title / location / work-type text                       | `isRemote`            | remote detection (`remote` / `wfh` / `home-based` …)        |
| detail department / category line                       | `department`          | when present                                                |
| detail / listing work-type line                         | `employmentType`      | token normalised to a readable label                        |
| tenant sub-domain label                                 | `companyName`         | de-slugified + title-cased (portal carries no brand field)  |
| —                                                       | `site`                | constant `Site.HIRESERVE`                                   |
| —                                                       | `atsType`             | constant `'hireserve'`                                      |
| `description` text                                      | `emails`              | harvested via `extractEmails`                               |

Target resolution:

- `companyUrl` on a Hireserve host (`*.hireserve-projects.com`,
  `*.hireserve-test.com`, `*.hireserve.com`) carrying `p_web_site_id` → its origin +
  site id; the tenant token is the leading sub-domain label.
- `companySlug` of the form `{host}:{siteId}` (e.g.
  `university.hireserve-projects.com:2624`) or `{tenant}:{siteId}` (the tenant label
  expanded to `{tenant}.hireserve-projects.com`).
- `companySlug` carrying a full portal URL → parsed like `companyUrl`.
- A bare tenant slug with no site id, or a URL without `p_web_site_id`, cannot be
  resolved (the listing is keyed by the site id) → empty result.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable target, unknown tenant (HTTP 4xx), or no roles   |
| logged warn (HTTP 4xx)       | unknown / disabled tenant or site id — degrades to empty, never throws     |
| logged warn (parse failure)  | malformed page or per-role map error — partial, never throws (allSettled)  |

## 8. Test Plan

- E2E (`__tests__/hireserve.e2e-spec.ts`): known tenant
  (`companySlug: 'university.hireserve-projects.com:2624'`) returns shaped jobs
  (`site === Site.HIRESERVE`, `atsType === 'hireserve'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; bare-slug (no
  site id) returns empty; unknown tenant degrades gracefully; `resultsWanted`
  honoured. Network-tolerant (zero results is acceptable; shape assertions guarded
  by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HS-1 — Tenant addressing requires a site id.** The Hireserve listing is keyed
  by the numeric `p_web_site_id`, not a bare slug, and tenant hosts vary
  (`*.hireserve-projects.com`, `*.hireserve-test.com`, `ats8.hireserve.com`).
  **Default (proceeding):** require both a host and a site id, supplied via
  `companyUrl` (carrying `p_web_site_id`) or a `{host}:{siteId}` / `{tenant}:{siteId}`
  slug; a bare slug without a site id degrades to empty. Site-id discovery from a
  bare host is deferred to the source-adoption backlog.
- **Q-HS-2 — Structured detail metadata.** Detail pages render server-side and carry
  **no** schema.org `JobPosting` JSON-LD. **Default (proceeding):** parse the title
  from the anchor / `og:title` / `<title>`, the body from the page region, and
  location / employment-type / department / closing-date from labelled lines, all
  narrowed defensively.
- **Q-HS-3 — Company display name.** The portal carries no machine-readable brand
  field. **Default (proceeding):** de-slugify + title-case the tenant sub-domain
  label for `companyName`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered "wd_portal" listing
  (`wd_portal.list?p_function=map&p_title=Current+Vacancies&p_web_site_id={id}`) for
  enumeration (the `/vacancy/{slug}-{ID}.html` anchors) plus each role's
  server-rendered detail page for the body and metadata. **Confidence: verified** —
  the platform, the `{tenant}.hireserve-projects.com` + `p_web_site_id` addressing,
  the listing HTML, and the per-role vacancy URL shape `/vacancy/{slug}-{ID}.html`
  (301-redirecting to `wd_portal.show_job?…p_web_page_id={ID}`) were confirmed live
  2026-06-03 against the named real tenant `university` (University of Hireserve demo
  portal, `https://university.hireserve-projects.com/`, `p_web_site_id=2624`).
- D-2: The portal is server-rendered HTML (not a SPA) with no JSON-LD, so the HTML
  itself is the documented no-auth surface; detail pages are parsed with `og:` /
  `<title>` / labelled-line / body fallbacks, all defensively narrowed.
- D-3: The stable per-role ATS id is the trailing numeric `{ID}` of the vacancy URL
  (the `p_web_page_id`). The richest per-role fields are the detail page's title,
  body, employment type, location, department, and closing date.
- D-4: The listing renders every open role in one document (no server-side
  pagination of the job set); the adapter collects deduped anchors and slices to
  `resultsWanted` (bounded by a hard page cap), then fan-outs detail fetches with
  `Promise.allSettled`. De-dup is by `atsId` (`p_web_page_id`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-hireserve/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant addressing (host + `p_web_site_id`), confirmed with the named
    real tenant `university` (University of Hireserve demo portal,
    `https://university.hireserve-projects.com/`, `p_web_site_id=2624`, 14 open roles
    at time of research).
  - The server-rendered listing
    (`wd_portal.list?p_function=map&p_title=Current+Vacancies&p_web_site_id=2624`)
    and the per-role vacancy URL shape `/vacancy/{slug}-{ID}.html` (e.g.
    `/vacancy/business-analyst-407240.html`, `/vacancy/finance-officer-388655.html`),
    with the trailing `{ID}` as the per-role ATS id (`p_web_page_id`); the pretty URL
    301-redirects to `wd_portal.show_job?p_web_site_id=2624&p_web_page_id={ID}`
    (verified=true). Other live Hireserve hosts seen: `ats8.hireserve.com`
    (`p_web_site_id=3`), `ska.hireserve-projects.com`, `stepchange.hireserve-test.com`.
