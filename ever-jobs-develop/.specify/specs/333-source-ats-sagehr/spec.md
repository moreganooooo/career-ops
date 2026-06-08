# Spec: 333 — Sage HR ATS Source Plugin

| Field         | Value                          |
| ------------- | ------------------------------ |
| Spec ID       | 333                            |
| Slug          | source-ats-sagehr              |
| Status        | done                           |
| Owner         | scheduled-agent                |
| Created       | 2026-06-03                     |
| Last updated  | 2026-06-03                     |
| Supersedes    | (none)                         |
| Related specs | 330 (Prescreen), 328 (rexx systems) |

## 1. Problem Statement

Sage HR (sage.hr), formerly CakeHR, is a UK / global cloud HR + applicant
tracking suite. Every customer that enables Recruitment publishes a public,
anonymous candidate careers site ("Vacancies") on the shared recruitment host
`talent.sage.hr`, addressed by the tenant's career site identifier — a UUID.
Ever Jobs has no adapter for Sage-HR-powered careers sites, so these vacancies
are currently un-ingestable. A single generic, multi-tenant Sage HR adapter
unlocks the full catalogue of Sage-HR-hosted careers sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-sagehr` plugin that ingests vacancies
  from **any** Sage-HR-powered careers site given a `companySlug` (the career
  site UUID) or a `companyUrl` (a careers-site URL containing the UUID).
- Use the **public, anonymous candidate careers site** (no auth, no API key)
  served at `https://talent.sage.hr/{careerSiteId}/vacancies`.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'sagehr'`, `employmentType`).

## 3. Non-Goals

- The authenticated Sage HR REST API (`/api/recruitment/positions`, requiring an
  `X-Auth-Token` header). It is explicitly not used.
- Server-side filtering by status / location / group / hiring manager. We ingest
  the tenant's full published open-roles list and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, or any write operation.
- CDN / WAF bypass. A careers site gating its pages behind an aggressive WAF for
  non-browser clients is out of scope (graceful empty result).
- A curated seed list of Sage HR career site UUIDs (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sage HR plugin at a
> tenant's career site UUID, so that I ingest that organisation's full
> open-roles list without writing a bespoke scraper.

> As a **plugin host**, I want the Sage HR adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | --------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a career site id from `companySlug` (preferred), or from a `companyUrl` (its `/{id}/vacancies` segment, or any UUID present). | must |
| FR-2  | Fetch the vacancies listing page from `https://talent.sage.hr/{careerSiteId}/vacancies` and parse the `div.job` cards. | must |
| FR-3  | For each listed role, fetch the detail page (`/jobs/{positionId}`) and extract employment type, location chip, company name, and the full description blocks. | should |
| FR-4  | Read the tenant display name from the listing `<h1>` (fallback when the detail logo `alt` is absent). | should |
| FR-5  | De-duplicate vacancies by `atsId` (position id) within a single run.                                 | must     |
| FR-6  | Map each vacancy to `JobPostDto` (title, url, location, employmentType, remote, description, applyUrl). | must  |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) and bound the detail fan-out.                         | must     |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown / dead tenants (HTTP 400/403/404) and parse failures without throwing (partial/empty OK). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                      | Target                            |
| ------ | ------------------------------------------------ | --------------------------------- |
| NFR-1  | No credentials / secrets required                | public candidate careers site only |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result     |
| NFR-3  | All HTTP via `@ever-jobs/common` client          | UA + timeouts + proxy support     |
| NFR-4  | Bound result-set size and fan-out                | slice to `resultsWanted`; bounded `Promise.allSettled` |
| NFR-5  | Detail fan-out uses `Promise.allSettled`         | one failure never nukes the batch |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SAGEHR, name: 'Sage HR', category: 'ats', isAts: true })
class SageHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous, verified live 2026-06-03 against career site
`cf0157f8-8d5e-4d2a-a9f7-0a80b348b097`, Newstel Worldwide HQ):

```
GET https://talent.sage.hr/{careerSiteId}/vacancies
  → HTML with the tenant name in <h1> and open roles as:
      <div class="other-jobs ...">
        <div class="job">
          <a class="title" href="/jobs/{positionId}">Title</a>
          <div class="location">Germany</div>
        </div>
        ...
      </div>

GET https://talent.sage.hr/jobs/{positionId}
  → HTML detail / apply page:
      <div class="heading">
        <div class="logo-wrap"><a href="/{careerSiteId}/vacancies">
          <img alt="{CompanyName}" src="...logo..." /></a></div>
        <div class="title-wrap">
          <h1>{JobTitle}</h1>
          <div class="description"><ul class="with-ticks">
            <li>Full-time</li>                 <!-- employment-type chip -->
            <li class="globe-tick">Germany</li> <!-- location chip -->
          </ul></div>
        </div>
      </div>
      <div class="blocks">
        <article class="block"><div class="block-content wysiwyg">…HTML…</div></article>
        …                                       <!-- one block per section -->
      </div>
```

### 7.2 Mapping (wire → `JobPostDto`)

| Wire field (source)                                   | `JobPostDto` field      |
| ----------------------------------------------------- | ----------------------- |
| listing `a.title[href]` → `/jobs/{positionId}` token  | `atsId`, `id` (`sagehr-{positionId}`) |
| detail `.title-wrap h1` (fallback listing `a.title`)  | `title`                 |
| absolute `/jobs/{positionId}` URL                     | `jobUrl`, `applyUrl`    |
| detail `.logo-wrap img[alt]` (fallback listing `<h1>`)| `companyName`           |
| detail `ul.with-ticks li.globe-tick` (fallback listing `.location`) | `location.city` |
| detail `ul.with-ticks li:first` (non-location chip)   | `employmentType`        |
| detail `.blocks .block-content` (concatenated HTML)   | `description` (format-converted) |
| `remote` / `work from home` / `wfh` / `telecommute` in location / employment / title | `isRemote` |
| `extractEmails(description)`                           | `emails`                |
| constant                                              | `site = Site.SAGEHR`, `atsType = 'sagehr'` |

Tenant resolution:
- `companySlug` → career site id verbatim (typically a UUID).
- `companyUrl` → the path segment preceding `vacancies`
  (`/{careerSiteId}/vacancies`), else the first UUID-shaped path segment, else
  any UUID embedded in the raw string.

### 7.3 Errors

| Code / Behaviour             | Meaning                                                       |
| ---------------------------- | ------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unknown tenant (HTTP 400/403/404), or empty listing |
| logged warn (HTTP 4xx)       | unknown/dead career site — degrades to empty, never throws    |
| logged warn (parse failure)  | HTML parse error — degrades to partial, never throws          |
| logged warn (detail failure) | a single detail fetch failure — degrades to a listing-only row via `Promise.allSettled` |

## 8. Test Plan

- E2E (`__tests__/sagehr.e2e-spec.ts`): known career site
  (`companySlug: 'cf0157f8-8d5e-4d2a-a9f7-0a80b348b097'`) returns shaped jobs
  (`site === Site.SAGEHR`, `atsType === 'sagehr'`, `atsId`/`jobUrl` defined);
  no-slug/url returns empty; unknown tenant (all-zero UUID) degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results is acceptable;
  shape assertions guarded by `length > 0`). 30 000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SH-1 — Career site identifier churn.** The careers site is keyed by an
  opaque UUID; a tenant that re-provisions its career site would get a new UUID.
  **Default (proceeding):** treat the UUID as the stable tenant key supplied by
  the caller; no slug→UUID directory is maintained here.
- **Q-SH-2 — Listing pagination.** The vacancies page renders all published
  roles in one page for small-to-medium tenants (2 roles on the test tenant). A
  very large tenant could paginate. **Default (proceeding):** single-page
  listing; re-evaluate if truncation is observed in practice.
- **Q-SH-3 — Description language.** Sage HR serves the description in whatever
  language the tenant authored it (the test tenant mixes German / English).
  **Default (proceeding):** accept whatever language the careers site serves.

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate careers site at
  `https://talent.sage.hr/{careerSiteId}/vacancies`. Verified live 2026-06-03
  against `cf0157f8-8d5e-4d2a-a9f7-0a80b348b097` (Newstel Worldwide HQ): listing
  HTTP 200 with two `div.job` cards (`/jobs/{uuid}` anchors + `.location`);
  detail page `/jobs/d72fcc99-6a2e-4682-8fd8-4273e80d0bf9` HTTP 200 with the
  `with-ticks` employment-type / location chips and six `.block-content` blocks.
  **Confidence: verified** (byte-confirmed listing and detail page).
- D-2: The listing row provides the title, position id, detail URL, and a
  free-text location — enough to emit a `JobPostDto` on its own. The detail page
  enriches it with employment type, a structured location chip, the company name
  (logo `alt`), and the full description body.
- D-3: The authenticated Sage HR REST API (`/api/recruitment/positions`,
  `X-Auth-Token` header) returns the same published positions but requires a
  per-tenant token; it is an explicit non-goal. No anonymous JSON / RSS feed is
  exposed (probed paths returned the app's HTML 404).
- D-4: Detail fetches fan out under a bounded `Promise.allSettled` (concurrency
  5, 250 ms polite delay between rounds); a single failure degrades that row to
  listing-only and never aborts the run. De-dup is by position id (`atsId`).

## 11. References

- `packages/plugins/source-ats-sagehr/` — implementation.
- Sage HR Recruitment knowledge base (support.sage.hr) — public careers site
  ("Vacancies") and career-page customisation.
- Sage HR REST API blueprint (`/api/recruitment/positions`, `X-Auth-Token`) —
  authenticated, not used.
- Live careers site verified 2026-06-03:
  `https://talent.sage.hr/cf0157f8-8d5e-4d2a-a9f7-0a80b348b097/vacancies`
  (and its `/jobs/{positionId}` detail pages).
