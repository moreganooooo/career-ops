# Spec: 338 — TalentAdore ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 338                                           |
| Slug           | source-ats-talentadore                        |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 301 (Niceboard)              |

## 1. Problem Statement

TalentAdore (talentadore.com) is a Finnish, human-centered recruitment / ATS
platform ("TalentAdore Hire"). Every customer tenant publishes a branded,
WordPress-multisite career page on its own sub-domain
(`https://{tenant}.careers.talentadore.com/`, or a custom vanity domain), and
the open roles on that page are populated from one shared, public,
unauthenticated positions feed served from the TalentAdore ATS host
(`ats.talentadore.com`). Ever Jobs has no adapter for TalentAdore-powered career
pages, so these vacancies are currently un-ingestable. A single generic,
multi-tenant TalentAdore adapter unlocks the full catalogue of
TalentAdore-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-talentadore` plugin that ingests
  vacancies from **any** TalentAdore-powered career page given a `companySlug`
  (the tenant careers sub-domain label, e.g. `amersports`, or the opaque feed
  key directly) or a `companyUrl` (a careers URL whose first sub-domain label is
  the tenant).
- Use the **public, anonymous positions feed** (no auth, no API key) served at
  `https://ats.talentadore.com/positions/{feedKey}/json`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'talentadore'`, `department`).

## 3. Non-Goals

- Any authenticated TalentAdore Hire admin / recruiter API.
- Server-side filtering by tag / business unit / category. We ingest the
  tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of TalentAdore tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the TalentAdore plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the TalentAdore adapter to behave like every
> other ATS source plugin (same DI module, same `IScraper.scrape` contract), so
> that it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant token from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Resolve the tenant's opaque feed key: use `companySlug` verbatim if it already looks like a key, else harvest it from the tenant career page HTML. | must |
| FR-3  | Fetch the positions feed (`GET /positions/{feedKey}/json?v=2&display_description=job_description`) and read its `jobs[]` array. | must |
| FR-4  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-page feed.                    | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public positions feed only       |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TALENTADORE, name: 'TalentAdore', category: 'ats', isAts: true })
class TalentAdoreService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `amersports`):

```
GET https://{tenant}.careers.talentadore.com/
  → HTML embedding the tenant's feed reference:
      …ats.talentadore.com/positions/{feedKey}/json…

GET https://ats.talentadore.com/positions/{feedKey}/json
      ?v=2&display_description=job_description
  → {
      "version": "1.0",
      "company": "Amer Sports",
      "generated_at": "2026-06-03T14:19:19.512112Z",
      "jobs": [
        {
          "id": "8ayqQ",
          "job_token": "mMeM5o",
          "name": "Accounting Internship",
          "link": "https://ats.talentadore.com/apply/accounting-internship/mMeM5o",
          "description_html": "…full job-ad HTML…",
          "description_text": "…pre-stripped plain text…",
          "updated": "2026-05-08T10:39:17Z",
          "start_date": "2024-02-02T10:38:00Z",
          "due_date": "",
          "location": "Zabłocie 43B, 30-701 Kraków",
          "county": "Małopolskie",
          "country": "Poland",
          "city": "Krakow",
          "tags": ["pracuj.pl"],
          "categories": [],
          "employment_type": "Civil contract",
          "business_unit_name": "Amer Sports",
          "image": "https://…/newHeader_…jpg",
          "logo": null
        }
      ]
    }
```

Verified wire shape → `JobPostDto` mapping (`amersports`, Amer Sports, 2026-06-03):

| Feed field                                   | JobPostDto field        | Notes                                                   |
| -------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `id` (else `job_token`)                      | `atsId`, `id`           | `id` is prefixed `talentadore-{atsId}`                  |
| `name` (else `title`)                        | `title`                 | required; job skipped if absent                         |
| `link` (else `/apply/{job_token}`)           | `jobUrl`, `applyUrl`    | absolute apply / detail URL                             |
| `description_html` (else `description_text`) | `description`           | format-converted (HTML / Markdown / Plain)              |
| `start_date` (else `updated`)                | `datePosted`            | ISO-8601 → `YYYY-MM-DD`                                 |
| `city` / `county` / `country`                | `location`              | `county` → `state`; falls back to free-text `location`  |
| `location` / `city` / `tags` / `name` text   | `isRemote`              | `remote` / `etätyö` / `work from home` / `wfh` detection |
| `categories[0]` (else `business_unit_name`)  | `department`            | first category, else owning business unit               |
| `employment_type`                            | `employmentType`        | free-text label                                         |
| `company` (envelope)                         | `companyName`           | falls back to tenant-derived name                       |
| —                                            | `site`                  | constant `Site.TALENTADORE`                             |
| —                                            | `atsType`               | constant `'talentadore'`                                |
| `description` text                           | `emails`                | harvested via `extractEmails`                           |

Tenant / feed-key resolution:

- `companySlug` that looks like a bare feed key (short, URL-safe, mixed-case
  token, e.g. `mwRcjSn`) → used as the feed key verbatim.
- `companySlug` that looks like a careers slug (e.g. `amersports`) or
  `companyUrl` → first sub-domain label of `{tenant}.careers.talentadore.com`;
  the adapter loads that career page and harvests the embedded
  `ats.talentadore.com/positions/{feedKey}` reference.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable feed key, unknown tenant (HTTP 4xx), or empty `jobs[]` |
| logged warn (HTTP 4xx)       | unknown/dead tenant or feed key — degrades to empty, never throws |
| logged warn (parse failure)  | malformed payload / per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/talentadore.e2e-spec.ts`): known tenant
  (`companySlug: 'amersports'`) returns shaped jobs (`site === Site.TALENTADORE`,
  `atsType === 'talentadore'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TA-1 — Custom vanity domains.** Some tenants front their career page with
  a custom domain (e.g. Fintraffic's `rekry.fintraffic.fi`) instead of
  `{tenant}.careers.talentadore.com`. **Default (proceeding):** resolve via the
  `{tenant}.careers.talentadore.com` sub-domain (which serves the embedded feed
  reference even when a vanity domain also exists); a caller may pass the opaque
  feed key directly to bypass resolution.
- **Q-TA-2 — Feed key vs. slug ambiguity.** Both careers slugs and feed keys are
  dot-free, URL-safe tokens. **Default (proceeding):** treat a short
  (≤ 16-char), mixed-case token as a feed key and anything else as a careers
  slug; this matches the observed opaque keys (`mwRcjSn`) vs. lower-case slugs
  (`amersports`).
- **Q-TA-3 — Description language.** The feed serves the job-ad body in whatever
  language the tenant authored. **Default (proceeding):** accept whatever
  language the feed serves (no `language` filter applied).

## 10. Decisions

- D-1: Primary surface is the public, anonymous positions feed at
  `https://ats.talentadore.com/positions/{feedKey}/json`. Verified live
  2026-06-03 against the Amer Sports tenant (`amersports`, feed key `mwRcjSn`):
  feed HTTP 200 with a 36-role `jobs[]` array; empty tenants (e.g. Beamex,
  `nyNS3Sd`) return HTTP 200 with `jobs: []`. **Confidence: verified**
  (byte-confirmed envelope + job items).
- D-2: The feed is the tenant's RSS/JSON "feed builder" output (the matching RSS
  view simply swaps `/json` for `/rss`). The feed key is the tenant's public
  read key; it is not the sub-domain label, so a human-friendly `companySlug` is
  resolved to a feed key by harvesting the embedded
  `ats.talentadore.com/positions/{feedKey}` reference from the tenant career
  page HTML.
- D-3: The richest structured fields come straight from the feed item
  (`id`, `name`, `link`, `start_date`, `city`/`county`/`country`,
  `employment_type`, `categories`, `business_unit_name`). The feed inlines both
  an HTML body (`description_html`) and a pre-stripped plain-text body
  (`description_text`); HTML is preferred so format conversion is consistent.
- D-4: The standard WordPress `/feed/` RSS on the careers sub-domain returns
  blog-style posts (employee stories), not job ads, and is **not** used. The
  job data lives only in the `ats.talentadore.com` positions feed.
- D-5: The feed returns every open role in one envelope (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`. De-dup is by `atsId`.

## 11. References

- `packages/plugins/source-ats-talentadore/` — implementation.
- TalentAdore Help Center — "How does RSS and JSON feed builder work?"
  (`/json` view swaps for `/rss`).
- Live feed verified 2026-06-03:
  `https://ats.talentadore.com/positions/mwRcjSn/json?v=2&display_description=job_description`
  (Amer Sports, 36 open roles), resolved from
  `https://amersports.careers.talentadore.com/`.
