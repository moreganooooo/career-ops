# Spec: 343 — Beetween ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 343                                           |
| Slug           | source-ats-beetween                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 338 (TalentAdore), 301 (Niceboard)            |

## 1. Problem Statement

Beetween (beetween.com) is a French recruitment software / ATS vendor (active
since 2007). Every customer tenant publishes a branded, public, unauthenticated
career site ("espace recrutement") that lists its open roles — either the
Beetween-hosted portal at `https://emploi.beetween.com/WeaselWeb/p/{tenant}`
(`WeaselWeb` being Beetween's application/servlet context, shared with the
documented application host `https://api.beetween.com/WeaselWeb/...`) or a tenant
vanity career domain. Each open role is addressed by a Beetween "public id" (a
10–20 char lower-case ASCII alphanumeric token) and surfaced at a public
`/poste/{publicId}-{slug}/` detail page. Ever Jobs has no adapter for
Beetween-powered career pages, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Beetween adapter unlocks the full catalogue of
Beetween-powered career pages with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-beetween` plugin that ingests
  vacancies from **any** Beetween-powered career page given a `companySlug` (the
  Beetween-hosted portal path segment, e.g. `beetween`) or a `companyUrl` (a
  vanity career domain such as `https://recrutement.{tenant}.fr/offres-emploi/`).
- Use the **public, anonymous career page** (no auth, no API key): fetch the
  tenant career page once and harvest the embedded open-role references.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'beetween'`, `department`).

## 3. Non-Goals

- Any authenticated Beetween recruiter / admin API, or the documented PUSH
  distribution connector (Beetween posts offers OUT to job boards) and the
  application-submission endpoint (`api.beetween.com/WeaselWeb/api/jobs/application`).
- Server-side filtering by contract type / team / category. We ingest the
  tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Beetween tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Beetween plugin at a
> tenant's career slug / URL, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Beetween adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that it
> is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant from `companySlug` (preferred → canonical portal path) or fetch a `companyUrl` (vanity career domain) verbatim. | must |
| FR-2  | Fetch the tenant career page ONCE; map HTTP 4xx to an empty result.                                 | must     |
| FR-3  | Prefer an inlined JSON hydration blob (`window.__BEETWEEN_STATE__` / `<script type="application/json">`); fall back to scraping `/poste/{publicId}-{slug}/` offer links from the HTML. | must |
| FR-4  | De-duplicate vacancies by `atsId` (public id) within a single run.                                  | must     |
| FR-5  | Map each vacancy to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl, employmentType). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                           | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the harvested list.                      | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.               | must     |
| FR-9  | Tolerate unknown / dead tenants (HTTP 4xx) and parse failures without throwing (partial/empty OK).  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public career page only           |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`          |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BEETWEEN, name: 'Beetween', category: 'ats', isAts: true })
class BeetweenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous):

```
GET https://emploi.beetween.com/WeaselWeb/p/{tenant}      # canonical portal
  — or —
GET {companyUrl}                                          # tenant vanity career domain
  → HTML listing open roles, each linking to:
      /poste/{publicId}-{slug}/                           # public job-detail page

# Optional (parsed first when present): an inlined JSON hydration blob, e.g.
#   window.__BEETWEEN_STATE__ = { "company": "...", "offers": [ { publicId, title, ... } ] };
#   or  <script type="application/json"> { ...same shape... } </script>
```

Wire-shape → `JobPostDto` mapping (defensive — both the inlined-JSON path and the
HTML-scrape fallback):

| Source field                                          | JobPostDto field        | Notes                                                   |
| ----------------------------------------------------- | ----------------------- | ------------------------------------------------------- |
| `publicId` (else `public_id`/`id`/scraped link group) | `atsId`, `id`           | `id` is prefixed `beetween-{atsId}`; lower-cased        |
| `title` (else `name`/`label`/title-cased slug)        | `title`                 | required; job skipped if absent                         |
| `url`/`link`/`applyUrl` (else `/poste/{id}-{slug}/`)  | `jobUrl`, `applyUrl`    | absolute job-detail / apply URL                         |
| `descriptionHtml`/`description`/`content`             | `description`           | format-converted (HTML / Markdown / Plain)              |
| `publishedAt`/`datePosted`/`updatedAt`                | `datePosted`            | Date-parsable → `YYYY-MM-DD`                            |
| `city`/`region`/`country` (else free-text `location`) | `location`              | `region` → `state`; falls back to free-text `location`  |
| `remote`/`isRemote` flags, location/title/contract text| `isRemote`             | `remote` / `télétravail` / `wfh` detection              |
| `department`/`team`/`category`/`categories[0]`        | `department`            | team / department / first category                      |
| `contractType`/`employmentType`/`contract`            | `employmentType`        | free-text label (e.g. "CDI", "CDD", "Stage")            |
| `company` (inlined blob, else tenant/host)            | `companyName`           | falls back to tenant-derived name                       |
| —                                                     | `site`                  | constant `Site.BEETWEEN`                                |
| —                                                     | `atsType`               | constant `'beetween'`                                   |
| `description` text                                    | `emails`                | harvested via `extractEmails`                           |

Tenant resolution:

- `companySlug` → canonical Beetween portal path
  `https://emploi.beetween.com/WeaselWeb/p/{slug}`.
- `companyUrl` → treated as a tenant vanity career domain and fetched verbatim;
  the first meaningful host label (skipping `www`/`recrutement`/`emploi`) is used
  for company-name derivation / logging.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 4xx), or no offers found   |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws         |
| logged warn (parse failure)  | malformed payload / per-job map error — degrades to partial, never throws |

## 8. Test Plan

- E2E (`__tests__/beetween.e2e-spec.ts`): known tenant (Beetween's own career
  site, `companyUrl: 'https://recrutement.beetween.fr/offres-emploi/'`, and
  `companySlug: 'beetween'`) returns shaped jobs (`site === Site.BEETWEEN`,
  `atsType === 'beetween'`, `atsId`/`jobUrl` defined); no-slug/url returns empty;
  unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BW-1 — Public READ endpoint (verification gap).** Beetween's *documented*
  API is a PUSH connector (Beetween posts offers OUT to job boards) plus an
  application-submission endpoint; there is no documented public READ JSON
  endpoint that returns a tenant's offer list, and the career SPA / `api` hosts
  were not reachable from the verification sandbox on 2026-06-03. **Default
  (proceeding):** consume the verifiable public career page — parse an inlined
  JSON hydration blob when present, else scrape `/poste/{publicId}-{slug}/` offer
  links. The wire-shape types are modelled defensively. **Verification recorded
  as `verified: false`.**
- **Q-BW-2 — Portal slug vs. vanity domain.** Tenants front their career page
  either on the Beetween portal path (`/WeaselWeb/p/{slug}`) or on a custom
  vanity domain. **Default (proceeding):** `companySlug` → portal path;
  `companyUrl` → fetch verbatim.
- **Q-BW-3 — Description language.** Beetween career pages are largely French.
  **Default (proceeding):** accept whatever language the page serves (no
  `language` filter); remote detection covers both `remote` and `télétravail`.

## 10. Decisions

- D-1: Primary surface is the public, anonymous tenant career page (the
  Beetween-hosted portal `https://emploi.beetween.com/WeaselWeb/p/{tenant}` or a
  tenant vanity career domain). **Confidence: not byte-verified for a JSON read
  endpoint (`verified: false`).** The public career surface, the `WeaselWeb`
  application context, the `/poste/{publicId}-{slug}/` offer-link pattern, and
  the 10–20 char lower-alphanumeric public id were all confirmed live against
  Beetween's own career site on 2026-06-03 (offer ids such as `ulx92rl1lu`,
  `koau35qzz6`, `23wloovpz9`).
- D-2: The adapter prefers an inlined JSON hydration blob (the career SPA may
  embed one) for the richest fields, and falls back to HTML link-scraping of
  `/poste/{publicId}-{slug}/` references when no blob is present. Both paths
  produce a `JobPostDto` with at minimum a title, public-id `atsId`, and apply
  URL.
- D-3: The Beetween "public id" (per the published API docs: 10–20 lower-case
  ASCII letters/digits, auto-generated when an offer goes online) is the stable
  per-offer identifier and is used as `atsId`. The same id appears in the offer
  URL (`/poste/{publicId}-{slug}/`) and in application references
  (`job-ref-{publicId}@emploi.beetween.com`).
- D-4: The career page returns the tenant's open roles in one document (no
  server-side pagination consumed); the adapter fetches once and slices
  client-side to `resultsWanted`. De-dup is by `atsId` (public id).
- D-5: No authenticated or write surface is touched. The documented PUSH /
  application-submission API is an explicit non-goal.

## 11. References

- `packages/plugins/source-ats-beetween/` — implementation.
- Beetween API documentation (PUSH connector + application API):
  `https://support.beetween.com/en/knowledge/documentation-api`,
  `https://support.beetween.com/en/knowledge/application-by-api`.
- Beetween career-site feature page:
  `https://beetween.com/features/career-site/`.
- Public career surface confirmed live 2026-06-03 (no authentication):
  Beetween's own career site `https://recrutement.beetween.fr/offres-emploi/`
  lists open roles at `/poste/{publicId}-{slug}/` (e.g. `ulx92rl1lu`,
  `koau35qzz6`); canonical portal at `https://emploi.beetween.com/WeaselWeb/p/`.
  No public READ JSON endpoint was byte-confirmed — `verified: false`.
