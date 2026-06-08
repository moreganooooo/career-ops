# Spec: 421 — Breathe HR ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 421                                           |
| Slug           | source-ats-breathehr                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-04                                    |
| Last updated   | 2026-06-04                                    |
| Supersedes     | (none)                                        |
| Related specs  | 405 (Apploi), PeopleHR, ApplicantPro          |

## 1. Problem Statement

Breathe (breathehr.com — a UK SMB people-management / HR suite, Horsham, with a built-in
recruitment module) is a widely-adopted ATS among UK small and mid-sized businesses, charities,
sports clubs, and care providers. When a tenant publishes a vacancy, Breathe mints a **public,
unauthenticated, candidate-facing share page** on the shared, Breathe-owned host
`https://hr.breathehr.com/v/{slug}-{id}`, where `{slug}` is the de-slugified role title and the
trailing `{id}` is the tenant's stable numeric recruitment vacancy id (the ATS id). Employers
embed that share link across their own careers page and social channels; it is the canonical
public detail / apply URL for the role. Each page is a **server-rendered HTML document** — no
client-side rendering and no authentication are required to read the role's structured fields.

Breathe does not expose a public, anonymous per-tenant vacancy *index* on its own host (the
`*.breathehr.com` tenant sub-domain and the recruitment management board both 302-redirect to
`login.breathehr.com`). Tenants therefore surface their open roles by embedding the
`/v/{slug}-{id}` share links on their **own** public careers page. Ever Jobs has no adapter for
Breathe-powered vacancies, so this large UK SMB / third-sector catalogue is currently
un-ingestable. A single generic, multi-tenant Breathe adapter unlocks any Breathe-published
vacancy with one plugin, given either a direct share link or a tenant careers page that embeds
them.

**Adoption rationale.** (a) *Market share* — Breathe is a leading UK SMB HR platform with a
broadly-used recruitment add-on; its vacancies appear across UK charity, sport, and care
sectors. (b) *Public surface stability* — the `/v/{slug}-{id}` share page is the platform's own
documented, employer-shared URL and is served as plain server-rendered HTML with stable,
class-named markup, so it is robustly crawlable without a headless browser. (c) *Data quality* —
each page carries the role title, employer name, location, salary, posted (listed) date,
application deadline, and a rich HTML description body, which map cleanly onto `JobPostDto`.

## 2. Goals

- Add a generic, multi-tenant `source-ats-breathehr` plugin that ingests roles from **any**
  Breathe-published vacancy given a `companySlug` (a direct `/v/{slug}-{id}` share URL or a bare
  `{slug}-{id}` vacancy token) or a `companyUrl` (the tenant's own public careers / vacancies
  page, from which embedded Breathe share links are harvested).
- Use the **public, anonymous** surface (no auth, no API key, no headless browser): fetch the
  server-rendered `https://hr.breathehr.com/v/{slug}-{id}` HTML page(s) and parse the role's
  structured, class-named markup (`.job-title`, `.vacancy-company`, `.salary`, `.location`, the
  two `.vacancy-date` blocks, and the `.trix-content` description body).
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId` = the trailing numeric vacancy id, `atsType: 'breathehr'`, `applyUrl`).

## 3. Non-Goals

- Any authenticated Breathe area (the `/recruitment/vacancies` management board and the tenant
  `*.breathehr.com` sub-domain both redirect to `login.breathehr.com`; this plugin uses only the
  anonymous `/v/{slug}-{id}` share page).
- Synthesising a Breathe-hosted per-tenant index (Breathe hosts none publicly); the tenant's
  own careers page is the index source for the harvest path.
- Application submission, candidate accounts, resume / document upload, or any write operation.
- A curated seed list of Breathe tenant careers pages (handled by the source-adoption backlog,
  not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Breathe plugin at a tenant's careers page
> (or a direct vacancy share link), so that I ingest that organisation's open Breathe roles
> without writing a bespoke scraper.

> As a **plugin host**, I want the Breathe adapter to behave like every other ATS source plugin
> (same DI module, same `IScraper.scrape` contract), so that it is enable/disable/replace-able
> like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve a direct vacancy reference from `companySlug` (or `companyUrl`) that is a `hr.breathehr.com/v/{slug}-{id}` URL or a bare `{slug}-{id}` token. | must |
| FR-2  | Otherwise treat `companyUrl` (or a `companySlug` that is a URL) as the tenant's own careers page and fetch it as HTML. | must |
| FR-3  | Harvest every embedded `hr.breathehr.com/v/{slug}-{id}` share link from the careers-page HTML, deduped by vacancy id. | must |
| FR-4  | Fetch each per-role `/v/{slug}-{id}` page as server-rendered HTML and parse `.job-title`, `.vacancy-company`, `.salary`, `.location`, `.vacancy-date`, `.trix-content`, and `og:url`. | must |
| FR-5  | Use the trailing numeric vacancy id (parsed from the `{slug}-{id}` token) as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-6  | Map each role to `JobPostDto` (title, companyName, jobUrl/applyUrl, location, datePosted, description, isRemote, emails). | must |
| FR-7  | Convert the role description body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-8  | Honour `resultsWanted` (default 100 internally), bounded by a per-run page cap. | must |
| FR-9  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided, or when no vacancy references resolve. | must |
| FR-10 | Tolerate unknown tenants / removed roles (HTTP 4xx), network errors, careers pages with no embedded Breathe links, and malformed HTML without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                                  |
| ------ | --------------------------------------------- | --------------------------------------- |
| NFR-1  | No credentials / secrets required             | public anonymous share pages            |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result        |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support           |
| NFR-4  | Bound result-set size                         | stop at `resultsWanted`; page cap       |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws                     |
| NFR-6  | No headless browser                           | parse the server-rendered HTML only     |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BREATHEHR, name: 'Breathe HR', category: 'ats', isAts: true })
class BreatheHrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-04):

```
GET https://hr.breathehr.com/v/{slug}-{id}        (server-rendered HTML detail / apply page)

  <title>Partners in Advocacy</title>
  <meta property='og:url' content='https://hr.breathehr.com/v/finance-administration-officer-43173'>
  <p class='vacancy-company'>Vacancy at Partners in Advocacy</p>
  <div class='job-title'>Finance &amp; Administration Officer</div>
  <div class='salary'>Salary £ 25,392</div>
  <div class='location'><i class="fas fa-map-marker-alt"></i> Glasgow/ Hybrid</div>
  <div class='vacancy-dates'>
    <div class='vacancy-date'><strong>Vacancy listed</strong> 25/09/2025</div>
    <div class='vacancy-date'><strong>Application deadline</strong> 21/11/2025</div>
  </div>
  <div class='vacancy-subsection-details'><div class="trix-content"> … HTML body … </div></div>

  (An unknown / removed vacancy token returns HTTP 404.)
  (app.breathehr.com 301-redirects to hr.breathehr.com; /recruitment/vacancies 302→login.)
```

Wire shape → `JobPostDto` mapping:

| Source                                          | JobPostDto field        | Notes                                                          |
| ----------------------------------------------- | ----------------------- | -------------------------------------------------------------- |
| trailing `-{id}` of `{slug}-{id}` token         | `atsId`, `id`           | `id` is prefixed `breathehr-{atsId}`; role skipped if absent   |
| `.job-title`                                    | `title`                 | required; role skipped if absent                               |
| `og:url` (else the requested `/v/…` URL)        | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)        |
| `.trix-content` (else `.vacancy-subsection-details`) | `description`      | HTML; format-converted (HTML / Markdown / Plain)               |
| `.vacancy-date` "Vacancy listed" (`DD/MM/YYYY`) | `datePosted`            | parsed → `YYYY-MM-DD`                                           |
| `.location` free-text                           | `location`              | split on `,` / `/` → city + region; null when none             |
| title / location / description remote regex     | `isRemote`              | text regex (`remote`/`home-working`/`hybrid`/`wfh`…)           |
| `.vacancy-company` ("Vacancy at {Company}", else `<title>`) | `companyName` | "Vacancy at " prefix stripped                                  |
| —                                               | `site`                  | constant `Site.BREATHEHR`                                      |
| —                                               | `atsType`               | constant `'breathehr'`                                         |
| `description` text                              | `emails`                | harvested via `extractEmails`                                  |

Tenant / vacancy resolution:

- `companySlug` that is a `/v/{slug}-{id}` URL or a bare `{slug}-{id}` token → one vacancy,
  fetched directly.
- `companyUrl` (or a `companySlug` that is a URL) → the tenant's own careers page; every embedded
  `hr.breathehr.com/v/{slug}-{id}` link is harvested and each is fetched + parsed.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                        |
| ---------------------------- | ------------------------------------------------------------------------------ |
| empty `JobResponseDto`       | no slug/url, no resolvable vacancy reference, careers page with no Breathe links, unknown tenant (HTTP 4xx), or no roles |
| logged warn (HTTP 4xx/5xx)   | unknown / removed vacancy or careers page — degrades to empty/skip, never throws |
| logged warn (transport fail) | host unreachable (DNS / refused / reset / timeout) — aborts the drain, never throws |
| logged warn (parse failure)  | malformed HTML, or per-role map error — partial, never throws                  |

## 8. Test Plan

- E2E (`__tests__/breathehr.e2e-spec.ts`): a known public vacancy
  (`companySlug: 'advocacy-worker-43996'`) returns shaped jobs (`site === Site.BREATHEHR`,
  `atsType === 'breathehr'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised;
  no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted` honoured.
  Network-tolerant (zero results is acceptable; shape assertions guarded by `length > 0`).
  30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths, and
  `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-BH-1 — No public Breathe-hosted index.** Breathe does not expose a public, anonymous
  per-tenant vacancy index (the tenant sub-domain and the management board redirect to login).
  **Default (proceeding):** address the tenant by their OWN public careers page (`companyUrl`)
  and harvest the embedded `/v/{slug}-{id}` share links from it; a direct share link / token in
  `companySlug` resolves to a single vacancy.
- **Q-BH-2 — ATS id source.** The vacancy id is encoded as the trailing numeric segment of the
  share-URL slug (`{slug}-{id}`), not a separate field. **Default (proceeding):** parse the
  trailing `-{id}` as the stable `atsId`.
- **Q-BH-3 — HTML scrape vs feed.** The `/v/{slug}-{id}` page carries no JSON-LD JobPosting and
  no machine feed; it is server-rendered HTML with stable, class-named markup. **Default
  (proceeding):** parse the HTML by class selector (no headless browser); treat every field as
  optional and narrow defensively.
- **Q-BH-4 — Location shape.** Breathe carries a single free-text location line (e.g.
  "Glasgow/ Hybrid", "Edinburgh"), not structured city/state/country. **Default (proceeding):**
  split on `,` / `/` and treat the leading segment as the city, the remainder as the region.

## 10. Decisions

- D-1: Primary surface is the public, anonymous, server-rendered vacancy share page
  `GET https://hr.breathehr.com/v/{slug}-{id}`. **Confidence: verified** — the platform, the
  `/v/{slug}-{id}` addressing, the trailing-`{id}` ATS id, the `app.breathehr.com` →
  `hr.breathehr.com` 301 redirect, the login-gating of the management board, and the page's
  class-named markup (`.job-title`, `.vacancy-company`, `.salary`, `.location`, the two
  `.vacancy-date` blocks, `.trix-content`) were all confirmed live 2026-06-04 against real
  tenants (e.g. `finance-administration-officer-43173`, `advocacy-worker-43996` — employer
  "Partners in Advocacy"), and an unknown token returns HTTP 404.
- D-2: The page is consumed as server-rendered HTML (not a SPA needing a headless browser, and
  not an authenticated API); the adapter GETs the HTML and reads fields by class selector,
  narrowing each defensively.
- D-3: The stable per-role ATS id is the trailing numeric segment of the `{slug}-{id}` token; the
  `og:url` (or the requested `/v/…` URL) is the canonical detail / apply URL.
- D-4: Because Breathe hosts no public index, the multi-tenant index is the tenant's OWN careers
  page (`companyUrl`); the adapter harvests the embedded share links, dedupes by ATS id, and
  stops once `resultsWanted` roles are collected (bounded by a page cap). A transport-level
  failure aborts the drain; an HTTP error / malformed page degrades to empty/skip.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction) and the bundled HTML parser; all parsed values
  use defensive narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-breathehr/` — implementation.
- Surface verified live 2026-06-04 (no authentication):
  - Per-role public share page `GET https://hr.breathehr.com/v/{slug}-{id}` → 200 server-rendered
    HTML (e.g. `/v/finance-administration-officer-43173`, `/v/advocacy-worker-43996`); unknown
    token → HTTP 404.
  - Page markup confirmed: `<div class='job-title'>`, `<p class='vacancy-company'>` ("Vacancy at
    Partners in Advocacy"), `<div class='salary'>`, `<div class='location'>`, the two
    `<div class='vacancy-date'>` blocks ("Vacancy listed" 25/09/2025, "Application deadline"
    21/11/2025), and the `<div class='trix-content'>` description body.
  - End-to-end parse confirmed live: `/v/advocacy-worker-43996` → title "Advocacy Worker",
    company "Partners in Advocacy", location "Edinburgh", `atsId` "43996",
    `atsType` "breathehr", a parsed `datePosted`, and a non-empty description. verified=true.
