# Spec: 331 — Traffit ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 331                                           |
| Slug           | source-ats-traffit                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 301 (Niceboard)              |

## 1. Problem Statement

Traffit (traffit.com) is a Poland / EU-focused cloud applicant-tracking platform.
Every customer tenant runs a branded careers page on its own sub-domain
(`https://{tenant}.traffit.com`). Traffit exposes a **public, anonymous
"Public API"** — free and available on every plan — that returns the tenant's
currently published job adverts as JSON. Ever Jobs has no adapter for
Traffit-powered career pages, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Traffit adapter unlocks the full catalogue of
Traffit-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-traffit` plugin that ingests vacancies
  from **any** Traffit-powered career page given a `companySlug` (the tenant
  sub-domain label, e.g. `people`) or a `companyUrl` (a portal URL whose first
  sub-domain label is the tenant).
- Use the **public, anonymous published-adverts feed** (no auth, no API key)
  served at `https://{tenant}.traffit.com/public/job_posts/published`.
- Map every advert into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'traffit'`, `department`).

## 3. Non-Goals

- The advanced authenticated Integration API (`api.traffit.com`) used for
  candidate data and recruitment-process management. It is explicitly not used.
- Server-side filtering by country / city / department / position type. We
  ingest the tenant's full published-adverts list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Traffit tenant sub-domains (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Traffit plugin at a
> tenant's sub-domain label, so that I ingest that organisation's full published
> roles without writing a bespoke scraper.

> As a **plugin host**, I want the Traffit adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant sub-domain label from `companySlug` (preferred), or from the first sub-domain label of `companyUrl`. | must |
| FR-2  | Fetch the published-adverts feed from `https://{tenant}.traffit.com/public/job_posts/published`.    | must     |
| FR-3  | Parse each envelope's `advert.values[]` `{ field_id, value }` entries to extract the `description` HTML and structured `geolocation`. | must |
| FR-4  | De-duplicate vacancies by `atsId` (the public job-post id) within a single run.                     | must     |
| FR-5  | Map each advert to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by client-side slicing the single-page feed.        | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (DNS failure or HTTP 4xx) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public published-adverts feed only |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | Per-advert mapping is isolated                | one malformed advert never nukes the batch |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TRAFFIT, name: 'Traffit', category: 'ats', isAts: true })
class TraffitService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against
`people.traffit.com` and `traffit.traffit.com`):

```
GET https://{tenant}.traffit.com/public/job_posts/published
  → [
      {
        url: "https://{tenant}.traffit.com/public/an/{token}?source=career_page",
        id: 639,                              // public job-post id (the ATS id)
        valid_start: "2026-06-03 15:58:21",   // YYYY-MM-DD HH:MM:SS, tenant-local
        awarded: false,
        huntoo_link: null,
        application_form: "https://{tenant}.traffit.com/public/form/a/{token}?source=career_page",
        advert: {
          id: 12345,
          name: "Customer Support Specialist", // job title
          language: "pl",
          recruitment: { workflow_id, id, nr_ref: "1/6/2026/AW/817" },
          values: [
            { field_id: "description",  value: "<p>…HTML…</p>" },
            { field_id: "geolocation",  value: {
                country: "Polska", iso: "pl", locality: "Gdynia",
                region1: "Pomorskie", region2: "Gdynia", region3: "Gdynia",
                latitude: "54.503551", longitude: "18.463659" } }
          ]
        }
      },
      …
    ]
```

### 7.2 Mapping (wire field → JobPostDto)

| Wire field                                   | JobPostDto field      | Notes                                              |
| -------------------------------------------- | --------------------- | -------------------------------------------------- |
| `id` (top-level public job-post id)          | `atsId`, `id`         | `id` prefixed `traffit-{atsId}`; used for de-dup   |
| `advert.name` (`advert.title` alias)         | `title`               | required; advert skipped when absent               |
| `url`                                         | `jobUrl`              | public candidate advert page; host as last resort  |
| `application_form`                            | `applyUrl`            | falls back to `jobUrl`                             |
| `advert.values[field_id=description].value`  | `description`         | HTML; converted per `descriptionFormat`            |
| `advert.values[field_id=geolocation].value`  | `location`            | `locality`→city, `region1`→state, `country`/`iso`→country |
| `valid_start`                                 | `datePosted`          | "YYYY-MM-DD HH:MM:SS" → `YYYY-MM-DD`               |
| `advert.recruitment.nr_ref`                  | `department`          | human-readable recruitment reference              |
| (derived) title / description / locality text | `isRemote`            | keyword match (incl. Polish "zdalna")             |
| (derived) description text                    | `emails`              | `extractEmails(description)`                       |
| (constant)                                    | `companyName`         | title-cased tenant sub-domain label                |
| (constant)                                    | `site`, `atsType`     | `Site.TRAFFIT`, `'traffit'`                        |

Tenant resolution:
- `companySlug` (no dots) → sub-domain label verbatim (e.g. `people`)
- `companySlug` (with dots / scheme) or `companyUrl` → first sub-domain label of
  the host (skipping a leading `www`, guarding against the bare apex
  `traffit.com`)
- host = `https://{tenant}.traffit.com`

### 7.3 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (DNS/HTTP 4xx), or non-array payload |
| logged warn (HTTP 4xx / DNS) | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | malformed advert — that advert is skipped, never throws      |

## 8. Test Plan

- E2E (`__tests__/traffit.e2e-spec.ts`): known tenant (`companySlug: 'people'`)
  returns shaped jobs (`site === Site.TRAFFIT`, `atsType === 'traffit'`,
  `atsId`/`jobUrl` defined); no-slug/url returns empty; unknown tenant degrades
  gracefully; `resultsWanted` is honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on
  network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TF-1 — Feed pagination.** The published feed returns every advert in one
  array for the observed tenants (1 advert on `traffit.traffit.com`, 12 on
  `people.traffit.com`). A very large tenant could in principle paginate.
  **Default (proceeding):** treat the feed as single-page and slice client-side;
  re-evaluate if truncation is observed in practice.
- **Q-TF-2 — Advert language.** Adverts carry an `advert.language` code (often
  `pl`); the description body is served in that language. **Default
  (proceeding):** accept whatever language the tenant publishes.
- **Q-TF-3 — Custom fields.** `advert.values[]` can carry tenant-defined custom
  field ids beyond `description` / `geolocation`. **Default (proceeding):** map
  only the two well-known field ids; ignore unknown custom fields.

## 10. Decisions

- D-1: Primary surface is the public, anonymous published-adverts feed at
  `https://{tenant}.traffit.com/public/job_posts/published`. Verified live
  2026-06-03 against `people.traffit.com` (HTTP 200, JSON array of 12 adverts)
  and `traffit.traffit.com` (HTTP 200, 1 advert "Customer Support Specialist").
  **Confidence: verified** (byte-confirmed JSON array with real adverts).
- D-2: The advert content is keyed inside `advert.values[]` by `field_id`. The
  two well-known ids are `description` (HTML body) and `geolocation` (structured
  place object); the mapper resolves them by `field_id` rather than positional
  index so cross-tenant ordering drift is tolerated.
- D-3: The public job-post `id` (top-level) is the stable ATS id and de-dup key;
  `advert.id` is the internal advert id and is not used as the key.
- D-4: The structured `geolocation` object yields the location: `locality`→city,
  `region1`→state, `country` (or upper-cased `iso`)→country.
- D-5: An unknown tenant resolves to a non-existent sub-domain, surfacing as a
  DNS/connection error (no `response`) or an HTTP 4xx; both degrade to an empty
  result. A malformed advert is skipped in isolation so one bad record never
  nukes the batch.
- D-6: The advanced authenticated Integration API (`api.traffit.com`) is not
  used; the free public feed carries everything needed for ingestion.

## 11. References

- `packages/plugins/source-ats-traffit/` — implementation.
- Traffit Knowledge Base — "Public & integration API in Traffit" and "How can I
  integrate Traffit with my Career page?" (knowledge.traffit.com).
- Live feed verified 2026-06-03: `https://people.traffit.com/public/job_posts/published`
  and `https://traffit.traffit.com/public/job_posts/published`.
