# Spec: 085 — Source Company Plugin: New Relic

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 085                                                                                                                                                                                            |
| Slug           | source-company-newrelic                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #295)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..084                                                                                                                                                                        |

## 1. Problem Statement

Run #294's Spec 084 closed end-to-end (Marqeta shipped). Run
#295 picks up the **seventh** live hit alphabetically from the
fifth-fresh-sweep candidate pool: **New Relic** (74 roles
confirmed at run-295 start — significantly lower than the run-289
probe-counter estimate of ~370 due to the same probe-counter
inflation pattern).

New Relic, Inc. — operator of the **dominant SaaS observability
platform pioneered around the unified-telemetry-and-AI-monitoring
data model** (founded by Lew Cirne in 2008 in San Francisco; IPO'd
on NYSE as `NEWR` in December 2014; taken private by Francisco
Partners and TPG Capital in November 2023 at a $6.5B valuation;
ships the New Relic One unified observability platform across
the cybersecurity / SRE / DevOps / Performance-Monitoring segment
— alongside competitors Datadog, Dynatrace, Splunk, Grafana
Labs, and Honeycomb — with a hybrid distributed workforce
concentrated across San Francisco, Portland OR, Atlanta, Dublin,
Barcelona, and Remote across the United States, Europe, and
Asia-Pacific) — is published at the bare `newrelic` Greenhouse
slug (the lowercase concatenated two-word brand-words; case-
asymmetric AND length-asymmetric with the wire `company_name ===
'New Relic'` which carries the brand's two-word internal-
whitespace form) and was confirmed live via run #295's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/newrelic/jobs?content=true`
(74 open roles confirmed at run-295 start). New Relic publishes
its `absolute_url` on the canonical Greenhouse variant-2 shape.

## 2. Goals

- Ship a `source-company-newrelic` plugin returning live
  `JobPostDto` rows for the public New Relic careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-mavenclinic` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.NEWRELIC` enum value, `id`
  prefixed `newrelic-`) — Maven Clinic is the closest structural
  cousin because both publish on Greenhouse public API at
  variant 2, both use the **internal-whitespace-asymmetric**
  wire `company_name` (Maven Clinic `'Maven Clinic'`, New Relic
  `'New Relic'`), both emit HTML-entity-encoded content
  requiring D-08, both apply D-10 wire-title `.trim()`, and both
  omit D-11 fully-clean department pass-through. **Zero
  structural deviations** from the Maven Clinic template —
  making this the **sixth** Greenhouse-only company-direct
  plugin in run-history to ship as a clean re-spin of a prior
  cohort plugin with no per-axis deviations (after Coursera off
  Chime at run #278, Flexport off Faire at run #280, Glossier
  off Flexport at run #282, and Marqeta off Calendly at run
  #294).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

**Cohort observation of note:** New Relic's wire title pad rate
~21.6 % (16 of 74 padded) is the **highest D-10 pad rate observed
in the cohort to date** — surpassing fuboTV's prior run-281 rate
of ~91 % was an outlier; setting aside fuboTV, New Relic's
~21.6 % is the second-highest. **First cohort observation of a
BOTH-LEADING-AND-TRAILING-padded title** (`" Account Executive -
Commercial "` — pad bytes on both sides). Standard
`String.prototype.trim()` handles both leading and trailing pad
bytes in a single call, so the existing D-10 trim semantic
catches the dual-pad form without modification — the plugin
implementation is byte-identical to Maven Clinic's. This is a
new observation on the title axis (analogous to DataCamp's
first-cohort leading-pad observation on the department axis at
run #291), not a structural deviation.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-mavenclinic` already supports.
- A dedicated salary parser pass.
- Backfilling historical New Relic postings.
- New Relic product-API / observability-pipeline / agent-config
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.NEWRELIC`** in the
> source registry, so that **a single `siteType: [Site.NEWRELIC]`
> request returns New Relic's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of
> BOTH-LEADING-AND-TRAILING-padded title forms surviving the
> standard `.trim()` semantic**, so that **the existing D-10
> trim-on-emit handles dual-pad forms with no semantic change**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for New Relic**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.NEWRELIC = 'newrelic'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-newrelic` under `packages/plugins/`.                | must     |
| FR-3  | `NewRelicService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `newrelic-`, `site === Site.NEWRELIC`, and `companyName === 'New Relic'` (D-09 omitted; internal-whitespace-asymmetric wire — wire 9 bytes vs slug 8 bytes; same shape as Maven Clinic/Stitch Fix/Scale AI). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/newrelic.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 2). Fallback uses canonical Greenhouse variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 16 of 74 wire titles in the run-295 probe carry pad bytes; the standard `String.prototype.trim()` handles both leading-only, trailing-only, AND dual-leading-and-trailing pad forms in a single call. The plugin applies `.trim()` to `listing.title` before downstream filters and emit. **First cohort observation of BOTH-LEADING-AND-TRAILING-padded title forms** (`" Account Executive - Commercial "`). | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 74 wire department names in the run-295 probe carry pad bytes. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 74-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 74-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[NewRelicModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-newrelic/src/newrelic.service.ts
@SourcePlugin({ site: Site.NEWRELIC, name: 'New Relic', category: 'company' })
@Injectable()
export class NewRelicService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/newrelic/jobs?content=true`
exactly once per call.

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/newrelic.service.spec.ts`):**
  1. NestJS DI resolves `NewRelicService` through `NewRelicModule`.
  2. `Site.NEWRELIC === 'newrelic'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     including regression assertions for variant-2 URL, decode-
     then-strip pipeline cleanliness, internal-whitespace-
     asymmetric wire `companyName === 'New Relic'`, **D-10
     application lock with BOTH-side-padded title form** —
     emitted `title` for the dual-padded listing equals trimmed
     form `'Account Executive - Commercial'` AND byte-distinct
     from wire `' Account Executive - Commercial '` (with
     leading AND trailing pad bytes) AND exactly 2 bytes shorter
     (locking the both-side-pad observable, **first cohort
     observation of dual-pad on the title axis**).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form — D-10 search guard).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #295):** Wrap Greenhouse public API.
- **D-02 (run #295):** Skip Harvest API code path.
- **D-03 (run #295):** No salary parser hook beyond helpers
  defaults — New Relic posts USD / EUR / GBP / AUD / SGD ranges
  across global remote and hub roles; Spec 015 covers all.
- **D-04 (run #295):** **Wire-shape variant 2 — canonical
  Greenhouse host.** **Twentieth** plugin in the cohort to use
  variant 2.
- **D-05 (run #295):** Use Greenhouse slug `newrelic`.
- **D-06 (run #295):** Class names are `NewRelicService` /
  `NewRelicModule` (PascalCase preserving the wire's two-word
  CamelCase form `NewRelic`, distinct from the slug-derived
  convention since the slug is concatenated lowercase
  `newrelic`; this matches the precedent set by Fivetran/Lookout
  not following slug-derived but using the wire-CamelCase form).
  **Alternative considered**: `NewrelicService` (slug-derived
  PascalCase). **Decision**: use `NewRelicService` (wire-
  CamelCase) to honour the brand's preferred capitalisation —
  the brand's own usage on the careers page, marketing
  materials, and SEC filings under prior NYSE ticker `NEWR`
  consistently uses `New Relic` two-word form. The alphabetical
  sort key in `index.ts` and `ALL_SOURCE_MODULES` uses the slug-
  derived form `newrelic` (between `NetlifyModule` and
  `NvidiaModule`).
- **D-07 (run #295):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-seventh live-board hit
  (after Bitwarden #289, Calendly #290, DataCamp #291, Fivetran
  #292, Lookout #293, Marqeta #294).
- **D-08 (run #295):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  first** company-direct plugin to apply D-08.
- **D-09 (run #295):** Brand-name trim **omitted** with
  **internal-whitespace wire asymmetry**. Wire `company_name ===
  'New Relic'` byte-for-byte (9 bytes — two-word brand with
  internal ASCII space at byte index 3). Slug `newrelic` is 8
  bytes — slug/wire-asymmetric, wire LONGER than slug by 1 byte
  via the internal space. Same shape as Maven Clinic (slug
  `mavenclinic` / wire `'Maven Clinic'`), Stitch Fix (slug
  `stitchfix` / wire `'Stitch Fix'`), and Scale AI (slug
  `scaleai` / wire `'Scale AI'`). **Thirty-fourth cohort plugin
  to omit D-09**, but the **ninth slug/wire asymmetry case
  overall** — and the **fourth** internal-whitespace asymmetry
  case (after Scale AI, Maven Clinic, and Stitch Fix). The
  plugin reads `listing.company_name` directly with `'New Relic'`
  as a defensive fallback.
- **D-10 (run #295):** Wire-title `.trim()` deviation is
  **applied**. 16 of 74 wire titles in the run-295 probe carry
  pad bytes (~21.6 % pad rate — the **second-highest D-10 pad
  rate observed in the cohort to date** after fuboTV's run-281
  ~91 % outlier). Pad-form distribution: 4 leading-only, 12
  trailing-only, 1 BOTH-LEADING-AND-TRAILING (`" Account
  Executive - Commercial "`). **First cohort observation of
  dual-pad on the title axis** — opening a new sub-axis under
  D-10 analogous to DataCamp's run-291 leading-pad sub-axis
  under D-11. Standard `String.prototype.trim()` handles all
  three pad-form sub-axes (leading, trailing, dual) in a single
  call, so the plugin implementation is byte-identical to Maven
  Clinic's `(listing.title ?? '').trim()` form. **Twenty-first
  cohort plugin to apply D-10**.
- **D-11 (run #295):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 74 wire department names in the
  run-295 probe carry pad bytes (`'Commercial'`, `'Enterprise'`,
  `'Marketing'`, `'Technical Solution Sales'`, `'Finance'`,
  `'G&A, Executive'`, `'Management & Operations'`, `'Alliances
  & Channels'`, `'Legal'`, `'Corporate Marketing'`, `'Content,
  Creative & Communications'`, `'New Relic Global Enablement'`
  — clean multi-token forms with internal whitespace, ampersands,
  and commas; structurally permissive). **Thirty-first cohort
  plugin** with fully-clean department pass-through.
- **D-12 (run #295):** Seventh plugin in the fifth-fresh-sweep
  pool processing.
- **D-13 (run #295):** **Zero structural deviations** from the
  Maven Clinic (Spec 076) template — making this the **sixth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin (after Coursera off Chime, Flexport off
  Faire, Glossier off Flexport, and Marqeta off Calendly). All
  axes share with Maven Clinic: D-04 wire-shape variant 2, D-08
  entity-decode-then-tag-strip, D-09 omitted with internal-
  whitespace wire asymmetry (New Relic +1 byte / single-internal-
  space — same as Maven Clinic +1 byte / single-internal-space —
  same as Scale AI +1 byte / single-internal-space — same as
  Stitch Fix +1 byte / single-internal-space), D-10 applied (New
  Relic 16/74 padded ~21.6 %; Maven Clinic 3/24 padded ~12.5 %),
  D-11 fully-clean department pass-through.

## 11. References

- `packages/plugins/source-company-mavenclinic/src/mavenclinic.service.ts` —
  closest structural cousin (zero deviations).
- `packages/plugins/source-company-marqeta/src/marqeta.service.ts` —
  immediate predecessor in the fifth-fresh-sweep pool.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
