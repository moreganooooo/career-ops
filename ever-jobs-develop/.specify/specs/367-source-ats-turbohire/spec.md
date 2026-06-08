# Spec: 367 — TurboHire ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 367                                           |
| Slug           | source-ats-turbohire                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

TurboHire (turbohire.co) is an AI recruitment-automation ATS (India / global) whose
candidate-facing product is a hosted careers portal. Every customer tenant publishes
a branded, public career site on a tenant careers sub-domain
(`https://{tenant}.turbohire.co`) and the shared host `careers.turbohire.co`, with
per-role public detail pages on `portal.turbohire.co/job/publicjobs/{token}` (mirrored
on `app.turbohire.co`). The jobs index is a client-rendered SPA, but the portal is
backed by a public, **unauthenticated** JSON API on `api.turbohire.co` keyed by the
tenant's company / org slug. Ever Jobs has no adapter for TurboHire-powered career
sites, so these vacancies are currently un-ingestable. A single generic, multi-tenant
TurboHire adapter unlocks the full catalogue of TurboHire-powered career sites with
one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-turbohire` plugin that ingests vacancies
  from **any** TurboHire career site given a `companySlug` (the tenant careers
  sub-domain label / org slug, e.g. `tatamotors`) or a `companyUrl` (a portal URL on
  a `turbohire.co` host, from which the tenant slug is extracted).
- Use the **public, anonymous** surface (no auth, no API key): the paginated JSON
  open-roles list (`/api/careerpage/publicjobs?companySlug={tenant}`) to enumerate
  roles, plus each role's JSON detail object
  (`/api/careerpage/publicjobs/{id}?companySlug={tenant}`) carrying the full HTML body
  and metadata.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'turbohire'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated TurboHire admin or recruiter API. This plugin consumes only the
  public candidate-facing surface.
- Server-side filtering by department / location (the portal supports these facets).
  We ingest the tenant's full open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of TurboHire tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the TurboHire plugin at a tenant's
> careers slug, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the TurboHire adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug from `companySlug` (used directly) or from a `companyUrl` on a `turbohire.co` host (tenant taken from the `{tenant}.turbohire.co` sub-domain label, or the first path segment on a shared host). | must |
| FR-2  | Fetch the public paginated JSON list (`GET /api/careerpage/publicjobs?companySlug={tenant}&page={n}&pageSize={size}`), walking pages until `resultsWanted` roles are collected. | must |
| FR-3  | Fetch each role's JSON detail object (`GET /api/careerpage/publicjobs/{id}?companySlug={tenant}`); use the opaque `id` / public token as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping pagination + detail fetches once collected. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (empty list / HTTP 4xx), network errors, and malformed / non-object payloads without throwing. | must |

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
@SourcePlugin({ site: Site.TURBOHIRE, name: 'TurboHire', category: 'ats', isAts: true })
class TurboHireService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; DEFENSIVE design — see §10 D-1):

```
GET https://api.turbohire.co/api/careerpage/publicjobs?companySlug={tenant}&page={n}&pageSize={size}
  → { "totalCount": 12, "page": 1, "pageSize": 20,
      "data": [
        { "id": "1dUzhMe2tYOz9jTRiOZUBM33ka",
          "publicId": "1dUzhMe2tYOz9jTRiOZUBM33ka",
          "title": "Senior Software Engineer",
          "departmentName": "Engineering",
          "employmentType": "Full Time",
          "city": "Hyderabad", "state": "Telangana", "country": "India",
          "isRemote": false,
          "publicUrl": "https://portal.turbohire.co/job/publicjobs/1dUz…" }, … ] }

GET https://api.turbohire.co/api/careerpage/publicjobs/{id}?companySlug={tenant}
  → { "id": "1dUzhMe2tYOz9jTRiOZUBM33ka",
      "title": "Senior Software Engineer",
      "descriptionHtml": "<div>…HTML body…</div>",
      "employmentType": "Full Time", "departmentName": "Engineering",
      "city": "Hyderabad", "state": "Telangana", "country": "India",
      "isRemote": false, "workplaceType": "Onsite",
      "createdOn": "2026-04-21T10:30:00Z",
      "applyUrl": "https://portal.turbohire.co/job/publicjobs/1dUz…" }
```

Wire shape → `JobPostDto` mapping:

| JSON field                                              | JobPostDto field        | Notes                                                       |
| ------------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` / `publicId` (list / detail)                       | `atsId`, `id`           | `id` is prefixed `turbohire-{atsId}`                        |
| `title` (detail, else list)                             | `title`                 | required; role skipped if absent                            |
| `publicUrl` / `applyUrl`, else `portal.turbohire.co/job/publicjobs/{id}` | `jobUrl`, `applyUrl` | canonical public detail / apply URL  |
| `descriptionHtml` / `description` (from detail)         | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `createdOn`                                             | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city` / `state` / `country` (else `location`)          | `location`              | structured parts; null when none usable                     |
| `isRemote` / `workplaceType` / title / location         | `isRemote`              | remote detection (`Remote` / `remote` / `wfh` …)            |
| `departmentName`                                        | `department`            | when present                                                |
| `employmentType` (`FULLTIME` → `Full Time`)             | `employmentType`        | token normalised to a readable label                        |
| `companyName` (detail), else tenant slug                | `companyName`           | de-slugified + title-cased when the API carries no brand    |
| —                                                       | `site`                  | constant `Site.TURBOHIRE`                                   |
| —                                                       | `atsType`               | constant `'turbohire'`                                      |
| `description` text                                      | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `tatamotors`) → used directly as the `companySlug`.
- `companySlug` containing a portal URL / `turbohire.co` host → the tenant token is
  extracted from the URL.
- `companyUrl` on a `turbohire.co` host (`{tenant}.turbohire.co`,
  `careers.turbohire.co/{tenant}`) → the tenant token is extracted from the
  sub-domain label / path segment. `careers` / `portal` / `app` / `api` / `www` are
  reserved labels.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (empty list / 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed / non-object payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/turbohire.e2e-spec.ts`): known tenant
  (`companySlug: 'tatamotors'`) returns shaped jobs (`site === Site.TURBOHIRE`,
  `atsType === 'turbohire'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape
  assertions guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-TH-1 — Backing API wire shape.** The careers portal is a client-rendered SPA and
  TurboHire publishes no public API docs; the exact `api.turbohire.co` list / detail
  paths + field names could not be observed unauthenticated. **Default (proceeding):**
  model the documented public URL pattern (`/api/careerpage/publicjobs`) defensively,
  tolerating alternate envelope keys (`data` / `results` / `jobs`) and body keys
  (`descriptionHtml` / `description` / `jobDescription`); every consumed field is
  optional and every network call degrades gracefully so a wrong guess never throws.
- **Q-TH-2 — Custom careers domains.** Some tenants may front the portal under their
  own custom domain. **Default (proceeding):** address a tenant by its careers
  sub-domain label / org slug (the stable API key); a caller may pass a full
  `companyUrl` on a `turbohire.co` host to derive the slug. Non-`turbohire.co` custom
  domains are deferred to the source-adoption backlog.
- **Q-TH-3 — Company display name.** The public surface may carry no tenant brand name.
  **Default (proceeding):** use the detail object's `companyName` when present, else
  de-slugify + title-case the tenant slug for `companyName`; downstream enrichment may
  override.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON API on `api.turbohire.co` keyed
  by the tenant company / org slug: the paginated open-roles list
  (`/api/careerpage/publicjobs?companySlug={tenant}`) for enumeration plus each role's
  JSON detail object (`/api/careerpage/publicjobs/{id}?companySlug={tenant}`) for the
  HTML body and metadata. **Confidence: defensive (verified=false)** — the platform,
  tenant addressing (`{tenant}.turbohire.co`, named tenant `tatamotors`), the shared
  `careers.turbohire.co` host, and the per-role public detail host
  `portal.turbohire.co/job/publicjobs/{token}` were confirmed live 2026-06-03, but the
  backing JSON wire shapes could not be observed unauthenticated and are modelled
  defensively from the documented public URL pattern.
- D-2: There is no JS-free server-rendered HTML surface (the portal is a SPA); the
  JSON API the SPA consumes is the intended public surface and is used here, with
  alternate envelope / body keys tolerated to absorb wire-shape uncertainty.
- D-3: The richest structured fields available per role are the detail object's
  `title`, `descriptionHtml`, `createdOn`, `employmentType`, `departmentName`,
  `city` / `state` / `country`, and `workplaceType` / `isRemote`. The opaque `id` /
  public token is the stable per-role ATS id.
- D-4: The list endpoint paginates (`totalCount` / `page` / `pageSize`); the adapter
  walks pages (bounded by a page cap) only until `resultsWanted` deduped roles are
  collected, then fetches each role's detail. De-dup is by `atsId`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML
  → text/markdown converters + email extraction); all payloads are parsed with
  defensive object/array narrowing so minor wire drift never throws.

## 11. References

- `packages/plugins/source-ats-turbohire/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - CONFIRMED live: platform + tenant addressing — shared careers host
    `careers.turbohire.co`, tenant careers sub-domains `{tenant}.turbohire.co` (named
    real tenant `tatamotors`, Tata Motors, `https://tatamotors.turbohire.co/dashboardv2?orgId=39ddba0d-…`),
    and the per-role public detail host `portal.turbohire.co/job/publicjobs/{token}`
    (and `app.turbohire.co` mirror).
  - NOT confirmed live: the `api.turbohire.co` JSON list / detail wire shapes (SPA
    backing API, no public docs) — modelled defensively (verified=false).
