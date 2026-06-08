# Spec: 361 — Snaphunt ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 361                                           |
| Slug           | source-ats-snaphunt                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Snaphunt (snaphunt.com) is a global / APAC AI-assisted remote-hiring marketplace.
Each customer is given a branded, public candidate career-site on its own
sub-domain of `snaphunt.com` (`https://{tenant}.snaphunt.com/`). Because Snaphunt
is a marketplace, the company is a per-job field — every role carries its own
`hiringOrganization`. The tenant career-site jobs index and detail pages are
client-rendered, but each role's open-positions list is enumerated by a public XML
sitemap (`/sitemap.xml` of `/job/{jobId}` URLs) and the fully-rendered role detail
is served from the canonical apex page (`https://snaphunt.com/jobs/{jobId}`) with
schema.org `JobPosting` JSON-LD for Google-for-Jobs. Ever Jobs has no adapter for
Snaphunt-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Snaphunt adapter unlocks the full catalogue of
Snaphunt-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-snaphunt` plugin that ingests vacancies
  from **any** Snaphunt career-site given a `companySlug` (the tenant sub-domain
  label, e.g. `snappr`) or a `companyUrl` (a career-site URL on `snaphunt.com`,
  used verbatim).
- Use the **public, anonymous** surface (no auth, no API key): the tenant XML
  sitemap (`/sitemap.xml`) to enumerate open roles, plus each role's canonical
  apex detail page carrying schema.org `JobPosting` JSON-LD.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'snaphunt'`, `department`, `employmentType`), with
  the company resolved per-job from `hiringOrganization.name`.

## 3. Non-Goals

- Any authenticated Snaphunt employer / recruiter API. This plugin consumes only
  the public candidate-facing surface.
- Server-side filtering by department / location / contract type (the platform
  supports these facets). We ingest the tenant's full open-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Snaphunt tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Snaphunt plugin at a
> tenant's career-site slug, so that I ingest that career-site's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Snaphunt adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the career-site host from `companySlug` (→ `{slug}.snaphunt.com`) or from a `companyUrl` on `snaphunt.com` (origin used verbatim). | must |
| FR-2  | Fetch the public XML sitemap (`GET /sitemap.xml`) and enumerate `/job/{jobId}` open-role URLs.        | must     |
| FR-3  | Fetch each role's canonical apex detail page (`/jobs/{jobId}`) and parse its schema.org `JobPosting` JSON-LD (with `og:` meta fallbacks); use the job id as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl, per-job companyName). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the enumerated role set before fetching details. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, malformed / non-JSON JSON-LD, and the client-rendered shell's `"undefined"` placeholder fields without throwing. | must |

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
@SourcePlugin({ site: Site.SNAPHUNT, name: 'Snaphunt', category: 'ats', isAts: true })
class SnaphuntService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched & verified live 2026-06-03):

```
GET https://{tenant}.snaphunt.com/sitemap.xml
  → <urlset> with one <url><loc>…/job/{jobId}</loc>
      <lastmod>{ISO date}</lastmod></url> per open role.

GET https://snaphunt.com/jobs/{jobId}
  → HTML carrying a schema.org JobPosting JSON-LD block:
    <script type="application/ld+json">
      { "@type": "JobPosting",
        "title": "Search Quality Rater (Remote)",
        "description": "<p>…HTML body…</p>",
        "datePosted": "2024-10-17T09:56:56.455Z",
        "validThrough": "2025-04-18T22:00:00.084Z",
        "employmentType": ["PART_TIME"],
        "jobLocationType": "TELECOMMUTE",
        "hiringOrganization": { "@type": "Organization", "name": "…" },
        "jobLocation": [ { "@type": "Place", "address": {
          "addressLocality": "Sarasota", "addressCountry": "United States" } } ],
        "applicantLocationRequirements": [
          { "@type": "Country", "name": "United States" } ],
        "identifier": { "@type": "PropertyValue", "value": "{jobId}" } }
    </script>
    (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| JSON-LD field                                          | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| job id from `<loc>` (`/job/{id}`) / `identifier.value` | `atsId`, `id`           | `id` is prefixed `snaphunt-{atsId}`                         |
| `title` (else `og:title` / `<title>` leading segment)  | `title`                 | required; role skipped if absent / placeholder              |
| tenant detail URL (else JSON-LD `url` / `og:url`)      | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| `description` (HTML) else `og:description` (plain)      | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else sitemap `<lastmod>`)                | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `jobLocation[].address.{addressLocality,Region,Country}` | `location`            | city / state / country; null when none usable               |
| `applicantLocationRequirements[].name` (Country)       | `location.country`      | fallback country for remote roles lacking a `jobLocation`   |
| `jobLocationType` (`TELECOMMUTE`) / title / location    | `isRemote`              | remote detection (`remote` / `work from anywhere` / `wfh` …) |
| `industry` / `occupationalCategory`                    | `department`            | when present                                                |
| `employmentType` (`["FULL_TIME"]` → `Full Time`)       | `employmentType`        | schema.org enum (array) normalised to a readable label      |
| `hiringOrganization.name` (else tenant slug)           | `companyName`           | per-job; de-slugified + title-cased                         |
| —                                                       | `site`                  | constant `Site.SNAPHUNT`                                    |
| —                                                       | `atsType`               | constant `'snaphunt'`                                       |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Host resolution:

- `companySlug` (e.g. `snappr`) → `https://snappr.snaphunt.com`.
- `companySlug` containing a bare host (`snappr.snaphunt.com`) → used as the host.
- `companyUrl` whose hostname is `snaphunt.com` or ends in `.snaphunt.com` → its
  origin is used verbatim.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page / non-JSON JSON-LD or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/snaphunt.e2e-spec.ts`): known tenant (`companySlug: 'snappr'`)
  returns shaped jobs (`site === Site.SNAPHUNT`, `atsType === 'snaphunt'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SH-1 — Marketplace company resolution.** Snaphunt is a marketplace, so the
  company is a per-job field, not a property of the tenant host; on the canonical
  apex page some roles carry the marketplace name in `hiringOrganization.name`.
  **Default (proceeding):** map `companyName` per-job from `hiringOrganization.name`,
  falling back to the de-slugified tenant label when absent.
- **Q-SH-2 — Client-rendered career-site detail.** The tenant career-site detail
  pages (`{tenant}.snaphunt.com/job/{jobId}`) are client-rendered, so a no-JS fetch
  returns an app shell whose JSON-LD still holds literal `"undefined"` placeholder
  values. **Default (proceeding):** read role detail from the canonical apex page
  (`https://snaphunt.com/jobs/{jobId}`), which is server-rendered; treat literal
  `"undefined"` / `"null"` tokens as absent fields. Confidence: **verified**.
- **Q-SH-3 — Remote-role location.** Remote roles often omit a physical
  `jobLocation` and instead carry `applicantLocationRequirements` (a Country).
  **Default (proceeding):** fall back to the applicant-requirement country for the
  location's country when no `jobLocation.address` is present, and flag the role
  remote from `jobLocationType: TELECOMMUTE`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant XML sitemap (`/sitemap.xml`)
  for role enumeration plus each role's canonical apex detail page
  (`https://snaphunt.com/jobs/{jobId}`) carrying schema.org `JobPosting` JSON-LD.
  This mirrors the sibling schema.org ATS adapters (Hireful / ApplicantPro).
  **Confidence: verified** — the platform, tenant host pattern
  (`{tenant}.snaphunt.com`), per-tenant sitemap of `/job/{jobId}` entries, and the
  apex JSON-LD payload shape were all confirmed live 2026-06-03 with named real
  tenants.
- D-2: There is no public, tenant-agnostic JSON list feed. The per-tenant sitemap +
  per-role canonical JSON-LD detail pages are the documented, no-auth, crawlable
  surface and are used here.
- D-3: The richest structured fields available per role are the JSON-LD `title`,
  `description` (HTML), `datePosted`, `employmentType` (array), `hiringOrganization.name`,
  `jobLocation[].address`, and `applicantLocationRequirements`. The job id (from the
  detail URL / `identifier.value`) is the stable per-role ATS id.
- D-4: The sitemap enumerates every open role for the tenant in one document (no
  server-side pagination of the job set); the adapter slices the enumerated set to
  `resultsWanted` before fetching detail pages. De-dup is by `atsId`.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and `og:`
  meta fallbacks via bounded regexes — keeping the plugin dependency-free and
  resilient to minor markup drift and the client-shell `"undefined"` placeholders.

## 11. References

- `packages/plugins/source-ats-snaphunt/` — implementation.
- Surface researched & verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.snaphunt.com` confirmed, with named
    real tenants serving populated `/sitemap.xml` of `/job/{jobId}` entries:
    `snappr`, `steenbok`, `totalshape`, `venture`, `personalbuero`.
  - The canonical apex detail page `https://snaphunt.com/jobs/{jobId}` returns a
    fully-rendered schema.org `JobPosting` JSON-LD block (verified=true); the tenant
    career-site detail pages are client-rendered (JSON-LD hydrates client-side), so
    role detail is read from the apex page.
