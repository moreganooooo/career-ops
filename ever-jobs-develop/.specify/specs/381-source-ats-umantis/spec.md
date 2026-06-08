# Spec: 381 — Umantis (Haufe Talent) ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 381                                           |
| Slug           | source-ats-umantis                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 366 (Scout Talent), 364 (PyjamaHR)            |

## 1. Problem Statement

Umantis (umantis.com, DACH — Switzerland / Germany / Austria) is the talent
management and e-recruiting product now part of Haufe Group ("Haufe Talent"). Every
customer tenant publishes a branded, public, candidate-facing job board on the
shared application host, keyed by a stable numeric tenant id:
`https://recruitingapp-{tenantId}.umantis.com/Jobs/All` (with a `.de.umantis.com`
host variant for some tenants). Unlike a client-rendered SPA, the board is
**server-rendered HTML**, so its open-roles index and per-role detail pages are
directly crawlable without authentication. Ever Jobs has no adapter for Umantis-
powered career boards, so these vacancies — common across DACH employers,
universities, public bodies, and large enterprises — are currently un-ingestable. A
single generic, multi-tenant Umantis adapter unlocks the full catalogue of
Umantis-powered boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-umantis` plugin that ingests vacancies
  from **any** Umantis board given a `companySlug` (the numeric tenant id, optionally
  carrying a `.de` host hint, e.g. `5476` or `5476.de`) or a `companyUrl` (any board
  / vacancy URL on a `umantis.com` host, from which the host + tenant id are derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  open-roles index (`/Jobs/All`) to enumerate roles, plus each role's server-rendered
  vacancy detail page (`/Vacancies/{ID}/Description/{langCode}`) carrying the title,
  location, posting date, and body.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'umantis'`, `employmentType`, `applyUrl`).

## 3. Non-Goals

- Any authenticated Umantis recruiter / admin API. This plugin consumes only the
  public candidate-facing board.
- Server-side filtering by category / location / language. We ingest the tenant's
  full open-roles index and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Umantis tenant ids (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Umantis plugin at a tenant's
> numeric id, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Umantis adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant host + numeric id from `companySlug` (a bare numeric id → `recruitingapp-{id}.umantis.com`; `{id}.de` → the `.de.umantis.com` host variant) or from a `companyUrl` on a `umantis.com` host (host used verbatim, id from the `recruitingapp-{id}` sub-domain). | must |
| FR-2  | Fetch the public server-rendered index (`GET https://{host}/Jobs/All?lang=eng`) and extract every `/Vacancies/{ID}/Description/{langCode}` link. | must |
| FR-3  | Fetch each role's server-rendered detail page; use the numeric `{ID}` segment as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` (`{ID}`) within a single run.                                          | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the link set and only fetching that many detail pages, bounded by a page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 4xx / redirect to marketing site), network errors, and malformed pages without throwing. | must |
| FR-10 | Fan out per-role detail fetches with `Promise.allSettled` so a single failed detail never aborts the run. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public HTML index + detail pages |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.UMANTIS, name: 'Umantis (Haufe Talent)', category: 'ats', isAts: true })
class UmantisService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://recruitingapp-{tenantId}.umantis.com/Jobs/All?lang=eng
  (or https://recruitingapp-{tenantId}.de.umantis.com/Jobs/All?lang=eng)
  → server-rendered HTML carrying one anchor per open role:
      <a href="/Vacancies/{ID}/Description/{langCode}">{title}</a>
    alongside card text (location, optional posting date `DD.MM.YYYY`).

GET https://{host}/Vacancies/{ID}/Description/{langCode}?lang=eng
  → server-rendered detail HTML. The page <title> is "{title} | {organisation}";
    the body carries a free-text location, an optional `DD.MM.YYYY` posting date,
    a job-ad body, and an "Apply here / Hier bewerben" link whose href targets the
    tenant application flow (…/Application/CheckLogin/…). og:title / og:description
    meta are defensive fallbacks.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `{ID}` (from `/Vacancies/{ID}/Description/{lang}`)  | `atsId`, `id`           | `id` is prefixed `umantis-{atsId}`                         |
| Detail `<title>` head, else index link text / og:title | `title`              | required; role skipped if absent                            |
| `https://{host}/Vacancies/{ID}/Description/{lang}`  | `jobUrl`                | canonical public detail URL                                 |
| Apply-link href (`…/Application/CheckLogin/…`), else `jobUrl` | `applyUrl`     | tenant application flow target                              |
| Detail body / og:description, else location line    | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `DD.MM.YYYY` token in card / body                   | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| Free-text location ("City (Country)")               | `location`              | city / country split; null when none usable                 |
| title / location / body                             | `isRemote`              | remote detection (`remote` / `home office` / `wfh` / `télétravail` …) |
| employment-type text                                | `employmentType`        | token normalised to a readable label                        |
| Detail `<title>` tail, else `Umantis {tenantId}`    | `companyName`           | organisation name from the title; placeholder fallback      |
| —                                                   | `site`                  | constant `Site.UMANTIS`                                      |
| —                                                   | `atsType`               | constant `'umantis'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `5476`) → host `recruitingapp-5476.umantis.com`.
- `companySlug` (e.g. `5476.de`) → host `recruitingapp-5476.de.umantis.com`.
- `companySlug` containing a full `umantis.com` URL → host + id derived from it.
- `companyUrl` on a `umantis.com` host (e.g. `https://recruitingapp-5476.de.umantis.com/Jobs/All`)
  → host used verbatim; the tenant id is the numeric token in `recruitingapp-{id}`.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx / marketing redirect), or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed page or per-role map error — partial, never throws              |

## 8. Test Plan

- E2E (`__tests__/umantis.e2e-spec.ts`): known tenant (`companySlug: '5476.de'`,
  ASMPT) returns shaped jobs (`site === Site.UMANTIS`, `atsType === 'umantis'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url
  returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-UM-1 — `.de` host variant.** Tenants are served on either
  `recruitingapp-{id}.umantis.com` or `recruitingapp-{id}.de.umantis.com`.
  **Default (proceeding):** a bare numeric slug targets the `.umantis.com` host; a
  `{id}.de` slug targets the `.de.umantis.com` host; a full `companyUrl` uses its
  host verbatim, which removes the ambiguity entirely for URL callers.
- **Q-UM-2 — Company display name.** The board carries the tenant brand in the
  detail page `<title>` tail ("{title} | {organisation}"). **Default (proceeding):**
  use the `<title>` tail when present, else a `Umantis {tenantId}` placeholder.
- **Q-UM-3 — Structured detail metadata.** Detail pages render server-side without a
  consistent schema.org `JobPosting` JSON-LD block. **Default (proceeding):** parse
  the `<title>`, body text, `DD.MM.YYYY` date token, and apply link, with og: meta as
  fallbacks, all narrowed defensively.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered HTML board on
  `recruitingapp-{tenantId}.umantis.com` (and `.de.umantis.com`): the `/Jobs/All`
  index for enumeration (the `/Vacancies/{ID}/Description/{langCode}` anchors) plus
  each role's server-rendered detail page for the title, location, date, and body.
  **Confidence: verified** — the platform, the addressing, the index HTML, and the
  per-role detail URL shape were confirmed live 2026-06-03 against the named real
  tenant `5476` (ASMPT, `https://recruitingapp-5476.de.umantis.com/`).
- D-2: The board is server-rendered HTML (not a SPA), so the HTML itself is the
  documented no-auth surface; per-role detail pages are parsed defensively from the
  `<title>`, body, date token, apply link, and og: fallbacks.
- D-3: The numeric `{ID}` segment of the vacancy URL is the stable per-role ATS id.
- D-4: The index lists every open role in one document (no server-side pagination of
  the job set); the adapter collects deduped links and slices to `resultsWanted`
  (bounded by a hard page cap), then fans out detail fetches with
  `Promise.allSettled`. De-dup is by `atsId` (`{ID}`).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-umantis/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `recruitingapp-{tenantId}.umantis.com` (and the
    `.de.umantis.com` variant), confirmed with the named real tenant `5476` (ASMPT,
    `https://recruitingapp-5476.de.umantis.com/Jobs/All`). Other live tenants seen:
    `2698` (Swiss TPH), `2717` (Generali), `2388` (Haufe Group).
  - The server-rendered index HTML and the per-role detail URL shape
    `/Vacancies/{ID}/Description/{langCode}` (e.g. `/Vacancies/1410/Description/1`),
    with the numeric `{ID}` as the per-role ATS id, and the detail page `<title>`,
    location, `DD.MM.YYYY` posting date, and apply link (verified=true).
