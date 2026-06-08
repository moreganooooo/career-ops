# Spec: 322 — Flatchr ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 322                                           |
| Slug           | source-ats-flatchr                            |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 317 (Eploy), 301 (Niceboard)                  |

## 1. Problem Statement

Flatchr (flatchr.io) is a French SaaS recruitment / applicant-tracking
platform used by hundreds of employers, from SMEs to large groups. Every
customer tenant gets a public, branded career site served from the shared
host `careers.flatchr.io` under a per-tenant company slug
(e.g. `https://careers.flatchr.io/fr/company/flatchr/`). Ever Jobs has no
adapter for Flatchr-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant Flatchr adapter unlocks the full
catalogue of Flatchr-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-flatchr` plugin that ingests
  vacancies from **any** Flatchr-powered career site given a `companySlug` (the
  tenant's company reference) or a `companyUrl` (a `careers.flatchr.io` career
  page).
- Use the **public, anonymous JSON listing** (no auth, no API key) exposed at
  `GET https://careers.flatchr.io/company/{slug}.json`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'flatchr'`, `department`).

## 3. Non-Goals

- The authenticated REST API at `api.flatchr.io` (candidate creation, vacancy
  management). It requires per-tenant API credentials and is explicitly not
  used.
- Server-side filtering. The listing endpoint accepts optional filter params
  (`metier`, `locality`, `activity`, …) but we ingest the full set and slice
  client-side to `resultsWanted`.
- Pagination / fan-out. The listing returns every published vacancy for the
  tenant in a single response, with the FULL description embedded inline — no
  per-vacancy detail call is required.
- WAF / Cloudflare bypass. Any tenant gating its listing behind an aggressive
  WAF is out of scope (graceful empty result).
- A curated seed list of Flatchr tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Flatchr plugin at a
> tenant's company slug, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Flatchr adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                         | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant company slug from `companySlug` (preferred), or from `companyUrl` by extracting the segment after `/company/` (falling back to the first sub-domain label). | must |
| FR-2  | Fetch the JSON listing from `https://careers.flatchr.io/company/{slug}.json`.                       | must     |
| FR-3  | Map each `items[].vacancy` record to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-4  | De-duplicate vacancies by resolved `atsId` within a single run.                                     | must     |
| FR-5  | Merge the multi-part HTML (`description` + `mission` + `profile`) and convert per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-6  | Build the public job-detail URL `careers.flatchr.io/company/{slug}/vacancy/{vacancy_slug}/`.        | should   |
| FR-7  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.              | must     |
| FR-8  | Tolerate unknown tenants (HTTP 404 / `{ message }` body) and parse failures without throwing (partial/empty results OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public JSON listing only         |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FLATCHR, name: 'Flatchr', category: 'ats', isAts: true })
class FlatchrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified live 2026-06-03):

```
GET https://careers.flatchr.io/company/{slug}.json
  → HTTP 200 {
      "items": [
        {
          "id": "QorW9wr03A1nyelR",
          "offer_id": 98,
          "published": true,
          "created_at": "2026-05-28T08:33:09.322Z",
          "status": "published",
          "vacancy": {
            "id": "Wy3EOp2JolLp1KMq",
            "vacancy_id": 655446,
            "slug": "wy3eop2jollp1kmq-account-executive-_-saas-rh-h-f",
            "reference": "AE sénior 06 2026",
            "title": "Account executive _ Editeur de logiciel RH H/F",
            "description": "<h2>…</h2>",
            "mission": "<h2>…</h2>",
            "profile": "<h2>…</h2>",
            "contract_type": "CDI",
            "metier": "Commercial conseil",
            "activity": "Internet",
            "salary": 45000, "salary_max": 80000, "currency": "EUR",
            "remote": "notime", "partial": false,
            "created_at": "2026-05-22T09:41:08.255Z",
            "start_date": "2026-06-01T06:57:20.000Z",
            "apply_url": null,
            "address": {
              "locality": "Boulogne-Billancourt",
              "postal_code": "92100",
              "administrative_area_level_1": "Île-de-France",
              "country": "France",
              "formatted_address": "79 Rue Marcel Dassault, 92100 Boulogne-Billancourt, France"
            },
            "company": { "name": "Flatchr", "slug": "flatchr", "web": "http://www.flatchr.io" }
          }
        }
      ]
    }
  → HTTP 404 { "message": "Not available for slug … with url: …" }  (unknown tenant)
```

Verified wire shape (`careers.flatchr.io/company/flatchr.json`, 2026-06-03):
- `vacancy.id` (opaque) → `atsId` (fallback: `vacancy_id`, then slug token)
- `vacancy.slug` → public job page `…/company/{slug}/vacancy/{vacancy_slug}/`
- `vacancy.description` + `vacancy.mission` + `vacancy.profile` → merged HTML
  description (format-converted)
- `vacancy.address.{locality,administrative_area_level_1,country}` → `location`
- `vacancy.metier` (fallback `activity`) → `department`
- `vacancy.remote` enum: `"notime"` = on-site only; any other value → remote
- `vacancy.created_at` ISO-8601 → `datePosted` (`YYYY-MM-DD`)
- `vacancy.company.name` → `companyName` (fallback: derived from slug)
- `vacancy.apply_url` (often null) → `applyUrl` (fallback: job page URL)

Tenant resolution:
- `companySlug` → used verbatim.
- `companyUrl` → segment after `/company/` in the path
  (e.g. `flatchr` from `careers.flatchr.io/fr/company/flatchr/`); else the
  first non-`www`/`careers` sub-domain label of a custom domain.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                      |
| ---------------------------- | ------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 404 / `{ message }`), or fetch failed |
| logged warn (HTTP 4xx)       | unknown/dead tenant — degrades to empty, never throws        |
| logged warn (parse failure)  | malformed JSON / per-item error — degrades to empty/partial, never throws |

## 8. Test Plan

- E2E (`__tests__/flatchr.e2e-spec.ts`): known tenant (`companySlug: 'flatchr'`)
  returns shaped jobs; no-slug/url returns empty; unknown tenant degrades
  gracefully (empty); `resultsWanted` honoured. Network-tolerant (zero results
  acceptable; shape assertions guarded by `length > 0`). Asserts
  `job.site === Site.FLATCHR` and `job.atsType === 'flatchr'`.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-FL-1 — WAF-gated tenants.** A subset of Flatchr tenants may sit behind a
  CDN / WAF that blocks unauthenticated server-side requests. Graceful empty
  result is the fallback (NFR-2). **Default (proceeding):** degrade to empty on 4xx.
- **Q-FL-2 — Pagination / large tenants.** The listing endpoint returned the
  full vacancy set in a single response on all tenants tested. If a future
  tenant has thousands of roles the response may be paginated or truncated.
  **Default (proceeding):** single-document fetch; re-evaluate if truncation is
  observed in practice.
- **Q-FL-3 — `remote` enum vocabulary.** Only `"notime"` (on-site) was observed
  live. Other values are treated as remote-capable; the full enum is not
  documented. **Default (proceeding):** non-`notime` ⇒ remote, plus title keywords.

## 10. Decisions

- D-1: Primary endpoint is the public `GET /company/{slug}.json` listing on the
  shared host `careers.flatchr.io` — the same data the career-site front end
  renders. No authentication is needed. Verified live 2026-06-03 against
  `flatchr` (HTTP 200, 3 vacancies) and `groupeaudeo` (HTTP 200, 2 vacancies);
  an unknown slug returns HTTP 404 with `{ message }`.
- D-2: **Confidence: verified.** The endpoint URL, the request shape, and the
  per-field response shape were all byte-confirmed against the live `flatchr`
  tenant on 2026-06-03 (`items[].vacancy.{id,slug,title,description,mission,`
  `profile,contract_type,metier,remote,address,company,created_at}`).
- D-3: The listing embeds the full multi-part HTML description inline, so NO
  per-vacancy detail fan-out is required — a single request per tenant. De-dup
  by resolved `atsId` guards against duplicate distribution rows.
- D-4: `atsId` prefers the opaque `vacancy.id`, falling back to numeric
  `vacancy_id`, then the leading token of `vacancy.slug`.
- D-5: `companyName` is taken from `vacancy.company.name`; the slug-derived name
  is a fallback only. `department` is `vacancy.metier` (fallback `activity`).
- D-6: `companySlug` is the primary input; `companyUrl` is parsed for the
  `/company/{slug}` path segment (career pages live under `careers.flatchr.io`).

## 11. References

- `packages/plugins/source-ats-flatchr/` — implementation.
- Flatchr career-site documentation (developers.flatchr.io/site-carriere).
- Live listing verified 2026-06-03:
  `https://careers.flatchr.io/company/flatchr.json` (HTTP 200, 3 vacancies),
  `https://careers.flatchr.io/company/groupeaudeo.json` (HTTP 200, 2 vacancies).
