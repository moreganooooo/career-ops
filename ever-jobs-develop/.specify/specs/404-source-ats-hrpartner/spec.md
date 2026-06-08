# Spec: 404 — HR Partner ATS Source Plugin

| Field          | Value                                         |
| -------------- | --------------------------------------------- |
| Spec ID        | 404                                           |
| Slug           | source-ats-hrpartner                          |
| Status         | done                                          |
| Owner          | scheduled-agent                               |
| Created        | 2026-06-03                                    |
| Last updated   | 2026-06-03                                    |
| Supersedes     | (none)                                        |
| Related specs  | 385 (Gupy), 384 (Emply)                       |

## 1. Problem Statement

HR Partner (hrpartner.io — an Australia-headquartered, globally-used HR + recruitment
suite for SMBs) gives every customer tenant a branded, public, candidate-facing job board
on its own sub-domain of the shared host `https://{tenant}.hrpartner.io/jobs`. The board is
a **server-rendered HTML page** (Tailwind + Alpine.js progressive enhancement — there is no
SPA, no `__NEXT_DATA__` data island, and no public JSON API): every open role is emitted
directly in the markup as a `.job-listing` card, so the board is directly crawlable without
authentication and without a headless browser. Ever Jobs has no adapter for
HR Partner-powered boards, so these (SMB-heavy, Australia/global) vacancy catalogues are
currently un-ingestable. A single generic, multi-tenant HR Partner adapter unlocks the full
catalogue of HR Partner-powered boards with one plugin.

## 2. Goals

- Add a generic, multi-tenant `source-ats-hrpartner` plugin that ingests roles from **any**
  HR Partner board given a `companySlug` (the tenant sub-domain label, e.g.
  `employmentoptions`) or a `companyUrl` (a board URL on a `hrpartner.io` host, from which
  the tenant label is derived).
- Use the **public, anonymous** surface (no auth, no API key): the server-rendered board
  `https://{tenant}.hrpartner.io/jobs` whose HTML emits each open role as a `.job-listing`
  card carrying a `/jobs/{slug}` title link, a `job-content` summary, and `rounded-full`
  location / category pills.
- Map every role into the standard `JobPostDto` contract, including ATS-specific metadata
  (`atsId`, `atsType: 'hrpartner'`, `department`).

## 3. Non-Goals

- Any authenticated HR Partner API (the product's REST API requires per-tenant
  credentials). This plugin consumes only the public candidate-facing board.
- Per-role detail-page fan-out for the full description body (the `/jobs/{slug}` detail page
  carries a richer body + OG meta); the board card's summary is mapped instead, with the
  detail page left as a future enhancement.
- Application submission, candidate accounts, resume drop, or any write operation (the
  detail page's apply form posts to `/jobs/newapplication`).
- A curated seed list of HR Partner tenant sub-domains (handled by the source-adoption
  backlog, not this plugin).

## 4. User / Caller Stories

> As an **aggregation operator**, I want to point the HR Partner plugin at a tenant's board
> sub-domain, so that I ingest that organisation's full open-roles list without writing a
> bespoke scraper.

> As a **plugin host**, I want the HR Partner adapter to behave like every other ATS source
> plugin (same DI module, same `IScraper.scrape` contract), so that it is
> enable/disable/replace-able like any other plugin.

## 5. Functional Requirements

| ID    | Requirement                                                                                          | Priority |
| ----- | ---------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Resolve the tenant from `companySlug` (expanded to `{tenant}.hrpartner.io`) or from a `companyUrl` on a `hrpartner.io` host (leading sub-domain label is the tenant). | must |
| FR-2  | Fetch the public server-rendered board across known path variants (`/jobs`, `/`) until one emits role cards. | must |
| FR-3  | Extract each `.job-listing` card from the HTML: `/jobs/{slug}` title link (slug + title), `job-content` summary, and `rounded-full` location / category pills. | must |
| FR-4  | Use each role's URL slug as the stable `atsId`; de-duplicate roles by `atsId` within a run. | must |
| FR-5  | Map each role to `JobPostDto` (title, url, location, department, remote, description, applyUrl) building the canonical detail / apply URL `/jobs/{slug}`. | must |
| FR-6  | Convert the role summary body per `descriptionFormat` (HTML / Markdown / Plain). | should |
| FR-7  | Honour `resultsWanted` (default 100 internally) by slicing the embedded role set, bounded by a probe-page cap. | must |
| FR-8  | Return empty `JobResponseDto` when neither `companySlug` nor `companyUrl` is provided. | must |
| FR-9  | Tolerate unknown tenants (the host's catch-all empty board / HTTP 4xx), network errors, empty boards, and malformed payloads without throwing. | must |

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
@SourcePlugin({ site: Site.HRPARTNER, name: 'HR Partner', category: 'ats', isAts: true })
class HrPartnerService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

Upstream (public, anonymous; surface verified live 2026-06-03):

```
GET https://{tenant}.hrpartner.io/jobs
  → server-rendered HTML emitting each open role as a `.job-listing` card:
      <div class="… job-listing …"> … <div class="p-6">
        <a class="block mb-3" href="/jobs/{slug}"><h3 …>{title}</h3></a>
        <div class="… job-content …">{summary HTML}</div>
        <span class="… rounded-full …">{location}</span>
        <span class="… rounded-full …">{category}</span>
        <a … href="/jobs/{slug}">View Job</a>
      </div> … </div>
    The board <h1> (mirrored in <title> as "{Company} | Job Board" and og:title)
    carries the tenant display brand (e.g. "Employment Options Inc Trading As Youth Options").

Canonical per-role detail / apply URL:  https://{tenant}.hrpartner.io/jobs/{slug}
```

Wire shape → `JobPostDto` mapping:

| Source                                              | JobPostDto field        | Notes                                                       |
| --------------------------------------------------- | ----------------------- | ----------------------------------------------------------- |
| `/jobs/{slug}` (final segment)                      | `atsId`, `id`           | `id` is prefixed `hrpartner-{atsId}`; role skipped if absent |
| `<h3>` title                                        | `title`                 | required; role skipped if absent                            |
| `/jobs/{slug}`                                      | `jobUrl`, `applyUrl`    | canonical public detail URL (also hosts the apply flow)     |
| `job-content` summary (HTML)                        | `description`           | format-converted (HTML / Markdown / Plain)                  |
| first `rounded-full` pill                           | `location`              | split on commas → city / state / country; null when none    |
| remaining `rounded-full` pills                      | `department`            | category / department label                                 |
| title / location / category regex                  | `isRemote`              | text regex (`remote`/`home office`/`wfh`…); no structured flag |
| board `<h1>` → `og:title` → `<title>` lead (else de-slugified slug) | `companyName` | the per-role cards carry no brand name                      |
| —                                                   | `datePosted`            | not exposed on the board card → null                        |
| —                                                   | `site`                  | constant `Site.HRPARTNER`                                   |
| —                                                   | `atsType`               | constant `'hrpartner'`                                      |
| `description` text                                  | `emails`                | harvested via `extractEmails`                               |

Tenant resolution:

- `companySlug` (e.g. `employmentoptions`) → expanded to `https://employmentoptions.hrpartner.io`.
- `companySlug` containing a bare host / `hrpartner.io` → tenant taken from the host.
- `companyUrl` on a `hrpartner.io` host → leading sub-domain label is the tenant
  (`www` / `workplace` / `help` rejected as non-tenant labels).

### 7.2 Errors

| Code / Behaviour             | Meaning                                                                   |
| ---------------------------- | ------------------------------------------------------------------------- |
| empty `JobResponseDto`       | no slug/url, unresolvable host, unknown tenant (catch-all empty board), or no roles |
| logged warn (HTTP 4xx)       | path-not-found / disabled tenant — degrades to empty, never throws        |
| logged warn (parse drift)    | card shape drifted / per-role map error — partial, never throws           |

## 8. Test Plan

- E2E (`__tests__/hrpartner.e2e-spec.ts`): known tenant (`companySlug: 'employmentoptions'`)
  returns shaped jobs (`site === Site.HRPARTNER`, `atsType === 'hrpartner'`,
  `atsId`/`jobUrl` defined); `companyUrl` resolution path exercised; no-slug/url returns
  empty; unknown tenant degrades gracefully; `resultsWanted` honoured. Network-tolerant
  (zero results is acceptable; shape assertions guarded by `length > 0`). 30000 ms timeouts
  on network tests.
- Type-safety: `tsc --noEmit` against the package tsconfig (CI `build`).
- Registration: present in `Site` enum, `ALL_SOURCE_MODULES`, `tsconfig.base.json` paths,
  and `jest.config.js` moduleNameMapper (added centrally by the orchestrator).

## 9. Open Questions

- **Q-HP-1 — Board path / locale.** The board is server-rendered at `/jobs`; a tenant could
  front it behind a redirecting home. **Default (proceeding):** probe `/jobs` then `/`,
  taking the first page whose HTML emits `.job-listing` cards.
- **Q-HP-2 — Stable per-role id.** Each role's `/jobs/{slug}` URL carries a slug (a
  human-readable token with a short trailing hash, e.g.
  `youth-options-work-placement-student-2026-d44a8`). Some legacy boards address roles
  numerically (`/jobs/1000`). **Default (proceeding):** use the final URL path segment
  (slug or numeric id) directly as the stable ATS id and the `/jobs/{slug}` URL segment.
- **Q-HP-3 — Company display name.** The per-role cards carry no brand name. **Default
  (proceeding):** read the board `<h1>`, falling back to `og:title`, then the `<title>`
  leading segment (`{Company} | Job Board`), ignoring HR Partner's generic catch-all titles
  (`HR Partner | Company Job Portal` etc.), and finally a de-slugified, title-cased tenant
  sub-domain label.
- **Q-HP-4 — Role description body.** The board card carries a free-text summary; the full
  description body lives on the `/jobs/{slug}` detail page. **Default (proceeding):** map
  the card summary as the description and leave the detail-page fan-out as a future
  enhancement; all other fields map from the card.

## 10. Decisions

- D-1: Primary surface is the public, anonymous server-rendered board on
  `{tenant}.hrpartner.io/jobs`, whose HTML emits each open role as a `.job-listing` card.
  **Confidence: verified** — the platform, the `{tenant}.hrpartner.io/jobs` addressing, the
  server-rendered card shape, the `/jobs/{slug}` per-role URL, and the brand-name sources
  (`<h1>` / `og:title` / `<title>`) were confirmed live 2026-06-03 against a named real
  tenant `employmentoptions` (Employment Options Inc Trading As Youth Options — 2 live roles,
  slug-addressed) and the empty-board path via `hrpartner` (HR Partner's own board — 0 live
  roles). A live detail page (`/jobs/youth-options-work-placement-student-2026-d44a8`)
  returned HTTP 200.
- D-2: The board is a server-rendered HTML page (Tailwind + Alpine.js progressive
  enhancement — not a SPA needing a headless browser, and not a separate JSON API needing
  credentials, and with no `__NEXT_DATA__` data island); the adapter parses the role cards
  directly from the markup with defensive per-card field regexes.
- D-3: Each card carries a `/jobs/{slug}` title link, a `job-content` summary, and
  `rounded-full` location / category pills. The URL slug is the stable per-role ATS id; the
  board `<h1>` is the brand name.
- D-4: The board emits every open role in one document (no server-side pagination of the
  card list); the adapter collects the cards, dedupes by `atsId`, and slices to
  `resultsWanted` (bounded by a probe-page cap).
- D-5: An unknown tenant resolves to the host's catch-all empty board (HTTP 200 with a
  generic title and no role cards), so it degrades naturally to an empty result without a
  DNS / HTTP error.
- D-6: The plugin is dependency-free beyond `@ever-jobs/common` (HTTP client + HTML →
  text/markdown converters + email extraction); all parsed values use defensive string
  narrowing + tag-stripping so minor markup drift never throws.

## 11. References

- `packages/plugins/source-ats-hrpartner/` — implementation.
- Surface verified live 2026-06-03 (no authentication):
  - Platform + tenant host pattern `{tenant}.hrpartner.io/jobs`, confirmed with the named
    real tenant `employmentoptions` (Employment Options Inc Trading As Youth Options).
  - The server-rendered board emits each role as a `.job-listing` card; card extraction
    yielded **2 live roles** for `employmentoptions`, each with a `/jobs/{slug}` URL, a
    location pill, and a category pill (verified=true). `hrpartner` (HR Partner's own board)
    returned 0 roles, exercising the empty-board path; an unknown tenant returned the
    host's catch-all empty board (HTTP 200, generic title, 0 cards).
