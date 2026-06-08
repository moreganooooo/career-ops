# Spec: 060 — Source Company Plugin: Elastic

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 060                                                                                                                                                                                    |
| Slug           | source-company-elastic                                                                                                                                                                 |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #270)                                                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059 |

## 1. Problem Statement

Run #269's Spec 059 closed out by shipping the **dominant US neobank /
challenger-bank / consumer-fintech** vendor (Chime) — the **first plugin
in the cohort to use wire-shape variant 10** (the legacy hosted-board apex
`https://boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`) — and queued
runs #270+ to walk the run-268 fresh-sweep live-board pool alphabetically
(`elastic` 193 jobs, `intercom` 174 jobs, `mixpanel` 51 jobs, plus a
HubSpot re-probe pivot). The catalogue still has no entry for the dominant
**search / observability / security analytics platform** vendor — Elastic
NV (founded by Shay Banon and Steven Schuurman in 2012 and incorporated
in Amsterdam in the Netherlands; the developer-and-vendor of the Elastic
Stack — Elasticsearch (the distributed search and analytics engine),
Kibana (the observability dashboard surface), Logstash (the log-ingest
pipeline), Beats (the lightweight data shippers); now a NYSE-listed
public company under ticker `ESTC`; operator of Elastic Cloud (the
managed-search SaaS flagship), Elastic Observability (the observability
suite), Elastic Security (the SIEM / endpoint-security suite), and Elastic
Search AI Platform (the search + AI orchestration umbrella) lines that
anchor the search-and-observability category alongside Splunk, Datadog,
Dynatrace, New Relic, Sumo Logic, Solr / Lucene-derivatives, and
OpenSearch). Its multi-thousand-employee engineering, sales, customer-
success, support, marketing, finance, people, and corporate hiring across
its remote-first global posture (United States, United Kingdom, Germany,
France, Spain, the Netherlands, Ireland, Singapore, Japan, Australia,
India, and a long tail of regional offices) puts its corporate openings
on the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, and Chime. Aggregator-callers asking
for "all jobs at major search / observability platforms" must currently
either (a) deduce the Greenhouse slug `elastic` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match — both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct
plugins sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry
that aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`elastic` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-eight times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime).

## 2. Goals

- Ship a `source-company-elastic` plugin returning live `JobPostDto` rows
  for the public Elastic careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-attentive` plugin (Greenhouse-backed, `category:
  'company'`, `Site.ELASTIC` enum value, `id` prefixed `elastic-`) —
  Attentive is the closest structural cousin because both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND both apply a
  wire-title `.trim()` (D-10) on a subset of titles. Elastic introduces
  **one structural deviation** from the Attentive template:
  1. **D-04 — wire-shape variant 11 fallback URL** — Elastic's tenant
     publishes its `absolute_url` on a **vanity-domain** shape
     `https://jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` (the custom
     `jobs.elastic.co` host hosting the rendered Greenhouse iframe; the
     `gh_jid=<id>&gh_jid=<id>` duplicate query parameter is the wire form
     Greenhouse emits for vanity-domain tenants — the second `gh_jid`
     reflects the same listing id as the first, repeated literally on
     the wire). This is the **first plugin in the cohort** to use this
     wire shape — variant 11 — distinct from variant 1's
     `boards.greenhouse.io/<slug>` apex shape, variant 2's
     `job-boards.greenhouse.io/<slug>` US-region permalink subdomain,
     and variant 10's legacy hosted-board apex
     `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` shape. The
     plugin's fallback `jobUrl` constructor mirrors this byte-for-byte
     including the duplicate `gh_jid=<id>&gh_jid=<id>` query suffix.
- Apply the **D-10 wire-title `.trim()`** deviation, since 16 of the
  193 wire titles in the run-270 probe carry trailing ASCII-space
  padding (`'Account Executive '`, `'Consulting Architect, Public
  Sector - Netherlands '`, `'Customer Architect - EMEA Central '`,
  `'Enterprise Account Executive '`, etc.). Fifth plugin in the cohort
  to apply D-10 (after Brex `Spec 047 § 10 D-10`, Buildkite
  `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`, and Attentive
  `Spec 058 § 10 D-10`).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Elastic.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'elastic'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-attentive` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Elastic's USD / EUR / GBP / SGD / JPY / AUD / INR
  ranges (the global remote-first posture spans the full multi-currency
  range without modification).
- Backfilling historical Elastic postings — only the open-roles slice
  the Greenhouse public API returns.
- Normalising the duplicate `gh_jid=<id>&gh_jid=<id>` query parameter on
  the variant-11 wire `absolute_url`. The plugin emits the wire shape
  byte-for-byte (D-04 mirrors wire); the fallback constructor mirrors
  the wire shape byte-for-byte including the duplicated query parameter.
  Consumers wanting the deduplicated query form can normalise themselves
  at fetch time.
- Following the vanity-domain `jobs.elastic.co` redirect to its
  Greenhouse-hosted iframe target. The plugin emits the vanity URL
  byte-for-byte; consumers needing the underlying Greenhouse permalink
  can follow the redirect themselves at fetch time.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ELASTIC`** in the source
> registry, so that **a single `siteType: [Site.ELASTIC]` request returns
> Elastic's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 11
> (vanity-domain `jobs.<brand>.co/jobs?gh_jid=<id>&gh_jid=<id>`),
> the entity-decode-then-tag-strip description pipeline, AND a wire-title
> `.trim()`**, so that **adding the next Greenhouse-only employer that
> publishes its `absolute_url` on a vanity domain costs ≤ 1 spec
> and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Elastic**, so that **a Greenhouse outage on the
> Elastic board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ELASTIC = 'elastic'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-elastic` under `packages/plugins/`.                 | must     |
| FR-3  | `ElasticService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `elastic-`, `site === Site.ELASTIC`, and `companyName === 'Elastic'` (wire `company_name` is already the bare brand `'Elastic'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/elastic.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **vanity-domain** shape `https://jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` — variant 11 (the **first** plugin in the cohort to use this shape; Spec 060 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to `listing.title` before downstream filters and emit, since 16 of 193 wire titles in the run-270 probe carry trailing ASCII-space padding. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ElasticModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-elastic/src/elastic.service.ts
@SourcePlugin({ site: Site.ELASTIC, name: 'Elastic', category: 'company' })
@Injectable()
export class ElasticService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/elastic/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `elastic-${listing.id}`,
  site:         Site.ELASTIC,
  title:        (listing.title ?? '').trim(),  // D-10
  companyName:  'Elastic',
  jobUrl:       listing.absolute_url ?? `https://jobs.elastic.co/jobs?gh_jid=${listing.id}&gh_jid=${listing.id}`,
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

- **Unit (`__tests__/elastic.service.spec.ts`):**
  1. NestJS DI resolves `ElasticService` through `ElasticModule`.
  2. `Site.ELASTIC === 'elastic'` literal pin.
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

- **D-01 (run #270):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Elastic's
  `https://jobs.elastic.co/jobs?gh_jid=<id>` vanity-domain landing page
  is itself a Greenhouse iframe — the canonical machine-readable feed
  for this tenant is the `api.greenhouse.io/v1/boards/elastic/jobs`
  public endpoint. We already exercise the broader Greenhouse public-API
  pattern from forty-eight prior company-direct plugins.
- **D-02 (run #270):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'elastic'`.
- **D-03 (run #270):** No salary parser hook beyond the helpers
  defaults — Elastic posts USD / EUR / GBP / SGD / JPY / AUD / INR
  ranges (its global remote-first posture spans the full multi-currency
  range) inside the Greenhouse `content` field; Spec 014 / 015's parser
  already covers the relevant currencies without modification.
- **D-04 (run #270):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **vanity-domain** template
  `https://jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` — wire-shape
  variant 11. This is the **first** plugin in the cohort to use
  variant 11 (the custom `jobs.elastic.co` host hosting the rendered
  Greenhouse iframe; the `gh_jid=<id>&gh_jid=<id>` duplicate query
  parameter is the wire form Greenhouse emits for vanity-domain
  tenants — the second `gh_jid` reflects the same listing id as the
  first, repeated literally on the wire). Rationale: Elastic's tenant
  publishes its `absolute_url` on this shape — confirmed via run #270's
  HTTP 200 probe of the live API where the first job's `absolute_url` is
  `https://jobs.elastic.co/jobs?gh_jid=7505982&gh_jid=7505982`. The
  duplicated `gh_jid` query parameter is preserved in the fallback
  constructor byte-for-byte. Functional impact is zero because
  Greenhouse populates `absolute_url` on every Elastic listing in
  practice (the fallback is a defence-in-depth path Greenhouse has not
  actually exercised against this tenant in the audit window). The
  unit-test happy path includes a regression guard asserting (a) the
  wire `absolute_url` flows through to `jobUrl` byte-for-byte AND that
  the emitted `jobUrl` contains the literal `jobs.elastic.co`
  substring AND the literal `gh_jid=` substring AND the duplicate
  `gh_jid=<id>&gh_jid=<id>` pattern AND must NOT contain the
  `boards.greenhouse.io` substring (locking the variant-11 vanity-
  domain shape against future refactors that might naively normalise
  to a variant-1, variant-2, or variant-10 Greenhouse-host template).
- **D-05 (run #270):** Use Greenhouse slug `elastic` (the lowercase
  brand name). Rationale: like Chime (Spec 059 § 10 D-05), Attentive
  (Spec 058 § 10 D-05), Webflow (Spec 056 § 10 D-05), Toast (Spec 055
  § 10 D-05), Postman (Spec 054 § 10 D-05), Netlify (Spec 053 § 10
  D-05), Ramp Network (Spec 052 § 10 D-05), CircleCI (Spec 051 § 10
  D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10 D-05),
  Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo
  (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044
  § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05),
  Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart
  (Spec 039 § 10 D-05), ZoomInfo (Spec 057 § 10 D-05), and unlike
  Robinhood (Spec 026 § 10 D-05), Elastic's Greenhouse tenant is
  published at the slug `elastic` with no slug-vs-display-name asymmetry.
  Confirmed via run #270's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/elastic/jobs?content=true` (193
  open roles returned).
- **D-06 (run #270):** Class names are `ElasticService` / `ElasticModule`
  (PascalCase from the bare-brand single-word name). Rationale: matches
  the convention Elastic's own marketing / GitHub / NYSE filings use
  for class-style references to the brand (`Elastic`), and aligns with
  the existing repo PascalCase convention for single-word brands (e.g.
  `ChimeService`, `AttentiveService`, `WebflowService`, `MercuryService`).
- **D-07 (run #270):** Selected from the **run-268 fresh-sweep
  live-board pool**, alphabetically-next bite after Chime (`ela` <
  `int` < `mix`). The two remaining live-board pool members (Intercom,
  Mixpanel — plus a HubSpot re-probe pivot) queue up for runs #271+.
  Confirmed via run #270's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/elastic/jobs?content=true`
  returning 193 open roles. The HubSpot re-probe at run-270 start
  returned HTTP 200 with `meta.total === 0` — eighth-consecutive empty
  re-probe across runs #262–#270; HubSpot remains deferred.
- **D-08 (run #270):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Chime (Spec 059 § 10 D-08), Attentive
  (Spec 058 § 10 D-08), ZoomInfo (Spec 057 § 10 D-08), Webflow (Spec
  056 § 10 D-08), Toast (Spec 055 § 10 D-08), Postman (Spec 054 § 10
  D-08), Netlify (Spec 053 § 10 D-08), Ramp Network (Spec 052 § 10
  D-08), CircleCI (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10
  D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10 D-08),
  Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and Klaviyo
  (Spec 045 § 10 D-08), Elastic's tenant emits HTML-entity-encoded
  content (`&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;
  Elastic, the Search AI Company, enables everyone to find the answers
  they need in real time...`) rather than raw HTML tags — confirmed
  via run #270's HTTP probe of the live API (193 of 193 wire jobs
  carry HTML entities; 0 of 193 carry raw tags). Applying
  `stripHtmlTags()` alone to that wire payload would leave the literal
  entities in place. Decoding entities **first** and then stripping
  tags yields clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), (c) does not contain `&#39;` (numeric
  entities decoded), and (d) does not contain `<p>`, `<div>`,
  `<strong>`, or `<em>` (tags stripped after the decode pass), so a
  future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **sixteenth**
  company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #270):** Brand-name trim D-09 is **omitted**. Rationale:
  Elastic's wire `company_name` is `'Elastic'` byte-for-byte (the bare
  brand name; no legal-entity suffix on the wire — confirmed via
  run-270 probe where 193 of 193 wire jobs carry `company_name ===
  'Elastic'`). The plugin reads `listing.company_name` directly without
  a string-literal pin, but the unit-test happy path asserts the
  emitted `companyName === 'Elastic'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a legal-entity
  suffix; if such a rename happens, a follow-up patch can re-introduce
  D-09 as a one-line edit.
- **D-10 (run #270):** Apply `.trim()` to `listing.title` before
  downstream filters and emit. Rationale: 16 of the 193 wire titles in
  the run-270 probe carry trailing ASCII-space padding (`'Account
  Executive '`, `'Consulting Architect, Public Sector - Netherlands '`,
  `'Customer Architect - EMEA Central '`, `'Enterprise Account
  Executive '`, etc. — 8.3 % of the open roles). The plugin trims via
  `.trim()` to give downstream consumers the non-padded form for
  display, sort, and equality checks. This is the **fifth plugin in
  the cohort** to apply D-10 (after Brex `Spec 047 § 10 D-10`,
  Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`, and
  Attentive `Spec 058 § 10 D-10`). The unit-test happy path asserts
  (a) at least one fixture title carries trailing pad bytes pre-emit
  AND (b) the emitted `title === fixture.jobs[i].title.trim()`
  byte-for-byte AND (c) `searchTerm`'s case-insensitive substring
  filter still matches a padded fixture title via the trim
  (regression-guards against a future refactor that drops the `.trim()`
  before the searchTerm filter and exposes the pad bytes to the
  downstream string compare).
- **D-11 (run #270):** The Elastic wire `departments[0].name` payload
  uses **compound `' - '`-separated department names** that scope
  region within line-of-business: `'Sales - EMEA - UKI'`, `'Sales -
  APJ - India'`, `'Sales - EMEA - North'`, `'Sales - EMEA - Central'`,
  `'Sales - AMER - Management and Support'`, `'Sales - AMER Canada'`,
  `'Customer Architects - EMEA'`, `'Consulting - EMEA'`, `'SA -
  Global'`, `'Strategic Sourcing'`, etc. — distinct from Chime's flat
  single-token format, ZoomInfo's numeric-code-prefix format, and
  Toast's colon-separated nested-path format. The plugin emits the
  wire string byte-for-byte (no normalisation, no token splitting
  on `' - '`, no regional-prefix stripping) — consumers wanting
  per-region or per-line-of-business analytics get the wire form
  directly and can split themselves. The unit-test happy path includes
  a regression guard asserting the emitted `department` for the first
  fixture listing (`'Sales - EMEA - UKI'`) matches the wire
  `departments[0].name` byte-for-byte AND that the case-insensitive
  `searchTerm` match on the literal `'sales'` substring resolves the
  `'Sales - EMEA - UKI'` first listing AND that the case-insensitive
  `searchTerm` match on the literal `'engineering'` substring resolves
  the second-listing fixture's `'Engineering'` department.

## 11. References

- `packages/plugins/source-company-attentive/src/attentive.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 058 / run #268; uses variant 2 with the entity-decode pipeline
  and one wire-title `.trim()` deviation — Elastic shares the D-08
  entity-decode pipeline and the D-10 wire-title `.trim()` deviation
  but adds a D-04 variant-11 fallback URL).
- `packages/plugins/source-company-chime/src/chime.service.ts` —
  the prior wire-shape variant cousin (Spec 059 / run #269; uses
  variant 10 — legacy `boards.greenhouse.io` apex — and a brand-name
  trim D-09 deviation that Elastic does not apply).
- `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts` —
  the prior simultaneous D-08 + D-10 cousin (Spec 057 § 10 D-08, D-10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
