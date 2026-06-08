# Spec: 066 — Source Company Plugin: Carta

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 066                                                                                                                                                                                            |
| Slug           | source-company-carta                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #276)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065 |

## 1. Problem Statement

Run #275's Spec 065 closed end-to-end (Cameo shipped — 9 unit tests
green; the **first** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #276+ to take **Carta** next as the alphabetically-second live
hit from that pool (52 roles confirmed at run-275 probe time;
re-confirmed at run-276 start with at least 10 jobs returned by the
HTTP probe sample). Run #276 also re-probes the rolling `hubspot`
candidate to keep the documented "remains deferred" pattern fresh
(fourteenth-consecutive empty re-probe at run-276 start —
`meta.total === 0`).

Carta — operator of the **dominant cap-table-and-equity-management
platform** for venture-backed private companies (founded by Henry Ward
and Manu Kumar in 2012 in Palo Alto, California, originally as eShares;
rebranded to Carta in 2017; currently a private company after Series G
rounds led by Silver Lake, Andreessen Horowitz, Tribe Capital, Lightspeed
Venture Partners, Spark Capital, Goldman Sachs, Tiger Global, and others;
operating with anchor offices in San Francisco, New York, Salt Lake City,
Sydney, and Tokyo; operator of Carta Cap Table (the equity-flagship),
Carta Fund Administration (the LP/GP fund-services surface, the largest
US fund-admin operation by AUM after SS&C and Apex), Carta Equity Plans
(the 409A valuation and ESOP-administration surface), Carta Liquidity
(the secondary-market exchange for private-company shareholders), Carta
Total Comp (the compensation-benchmarking surface), Carta X Tax (the tax-
delivery surface for portfolio-company K-1s and tax filings), and Carta
Market Insights (the private-market-data surface alongside Pitchbook and
Crunchbase) lines that anchor the private-market-infrastructure category
alongside Pulley, Cake, Capdesk, and the wave of cap-table-as-a-service
challengers) — is published at the bare `carta` Greenhouse slug (the
lowercase brand name; no whitespace transform required since the brand
is a single word) and was confirmed live via run #276's HTTP 200 probe
of `https://api.greenhouse.io/v1/boards/carta/jobs?content=true` (52
roles surveyed at run-275 close; sampled at run-276 start showing
multi-page data and at least 10 visible roles). Aggregator-callers
asking for "all jobs at major private-market-infrastructure /
fund-administration / cap-table-platform vendors" must currently either
(a) deduce the Greenhouse slug `carta` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted
role for a company-name match — both paths bypass the per-source health
and circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`carta` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-four times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo).

## 2. Goals

- Ship a `source-company-carta` plugin returning live `JobPostDto`
  rows for the public Carta careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-cameo` plugin (Greenhouse-backed, `category:
  'company'`, `Site.CARTA` enum value, `id` prefixed `carta-`) —
  Cameo is the closest structural cousin because both publish
  `absolute_url` on **wire-shape variant 2** (the modern US-region
  permalink subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`
  shape) AND both emit HTML-entity-encoded content (`&lt;p&gt;...`)
  requiring the entity-decode-then-tag-strip description pipeline AND
  both omit the brand-name trim D-09 against a bare-brand wire
  `company_name`. Carta deviates from the Cameo template on **two**
  axes: (1) **D-10 applied** — at least 1 of 10 wire titles in the
  run-276 probe carries trailing ASCII-space padding (`'Business
  Development Manager, Private Equity '` with a trailing space byte;
  the other 9 surveyed are clean — ~10 % pad rate); the plugin applies
  `.trim()` to the wire `title` before downstream filters and emit;
  (2) **D-11 fully-clean** — Carta's wire `departments[0].name` payload
  is fully trim-clean across the run-276 probe (`'Account Executive'`,
  `'Marketing'`, `'Tax'`, etc.), distinct from Cameo's partial-pad
  pass-through; the plugin emits `listing.departments[0].name`
  byte-for-byte (no `.trim()` needed because no wire-side padding was
  observed). The brand-name handling is the **single-token bare brand**
  form (`'Carta'`), byte-distinct from Cameo's `'Cameo'` and Scale AI's
  multi-token `'Scale AI'` (with internal whitespace), but identical in
  pipeline shape.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Carta.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'carta'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-cameo` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Carta's USD / AUD ranges (the Sydney role
  `'Account Executive, Fund Administration'` carries an AUD posture but
  the helpers handle AUD without modification; the dominant US posture
  is USD).
- Backfilling historical Carta postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CARTA`** in the source
> registry, so that **a single `siteType: [Site.CARTA]` request returns
> Carta's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2
> (the modern US-region permalink subdomain shape, fourteenth cohort
> plugin in this variant) with the entity-decode-then-tag-strip
> description pipeline AND a single-token bare-brand `company_name` AND
> the wire-title `.trim()` deviation AND a fully-clean department
> pass-through**, so that **adding the next Greenhouse-only employer
> with a partly-padded title field and a fully-clean department field
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Carta**, so that **a Greenhouse outage on the
> Carta board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CARTA = 'carta'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-carta` under `packages/plugins/`.                   | must     |
| FR-3  | `CartaService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `carta-`, `site === Site.CARTA`, and `companyName === 'Carta'` (wire `company_name` is the single-token bare brand `'Carta'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/carta.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **modern US-region permalink subdomain** shape `https://job-boards.greenhouse.io/carta/jobs/<id>` — variant 2 (the **fourteenth** plugin in the cohort to use this shape after Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel, Scale AI, and Cameo; Spec 066 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 1 of 10 wire titles in the run-276 probe carries trailing ASCII-space padding (`'Business Development Manager, Private Equity '`); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 10 wire department names in the run-276 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[CartaModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-carta/src/carta.service.ts
@SourcePlugin({ site: Site.CARTA, name: 'Carta', category: 'company' })
@Injectable()
export class CartaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/carta/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `carta-${listing.id}`,
  site:         Site.CARTA,
  title:        (listing.title ?? '').trim(),               // D-10 applied
  companyName:  listing.company_name ?? 'Carta',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/carta/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,     // D-11 byte-for-byte (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/carta.service.spec.ts`):**
  1. NestJS DI resolves `CartaService` through `CartaModule`.
  2. `Site.CARTA === 'carta'` literal pin.
  3. Happy path — fixture with two listings (one clean title, one
     padded title) → two `JobPostDto`s, mapped fields verified
     (including the variant-2 `job-boards.greenhouse.io/carta/jobs/<id>`
     shape lock, the decode-then-strip pipeline cleanliness, the
     single-token bare-brand `companyName === 'Carta'` lock, the D-10
     application — emitted `title` is the trimmed form `'Business
     Development Manager, Private Equity'` — distinct from the wire
     `'Business Development Manager, Private Equity '` with a trailing
     pad byte, and the D-11 fully-clean department pass-through).
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

- **D-01 (run #276):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Carta's `https://carta.com/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board —
  the canonical machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/carta/jobs` public endpoint. We already
  exercise the broader Greenhouse public-API pattern from fifty-four
  prior company-direct plugins.
- **D-02 (run #276):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'carta'`.
- **D-03 (run #276):** No salary parser hook beyond the helpers
  defaults — Carta posts USD ranges (its San Francisco / New York / Salt
  Lake City posture is dominated by USD; the Sydney role carries AUD
  but Spec 014 / 015's parser already covers AUD without modification).
- **D-04 (run #276):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **modern US-region permalink
  subdomain** template `https://job-boards.greenhouse.io/carta/jobs/<id>`
  — wire-shape variant 2. This is the **fourteenth** plugin in the
  cohort to use variant 2 (after Vercel, Affirm, Gusto, Mercury,
  Buildkite, Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel,
  Scale AI, and Cameo — distinct from variant 1's `boards.greenhouse.io/<slug>`
  bare-board apex shape, variant 10's
  `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` legacy hosted-
  board apex shape used by Chime and Faire, and variant 11's vanity-
  domain `jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>` shape used
  by Elastic). Rationale: Carta's tenant publishes its `absolute_url`
  on this shape — confirmed via run #276's HTTP 200 probe of the live
  API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/carta/jobs/7591992003`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Carta listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/carta/jobs/`
  substring AND must NOT contain `?gh_jid=` (locking the variant-2
  shape against future refactors that might naively normalise to a
  variant-10 or variant-11 template).
- **D-05 (run #276):** Use Greenhouse slug `carta` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like Cameo (Spec 065 § 10 D-05), Faire
  (Spec 063 § 10 D-05), Mixpanel (Spec 062 § 10 D-05), Intercom (Spec
  061 § 10 D-05), Elastic (Spec 060 § 10 D-05), Chime (Spec 059 § 10
  D-05), Attentive (Spec 058 § 10 D-05), Webflow (Spec 056 § 10 D-05),
  Toast (Spec 055 § 10 D-05), Postman (Spec 054 § 10 D-05), Netlify
  (Spec 053 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec
  049 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10
  D-05), Klaviyo (Spec 045 § 10 D-05), and Block (Spec 042 § 10 D-05),
  Carta's Greenhouse tenant is published at the bare slug `carta`
  with no slug/wire asymmetry (the wire `company_name` is the
  single-token `'Carta'` byte-for-byte and the slug is `carta`).
  Confirmed via run #276's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/carta/jobs?content=true` (52
  open roles surveyed at run-275 close, sampled at run-276 start).
- **D-06 (run #276):** Class names are `CartaService` / `CartaModule`
  (PascalCase from the bare-brand single-word name). Rationale:
  matches the convention `CameoService` / `FaireService` use for
  single-word brand names, and aligns with the existing repo
  PascalCase convention for slug-derived class names.
- **D-07 (run #276):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-second live-board hit
  (after `cameo` shipped at run #275). Run #275's probe sweep across
  36 candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52, run
  #276 next bite — this spec), `classpass` (70), `coursera` (8),
  `epicgames` (74), `flexport` (113), `fubotv` (11), `glossier` (17),
  `honeycomb` (10), `lattice` (11), `masterclass` (6), `mavenclinic`
  (24), `stitchfix` (22), `udemy` (17). `carta` is alphabetically
  second after `cameo`, so this run takes Carta. The remaining twelve
  live hits queue for runs #277+ in alphabetical order (`classpass`
  next at run #277 with 70 roles). HubSpot's fourteenth-consecutive
  empty re-probe at run-276 start (`meta.total === 0`) further
  confirms the documented "remains deferred" pattern.
- **D-08 (run #276):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Cameo (Spec 065 § 10 D-08), Scale AI
  (Spec 064 § 10 D-08), Faire (Spec 063 § 10 D-08), Mixpanel (Spec
  062 § 10 D-08), Intercom (Spec 061 § 10 D-08), Elastic (Spec 060 §
  10 D-08), Chime (Spec 059 § 10 D-08), Attentive (Spec 058 § 10
  D-08), ZoomInfo (Spec 057 § 10 D-08), Webflow (Spec 056 § 10 D-08),
  Toast (Spec 055 § 10 D-08), Postman (Spec 054 § 10 D-08), Netlify
  (Spec 053 § 10 D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI
  (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec
  049 § 10 D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10
  D-08), Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10
  D-08), Carta's tenant emits HTML-entity-encoded content (`&lt;div
  class=&quot;content-intro&quot;&gt;...`) rather than raw HTML tags
  — confirmed via run #276's HTTP probe of the live API (every wire
  job carries HTML entities including `&lt;`, `&gt;`, `&quot;`, and
  `&amp;`; none carry raw tags). Applying `stripHtmlTags()` alone to
  that wire payload would leave the literal entities in place.
  Decoding entities **first** and then stripping tags yields clean
  readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), (c) does not contain `&amp;`, and (d)
  does not contain `<p>`, `<div>`, `<strong>`, or `<em>` (tags
  stripped after the decode pass), so a future refactor that swaps
  the order or drops one half of the pipeline would surface as a
  test diff. This is the **twenty-second** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #276):** Brand-name trim D-09 is **omitted**. Rationale:
  Carta's wire `company_name` is `'Carta'` byte-for-byte (the
  single-token bare brand name; no legal-entity suffix on the wire —
  confirmed via run-276 probe where every wire job carries
  `company_name === 'Carta'`, distinct from the legal-entity name
  "eShares, Inc." that appears in older SEC filings before the 2017
  rebrand and the current legal-entity name "Carta, Inc." that
  appears in current SEC filings). The plugin reads
  `listing.company_name` directly without a string-literal pin, but
  the unit-test happy path asserts the emitted `companyName ===
  'Carta'` byte-for-byte to lock the observable shape against a
  future tenant rename to add a legal-entity suffix; if such a
  rename happens, a follow-up patch can re-introduce D-09 as a
  one-line edit. **Sixteenth cohort plugin to omit D-09**, returning
  to the single-word bare-brand wire form (Cameo `'Cameo'`, Mixpanel
  `'Mixpanel'`, Faire `'Faire'`, Intercom `'Intercom'`, Elastic
  `'Elastic'`, Webflow `'Webflow'`, Attentive `'Attentive'`, Postman
  `'Postman'`, Netlify `'Netlify'`, Mercury `'Mercury'`, Buildkite
  `'Buildkite'`, CircleCI `'CircleCI'`, Toast `'Toast'`, plus the
  Ramp Network slug-collapse case where the wire `company_name ===
  'Ramp'` was single-word despite the slug being `rampnetwork`) —
  distinct from Scale AI's first-of-its-kind multi-token bare-brand
  wire `company_name === 'Scale AI'` (with internal whitespace).
- **D-10 (run #276):** Wire-title `.trim()` deviation is **applied**.
  Rationale: at least 1 of the 10 wire titles in the run-276 probe
  carries trailing ASCII-space padding (`'Business Development
  Manager, Private Equity '` — confirmed via the WebFetch probe).
  The other 9 surveyed are clean. The plugin applies `.trim()` to
  the wire `title` before downstream filters and emit. The
  unit-test happy path asserts the emitted `title` matches the
  trimmed form (`'Business Development Manager, Private Equity'`,
  no trailing pad byte) AND is byte-distinct from the wire form
  (`'Business Development Manager, Private Equity '`, with trailing
  pad byte) — locking the D-10 application against a future
  refactor that drops the `.trim()` and reintroduces the wire pad
  byte. **Ninth cohort plugin to apply D-10** (after Brex `Spec 047
  § 10 D-10`, Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 §
  10 D-10`, Attentive `Spec 058 § 10 D-10`, Elastic `Spec 060 § 10
  D-10`, Intercom `Spec 061 § 10 D-10`, Mixpanel `Spec 062 § 10
  D-10`, and Faire `Spec 063 § 10 D-10`).
- **D-11 (run #276):** The Carta wire `departments[0].name` payload
  uses **fully-clean single-token or short multi-word descriptive
  department names** like `'Account Executive'`, `'Marketing'`,
  `'Tax'`, `'Engineering'`, `'Sales'`, `'Strategic Finance'` —
  similar to Faire's all-trim-clean pure descriptive format and
  distinct from Cameo's partial-pad pass-through. Specifically 0 of
  the 10 wire department names in the run-276 probe carry trailing
  ASCII-space padding (0 % pad-rate). The plugin emits the wire
  `departments[0].name` byte-for-byte (no department-name `.trim()`
  needed because no wire-side padding was observed; the
  case-insensitive `searchTerm.toLowerCase().includes(...)` filter
  remains semantically correct against the clean wire form). The
  unit-test happy path includes (a) a regression guard asserting
  the emitted `department` for the first fixture listing matches
  the wire `departments[0].name === 'Account Executive'` byte-for-
  byte (clean multi-word descriptive form), and (b) a regression
  guard asserting the emitted `department` for the second fixture
  listing matches the wire `departments[0].name === 'Marketing'`
  byte-for-byte (clean single-token form).
- **D-12 (run #276):** This plugin is the **second** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at run
  #275). The remaining twelve live hits from the run-275 probe
  sweep queue for runs #277+ in alphabetical order: `classpass` (70
  roles, run #277 next bite), `coursera` (8), `epicgames` (74),
  `flexport` (113), `fubotv` (11), `glossier` (17), `honeycomb`
  (10), `lattice` (11), `masterclass` (6), `mavenclinic` (24),
  `stitchfix` (22), `udemy` (17). Subsequent runs after the pool is
  exhausted (#288+ by current arithmetic) will pivot to a **fifth
  fresh probe sweep** targeting yet-untested large-employer
  candidate slugs. HubSpot's fourteenth-consecutive empty re-probe
  at run-276 start (`meta.total === 0`) further confirms the
  documented "remains deferred" pattern.

## 11. References

- `packages/plugins/source-company-cameo/src/cameo.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 065 / run #275; same variant 2 + D-08 + D-09 omission as Carta;
  Carta deviates by applying D-10 instead of omitting it AND by
  emitting fully-clean department names instead of the partial-pad
  pass-through).
- `packages/plugins/source-company-faire/src/faire.service.ts` —
  the prior cohort plugin with D-10 applied (Spec 063 / run #273; Faire
  uses variant 10 instead of variant 2 but is the closest D-10 cousin
  with single-token bare brand name).
- `packages/plugins/source-company-mixpanel/src/mixpanel.service.ts` —
  D-10 applied + variant 2 + D-08 + D-09 omitted (Spec 062 / run #272;
  the closest cohort plugin to Carta's structural shape — same variant
  2 modern US-region permalink subdomain, same entity-decode-then-tag-
  strip pipeline, same D-10 trim, same single-token bare brand).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
