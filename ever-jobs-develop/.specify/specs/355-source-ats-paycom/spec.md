# Spec: 355 — Paycom ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 355                                           |
| Slug           | source-ats-paycom                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), ApplicantPro (schema.org)      |

## 1. Problem Statement

Paycom (paycom.com) is a US enterprise payroll + HCM vendor whose candidate-facing
careers product is served from the `paycomonline.net` job board. The board is
multi-tenant and clientkey-addressed: every customer publishes a public,
unauthenticated careers site keyed by a 32-character hex `clientkey`
(`https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}`). The listing
and per-job detail pages are client-rendered React apps, but the board boots a
public, page-embedded bearer token and talks to an applicant-tracking JSON API,
and each role's classic detail page is additionally pre-rendered with schema.org
`JobPosting` JSON-LD for Google-for-Jobs. Ever Jobs has no adapter for
Paycom-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Paycom adapter unlocks the full catalogue of
Paycom-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-paycom` plugin that ingests vacancies
  from **any** Paycom (`paycomonline.net`) careers board given a `companySlug`
  (the bare `clientkey`) or a `companyUrl` (a board URL carrying `?clientkey=…`).
- Use the **public, anonymous** surface (no auth, no API key): the
  clientkey-addressed board page to read the public page-embedded bearer token,
  the applicant-tracking JSON API (`/api/ats/job-posting-previews/search` +
  `/api/ats/job-postings/{id}`) to enumerate and detail roles, with each role's
  schema.org `JobPosting` JSON-LD detail page as a defensive fallback.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'paycom'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Paycom recruiter / admin API, candidate account, or
  application submission. This plugin consumes only the public candidate-facing
  surface.
- Server-side filtering by department / location / contract type (the board
  supports these facets). We ingest the tenant's open-roles set and slice
  client-side to `resultsWanted`.
- A curated seed list of Paycom tenant clientkeys (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Paycom plugin at a tenant's
> `clientkey`, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Paycom adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the `clientkey` from `companySlug` (a bare clientkey) or from a `companyUrl` on a Paycom board domain (`?clientkey=…` extracted). | must |
| FR-2  | Fetch the clientkey-addressed board page and read the public, page-embedded bearer token the React app boots. | must |
| FR-3  | Enumerate open roles via `POST /api/ats/job-posting-previews/search` (paged by skip/take) and fetch each role's full body from `GET /api/ats/job-postings/{id}`; use the job-posting id as `atsId`. | must |
| FR-4  | Fall back to the classic detail page's schema.org `JobPosting` JSON-LD (with `og:` meta fallbacks) when the JSON API is unavailable / token-less. | should |
| FR-5  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-8  | Honour `resultsWanted` (default 100 internally) by capping the search page + slicing the enumerated role set. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-10 | Tolerate unknown clientkeys (HTTP 4xx), missing tokens, network errors, and malformed / non-JSON payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public board + page-embedded token |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | cap + slice to `resultsWanted`    |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws               |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PAYCOM, name: 'Paycom', category: 'ats', isAts: true })
class PaycomService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03):

```
GET https://www.paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}
  → HTML carrying a public, page-embedded bearer token ("token":"{JWT}")
      the React board forwards to the JSON API below.

POST https://portal-applicant-tracking.us-cent.paycomonline.net
       /api/ats/job-posting-previews/search
  Authorization: Bearer {JWT}
  { "skip": 0, "take": {n} }
  → { "results": [ { "jobPostingId": 342042, "title": "Senior Specialist…",
      "city": "Oklahoma City", "state": "OK", … } ], "total": N }

GET https://portal-applicant-tracking.us-cent.paycomonline.net
      /api/ats/job-postings/{jobPostingId}
  Authorization: Bearer {JWT}
  → { "title": "…", "description": "<p>…HTML body…</p>",
      "city": "…", "state": "…", "datePosted": "2026-05-20", … }

Fallback — classic detail page carrying schema.org JobPosting JSON-LD:
GET https://www.paycomonline.net/v4/ats/web.php/jobs/ViewJobDetails?job={id}&clientkey={KEY}
  → HTML with <script type="application/ld+json">{ "@type": "JobPosting", … }</script>
      (plus og:title / og:url / og:description meta fallbacks)
```

Wire shape → `JobPostDto` mapping:

| API / JSON-LD field                                    | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------ | ----------------------- | ----------------------------------------------------------- |
| `jobPostingId` (else `id` / `jobId`)                   | `atsId`, `id`           | `id` is prefixed `paycom-{atsId}`                           |
| `title` (else `name` / `jobTitle` / JSON-LD / og:title)| `title`                 | required; role skipped if absent                            |
| board detail URL (`…/ViewJobDetails?job={id}&clientkey={KEY}`) | `jobUrl`, `applyUrl` | absolute public detail / apply URL                  |
| `description` (HTML) else preview summary / og:description | `description`         | format-converted (HTML / Markdown / Plain)                  |
| `datePosted` (else `postedDate` / `createdDate`)       | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city` / `state` / `country` (else JSON-LD address)    | `location`              | city / state / country; null when none usable               |
| `isRemote` / `remote` flags, title, location text      | `isRemote`              | remote detection (`remote` / `wfh` / `telecommute` …)       |
| `department` / `category` (else JSON-LD `industry`)    | `department`            | when present                                                |
| `employmentType` / `jobType` (`FULL_TIME` → `Full Time`) | `employmentType`      | enum normalised to a readable label                         |
| `hiringOrganization.name` (else clientkey)             | `companyName`           | de-slugified + title-cased                                  |
| —                                                      | `site`                  | constant `Site.PAYCOM`                                      |
| —                                                      | `atsType`               | constant `'paycom'`                                         |
| `description` text                                     | `emails`                | harvested via `extractEmails`                               |

Clientkey resolution:

- `companySlug` that looks like a bare clientkey (16–64 alphanumeric) → used verbatim.
- `companyUrl` on `paycomonline.net` / `paycomonline.com` → its `?clientkey=…`
  query value is extracted.
- A board URL passed as either field has its `clientkey` query value extracted.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable clientkey, unknown tenant (HTTP 4xx), no token, or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant or expired token — degrades to empty, never throws |
| logged warn (parse failure)  | malformed page / non-JSON payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/paycom.e2e-spec.ts`): known tenant
  (`companySlug: '{clientkey}'`) returns shaped jobs (`site === Site.PAYCOM`,
  `atsType === 'paycom'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PC-1 — Page-embedded token shape.** The React board boots a bearer token
  (JWT) into the page for its own API calls. The board is JS-rendered, so a no-JS
  fetch returns only the `Loading…` shell; the token's exact embed shape could not
  be confirmed without a JS runtime. **Default (proceeding):** match a few
  documented token shapes (`"token":"…"` / `"accessToken":"…"` / inline
  `Bearer …`, JWT-shaped) and, when no token is found, fall back to the JSON-LD
  detail path. Confidence: **unverified**.
- **Q-PC-2 — JSON API response shape.** A GET to `/job-posting-previews/search`
  returns HTTP 405 (Method Not Allowed), confirming the endpoint exists and
  expects POST, but the byte-level response envelope could not be confirmed
  without the token. **Default (proceeding):** parse a small set of envelope
  aliases (`results` / `data` / `items` / `jobPostings`) and field aliases
  defensively; a malformed payload yields "no jobs", never a failure.
- **Q-PC-3 — Clientkey form.** Board clientkeys are 32-char hex in the wild, but
  legacy tenants may use other lengths. **Default (proceeding):** accept a 16–64
  char alphanumeric token as a clientkey, and extract `?clientkey=…` from any
  board URL.

## 10. Decisions

- D-1: Primary surface is the public, anonymous clientkey-addressed board
  (`/v4/ats/web.php/jobs?clientkey={KEY}`) to read the page-embedded bearer token,
  then the applicant-tracking JSON API
  (`/api/ats/job-posting-previews/search` + `/api/ats/job-postings/{id}`) for role
  enumeration + detail. **Confidence: unverified** — the platform, the
  clientkey-addressed board pattern, named real tenants, and the JSON API host
  (a GET to the search endpoint returns HTTP 405, confirming it exists and expects
  POST) were confirmed live 2026-06-03, but the board is a JS-rendered React app so
  the page-embedded token and JSON response shapes could not be confirmed via a
  no-JS fetch; the parser is written defensively around the documented patterns.
- D-2: The classic detail page's schema.org `JobPosting` JSON-LD (with `og:` meta
  fallbacks) is the documented Google-for-Jobs surface and is used as a fallback
  when the JSON API path is unavailable, mirroring the sibling schema.org ATS
  adapters.
- D-3: The richest structured fields per role are the API `title`, `description`
  (HTML), `datePosted`, `employmentType`, `city`/`state`/`country`, and
  `department`/`category`. The job-posting id is the stable per-role ATS id.
- D-4: The search API returns the tenant's open-roles set paged by skip/take; the
  adapter caps the page + slices the enumerated set to `resultsWanted` before
  fetching details. De-dup is by `atsId`.
- D-5: JSON-LD is parsed with a bounded `application/ld+json` block scan + a
  recursive `@type === JobPosting` search (tolerating arrays / `@graph`), and
  `og:` meta fallbacks via bounded regexes — keeping the plugin dependency-free
  and resilient to minor markup drift.

## 11. References

- `packages/plugins/source-ats-paycom/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + clientkey-addressed board pattern
    `paycomonline.net/v4/ats/web.php/jobs?clientkey={KEY}` confirmed, with named
    real tenants: Club Champion, Hollywood Feed, Piping Rock Club, Stir Foods.
  - JSON API host `portal-applicant-tracking.us-cent.paycomonline.net/api/ats/...`
    confirmed: a GET to `/job-posting-previews/search` returns HTTP 405, confirming
    the endpoint exists and expects POST.
  - The board is a JS-rendered React app; the page-embedded bearer token and the
    JSON API's response shape could not be confirmed via an unauthenticated no-JS
    fetch (verified=false).
