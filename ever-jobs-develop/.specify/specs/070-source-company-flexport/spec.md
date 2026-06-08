# Spec: 070 — Source Company Plugin: Flexport

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 070                                                                                                                                                                                            |
| Slug           | source-company-flexport                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #280)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..069                                                                                                                                                                        |

## 1. Problem Statement

Run #279's Spec 069 closed end-to-end (Epic Games shipped — 8 unit
tests green; the **fifth** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #280+ to take **Flexport** next as the alphabetically-sixth live
hit from that pool (113 roles confirmed at run-275 probe time;
re-confirmed at run-280 start with 113 jobs returned by the HTTP
probe). Run #280 also re-probes the rolling `hubspot` candidate to
keep the documented "remains deferred" pattern fresh
(eighteenth-consecutive empty re-probe at run-280 start —
`meta.total === 0`).

Flexport, Inc. — operator of the **dominant
software-defined-freight-forwarding and global-trade-orchestration
platform** (founded by Ryan Petersen in 2013 in San Francisco,
California; raised $935M+ across rounds led by SoftBank, Founders
Fund, and DST Global at a peak $8B valuation; operating with
anchor offices in San Francisco (HQ), Bellevue, Chicago, New York
City, Atlanta, Amsterdam, Hamburg, Shanghai, Hong Kong, Shenzhen,
Singapore, Bengaluru, and Mexico City; offers ocean / air / truck /
rail freight-forwarding, customs-brokerage, fulfillment-warehousing,
trade-financing (Flexport Capital), and the proprietary Flexport
Platform that consolidates shipment-tracking, document-management,
and trade-compliance workflows for ~30,000 importer/exporter
customers across 200+ countries) — is published at the bare
`flexport` Greenhouse slug (the lowercase brand name; no whitespace
transform required since the brand is a single word) and was
confirmed live via run #280's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/flexport/jobs?content=true`
(113 open roles confirmed at run-280 start). Flexport publishes its
`absolute_url` on **wire-shape variant 10** — the legacy
hosted-board apex `https://boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`
shape — making this the **third** plugin in the cohort to use
variant 10 (after Chime and Faire).

Aggregator-callers asking for "all jobs at major
freight-forwarding / global-logistics / supply-chain-software
vendors" must currently either (a) deduce the Greenhouse slug
`flexport` and call `source-ats-greenhouse` by hand, or (b)
post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`flexport` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-eight times
(Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic, Intercom,
Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass, Coursera,
Epic Games — plus the seven legacy company-direct plugins from
before Spec 020).

## 2. Goals

- Ship a `source-company-flexport` plugin returning live `JobPostDto`
  rows for the public Flexport careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-faire` plugin (Greenhouse-backed, `category:
  'company'`, `Site.FLEXPORT` enum value, `id` prefixed `flexport-`)
  — Faire is the closest structural cousin because both publish from
  Greenhouse public API on **wire-shape variant 10**, both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline (D-08), both
  omit D-09 brand-name trim (single-token bare brand wire
  `company_name`), both apply D-10 wire-title `.trim()`, and both
  emit fully-clean wire `departments[0].name` byte-for-byte
  (D-11 fully-clean). Flexport carries **zero structural deviations**
  from the Faire template — making this the **second** Greenhouse-
  only company-direct plugin in run-history to ship as a clean
  re-spin of a prior cohort plugin with no per-axis deviations
  (after Coursera off Chime).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path +
  at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Flexport.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'flexport'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-faire` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Flexport's USD / EUR / GBP / SGD /
  HKD / CNY / INR / MXN ranges.
- Backfilling historical Flexport postings — only the open-roles
  slice the Greenhouse public API returns.
- Flexport Platform / Flexport Capital integration — Flexport's
  shipment-tracking and trade-financing surfaces are separate
  product surfaces from the careers board; customer-facing API
  data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FLEXPORT`** in the
> source registry, so that **a single `siteType: [Site.FLEXPORT]`
> request returns Flexport's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of
> the Greenhouse-backed company-direct pattern with the entity-
> decode-then-tag-strip description pipeline AND a single-token
> bare-brand `company_name` AND a wire-title `.trim()` application
> AND a fully-clean department pass-through AND a variant-10 legacy
> hosted-board fallback**, so that **adding the next Greenhouse-only
> employer publishing on the legacy variant-10 shape costs ≤ 1 spec
> and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Flexport**, so that **a Greenhouse outage on
> the Flexport board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.FLEXPORT = 'flexport'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-flexport` under `packages/plugins/`.                | must     |
| FR-3  | `FlexportService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `flexport-`, `site === Site.FLEXPORT`, and `companyName === 'Flexport'` (wire `company_name` is the single-token bare brand `'Flexport'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/flexport.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-10 shape `https://boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse variant-10 form (Spec 070 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 11 of 113 wire titles in the run-280 probe carry trailing ASCII-space padding (`'Area Manager '`, `'Country Manager, Mexico '`, `'Manager, Air Operations '`, …); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 113 wire department names in the run-280 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 113-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[FlexportModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-flexport/src/flexport.service.ts
@SourcePlugin({ site: Site.FLEXPORT, name: 'Flexport', category: 'company' })
@Injectable()
export class FlexportService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/flexport/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `flexport-${listing.id}`,
  site:         Site.FLEXPORT,
  title:        (listing.title ?? '').trim(),                 // D-10 applied
  companyName:  listing.company_name ?? 'Flexport',
  jobUrl:       listing.absolute_url ?? `https://boards.greenhouse.io/flexport/jobs/${listing.id}?gh_jid=${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,       // D-11 byte-for-byte (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/flexport.service.spec.ts`):**
  1. NestJS DI resolves `FlexportService` through `FlexportModule`.
  2. `Site.FLEXPORT === 'flexport'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-10
     `boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>` shape lock
     for the wire `absolute_url` pass-through, the decode-then-strip
     pipeline cleanliness, the single-token bare-brand
     `companyName === 'Flexport'` lock, the D-10 application —
     emitted `title` for the second listing equals trimmed form
     `'Country Manager, Mexico'` AND is byte-distinct from wire-
     padded form `'Country Manager, Mexico '` AND is exactly 1
     byte shorter, and the D-11 fully-clean department pass-
     through).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form).
  6. `searchTerm` filters listings by department name (case-insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E lives in
  `source-ats-greenhouse` and exercises the same wire shape.
- **Performance:** none beyond NFR-1's narrative budget — the helpers
  bench under `packages/common/__tests__/helpers.bench.spec.ts` is the
  ground truth for parser-level perf, and that path is unchanged here.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #280):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Flexport's
  `https://www.flexport.com/careers/` careers landing page redirects
  buyers to a Greenhouse-hosted board — the canonical machine-
  readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/flexport/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  fifty-eight prior company-direct plugins.
- **D-02 (run #280):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001 /
  FR-2); callers needing Harvest can use `source-ats-greenhouse`
  with `companySlug: 'flexport'`.
- **D-03 (run #280):** No salary parser hook beyond the helpers
  defaults — Flexport posts USD ranges from US offices, EUR from
  Amsterdam / Hamburg, GBP from London, SGD from Singapore, HKD
  from Hong Kong, CNY from Shanghai / Shenzhen, INR from Bengaluru,
  and MXN from Mexico City; Spec 014 / 015's parser already covers
  these locales without modification.
- **D-04 (run #280):** **Wire-shape variant 10 — legacy hosted-
  board apex `boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`.**
  Flexport's tenant publishes its `absolute_url` on the variant-10
  shape — confirmed via run #280's HTTP 200 probe of the live API
  where every wire job carries this shape (the first job's
  `absolute_url` is
  `https://boards.greenhouse.io/flexport/jobs/7564336?gh_jid=7564336`).
  The plugin emits `listing.absolute_url` byte-for-byte to preserve
  the canonical destination. The **fallback** `jobUrl` constructor
  (when Greenhouse omits `absolute_url` — a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window) defaults to the same canonical Greenhouse **variant-10**
  form `https://boards.greenhouse.io/flexport/jobs/<id>?gh_jid=<id>`.
  This is the **third** plugin in the cohort to use variant 10
  (after Chime and Faire). The unit-test happy path includes a
  regression guard asserting (a) the wire `absolute_url` flows
  through to `jobUrl` byte-for-byte AND that the emitted `jobUrl`
  contains the literal `boards.greenhouse.io/flexport/jobs/`
  substring AND the literal `?gh_jid=` query parameter AND must NOT
  contain `job-boards.greenhouse.io` (locking the variant-10 shape
  against future refactors that might naively normalise to a
  different variant).
- **D-05 (run #280):** Use Greenhouse slug `flexport` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like Coursera (Spec 068 § 10 D-05),
  ClassPass (Spec 067 § 10 D-05), Carta (Spec 066 § 10 D-05), and
  the rest of the bare-slug cohort, Flexport's Greenhouse tenant
  is published at the bare slug `flexport` with no slug/wire
  asymmetry (the wire `company_name` is the single-token
  `'Flexport'` byte-for-byte and the slug is `flexport`).
  Confirmed via run #280's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/flexport/jobs?content=true`
  (113 open roles confirmed at run-280 start).
- **D-06 (run #280):** Class names are `FlexportService` /
  `FlexportModule` (PascalCase from the lowercase slug — matches
  the brand's marketing form `Flexport` because the slug is
  already in the brand's marketing case). Rationale: matches the
  convention `FaireService` / `ChimeService` / `CourseraService`
  use for slug-derived class names.
- **D-07 (run #280):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-sixth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276,
  `classpass` at run #277, `coursera` at run #278, and `epicgames`
  at run #279). Run #275's probe sweep across 36 candidate slugs
  found exactly **fourteen** live boards on Greenhouse: `cameo` (3
  jobs, run #275 shipped), `carta` (52, run #276 shipped),
  `classpass` (70, run #277 shipped), `coursera` (8, run #278
  shipped), `epicgames` (74, run #279 shipped), `flexport` (113,
  run #280 next bite — this spec), `fubotv` (11), `glossier`
  (17), `honeycomb` (10), `lattice` (11), `masterclass` (6),
  `mavenclinic` (24), `stitchfix` (22), `udemy` (17). `flexport`
  is alphabetically sixth after `cameo`, `carta`, `classpass`,
  `coursera`, and `epicgames`, so this run takes Flexport. The
  remaining eight live hits queue for runs #281+ in alphabetical
  order (`fubotv` next at run #281 with 11 roles). HubSpot's
  eighteenth-consecutive empty re-probe at run-280 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.
- **D-08 (run #280):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Epic Games (Spec 069 § 10 D-08),
  Coursera (Spec 068 § 10 D-08), ClassPass (Spec 067 § 10 D-08),
  Carta (Spec 066 § 10 D-08), Cameo (Spec 065 § 10 D-08), and the
  rest of the post-Klaviyo cohort, Flexport's tenant emits HTML-
  entity-encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;h2&gt;&lt;strong&gt;About Flexport:&amp;nbsp;&lt;/strong&gt;
  &lt;/h2&gt;...`) rather than raw HTML tags — confirmed via run
  #280's HTTP probe of the live API (every wire job carries HTML
  entities including `&lt;`, `&gt;`, `&quot;`, and `&amp;`; none
  carry raw tags). Applying `stripHtmlTags()` alone to that wire
  payload would leave the literal entities in place. Decoding
  entities **first** and then stripping tags yields clean readable
  text. The pipeline is order-sensitive — `decodeHtmlEntities()`
  must run before `stripHtmlTags()`. The unit-test happy path
  asserts the cleaned description (a) does not contain `&lt;`
  (entities decoded), (b) does not contain `&quot;` (named
  entities decoded), (c) does not contain `&amp;`, and (d) does
  not contain `<p>`, `<div>`, `<strong>`, or `<em>` (tags
  stripped after the decode pass), so a future refactor that
  swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **twenty-sixth** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip
  pipeline.
- **D-09 (run #280):** Brand-name trim D-09 is **omitted**.
  Rationale: Flexport's wire `company_name` is `'Flexport'`
  byte-for-byte (the single-token bare brand name; no legal-entity
  suffix on the wire — confirmed via run-280 probe where every
  wire job carries `company_name === 'Flexport'`, distinct from
  the legal-entity name "Flexport, Inc." that may appear in
  corporate filings). The plugin reads `listing.company_name`
  directly without a string-literal pin, but the unit-test happy
  path asserts the emitted `companyName === 'Flexport'`
  byte-for-byte to lock the observable shape against a future
  tenant rename to add a legal-entity suffix; if such a rename
  happens, a follow-up patch can re-introduce D-09 as a one-line
  edit. **Twentieth cohort plugin to omit D-09**, returning to
  the single-word bare-brand wire form (Epic Games `'Epic Games'`,
  Coursera `'Coursera'`, ClassPass `'ClassPass'`, Carta `'Carta'`,
  Cameo `'Cameo'`, Mixpanel `'Mixpanel'`, Faire `'Faire'`,
  Intercom `'Intercom'`, Elastic `'Elastic'`, Webflow `'Webflow'`,
  Attentive `'Attentive'`, Postman `'Postman'`, Netlify
  `'Netlify'`, Mercury `'Mercury'`, Buildkite `'Buildkite'`,
  CircleCI `'CircleCI'`, Toast `'Toast'`, plus the Ramp Network
  slug-collapse case where the wire `company_name === 'Ramp'` was
  single-word despite the slug being `rampnetwork`) — distinct
  from Scale AI's first-of-its-kind multi-token bare-brand wire
  `company_name === 'Scale AI'` and Epic Games's second-of-its-
  kind multi-token bare-brand wire `'Epic Games'` (with internal
  whitespace).
- **D-10 (run #280):** Wire-title `.trim()` deviation is
  **applied**. Rationale: at least 11 of 113 wire titles in the
  run-280 probe carry trailing ASCII-space padding
  (`'Area Manager '`, `'Country Manager, Mexico '`, `'Manager,
  Air Operations '`, … — confirmed via the curl probe; ~9.7 % pad
  rate, the **highest pad rate observed in the cohort to date**).
  The plugin applies `.trim()` to the wire `title` before
  downstream filters and emit so the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter sees the trimmed
  form, and the emitted `JobPostDto.title` does not carry trailing
  pad bytes. The unit-test happy path's second listing fixture
  uses the wire-padded title `'Country Manager, Mexico '` (with
  trailing single space) and asserts (a) the emitted `title`
  equals the trimmed form `'Country Manager, Mexico'` AND is
  byte-distinct from the wire form `'Country Manager, Mexico '`
  AND (b) is exactly 1 byte shorter — locking the D-10
  application against a future refactor that drops the `.trim()`
  and reintroduces the wire pad byte. **Twelfth cohort plugin to
  apply D-10** (after Brex, Buildkite, ZoomInfo, Attentive,
  Elastic, Intercom, Mixpanel, Faire, Carta, ClassPass, and
  Epic Games).
- **D-11 (run #280):** The Flexport wire `departments[0].name`
  payload uses **fully-clean multi-token department names** like
  `'Sales'`, `'Sales, Enterprise'`, `'Air & Ocean Freight
  Management'`, `'Fulfillment'`, `'Finance'`, `'Capital'`,
  `'Partnerships'`, `'Customs'`, `'Global Brand'`, `'Duty
  Drawback'`, `'Engineering'`, `'Global Operations'`, `'Ocean
  Gateway Operations'`, `'Product Management'`, `'Air Gateway
  Operations'`, `'Operations'`, `'Ocean Freight Management'`,
  `'People'`, `'Account Management'`, `'Air Freight Management'`,
  `'Marketing'`, `'Engineering, Customs'`, `'Trade Advisory'` —
  similar to Coursera's all-trim-clean pure descriptive format
  and distinct from Cameo's partial-pad pass-through. Specifically
  0 of the 113 wire department names in the run-280 probe carry
  trailing ASCII-space padding (0 % pad-rate). The plugin emits
  the wire `departments[0].name` byte-for-byte (no department-
  name `.trim()` needed because no wire-side padding was observed;
  the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains
  semantically correct against the clean wire form). The unit-test
  happy path includes (a) a regression guard asserting the
  emitted `department` for the first fixture listing matches the
  wire `departments[0].name === 'Sales'` byte-for-byte (clean
  single-token form), and (b) a regression guard asserting the
  emitted `department` for the second fixture listing matches
  the wire `departments[0].name === 'Partnerships'` byte-for-byte
  (clean single-token form).
- **D-12 (run #280):** This plugin is the **sixth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, ClassPass at run #277, Coursera
  at run #278, and Epic Games at run #279). The remaining eight
  live hits from the run-275 probe sweep queue for runs #281+
  in alphabetical order: `fubotv` (11 roles, run #281 next bite),
  `glossier` (17), `honeycomb` (10), `lattice` (11), `masterclass`
  (6), `mavenclinic` (24), `stitchfix` (22), `udemy` (17).
  Subsequent runs after the pool is exhausted (#288+ by current
  arithmetic) will pivot to a **fifth fresh probe sweep**
  targeting yet-untested large-employer candidate slugs. HubSpot's
  eighteenth-consecutive empty re-probe at run-280 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.
- **D-13 (run #280):** **Zero structural deviations** from the Faire
  (Spec 063) template — making this the **second** Greenhouse-only
  company-direct plugin in run-history to ship as a clean re-spin
  of a prior cohort plugin with no per-axis deviations (after
  Coursera off Chime at run #278). All five axes share with Faire:
  D-04 variant 10, D-08 entity-decode-then-tag-strip, D-09
  omitted, D-10 applied, D-11 fully-clean. Distinct from Coursera
  (Spec 068; same D-08 / D-09 omitted / D-11 fully-clean but
  variant 2 instead of 10, and D-10 omitted instead of applied).

## 11. References

- `packages/plugins/source-company-faire/src/faire.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 063 / run #273; same D-04 variant 10, D-08 entity-
  decode-then-tag-strip, D-09 omitted, D-10 applied, D-11
  fully-clean as Flexport; zero structural deviations).
- `packages/plugins/source-company-chime/src/chime.service.ts` —
  prior cohort plugin with variant 10 (Spec 059 / run #269; Chime
  uses variant 10 + D-08 + D-11 as Flexport but applies D-09 and
  omits D-10 — distinct from Flexport on D-09 and D-10).
- `packages/plugins/source-company-coursera/src/coursera.service.ts`
  — immediately prior cohort plugin with zero deviations from its
  template (Spec 068 / run #278; Coursera uses variant 2 + D-08 +
  D-09 omitted + D-10 omitted + D-11 fully-clean — distinct from
  Flexport on D-04 wire-shape variant and D-10 application).
- `packages/plugins/source-company-epicgames/src/epicgames.service.ts`
  — immediately prior cohort plugin (Spec 069 / run #279; Epic
  Games uses variant 13 vanity-domain bare-brand + D-08 + D-09
  omitted + D-10 applied + D-11 fully-clean — distinct from
  Flexport on D-04 wire-shape variant; both apply D-10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
  — full Greenhouse adapter for the authenticated path (out of
  scope here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the
  `decodeHtmlEntities` + `stripHtmlTags` helpers this spec
  composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration
  contract this spec satisfies.
