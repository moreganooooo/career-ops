# Spec: 396 — Eddy ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 396                                           |
| Slug           | source-ats-eddy                               |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

Eddy (eddy.com / eddyhr.com — a US small-business HR suite with an applicant-tracking
module) hosts a branded, public, candidate-facing careers board for every customer tenant
on the shared application host `https://app.eddy.com/careers/{organizationUuid}`. The board
is a single-page application: the open roles are **not** embedded in the landing HTML but
fetched from a **public, anonymous JSON API** keyed by the tenant's organization UUID
(`GET /api/ats/public/job-opening/organization/{organizationUuid}` for the list, and
`GET /api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid}` for the
per-role detail), so the board is directly crawlable without authentication and without a
headless browser. Ever Jobs has no adapter for Eddy-powered careers boards, so these (US
SMB-heavy) vacancy catalogues are currently un-ingestable. A single generic, multi-tenant
Eddy adapter unlocks the full catalogue of Eddy-powered careers boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-eddy` plugin that ingests roles from **any** Eddy
  careers board given a `companySlug` (the tenant **organization UUID**) or a `companyUrl`
  (a careers URL on the `app.eddy.com` host, from which the organization UUID is derived).
- Use the **public, anonymous** surface (no auth, no API key): the public JSON list endpoint
  `GET /api/ats/public/job-opening/organization/{organizationUuid}` whose array holds the
  open roles (each carrying a `jobOpeningUuid`, `title`, `departmentId`, `locationId`, and
  `postedDate`), enriched best-effort per-role via the public detail endpoint
  (`description`, `employmentType`, `workplaceType`).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'eddy'`, `employmentType`).

## 3. Non-Goals

- Any authenticated Eddy API (the HR endpoints `/hr/location/{org}/{id}` and
  `/hr/department/{org}/{id}` that resolve `locationId` / `departmentId` to names, and the
  candidate / application write endpoints, require a per-tenant authenticated context). This
  plugin consumes only the public candidate-facing endpoints.
- Server-side filtering by department / location / work type. We ingest the tenant's full
  open-roles list and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of Eddy organization UUIDs (handled by the source-adoption backlog,
  not this plugin).
- Resolving the human-readable vanity careers handle (e.g. the leading non-UUID path
  segment some careers URLs carry) to an organization UUID — the public API strictly
  requires the UUID, so the caller supplies it.

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Eddy plugin at a tenant's organization
> UUID, so that I ingest that organisation's full open-roles list without writing a bespoke
> scraper.

> As a **plugin host**, I want the Eddy adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/
> replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the organization UUID from `companySlug` (a bare UUID) or from a `companyUrl` on the `app.eddy.com` host (the first `/careers/{…}` UUID-shaped path segment). | must |
| FR-2  | Fetch the public open-roles list from `GET /api/ats/public/job-opening/organization/{organizationUuid}`. | must |
| FR-3  | Parse the JSON array of role records (`jobOpeningUuid`, `title`, `departmentId`, `locationId`, `postedDate`), narrowing defensively. | must |
| FR-4  | Use each role's `jobOpeningUuid` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, employmentType, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `/careers/{org}/{jobUuid}`. | must |
| FR-6  | Best-effort, bounded per-role detail fan-out (`GET …/{jobOpeningUuid}/organization/{org}`) to enrich the description / employmentType / workplaceType; convert the body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the role set; bound the detail fan-out by a per-scrape cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no organization UUID can be resolved. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx / 400), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous JSON API        |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; detail-fetch cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws; detail fan-out via `Promise.allSettled` |
| NFR-6  | No headless browser                           | parse the public JSON API only   |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.EDDY, name: 'Eddy', category: 'ats', isAts: true })
class EddyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://app.eddy.com/api/ats/public/job-opening/organization/{organizationUuid}
  → JSON array of open roles:
      [ { "jobOpeningUuid": "…", "title": "…", "departmentId": 14,
          "locationId": 34, "postedDate": "2025-…T…Z" }, … ]
    (an empty array is a valid "no roles" result)

GET https://app.eddy.com/api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid}
  → per-role detail enriching the list record:
      { "title": "Human Resources Associate", "employmentType": "FULL_TIME",
        "experience": "2 years plus", "description": "<div>…</div>",
        "postedDate": "…", "compensation": "…", "departmentId": …, "locationId": …,
        "workplaceType": "ON_SITE", "publishToCareers": true }

Canonical per-role detail / apply URL:  https://app.eddy.com/careers/{organizationUuid}/{jobOpeningUuid}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `jobOpeningUuid`                                    | `atsId`, `id`           | `id` is prefixed `eddy-{atsId}`; role skipped if absent     |
| `title`                                             | `title`                 | required; role skipped if absent                            |
| `/careers/{org}/{jobUuid}`                          | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` (detail, HTML)                        | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `postedDate`                                        | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `employmentType` (detail, e.g. `FULL_TIME`)         | `employmentType`        | normalised → `Full Time`                                    |
| `workplaceType === 'REMOTE'` + title/description regex | `isRemote`           | structured flag first, then text regex (`remote`/`work from home`/`wfh`…) |
| — (`locationId` is an opaque id; no anonymous resolver) | `location`          | left null on the anonymous surface (see Q-ED-3)             |
| — (UUID tenant token carries no brand)              | `companyName`           | the organization UUID is surfaced as-is (see Q-ED-2)        |
| —                                                   | `site`                  | constant `Site.EDDY`                                        |
| —                                                   | `atsType`               | constant `'eddy'`                                           |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (a bare organization UUID) → used directly.
- `companySlug` containing a careers URL / `eddy.com` → UUID taken from the URL.
- `companyUrl` on the `app.eddy.com` host → the first UUID-shaped `/careers/{…}` path
  segment is the organization UUID (a leading non-UUID vanity segment is skipped).
- A non-UUID slug with no derivable UUID → unresolvable → empty result (the public API
  strictly requires the organization UUID).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, no resolvable organization UUID, unknown tenant (HTTP 4xx/400), or no roles |
| logged warn (HTTP 4xx/400)   | unknown / disabled tenant or non-UUID id — degrades to empty, never throws |
| logged warn (detail failure) | a per-role detail fetch failed — the role still maps from its list record, never throws |
| logged warn (parse failure)  | list body unparseable / non-array, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/eddy.e2e-spec.ts`): known tenant (organization UUID) returns shaped jobs
  (`site === Site.EDDY`, `atsType === 'eddy'`, `atsId`/`jobUrl` defined); `companyUrl`
  resolution path exercised; no-slug/url returns empty; unknown tenant degrades gracefully;
  `resultsWanted` honoured. Network-tolerant (zero results is acceptable; shape assertions
  guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-ED-1 — Tenant addressing.** The public API strictly requires the organization UUID;
  human-readable vanity handles in careers URLs are not accepted by the API.
  **Default (proceeding):** the caller supplies the organization UUID (as `companySlug` or
  embedded in `companyUrl`); a non-UUID-only input degrades to an empty result rather than
  firing a request we know returns HTTP 400.
- **Q-ED-2 — Company display name.** The per-role records carry no brand name, and the
  tenant token is an opaque UUID. **Default (proceeding):** surface the organization UUID
  as `companyName` rather than inventing a brand (a brand-name backfill is a future
  enhancement; the careers-page-content endpoint carries branding assets but no plain
  company name).
- **Q-ED-3 — Structured location.** The public role records expose location only as an
  opaque `locationId`; resolving it to a city/state name requires the authenticated
  `/hr/location/{org}/{id}` endpoint. **Default (proceeding):** leave `location` null on the
  anonymous surface and rely on the remote regex over title/description for the remote flag.
- **Q-ED-4 — Description body.** The list records are lightweight (no description); the body
  lives on the per-role detail record. **Default (proceeding):** best-effort, bounded
  per-role detail fan-out (capped by `EDDY_MAX_DETAIL_FETCHES`) to enrich the description /
  employmentType / workplaceType, degrading to a null description on any detail failure.

## 10. Decisions

- D-1: Primary surface is the public, anonymous JSON API on `app.eddy.com`: the list
  endpoint `/api/ats/public/job-opening/organization/{organizationUuid}` plus the per-role
  detail endpoint `/api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid}`.
  **Confidence: verified** — the platform, the careers host, the SPA bundle's use of these
  exact endpoints, and the org-UUID requirement were confirmed live 2026-06-03: a real org
  UUID returned HTTP 200 with a JSON role array, a real per-role detail returned HTTP 200
  with the role body shape, an empty org returned `[]` (the empty-board path), and passing a
  non-UUID vanity slug returned HTTP 400 ("Failed to convert 'organizationUuid'").
- D-2: The board is a single-page app whose roles come from the JSON API (not a separate
  authenticated API, and not server-embedded HTML needing a parser or a headless browser);
  the adapter calls the API directly and narrows the array defensively.
- D-3: Each list record carries `jobOpeningUuid`, `title`, `departmentId`, `locationId`,
  and `postedDate`; the per-role detail adds the HTML `description`, `employmentType`,
  `workplaceType`, `compensation`, and `experience`. The `jobOpeningUuid` is the stable
  per-role ATS id.
- D-4: The list endpoint returns every open role in one document (no server-side
  pagination); the adapter dedupes by `atsId`, slices to `resultsWanted`, and bounds the
  per-role detail fan-out by `EDDY_MAX_DETAIL_FETCHES`, fanning out with `Promise.allSettled`
  so one failing detail never nukes the batch.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-eddy/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + careers host `app.eddy.com`; the careers SPA bundle
    (`/careers/assets/main-*.js`) builds its data calls against
    `/api/ats/public/job-opening/organization/{organizationUuid}` (list) and
    `/api/ats/public/job-opening/{jobOpeningUuid}/organization/{organizationUuid}` (detail).
  - A real organization UUID returned HTTP 200 with a JSON role array; a real per-role
    detail returned HTTP 200 with `{ title, employmentType, description, workplaceType, … }`;
    an empty org returned `[]`, exercising the empty-board path; a non-UUID vanity slug
    returned HTTP 400 ("Failed to convert 'organizationUuid'"). Confidence: **verified**.
