# Spec: 346 — TalentReef ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 346                                           |
| Slug           | source-ats-talentreef                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 330 (Prescreen)            |

## 1. Problem Statement

TalentReef (talentreef.com, a Mitratech product) is a US, high-volume /
hourly-workforce ATS (QSR, retail, hospitality, grocery; 500k+ recruiters). Every
customer tenant publishes a branded, public, unauthenticated career-search site
on the shared TalentReef "Job Application Network" host
(`https://apply.jobappnetwork.com/{tenant}/{lang}`, e.g. `rtg` for Rooms To Go,
`jibinc` for Jack in the Box). Ever Jobs has no adapter for TalentReef-powered
career pages, so these (typically very high-volume) vacancies are currently
un-ingestable. A single generic, multi-tenant TalentReef adapter unlocks the
full catalogue of TalentReef-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-talentreef` plugin that ingests
  vacancies from **any** TalentReef-powered career page given a `companySlug`
  (the tenant slug, e.g. `rtg`) or a `companyUrl` (a career URL whose leading
  path segment is the tenant).
- Use the **public, anonymous career-search page** (no auth, no API key) served
  at `https://apply.jobappnetwork.com/{tenant}/{lang}`, harvesting open roles
  from the embedded schema.org `JobPosting` JSON-LD and/or the SPA positions
  array.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'talentreef'`, `department`).

## 3. Non-Goals

- The authenticated TalentReef / `api.jobappnetwork.com` recruiter API
  (returns HTTP 401 without a key).
- The legacy applicant-portal / onboarding surface
  (`{secure|cf-apply}.jobappnetwork.com/apply/c_{code}/l_{lang}/`), which is the
  application surface, not the public job-listing surface.
- Server-side filtering by category / state / keyword. We ingest the tenant's
  full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of TalentReef tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the TalentReef plugin at a
> tenant's career slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the TalentReef adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant slug from `companySlug` (preferred), or from the leading path segment / sub-domain of `companyUrl`. | must |
| FR-2  | Fetch the tenant career page (`GET /{tenant}/{lang}`) once and harvest open roles from its schema.org `JobPosting` JSON-LD blocks and/or embedded SPA positions array. | must |
| FR-3  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-4  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-5  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-6  | Honour `resultsWanted` (default 100 internally) by slicing the harvested list.                      | must     |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-8  | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career page only          |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TALENTREEF, name: 'TalentReef', category: 'ats', isAts: true })
class TalentReefService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous):

```
GET https://apply.jobappnetwork.com/{tenant}/{lang}
  → HTML career-search SPA embedding, per open role, a schema.org
    JobPosting JSON-LD block and/or an SPA positions array:

    <script type="application/ld+json">
    {
      "@context": "https://schema.org/",
      "@type": "JobPosting",
      "identifier": { "@type": "PropertyValue", "value": "1234567" },
      "title": "Sales Associate",
      "datePosted": "2026-05-21",
      "employmentType": "PART_TIME",
      "hiringOrganization": { "@type": "Organization", "name": "Rooms To Go" },
      "jobLocation": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Seffner",
          "addressRegion": "FL",
          "addressCountry": "US"
        }
      },
      "description": "…full job-ad HTML…",
      "url": "https://apply.jobappnetwork.com/rtg/en/job/1234567"
    }
    </script>
```

Modelled wire shape → `JobPostDto` mapping:

| Source field (JSON-LD / SPA item)                          | JobPostDto field        | Notes                                                   |
| ---------------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `id` / `jobId` / `requisitionId` / `identifier.value` / `slug` | `atsId`, `id`       | `id` is prefixed `talentreef-{atsId}`                   |
| `title` (else `name`)                                      | `title`                 | required; job skipped if absent                         |
| `url` / `applyUrl` / `link` (else `path`/`slug`)           | `jobUrl`, `applyUrl`    | absolute apply / detail URL                             |
| `description` (HTML) (else `descriptionText`)              | `description`           | format-converted (HTML / Markdown / Plain)              |
| `datePosted` / `datePublished` / `postedDate` (else `updated`) | `datePosted`        | ISO-8601 → `YYYY-MM-DD`                                 |
| `jobLocation.address.{addressLocality,addressRegion,addressCountry}` (else flat `city`/`state`/`country`) | `location` | `addressRegion` → `state`; falls back to free-text |
| `jobLocationType` (`TELECOMMUTE`) / `remote` / location text / title | `isRemote`    | remote / WFH detection                                  |
| `department` / `category` / `industry` / `brand`           | `department`            | first populated label                                   |
| `employmentType` (string or array)                         | `employmentType`        | first label when array                                  |
| `hiringOrganization.name` / envelope `company`             | `companyName`           | falls back to tenant-derived name                       |
| —                                                          | `site`                  | constant `Site.TALENTREEF`                              |
| —                                                          | `atsType`               | constant `'talentreef'`                                 |
| `description` text                                         | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` → used as the tenant slug verbatim (e.g. `rtg`).
- `companyUrl` → leading path segment of an `apply.jobappnetwork.com/{tenant}/…`
  URL (skipping an `apply`/`clients`/`jobs` prefix), else the first sub-domain
  label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or no roles harvested |
| logged warn (HTTP 4xx)       | unknown / dead tenant — degrades to empty, never throws       |
| logged warn (parse failure)  | malformed JSON-LD / payload / per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/talentreef.e2e-spec.ts`): known tenant (`companySlug: 'rtg'`)
  returns shaped jobs when present (`site === Site.TALENTREEF`,
  `atsType === 'talentreef'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TR-1 — SPA-rendered listing (verification gap).** The public career-search
  pages (`apply.jobappnetwork.com/{tenant}/en`) are confirmed live and
  unauthenticated for multiple real tenants (`rtg`, `jibinc`, `mcm`,
  `surf-sand-careers`, `tacobellcorporate`), but they are JavaScript-rendered
  SPAs, so the exact byte shape of the embedded positions JSON / JSON-LD could
  not be byte-confirmed via a plain HTTP fetch on 2026-06-03 (the SPA hydrates
  client-side; the host's `api.jobappnetwork.com` JSON endpoint returns HTTP
  401 without a key). **Default (proceeding):** model defensively against the
  public schema.org `JobPosting` contract that TalentReef portals are indexed
  with, plus an SPA positions array under any of the observed array keys; the
  adapter degrades gracefully (empty result) when neither is present in the
  fetched HTML. **`verified: false`** for the exact wire shape; the public
  surface and tenant slugs are verified.
- **Q-TR-2 — Tenant slug vs. legacy company code.** A tenant has both a
  human-friendly slug (`rtg`) on `apply.jobappnetwork.com` and a legacy short
  code (`c_rtg`) on the applicant portal. **Default (proceeding):** the adapter
  targets the human-friendly slug surface; callers pass the slug.
- **Q-TR-3 — Language.** Career pages are served per language (`/en`, `/es`).
  **Default (proceeding):** request `en`; a future enhancement can thread a
  `language` input.

## 10. Decisions

- D-1: Primary surface is the public, anonymous career-search page at
  `https://apply.jobappnetwork.com/{tenant}/{lang}`. Verified live 2026-06-03:
  the pages exist and are unauthenticated for `rtg`, `jibinc`, `mcm`,
  `surf-sand-careers`, `tacobellcorporate` (the SPA filters client-side via
  `?category=…&state=…&keywordsFilter=…`). **Confidence: surface verified;
  exact wire shape NOT byte-confirmed (SPA-rendered) → `verified: false`.**
- D-2: Open roles are harvested from per-posting schema.org `JobPosting` JSON-LD
  blocks and/or the SPA's embedded positions array, both parsed defensively. The
  richest structured fields come from the JSON-LD (`title`, `identifier`,
  `datePosted`, `jobLocation.address`, `employmentType`, `hiringOrganization`,
  `description`).
- D-3: The legacy applicant portal
  (`{secure|cf-apply}.jobappnetwork.com/apply/c_{code}/l_{lang}/hourly.go`) is
  the application/onboarding surface (confirmed server-rendered, shows the
  applicant account UI, no public open-roles list) and is **not** used for
  ingestion.
- D-4: The career page returns the tenant's full open-roles list in one
  document (no server-side pagination consumed); the adapter fetches once and
  slices client-side to `resultsWanted`. De-dup is by `atsId`.

## 11. References

- `packages/plugins/source-ats-talentreef/` — implementation.
- Live surfaces verified 2026-06-03 (public, unauthenticated):
  `https://apply.jobappnetwork.com/rtg/en` (Rooms To Go),
  `https://apply.jobappnetwork.com/jibinc/en` (Jack in the Box),
  `https://apply.jobappnetwork.com/surf-sand-careers/en`,
  `https://apply.jobappnetwork.com/mcm/en` (Metz Culinary Management),
  `https://apply.jobappnetwork.com/tacobellcorporate/en` (filterable via
  `?category=…&state=…&keywordsFilter=…`).
- TalentReef / Mitratech product page — hourly-workforce ATS, public career
  sites + job-board syndication.
