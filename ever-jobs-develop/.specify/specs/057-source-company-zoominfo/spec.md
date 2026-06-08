# Spec: 057 — Source Company Plugin: ZoomInfo

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 057                                                                                                                                                                                    |
| Slug           | source-company-zoominfo                                                                                                                                                                |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #267)                                                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056 |

## 1. Problem Statement

Run #266's Spec 056 closed the gap that the company-direct catalogue had no
entry for the dominant **AI-native Digital Experience Platform / visual
website builder** vendor (Webflow) and added the eighth plugin to use
wire-shape variant 2 (the US-region `job-boards.greenhouse.io` permalink
subdomain). The catalogue still has no entry for the dominant **B2B
go-to-market intelligence / sales-and-marketing data platform** vendor —
ZoomInfo (ZoomInfo Technologies LLC; founded as DiscoverOrg by Henry
Schuck and Kirk Brown in 2007 in Vancouver, Washington, rebranded to
ZoomInfo after the 2019 DiscoverOrg / ZoomInfo merger, listed on NASDAQ
under `ZI` since the 2020 IPO; now operating with offices in Vancouver
(Washington), Waltham (Massachusetts), Bethesda (Maryland), London,
Chennai, and remote across the United States; operator of the ZoomInfo
Sales (the prospecting-data flagship), ZoomInfo Marketing (the demand-
generation product), ZoomInfo Talent (the recruiter-intelligence
product), ZoomInfo Operations (the data-orchestration product),
ZoomInfo Engage (the sales-automation product), ZoomInfo Chat (the
website-conversation product), ZoomInfo Chorus (the conversation-
intelligence product), and ZoomInfo Copilot (the AI-driven workflow
product) lines that anchor the GTM-intelligence category alongside
Apollo, Cognism, Clearbit, Lusha, RocketReach, ZoomInfo's own legacy
DiscoverOrg brand, LinkedIn Sales Navigator, and 6sense). Its multi-
thousand-employee engineering, product, sales, marketing, customer-
success, and corporate hiring across Vancouver / Waltham / Bethesda /
London / Chennai and remote across the United States puts its corporate
openings on the same "marquee company-direct" tier as Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, and Webflow.
Aggregator-callers asking for "all jobs at major B2B GTM-intelligence /
sales-data vendors" must currently either (a) deduce the Greenhouse
slug `zoominfo` and call `source-ats-greenhouse` by hand, or (b) post-
filter the firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-breaker
plumbing that the company-direct plugins sit behind (Spec 005), and
both lose the `Site.<KEY>` enum entry that aggregator-side code
branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`zoominfo` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-five times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman, Toast, Webflow).

## 2. Goals

- Ship a `source-company-zoominfo` plugin returning live `JobPostDto`
  rows for the public ZoomInfo careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-toast` plugin (Greenhouse-backed, `category:
  'company'`, `Site.ZOOMINFO` enum value, `id` prefixed `zoominfo-`) —
  Toast is the closest structural cousin because both publish their
  `absolute_url` on a marketing-site shape with `?gh_jid=<id>` query-
  param-only listing identification (no `<id>` in the URL path) AND
  both emit HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline. ZoomInfo
  introduces three structural deviations: (a) wire-shape variant 9 — a
  new apex-www brand-domain shape `https://www.zoominfo.com/careers?
  gh_jid=<id>` distinct from Toast's variant 8 sub-brand careers-
  subdomain `https://careers.toasttab.com/jobs?gh_jid=<id>` (D-04);
  (b) the wire `company_name` `'ZoomInfo Technologies LLC'` carries a
  legal-entity suffix that the plugin trims to `'ZoomInfo'` for the
  emitted `companyName` (D-09 — third cohort plugin to apply a brand-
  name trim, after Affirm `'Affirm, Inc.'` and Gusto `'Gusto, Inc.'`);
  and (c) a subset of ZoomInfo wire titles carry trailing ASCII-space
  padding (5 of 82 titles in the run-267 probe) that the plugin trims
  with `.trim()` before emitting (D-10 — third cohort plugin to apply
  a title trim, after Brex and Buildkite).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case ZoomInfo.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'zoominfo'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-toast` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover ZoomInfo's USD / GBP / INR ranges (Vancouver
  WA / Waltham MA / Bethesda MD / London / Chennai / remote-US)
  without modification.
- Backfilling historical ZoomInfo postings — only the open-roles slice
  the Greenhouse public API returns.
- Wire `location.name` semicolon-separated multi-region normalisation —
  ZoomInfo's multi-office roles emit semicolon-separated location
  strings like `'Bethesda, Maryland, United States; Vancouver,
  Washington, United States; Waltham, Massachusetts, United States'`.
  The plugin emits the wire string byte-for-byte; consumers wanting
  per-region splits can split on `'; '` themselves. Webflow (Spec 056)
  established this pass-through convention; ZoomInfo follows.
- Wire `departments[0].name` numeric-code-prefix stripping — ZoomInfo's
  tenant prefixes department names with internal numeric codes (e.g.
  `'801 Client Services - Support'`, `'898 Corporate Engineering - G&A
  - Enterprise Technologies'`). The plugin emits the wire string byte-
  for-byte (no code stripping, no normalisation) — consumers wanting
  the cleaned name can split on the first space themselves. A future
  spec can introduce a generic numeric-code-prefix splitter if needed
  across multiple tenants.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ZOOMINFO`** in the source
> registry, so that **a single `siteType: [Site.ZOOMINFO]` request returns
> ZoomInfo's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining a new variant-9
> apex-www brand-domain `?gh_jid=<id>` shape with the entity-decode-
> then-tag-strip description pipeline, a legal-entity suffix trim, and
> a wire-title `.trim()`**, so that **adding the next Greenhouse-only
> employer that publishes its `absolute_url` on a brand-domain marketing
> site costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for ZoomInfo**, so that **a Greenhouse outage on the
> ZoomInfo board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ZOOMINFO = 'zoominfo'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-zoominfo` under `packages/plugins/`.                | must     |
| FR-3  | `ZoomInfoService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `zoominfo-`, `site === Site.ZOOMINFO`, and `companyName === 'ZoomInfo'` (D-09 trims the wire `'ZoomInfo Technologies LLC'` suffix to the brand name; see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/zoominfo.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **apex-www brand-domain marketing-site** shape `https://www.zoominfo.com/careers?gh_jid=<id>` — variant 9 (the **first** plugin in the cohort to use this shape; Spec 057 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to the wire `title` before downstream filters and the `JobPostDto` emit. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ZoomInfoModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-zoominfo/src/zoominfo.service.ts
@SourcePlugin({ site: Site.ZOOMINFO, name: 'ZoomInfo', category: 'company' })
@Injectable()
export class ZoomInfoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/zoominfo/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `zoominfo-${listing.id}`,
  site:         Site.ZOOMINFO,
  title:        (listing.title ?? '').trim(),
  companyName:  'ZoomInfo',
  jobUrl:       listing.absolute_url ?? `https://www.zoominfo.com/careers?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/zoominfo.service.spec.ts`):**
  1. NestJS DI resolves `ZoomInfoService` through `ZoomInfoModule`.
  2. `Site.ZOOMINFO === 'zoominfo'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-insensitive — including the numeric-code-prefix path leaf).
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

- **D-01 (run #267):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: ZoomInfo's
  `https://www.zoominfo.com/careers?gh_jid=<id>` apex-www brand-domain
  marketing-site URL is the brand-canonical detail-page proxy on the
  wire, but the Greenhouse public API is the canonical machine-readable
  feed for this tenant. We already exercise the exact same wire format
  from `source-company-toast`, `source-company-webflow`,
  `source-company-postman`, `source-company-netlify`,
  `source-company-rampnetwork`, `source-company-circleci`,
  `source-company-buildkite`, `source-company-mercury`,
  `source-company-gusto`, `source-company-brex`,
  `source-company-duolingo`, `source-company-klaviyo`,
  `source-company-affirm`, `source-company-vercel`,
  `source-company-block`, `source-company-roblox`,
  `source-company-dropbox`, `source-company-instacart`,
  `source-company-datadog`, `source-company-mongodb`,
  `source-company-cloudflare`, `source-company-twilio`,
  `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`,
  `source-company-plaid`, `source-company-lyft`,
  `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #267):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'zoominfo'`.
- **D-03 (run #267):** No salary parser hook beyond the helpers
  defaults — ZoomInfo posts USD / GBP / INR ranges (Vancouver WA /
  Waltham MA / Bethesda MD / London / Chennai / remote-US HQ +
  offices) inside the Greenhouse `content` field; Spec 014 / 015's
  parser already covers the relevant currencies without modification;
  no Spec 057-specific salary logic.
- **D-04 (run #267):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **apex-www brand-domain marketing-
  site** template `https://www.zoominfo.com/careers?gh_jid=<id>` — a
  **ninth** distinct wire-shape variant in the cohort (variant 9),
  distinguished from Toast's variant 8 by (a) the **apex-www brand
  domain** (`www.zoominfo.com`, the corporate brand domain on the
  default `www` subdomain) rather than the careers-subdomain on a
  sub-brand product domain (`careers.toasttab.com`); and (b) the
  `/careers` path with `?gh_jid=<id>` query-param-only listing
  identification (no `<id>` in the path), like Toast's `/jobs?gh_jid=
  <id>` shape. ZoomInfo is the **first plugin in the cohort to use an
  apex-www brand-domain marketing-site `?gh_jid=<id>` shape**.
  Rationale: ZoomInfo's tenant publishes its `absolute_url` on this
  shape — confirmed via run #267's HTTP 200 probe of the live API
  where the first job's `absolute_url` is
  `https://www.zoominfo.com/careers?gh_jid=7961383002`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  ZoomInfo listing in practice (the fallback is a defence-in-depth
  path Greenhouse has not actually exercised against this tenant in
  the audit window). The unit-test happy path includes a regression
  guard asserting (a) the wire `absolute_url` flows through to
  `jobUrl` byte-for-byte AND that the emitted `jobUrl` contains the
  literal `www.zoominfo.com` substring AND the literal `?gh_jid=`
  substring AND must NOT contain `job-boards.greenhouse.io` (locking
  the variant-9 shape against future refactors that might naively
  normalise to the permalink-subdomain template).
- **D-05 (run #267):** Use Greenhouse slug `zoominfo` (the lowercase
  brand name with the suffix-letter-mash). Rationale: like Webflow
  (Spec 056 § 10 D-05), Toast (Spec 055 § 10 D-05), Postman (Spec 054
  § 10 D-05), Netlify (Spec 053 § 10 D-05), Ramp Network (Spec 052 §
  10 D-05), CircleCI (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10
  D-05), Mercury (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05),
  Brex (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo
  (Spec 045 § 10 D-05), Affirm (Spec 044 § 10 D-05), Vercel (Spec 043
  § 10 D-05), Block (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05),
  Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05), and
  unlike Robinhood (Spec 026 § 10 D-05), ZoomInfo's Greenhouse tenant
  is published at the slug `zoominfo` with no slug-vs-display-name
  asymmetry. Confirmed via run #267's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/zoominfo/jobs?content=true`
  (82 open roles returned).
- **D-06 (run #267):** Class names are `ZoomInfoService` /
  `ZoomInfoModule` (PascalCase splitting on the camelCase brand name
  with capital `I`). Rationale: matches the convention ZoomInfo's own
  marketing / GitHub / Crunchbase pages use for class-style references
  to the brand (`ZoomInfo`), and aligns with the existing repo
  PascalCase convention for camelCased multi-word brands (e.g.
  `DoorDashService`, `PowerToFlyService`, `ZipRecruiterModule`).
- **D-07 (run #267):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `rampnetwork` shipped run #262; `netlify` shipped
  run #263; `postman` shipped run #264; `toast` shipped run #265;
  `webflow` shipped run #266; `hubspot`, `zoominfo` remained queued).
  Run #267's start-of-run probe of `zoominfo` returned HTTP 200 with
  82 open roles. ZoomInfo is the **last remaining live candidate**
  from the original nine-200 sweep (HubSpot continues to be deferred
  — re-probed at run-267 start with `meta.total === 0`, the sixth
  consecutive empty re-probe across runs #262, #263, #264, #265, #266,
  #267). With this Spec 057 close-out, the carry-over named-candidate
  pool is fully exhausted; runs #268+ will pivot to a **fresh probe
  sweep** of the next batch of large-employer candidates.
- **D-08 (run #267):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Webflow (Spec 056 § 10 D-08), Toast
  (Spec 055 § 10 D-08), Postman (Spec 054 § 10 D-08), Netlify (Spec
  053 § 10 D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec
  051 § 10 D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 §
  10 D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08),
  Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08),
  ZoomInfo's tenant emits HTML-entity-encoded content
  (`&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;ZoomInfo is
  where careers accelerate. We move fast, think boldly...`) rather
  than raw HTML tags — confirmed via run #267's HTTP probe of the
  live API. Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text. The
  pipeline is order-sensitive — `decodeHtmlEntities()` must run
  before `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities decoded),
  (b) does not contain `&quot;` (named entities decoded), (c) does
  not contain `&#39;` (numeric entities decoded), and (d) does not
  contain `<p>`, `<div>`, `<strong>`, or `<em>` (tags stripped after
  the decode pass), so a future refactor that swaps the order or
  drops one half of the pipeline would surface as a test diff. This
  is the **thirteenth** company-direct plugin in the cohort to use
  the entity-decode-then-tag-strip pipeline.
- **D-09 (run #267):** Emit the brand name `'ZoomInfo'` rather than
  the wire `company_name` `'ZoomInfo Technologies LLC'`. Rationale:
  ZoomInfo's wire `company_name` carries the full corporate legal-
  entity name (`'ZoomInfo Technologies LLC'`, the registered Delaware
  LLC name) — confirmed via run #267's HTTP probe of the live API
  where every returned job has `company_name === 'ZoomInfo
  Technologies LLC'`. Emitting that string directly would surface the
  legal-entity suffix to downstream consumers, which is **cosmetically
  inconsistent** with the rest of the cohort (Anthropic emits
  `'Anthropic'` not `'Anthropic, PBC'`; Stripe emits `'Stripe'` not
  `'Stripe, Inc.'`; etc.) and **functionally inconsistent** with how
  callers expect company-name-keyed analytics dedup (an analytics
  caller searching for `companyName === 'ZoomInfo'` would otherwise
  miss every wire-suffix-bearing row). The plugin pins `companyName
  === 'ZoomInfo'` as a string literal in the `JobPostDto` mapping.
  This matches the pattern Affirm (Spec 044 § 10 D-06) and Gusto (Spec
  048 § 10 D-09) established for legal-entity-suffix wire `company_
  name` — making ZoomInfo the **third** plugin in the cohort to apply
  a brand-name trim. Unlike Affirm (`'Affirm, Inc.'` → `'Affirm'`,
  comma-suffix) and Gusto (`'Gusto, Inc.'` → `'Gusto'`, comma-suffix),
  ZoomInfo's wire suffix has **no comma separator** (`'ZoomInfo
  Technologies LLC'`, space-suffix) — making ZoomInfo the **first
  plugin in the cohort to clean a space-separated legal-entity
  suffix**. The unit-test happy path asserts (a) the emitted
  `companyName === 'ZoomInfo'` byte-for-byte, (b) the emitted
  `companyName` does NOT match the wire `company_name` (locking the
  literal-pin against a future refactor that would naively read
  `listing.company_name`), and (c) the wire `company_name` is the
  literal `'ZoomInfo Technologies LLC'` (regression guard against the
  upstream tenant changing its registered legal-entity name).
- **D-10 (run #267):** `.trim()` deviation on the wire `title`.
  Rationale: a subset of ZoomInfo wire titles carry trailing ASCII-
  space padding (5 of 82 titles in the run-267 probe — e.g.
  `'Account Manager, Enterprise Growth '`, similar to the Brex /
  Buildkite tenant). Without the trim, `JobPostDto.title` would emit
  the wire-pad bytes through to consumers, and `searchTerm`'s
  `title.toLowerCase().includes(term)` filter would still work for
  prefix matches but would silently fail on equality-style
  consumer-side filters. The plugin applies `.trim()` to the wire
  `title` before the empty-title skip check AND before the
  `searchTerm` filter AND before the `JobPostDto` emit, so the
  emitted `title` is the trimmed form. This is the **third** plugin
  in the cohort to apply a wire-title trim (after Brex `Spec 047 §
  10 D-10` and Buildkite `Spec 050 § 10 D-10`). The unit-test happy
  path includes a regression guard asserting (a) the emitted `title`
  has no leading or trailing whitespace AND (b) for the padded-
  fixture-listing case, the emitted `title !== fixture.title` (the
  trim observably fired).
- **D-11 (run #267):** The ZoomInfo wire `departments[0].name`
  payload uses a numeric-code-prefix format with hyphen-separated
  organisational hierarchy (e.g. `'801 Client Services - Support'`,
  `'898 Corporate Engineering - G&A - Enterprise Technologies'`,
  `'820 R&G - Account Managers'`). The plugin emits the wire string
  byte-for-byte (no code stripping, no hierarchy normalisation) —
  consumers wanting the cleaned name can split on the first space
  themselves. The unit-test happy path includes a regression guard
  asserting (a) the emitted `department` for the first fixture
  listing is the literal numeric-code-prefixed nested-path string
  `'801 Client Services - Support'` byte-for-byte AND matches the
  wire `departments[0].name` byte-for-byte (D-11 first-instance
  guard for the numeric-code-prefixed pass-through), and (b) the
  case-insensitive `searchTerm` match on the literal `'support'`
  substring resolves the first listing through the leaf segment of
  the hyphen-separated path. ZoomInfo is the **first plugin in the
  cohort to ship a fixture with numeric-code-prefixed department
  names** — distinct from Toast's colon-separated nested-path format
  (`'Sales : International : Horizon 2'`) and from every prior cohort
  plugin's flat or ampersand-bearing department names.

## 11. References

- `packages/plugins/source-company-toast/src/toast.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 055 / run #265; uses a marketing-site `?gh_jid=<id>` shape with
  the entity-decode pipeline).
- `packages/plugins/source-company-webflow/src/webflow.service.ts` —
  the prior company-direct plugin (Spec 056 / run #266; uses variant
  2 with the entity-decode pipeline; structurally identical except
  for the wire-shape variant and brand-name pin).
- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  the prior wire-title `.trim()` plugin (Spec 050 § 10 D-10).
- `packages/plugins/source-company-affirm/src/affirm.service.ts` —
  the first-instance brand-name trim plugin (Spec 044 § 10 D-06; comma-
  suffix `'Affirm, Inc.'` → `'Affirm'`).
- `packages/plugins/source-company-gusto/src/gusto.service.ts` —
  the second-instance brand-name trim plugin (Spec 048 § 10 D-09;
  comma-suffix `'Gusto, Inc.'` → `'Gusto'`).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
