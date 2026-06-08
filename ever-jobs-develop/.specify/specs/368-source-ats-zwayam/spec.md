# Spec: 368 — Zwayam ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 368                                           |
| Slug           | source-ats-zwayam                             |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 364 (PyjamaHR), 354 (Hireful)                 |

## 1. Problem Statement

Zwayam (zwayam.com) is an end-to-end recruitment-automation suite / ATS (India —
built out of the Naukri.com / Info Edge stable, now part of SHL). Its
candidate-facing product is a hosted, branded career site that every customer tenant
publishes publicly and **unauthenticated**. Tenants are addressed by a custom career
domain (e.g. `https://{tenant}.openings.co/` or a vanity host such as
`https://careers.beacon-india.com/`), with the career page under a tenant slug path
(`https://{careerHost}/{tenant}/`). The career page is a client-rendered SPA, but it
is served + powered by Zwayam's shared public API origin (`api.zwayam.com`, mirrored
`public.zwayam.com`) keyed by the tenant slug + career host. Ever Jobs has no adapter
for Zwayam-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant Zwayam adapter unlocks the full catalogue of
Zwayam-powered career sites with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-zwayam` plugin that ingests vacancies from
  **any** Zwayam career site given a `companySlug` (the tenant company slug,
  optionally a `{slug}:{host}` pair) or a `companyUrl` (a career-site URL from which
  the tenant slug + career host are extracted).
- Use the **public, anonymous** surface (no auth, no API key): the paginated JSON
  open-roles list (`/company/{tenant}/jobs?host={careerHost}`) to enumerate roles,
  plus each role's JSON preview / detail object
  (`/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com`)
  carrying the full HTML body and metadata.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'zwayam'`, `department`, `employmentType`).

## 3. Non-Goals

- Any authenticated Zwayam admin / recruiter / Amplify webhook API. This plugin
  consumes only the public candidate-facing surface.
- Server-side filtering by department / location. We ingest the tenant's full
  open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Zwayam tenant slugs / career hosts (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Zwayam plugin at a tenant's
> career slug (or career URL), so that I ingest that organisation's full open-roles
> list without writing a bespoke scraper.

> As a **plugin host**, I want the Zwayam adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant slug + career host from `companySlug` (used directly; a `{slug}:{host}` pair or a career URL is split) or from a `companyUrl` (host = career host, tenant = first path segment, else sub-domain label). | must |
| FR-2  | Fetch the public paginated JSON list (`GET /company/{tenant}/jobs?host={careerHost}&page={n}&size={k}`), walking pages until `resultsWanted` roles are collected. | must |
| FR-3  | Fetch each role's JSON preview / detail object (`GET /job_preview/?jobUrl={jobSlug}&host={careerHost}`) when the list omits the body; use the role slug as `atsId`. | must |
| FR-4  | De-duplicate roles by `atsId` within a single run.                                                   | must     |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl). | must |
| FR-6  | Convert the description per `descriptionFormat` (HTML / Markdown / Plain).                            | should   |
| FR-7  | Honour `resultsWanted` (default 100 internally) by stopping pagination + detail fetches once collected. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided.                | must     |
| FR-9  | Tolerate unknown tenants (empty list / HTTP 4xx), network errors, and malformed / non-object payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public JSON list + preview API   |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ZWAYAM, name: 'Zwayam', category: 'ats', isAts: true })
class ZwayamService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface confidence verified=false — see §10 D-1):

```
GET https://api.zwayam.com/company/{tenant}/jobs?host={careerHost}&page={n}&size={k}
  → { "totalElements": 23, "totalPages": 2, "number": 0, "last": false,
      "content": [
        { "jobId": "inside-sales-executive-pune-2025012912063817",
          "jobTitle": "Inside Sales Executive",
          "location": "Pune", "city": "Pune", "state": "Maharashtra",
          "country": "India", "department": "Sales",
          "employmentType": "Full Time", "remote": false,
          "jobDescription": "<p>…HTML body…</p>",
          "postedDate": "2025-01-29T12:06:38+05:30" }, … ] }

GET https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com
  → { "jobId": "…", "jobTitle": "…", "jobDescription": "<p>…</p>",
      "location": "…", "department": "…", "employmentType": "…", … }
```

Wire shape → `JobPostDto` mapping:

| JSON field                                          | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `jobUrl` / `jobId` (list / detail)                  | `atsId`, `id`           | `id` is prefixed `zwayam-{atsId}`                          |
| `jobTitle` / `title` (detail, else list)            | `title`                 | required; role skipped if absent                            |
| `/job_preview/?jobUrl={jobSlug}&host={careerHost}`  | `jobUrl`, `applyUrl`    | canonical public preview / apply URL                        |
| `jobDescription` / `description` (HTML)             | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `postedDate` / `createdDate`                        | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `city` / `state` / `country` / `location`           | `location`              | structured parts; null when none usable                     |
| `remote` / `workplaceType` / title / location       | `isRemote`              | remote detection (`REMOTE` / `remote` / `wfh` …)            |
| `department`                                        | `department`            | when present                                                |
| `employmentType` / `jobType` (`FULLTIME` → `Full Time`) | `employmentType`    | token normalised to a readable label                        |
| tenant slug (de-slugified + title-cased)            | `companyName`           | the API carries no brand name on the public surface         |
| —                                                   | `site`                  | constant `Site.ZWAYAM`                                      |
| —                                                   | `atsType`               | constant `'zwayam'`                                         |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `beacon-india`) → slug used directly; default career host
  `{slug}.openings.co`.
- `companySlug` as a `{slug}:{host}` pair → explicit slug + career host.
- `companySlug` containing a career URL → slug + host extracted from the URL.
- `companyUrl` (`{careerHost}/{tenant}/`) → host = career host, tenant = first path
  segment (else the sub-domain / brand label).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (empty list / 4xx), or no roles |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | malformed / non-object payload or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/zwayam.e2e-spec.ts`): known tenant
  (`companySlug: 'beacon-india:careers.beacon-india.com'`) returns shaped jobs
  (`site === Site.ZWAYAM`, `atsType === 'zwayam'`, `atsId`/`jobUrl` defined);
  `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable — verified=false surface; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-ZW-1 — Career host vs. slug.** Zwayam keys the public API by both a tenant slug
  (path) and a `host=` career-host query parameter; tenants front the site with either
  `{tenant}.openings.co` or a vanity domain. **Default (proceeding):** accept a
  `{slug}:{host}` pair or a full career URL; when only a bare slug is given, assume the
  Zwayam-hosted `{slug}.openings.co` career host.
- **Q-ZW-2 — Company display name.** The public JSON surface carries no tenant brand
  name. **Default (proceeding):** de-slugify + title-case the tenant slug for
  `companyName`; downstream enrichment may override.
- **Q-ZW-3 — List wire shape (verified=false).** The career site is a client-rendered
  SPA and the live API hosts time out / 403 to anonymous crawlers, so the open-roles
  *list* JSON wire shape could not be byte-confirmed. **Default (proceeding):** parse a
  defensive superset (Spring `content[]` / `jobs[]` / bare array; camelCase field
  aliases), and degrade any fetch / parse failure to an empty / partial result.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON API on the shared origin
  `api.zwayam.com` (mirrored `public.zwayam.com`) keyed by the tenant slug + career
  host: a paginated open-roles list (`/company/{tenant}/jobs?host={careerHost}`) for
  enumeration plus each role's preview / detail object
  (`/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com`) for the
  HTML body and metadata. **Confidence: verified=false** — the platform, the
  candidate-facing career-site addressing (`{careerHost}/{tenant}/`, confirmed via the
  301 from `careers.beacon-india.com/` → `/beacon-india/`), the shared API origin, and
  the canonical per-role preview URL were confirmed live 2026-06-03 (real shared links
  for `tuvsud.openings.co` and `careers.beacon-india.com`); the exact list-endpoint
  wire shape is a defensive design (SPA + timing-out / 403 anonymous hosts).
- D-2: There is no JS-free server-rendered HTML surface (the career page is an SPA);
  the JSON API the SPA consumes is the documented, no-auth surface and is used here.
- D-3: The richest structured fields available per role are the preview object's
  `jobTitle`, `jobDescription` (HTML), `postedDate`, `employmentType`, `department`,
  `country` / `city` / `state` / `location`, and `remote` / `workplaceType`. The role
  `jobUrl` slug is the stable per-role ATS id.
- D-4: The list endpoint paginates (`totalPages` / `number` / `last`); the adapter
  walks pages (bounded by a page cap) only until `resultsWanted` deduped roles are
  collected, then fetches each role's detail when the list omits the body. De-dup is by
  `atsId`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all payloads are parsed with defensive
  object/array narrowing so minor wire drift never throws.

## 11. References

- `packages/plugins/source-ats-zwayam/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + candidate-facing career-site addressing `{careerHost}/{tenant}/`,
    confirmed live via `careers.beacon-india.com/` → 301 → `/beacon-india/` and the
    `{tenant}.openings.co` default career host (e.g. `tuvsud.openings.co`).
  - Shared public API origin `api.zwayam.com` (mirrored `public.zwayam.com`) and the
    canonical per-role preview URL
    `https://api.zwayam.com/job_preview/?jobUrl={jobSlug}&host={careerHost}&apiDomain=api.zwayam.com`
    (observed in real shared LinkedIn job links).
  - The open-roles list wire shape is a defensive design (verified=false): SPA + the
    live API hosts time out / 403 to anonymous crawlers.
