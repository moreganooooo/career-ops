# Spec: 392 — PeopleFluent ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 392                                           |
| Slug           | source-ats-peoplefluent                       |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 384 (Emply), 379 (Carerix)                    |

## 1. Problem Statement

PeopleFluent (peoplefluent.com, US — a global enterprise talent-management / recruiting
suite serving large, often regulated organisations) hosts each customer's branded,
public, candidate-facing career site on the shared PeopleClick Recruiting Management
System (RMS) careers host. A tenant is addressed by its RMS **client code** as a path
segment — `https://careers.peopleclick.com/careerscp/client_{tenant}/external/...` — and
its open roles are rendered server-side as anchors pointing at each role's canonical
detail page (`…/jobDetails/jobDetail.html?jobPostId={id}`). The board is directly
crawlable without authentication and without a headless browser. Ever Jobs has no adapter
for PeopleFluent-powered career sites, so these vacancies are currently un-ingestable. A
single generic, multi-tenant PeopleFluent adapter unlocks the full catalogue of
PeopleFluent-powered career boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-peoplefluent` plugin that ingests open roles
  from **any** PeopleFluent RMS career site given a `companySlug` (the RMS client code,
  e.g. `mit`) or a `companyUrl` (a career-site URL on a `peopleclick.com` /
  `peoplefluent.com` host whose `client_{tenant}` path segment encodes the tenant).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  results view under
  `careers.peopleclick.com/careerscp/client_{tenant}/external/...` whose HTML renders
  each role as a `jobDetail.html?jobPostId={id}` anchor; the numeric `jobPostId` is the
  stable per-role id and the detail URL is the canonical public detail / apply page.
- Map every role into the standard `JobPostDto` contract, including ATS-specific
  metadata (`atsId`, `atsType: 'peoplefluent'`).

## 3. Non-Goals

- Any authenticated PeopleFluent / RMS API or recruiter portal (requires credentials).
  This plugin consumes only the public candidate-facing career site.
- Server-side filtering by location / functional area / employment type (the board
  supports these facets). We ingest the tenant's open-role set and slice client-side to
  `resultsWanted`.
- Application submission, candidate accounts, resume drop, or any write operation.
- A curated seed list of PeopleFluent tenant client codes (handled by the
  source-adoption backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the PeopleFluent plugin at a tenant's
> RMS client code, so that I ingest that organisation's full open-roles list without
> writing a bespoke scraper.

> As a **plugin host**, I want the PeopleFluent adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (the RMS client code, expanded to the `client_{tenant}` path) or from a `companyUrl` whose `client_{tenant}` path segment encodes the tenant. | must |
| FR-2  | Fetch the public server-rendered results view across known locale/entry-path variants (`gateway.do?functionname=searchfromlink`, `search.do`, `search/search.html`, `gateway/searchFromLink.html`) until one returns role anchors. | must |
| FR-3  | Extract each role's `jobDetail.html?jobPostId={id}` anchor (href + inner-text title hint), with a bare-id fallback for un-anchored tokens. | must |
| FR-4  | Use each role's numeric `jobPostId` as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, remote, applyUrl) building the canonical detail URL `…/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}`. | must |
| FR-6  | Convert any HTML job-ad body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable payloads without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public server-rendered results view |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-rendered anchors only |
| NFR-7  | Cap per-request HTTP timeout at 15s           | bound BOTH `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.PEOPLEFLUENT, name: 'PeopleFluent', category: 'ats', isAts: true })
class PeopleFluentService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface researched 2026-06-03, verified=false):

```
GET https://careers.peopleclick.com/careerscp/client_{tenant}/external/{entry}
  → server-rendered HTML rendering each open role as an anchor pointing at its detail page:
      <a href="…/external/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}">Title</a>

Canonical per-role detail / apply URL:
  https://careers.peopleclick.com/careerscp/client_{tenant}/external/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `jobPostId` (from the detail-URL query)             | `atsId`, `id`           | `id` is prefixed `peoplefluent-{atsId}`; role skipped if absent |
| anchor inner text                                   | `title`                 | required; role skipped if absent                            |
| `…/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}` | `jobUrl`, `applyUrl` | canonical public detail / apply URL                  |
| adjacent results-row location text (free-text)      | `location`              | best-effort city / state / country split; null when none    |
| title / location                                    | `isRemote`              | remote detection (`remote` / `hybrid` / `wfh` …)            |
| any HTML body                                        | `description`           | format-converted (HTML / Markdown / Plain) when present     |
| tenant client code (de-slugified + title-cased)     | `companyName`           | the board carries no brand name                             |
| —                                                   | `site`                  | constant `Site.PEOPLEFLUENT`                                |
| —                                                   | `atsType`               | constant `'peoplefluent'`                                   |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `mit`) → expanded to the `client_mit` path on the RMS careers host.
- `companySlug` containing a bare host / `client_{tenant}` token → tenant taken from it.
- `companyUrl` whose path carries `client_{tenant}` → that segment is the tenant.

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable tenant, unknown tenant (HTTP 4xx), or no roles   |
| logged warn (HTTP 4xx/5xx)   | unknown / disabled tenant — degrades to empty, never throws               |
| logged warn (parse failure)  | per-role map error — partial, never throws                                |

## 8. Test Plan

- E2E (`__tests__/peoplefluent.e2e-spec.ts`): known tenant (`companySlug: 'mit'`) returns
  shaped jobs (`site === Site.PEOPLEFLUENT`, `atsType === 'peoplefluent'`, `atsId`/`jobUrl`
  defined); `companyUrl` resolution path exercised; no-slug/url returns empty; unknown
  tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant (zero results is
  acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts on network
  tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-PF-1 — Results entry point.** RMS tenants surface roles via a parameterised
  gateway / search submission rather than a single static index. **Default (proceeding):**
  probe `gateway.do?functionname=searchfromlink` then `search.do` / `search/search.html` /
  `gateway/searchFromLink.html`, across the default + `en-us` locales, taking the first
  page that renders `jobDetail.html?jobPostId=` anchors.
- **Q-PF-2 — Stable per-role id.** The canonical detail URL carries a numeric `jobPostId`.
  **Default (proceeding):** use `jobPostId` as the ATS id and the dedup key.
- **Q-PF-3 — Company display name.** The board carries no brand name on the listing rows.
  **Default (proceeding):** de-slugify + title-case the tenant client code for
  `companyName`.
- **Q-PF-4 — Custom careers domains.** Some tenants front the RMS board under their own
  vanity domain. **Default (proceeding):** address a tenant by its `client_{tenant}` path
  on the stable `careers.peopleclick.com` host; vanity-domain detection is deferred to the
  source-adoption backlog.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered results view on
  `careers.peopleclick.com/careerscp/client_{tenant}/external/...`, whose HTML renders
  each open role as a `jobDetail.html?jobPostId={id}` anchor. **Confidence: verified=false**
  — the platform, the `client_{tenant}` path addressing, the canonical detail URL shape,
  and the numeric `jobPostId` id were confirmed against real live tenants (`mit`,
  `kindermorgan`, `medcollegewi`, `santeecooper`, `amery`, `reyesholdings`) and live MIT
  detail URLs (`jobPostId=33375`, `33237`, `34045`), but a populated, parseable listing
  array could not be captured live this run (the role rows are produced by a parameterised
  gateway / form submission, and the specific indexed detail ids had rotated to 404), so
  the parser is written defensively.
- D-2: The board is a thin server-rendered shell (not a SPA needing a headless browser,
  and not a public JSON API needing a key); the adapter anchors on the stable `jobPostId`
  URL token rather than volatile CSS class names, with a bare-id fallback for un-anchored
  tokens.
- D-3: The richest stable per-role field on the listing surface is the title (anchor text)
  + `jobPostId`; location is taken from any adjacent results-row text. A description body
  is format-converted when present.
- D-4: The results view renders the tenant's roles server-side; the adapter collects the
  anchors, dedupes by `jobPostId`, and slices to `resultsWanted` (bounded by a probe-page
  cap).
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor shape drift never throws.

## 11. References

- `packages/plugins/source-ats-peoplefluent/` — implementation.
- Surface researched 2026-06-03 (no authentication; verified=false):
  - Platform + tenant path pattern
    `careers.peopleclick.com/careerscp/client_{tenant}/external/...`, confirmed with real
    live tenants `mit`, `kindermorgan`, `medcollegewi`, `santeecooper`, `amery`,
    `reyesholdings`.
  - Canonical per-role detail URL
    `…/external/jobDetails/jobDetail.html?jobPostId={id}&localeCode={locale}`, with the
    numeric `jobPostId` as the stable per-role id (live MIT detail URLs observed:
    `jobPostId=33375`, `33237`, `34045`). A populated listing array was not captured live
    this run, so the parser is defensive (verified=false).
