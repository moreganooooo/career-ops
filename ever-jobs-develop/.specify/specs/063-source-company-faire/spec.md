# Spec: 063 — Source Company Plugin: Faire

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 063                                                                                                                                                                                    |
| Slug           | source-company-faire                                                                                                                                                                   |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #273)                                                                                                                                                                      |
| Created        | 2026-05-03                                                                                                                                                                             |
| Last updated   | 2026-05-03                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062 |

## 1. Problem Statement

Run #272's Spec 062 closed out the **run-268 fresh-sweep live-board
pool** (Chime / Spec 059, Elastic / Spec 060, Intercom / Spec 061,
Mixpanel / Spec 062, plus the earlier Attentive / Spec 058 and ZoomInfo
/ Spec 057), and queued runs #273+ to pivot to a **third fresh probe
sweep** targeting the next batch of large-employer candidates (Notion,
Linear, Loom, Front, Modern Treasury, Shopify, Square, Adobe,
Salesforce, Atlassian, Slack, Zoom, ServiceNow, Workday, Veeva, Faire,
Whatnot, Anduril, Scale AI, Glean, Perplexity, Mistral, Cohere,
Together AI, Pika, Runway, Synthesia, Eleven Labs, Photoroom, Adept).
The catalogue still has no entry for the dominant **B2B
wholesale-marketplace platform** vendor — Faire Wholesale, Inc.
(founded by Max Rhodes, Daniele Perito, Marcelo Cortes, and Jeff
Kolovson in 2017 in San Francisco; currently a private company after
Series G rounds led by Sequoia Capital, Y Combinator, Forerunner
Ventures, Founders Fund, Khosla Ventures, Lightspeed Venture Partners,
DST Global, and others; now operating from its San Francisco
headquarters plus offices in New York, Toronto, London, Kitchener-
Waterloo, and Salt Lake City, with a remote-first posture across the
United States, Canada, the United Kingdom, and Europe; operator of
Faire Marketplace (the wholesale-buying flagship), Faire Direct (the
brand-direct ordering tool), Faire Open With Faire (the financing
program for small retailers), Faire Insider (the analytics surface for
brands), and Faire Logistics (the fulfilment / shipping backbone) lines
that anchor the wholesale-marketplace category alongside Joor, NuOrder,
RangeMe, Tundra, Abound, Bulletin, and Handshake (Shopify B2B)) — is
published at the bare `faire` Greenhouse slug (the lowercase brand name)
and was confirmed live via run #273's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/faire/jobs?content=true` (72 open
roles returned). Aggregator-callers asking for "all jobs at major
wholesale-marketplace platforms" must currently either (a) deduce the
Greenhouse slug `faire` and call `source-ats-greenhouse` by hand, or
(b) post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`faire` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-one times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman, Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic,
Intercom, Mixpanel).

## 2. Goals

- Ship a `source-company-faire` plugin returning live `JobPostDto`
  rows for the public Faire careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-chime` plugin (Greenhouse-backed, `category:
  'company'`, `Site.FAIRE` enum value, `id` prefixed `faire-`) — Chime
  is the closest structural cousin because both publish `absolute_url`
  on **wire-shape variant 10** (the legacy hosted-board apex
  `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` shape) AND both
  emit HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline. Faire deviates
  from the Chime template on **two** axes: (1) **D-09 omitted** — wire
  `company_name === 'Faire'` byte-for-byte (Chime pinned the brand name
  literal because its wire `company_name` was `'Chime Financial, Inc'`),
  and (2) **D-10 applied** — 3 of 72 wire titles in the run-273 probe
  (~4.2%) carry trailing ASCII-space padding (Chime's titles were all
  trim-clean).
- Apply the **D-10 wire-title `.trim()`** deviation, since 3 of the 72
  wire titles in the run-273 probe (~4.2%) carry trailing ASCII-space
  padding (`'Production Designer, Brand '`, `'Senior Product Marketing
  Manager - Faire Pay '`, `'Staff Product Designer, Discovery
  Experience '`). Eighth plugin in the cohort to apply D-10 (after Brex
  `Spec 047 § 10 D-10`, Buildkite `Spec 050 § 10 D-10`, ZoomInfo
  `Spec 057 § 10 D-10`, Attentive `Spec 058 § 10 D-10`, Elastic
  `Spec 060 § 10 D-10`, Intercom `Spec 061 § 10 D-10`, and Mixpanel
  `Spec 062 § 10 D-10`).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Faire.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'faire'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-chime` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Faire's USD / CAD / GBP / EUR ranges (the San
  Francisco / New York / Toronto / Kitchener-Waterloo / London /
  Salt Lake City posture spans USD + CAD + GBP without modification).
- Backfilling historical Faire postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FAIRE`** in the source
> registry, so that **a single `siteType: [Site.FAIRE]` request returns
> Faire's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 10
> (the legacy `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` apex
> shape, second cohort plugin in this variant after Chime), the
> entity-decode-then-tag-strip description pipeline, AND a wire-title
> `.trim()` against a moderate-size board with a low pad-rate**, so
> that **adding the next Greenhouse-only employer with a low-pad-rate
> wire-title shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Faire**, so that **a Greenhouse outage on the
> Faire board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.FAIRE = 'faire'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-faire` under `packages/plugins/`.                   | must     |
| FR-3  | `FaireService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `faire-`, `site === Site.FAIRE`, and `companyName === 'Faire'` (wire `company_name` is already the bare brand `'Faire'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/faire.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **legacy hosted-board apex** shape `https://boards.greenhouse.io/faire/jobs/<id>?gh_jid=<id>` — variant 10 (the **second** plugin in the cohort to use this shape after Chime; Spec 063 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to `listing.title` before downstream filters and emit, since 3 of 72 wire titles in the run-273 probe (~4.2%) carry trailing ASCII-space padding. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[FaireModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-faire/src/faire.service.ts
@SourcePlugin({ site: Site.FAIRE, name: 'Faire', category: 'company' })
@Injectable()
export class FaireService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/faire/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `faire-${listing.id}`,
  site:         Site.FAIRE,
  title:        (listing.title ?? '').trim(),  // D-10
  companyName:  listing.company_name ?? 'Faire',
  jobUrl:       listing.absolute_url ?? `https://boards.greenhouse.io/faire/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/faire.service.spec.ts`):**
  1. NestJS DI resolves `FaireService` through `FaireModule`.
  2. `Site.FAIRE === 'faire'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive) — even after the D-10 wire-title trim observably fires.
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

- **D-01 (run #273):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Faire's `https://www.faire.com/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board —
  the canonical machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/faire/jobs` public endpoint. We already
  exercise the broader Greenhouse public-API pattern from fifty-one
  prior company-direct plugins.
- **D-02 (run #273):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'faire'`.
- **D-03 (run #273):** No salary parser hook beyond the helpers
  defaults — Faire posts USD / CAD / GBP ranges (its San Francisco /
  New York / Toronto / Kitchener-Waterloo / London / Salt Lake City
  posture) inside the Greenhouse `content` field; Spec 014 / 015's
  parser already covers the relevant currencies without modification.
- **D-04 (run #273):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **legacy hosted-board apex** template
  `https://boards.greenhouse.io/faire/jobs/<id>?gh_jid=<id>` — wire-
  shape variant 10. This is the **second** plugin in the cohort to use
  variant 10 (after Chime / Spec 059 — distinct from variant 1's
  `boards.greenhouse.io/<slug>` bare-board apex shape, variant 2's
  modern US-region permalink subdomain `job-boards.greenhouse.io/<slug>/
  jobs/<id>` shape used by Vercel, Affirm, Gusto, Mercury, Buildkite,
  Netlify, Postman, Webflow, Attentive, Intercom, and Mixpanel, and
  variant 11's vanity-domain `jobs.<brand>.<tld>/jobs?gh_jid=<id>&
  gh_jid=<id>` shape used by Elastic). Rationale: Faire's tenant
  publishes its `absolute_url` on this shape — confirmed via run #273's
  HTTP 200 probe of the live API where the first job's `absolute_url`
  is `https://boards.greenhouse.io/faire/jobs/8510205002?gh_jid=8510205002`.
  Functional impact is zero because Greenhouse populates `absolute_url`
  on every Faire listing in practice (the fallback is a defence-in-depth
  path Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `boards.greenhouse.io` substring AND the literal `/faire/jobs/`
  substring AND the literal `?gh_jid=` substring AND must NOT contain
  `job-boards.greenhouse.io` (locking the variant-10 shape against
  future refactors that might naively normalise to a variant-2 or
  variant-11 template).
- **D-05 (run #273):** Use Greenhouse slug `faire` (the lowercase brand
  name). Rationale: like Mixpanel (Spec 062 § 10 D-05), Intercom (Spec
  061 § 10 D-05), Elastic (Spec 060 § 10 D-05), Chime (Spec 059 § 10
  D-05), Attentive (Spec 058 § 10 D-05), Webflow (Spec 056 § 10 D-05),
  Toast (Spec 055 § 10 D-05), Postman (Spec 054 § 10 D-05), Netlify
  (Spec 053 § 10 D-05), Ramp Network (Spec 052 § 10 D-05), CircleCI
  (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec
  049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10
  D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05),
  Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec
  042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10
  D-05), Instacart (Spec 039 § 10 D-05), ZoomInfo (Spec 057 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Faire's Greenhouse tenant
  is published at the slug `faire` with no slug-vs-display-name
  asymmetry. Confirmed via run #273's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/faire/jobs?content=true` (72 open
  roles returned).
- **D-06 (run #273):** Class names are `FaireService` / `FaireModule`
  (PascalCase from the bare-brand single-word name). Rationale: matches
  the convention Faire's own marketing / GitHub / press use for class-
  style references to the brand (`Faire`), and aligns with the existing
  repo PascalCase convention for single-word brands (e.g.
  `MixpanelService`, `IntercomService`, `ElasticService`,
  `ChimeService`, `AttentiveService`, `WebflowService`,
  `MercuryService`).
- **D-07 (run #273):** Selected from the **run-272 third-fresh-sweep
  candidate pool**, alphabetically-earliest live-board hit after the
  fresh probe. Run #273's probe sweep across 30 candidate slugs
  (`notion`, `linear`, `loom`, `front`, `moderntreasury`, `shopify`,
  `square`, `adobe`, `salesforce`, `atlassian`, `slack`, `zoom`,
  `servicenow`, `workday`, `veeva`, `faire`, `whatnot`, `anduril`,
  `scaleai`, `glean`, `perplexity`, `mistral`, `cohere`, `together`,
  `pika`, `runway`, `synthesia`, `elevenlabs`, `photoroom`, `adept`)
  found exactly **two** live boards on Greenhouse: `faire` (HTTP 200, 72
  roles) and `scaleai` (HTTP 200, 170 roles). The other 28 slugs all
  returned HTTP 404 — those tenants are either not on Greenhouse, on
  authenticated-only Greenhouse boards, or use a non-public ATS
  (probable: Lever, Ashby, Workday native, Workable, etc.). `faire` <
  `scaleai` lexically, so this run takes Faire; Scale AI is queued for
  run #274.
- **D-08 (run #273):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Mixpanel (Spec 062 § 10 D-08), Intercom
  (Spec 061 § 10 D-08), Elastic (Spec 060 § 10 D-08), Chime (Spec 059
  § 10 D-08), Attentive (Spec 058 § 10 D-08), ZoomInfo (Spec 057 § 10
  D-08), Webflow (Spec 056 § 10 D-08), Toast (Spec 055 § 10 D-08),
  Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10 D-08), Ramp
  Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10 D-08), Buildkite
  (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048
  § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08),
  and Klaviyo (Spec 045 § 10 D-08), Faire's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;p&gt;&lt;strong&gt;About Faire&lt;/strong&gt;...`) rather than raw
  HTML tags — confirmed via run #273's HTTP probe of the live API (72 of
  72 wire jobs carry HTML entities; 0 of 72 carry raw tags). Applying
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
  as a test diff. This is the **nineteenth** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #273):** Brand-name trim D-09 is **omitted**. Rationale:
  Faire's wire `company_name` is `'Faire'` byte-for-byte (the bare
  brand name; no legal-entity suffix on the wire — confirmed via run-273
  probe where 72 of 72 wire jobs carry `company_name === 'Faire'`,
  distinct from the legal-entity name "Faire Wholesale, Inc." that
  appears in SEC filings and press releases). The plugin reads
  `listing.company_name` directly without a string-literal pin, but
  the unit-test happy path asserts the emitted `companyName === 'Faire'`
  byte-for-byte to lock the observable shape against a future tenant
  rename to add a legal-entity suffix; if such a rename happens, a
  follow-up patch can re-introduce D-09 as a one-line edit. Thirteenth
  cohort plugin to omit D-09 against a single-word bare-brand wire
  `company_name` (after Mixpanel / Spec 062, Intercom / Spec 061,
  Webflow / Spec 056, Attentive / Spec 058, Elastic / Spec 060, plus
  the older Postman / Spec 054, Netlify / Spec 053, Mercury / Spec 049,
  Buildkite / Spec 050, CircleCI / Spec 051, Ramp Network / Spec 052,
  Toast / Spec 055).
- **D-10 (run #273):** Apply `.trim()` to `listing.title` before
  downstream filters and emit. Rationale: 3 of the 72 wire titles in
  the run-273 probe carry trailing ASCII-space padding (`'Production
  Designer, Brand '`, `'Senior Product Marketing Manager - Faire Pay '`,
  `'Staff Product Designer, Discovery Experience '` — ~4.2% pad-rate, a
  low pad-rate that — given Faire's moderate 72-role board — represents
  real wire shape rather than a one-off tenant-side typo). The plugin
  trims via `.trim()` to give downstream consumers the non-padded form
  for display, sort, and equality checks. This is the **eighth plugin
  in the cohort** to apply D-10 (after Brex `Spec 047 § 10 D-10`,
  Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`,
  Attentive `Spec 058 § 10 D-10`, Elastic `Spec 060 § 10 D-10`,
  Intercom `Spec 061 § 10 D-10`, and Mixpanel `Spec 062 § 10 D-10`).
  The unit-test happy path asserts (a) at least one fixture title
  carries trailing pad bytes pre-emit AND (b) the emitted `title ===
  fixture.jobs[i].title.trim()` byte-for-byte AND (c) `searchTerm`'s
  case-insensitive substring filter still matches a padded fixture
  title via the trim (regression-guards against a future refactor that
  drops the `.trim()` before the searchTerm filter and exposes the pad
  bytes to the downstream string compare).
- **D-11 (run #273):** The Faire wire `departments[0].name` payload
  uses **multi-word descriptive department names** (`'Customer Support
  Management'`, `'Engineering'`, `'Product Design'`, `'Marketing'`,
  `'Operations'`, etc.) — partly distinct from Mixpanel's strict flat
  single-token format and Chime's single-token-with-`&`-bytes format,
  but structurally identical to Toast's nested colon-separated names in
  that the wire payload may carry whitespace within a single department
  string. The plugin emits the wire `departments[0].name` byte-for-byte
  (no department-name `.trim()` — the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains semantically
  correct against the wire form). The unit-test happy path includes a
  regression guard asserting the emitted `department` for the first
  fixture listing matches the wire `departments[0].name` byte-for-byte
  AND that the case-insensitive `searchTerm` match on the literal
  `'support'` substring resolves the first-listing fixture's `'Customer
  Support Management'` department.
- **D-12 (run #273):** This plugin **opens** the run-272 third-fresh-
  sweep candidate pool. The pool was opened at run #273 with a HTTP
  probe sweep across 30 candidate slugs; 2 returned live (`faire` 72,
  `scaleai` 170). After Faire ships, the pool retains `scaleai` (170
  roles) for run #274. Subsequent runs will continue to expand the
  third-fresh-sweep pool by adding more candidate slugs (LinkedIn-
  identified large-employer brands not yet probed, e.g. Carta,
  Brightwheel, Maven Clinic, Glossier, Casper, Chewy, Wayfair, Flexport,
  Epic Games, Zendesk, Asana — many of which use Greenhouse as their
  primary public ATS).

## 11. References

- `packages/plugins/source-company-chime/src/chime.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 059 / run #269; uses variant 10 with the entity-decode pipeline
  but NO wire-title `.trim()` deviation — Faire deviates from Chime on
  D-09 omission and D-10 application).
- `packages/plugins/source-company-mixpanel/src/mixpanel.service.ts` —
  the prior cohort plugin (Spec 062 / run #272; same D-08 + D-10 +
  D-09 omission as Faire, but uses variant 2 instead of variant 10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
