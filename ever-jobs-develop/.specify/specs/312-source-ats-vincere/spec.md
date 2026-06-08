# Spec: 312 — Vincere ATS Source Plugin

| Field          | Value                               |
| -------------- | ----------------------------------- |
| Spec ID        | 312                                 |
| Slug           | source-ats-vincere                  |
| Status         | done                                |
| Owner          | scheduled-agent                     |
| Created        | 2026-06-03                          |
| Last updated   | 2026-06-03                          |
| Supersedes     | (none)                              |
| Related specs  | 301 (Niceboard), 296 (Eightfold)    |

## 1. Problem Statement

Vincere is a recruitment agency ATS/CRM used by 20,000+ recruiters worldwide.
Each agency runs its own branded public job board at
`https://{slug}.vincere.io/careers/` (with custom-domain support).
Ever Jobs has no adapter for Vincere, so these boards are currently
un-ingestable. A single generic, multi-tenant Vincere adapter unlocks this
catalogue with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-vincere` plugin that ingests jobs
  from **any** Vincere-powered Instant Job Board given a `companySlug` (the
  tenant sub-domain label) or a custom-domain `companyUrl`.
- Use the **public, anonymous** AJAX search feed (CSRF-only, no account
  credentials required) so no secrets are needed.
- Map every position into the standard `JobPostDto` contract, including
  ATS-specific metadata (`atsId`, `atsType: 'vincere'`, `department`).

## 3. Non-Goals

- The private Vincere REST API (`/api/v2/job/search/`) that requires
  `x-api-key` and `id-token` OAuth2 credentials. It is explicitly not used.
- Browser-fingerprint / WAF bypass. Any board behind an aggressive WAF that
  rejects plain HTTPS degrades to an empty result.
- Per-job description enrichment beyond what the AJAX listing endpoint returns.
  The endpoint already embeds the full HTML `public_description`, so no
  detail-page fetch is needed.
- Server-side keyword / location filtering. We pass an unfiltered query and
  slice client-side to `resultsWanted`.
- A curated seed list of Vincere tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Vincere plugin at a
> tenant slug, so that I ingest that agency's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the Vincere adapter to behave like every other
> ATS source plugin (same DI module, same `IScraper.scrape` contract), so that
> it is enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a tenant sub-domain slug from `companySlug`, or from `companyUrl` (first sub-domain label). | must |
| FR-2  | GET the careers listing page to obtain the session CSRF token before making any AJAX call.  | must     |
| FR-3  | Fetch positions from the public `POST /careers/ajax/search-jobs` endpoint, paging via `page` parameter; first response's `total` drives pagination. | must |
| FR-4  | Fan out remaining pages with a bounded `Promise.allSettled`.                                 | must     |
| FR-5  | De-duplicate positions by ATS id within a single run.                                        | must     |
| FR-6  | Map each job to `JobPostDto` (title, url, location, department, remote, datePosted, description, applyUrl). | must |
| FR-7  | Convert description per `descriptionFormat` (HTML / Markdown / Plain).                        | should   |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.        | must     |
| FR-9  | Tolerate unknown/dead boards (HTTP 4xx) and fetch failures without throwing.                  | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                  | Target                          |
| ------ | -------------------------------------------- | ------------------------------- |
| NFR-1  | No credentials / secrets required            | public CSRF-gated endpoint only |
| NFR-2  | A fetch failure or unknown board must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client      | UA + timeouts + proxy support   |
| NFR-4  | Bound result-set size                        | slice to `resultsWanted`        |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.VINCERE, name: 'Vincere', category: 'ats', isAts: true })
class VincereService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, verified 2026-06-03):

**Step 1 — CSRF bootstrap:**
```
GET https://{slug}.vincere.io/careers/
  → HTML page containing <meta name="csrf-token" content="{token}">
  → Sets laravel_session cookie
```

**Step 2 — AJAX search:**
```
POST https://{slug}.vincere.io/careers/ajax/search-jobs
  Headers: X-CSRF-TOKEN: {token}, X-Requested-With: XMLHttpRequest,
           Cookie: laravel_session={session}
  Body: page={n}   (application/x-www-form-urlencoded)
  → { items: VincereJob[], total: number, more: boolean, facets: {...}, html: "..." }
```

Verified wire shape (per-item, verified against `nordicjobsworldwide.vincere.io`):

```jsonc
{
  "id": 62597,                                         // numeric → atsId
  "job_title": "Swedish and Norwegian-Speaking Customer Support in Lisbon, Portugal",
  "location": {
    "city": "",
    "state": "Lisbon",
    "country": "Portugal",
    "country_code": "PT",
    "location_name": "Lisbon, Portugal",
    "latitude": 38.7222524,
    "longitude": -9.1393366
  },
  "job_type": "PERMANENT",                             // → department
  "employment_type": "FULL_TIME",                      // → department
  "published_date": "2026-06-02T13:12:50.819Z",        // ISO → datePosted
  "public_description": "<p>...</p>",                  // HTML → description
  "job_summary": "<p>...</p>"                          // fallback description
}
```

Tenant resolution: the tenant is identified by the sub-domain slug (from
`companySlug`, or the first sub-domain label of `companyUrl`).
Job detail URL: `https://{slug}.vincere.io/careers/job/{id}/{title-slug}`.
Apply URL: `https://{slug}.vincere.io/careers/apply/{id}`.

### 7.2 Errors

| Code / Behaviour          | Meaning                                              |
| ------------------------- | ---------------------------------------------------- |
| empty `JobResponseDto`    | no slug/url, blank CSRF, unknown board (HTTP 4xx), or fetch failed |
| logged warn (HTTP 4xx)    | unknown/dead board — degrades to empty, never throws |
| logged warn (page failure)| single page fetch failed — other pages still merge   |

## 8. Test Plan

- E2E (`__tests__/vincere.e2e-spec.ts`): known tenant (`nordicjobsworldwide`)
  returns shaped jobs; no-slug returns empty; unknown board degrades gracefully;
  `resultsWanted` is honoured. Network-tolerant (zero results acceptable; shape
  assertions guarded by `length > 0`).
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-V-1 — CSRF refresh.** The Laravel session cookie expires; very long-running
  batch jobs might need to re-fetch the CSRF token. Current assumption: one
  scrape run is short enough that the session remains valid throughout.
  **Default (proceeding):** single token fetch per `scrape()` call.
- **Q-V-2 — Custom domain detection.** Tenants with a fully custom domain
  (no `vincere.io` in the host) are resolved by taking the first sub-domain
  label of `companyUrl`. If the URL has no sub-domain (bare apex domain), slug
  resolution returns empty and the scraper degrades to an empty result.

## 10. Decisions

- D-1: Primary endpoint is `POST /careers/ajax/search-jobs` — the same call
  the board's own front-end makes. It returns fully structured JSON items
  including HTML descriptions, locations, and dates, so no per-job detail fetch
  is needed.
- D-2: CSRF token is obtained anonymously from the initial GET of the careers
  page. No credentials or API keys are required.
- D-3: `total` on the first AJAX response drives pagination; remaining pages are
  fanned out with a bounded `Promise.allSettled`. De-dup by job id guards
  against cross-page duplicates.
- D-4: The private `/api/v2/job/search/` REST API (requires OAuth2 tokens) is
  explicitly not used.
- D-5: `department` is derived from the `job_type` + `employment_type` strings
  (e.g. "Permanent / Full-time"), since Vincere does not expose a free-text
  department field in the public search response.

## 11. References

- `packages/plugins/source-ats-vincere/` — implementation.
- `packages/plugins/source-ats-niceboard/` — sibling paginated board adapter (pattern).
- Public Vincere Instant Job Board AJAX feed (verified live 2026-06-03 against
  `nordicjobsworldwide.vincere.io`).
