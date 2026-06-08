# Spec: 407 — Sesame HR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 407                                           |
| Slug           | source-ats-sesamehr                           |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 395 (Hirehive), 385 (Gupy), 384 (Emply)       |

## 1. Problem Statement

Sesame HR (sesamehr.com / sesametime.com — a Spain/LATAM-focused all-in-one HR suite with a
built-in recruiting / ATS module, used by thousands of SMBs across Spain, Italy, Mexico and
the wider LATAM region) gives every customer tenant a branded, public, candidate-facing
career portal on its shared web app, addressed by the tenant's company name as a path
segment: `https://app.sesametime.com/jobs/{company}/all`. That portal is a client-rendered
SPA, but the role data it shows is loaded from a **public, anonymous JSON API** on a
region-specific backend host: `GET https://back-{region}.sesametime.com/api/v3/companies/{company}/public-vacancies?page={n}`,
returning an envelope `{ data, meta }` whose `data[]` array holds the tenant's open roles.
The backend region is first resolved via the anonymous company finder
`GET login.sesametime.com/private/login-finder/v1/company/{company}` → `{ data: { region } }`.
Neither call requires a bearer token, so the board is directly crawlable without
authentication and without a headless browser. Ever Jobs has no adapter for Sesame-powered
career portals, so these (Spain/LATAM-heavy SMB) vacancy catalogues are currently
un-ingestable. A single generic, multi-tenant Sesame HR adapter unlocks the full catalogue
of Sesame-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-sesamehr` plugin that ingests roles from **any**
  Sesame HR career portal given a `companySlug` (the company path segment, e.g. `Sesame`) or
  a `companyUrl` (a `app.sesametime.com/jobs/{company}/…` portal URL, from which the company
  segment is derived).
- Use the **public, anonymous** surface (no auth, no API key): region detection via
  `GET login.sesametime.com/private/login-finder/v1/company/{company}` then the tenant's
  vacancies feed
  `GET https://back-{region}.sesametime.com/api/v3/companies/{company}/public-vacancies?page={n}`,
  returning `{ data, meta }`; each role carries a UUID `id`, `name`, HTML `description`,
  `contractType`, structured address fields, `modality`, `category` ({ id, name }), and
  `scheduleType` ({ id, name }).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'sesamehr'`, `department`, `employmentType`).

## 3. Non-Goals

- The authenticated Sesame public API (`api-{region}.sesametime.com`, the documented
  `/vacancies` REST endpoints) — it requires a bearer token. This plugin consumes only the
  public candidate-facing portal feed.
- Server-side filtering by category / location / modality (the feed carries these facets). We
  ingest the tenant's full open-role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Sesame tenant company segments (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sesame HR plugin at a tenant's company
> segment, so that I ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Sesame HR adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the company from `companySlug` (the path segment) or from a `companyUrl` on an `app.sesametime.com` host (`/jobs/{company}/…` path). Preserve casing (the API segment is case-sensitive). | must |
| FR-2  | Resolve the regional backend via the anonymous finder `GET login.sesametime.com/private/login-finder/v1/company/{company}`; fall back to `EU1` on any failure. | must |
| FR-3  | Fetch the public vacancies feed `GET /api/v3/companies/{company}/public-vacancies?page={n}` on the backend host as JSON. | must |
| FR-4  | Read `data[]` from the `{ data, meta }` envelope; drain pages while `meta.currentPage < meta.lastPage`, bounded by a page cap. | must |
| FR-5  | Use each role's UUID `id` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl), synthesising the canonical detail / apply URL as `app.sesametime.com/jobs/{company}/{id}` (and `…/apply`). | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally) by stopping the page drain once collected, bounded by a page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-10 | Tolerate unknown tenants, network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous portal feed     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse the public JSON feed only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SESAMEHR, name: 'Sesame HR', category: 'ats', isAts: true })
class SesameHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
Step 1 — region detection (no bearer token):
GET https://login.sesametime.com/private/login-finder/v1/company/Sesame   (header rsrc: 31)
  → { "data": { "region": "EU1" }, "meta": { … } }
  region → backend host `back-eu1.sesametime.com`

Step 2 — public vacancies feed (no bearer token):
GET https://back-eu1.sesametime.com/api/v3/companies/Sesame/public-vacancies?page=1
  → { "data": [
        { "id":"599a9c9f-dbac-409b-b890-c63e71d9dd2f",
          "name":"Outbound SDR Team Lead",
          "description":"<p>…HTML…</p>",
          "contractType":"full_time", "status":"open", "public":true,
          "openedAt":"2026-05-27 09:15:31", "createdAt":"2026-05-27 09:07:54",
          "addressCity":"Barcelona", "addressState":"", "addressCountry":"ES",
          "addressLine1":"…", "addressZip":"…",
          "modality":"remoteVacancyModality",
          "category":{ "id":"…", "name":"Comercial" },
          "scheduleType":{ "id":"…", "name":"Jornada completa" } }
      ],
      "meta": { "currentPage":1, "lastPage":2, "total":36, "perPage":20 } }

Canonical per-role detail URL:  https://app.sesametime.com/jobs/{company}/{id}
Canonical per-role apply  URL:  https://app.sesametime.com/jobs/{company}/{id}/apply
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id`                                                | `atsId`, `id`           | `id` is prefixed `sesamehr-{atsId}`; role skipped if absent |
| `name`                                              | `title`                 | required; role skipped if absent                            |
| (synthesised) `/jobs/{company}/{id}`                | `jobUrl`                | canonical public detail URL                                 |
| (synthesised) `/jobs/{company}/{id}/apply`          | `applyUrl`              | canonical public apply URL                                  |
| `description` (HTML)                                | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `openedAt` (else `createdAt`)                       | `datePosted`            | space-separated ts normalised → `YYYY-MM-DD`                |
| `addressCity`, `addressState`, `addressCountry`     | `location`              | structured city / state / country; null when none           |
| `modality` (`remoteVacancyModality`) + title/location/category regex | `isRemote`  | structured token first, then bilingual ES/EN text regex     |
| `category.name`                                     | `department`            | when present                                                |
| `scheduleType.name` (else humanised `contractType`) | `employmentType`        | e.g. `Jornada completa` / `Full Time`                       |
| de-slugified company segment                        | `companyName`           | the feed carries no brand name                              |
| —                                                   | `site`                  | constant `Site.SESAMEHR`                                    |
| —                                                   | `atsType`               | constant `'sesamehr'`                                       |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Company resolution:

- `companySlug` (e.g. `Sesame`) → used directly as the company path segment (casing preserved).
- `companySlug` containing a portal URL → company taken from the `/jobs/{company}/…` path.
- `companyUrl` on an `app.sesametime.com` host → company taken from the segment after `/jobs/`
  (`all` rejected as a route keyword).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable company, unknown tenant, or no roles            |
| logged warn (region finder)  | finder unreachable / no region — falls back to `EU1`, never throws        |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | feed body unparseable, or per-role map error — partial, never throws      |

## 8. Test Plan

- E2E (`__tests__/sesamehr.e2e-spec.ts`): known tenant (`companySlug: 'Sesame'`) returns
  shaped jobs (`site === Site.SESAMEHR`, `atsType === 'sesamehr'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown tenant
  degrades gracefully; `resultsWanted` honoured (against the multi-page `Sesame` board).
  Network-tolerant (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SH-1 — Public vs authenticated API.** Sesame exposes two API families: the documented
  authenticated public API (`api-{region}.sesametime.com`, bearer token) and the
  candidate-facing portal feed (`back-{region}.sesametime.com/api/v3/companies/{company}/public-vacancies`,
  no token). **Default (proceeding):** use the public portal feed only — it needs no
  credentials and is the exact source the tenant's own career portal consumes.
- **Q-SH-2 — Region detection.** The backend host is region-specific (`back-eu1`,
  `back-mx1`, …). **Default (proceeding):** resolve via the anonymous company finder, falling
  back to `EU1` (where the overwhelming majority of tenants live) on any failure.
- **Q-SH-3 — Stable per-role id + detail URL.** Each role carries a UUID `id`. **Default
  (proceeding):** use `id` directly as the stable ATS id; synthesise the canonical public URL
  as `app.sesametime.com/jobs/{company}/{id}` (the portal route, confirmed HTTP 200 live).
- **Q-SH-4 — Company display name.** The feed records carry no tenant brand name. **Default
  (proceeding):** derive a de-slugified, title-cased company name from the company segment.
- **Q-SH-5 — Case sensitivity.** The feed's company segment is case-sensitive (`Sesame`
  resolves; `sesame` 404s). **Default (proceeding):** preserve the caller's casing rather than
  lowercasing it (unlike sub-domain-addressed ATSes).

## 10. Decisions

- D-1: Primary surface is the public, anonymous per-tenant portal vacancies feed
  `GET https://back-{region}.sesametime.com/api/v3/companies/{company}/public-vacancies?page={n}`,
  returning `{ data, meta }`, preceded by anonymous region detection via
  `GET login.sesametime.com/private/login-finder/v1/company/{company}`. **Confidence:
  verified** — the platform, the `app.sesametime.com/jobs/{company}/…` portal addressing, the
  region finder, the feed envelope, the per-role fields, and the `/jobs/{company}/{id}` +
  `…/apply` detail routes were confirmed live 2026-06-03 against named real tenants: `Sesame`
  (Sesame HR's own board — 36 live roles across 2 pages of 20, exercising pagination) and
  `ForwardKeys` (a real tenant with 0 open public roles). Both feed and finder answered HTTP
  200 with no bearer token.
- D-2: The feed is consumed as a JSON REST endpoint (not the SPA DOM needing a headless
  browser, and not the authenticated `api-{region}.sesametime.com` API needing credentials);
  the adapter GETs JSON and reads `data[]`, narrowing it to an array defensively.
- D-3: Each role carries a UUID `id`, `name`, HTML `description`, structured address fields,
  `modality`, `category` (department), and `scheduleType` (employment type). The `id` is the
  stable per-role ATS id; the canonical detail / apply URL is synthesised from the portal
  route.
- D-4: The feed paginates (`meta.currentPage` / `meta.lastPage`, 20/page); the adapter drains
  pages via `?page={n}` (bounded by a page cap), dedupes by `atsId`, and stops once
  `resultsWanted` roles are collected.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-sesamehr/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + portal pattern `app.sesametime.com/jobs/{company}/…`, confirmed with named
    real tenants `Sesame` (Sesame HR) and `ForwardKeys`.
  - Region finder `GET login.sesametime.com/private/login-finder/v1/company/Sesame` returned
    `{ data: { region: "EU1" } }`; the public feed
    `GET https://back-eu1.sesametime.com/api/v3/companies/Sesame/public-vacancies?page=1`
    returned `{ data, meta }` with 36 roles across 2 pages (first role
    `599a9c9f-dbac-409b-b890-c63e71d9dd2f` "Outbound SDR Team Lead"), and `ForwardKeys`
    returned `{ data: [], meta: { total: 0 } }`. The portal routes
    `https://app.sesametime.com/jobs/Sesame/{id}` and `…/apply` both answered HTTP 200. No
    bearer token required. verified=true.
