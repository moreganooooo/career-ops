# Spec: 364 — PyjamaHR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 364                                           |
| Slug           | source-ats-pyjamahr                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 354 (Hireful), 342 (Talentsoft)               |

## 1. Problem Statement

PyjamaHR (pyjamahr.com) is a modern ATS & recruitment-software vendor (India /
global) whose candidate-facing product is a hosted careers portal. Every customer
tenant publishes a branded, public career site addressed by its company slug on
the shared careers host `https://jobs.pyjamahr.com/{tenant}` (mirrored under
`https://app.pyjamahr.com/careers/{tenant}`). The jobs index is a client-rendered
Next.js SPA, but the portal is backed by a clean, public, **unauthenticated** JSON
API on `api.pyjamahr.com` keyed by the tenant's `company_slug`. Ever Jobs has no
adapter for PyjamaHR-powered career sites, so these vacancies are currently
un-ingestable. A single generic, multi-tenant PyjamaHR adapter unlocks the full
catalogue of PyjamaHR-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-pyjamahr` plugin that ingests vacancies
  from **any** PyjamaHR career site given a `companySlug` (the tenant company slug,
  e.g. `jobscubicle`) or a `companyUrl` (a portal URL on a `pyjamahr.com` host,
  from which the tenant slug is extracted).
- Use the **public, anonymous** surface (no auth, no API key): the paginated JSON
  open-roles list (`/api/career/jobs/?company_slug={tenant}`) to enumerate roles,
  plus each role's JSON detail object (`/api/career/jobs/{id}/?company_slug={tenant}`)
  carrying the full HTML body and metadata.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'pyjamahr'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated PyjamaHR admin or recruiter API. This plugin consumes only the
  public candidate-facing surface.
- Server-side filtering by department / location / product (the portal supports
  these facets). We ingest the tenant's full open-roles list and slice client-side
  to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of PyjamaHR tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the PyjamaHR plugin at a tenant's
> careers slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the PyjamaHR adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` (used directly) or from a `companyUrl` on a `pyjamahr.com` host (tenant taken from the `/careers/{tenant}` or `/{tenant}` path segment, or the sub-domain label). | must |
| FR-2  | Fetch the public paginated JSON list (`GET /api/career/jobs/?company_slug={tenant}&page={n}`), walking `next` pages until `resultsWanted` roles are collected. | must |
| FR-3  | Fetch each role's JSON detail object (`GET /api/career/jobs/{id}/?company_slug={tenant}`); use the numeric `id` as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping pagination + detail fetches once collected. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (HTTP 200 empty / HTTP 4xx), network errors, and malformed / non-object payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public JSON list + detail API    |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PYJAMAHR, name: 'PyjamaHR', category: 'ats', isAts: true })
class PyjamaHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://api.pyjamahr.com/api/career/jobs/?company_slug={tenant}&page={n}
  → { "count": 11, "next": "…&page=2" | null, "previous": "…" | null,
      "results": [
        { "id": 51803, "slug": "senior-lead-social-commerce",
          "title": "Senior Lead – Social Commerce",
          "country": "India", "location": "Pune", "other_locations": [],
          "department_name": null, "workplace_type": "REMOTE",
          "min_experience": 10.0, "max_experience": 12.0 }, … ] }

GET https://api.pyjamahr.com/api/career/jobs/{id}/?company_slug={tenant}
  → { "id": 51803, "uuid": "A0307EA6AA",
      "title": "Senior Lead – Social Commerce",
      "job_type": "FULLTIME",
      "description": "<div>…HTML body…</div>",
      "country": "India", "location": "Pune", "other_locations": [],
      "department_name": null, "remote": false, "workplace_type": "REMOTE",
      "seniority": ["mid-senior-level"],
      "created_at": "2023-08-04T21:10:39+05:30",
      "valid_through": "2023-10-03T21:10:39+05:30", "currency": "INR" }
```

Wire shape → `JobPostDto` mapping:

| JSON field                                          | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` (list / detail)                                | `atsId`, `id`           | `id` is prefixed `pyjamahr-{atsId}`                         |
| `title` (detail, else list)                         | `title`                 | required; role skipped if absent                            |
| `https://jobs.pyjamahr.com/{tenant}?job_uuid={id}`  | `jobUrl`, `applyUrl`    | canonical public detail / apply URL (slug carried as hint)  |
| `description` (HTML, from detail)                   | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `created_at`                                        | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `location` / `country`                              | `location`              | city (non-"Remote") / country; null when none usable        |
| `remote` / `workplace_type` / title / location      | `isRemote`              | remote detection (`REMOTE` / `remote` / `wfh` …)            |
| `department_name`                                   | `department`            | when present                                                |
| `job_type` (`FULLTIME` → `Full Time`)               | `employmentType`        | token normalised to a readable label                        |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the API carries no brand name on the public surface         |
| —                                                   | `site`                  | constant `Site.PYJAMAHR`                                    |
| —                                                   | `atsType`               | constant `'pyjamahr'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `jobscubicle`) → used directly as the `company_slug`.
- `companySlug` containing a portal URL / `pyjamahr.com` host → the tenant token is
  extracted from the URL.
- `companyUrl` on a `pyjamahr.com` host (`jobs.pyjamahr.com/{tenant}`,
  `app.pyjamahr.com/careers/{tenant}`, or `{tenant}.pyjamahr.com`) → the tenant
  token is extracted from the path segment / sub-domain label.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 200 empty / 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed / non-object payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/pyjamahr.e2e-spec.ts`): known tenant
  (`companySlug: 'jobscubicle'`) returns shaped jobs (`site === Site.PYJAMAHR`,
  `atsType === 'pyjamahr'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PJ-1 — Custom careers domains.** Some tenants may front the portal under their
  own custom domain (the SPA supports it). **Default (proceeding):** address a
  tenant by its `company_slug` (the stable API key); a caller may pass a full
  `companyUrl` on a `pyjamahr.com` host to derive the slug. Custom-domain detection
  beyond `pyjamahr.com` hosts is deferred to the source-adoption backlog.
- **Q-PJ-2 — Company display name.** The public JSON surface (list + detail) carries
  no tenant brand name. **Default (proceeding):** de-slugify + title-case the tenant
  slug for `companyName`; downstream enrichment may override.
- **Q-PJ-3 — Unknown tenant signalling.** An unknown `company_slug` returns HTTP 200
  with `count: 0` and an empty `results[]` (not a 4xx). **Default (proceeding):**
  treat an empty `results[]` (and any 4xx) as "no roles" → empty result.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON API on `api.pyjamahr.com`
  keyed by `company_slug`: the paginated open-roles list
  (`/api/career/jobs/?company_slug={tenant}`) for enumeration plus each role's JSON
  detail object (`/api/career/jobs/{id}/?company_slug={tenant}`) for the HTML body
  and metadata. **Confidence: verified** — the platform, tenant addressing, both
  JSON wire shapes, and the canonical public job URL were confirmed live 2026-06-03
  against the named real tenant `jobscubicle` (11 open roles).
- D-2: There is no JS-free server-rendered HTML surface (the portal is a Next.js
  SPA); the JSON API is the documented, no-auth surface the SPA itself consumes and
  is used here.
- D-3: The richest structured fields available per role are the detail object's
  `title`, `description` (HTML), `created_at`, `job_type`, `department_name`,
  `country` / `location`, `workplace_type` / `remote`, and `seniority`. The numeric
  `id` is the stable per-role ATS id.
- D-4: The list endpoint paginates (`count` / `next`); the adapter walks pages
  (bounded by a page cap) only until `resultsWanted` deduped roles are collected,
  then fetches each role's detail. De-dup is by `atsId`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all payloads are parsed with
  defensive object/array narrowing so minor wire drift never throws.

## 11. References

- `packages/plugins/source-ats-pyjamahr/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant addressing `jobs.pyjamahr.com/{tenant}` (mirrored
    `app.pyjamahr.com/careers/{tenant}`), backed by
    `api.pyjamahr.com/api/career/jobs/?company_slug={tenant}`, confirmed with the
    named real tenant `jobscubicle` (Jobscubicle, 11 open roles).
  - Both JSON wire shapes (list + per-role detail) confirmed byte-level, and the
    canonical public job URL `https://jobs.pyjamahr.com/{tenant}?job_uuid={id}`
    (verified=true).
