# Spec: 335 — Webcruiter ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 335                                           |
| Slug           | source-ats-webcruiter                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 330 (Prescreen), 301 (Niceboard)             |

## 1. Problem Statement

Webcruiter (webcruiter.com) is a Norwegian / Nordic applicant-tracking system
operated by Talentech. Its customers — Norwegian municipalities, hospital
trusts, NGOs, and private employers — publish their open roles through one
shared public candidate portal at `candidate.webcruiter.com`, where each tenant
is addressed by a numeric "company lock" id (the `companyLock` query parameter
on the portal). Ever Jobs has no adapter for Webcruiter-powered portals, so
these vacancies are currently un-ingestable. A single generic, multi-tenant
Webcruiter adapter unlocks the full catalogue of Webcruiter-powered career
portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-webcruiter` plugin that ingests
  vacancies from **any** Webcruiter-powered tenant given a `companySlug` (the
  numeric company-lock id, e.g. `23109900`) or a `companyUrl` (a portal URL
  whose `companyLock` query param, numeric path segment, or numeric sub-domain
  label is the lock id).
- Use the **public, anonymous candidate portal** (no auth, cookie, or API key)
  served at `https://candidate.webcruiter.com`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'webcruiter'`, `department`).

## 3. Non-Goals

- The authenticated candidate APIs (`/api/account/spalogin`, `/api/candidate/*`)
  and any logged-in features. They are explicitly not used.
- Server-side filtering by workplace / category / job type. We request the
  tenant's full open-roles page and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- A curated seed list of Webcruiter company-lock ids (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Webcruiter plugin at a
> tenant's company-lock id, so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Webcruiter adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a company lock from `companySlug` (preferred), or from `companyUrl` (`companyLock` query param → numeric path segment → numeric sub-domain label). | must |
| FR-2  | Fetch the open-roles list via `POST /api/odvert/companysearch/{companyLock}` with a `{ take, skip }` body. | must |
| FR-3  | Best-effort fetch tenant metadata (`GET /api/company/companymeta/{companyLock}`) for a clean `companyName`. | should |
| FR-4  | Map each advert to `JobPostDto` (title, url, location, department, employmentType, datePosted, description, applyUrl). | must |
| FR-5  | De-duplicate vacancies by `atsId` within a single run.                                               | must     |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) and slice client-side.                                | must     |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown / dead tenants (`{ Total: 0, Data: [] }` or HTTP 4xx) and parse failures without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public candidate portal only     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice to `resultsWanted`         |
| NFR-5  | Metadata fetch failure is non-fatal           | job list still returned          |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.WEBCRUITER, name: 'Webcruiter', category: 'ats', isAts: true })
class WebcruiterService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against company locks
`77790000` and `23109900`):

```
POST https://candidate.webcruiter.com/api/odvert/companysearch/{companyLock}?language={lang}
  body: { "take": <n>, "skip": <n> }     // JSON; paging only (POST-only — GET → HTTP 405)
  → {
      Total: <number>,                    // total open roles for the tenant
      Data: [ {
        Id, TenantId, CompanyName, Heading, HeadingNotOverruled,
        Presentation, JobType, JobCategory, Language, Culture,
        PublishedDate ("DD.MM.YYYY"), PublishedIntranetDate ("DD.MM.YYYY"),
        ApplicationDeadline (ISO-8601), ApplyWithinDate ("DD.MM.YYYY"),
        Workplace, Workplace2, Workplace3, WorkPlaceFacet, MultipleWorkplaces,
        PictureUrl,
        OpenAdvertUrl ("https://{companyLock}.webcruiter.no/Main/Recruit/Public/{Id}?language=..."),
        ApplyUrl ("/{culture}/cv?advertId={Id}&...")
      } ],
      Facets: { ... },                     // category/workplace facets — not job data
      Aggregates: null
    }

GET https://candidate.webcruiter.com/api/company/companymeta/{companyLock}?language={lang}
  → { TenantId, CompanyId, CompanyName, CompanyLogoLibUrl, ShowAdvertSearch, ... }
```

Verified wire-shape → `JobPostDto` mapping (company locks `77790000` Tromsø
kommune and `23109900` Norwegian Refugee Council, 2026-06-03):

| Wire field (advert)                              | `JobPostDto` field    | Notes                                                         |
| ------------------------------------------------ | --------------------- | ------------------------------------------------------------ |
| `Id`                                             | `atsId`, `id`         | `id` is prefixed `webcruiter-{Id}`; advert skipped if absent |
| `Heading`                                        | `title`               | advert skipped if absent                                     |
| `CompanyName` (advert) → company meta → derived  | `companyName`         | metadata name preferred; falls back to advert / company lock |
| `OpenAdvertUrl`                                  | `jobUrl`, `jobUrlDirect` | absolute; fallback built from the public-advert template   |
| `ApplyUrl`                                       | `applyUrl`            | relative → resolved against the portal host                  |
| `Presentation`                                   | `description`         | format-converted per `descriptionFormat`                     |
| `PublishedDate` ?? `PublishedIntranetDate`       | `datePosted`          | `DD.MM.YYYY` → `YYYY-MM-DD` (ISO fallback)                    |
| `Workplace3` ?? `Workplace2` ?? `Workplace`      | `location.city`       | most-specific non-empty workplace; no state/country supplied |
| `WorkPlaceFacet` ?? `JobCategory`                | `department`          | organisational unit, else category                           |
| `JobType`                                        | `employmentType`      | e.g. "Fast" (permanent), "Vikariat"                          |
| (workplace / title / job-type text)              | `isRemote`            | keyword heuristic (incl. Norwegian "hjemmekontor")           |
| `description`                                    | `emails`              | harvested from the description text                          |
| —                                                | `site`                | constant `Site.WEBCRUITER`                                   |
| —                                                | `atsType`             | constant `'webcruiter'`                                       |

Company-lock resolution:
- `companySlug` → company lock verbatim (e.g. `23109900`)
- `companyUrl` → `companyLock`/`companylock` query param (case-insensitive),
  else the first numeric path segment, else a numeric leading sub-domain label
  (e.g. `23109900.webcruiter.no`)

### 7.2 Errors

| Code / Behaviour             | Meaning                                                          |
| ---------------------------- | ---------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (`{ Total: 0, Data: [] }` or HTTP 4xx), or empty `Data` |
| logged warn (HTTP 4xx)       | unknown/dead company lock — degrades to empty, never throws      |
| logged warn (no Data array)  | malformed envelope — degrades to empty, never throws             |
| logged warn (meta failure)   | metadata fetch failed — job list still returned                  |
| logged warn (advert error)   | a single advert mapping error — that advert is skipped, run continues |

## 8. Test Plan

- E2E (`__tests__/webcruiter.e2e-spec.ts`): known tenant
  (`companySlug: '23109900'`) returns shaped jobs (`site === Site.WEBCRUITER`,
  `atsType === 'webcruiter'`, `atsId`/`jobUrl` defined); no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` is honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30 000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`,
  `tsconfig.base.json` paths, and `jest.config.js` moduleNameMapper (added
  centrally by the orchestrator).

## 9. Open Questions

- **Q-WC-1 — Paging cap.** The search endpoint returns the requested page in one
  `{ take, skip }` round-trip; for very large tenants (Tromsø kommune had 65
  open roles) a single `take = resultsWanted` request covers the wanted slice.
  **Default (proceeding):** single request with `take = resultsWanted`,
  `skip = 0`; re-evaluate if a tenant truncates below `Total`.
- **Q-WC-2 — Advert language.** Adverts are localized per market; the language
  param selects a variant and Norwegian tenants may serve Norwegian bodies even
  for `language=en`. **Default (proceeding):** request `language=en`; accept
  whatever language the portal serves.
- **Q-WC-3 — Remote detection.** Webcruiter has no explicit remote flag in the
  advert payload. **Default (proceeding):** keyword heuristic over the workplace
  / title / job-type text (English + Norwegian "hjemmekontor").

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate portal at
  `https://candidate.webcruiter.com`. Verified live 2026-06-03: company lock
  `77790000` (Tromsø kommune) returned `Total: 65` with shaped adverts, and
  `23109900` (Norwegian Refugee Council) returned 13 English adverts with real
  headings and `OpenAdvertUrl`s. **Confidence: verified** (byte-confirmed advert
  list and full advert object).
- D-2: The job list comes from `POST /api/odvert/companysearch/{companyLock}`.
  The endpoint is POST-only (a GET returns HTTP 405) and an empty body returns
  `Data: []` with a correct `Total`, so a `{ take, skip }` paging body is
  required to receive rows.
- D-3: A clean `companyName` is taken from `GET /api/company/companymeta/{companyLock}`
  when available; the advert's own `CompanyName` and finally the company-lock id
  are layered fallbacks. The metadata fetch is best-effort and never fatal.
- D-4: The feed supplies an absolute `OpenAdvertUrl`
  (`https://{companyLock}.webcruiter.no/Main/Recruit/Public/{Id}`) used directly
  as `jobUrl`; a per-tenant sub-domain template is the fallback. `ApplyUrl` is
  relative and resolved against the portal host.
- D-5: An unknown / dead company lock answers HTTP 200 with
  `{ Total: 0, Data: [] }` (verified against lock `99999999999`); a 4xx is also
  treated as "no jobs". Both degrade to an empty result and never abort the run.
  De-dup is by `atsId`; the result set is sliced client-side to `resultsWanted`.

## 11. References

- `packages/plugins/source-ats-webcruiter/` — implementation.
- Live portal verified 2026-06-03:
  `https://candidate.webcruiter.com/en-gb/home/companyadverts?companyLock=23109900`
  (Norwegian Refugee Council) and `?companyLock=77790000` (Tromsø kommune), plus
  their `POST /api/odvert/companysearch/{companyLock}` and
  `GET /api/company/companymeta/{companyLock}` endpoints.
