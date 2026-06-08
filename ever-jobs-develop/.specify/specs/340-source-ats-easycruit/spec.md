# Spec: 340 — EasyCruit ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 340                                           |
| Slug           | source-ats-easycruit                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 330 (Prescreen)            |

## 1. Problem Statement

EasyCruit (easycruit.com, by Visma) is a Nordic recruitment / ATS platform widely
used by employers in Denmark, Norway, Sweden, and Finland. Every customer tenant
publishes a branded, public career page on its own sub-domain
(`https://{tenant}.easycruit.com/`), and — for each such career page / channel —
exposes a public, unauthenticated **vacancy-list XML feed** served from the same
host (`/export/xml/vacancy/list.xml`). Ever Jobs has no adapter for
EasyCruit-powered career pages, so these vacancies are currently un-ingestable. A
single generic, multi-tenant EasyCruit adapter unlocks the full catalogue of
EasyCruit-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-easycruit` plugin that ingests
  vacancies from **any** EasyCruit-powered career page given a `companySlug`
  (the tenant sub-domain label, e.g. `esvagt`) or a `companyUrl` (a careers URL
  whose first sub-domain label is the tenant).
- Use the **public, anonymous vacancy-list XML feed** (no auth, no API key)
  served at `https://{tenant}.easycruit.com/export/xml/vacancy/list.xml`.
- Map every vacancy into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'easycruit'`, `department`).

## 3. Non-Goals

- The authenticated EasyCruit Reporting API (OAuth2 via Visma Connect,
  `…/api/reporting/v1/data-extract/tenants/{tenantId}/…`) — out of scope; this
  plugin uses only the anonymous vacancy-list feed.
- Server-side filtering by department / region / category. We ingest the
  tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of EasyCruit tenant slugs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the EasyCruit plugin at a
> tenant's careers slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the EasyCruit adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant token from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the vacancy-list feed (`GET https://{tenant}.easycruit.com/export/xml/vacancy/list.xml`) and parse its `Vacancy` elements. | must |
| FR-3  | For each vacancy, select the most useful language `Version` (prefer English), else the first available. | must |
| FR-4  | De-duplicate vacancies by `atsId` within a single run.                                              | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the single-page feed.                    | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public vacancy-list feed only     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |
| NFR-6  | No new runtime dependency for XML parsing     | tolerant in-house regex parser    |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EASYCRUIT, name: 'EasyCruit', category: 'ats', isAts: true })
class EasyCruitService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against `esvagt`):

```
GET https://{tenant}.easycruit.com/export/xml/vacancy/list.xml
  → <?xml version="1.0" encoding="UTF-8"?>
    <VacancyList xmlns="urn:EasyCruit">
      <Vacancy id="3628965" date_start="2026-05-19" date_end="2026-07-18"
               reference_number="" date_modified="2026-05-26 08:10:51">
        <Versions>
          <Version language="da">
            <Title>Financial Controller</Title>
            <TitleHeading>…</TitleHeading>
            <Location>…</Location>
            <Engagement>…</Engagement>          // employment type
            <DailyHours>…</DailyHours>
            <Region>…</Region>
            <Categories>…</Categories>
            <ApplicationDeadline>…</ApplicationDeadline>
          </Version>
          <Version language="en">…</Version>
        </Versions>
        <Departments>
          <Department id="66550">
            <Name>Esvagt A/S</Name>
            <LogoURL>…</LogoURL>
            <ImageURL>…</ImageURL>
            <VacancyURL>https://esvagt.easycruit.com/vacancy/3628965/66550?iso=gb</VacancyURL>
            <ApplicationURL>…</ApplicationURL>
          </Department>
        </Departments>
      </Vacancy>
      …
    </VacancyList>
```

Verified wire shape → `JobPostDto` mapping (`esvagt`, Esvagt A/S, 2026-06-03):

| Feed field                                          | JobPostDto field        | Notes                                                   |
| --------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `Vacancy@id`                                        | `atsId`, `id`           | `id` is prefixed `easycruit-{atsId}`                    |
| `Version/Title` (preferred language)                | `title`                 | required; job skipped if absent                         |
| `Department/VacancyURL` (else reconstructed)        | `jobUrl`                | `…/vacancy/{id}/{departmentId}?iso=gb` fallback         |
| `Department/ApplicationURL` (else `jobUrl`)         | `applyUrl`              | absolute apply URL                                      |
| synthesised HTML from version labels                | `description`           | format-converted (HTML / Markdown / Plain)              |
| `Vacancy@date_start` (else `date_modified`)         | `datePosted`            | ISO-8601 → `YYYY-MM-DD`                                 |
| `Version/Location` / `Version/Region`               | `location`              | `Location` → `city`; `Region` → `state`                |
| `Location` / `Region` / `Engagement` / title text   | `isRemote`              | `remote` / `etätyö` / `hjemmekontor` / `distans` / `wfh` |
| `Version/Categories` (else `Department/Name`)       | `department`            | category label, else owning department name             |
| `Version/Engagement`                                | `employmentType`        | free-text label                                         |
| `Department/Name` (else tenant-derived)             | `companyName`           | falls back to tenant-derived name                       |
| —                                                   | `site`                  | constant `Site.EASYCRUIT`                               |
| —                                                   | `atsType`               | constant `'easycruit'`                                  |
| `description` text                                  | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` (e.g. `esvagt`) → used verbatim as the sub-domain label.
- `companyUrl` (e.g. `https://esvagt.easycruit.com/`) → first sub-domain label
  (skips `www` and the bare `easycruit` apex), else trailing path segment.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or empty feed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | malformed XML / per-vacancy map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/easycruit.e2e-spec.ts`): known tenant
  (`companySlug: 'esvagt'`) returns shaped jobs (`site === Site.EASYCRUIT`,
  `atsType === 'easycruit'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-EC-1 — XML parsing without a parser dependency.** The repo ships no XML
  parser (only `cheerio`/`htmlparser2` for HTML). **Default (proceeding):** parse
  the flat, predictable `VacancyList` structure with tolerant in-house regexes
  (vacancy / version / department blocks, attribute + child-text extraction,
  CDATA + entity decoding). Any unparseable block is skipped, never thrown.
- **Q-EC-2 — Version language selection.** A vacancy may carry several language
  `Version` blocks. **Default (proceeding):** prefer an English version
  (`en`/`gb`/`eng`), else the first version that carries a title, else the first
  present.
- **Q-EC-3 — Description richness.** The public list feed carries labelled
  fields (Title, Location, Engagement, Region, Categories, deadline) but no rich
  job-ad body. **Default (proceeding):** synthesise a short HTML summary from the
  available labels so description formatting and e-mail extraction stay
  consistent; the full ad lives on the linked vacancy detail page.
- **Q-EC-4 — Custom vanity domains.** Some tenants front their career page with a
  custom domain. **Default (proceeding):** resolve via the canonical
  `{tenant}.easycruit.com` sub-domain; a caller may pass a `companyUrl` whose
  first sub-domain label is the tenant.

## 10. Decisions

- D-1: Primary surface is the public, anonymous vacancy-list XML feed at
  `https://{tenant}.easycruit.com/export/xml/vacancy/list.xml`. Verified live
  2026-06-03 against the Esvagt A/S tenant (`esvagt`): feed HTTP 200 with a
  `VacancyList` (namespace `urn:EasyCruit`) of `Vacancy` elements carrying
  `id`/`date_start`/`date_end`/`date_modified` attributes,
  `Versions/Version[@language]` (Title, Location, Engagement, Region, Categories)
  and `Departments/Department[@id]` (Name, VacancyURL, ApplicationURL).
  **Confidence: verified** (byte-confirmed feed root + vacancy items + the public
  HTML career page whose job links are `/vacancy/{id}/{departmentId}?iso=gb`).
- D-2: The vacancy schema is published at
  `https://www.easycruit.com/dtd/vacancy-list.xsd` (and `vacancy.xsd`), confirming
  the stable element/attribute names used by the parser.
- D-3: The richest structured fields come straight from the feed
  (`Vacancy@id`, `Title`, `Location`, `Region`, `Engagement`, `Categories`,
  `date_start`, `VacancyURL`, `ApplicationURL`). The list feed has no rich body
  element, so the adapter synthesises a small HTML summary from the labelled
  fields for consistent format conversion.
- D-4: The feed returns every open role in one envelope (no server-side
  pagination); the adapter fetches once and slices client-side to
  `resultsWanted`. De-dup is by `atsId`.
- D-5: No XML-parser dependency is added; the flat feed is parsed with tolerant
  in-house regexes, decoding CDATA and the handful of XML entities used.

## 11. References

- `packages/plugins/source-ats-easycruit/` — implementation.
- EasyCruit / Visma online help — "Vacancy XML feed" (`VacancyList` export) and
  the published schema `https://www.easycruit.com/dtd/vacancy-list.xsd`.
- Live feed verified 2026-06-03:
  `https://esvagt.easycruit.com/export/xml/vacancy/list.xml` (Esvagt A/S),
  alongside the public HTML career page `https://esvagt.easycruit.com/?iso=gb`
  whose job links follow `/vacancy/{vacancyId}/{departmentId}?iso=gb`.
