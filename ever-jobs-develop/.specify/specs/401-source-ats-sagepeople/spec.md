# Spec: 401 — Sage People ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 401                                           |
| Slug           | source-ats-sagepeople                         |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy)                                    |

## 1. Problem Statement

Sage People (sage.com/people, formerly Fairsail — a UK/EU-rooted enterprise cloud HCM
built on the Salesforce Force.com platform) hosts a branded, public, candidate-facing
applicant portal for every customer tenant as a **Salesforce Site** on the shared host
`https://{tenant}.my.salesforce-sites.com/{path}/`, served by the Sage People **Recruit**
managed package (`fRecruit__` namespace). The open-roles board (`fRecruit__ApplyJobList`)
is a server-rendered Visualforce page that **embeds the full open-roles set directly in
the HTML** as a table whose rows each link to a role's detail / apply page
(`fRecruit__ApplyJob?vacancyNo=VN…`), so the board is directly crawlable without
authentication and without a headless browser. Ever Jobs has no adapter for Sage People
applicant portals (and this is **distinct** from the existing `source-ats-sagehr` / Sage
HR (CakeHR) adapter — a different product on a different surface), so these (enterprise,
UK/EU-heavy) vacancy catalogues are currently un-ingestable. A single generic,
multi-tenant Sage People adapter unlocks the full catalogue of Sage People-powered
applicant portals with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-sagepeople` plugin that ingests roles from
  **any** Sage People applicant portal given a `companySlug` (the Salesforce-Site
  sub-domain label, e.g. `acteonpeopleportal`) or a `companyUrl` (a portal URL on a
  `my.salesforce-sites.com` host, from which the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered
  `fRecruit__ApplyJobList` board whose HTML embeds the full open-roles set as a table of
  `fRecruit__ApplyJob?vacancyNo=VN…` anchors; each anchor carries a `vacancyNo` (the
  stable ATS id) and the role title, with the row's cells carrying the location.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'sagepeople'`).

## 3. Non-Goals

- Any authenticated Salesforce API (the org's REST / SOAP / Bulk APIs and the Recruit
  back-office require credentials / a connected app). This plugin consumes only the public
  candidate-facing applicant portal.
- Server-side filtering by function / location / portal label (the board supports these
  facets). We ingest the tenant's full embedded role set and slice client-side to
  `resultsWanted`.
- Per-role detail-page fan-out for full description bodies. The board list page is
  lightweight (id / title / location); the full description lives on the
  `fRecruit__ApplyJob` detail page and is left null for a future detail fan-out.
- Application submission, candidate accounts (`fRecruit__ApplyRegister`), resume drop, or
  any write operation.
- The Sage HR / CakeHR product (`source-ats-sagehr`) — a separate plugin / surface.
- A curated seed list of Sage People tenant slugs (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the Sage People plugin at a tenant's
> applicant-portal sub-domain, so that I ingest that organisation's full open-roles list
> without writing a bespoke scraper.

> As a **plugin host**, I want the Sage People adapter to behave like every other ATS
> source plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.my.salesforce-sites.com`) or from a `companyUrl` on a `my.salesforce-sites.com` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered `fRecruit__ApplyJobList` board across known site-path variants (`careers`, `recruit`, root) until one yields role anchors. | must |
| FR-3  | Harvest every `fRecruit__ApplyJob?vacancyNo=VN…` anchor as a role (`vacancyNo` = stable id, anchor text = title); sweep the board's server-side pagination ("Page N of M"). | must |
| FR-4  | Use each role's `vacancyNo` as the stable `atsId`; de-duplicate roles by `atsId` within a run (and within / across board pages). | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, remote) building the canonical detail / apply URL from the harvested anchor href (resolved absolute). | must |
| FR-6  | Convert any role description body per `descriptionFormat` (HTML / Markdown / Plain) — currently null until a per-role detail fan-out is added. | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the harvested role set, bounded by a board-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (HTTP 4xx), network errors, empty boards, and malformed / unparseable HTML without throwing. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                   | Target                           |
| ------ | --------------------------------------------- | -------------------------------- |
| NFR-1  | No credentials / secrets required             | public server-rendered board     |
| NFR-2  | A fetch failure or unknown tenant must not throw | graceful empty/partial result |
| NFR-3  | All HTTP via `@ever-jobs/common` client       | UA + timeouts + proxy support    |
| NFR-4  | Bound result-set size                         | slice at `resultsWanted`; page cap |
| NFR-5  | A single bad tenant never aborts a batch      | scrape never throws              |
| NFR-6  | No headless browser                           | parse server-rendered HTML only  |
| NFR-7  | Per-request timeout capped at 15s             | bound both `timeout` + `requestTimeout` |

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SAGEPEOPLE, name: 'Sage People', category: 'ats', isAts: true })
class SagePeopleService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.my.salesforce-sites.com/{path}/fRecruit__ApplyJobList?portal=English
  → server-rendered Visualforce HTML embedding the full open-roles set as a table whose
    rows each link to the role's detail / apply page:
      <a href="/careers/fRecruit__ApplyJob?vacancyNo=VN4027&portal=English">Job Title</a>
    The row's sibling cells carry the structured location (work country / office city).
    The board is paginated server-side; a "Page N of M" marker gives the page count.

Canonical per-role detail / apply URL:
  https://{tenant}.my.salesforce-sites.com/{path}/fRecruit__ApplyJob?vacancyNo={VN}&portal={portal}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| anchor `vacancyNo` (e.g. `VN4027`)                  | `atsId`, `id`           | `id` is prefixed `sagepeople-{atsId}`; role skipped if absent |
| anchor text                                         | `title`                 | required; role skipped if absent                            |
| anchor `href` (resolved absolute)                   | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| (detail page body — future fan-out)                 | `description`           | currently null; format-converted (HTML / Markdown / Plain) when present |
| —                                                   | `datePosted`            | not exposed on the list page; null                          |
| row cells (`work country` / `office location`)      | `location`              | structured city / country; null when none                   |
| title / location regex                              | `isRemote`              | text regex (`remote`/`home office`/`home based`/`wfh`…)      |
| de-slugified tenant Salesforce-Site label           | `companyName`           | the portal does not embed a separate brand name             |
| —                                                   | `site`                  | constant `Site.SAGEPEOPLE`                                  |
| —                                                   | `atsType`               | constant `'sagepeople'`                                     |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `acteonpeopleportal`) → expanded to
  `https://acteonpeopleportal.my.salesforce-sites.com`.
- `companySlug` containing a bare host / `my.salesforce-sites.com` → tenant taken from
  the host.
- `companyUrl` on a `my.salesforce-sites.com` host → leading sub-domain label is the
  tenant (`www` / `portal` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (HTTP 4xx), or no roles     |
| logged warn (HTTP 4xx)       | unknown / disabled tenant or wrong site-path — degrades to empty, never throws |
| logged warn (parse failure)  | board present but no anchors, or per-role map error — partial, never throws |

## 8. Test Plan

- E2E (`__tests__/sagepeople.e2e-spec.ts`): known tenant
  (`companySlug: 'acteonpeopleportal'`) returns shaped jobs (`site === Site.SAGEPEOPLE`,
  `atsType === 'sagepeople'`, `atsId`/`jobUrl` defined); `companyUrl` resolution path
  exercised; no-slug/url returns empty; unknown tenant degrades gracefully; `resultsWanted`
  honoured. Network-tolerant (zero results is acceptable; shape assertions guarded by
  `length > 0`). 30000 ms timeouts on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json`
  paths, and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-SP-1 — Site-path segment.** Sage People Recruit Salesforce Sites are mounted under
  a per-tenant path; `careers` and `recruit` are the two overwhelmingly common choices.
  **Default (proceeding):** probe `careers`, then `recruit`, then the bare root, taking
  the first whose `fRecruit__ApplyJobList` board yields role anchors.
- **Q-SP-2 — Stable per-role id.** Each role anchor carries a `vacancyNo` (e.g. `VN4027`).
  **Default (proceeding):** use `vacancyNo` directly (it is the `fRecruit__ApplyJob`
  detail-URL key and the stable ATS id).
- **Q-SP-3 — Company display name.** The portal does not embed a separate brand name on
  the list page. **Default (proceeding):** de-slugify + title-case the tenant
  Salesforce-Site label (a future detail fan-out can read the operating-company cell).
- **Q-SP-4 — Role description body.** The board list page is lightweight (id / title /
  location). **Default (proceeding):** map the description as null on the list page (the
  canonical `fRecruit__ApplyJob` detail page remains the body source for a future per-role
  detail fan-out, confirmed to carry the full description); all other fields map from the
  board.
- **Q-SP-5 — Portal label.** Some tenants use a custom `portal` label (e.g. Channel 4's
  `4 Jobs`). **Default (proceeding):** request the public default (`English`) on the board
  fetch and preserve each anchor's own `portal` value through to the detail URL.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered `fRecruit__ApplyJobList`
  board on `{tenant}.my.salesforce-sites.com/{path}/`, whose HTML embeds the full
  open-roles set as a table of `fRecruit__ApplyJob?vacancyNo=VN…` anchors. **Confidence:
  verified** — the platform, the `{tenant}.my.salesforce-sites.com/{path}/` addressing,
  the `fRecruit__` Recruit board / detail pages, the `vacancyNo` URL key, and server-side
  "Page N of M" pagination were confirmed live 2026-06-03 against named real tenants:
  `acteonpeopleportal` (Acteon Group — 6 pages of live roles, path `careers`), `sagehr`
  (Sage — 4 pages of live roles, path `careers`), and `4people` (Channel 4 — 3 live roles,
  path `recruit`, portal label `4 Jobs`). A detail page (`fRecruit__ApplyJob?vacancyNo=VN4027`)
  returned HTTP 200 with the full role description in its body.
- D-2: The board is a server-rendered Visualforce page (not a SPA needing a headless
  browser, and not a separate JSON API needing credentials); the adapter harvests the
  `fRecruit__ApplyJob?vacancyNo=VN…` anchors out of the rendered HTML with a tolerant
  regex and reads the "Page N of M" total to sweep the server-side pagination.
- D-3: Each role anchor carries a `vacancyNo` (the stable per-role ATS id and detail-URL
  key) and a title (the anchor text); the de-slugified tenant Salesforce-Site label is the
  brand name (the portal embeds no separate brand on the list page).
- D-4: The board paginates server-side; the adapter sweeps a bounded number of pages
  (`SAGEPEOPLE_MAX_PAGES`), dedupes by `atsId` within and across pages, and slices to
  `resultsWanted`.
- D-5: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive
  narrowing so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-sagepeople/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.my.salesforce-sites.com/{path}/`, confirmed
    with named real tenants `acteonpeopleportal` (Acteon Group), `sagehr` (Sage),
    `4people` (Channel 4).
  - The server-rendered `fRecruit__ApplyJobList` board embeds the open-roles set as a
    table of `fRecruit__ApplyJob?vacancyNo=VN…` anchors; `acteonpeopleportal` returned 6
    pages and `sagehr` 4 pages of live roles, each anchor carrying a `vacancyNo` mapping
    to the canonical detail URL. `4people` returned a single page of 3 roles under the
    `recruit` path, exercising the alternate site-path. A detail page
    (`fRecruit__ApplyJob?vacancyNo=VN4027`) returned HTTP 200 with the full description.
    Confidence: **verified**.
- Distinct from `source-ats-sagehr` (Sage HR / CakeHR) — a different Sage product on a
  different (non-Salesforce-Sites) surface.
