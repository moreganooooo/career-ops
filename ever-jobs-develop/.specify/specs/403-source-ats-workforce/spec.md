# Spec: 403 — Workforce.com ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 403                                           |
| Slug           | source-ats-workforce                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

Workforce.com (workforce.com — a US / AU / UK workforce-management + hiring platform for
hourly, shift-based businesses in retail, F&B, hospitality, and healthcare) hosts a public,
candidate-facing hiring surface for every customer tenant on a regional host
(`app.workforce.com` for the US / default region, `eu.workforce.com` for Europe). Each open
role has a **public, anonymous apply page** at `https://{region}.workforce.com/ats/apply/job/{uuid}`
that server-renders the full role detail (title, employer brand, a postal-address location
line, the role description) plus the application form — no authentication, no API key, and no
headless browser required. A tenant's careers / open-roles board page links to those apply
pages. Ever Jobs has no adapter for Workforce.com-powered hiring, so these (hourly-workforce,
US/AU/UK-heavy) vacancy catalogues are currently un-ingestable. A single generic, multi-tenant
Workforce.com adapter unlocks the public Workforce.com hiring surface with one plugin. This is
DISTINCT from the existing `source-ats-workstream` plugin (a different platform).

## 2. Goals

- Add a generic, multi-tenant `source-ats-workforce` plugin that ingests roles from **any**
  Workforce.com tenant given a `companyUrl` (a careers / open-roles board URL, or a single
  `/ats/apply/job/{uuid}` apply URL) or a `companySlug` (a role UUID used directly, else a
  tenant slug probed against defensive Workforce-hosted board paths).
- Use the **public, anonymous** surface (no auth, no API key): the candidate-facing apply
  page `https://{region}.workforce.com/ats/apply/job/{uuid}`, whose HTML server-renders the
  full role detail (and, on richer pages, a schema.org `JobPosting` `application/ld+json`
  block). Tenant boards are enumerated by harvesting `/ats/apply/job/{uuid}` links from the
  board HTML.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'workforce'`, `employmentType`).

## 3. Non-Goals

- Any authenticated Workforce.com API or the back-office hiring console (the recruiter-facing
  applicant-tracking workspace requires credentials / a per-tenant context). This plugin
  consumes only the public candidate-facing apply surface.
- Application submission, resume upload, candidate accounts, or any write operation (the apply
  page hosts a form; we read role detail only, never submit).
- Server-side filtering by location / work type / role. We ingest the tenant's harvested role
  set and slice client-side to `resultsWanted`.
- A curated seed list of Workforce.com tenant board URLs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Workforce.com plugin at a tenant's
> careers board URL, so that I ingest that organisation's full open-roles list without writing
> a bespoke scraper.

> As a **plugin host**, I want the Workforce.com adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant's roles from a `companyUrl` (a careers / board page, or a single `/ats/apply/job/{uuid}` apply URL) or from a `companySlug` (a bare role UUID, else a tenant slug). | must |
| FR-2  | Harvest every distinct `/ats/apply/job/{uuid}` link from a board / careers page's HTML; a single apply URL degrades to a one-role board. | must |
| FR-3  | For a `companySlug` that is a tenant slug (not a UUID), probe defensive Workforce-hosted board paths (`/ats/{slug}`, `/careers/{slug}`, `/jobs/{slug}`) across the region hosts. | should |
| FR-4  | Parse each role's apply page, preferring a schema.org `JobPosting` `application/ld+json` block and degrading to scraped `<title>` / `og:` meta. | must |
| FR-5  | Use each role's UUID as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title, url, location, employmentType, remote, datePosted, description, applyUrl) building the canonical apply URL `/ats/apply/job/{uuid}`. | must |
| FR-7  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally), bounded by a detail-page fan-out cap and a board-probe cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-10 | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous apply page      |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; detail + board caps |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-rendered HTML only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.WORKFORCE, name: 'Workforce.com', category: 'ats', isAts: true })
class WorkforceService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; per-role apply page verified live 2026-06-03):

```
Board / careers page (any tenant page that links roles):
  GET {board URL}
    → HTML containing one or more per-role apply links:
        /ats/apply/job/{uuid}                 (per-role apply page)
        /ats/apply/job/general/{uuid}         (general-application variant)
      Harvest each distinct {uuid}.

Per-role apply page (verified live):
  GET https://{region}.workforce.com/ats/apply/job/{uuid}     (region ∈ { app, eu })
    → server-rendered HTML carrying the full role detail + the application form.
      Preferred mapping source: a schema.org JobPosting application/ld+json block, when
      present (title / hiringOrganization.name / jobLocation.address / datePosted /
      employmentType / jobLocationType / description). Otherwise: the document <title>,
      og:title, and og:description.
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| apply-link `{uuid}`                                 | `atsId`, `id`           | `id` is prefixed `workforce-{uuid}`; role skipped if absent  |
| ld+json `title` → `og:title` → `<title>`            | `title`                 | required; role skipped if absent                            |
| `/ats/apply/job/{uuid}`                             | `jobUrl`, `applyUrl`    | canonical public apply page (also hosts the application form)|
| ld+json `description` → `og:description`            | `description`           | format-converted (HTML / Markdown / Plain)                  |
| ld+json `datePosted`                                | `datePosted`            | parsed → `YYYY-MM-DD`                                        |
| ld+json `jobLocation.address.{addressLocality, addressRegion, addressCountry}` | `location` | structured city / state / country; null when none           |
| ld+json `jobLocationType` (`TELECOMMUTE`) + title/location/description regex | `isRemote` | structured flag first, then text regex (`remote`/`wfh`/…)   |
| ld+json `employmentType`                            | `employmentType`        | normalised (`FULL_TIME` → `Full Time`)                      |
| ld+json `hiringOrganization.name` (else de-slugified host) | `companyName`    | the apply page carries the employer brand                   |
| —                                                   | `site`                  | constant `Site.WORKFORCE`                                   |
| —                                                   | `atsType`               | constant `'workforce'`                                      |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companyUrl` that is an `/ats/apply/job/{uuid}` apply URL → a one-role board (region pinned
  from the URL host).
- `companyUrl` that is a careers / board page → harvest `/ats/apply/job/{uuid}` links.
- `companySlug` that is a bare UUID → a one-role board, region resolved by probing each region
  host for a reachable apply page.
- `companySlug` that is a tenant slug → probe defensive Workforce-hosted board paths across the
  region hosts (`app.workforce.com`, `eu.workforce.com`).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | ld+json present but unparseable, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/workforce.e2e-spec.ts`): known board (`companyUrl` of the public Workforce.com
  careers page) returns shaped jobs (`site === Site.WORKFORCE`, `atsType === 'workforce'`,
  `atsId`/`jobUrl` defined); a direct `/ats/apply/job/{uuid}` apply URL resolves to a single
  role; no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-WF-1 — Multi-tenant board enumeration.** The per-role apply page is verified live, but a
  single enumerable per-tenant board-listing JSON endpoint or a tenant-slug-addressed board on
  the Workforce host was NOT confirmed anonymously. **Default (proceeding):** harvest
  `/ats/apply/job/{uuid}` links from a caller-supplied board / careers `companyUrl` (the
  reliable, verified path), and additionally probe defensive Workforce-hosted board paths
  (`/ats/{slug}`, `/careers/{slug}`, `/jobs/{slug}`) for a slug-only caller; a clean miss
  degrades to empty. Confidence on the board-enumeration paths: documented-but-unverified.
- **Q-WF-2 — Regional host.** Roles live on `app.workforce.com` (US / default) or
  `eu.workforce.com` (Europe). **Default (proceeding):** pin the region from a supplied URL
  host; for a UUID / slug caller, probe `app` then `eu`.
- **Q-WF-3 — Role detail shape.** The apply page carries the full role detail; richer pages
  embed a schema.org `JobPosting` ld+json block. **Default (proceeding):** prefer the ld+json
  block when present (title / org / location / datePosted / employmentType / description) and
  degrade to the document `<title>` / `og:title` / `og:description` otherwise.
- **Q-WF-4 — Stable per-role id.** Each role's apply URL carries a UUID segment. **Default
  (proceeding):** use the UUID directly (it is the `/ats/apply/job/{uuid}` URL segment and the
  stable ATS id).

## 10. Decisions

- D-1: Primary surface is the public, anonymous candidate-facing apply page on a regional
  Workforce host, `https://{region}.workforce.com/ats/apply/job/{uuid}`, which server-renders
  the full role detail. **Confidence: verified** — the apply page, its anonymity, and the
  server-rendered role detail were confirmed live 2026-06-03 against Workforce.com's own
  hiring (a real, named tenant): `/ats/apply/job/f384bcf7-d2b2-467a-a4b3-37752859629e` returned
  a live "Sales Development Representative" role at Workforce.com, London, with a postal-address
  location line and a full description; a `/ats/apply/job/general/{uuid}` general-application
  variant exists.
- D-2: Tenant boards are enumerated by harvesting `/ats/apply/job/{uuid}` links from a board /
  careers page's HTML (a single apply URL degrades to a one-role board). **Confidence:
  documented-but-unverified** — a single enumerable per-tenant board-listing endpoint was not
  confirmed anonymously, so the link-harvest + slug-probe paths are built defensively from the
  verified apply-URL pattern. Overall plugin surface confidence: **verified=false** (the
  role-detail surface is real; multi-tenant board enumeration is unverified).
- D-3: Each role's apply page is parsed by preferring a schema.org `JobPosting`
  `application/ld+json` block (the richest, most stable mapping source) and degrading to the
  scraped document `<title>` / `og:title` / `og:description` — never a headless browser and
  never a credentialed API.
- D-4: The adapter collects the harvested roles, dedupes by `atsId` (UUID), and slices to
  `resultsWanted`, bounded by a per-role detail fan-out cap and a board-probe cap.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive object/array
  narrowing so minor shape drift never throws.
- D-6: This plugin is DISTINCT from `source-ats-workstream` (a separate platform); no
  competitor platform is named in the surface or the code.

## 11. References

- `packages/plugins/source-ats-workforce/` — implementation.
- Surface researched 2026-06-03 (no authentication):
  - Per-role apply page `https://{region}.workforce.com/ats/apply/job/{uuid}` confirmed live
    and anonymous against Workforce.com's own hiring (a real, named tenant): the apply page for
    UUID `f384bcf7-d2b2-467a-a4b3-37752859629e` server-rendered a live "Sales Development
    Representative" role (Workforce.com, London) with a postal-address location line and a full
    description, plus a multi-step application form. A `/ats/apply/job/general/{uuid}` variant
    exists. **Confidence: verified** for the role-detail surface.
  - A single enumerable per-tenant board-listing endpoint / tenant-slug-addressed board was NOT
    confirmed anonymously; the link-harvest + slug-probe board-enumeration paths are
    documented-but-unverified. **Overall plugin confidence: verified=false.**
