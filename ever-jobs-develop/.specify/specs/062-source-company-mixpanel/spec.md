# Spec: 062 — Source Company Plugin: Mixpanel

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 062                                                                                                                                                                                    |
| Slug           | source-company-mixpanel                                                                                                                                                                |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #272)                                                                                                                                                                      |
| Created        | 2026-05-03                                                                                                                                                                             |
| Last updated   | 2026-05-03                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061 |

## 1. Problem Statement

Run #271's Spec 061 closed out by shipping the **dominant AI-native
customer-service / customer-messaging platform** vendor (Intercom) — the
**tenth plugin in the cohort** to use wire-shape variant 2 (the US-region
permalink subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`
shape) — and queued runs #272+ to walk the remaining **run-268 fresh-sweep
live-board pool** alphabetically (`mixpanel` 9 jobs, plus a HubSpot
re-probe pivot). The catalogue still has no entry for the dominant
**product-analytics platform** vendor — Mixpanel Inc. (founded by
Suhail Doshi and Tim Trefren in 2009 in San Francisco; currently a
private company after Series C rounds led by Andreessen Horowitz,
Sequoia Capital, Tribe Capital, and others; now operating from its San
Francisco headquarters plus offices in New York, Seattle, London,
Singapore, Bangalore, and a remote-first posture across the United
States, the United Kingdom, India, and Singapore; operator of
Mixpanel Analytics (the event-tracking and funnels flagship), Mixpanel
Cohorts (the segment-management surface), Mixpanel Insights (the
exploratory analysis dashboard), Mixpanel Boards (the shared dashboard
surface), Mixpanel Signal (the experiment-analysis surface), Mixpanel
Data Pipelines (the warehouse-export connectors), and Mixpanel Lexicon
(the metadata-governance product) lines that anchor the
product-analytics category alongside Amplitude, Heap, PostHog, June,
Pendo, FullStory, Hotjar, Adobe Analytics, Google Analytics 4, and the
new wave of warehouse-native analytics challengers — Snowplow,
Mitzu, Kubit, Indicative) — is published at the bare `mixpanel`
Greenhouse slug (the lowercase brand name) and was confirmed live via
run #272's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true` (9 open
roles returned). Aggregator-callers asking for "all jobs at major
product-analytics platforms" must currently either (a) deduce the
Greenhouse slug `mixpanel` and call `source-ats-greenhouse` by hand, or
(b) post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`mixpanel` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty times (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic, Intercom).

## 2. Goals

- Ship a `source-company-mixpanel` plugin returning live `JobPostDto`
  rows for the public Mixpanel careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-intercom` plugin (Greenhouse-backed, `category:
  'company'`, `Site.MIXPANEL` enum value, `id` prefixed `mixpanel-`) —
  Intercom is the closest structural cousin because both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND both apply a
  wire-title `.trim()` (D-10) on a subset of titles AND both publish
  `absolute_url` on variant 2 (`job-boards.greenhouse.io/<slug>/jobs/<id>`)
  AND both pass `company_name` through byte-for-byte (no D-09 trim) AND
  both emit flat single-token department names (`'Sales'`, `'Engineering'`,
  `'Product'`, etc.). Mixpanel introduces **zero structural deviations**
  from the Intercom template — it is a near-pure Intercom twin (the
  fifty-fourth bare-`<slug>` Greenhouse-backed company-direct plugin to
  ship since the Spec 020 cohort opened with Anthropic).
- Apply the **D-10 wire-title `.trim()`** deviation, since 1 of the
  9 wire titles in the run-272 probe (~11.1 %) carries trailing
  ASCII-space padding (`'Account Manager '`). Seventh plugin in the
  cohort to apply D-10 (after Brex `Spec 047 § 10 D-10`, Buildkite
  `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`, Attentive
  `Spec 058 § 10 D-10`, Elastic `Spec 060 § 10 D-10`, and Intercom
  `Spec 061 § 10 D-10`).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Mixpanel.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'mixpanel'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-intercom` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Mixpanel's USD / GBP / SGD / INR ranges (the
  San Francisco / New York / Seattle / London / Singapore / Bangalore
  posture spans USD + GBP + SGD + INR without modification).
- Backfilling historical Mixpanel postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MIXPANEL`** in the source
> registry, so that **a single `siteType: [Site.MIXPANEL]` request returns
> Mixpanel's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2
> (the US-region `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink
> subdomain), the entity-decode-then-tag-strip description pipeline, AND
> a wire-title `.trim()` against a small board with a low pad-rate**, so
> that **adding the next Greenhouse-only employer with a low-pad-rate
> wire-title shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Mixpanel**, so that **a Greenhouse outage on the
> Mixpanel board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MIXPANEL = 'mixpanel'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-mixpanel` under `packages/plugins/`.                | must     |
| FR-3  | `MixpanelService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `mixpanel-`, `site === Site.MIXPANEL`, and `companyName === 'Mixpanel'` (wire `company_name` is already the bare brand `'Mixpanel'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/mixpanel.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region permalink subdomain** shape `https://job-boards.greenhouse.io/mixpanel/jobs/<id>` — variant 2 (the **eleventh** plugin in the cohort to use this shape; Spec 062 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to `listing.title` before downstream filters and emit, since 1 of 9 wire titles in the run-272 probe (~11.1 %) carries trailing ASCII-space padding. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[MixpanelModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-mixpanel/src/mixpanel.service.ts
@SourcePlugin({ site: Site.MIXPANEL, name: 'Mixpanel', category: 'company' })
@Injectable()
export class MixpanelService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `mixpanel-${listing.id}`,
  site:         Site.MIXPANEL,
  title:        (listing.title ?? '').trim(),  // D-10
  companyName:  'Mixpanel',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/mixpanel/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/mixpanel.service.spec.ts`):**
  1. NestJS DI resolves `MixpanelService` through `MixpanelModule`.
  2. `Site.MIXPANEL === 'mixpanel'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive) — even after the D-10 wire-title trim observably fires.
  6. `searchTerm` filters listings by department name (case-insensitive — including the literal `'engineering'` substring matching the flat single-token department in the second listing).
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

- **D-01 (run #272):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Mixpanel's
  `https://mixpanel.com/jobs/` careers landing page is itself a
  Greenhouse iframe — the canonical machine-readable feed for this
  tenant is the `api.greenhouse.io/v1/boards/mixpanel/jobs` public
  endpoint. We already exercise the broader Greenhouse public-API
  pattern from fifty prior company-direct plugins.
- **D-02 (run #272):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'mixpanel'`.
- **D-03 (run #272):** No salary parser hook beyond the helpers
  defaults — Mixpanel posts USD / GBP / SGD / INR ranges (its San
  Francisco / New York / Seattle / London / Singapore / Bangalore
  posture) inside the Greenhouse `content` field; Spec 014 / 015's
  parser already covers the relevant currencies without modification.
- **D-04 (run #272):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink subdomain**
  template `https://job-boards.greenhouse.io/mixpanel/jobs/<id>` —
  wire-shape variant 2. This is the **eleventh** plugin in the cohort
  to use variant 2 (the same wire shape as Vercel, Affirm, Gusto,
  Mercury, Buildkite, Netlify, Postman, Webflow, Attentive, and
  Intercom — distinct from variant 1's `boards.greenhouse.io/<slug>`
  apex shape, variant 10's legacy
  `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` shape, and
  variant 11's vanity-domain
  `jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>` shape). Rationale:
  Mixpanel's tenant publishes its `absolute_url` on this shape —
  confirmed via run #272's HTTP 200 probe of the live API where the
  first job's `absolute_url` is
  `https://job-boards.greenhouse.io/mixpanel/jobs/7478741`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Mixpanel listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/mixpanel/jobs/`
  substring AND must NOT contain `?gh_jid=` (locking the variant-2
  shape against future refactors that might naively normalise to a
  variant-1, variant-10, or variant-11 template).
- **D-05 (run #272):** Use Greenhouse slug `mixpanel` (the lowercase
  brand name). Rationale: like Intercom (Spec 061 § 10 D-05), Elastic
  (Spec 060 § 10 D-05), Chime (Spec 059 § 10 D-05), Attentive (Spec 058
  § 10 D-05), Webflow (Spec 056 § 10 D-05), Toast (Spec 055 § 10 D-05),
  Postman (Spec 054 § 10 D-05), Netlify (Spec 053 § 10 D-05), Ramp
  Network (Spec 052 § 10 D-05), CircleCI (Spec 051 § 10 D-05),
  Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10 D-05), Gusto
  (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec 046
  § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044 § 10
  D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05),
  Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart
  (Spec 039 § 10 D-05), ZoomInfo (Spec 057 § 10 D-05), and unlike
  Robinhood (Spec 026 § 10 D-05), Mixpanel's Greenhouse tenant is
  published at the slug `mixpanel` with no slug-vs-display-name
  asymmetry. Confirmed via run #272's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true` (9
  open roles returned).
- **D-06 (run #272):** Class names are `MixpanelService` /
  `MixpanelModule` (PascalCase from the bare-brand single-word name).
  Rationale: matches the convention Mixpanel's own marketing / GitHub /
  press use for class-style references to the brand (`Mixpanel`), and
  aligns with the existing repo PascalCase convention for single-word
  brands (e.g. `IntercomService`, `ElasticService`, `ChimeService`,
  `AttentiveService`, `WebflowService`, `MercuryService`).
- **D-07 (run #272):** Selected from the **run-268 fresh-sweep
  live-board pool**, alphabetically-next bite after Intercom (`int` <
  `mix`). With Mixpanel shipped, the run-268 fresh-sweep live-board pool
  is **fully exhausted** — runs #273+ will pivot to a third fresh probe
  sweep targeting the next batch of large-employer candidates (e.g.
  Notion, Linear, Loom, Front, Modern Treasury, Shopify, Square,
  Adobe, Salesforce, Atlassian, Slack, Zoom Video Communications,
  ServiceNow, Workday, Veeva, Toast Tab, Faire, Whatnot, Anduril,
  Scale AI, Glean, Perplexity, Mistral, Cohere, Together AI, Pika,
  Runway, Synthesia, Eleven Labs, Photoroom, Adept). Confirmed via run
  #272's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/mixpanel/jobs?content=true`
  returning 9 open roles. The HubSpot re-probe at run-272 start
  returned HTTP 200 with `meta.total === 0` — tenth-consecutive empty
  re-probe across runs #262–#272; HubSpot remains deferred.
- **D-08 (run #272):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Intercom (Spec 061 § 10 D-08), Elastic
  (Spec 060 § 10 D-08), Chime (Spec 059 § 10 D-08), Attentive (Spec
  058 § 10 D-08), ZoomInfo (Spec 057 § 10 D-08), Webflow (Spec 056
  § 10 D-08), Toast (Spec 055 § 10 D-08), Postman (Spec 054 § 10
  D-08), Netlify (Spec 053 § 10 D-08), Ramp Network (Spec 052 § 10
  D-08), CircleCI (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10
  D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10 D-08),
  Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and
  Klaviyo (Spec 045 § 10 D-08), Mixpanel's tenant emits HTML-entity-
  encoded content (`&lt;p&gt;Mixpanel is the leading event-based
  product analytics platform...`) rather than raw HTML tags —
  confirmed via run #272's HTTP probe of the live API (9 of 9 wire
  jobs carry HTML entities; 0 of 9 carry raw tags). Applying
  `stripHtmlTags()` alone to that wire payload would leave the literal
  entities in place. Decoding entities **first** and then stripping
  tags yields clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The unit-
  test happy path asserts the cleaned description (a) does not contain
  `&lt;` (entities decoded), (b) does not contain `&quot;` (named
  entities decoded), (c) does not contain `&#39;` (numeric entities
  decoded), and (d) does not contain `<p>`, `<div>`, `<strong>`, or
  `<em>` (tags stripped after the decode pass), so a future refactor
  that swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **eighteenth** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #272):** Brand-name trim D-09 is **omitted**. Rationale:
  Mixpanel's wire `company_name` is `'Mixpanel'` byte-for-byte (the
  bare brand name; no legal-entity suffix on the wire — confirmed via
  run-272 probe where 9 of 9 wire jobs carry `company_name ===
  'Mixpanel'`). The plugin reads `listing.company_name` directly without
  a string-literal pin, but the unit-test happy path asserts the
  emitted `companyName === 'Mixpanel'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a legal-entity
  suffix; if such a rename happens, a follow-up patch can re-introduce
  D-09 as a one-line edit. Twelfth cohort plugin to omit D-09 against
  a single-word bare-brand wire `company_name` (after Intercom / Spec
  061, Webflow / Spec 056, Attentive / Spec 058, Elastic / Spec 060,
  plus the older Postman / Spec 054, Netlify / Spec 053, Mercury /
  Spec 049, Buildkite / Spec 050, CircleCI / Spec 051, Ramp Network /
  Spec 052, Toast / Spec 055).
- **D-10 (run #272):** Apply `.trim()` to `listing.title` before
  downstream filters and emit. Rationale: 1 of the 9 wire titles in
  the run-272 probe carries trailing ASCII-space padding (`'Account
  Manager '` — id `7246274` — ~11.1 % of the open roles, a moderate
  pad-rate that — given Mixpanel's tiny 9-role board — represents
  real wire shape rather than a one-off tenant-side typo). The plugin
  trims via `.trim()` to give downstream consumers the non-padded form
  for display, sort, and equality checks. This is the **seventh plugin
  in the cohort** to apply D-10 (after Brex `Spec 047 § 10 D-10`,
  Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`,
  Attentive `Spec 058 § 10 D-10`, Elastic `Spec 060 § 10 D-10`, and
  Intercom `Spec 061 § 10 D-10`). The unit-test happy path asserts
  (a) at least one fixture title carries trailing pad bytes pre-emit
  AND (b) the emitted `title === fixture.jobs[i].title.trim()` byte-
  for-byte AND (c) `searchTerm`'s case-insensitive substring filter
  still matches a padded fixture title via the trim (regression-guards
  against a future refactor that drops the `.trim()` before the
  searchTerm filter and exposes the pad bytes to the downstream string
  compare).
- **D-11 (run #272):** The Mixpanel wire `departments[0].name` payload
  uses **flat single-token department names** (`'Sales'`, `'Engineering'`,
  `'Product'`, `'Marketing'`, `'Customer Success'`, etc.) — distinct
  from Elastic's compound `' - '`-separated regional-scoped format,
  ZoomInfo's numeric-code-prefix format, Toast's colon-separated
  nested-path format, and Chime's single-token format with literal `&`
  bytes. The plugin emits the wire `departments[0].name` byte-for-byte
  (no department-name `.trim()` — the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains semantically
  correct against the wire form). The unit-test happy path includes a
  regression guard asserting the emitted `department` for the first
  fixture listing matches the wire `departments[0].name` byte-for-byte
  AND that the case-insensitive `searchTerm` match on the literal
  `'sales'` substring resolves the first-listing fixture's `'Sales'`
  department AND that the case-insensitive `searchTerm` match on the
  literal `'engineering'` substring resolves the second-listing
  fixture's `'Engineering'` department.
- **D-12 (run #272):** This plugin **closes out the run-268 fresh-sweep
  live-board pool**. The pool was opened at run #268 with a HTTP probe
  sweep across `intercom`, `mixpanel`, `hubspot`, `elastic`, `chime`,
  `attentive`, and `zoominfo` slugs. After Mixpanel ships, every live
  pool member has been adopted as a company-direct plugin (Chime / Spec
  059, Elastic / Spec 060, Intercom / Spec 061, Mixpanel / Spec 062,
  plus the earlier Attentive / Spec 058 and ZoomInfo / Spec 057);
  HubSpot remains pending an upstream board re-population (tenth-
  consecutive empty re-probe at run #272). Runs #273+ will pivot to a
  **third** fresh probe sweep targeting the next batch of large-
  employer candidates. The pivot list is documented in the run-272 log
  entry's "next steps queue" section.

## 11. References

- `packages/plugins/source-company-intercom/src/intercom.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 061 / run #271; uses variant 2 with the entity-decode pipeline
  and one wire-title `.trim()` deviation — Mixpanel is a near-pure
  Intercom twin: same variant 2, same D-08, same D-09 omission, same
  D-10 application, just a smaller board and lower pad-rate).
- `packages/plugins/source-company-attentive/src/attentive.service.ts` —
  the prior cohort plugin in the variant-2 lineage (Spec 058 / run
  #268; same shape patterns as Intercom and Mixpanel).
- `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts` —
  the simultaneous D-08 + D-10 cousin (Spec 057 § 10 D-08, D-10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
