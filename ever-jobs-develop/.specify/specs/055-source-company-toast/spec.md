# Spec: 055 — Source Company Plugin: Toast

| Field          | Value                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 055                                                                                                                                                                              |
| Slug           | source-company-toast                                                                                                                                                             |
| Status         | accepted                                                                                                                                                                         |
| Owner          | claude (run #265)                                                                                                                                                                |
| Created        | 2026-05-02                                                                                                                                                                       |
| Last updated   | 2026-05-02                                                                                                                                                                       |
| Supersedes     | (none)                                                                                                                                                                           |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054 |

## 1. Problem Statement

Run #264's Spec 054 closed the gap that the company-direct catalogue had no
entry for the dominant **API development platform** vendor (Postman) and added
the **seventh** plugin to use wire-shape variant 2 (the US-region permalink
subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`). The catalogue
still has no entry for the dominant **restaurant point-of-sale and management
platform** vendor — Toast (Toast, Inc.; founded by Steve Fredette, Aman
Narang, and Jonathan Grimm in 2011 in Cambridge, Massachusetts, now
headquartered in Boston with engineering, product, sales, and customer-
success offices across the United States, Ireland, India, and Australia;
operator of Toast POS (the restaurant-grade point-of-sale terminal flagship),
Toast Online Ordering (the direct-channel website ordering surface), Toast
Delivery Services (the in-house delivery dispatch product), Toast Mobile
Order & Pay (the QR-code in-restaurant ordering surface), Toast Payroll
(the restaurant-payroll product acquired through StratEx in 2019), Toast
Capital (the merchant-cash-advance product), Toast Now (the COVID-era
direct-to-consumer marketing suite), Toast Pickup & Delivery (the
multi-location dispatch product), Toast Catering & Events (the catering-
order product), Toast Gift Cards (the loyalty-and-gifting product), Toast
Loyalty (the rewards product), and Toast Marketing (the email/SMS marketing
product) lines that anchor the restaurant-tech category alongside Square for
Restaurants, Clover, Lightspeed Restaurant, TouchBistro, and Revel Systems).
Its ~5,000-employee engineering, product, sales, customer-success, and
implementation hiring across Boston, Chicago, Dublin, Bengaluru, Sydney,
Melbourne, and remote-US/Canada/Ireland/India/Australia puts its corporate
openings on the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex,
Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify, and Postman.
Aggregator-callers asking for "all jobs at major restaurant-tech vendors"
must currently either (a) deduce the Greenhouse slug `toast` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match. Both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and breaker
scoping.

The gap closes when we add a thin company-direct plugin pinning the
`toast` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-three times (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury,
Buildkite, CircleCI, Ramp Network, Netlify, Postman). Toast introduces
**variant 8** (the careers-subdomain marketing-site shape on a sub-brand
domain `careers.toasttab.com/jobs?gh_jid=<id>`) — the first plugin in the
cohort to use a sub-brand domain (`toasttab.com`, the operating product
domain) rather than the slug-name brand domain (`toast.com`).

## 2. Goals

- Ship a `source-company-toast` plugin returning live `JobPostDto` rows
  for the public Toast careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-postman` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.TOAST` enum value, `id` prefixed `toast-`) — Postman is the
  closest structural cousin in description-pipeline shape because both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND emit a wire
  `company_name` matching the bare brand name byte-for-byte (no legal-entity
  suffix). Toast introduces **one** new structural deviation: the variant-8
  fallback URL shape `https://careers.toasttab.com/jobs?gh_jid=<id>` (the
  first plugin in the cohort to publish on a careers-subdomain on a sub-brand
  product domain). Toast is the **eighth** wire-shape variant in the
  cohort and the **eleventh** plugin to use the entity-decode-then-tag-strip
  description pipeline.
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Toast.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'toast'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-postman` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Toast's USD / CAD / EUR / GBP / INR / AUD listings
  (Boston / Chicago / Dublin / Bengaluru / Sydney / Melbourne / remote)
  without modification.
- Backfilling historical Toast postings — only the open-roles slice
  the Greenhouse public API returns.
- Wire `departments[0].name` colon-separated path normalisation — Toast's
  departments are nested via `' : '` separators (e.g. `'Sales :
  International : Horizon 2'`, `'R & D : Engineering : Retail'`). The plugin
  emits the wire path byte-for-byte; consumers wanting the leaf department
  segment can split on `' : '` themselves. A future spec can introduce a
  generic Greenhouse colon-path leaf extractor if needed across multiple
  tenants.
- Sub-brand domain canonicalisation — Toast's careers permalink lives on
  the operating product domain `toasttab.com` rather than the slug-name
  brand domain `toast.com`. The plugin emits the wire `absolute_url`
  byte-for-byte; consumers wanting the corporate-brand domain alias can
  rewrite themselves. A future spec can introduce a generic sub-brand-to-
  corporate-brand domain rewriter if needed across multiple tenants.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.TOAST`** in the source
> registry, so that **a single `siteType: [Site.TOAST]` request returns
> Toast's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `careers.<sub-brand>.com/jobs?gh_jid=<id>` careers-subdomain on a
> sub-brand product domain (variant 8) with the entity-decode-then-tag-
> strip description pipeline AND the spaced-ampersand colon-separated
> nested-department-path pass-through**, so that **adding the next
> Greenhouse-only employer that publishes its `absolute_url` on a
> careers subdomain on a sub-brand product domain costs ≤ 1 spec and
> ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Toast**, so that **a Greenhouse outage on the Toast
> board does not trip the breaker for every other Greenhouse tenant**
> the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.TOAST = 'toast'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-toast` under `packages/plugins/`.                   | must     |
| FR-3  | `ToastService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `toast-`, `site === Site.TOAST`, and `companyName === 'Toast'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/toast.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **variant-8** careers-subdomain on a sub-brand product domain shape `https://careers.toasttab.com/jobs?gh_jid=<id>` — the first plugin in the cohort to use a sub-brand product-domain careers subdomain (Spec 055 § 10 D-04). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ToastModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-toast/src/toast.service.ts
@SourcePlugin({ site: Site.TOAST, name: 'Toast', category: 'company' })
@Injectable()
export class ToastService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/toast/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `toast-${listing.id}`,
  site:         Site.TOAST,
  title:        listing.title ?? '',
  companyName:  'Toast',
  jobUrl:       listing.absolute_url ?? `https://careers.toasttab.com/jobs?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/toast.service.spec.ts`):**
  1. NestJS DI resolves `ToastService` through `ToastModule`.
  2. `Site.TOAST === 'toast'` literal pin.
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

- **D-01 (run #265):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Toast's
  `https://careers.toasttab.com/jobs?gh_jid=<id>` careers-subdomain
  marketing-site URL is the wire-canonical detail-page proxy on
  the wire (variant 8 family) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise the
  exact same Greenhouse public-API wire format from `source-company-postman`,
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
- **D-02 (run #265):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'toast'`.
- **D-03 (run #265):** No salary parser hook beyond the helpers defaults
  — Toast posts USD / CAD / EUR / GBP / INR / AUD ranges (Boston /
  Chicago / Dublin / Bengaluru / Sydney / Melbourne / remote-US/Canada/
  Ireland/India/Australia HQ + offices) inside the Greenhouse `content`
  field; Spec 014 / 015's parser already covers the relevant currencies
  without modification; no Spec 055-specific salary logic.
- **D-04 (run #265):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **variant-8 careers-subdomain on a
  sub-brand product domain** template
  `https://careers.toasttab.com/jobs?gh_jid=<id>`. Rationale: Toast's
  tenant publishes its `absolute_url` on the marketing-site careers
  subdomain on the **operating product domain** `toasttab.com` rather than
  the slug-name brand domain `toast.com` — confirmed via run #265's HTTP
  200 probe of the live API where the first job's `absolute_url` is
  `https://careers.toasttab.com/jobs?gh_jid=7384733`. This is the **first
  plugin in the cohort to use a sub-brand product domain** rather than the
  slug-name brand domain. The variant-8 shape is structurally similar to
  Klaviyo's variant 3 (`www.<company>.com/careers/jobs?gh_jid=<id>` —
  apex-www marketing-site, query-param-only) in that both use the marketing
  site as the proxy and identify the listing through the `gh_jid` query
  parameter alone (no `<id>` in the path), but variant 8 uses the
  `careers.<sub-brand>.com` careers-subdomain shape rather than the
  `www.<company>.com/careers` apex-www-with-careers-path shape, AND
  variant 8 publishes on a sub-brand product domain (`toasttab.com`)
  rather than the slug-name brand domain (`toast.com`). Functional impact
  is zero because Greenhouse populates `absolute_url` on every Toast
  listing in practice (the fallback is a defence-in-depth path Greenhouse
  has not actually exercised against this tenant in the audit window).
  The unit-test happy path includes a regression guard asserting the
  wire `absolute_url` flows through to `jobUrl` byte-for-byte AND that
  the emitted `jobUrl` contains the literal `careers.toasttab.com`
  substring AND the literal `?gh_jid=` substring (locking the variant-8
  shape against future refactors that might naively normalise to a
  permalink-subdomain or slug-name brand-domain template).
- **D-05 (run #265):** Use Greenhouse slug `toast` (the lowercase
  slug-name brand). Rationale: like Postman (Spec 054 § 10 D-05), Netlify
  (Spec 053 § 10 D-05), Ramp Network (Spec 052 § 10 D-05), CircleCI (Spec
  051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10
  D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo
  (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044
  § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05),
  Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart
  (Spec 039 § 10 D-05), and unlike Robinhood (Spec 026 § 10 D-05),
  Toast's Greenhouse tenant is published at the slug `toast` (the
  slug-name brand) with no slug-vs-display-name asymmetry — note that
  the `toasttab` slug also returns HTTP 404, confirming the slug is
  `toast` not `toasttab` even though the careers subdomain lives on
  `toasttab.com`. Confirmed via run #265's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/toast/jobs?content=true` (332
  open roles returned at probe time) AND the 404 probe of
  `https://api.greenhouse.io/v1/boards/toasttab/jobs?content=true`.
- **D-06 (run #265):** Class names are `ToastService` /
  `ToastModule` (PascalCase splitting on the single-word brand name).
  Rationale: matches the convention Toast's own marketing /
  GitHub / Crunchbase pages use for class-style references to the brand
  (`Toast`), and aligns with the existing repo PascalCase convention
  for single-word brands (e.g. `PostmanService`, `NetlifyService`,
  `BuildkiteService`).
- **D-07 (run #265):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `rampnetwork` shipped run #262; `netlify` shipped
  run #263; `postman` shipped run #264; `hubspot`, `toast`, `webflow`,
  `zoominfo` remained queued). Run #265's start-of-run probe of `toast`
  returned HTTP 200 with 332 open roles. Toast is alphabetically the
  next remaining candidate (`toa` < `web` < `zoo`; HubSpot continues to
  be deferred — last re-probed at run-262 start with `meta.total ===
  0`). The remaining candidates queue up for runs #266+: Webflow
  (variant 2, ~31 jobs), ZoomInfo (variant 3 family — apex-www
  `careers?gh_jid=<id>`, ~82 jobs, with a wire `company_name`
  `'ZoomInfo Technologies LLC'` legal-entity suffix to clean — first
  since Affirm / Gusto), HubSpot re-probe, plus a fresh probe sweep
  pivot if all pre-probed candidates ship.
- **D-08 (run #265):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10
  D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10 D-08),
  Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08), Gusto
  (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 §
  10 D-08), and Klaviyo (Spec 045 § 10 D-08), Toast's tenant emits HTML-
  entity-encoded content (`&lt;p&gt;Toast creates technology...`) rather
  than raw HTML tags (`<p>Toast creates technology...`) — confirmed via
  run #265's HTTP probe of the live API where the first job's `content`
  starts with `&lt;p&gt;Our mission is to empower the global restaurant
  community...`. Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place (because they are not actual
  `<…>` tags), producing user-facing descriptions full of `&lt;p&gt;`
  and `&amp;nbsp;` substrings. Decoding entities **first** (turning
  `&lt;p&gt;` into `<p>` and `&amp;nbsp;` into `&nbsp;`) and then
  stripping tags (turning `<p>Toast creates...</p>` into `Toast
  creates...`) yields clean readable text. The pipeline is order-
  sensitive — `decodeHtmlEntities()` must run before `stripHtmlTags()`.
  The unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&amp;nbsp;`
  (named entities decoded), (c) does not contain `&#39;` (numeric
  entities decoded), and (d) does not contain `<p>`, `<strong>`, or
  `<em>` (tags stripped after the decode pass), so a future refactor
  that swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **eleventh** company-direct plugin in the
  cohort to use the entity-decode-then-tag-strip pipeline (the first
  ten being Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI,
  Ramp Network, Netlify, and Postman).
- **D-09 (run #265):** Emit the wire `company_name` `'Toast'` directly
  (no brand-name trim required). Rationale: Toast's wire `company_name`
  is the bare brand name `'Toast'` — confirmed via run #265's HTTP probe
  of the live API where the returned job has `company_name === "Toast"`
  (no `, Inc.` suffix, no `Toast Inc.` legal-entity suffix). This matches
  Postman (Spec 054 § 10 D-09), Netlify (Spec 053 § 10 D-09), Ramp
  Network (Spec 052 § 10 D-09), CircleCI (Spec 051 § 10 D-09), Buildkite
  (Spec 050 § 10 D-09), and Mercury (Spec 049 § 10 D-09) — all seven pin
  the brand name byte-for-byte against the wire — and contrasts with
  Gusto (Spec 048 § 10 D-09) and Affirm (Spec 044 § 10 D-06), both of
  which emit a wire `company_name` with a legal-entity suffix that
  needed cleaning to the brand name. The plugin pins `companyName ===
  'Toast'` as a string literal in the `JobPostDto` mapping (rather
  than reading `listing.company_name`) for byte-stable consistency with
  the other forty-three company-direct plugins — every prior
  company-direct plugin uses a string literal for `companyName`, and
  Toast follows the same convention. The unit-test happy path asserts
  the emitted `companyName === 'Toast'` to lock the brand-name pin
  against future refactors that might mistakenly read the wire payload.
- **D-10 (run #265):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, Toast's tenant emits clean trimmed titles in every observed
  listing — confirmed via run #265's HTTP probe of the live API where
  the returned jobs have titles with no leading or trailing whitespace
  (e.g. `'Account Executive - Melbourne'`, `'Bilingual Business
  Development Representative (Mandarin)'`). Skipping the trim is
  consistent with the Postman / Netlify / CircleCI / Mercury / Gusto /
  Klaviyo / Ramp Network template (39 of 43 prior cohort plugins skip
  the trim; only Brex and Buildkite apply it).
- **D-11 (run #265):** The Toast wire `departments[0].name` payload uses
  a colon-separated nested-path format with **spaced ampersands** in the
  category names (e.g. `'Sales : International : Horizon 2'`,
  `'R & D : Engineering : Retail'`, `'G & A : Finance GL Accounting'`,
  `'COGS : Services COGS : International Horizon 2'`,
  `'Customer Success : Customer Care : POS'`). The plugin emits the
  wire path byte-for-byte (no leaf extraction, no ampersand
  normalisation) — consumers wanting the leaf department segment can
  split on `' : '` themselves. The unit-test happy path includes a
  regression guard asserting (a) the emitted `department` for the first
  fixture listing is the colon-separated nested path
  `'Sales : International : Horizon 2'` byte-for-byte AND matches the
  wire `departments[0].name` byte-for-byte (D-11 first-instance guard
  for the colon-separated nested-path pass-through), (b) the emitted
  `department` for the second fixture listing is
  `'Sales : Sales Acceleration'` byte-for-byte (different leaf, same
  Sales root, exercising the path diversity), and (c) the case-
  insensitive `searchTerm` filter on `'horizon'` correctly matches the
  literal `'Horizon 2'` leaf segment in the first listing's department
  path (D-11 case-insensitive nested-path-search regression guard).
  Toast is the **first plugin in the cohort to ship a fixture with
  colon-separated nested-path department names** — distinct from
  Netlify's `'R&D'` literal-ampersand single-word departments (Spec 053
  § 10 D-11, no spacing around the ampersand, no nesting) and from
  every prior cohort plugin's flat single-segment department names
  (e.g. Postman's `'Sales'`, Mercury's `'Engineering'`).

## 11. References

- `packages/plugins/source-company-postman/src/postman.service.ts` —
  closest structural cousin in description-pipeline shape (Greenhouse-
  backed company-direct, shipped Spec 054 / run #264; uses the entity-
  decode pipeline with the bare brand-name pin).
- `packages/plugins/source-company-klaviyo/src/klaviyo.service.ts` —
  closest cousin in URL shape (variant 3 — apex-www marketing-site
  query-param-only; Toast's variant 8 shares the query-param-only
  identification pattern but uses a careers-subdomain on a sub-brand
  product domain).
- `packages/plugins/source-company-netlify/src/netlify.service.ts` —
  the prior variant-2 plugin (Spec 053 / run #263; uses the entity-
  decode pipeline; the closest cousin for the ampersand-bearing
  department-name pass-through, but Netlify's `'R&D'` form is no-space
  ampersand and single-segment, while Toast's `'R & D : Engineering :
  Retail'` form is space-bracketed ampersand and colon-nested).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
