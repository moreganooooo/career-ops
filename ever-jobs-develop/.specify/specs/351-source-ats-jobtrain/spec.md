# Spec: 351 — Jobtrain ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 351                                           |
| Slug           | source-ats-jobtrain                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 342 (Talentsoft), 348 (ApplicantPro)          |

## 1. Problem Statement

Jobtrain (jobtrain.co.uk) is an established UK ATS used by NHS boards, local
government, housing associations and charities. Every customer tenant publishes
a branded, public career site under a tenant path on the shared career host
(`https://www.jobtrain.co.uk/{tenant}/Home/Job`). The listing page is rendered
client-side, but the tenant's live-vacancy card partial
(`/{tenant}/Home/_JobCard`) and each role's server-rendered detail page (which
embeds a complete schema.org `JobPosting` JSON-LD block at
`/{tenant}/Job/JobDetail?JobId={id}`) are public and unauthenticated. Ever Jobs
has no adapter for Jobtrain-powered career sites, so these vacancies are
currently un-ingestable. A single generic, multi-tenant Jobtrain adapter unlocks
the full catalogue of Jobtrain-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-jobtrain` plugin that ingests
  vacancies from **any** Jobtrain-powered career site given a `companySlug`
  (the tenant career path segment, e.g. `crossreach`) or a `companyUrl` (any
  page on the tenant career path, whose first path segment is the tenant).
- Use the **public, anonymous career-site surface** (no auth, no API key): the
  `_JobCard` partial to enumerate live roles and the schema.org `JobPosting`
  JSON-LD on each detail page to extract structured fields.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'jobtrain'`, `employmentType`).

## 3. Non-Goals

- The per-tenant automated XML vacancy feed Jobtrain provisions for partner job
  boards (e.g. the LinkedIn job feed). That feed is set up per integration at an
  opaque, non-discoverable URL and is unsuitable for a generic, tenant-agnostic,
  unauthenticated scraper.
- Server-side filtering by location / department / region (the career site
  supports these facets). We ingest the tenant's full live-roles list and slice
  client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Jobtrain tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Jobtrain plugin at a
> tenant's careers slug, so that I ingest that organisation's full live-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Jobtrain adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (the career path segment) or from a `companyUrl` on the `jobtrain.co.uk` host (its first path segment). | must |
| FR-2  | Fetch the public card partial (`GET /{tenant}/Home/_JobCard`) and extract its distinct job ids. | must |
| FR-3  | Fetch each role's detail page (`GET /{tenant}/Job/JobDetail?JobId={id}`) and parse its schema.org `JobPosting` JSON-LD. | must |
| FR-4  | Use the numeric job id as the stable `atsId`; de-duplicate job ids within a single run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by fetching only that many detail pages.             | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, and malformed JSON-LD / pages without throwing.  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career site only           |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | fetch at most `resultsWanted` detail pages |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JOBTRAIN, name: 'Jobtrain', category: 'ats', isAts: true })
class JobtrainService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `crossreach`):

```
GET https://www.jobtrain.co.uk/crossreach/Home/_JobCard
  → text/html fragment with one card per live role:
    <article … data-jobId="14496" …>
      … <a href="/crossreach/Job/JobDetail?JobId=14496"> … </a> …
    </article>
    … (24 live cards for CrossReach) …

GET https://www.jobtrain.co.uk/crossreach/Job/JobDetail?JobId=14496
  → text/html embedding:
    <script type="application/ld+json">
      { "@context": "http://schema.org", "@type": "JobPosting",
        "title": "Support Worker - Part Time (Term time only) ",
        "datePosted": "2026-05-28",
        "validThrough": "2026-06-14T00:00",
        "baseSalary": "£13.65/hour - £14.03/hour (CRB18)",
        "employmentType": "Term Time",
        "description": "<div class=\"JT-inner\">…HTML body…</div>",
        "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress",
          "addressLocality": "Motherwell", "addressRegion": "North Lanarkshire",
          "postalCode": "ML1 1JJ", "addressCountry": "GB" } },
        "hiringOrganization": { "@type": "Organization", "name": "CrossReach" },
        "url": "https://www.jobtrain.co.uk/crossreach/Job/JobDetail?JobId=14496&Source=…" }
    </script>
```

Verified wire shape → `JobPostDto` mapping (`crossreach`, CrossReach, 2026-06-03):

| Source field                                       | JobPostDto field        | Notes                                                       |
| -------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| numeric `data-jobId` / `JobDetail?JobId=` from card | `atsId`, `id`          | `id` is prefixed `jobtrain-{atsId}`                         |
| JSON-LD `title`                                    | `title`                 | required; role skipped if absent                            |
| fetched detail URL (clean, no `&Source=`)          | `jobUrl`, `applyUrl`    | absolute public detail / apply URL                          |
| JSON-LD `description` (HTML)                        | `description`           | format-converted (HTML / Markdown / Plain)                  |
| JSON-LD `datePosted` (`YYYY-MM-DD`)                | `datePosted`            | parsed → `YYYY-MM-DD`; `0001-01-01` placeholder → null      |
| JSON-LD `jobLocation.address` (`PostalAddress`)    | `location`              | city / state (region) / country; null when none usable      |
| JSON-LD `title` / `employmentType` / `description` | `isRemote`              | UK remote detection (`remote` / `home working` / `hybrid` …) |
| JSON-LD `employmentType`                           | `employmentType`        | surfaced verbatim                                           |
| JSON-LD `hiringOrganization.name` (else tenant)    | `companyName`           | de-slugified + title-cased fallback                         |
| JSON-LD `description` text                          | `emails`                | harvested via `extractEmails`                               |
| —                                                  | `site`                  | constant `Site.JOBTRAIN`                                    |
| —                                                  | `atsType`               | constant `'jobtrain'`                                       |
| —                                                  | `department`            | null (no first-class department on the Jobtrain feed)       |

Tenant resolution:

- `companySlug` (e.g. `crossreach`) → tenant path segment used verbatim
  (lower-cased).
- `companyUrl` whose hostname ends in `jobtrain.co.uk` → its first path segment
  is the tenant (e.g. `/crossreach/Home/Job` → `crossreach`).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or no cards  |
| logged warn (HTTP 4xx)       | unknown tenant or removed role — degrades to empty/partial, never throws  |
| logged warn (parse failure)  | malformed JSON-LD / page or per-role map error — partial, never throws    |

## 8. Test Plan

- E2E (`__tests__/jobtrain.e2e-spec.ts`): known tenant
  (`companySlug: 'crossreach'`) returns shaped jobs (`site === Site.JOBTRAIN`,
  `atsType === 'jobtrain'`, `atsId`/`jobUrl` defined); `companyUrl` resolution
  path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-JT-1 — Listing enumeration.** The career listing page is client-rendered
  and carries no server-side job links. **Default (proceeding):** enumerate
  live roles from the `_JobCard` HTML partial the listing widget itself calls,
  which lists every live vacancy in one fragment.
- **Q-JT-2 — Department signal.** The schema.org `JobPosting` Jobtrain emits has
  no first-class department/org-unit field. **Default (proceeding):** leave
  `department` null rather than fabricate one from the role title.
- **Q-JT-3 — Salary.** The feed exposes a free-text `baseSalary` band, but the
  sibling ATS adapters do not populate a structured compensation DTO field.
  **Default (proceeding):** retain `baseSalary` in the parsed type for
  completeness but do not map it (matching the sibling adapters' field set).

## 10. Decisions

- D-1: Primary surface is the public, anonymous career site at
  `https://www.jobtrain.co.uk/{tenant}/`: the `_JobCard` partial enumerates live
  roles and each `/{tenant}/Job/JobDetail?JobId={id}` page embeds a schema.org
  `JobPosting` JSON-LD block. Verified live 2026-06-03 against the CrossReach
  tenant (`crossreach`): `_JobCard` returned 24 live vacancy cards, and
  `JobDetail?JobId=14496` returned a complete JSON-LD `JobPosting`.
  **Confidence: verified** (card partial + JSON-LD field set confirmed live).
- D-2: The per-tenant automated XML vacancy feed (LinkedIn job feed, etc.) is
  provisioned per integration at an opaque, non-discoverable URL and is therefore
  unsuitable for a tenant-agnostic scraper; it is an explicit non-goal. The
  public career-site surface is the documented, no-auth surface.
- D-3: The richest structured fields available per role are the JSON-LD
  `title`, `datePosted`, `validThrough`, `baseSalary`, `employmentType`,
  `description` (HTML), `jobLocation.address` (`PostalAddress`), and
  `hiringOrganization.name`. The numeric job id from the card is the stable
  per-role ATS id.
- D-4: The card partial returns every live role in one response (no server-side
  pagination); the adapter enumerates once and fetches only `resultsWanted`
  detail pages. De-dup is by `atsId` (the job id).
- D-5: Detail pages are parsed by extracting the JSON-LD `<script>` block and
  `JSON.parse`-ing it (after decoding the numeric HTML entities Jobtrain emits,
  e.g. `&#xA3;` → `£`), tolerating a bare object / array / `@graph` wrapper,
  rather than scraping the rendered DOM — keeping the plugin dependency-free and
  resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-jobtrain/` — implementation.
- Live surface verified 2026-06-03 (no authentication):
  - `GET https://www.jobtrain.co.uk/crossreach/Home/_JobCard`
    → HTTP 200 HTML fragment with 24 live vacancy cards.
  - `GET https://www.jobtrain.co.uk/crossreach/Job/JobDetail?JobId=14496`
    → HTTP 200 HTML with a complete `application/ld+json` `JobPosting`.
  - Sibling tenants on the same host/path pattern: `citizensadvice`, `thirteen`,
    `jobtrainsolutions`.
