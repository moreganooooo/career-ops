# Spec: 072 — Source Company Plugin: Glossier

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 072                                                                                                                                                                                            |
| Slug           | source-company-glossier                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #282)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..071                                                                                                                                                                        |

## 1. Problem Statement

Run #281's Spec 071 closed end-to-end (fuboTV shipped — 8 unit
tests green; the **seventh** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool) and explicitly queued runs #282+
to take **Glossier** next as the alphabetically-eighth live hit from
that pool (17 roles confirmed at run-275 probe time; re-confirmed at
run-282 start with 17 jobs returned by the HTTP probe). Run #282
also re-probes the rolling `hubspot` candidate to keep the
documented "remains deferred" pattern fresh
(twentieth-consecutive empty re-probe at run-282 start —
`meta.total === 0`).

Glossier, Inc. — operator of the **dominant
direct-to-consumer beauty brand pioneered out of the Into the
Gloss editorial blog** (founded by Emily Weiss in 2014 in
New York City; raised $266M+ across rounds led by Forerunner
Ventures, IVP, Sequoia Capital, and Tiger Global at a peak
$1.8B valuation in 2019; operates an omnichannel retail
footprint across freestanding flagship stores in New York
City (Soho), Brooklyn, Boston, Chicago, Atlanta, Los Angeles,
Las Vegas, Philadelphia, Washington DC, plus wholesale
distribution into Sephora since 2023, alongside the
Glossier.com direct site that launched the brand) — is
published at the bare `glossier` Greenhouse slug (the
lowercase brand name; no whitespace transform required since
the brand is a single word) and was confirmed live via run
#282's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/glossier/jobs?content=true`
(17 open roles confirmed at run-282 start). Glossier publishes
its `absolute_url` on **wire-shape variant 10** — the legacy
hosted-board apex
`https://boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`
shape — making this the **fourth** plugin in the cohort to use
variant 10 (after Chime, Faire, and Flexport).

Aggregator-callers asking for "all jobs at major direct-to-
consumer beauty / cosmetics / personal-care brands" must
currently either (a) deduce the Greenhouse slug `glossier` and
call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `glossier` Greenhouse slug behind its own `Site` enum
value, in the identical shape the codebase already uses sixty
times (Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp
Network, Netlify, Postman, Toast, Webflow, ZoomInfo, Attentive,
Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI, Cameo,
Carta, ClassPass, Coursera, Epic Games, Flexport, fuboTV — plus
the seven legacy company-direct plugins from before Spec 020).

## 2. Goals

- Ship a `source-company-glossier` plugin returning live `JobPostDto`
  rows for the public Glossier careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-flexport` plugin (Greenhouse-backed, `category:
  'company'`, `Site.GLOSSIER` enum value, `id` prefixed `glossier-`)
  — Flexport is the closest structural cousin because both publish
  from Greenhouse public API on **wire-shape variant 10**, both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline (D-08), both
  omit D-09 brand-name trim (single-token bare brand wire
  `company_name`), both apply D-10 wire-title `.trim()`, and both
  emit fully-clean wire `departments[0].name` byte-for-byte
  (D-11 fully-clean). Glossier carries **zero structural deviations**
  from the Flexport template — making this the **third** Greenhouse-
  only company-direct plugin in run-history to ship as a clean
  re-spin of a prior cohort plugin with no per-axis deviations
  (after Coursera off Chime at run #278 and Flexport off Faire at
  run #280).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path +
  at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Glossier.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'glossier'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-flexport` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Glossier's USD-only US-retail-
  and-NYC-HQ ranges.
- Backfilling historical Glossier postings — only the open-roles
  slice the Greenhouse public API returns.
- Glossier.com / wholesale Sephora integration — Glossier's
  consumer e-commerce surface and wholesale partner surface are
  separate product surfaces from the careers board; product API
  data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.GLOSSIER`** in the
> source registry, so that **a single `siteType: [Site.GLOSSIER]`
> request returns Glossier's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of
> the Greenhouse-backed company-direct pattern with the entity-
> decode-then-tag-strip description pipeline AND a single-token
> bare-brand `company_name` AND a wire-title `.trim()` application
> (with both leading-and-trailing pad-byte handling) AND a fully-
> clean department pass-through AND a variant-10 legacy hosted-
> board fallback**, so that **adding the next Greenhouse-only
> employer publishing on the legacy variant-10 shape costs ≤ 1 spec
> and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Glossier**, so that **a Greenhouse outage on
> the Glossier board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.GLOSSIER = 'glossier'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-glossier` under `packages/plugins/`.                | must     |
| FR-3  | `GlossierService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `glossier-`, `site === Site.GLOSSIER`, and `companyName === 'Glossier'` (wire `company_name` is the single-token bare brand `'Glossier'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/glossier.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;h3&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;h3&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-10 shape `https://boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse variant-10 form (Spec 072 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 2 of 17 wire titles in the run-282 probe carry whitespace padding (the leading-space form `' (Sales Associate, Part-Time) Editor, Los Angeles'` AND the double-trailing-space form `'(Seasonal Sales Associate, Part-Time) Editor, Boston  '`); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. The trim must handle BOTH leading-and-trailing pad bytes (regular `.trim()` does — first cohort plugin to exercise the leading-pad-byte path on the wire-side). | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 17 wire department names in the run-282 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 17-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 17-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[GlossierModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-glossier/src/glossier.service.ts
@SourcePlugin({ site: Site.GLOSSIER, name: 'Glossier', category: 'company' })
@Injectable()
export class GlossierService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/glossier/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `glossier-${listing.id}`,
  site:         Site.GLOSSIER,
  title:        (listing.title ?? '').trim(),                 // D-10 applied (handles BOTH leading and trailing pad)
  companyName:  listing.company_name ?? 'Glossier',
  jobUrl:       listing.absolute_url ?? `https://boards.greenhouse.io/glossier/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/glossier.service.spec.ts`):**
  1. NestJS DI resolves `GlossierService` through `GlossierModule`.
  2. `Site.GLOSSIER === 'glossier'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-10
     `boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>` shape lock
     for the wire `absolute_url` pass-through, the decode-then-strip
     pipeline cleanliness, the single-token bare-brand
     `companyName === 'Glossier'` lock, the D-10 application —
     emitted `title` for the second listing equals trimmed form
     `'(Seasonal Sales Associate, Part-Time) Editor, Boston'` AND
     is byte-distinct from wire-padded form `'(Seasonal Sales
     Associate, Part-Time) Editor, Boston  '` AND is exactly 2
     bytes shorter (locking the **trailing-double-space pad**
     form first observed in this cohort), and the D-11 fully-
     clean department pass-through for both `'Retail (Stores)'`
     and `'Creative'`).
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

- **D-01 (run #282):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Glossier's
  `https://www.glossier.com/careers` careers landing page redirects
  buyers to a Greenhouse-hosted board — the canonical machine-
  readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/glossier/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  sixty prior company-direct plugins.
- **D-02 (run #282):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001 /
  FR-2); callers needing Harvest can use `source-ats-greenhouse`
  with `companySlug: 'glossier'`.
- **D-03 (run #282):** No salary parser hook beyond the helpers
  defaults — Glossier posts USD ranges from US offices (NYC HQ,
  retail flagships in Boston, Brooklyn, Chicago, Atlanta, LA,
  Las Vegas, Philadelphia, DC); Spec 014 / 015's parser already
  covers USD without modification.
- **D-04 (run #282):** **Wire-shape variant 10 — legacy hosted-
  board apex `boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`.**
  Glossier's tenant publishes its `absolute_url` on the variant-10
  shape — confirmed via run #282's HTTP 200 probe of the live API
  where every wire job carries this shape (the first job's
  `absolute_url` is
  `https://boards.greenhouse.io/glossier/jobs/7821754?gh_jid=7821754`).
  The plugin emits `listing.absolute_url` byte-for-byte to preserve
  the canonical destination. The **fallback** `jobUrl` constructor
  (when Greenhouse omits `absolute_url` — a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window) defaults to the same canonical Greenhouse **variant-10**
  form `https://boards.greenhouse.io/glossier/jobs/<id>?gh_jid=<id>`.
  This is the **fourth** plugin in the cohort to use variant 10
  (after Chime, Faire, and Flexport). The unit-test happy path
  includes a regression guard asserting (a) the wire `absolute_url`
  flows through to `jobUrl` byte-for-byte AND that the emitted
  `jobUrl` contains the literal `boards.greenhouse.io/glossier/jobs/`
  substring AND the literal `?gh_jid=` query parameter AND must NOT
  contain `job-boards.greenhouse.io` (locking the variant-10 shape
  against future refactors that might naively normalise to a
  different variant).
- **D-05 (run #282):** Use Greenhouse slug `glossier` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like Flexport (Spec 070 § 10 D-05),
  Coursera (Spec 068 § 10 D-05), ClassPass (Spec 067 § 10 D-05),
  Carta (Spec 066 § 10 D-05), and the rest of the bare-slug cohort,
  Glossier's Greenhouse tenant is published at the bare slug
  `glossier` with no slug/wire asymmetry (the wire `company_name`
  is the single-token `'Glossier'` byte-for-byte and the slug is
  `glossier`). Confirmed via run #282's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/glossier/jobs?content=true`
  (17 open roles confirmed at run-282 start).
- **D-06 (run #282):** Class names are `GlossierService` /
  `GlossierModule` (PascalCase from the lowercase slug — matches
  the brand's marketing form `Glossier` because the slug is
  already in the brand's marketing case). Rationale: matches the
  convention `FlexportService` / `FaireService` / `ChimeService` /
  `CourseraService` use for slug-derived class names.
- **D-07 (run #282):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-eighth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276,
  `classpass` at run #277, `coursera` at run #278, `epicgames` at
  run #279, `flexport` at run #280, and `fubotv` at run #281).
  Run #275's probe sweep across 36 candidate slugs found exactly
  **fourteen** live boards on Greenhouse: `cameo` (3 jobs, run
  #275 shipped), `carta` (52, run #276 shipped), `classpass` (70,
  run #277 shipped), `coursera` (8, run #278 shipped), `epicgames`
  (74, run #279 shipped), `flexport` (113, run #280 shipped),
  `fubotv` (11, run #281 shipped), `glossier` (17, run #282 next
  bite — this spec), `honeycomb` (10), `lattice` (11),
  `masterclass` (6), `mavenclinic` (24), `stitchfix` (22), `udemy`
  (17). `glossier` is alphabetically eighth after `cameo`,
  `carta`, `classpass`, `coursera`, `epicgames`, `flexport`, and
  `fubotv`, so this run takes Glossier. The remaining six live
  hits queue for runs #283+ in alphabetical order (`honeycomb`
  next at run #283 with 10 roles). HubSpot's twentieth-consecutive
  empty re-probe at run-282 start (`meta.total === 0`) further
  confirms the documented "remains deferred" pattern.
- **D-08 (run #282):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like fuboTV (Spec 071 § 10 D-08),
  Flexport (Spec 070 § 10 D-08), Epic Games (Spec 069 § 10 D-08),
  Coursera (Spec 068 § 10 D-08), and the rest of the post-Klaviyo
  cohort, Glossier's tenant emits HTML-entity-encoded content
  (`&lt;h3&gt;&lt;strong&gt;Overview&lt;/strong&gt;&lt;/h3&gt;
  &lt;div&gt;...&amp;nbsp;...`) rather than raw HTML tags —
  confirmed via run #282's HTTP probe of the live API (every wire
  job carries HTML entities including `&lt;`, `&gt;`, `&quot;`, and
  `&amp;`; none carry raw tags). Applying `stripHtmlTags()` alone
  to that wire payload would leave the literal entities in place.
  Decoding entities **first** and then stripping tags yields clean
  readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does
  not contain `&lt;` (entities decoded), (b) does not contain
  `&quot;` (named entities decoded), (c) does not contain `&amp;`,
  and (d) does not contain `<p>`, `<div>`, `<strong>`, or `<em>`
  (tags stripped after the decode pass), so a future refactor that
  swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **twenty-eighth** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip
  pipeline.
- **D-09 (run #282):** Brand-name trim D-09 is **omitted**.
  Rationale: Glossier's wire `company_name` is `'Glossier'`
  byte-for-byte (the single-token bare brand name; no legal-entity
  suffix on the wire — confirmed via run-282 probe where every
  wire job carries `company_name === 'Glossier'`, distinct from
  the legal-entity name "Glossier, Inc." that may appear in
  corporate filings). The plugin reads `listing.company_name`
  directly without a string-literal pin, but the unit-test happy
  path asserts the emitted `companyName === 'Glossier'`
  byte-for-byte to lock the observable shape against a future
  tenant rename to add a legal-entity suffix; if such a rename
  happens, a follow-up patch can re-introduce D-09 as a one-line
  edit. **Twenty-second cohort plugin to omit D-09**, returning
  to the single-word bare-brand wire form (Flexport `'Flexport'`,
  Epic Games `'Epic Games'`, Coursera `'Coursera'`, ClassPass
  `'ClassPass'`, Carta `'Carta'`, Cameo `'Cameo'`, Mixpanel
  `'Mixpanel'`, Faire `'Faire'`, Intercom `'Intercom'`, Elastic
  `'Elastic'`, Webflow `'Webflow'`, Attentive `'Attentive'`,
  Postman `'Postman'`, Netlify `'Netlify'`, Mercury `'Mercury'`,
  Buildkite `'Buildkite'`, CircleCI `'CircleCI'`, Toast `'Toast'`,
  plus the Ramp Network slug-collapse case where the wire
  `company_name === 'Ramp'` was single-word despite the slug
  being `rampnetwork`) — distinct from Scale AI's first-of-its-
  kind multi-token bare-brand wire `company_name === 'Scale AI'`
  and Epic Games's second-of-its-kind multi-token bare-brand wire
  `'Epic Games'` (with internal whitespace).
- **D-10 (run #282):** Wire-title `.trim()` deviation is
  **applied** with a notable wrinkle. Rationale: at least 2 of 17
  wire titles in the run-282 probe carry whitespace padding —
  one with a **leading** ASCII-space (`' (Sales Associate, Part-
  Time) Editor, Los Angeles'`) and one with a **double trailing
  ASCII-space** (`'(Seasonal Sales Associate, Part-Time) Editor,
  Boston  '`) — confirmed via the curl probe; ~11.8 % pad rate
  overall. **Glossier is the first cohort plugin where the
  observed pad-byte distribution includes a leading-pad case AND
  a multi-byte (double-space) trailing-pad case** — distinct from
  the trailing-single-pad uniform distributions of fuboTV (~91 %
  rate, all single trailing space), Flexport (~9.7 %, all single
  trailing space), and the prior D-10 cohort. Standard
  `String.prototype.trim()` handles both forms (it strips all
  leading and trailing whitespace), so the existing one-line
  `.trim()` semantics carry through unchanged — the deviation is
  observable but the implementation is identical to the prior
  cohort. The plugin applies `.trim()` to the wire `title` before
  downstream filters and emit so the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter sees the trimmed
  form, and the emitted `JobPostDto.title` does not carry pad
  bytes on either side. The unit-test happy path's second listing
  fixture uses the wire-padded title `'(Seasonal Sales Associate,
  Part-Time) Editor, Boston  '` (with **two** trailing spaces) and
  asserts (a) the emitted `title` equals the trimmed form
  `'(Seasonal Sales Associate, Part-Time) Editor, Boston'` AND is
  byte-distinct from the wire form AND (b) is exactly **2 bytes
  shorter** (locking the multi-byte trailing-pad form against a
  future refactor that drops the `.trim()` and reintroduces the
  wire pad bytes). **Thirteenth cohort plugin to apply D-10**
  (after Brex, Buildkite, ZoomInfo, Attentive, Elastic, Intercom,
  Mixpanel, Faire, Carta, ClassPass, Epic Games, Flexport, and
  fuboTV).
- **D-11 (run #282):** The Glossier wire `departments[0].name`
  payload uses **fully-clean multi-token department names** like
  `'Retail (Stores)'`, `'Creative'`, `'Product Development'` —
  similar to Coursera's all-trim-clean pure descriptive format
  and distinct from Cameo's partial-pad pass-through. Specifically
  0 of the 17 wire department names in the run-282 probe carry
  trailing ASCII-space padding (0 % pad-rate). The plugin emits
  the wire `departments[0].name` byte-for-byte (no department-
  name `.trim()` needed because no wire-side padding was observed;
  the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains
  semantically correct against the clean wire form). The unit-test
  happy path includes (a) a regression guard asserting the
  emitted `department` for the first fixture listing matches the
  wire `departments[0].name === 'Retail (Stores)'` byte-for-byte
  (clean multi-token form with internal parentheses), and (b) a
  regression guard asserting the emitted `department` for the
  second fixture listing matches the wire
  `departments[0].name === 'Creative'` byte-for-byte (clean
  single-token form).
- **D-12 (run #282):** This plugin is the **eighth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, ClassPass at run #277, Coursera
  at run #278, Epic Games at run #279, Flexport at run #280,
  and fuboTV at run #281). The remaining six live hits from the
  run-275 probe sweep queue for runs #283+ in alphabetical order:
  `honeycomb` (10 roles, run #283 next bite), `lattice` (11),
  `masterclass` (6), `mavenclinic` (24), `stitchfix` (22), `udemy`
  (17). Subsequent runs after the pool is exhausted (#288+ by
  current arithmetic) will pivot to a **fifth fresh probe sweep**
  targeting yet-untested large-employer candidate slugs. HubSpot's
  twentieth-consecutive empty re-probe at run-282 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.
- **D-13 (run #282):** **Zero structural deviations** from the
  Flexport (Spec 070) template — making this the **third**
  Greenhouse-only company-direct plugin in run-history to ship as
  a clean re-spin of a prior cohort plugin with no per-axis
  deviations (after Coursera off Chime at run #278 and Flexport
  off Faire at run #280). All five axes share with Flexport: D-04
  variant 10, D-08 entity-decode-then-tag-strip, D-09 omitted,
  D-10 applied, D-11 fully-clean. The leading-pad and double-
  trailing-pad observability noted in D-10 is a wire-side
  observation about pad-byte distribution, not a structural
  deviation in the plugin itself — the implementation is byte-
  identical to Flexport's `.trim()`-based handling.

## 11. References

- `packages/plugins/source-company-flexport/src/flexport.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 070 / run #280; same D-04 variant 10, D-08 entity-
  decode-then-tag-strip, D-09 omitted, D-10 applied, D-11
  fully-clean as Glossier; zero structural deviations).
- `packages/plugins/source-company-faire/src/faire.service.ts` —
  prior cohort plugin with variant 10 (Spec 063 / run #273; Faire
  uses variant 10 + D-08 + D-09 omitted + D-10 applied + D-11
  fully-clean as Glossier; zero structural deviations).
- `packages/plugins/source-company-fubotv/src/fubotv.service.ts` —
  immediately prior cohort plugin (Spec 071 / run #281; fuboTV
  uses variant 14 vanity-domain query-only-id + D-08 + D-09 omitted
  + D-10 applied + D-11 fully-clean + D-12 location-trim — distinct
  from Glossier on D-04 wire-shape variant; both apply D-10).
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
