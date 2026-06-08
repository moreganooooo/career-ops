# Spec: 056 — Source Company Plugin: Webflow

| Field          | Value                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 056                                                                                                                                                                              |
| Slug           | source-company-webflow                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                         |
| Owner          | claude (run #266)                                                                                                                                                                |
| Created        | 2026-05-02                                                                                                                                                                       |
| Last updated   | 2026-05-02                                                                                                                                                                       |
| Supersedes     | (none)                                                                                                                                                                           |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055 |

## 1. Problem Statement

Run #265's Spec 055 closed the gap that the company-direct catalogue had no
entry for the dominant **restaurant point-of-sale and management platform**
vendor (Toast) and added the **first** plugin to use wire-shape variant 8
(the careers-subdomain marketing-site shape on a sub-brand product domain
`https://careers.toasttab.com/jobs?gh_jid=<id>`). The catalogue still has
no entry for the dominant **AI-native Digital Experience Platform / visual
website builder** vendor — Webflow (Webflow, Inc.; founded by Vlad Magdalin,
Sergie Magdalin, and Bryant Chou in 2013 in San Francisco, now operating as
a remote-first company with offices in San Francisco, New York, London,
Berlin, Mexico City, and Bengaluru; operator of Webflow Designer (the
visual-development canvas flagship), Webflow CMS (the content management
system), Webflow Ecommerce (the storefront product), Webflow Hosting (the
managed-hosting product), Webflow Localization (the translation product),
Webflow Optimize (the AI-driven personalisation and A/B testing product),
Webflow Analyze (the analytics product), Webflow Apps (the third-party
integration marketplace), Webflow Code Sync (the developer-handoff product
that syncs Designer changes to Git), Webflow AI Site Builder (the
generative-AI website creation product), and Webflow Workspaces (the team-
collaboration surface) lines that anchor the visual-development category
alongside Framer, Squarespace, Wix, Shopify, Editor X, and WordPress
elementor). Its multi-thousand-employee engineering, product, design, sales,
customer-success, and developer-relations hiring across San Francisco /
New York / London / Berlin / Mexico City / Bengaluru and remote across
the United States, Canada (BC & ON only), the United Kingdom, and
Ireland puts its corporate openings on the same "marquee company-direct"
tier as Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch,
Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, and Toast. Aggregator-callers
asking for "all jobs at major visual-development / website-builder vendors"
must currently either (a) deduce the Greenhouse slug `webflow` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match. Both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and breaker
scoping.

The gap closes when we add a thin company-direct plugin pinning the
`webflow` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-four times (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury,
Buildkite, CircleCI, Ramp Network, Netlify, Postman, Toast).

## 2. Goals

- Ship a `source-company-webflow` plugin returning live `JobPostDto` rows
  for the public Webflow careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-postman` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.WEBFLOW` enum value, `id` prefixed `webflow-`) — Postman is the
  closest structural cousin because both publish through the new
  `job-boards.greenhouse.io` permalink subdomain family (variant 2) AND emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND emit a wire
  `company_name` matching the bare brand name byte-for-byte (no legal-entity
  suffix). Webflow introduces zero new structural deviations — it is the
  **eighth** plugin in the cohort to use variant 2 (the US-region permalink
  subdomain `job-boards.greenhouse.io`), the **twelfth** plugin to use the
  entity-decode-then-tag-strip description pipeline, and follows the
  Postman / Netlify / Buildkite / Mercury / CircleCI / Ramp Network template
  for brand-name pinning (single-word brand `Webflow` matches the wire
  `company_name` byte-for-byte).
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Webflow.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'webflow'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-postman` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Webflow's USD / GBP / EUR / MXN / INR / CAD ranges
  (San Francisco / New York / London / Berlin / Mexico City / Bengaluru /
  remote-US/Canada/UK/Ireland) without modification.
- Backfilling historical Webflow postings — only the open-roles slice
  the Greenhouse public API returns.
- Wire `location.name` semicolon-separated multi-region normalisation —
  Webflow's remote roles emit complex location strings like `'CA Remote
  (BC & ON only); U.K. / Ireland Remote; U.S. Remote'` with semicolon-
  separated multi-region plus province/state restrictions in parentheses.
  The plugin emits the wire string byte-for-byte; consumers wanting
  per-region splits can split on `'; '` themselves. A future spec can
  introduce a generic Greenhouse multi-region location splitter if needed
  across multiple tenants.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.WEBFLOW`** in the source
> registry, so that **a single `siteType: [Site.WEBFLOW]` request returns
> Webflow's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io` permalink-subdomain family (variant 2) with
> the entity-decode-then-tag-strip description pipeline AND the
> semicolon-separated multi-region location pass-through**, so that
> **adding the next Greenhouse-only employer that publishes its
> `absolute_url` on the US-region subdomain costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Webflow**, so that **a Greenhouse outage on the Webflow
> board does not trip the breaker for every other Greenhouse tenant**
> the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.WEBFLOW = 'webflow'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-webflow` under `packages/plugins/`.                 | must     |
| FR-3  | `WebflowService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `webflow-`, `site === Site.WEBFLOW`, and `companyName === 'Webflow'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/webflow.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region** permalink-subdomain shape `https://job-boards.greenhouse.io/webflow/jobs/<id>` — variant 2 (the eighth plugin in the cohort to use this shape, after Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, and Postman; Spec 056 § 10 D-04). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[WebflowModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-webflow/src/webflow.service.ts
@SourcePlugin({ site: Site.WEBFLOW, name: 'Webflow', category: 'company' })
@Injectable()
export class WebflowService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/webflow/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `webflow-${listing.id}`,
  site:         Site.WEBFLOW,
  title:        listing.title ?? '',
  companyName:  'Webflow',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/webflow/jobs/${listing.id}`,
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

- **Unit (`__tests__/webflow.service.spec.ts`):**
  1. NestJS DI resolves `WebflowService` through `WebflowModule`.
  2. `Site.WEBFLOW === 'webflow'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
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

- **D-01 (run #266):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Webflow's
  `https://job-boards.greenhouse.io/webflow/jobs/<id>` US-region
  permalink-subdomain URL is the Greenhouse-canonical detail-page proxy on
  the wire (variant 2 family) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise the
  exact same wire format from `source-company-postman`,
  `source-company-netlify`, `source-company-rampnetwork`,
  `source-company-circleci`, `source-company-buildkite`,
  `source-company-mercury`, `source-company-gusto`, `source-company-brex`,
  `source-company-duolingo`, `source-company-klaviyo`,
  `source-company-affirm`, `source-company-vercel`, `source-company-block`,
  `source-company-roblox`, `source-company-dropbox`,
  `source-company-instacart`, `source-company-datadog`,
  `source-company-mongodb`, `source-company-cloudflare`,
  `source-company-twilio`, `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #266):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'webflow'`.
- **D-03 (run #266):** No salary parser hook beyond the helpers defaults
  — Webflow posts USD / GBP / EUR / MXN / INR / CAD ranges (San Francisco
  / New York / London / Berlin / Mexico City / Bengaluru / remote-US/
  Canada/UK/Ireland HQ + offices) inside the Greenhouse `content` field;
  Spec 014 / 015's parser already covers the relevant currencies without
  modification; no Spec 056-specific salary logic.
- **D-04 (run #266):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink-subdomain** template
  `https://job-boards.greenhouse.io/webflow/jobs/<id>` — variant 2.
  Rationale: Webflow's tenant publishes its `absolute_url` on the
  US-region Greenhouse permalink subdomain `job-boards.greenhouse.io`
  (the same subdomain Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify,
  and Postman use) rather than the EU-region `job-boards.eu.greenhouse.io`
  Ramp Network introduced in Spec 052 — confirmed via run #266's HTTP 200
  probe of the live API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/webflow/jobs/7826080`. This is the
  **eighth** plugin in the cohort to use variant 2 (after Vercel, Affirm,
  Gusto, Mercury, Buildkite, Netlify, and Postman). Functional impact is
  zero because Greenhouse populates `absolute_url` on every Webflow
  listing in practice (the fallback is a defence-in-depth path Greenhouse
  has not actually exercised against this tenant in the audit window).
  The unit-test happy path includes a regression guard asserting the
  wire `absolute_url` flows through to `jobUrl` byte-for-byte AND that
  the emitted `jobUrl` contains the literal `job-boards.greenhouse.io`
  substring (locking the US-region subdomain against future refactors
  that might naively normalise to the EU-region subdomain).
- **D-05 (run #266):** Use Greenhouse slug `webflow` (the lowercase
  brand name). Rationale: like Postman (Spec 054 § 10 D-05), Netlify
  (Spec 053 § 10 D-05), Ramp Network (Spec 052 § 10 D-05), CircleCI
  (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec
  049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05),
  Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm
  (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 §
  10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05),
  Instacart (Spec 039 § 10 D-05), Toast (Spec 055 § 10 D-05), and unlike
  Robinhood (Spec 026 § 10 D-05), Webflow's Greenhouse tenant is
  published at the slug `webflow` with no slug-vs-display-name asymmetry.
  Confirmed via run #266's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/webflow/jobs?content=true`.
- **D-06 (run #266):** Class names are `WebflowService` /
  `WebflowModule` (PascalCase splitting on the single-word brand name).
  Rationale: matches the convention Webflow's own marketing /
  GitHub / Crunchbase pages use for class-style references to the brand
  (`Webflow`), and aligns with the existing repo PascalCase convention
  for single-word brands (e.g. `PostmanService`, `NetlifyService`,
  `BuildkiteService`).
- **D-07 (run #266):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `rampnetwork` shipped run #262; `netlify` shipped
  run #263; `postman` shipped run #264; `toast` shipped run #265;
  `hubspot`, `webflow`, `zoominfo` remained queued). Run #266's
  start-of-run probe of `webflow` returned HTTP 200 with 31 open roles.
  Webflow is alphabetically the next remaining candidate (`web` <
  `zoo`; HubSpot continues to be deferred — last re-probed at run-262
  start with `meta.total === 0`). The remaining candidates queue up
  for runs #267+: ZoomInfo (variant 3 family — apex-www
  `careers?gh_jid=<id>`, ~82 jobs, with a wire `company_name`
  `'ZoomInfo Technologies LLC'` legal-entity suffix to clean — first
  since Affirm / Gusto), HubSpot re-probe, plus a fresh probe sweep
  pivot if all pre-probed candidates ship.
- **D-08 (run #266):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10
  D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10
  D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08),
  Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec
  046 § 10 D-08), Klaviyo (Spec 045 § 10 D-08), and Toast (Spec 055 §
  10 D-08), Webflow's tenant emits HTML-entity-encoded content
  (`&lt;p&gt;At Webflow, we're building...`) rather than raw HTML tags
  (`<p>At Webflow, we're building...`) — confirmed via run #266's HTTP
  probe of the live API where the first job's `content` starts with
  `&lt;p&gt;At Webflow, we&rsquo;re building the world&rsquo;s leading
  AI-native Digital Experience Platform`. Applying `stripHtmlTags()`
  alone to that wire payload would leave the literal entities in place
  (because they are not actual `<…>` tags), producing user-facing
  descriptions full of `&lt;p&gt;` and `&rsquo;` substrings. Decoding
  entities **first** (turning `&lt;p&gt;` into `<p>` and `&rsquo;` into
  `'` U+2019) and then stripping tags (turning `<p>At Webflow...</p>`
  into `At Webflow...`) yields clean readable text. The pipeline is
  order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b) does
  not contain `&rsquo;` (named entities decoded), (c) does not contain
  `&#39;` (numeric entities decoded), and (d) does not contain `<p>`,
  `<strong>`, or `<em>` (tags stripped after the decode pass), so a
  future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **twelfth**
  company-direct plugin in the cohort to use the entity-decode-then-tag-
  strip pipeline (the first eleven being Klaviyo, Duolingo, Brex, Gusto,
  Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman, and
  Toast).
- **D-09 (run #266):** Emit the wire `company_name` `'Webflow'`
  directly (no brand-name trim required). Rationale: Webflow's wire
  `company_name` is the bare brand name `'Webflow'` — confirmed via run
  #266's HTTP probe of the live API where the returned job has
  `company_name === "Webflow"` (no `, Inc.` suffix, no `Webflow Inc.`
  legal-entity suffix). This matches Postman (Spec 054 § 10 D-09),
  Netlify (Spec 053 § 10 D-09), Ramp Network (Spec 052 § 10 D-09),
  CircleCI (Spec 051 § 10 D-09), Buildkite (Spec 050 § 10 D-09),
  Mercury (Spec 049 § 10 D-09), and Toast (Spec 055 § 10 D-09) — all
  eight pin the brand name byte-for-byte against the wire — and
  contrasts with Gusto (Spec 048 § 10 D-09) and Affirm (Spec 044 § 10
  D-06), both of which emit a wire `company_name` with a legal-entity
  suffix that needed cleaning to the brand name. The plugin pins
  `companyName === 'Webflow'` as a string literal in the `JobPostDto`
  mapping (rather than reading `listing.company_name`) for byte-stable
  consistency with the other forty-three company-direct plugins —
  every prior company-direct plugin uses a string literal for
  `companyName`, and Webflow follows the same convention. The unit-test
  happy path asserts the emitted `companyName === 'Webflow'` to lock
  the brand-name pin against future refactors that might mistakenly
  read the wire payload.
- **D-10 (run #266):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, Webflow's tenant emits clean trimmed titles in every
  observed listing — confirmed via run #266's HTTP probe of the live
  API where the returned jobs have titles with no leading or trailing
  whitespace (e.g. `'Business Development Representative'`,
  `'Engineering Manager, Code Sync'`). Skipping the trim is consistent
  with the Postman / Netlify / CircleCI / Mercury / Gusto / Klaviyo /
  Ramp Network / Toast template (40 of 44 prior cohort plugins skip
  the trim; only Brex and Buildkite apply it).
- **D-11 (run #266):** The Webflow wire `location.name` payload uses a
  semicolon-separated multi-region format with parenthesised
  province/state restrictions for remote roles (e.g. `'CA Remote
  (BC & ON only); U.K. / Ireland Remote; U.S. Remote'`). The plugin
  emits the wire string byte-for-byte (no semicolon splitting, no
  region normalisation) — consumers wanting per-region splits can
  split on `'; '` themselves. The unit-test happy path includes a
  regression guard asserting (a) the emitted `location.city` for the
  remote fixture listing is the literal semicolon-separated multi-
  region string `'CA Remote (BC & ON only); U.K. / Ireland Remote;
  U.S. Remote'` byte-for-byte AND matches the wire `location.name`
  byte-for-byte (D-11 first-instance guard for the semicolon-separated
  multi-region location pass-through), and (b) the `isRemote`
  derivation correctly returns `true` for the multi-region remote
  string (the existing `'remote'.toLowerCase().includes('remote')`
  check handles the multi-region case without modification). Webflow
  is the **first plugin in the cohort to ship a fixture with
  semicolon-separated multi-region location names** — distinct from
  Toast's single-region remote string `'Remote - US (PST time zone)'`
  (Spec 055) and from every prior cohort plugin's flat single-region
  location names.

## 11. References

- `packages/plugins/source-company-postman/src/postman.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 054 / run #264; uses the new `job-boards.greenhouse.io`
  permalink subdomain — variant 2 — with the entity-decode pipeline).
- `packages/plugins/source-company-netlify/src/netlify.service.ts` —
  the prior variant-2 plugin (Spec 053 / run #263; uses variant 2 with
  the entity-decode pipeline; structurally identical except for the
  brand-name pin).
- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  another prior variant-2 plugin (Spec 050 / run #260; uses variant 2
  with the entity-decode pipeline; structurally identical except for
  the brand-name pin and the wire-title `.trim()` deviation Webflow
  does not share).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
