# Spec: 397 — PeopleStrong ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 397                                           |
| Slug           | source-ats-peoplestrong                       |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

PeopleStrong (peoplestrong.com — a large India / APAC enterprise HCM + Talent Acquisition
suite, "Alt Recruit") hosts a branded, public, candidate-facing career portal for every
customer tenant on its own sub-domain of the shared host
`https://{tenant}.peoplestrong.com/`. The portal is a **client-rendered single-page
application** whose open-roles board is hydrated from a tenant-scoped JSON endpoint, with
each role addressable at the canonical detail URL `/job/detail/{jobId}`. Ever Jobs has no
adapter for PeopleStrong-powered career portals, so these (very large, India/APAC-heavy
enterprise) vacancy catalogues are currently un-ingestable. A single generic, multi-tenant
PeopleStrong adapter unlocks the catalogue of PeopleStrong-powered candidate portals with
one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-peoplestrong` plugin that ingests roles from
  **any** PeopleStrong candidate portal given a `companySlug` (the tenant sub-domain label,
  e.g. `exlcareers`) or a `companyUrl` (a portal URL on a `peoplestrong.com` host, from
  which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key, no headless browser): probe
  the documented candidate-portal JSON board endpoints under the tenant origin, falling
  back to an embedded HTML data island / schema.org `JobPosting` JSON-LD on a pre-rendered
  tenant; build the canonical detail / apply URL `/job/detail/{jobId}` from each role id.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'peoplestrong'`, `department`).

## 3. Non-Goals

- Any authenticated PeopleStrong API (the partner / customer REST APIs at
  `api-docs.peoplestrong.com` are request-only and require credentials / a per-tenant
  context). This plugin consumes only the public candidate-facing portal surface.
- Server-side filtering by function / location / work mode (the portal supports these
  facets). We ingest the tenant's role set and slice client-side to `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of PeopleStrong tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the PeopleStrong plugin at a tenant's
> candidate-portal sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the PeopleStrong adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.peoplestrong.com`) or from a `companyUrl` on a `peoplestrong.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Probe the documented candidate-portal JSON board endpoints under the tenant origin until one returns a roles array; defensively fall back to a pre-rendered HTML data island / JSON-LD. | must |
| FR-3  | Narrow the board envelope to a roles array across the common carrier keys (`jobs` / `openings` / `requisitions` / `results` / `records` / `data`, or a top-level array). | must |
| FR-4  | Use each role's stable id (`id` / `jobId` / `requisitionId` / `code`) as the `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, employmentType, remote, datePosted, description, applyUrl) building the canonical detail / apply URL `/job/detail/{jobId}`. | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the role set, bounded by a probe cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), auth/CSRF-guarded boards (HTTP 403/500), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public candidate-portal surface  |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; probe cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | JSON board + embedded JSON only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PEOPLESTRONG, name: 'PeopleStrong', category: 'ats', isAts: true })
class PeopleStrongService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; host + detail-URL pattern verified live 2026-06-03,
open-roles JSON payload documented-but-unverified):

```
GET https://{tenant}.peoplestrong.com/{board-endpoint}
  → tenant-scoped JSON board (the candidate-portal SPA's hydration source), narrowed to a
    roles array under one of: jobs / openings / requisitions / results / records / data
    (or a top-level array). Each role object (field names aliased across deployments):
      { "id|jobId|requisitionId|code": "...",
        "title|jobTitle|designation": "...",
        "location|jobLocation" | "city"/"state"/"country": "...",
        "department|businessUnit|function": "...",
        "employmentType|jobType": "...",
        "postedDate|createdDate|publishedDate": "...",
        "workMode|workplaceType": "Remote|Hybrid|On-site",
        "description|jobDescription": "...?" }

Defensive HTML fallback (pre-rendered tenant): embedded JSON data island and/or
schema.org <script type="application/ld+json"> JobPosting blocks on the served page.

Canonical per-role detail / apply URL:  https://{tenant}.peoplestrong.com/job/detail/{jobId}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `id` / `jobId` / `requisitionId` / `code`           | `atsId`, `id`           | `id` is prefixed `peoplestrong-{atsId}`; role skipped if absent |
| `title` / `jobTitle` / `designation`                | `title`                 | required; role skipped if absent                            |
| `/job/detail/{jobId}` (or explicit `url`)           | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `description` / `jobDescription` (when present)     | `description`           | format-converted (HTML / Markdown / Plain)                  |
| `postedDate` / `createdDate` / `publishedDate`      | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| `location` / `jobLocation` / `city`+`state`+`country` | `location`            | free-text or structured city / state / country; null when none |
| `workMode` / `workplaceType` + title/location/department regex | `isRemote`     | structured token first, then text regex (`remote`/`wfh`/…)  |
| `department` / `businessUnit` / `function`          | `department`            | when present                                                |
| `employmentType` / `jobType`                        | `employmentType`        | when present                                                |
| board envelope `companyName` (else de-slugified slug) | `companyName`         | the per-role records may carry no brand name                |
| —                                                   | `site`                  | constant `Site.PEOPLESTRONG`                                |
| —                                                   | `atsType`               | constant `'peoplestrong'`                                   |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `exlcareers`) → expanded to `https://exlcareers.peoplestrong.com`.
- `companySlug` containing a bare host / `peoplestrong.com` → tenant taken from the host.
- `companyUrl` on a `peoplestrong.com` host → leading sub-domain label is the tenant
  (`www` / `api` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), guarded board, or no roles |
| logged warn (HTTP 4xx/403/500) | unknown / disabled / auth-guarded tenant — degrades to empty, never throws |
| logged warn (parse failure)  | board present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/peoplestrong.e2e-spec.ts`): known tenant (`companySlug: 'exlcareers'`)
  returns shaped jobs (`site === Site.PEOPLESTRONG`, `atsType === 'peoplestrong'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable — the board may be CSRF-guarded anonymously; shape assertions
  guarded by `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PS-1 — Board endpoint path.** The portal is a client-rendered SPA hydrated from a
  tenant-scoped JSON endpoint whose exact path varies across deployments. **Default
  (proceeding):** probe a documented set of candidate-portal board endpoints under the
  tenant origin, then fall back to a pre-rendered HTML island / JSON-LD; take the first
  source that yields a roles array.
- **Q-PS-2 — Stable per-role id.** Roles carry an id under varying keys
  (`id` / `jobId` / `requisitionId` / `code`). **Default (proceeding):** read the first
  usable alias and use it as the `atsId` and the `/job/detail/{id}` URL segment.
- **Q-PS-3 — Company display name.** The per-role records may carry no brand name.
  **Default (proceeding):** read a brand name from the board envelope when present, falling
  back to a de-slugified, title-cased tenant sub-domain label.
- **Q-PS-4 — Role description body.** The board records may be lightweight (id / title /
  location / department) and not always embed the full description. **Default
  (proceeding):** map the description when present and degrade to a null description
  otherwise (the canonical `/job/detail/{id}` page remains the body source for a future
  per-role detail fan-out); all other fields map from the board record.
- **Q-PS-5 — Anonymous board reachability.** Probed anonymously, the JSON board answered
  auth/CSRF-guarded statuses (HTTP 403/500). **Default (proceeding):** treat a guarded /
  empty board as a valid "no roles" result (the adapter degrades to empty, never throws);
  the e2e test tolerates zero results accordingly.

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate-portal JSON board on
  `{tenant}.peoplestrong.com`, with a defensive HTML data-island / JSON-LD fallback.
  **Confidence: partial / documented-but-unverified.** The platform, the
  `{tenant}.peoplestrong.com` addressing, and the per-role URL shape `/job/detail/{jobId}`
  were CONFIRMED live 2026-06-03 against named real tenants (`exlcareers` (EXL),
  `ummeed-careers`, `nkwcareers`, `emamicareer` (Emami), `sobha-careers` (Sobha),
  `careers-oppo` (Oppo), `apg-smgcareer`, `redealerhrrecruit`, and the platform-default
  `careers`) and real detail ids (`careers/job/detail/PST_S-TD_612554`,
  `sobha-careers/job/detail/Requisition11289`). The candidate portal is a client-rendered
  SPA whose served HTML is a thin shell; its tenant-scoped JSON board EXISTS (it answered
  HTTP 403/500 anonymously) but its open-roles payload could not be confirmed anonymously
  live, so the board shape is documented-but-unverified. **verified=false.**
- D-2: The portal is a client-rendered SPA (not an SSR board, and not a credentialed API),
  so the adapter probes the candidate-portal JSON board endpoints directly and reads the
  roles array, rather than depending on a headless browser; a pre-rendered tenant is
  covered by the HTML island / JSON-LD fallback.
- D-3: Field names vary across PeopleStrong deployments, so every role field is read as a
  UNION of common candidate-portal aliases and defensively narrowed; the first usable id
  alias is the stable per-role ATS id.
- D-4: The board is expected in a single tenant-scoped JSON document; the adapter collects
  the roles, dedupes by `atsId`, and slices to `resultsWanted` (bounded by a probe cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  object/array narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-peoplestrong/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.peoplestrong.com`, CONFIRMED with named real
    tenants `exlcareers` (EXL), `ummeed-careers`, `nkwcareers`, `emamicareer` (Emami),
    `sobha-careers` (Sobha), `careers-oppo` (Oppo), `apg-smgcareer`, `redealerhrrecruit`,
    and the platform-default `careers`.
  - Per-role detail URL pattern `/job/detail/{jobId}`, CONFIRMED against real ids
    (`careers/job/detail/PST_S-TD_612554`, `sobha-careers/job/detail/Requisition11289`).
  - The candidate portal is a client-rendered SPA: served HTML is a thin "Candidate Portal"
    shell (no embedded roles / no JSON-LD); the tenant-scoped JSON board exists but answered
    auth/CSRF-guarded (HTTP 403/500) anonymously. Open-roles JSON payload shape:
    documented-but-unverified. Confidence: **verified=false**.
