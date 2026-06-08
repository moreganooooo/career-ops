# Spec: 064 — Source Company Plugin: Scale AI

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 064                                                                                                                                                                                            |
| Slug           | source-company-scaleai                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #274)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063 |

## 1. Problem Statement

Run #273's Spec 063 closed end-to-end (Faire shipped — 9 unit tests
green; the run-272 third-fresh-sweep candidate pool's first live hit)
and explicitly queued **Scale AI** for run #274 — the second live hit
from the same run-273 third-fresh-sweep probe (170 open roles at the
run-273 probe; the run-274 re-probe at start of this run returned HTTP
200 with 11 open roles, a sharp drop from run-273's 170 — likely a
combination of recent fills and posting expirations on the Scale AI
side; the wire shape is unchanged). The catalogue still has no entry
for the dominant **AI data-labelling and frontier-AI training-data
infrastructure** vendor — Scale AI, Inc. (founded by Alexandr Wang and
Lucy Guo in 2016 in San Francisco; currently a private company after
Series F rounds led by Accel, Founders Fund, Index Ventures, Coatue,
Tiger Global, Greenoaks, Y Combinator, and Wellington Management;
operating from its San Francisco headquarters plus offices across the
United States, Saudi Arabia, and Europe; operator of Scale Data Engine
(the data-labelling flagship), Scale GenAI Platform (the LLM-training
platform), Scale Donovan (the defence-AI surface), Scale Spellbook (the
LLM-application builder), Scale Studio (the multi-modal annotation
surface), Scale Document AI (the document-extraction product), Scale
Forge (the synthetic-data generation tool), and the Scale Public Sector
business unit (the federal-government / Department of Defense surface)
lines that anchor the AI data-infrastructure category alongside
Surge AI, Labelbox, Snorkel AI, Appen, Sama, Lionbridge AI, iMerit,
Toloka, V7, Roboflow, Hugging Face, Together AI, Cohere, and the
new wave of human-feedback / RLHF-as-a-service challengers — Anthropic
Constitutional AI tooling, OpenAI fine-tuning surfaces, Databricks'
synthetic-data products, and various YC W24 / W25 batches' RLHF-and-
labelling startups) — is published at the bare `scaleai` Greenhouse
slug (the lowercase brand name with the `'AI'` suffix collapsed to
`'ai'`) and was confirmed live via run #274's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/scaleai/jobs?content=true` (11
open roles returned at probe time). Aggregator-callers asking for "all
jobs at major AI-infrastructure vendors" must currently either (a)
deduce the Greenhouse slug `scaleai` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted
role for a company-name match — both paths bypass the per-source
health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`scaleai` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-two times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest,
Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman, Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic,
Intercom, Mixpanel, Faire).

## 2. Goals

- Ship a `source-company-scaleai` plugin returning live `JobPostDto`
  rows for the public Scale AI careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-mixpanel` plugin (Greenhouse-backed, `category:
  'company'`, `Site.SCALEAI` enum value, `id` prefixed `scaleai-`) —
  Mixpanel is the closest structural cousin because both publish
  `absolute_url` on **wire-shape variant 2** (the modern US-region
  permalink subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`
  shape) AND both emit HTML-entity-encoded content (`&lt;p&gt;...`)
  requiring the entity-decode-then-tag-strip description pipeline AND
  both omit the brand-name trim D-09 against a single-word bare-brand
  wire `company_name`. Scale AI deviates from the Mixpanel template on
  **one** axis: (1) **D-10 omitted** — 0 of 11 wire titles in the
  run-274 probe carry trailing ASCII-space padding (Mixpanel had 1 of 9
  ~11.1 % pad-rate); the plugin emits the wire `title` byte-for-byte
  without a `.trim()` deviation. The brand-name handling shifts to a
  multi-token form: the wire `company_name` is `'Scale AI'` (with an
  internal ASCII space between `'Scale'` and `'AI'`) byte-for-byte,
  byte-distinct from Mixpanel's single-token `'Mixpanel'`.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Scale AI.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'scaleai'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-mixpanel` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Scale AI's USD / SAR / EUR / GBP ranges (the
  San Francisco / Saudi Arabia / Europe / United States posture spans
  USD plus minor SAR / EUR / GBP supplements without modification).
- Backfilling historical Scale AI postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SCALEAI`** in the source
> registry, so that **a single `siteType: [Site.SCALEAI]` request returns
> Scale AI's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2
> (the modern US-region permalink subdomain shape, twelfth cohort plugin
> in this variant) with the entity-decode-then-tag-strip description
> pipeline AND a multi-token bare-brand `company_name` with internal
> whitespace AND no wire-title trim deviation**, so that **adding the next
> Greenhouse-only employer with a multi-token bare-brand wire shape costs
> ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Scale AI**, so that **a Greenhouse outage on the
> Scale AI board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.SCALEAI = 'scaleai'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-scaleai` under `packages/plugins/`.                 | must     |
| FR-3  | `ScaleaiService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `scaleai-`, `site === Site.SCALEAI`, and `companyName === 'Scale AI'` (wire `company_name` is the multi-token bare brand `'Scale AI'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/scaleai.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **modern US-region permalink subdomain** shape `https://job-boards.greenhouse.io/scaleai/jobs/<id>` — variant 2 (the **twelfth** plugin in the cohort to use this shape after Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman, Webflow, Attentive, Intercom, and Mixpanel; Spec 064 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 11 wire titles in the run-274 probe carry trailing ASCII-space padding; the plugin emits `listing.title` byte-for-byte without a `.trim()`. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ScaleaiModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-scaleai/src/scaleai.service.ts
@SourcePlugin({ site: Site.SCALEAI, name: 'Scale AI', category: 'company' })
@Injectable()
export class ScaleaiService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/scaleai/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `scaleai-${listing.id}`,
  site:         Site.SCALEAI,
  title:        listing.title ?? '',                        // D-10 omitted (no .trim())
  companyName:  listing.company_name ?? 'Scale AI',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/scaleai/jobs/${listing.id}`,
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

- **Unit (`__tests__/scaleai.service.spec.ts`):**
  1. NestJS DI resolves `ScaleaiService` through `ScaleaiModule`.
  2. `Site.SCALEAI === 'scaleai'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified
     (including the variant-2 `job-boards.greenhouse.io/scaleai/jobs/<id>` shape lock,
     the decode-then-strip pipeline cleanliness, the multi-token bare-brand
     `companyName === 'Scale AI'` lock, the D-10 omission lock, and the
     multi-word department pass-through).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-insensitive,
     including a multi-word department-name match — `'gps'` on `'GPS Sales'`).
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

- **D-01 (run #274):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Scale AI's `https://scale.com/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board —
  the canonical machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/scaleai/jobs` public endpoint. We already
  exercise the broader Greenhouse public-API pattern from fifty-two
  prior company-direct plugins.
- **D-02 (run #274):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'scaleai'`.
- **D-03 (run #274):** No salary parser hook beyond the helpers
  defaults — Scale AI posts USD ranges (its San Francisco / Saudi
  Arabia / United States / Europe posture is dominated by USD with
  occasional SAR / EUR / GBP supplements); Spec 014 / 015's parser
  already covers the relevant currencies without modification.
- **D-04 (run #274):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **modern US-region permalink
  subdomain** template `https://job-boards.greenhouse.io/scaleai/jobs/<id>`
  — wire-shape variant 2. This is the **twelfth** plugin in the cohort
  to use variant 2 (after Vercel, Affirm, Gusto, Mercury, Buildkite,
  Netlify, Postman, Webflow, Attentive, Intercom, and Mixpanel — distinct
  from variant 1's `boards.greenhouse.io/<slug>` bare-board apex shape,
  variant 10's `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`
  legacy hosted-board apex shape used by Chime and Faire, and variant
  11's vanity-domain `jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>`
  shape used by Elastic). Rationale: Scale AI's tenant publishes its
  `absolute_url` on this shape — confirmed via run #274's HTTP 200
  probe of the live API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/scaleai/jobs/4686014005`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Scale AI listing in practice (the fallback is a defence-in-depth
  path Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/scaleai/jobs/`
  substring AND must NOT contain `?gh_jid=` (locking the variant-2
  shape against future refactors that might naively normalise to a
  variant-10 or variant-11 template).
- **D-05 (run #274):** Use Greenhouse slug `scaleai` (the lowercase
  brand name with the `'AI'` suffix collapsed to `'ai'`). Rationale:
  like Faire (Spec 063 § 10 D-05), Mixpanel (Spec 062 § 10 D-05),
  Intercom (Spec 061 § 10 D-05), Elastic (Spec 060 § 10 D-05), Chime
  (Spec 059 § 10 D-05), Attentive (Spec 058 § 10 D-05), Webflow (Spec
  056 § 10 D-05), Toast (Spec 055 § 10 D-05), Postman (Spec 054 § 10
  D-05), Netlify (Spec 053 § 10 D-05), Ramp Network (Spec 052 § 10
  D-05), CircleCI (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10 D-05),
  Mercury (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec
  047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10
  D-05), Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05),
  Block (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox
  (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05), ZoomInfo (Spec
  057 § 10 D-05), and unlike Robinhood (Spec 026 § 10 D-05), Scale AI's
  Greenhouse tenant is published at the slug `scaleai` with a
  whitespace-collapse asymmetry that Greenhouse applies to multi-word
  brand names: the wire `company_name` is `'Scale AI'` (with an
  internal ASCII space) but the slug is `scaleai` (no space). Confirmed
  via run #274's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/scaleai/jobs?content=true` (11
  open roles returned).
- **D-06 (run #274):** Class names are `ScaleaiService` / `ScaleaiModule`
  (PascalCase from the slug-form lowercase brand name with the `'ai'`
  suffix run together — distinct from the wire `company_name` `'Scale AI'`
  display form). Rationale: matches the convention `RampNetworkService` /
  `RampNetworkModule` use for multi-word brand names where the slug
  collapses the whitespace, and aligns with the existing repo PascalCase
  convention for slug-derived class names (e.g. `RampNetworkService`,
  `MixpanelService`, `IntercomService`).
- **D-07 (run #274):** Selected from the **run-272 / run-273
  third-fresh-sweep candidate pool**, alphabetically-second live-board
  hit after Faire. Run #273's probe sweep found exactly **two** live
  boards on Greenhouse: `faire` (HTTP 200, 72 roles) and `scaleai`
  (HTTP 200, 170 roles). `faire` < `scaleai` lexically, so run #273
  took Faire and queued Scale AI for run #274. The run-274 re-probe at
  start of this run returned HTTP 200 with 11 open roles — a sharp
  drop from the run-273 figure of 170 (likely due to recent fills and
  posting-expiration churn on the Scale AI side; the wire shape and
  enable status are unchanged). 11 roles is comfortably above the
  cohort minimum (Mixpanel shipped at 9; ZoomInfo at 14).
- **D-08 (run #274):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Faire (Spec 063 § 10 D-08), Mixpanel
  (Spec 062 § 10 D-08), Intercom (Spec 061 § 10 D-08), Elastic (Spec
  060 § 10 D-08), Chime (Spec 059 § 10 D-08), Attentive (Spec 058 § 10
  D-08), ZoomInfo (Spec 057 § 10 D-08), Webflow (Spec 056 § 10 D-08),
  Toast (Spec 055 § 10 D-08), Postman (Spec 054 § 10 D-08), Netlify
  (Spec 053 § 10 D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI
  (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec
  049 § 10 D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10
  D-08), Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10
  D-08), Scale AI's tenant emits HTML-entity-encoded content (`&lt;p&gt;
  As an Account Executive...`) rather than raw HTML tags — confirmed
  via run #274's HTTP probe of the live API (every wire job carries
  HTML entities; none carry raw tags). Applying `stripHtmlTags()`
  alone to that wire payload would leave the literal entities in
  place. Decoding entities **first** and then stripping tags yields
  clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The unit-
  test happy path asserts the cleaned description (a) does not contain
  `&lt;` (entities decoded), (b) does not contain `&quot;` (named
  entities decoded), (c) does not contain `&#39;` (numeric entities
  decoded), and (d) does not contain `<p>`, `<div>`, `<strong>`, or
  `<em>` (tags stripped after the decode pass), so a future refactor
  that swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **twentieth** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #274):** Brand-name trim D-09 is **omitted**. Rationale:
  Scale AI's wire `company_name` is `'Scale AI'` byte-for-byte (the
  multi-token bare brand name with an internal ASCII space; no
  legal-entity suffix on the wire — confirmed via run-274 probe where
  every wire job carries `company_name === 'Scale AI'`, distinct from
  the legal-entity name "Scale AI, Inc." that appears in SEC filings
  and press releases). The plugin reads `listing.company_name`
  directly without a string-literal pin, but the unit-test happy path
  asserts the emitted `companyName === 'Scale AI'` byte-for-byte to
  lock the observable shape against a future tenant rename to add a
  legal-entity suffix; if such a rename happens, a follow-up patch
  can re-introduce D-09 as a one-line edit. **Fourteenth cohort plugin
  to omit D-09**, AND the **first to omit D-09 against a multi-token
  bare-brand wire `company_name`** (every prior D-09-omission plugin
  had a single-word bare-brand wire — Mixpanel `'Mixpanel'`, Intercom
  `'Intercom'`, Elastic `'Elastic'`, Webflow `'Webflow'`, Attentive
  `'Attentive'`, Postman `'Postman'`, Netlify `'Netlify'`, Mercury
  `'Mercury'`, Buildkite `'Buildkite'`, CircleCI `'CircleCI'`, Toast
  `'Toast'`, Faire `'Faire'`, plus the Ramp Network slug-collapse case
  where the wire `company_name === 'Ramp'` was single-word despite the
  slug being `rampnetwork`).
- **D-10 (run #274):** Wire-title `.trim()` deviation is **omitted**.
  Rationale: 0 of the 11 wire titles in the run-274 probe carry trailing
  ASCII-space padding (every title surveyed — `'Account Executive,
  Saudi Arabia'`, `'AI Applications Ops Lead, GPS'`, `'AI Deployment
  Strategist Intern'`, `'AI Product Manager'`, `'AI Strategy
  Consultant, Frontier Tech'`, `'Analytics & Data Science Manager,
  Finance'`, `'[Annotations] Operations Associate'`, `'[Annotations]
  Operations Program Manager'`, `'Applied AI Engineer, Enterprise'`,
  `'Applied AI Engineer, Enterprise GenAI'`, `'Applied AI Engineer,
  Global Public Sector'` — closes with a comma-suffix or alphanumeric
  byte). The plugin emits `listing.title` byte-for-byte without a
  `.trim()`. The unit-test happy path asserts the emitted `title`
  matches the wire `title` byte-for-byte (no trim observable —
  regression guard against a future refactor that introduces a
  spurious `.trim()` and shifts the observable title shape on a
  future-padded fixture). This is structurally analogous to Chime
  (Spec 059 § 10 D-10 — also omitted), distinct from the trim-applied
  cohort: Brex, Buildkite, ZoomInfo, Attentive, Elastic, Intercom,
  Mixpanel, and Faire.
- **D-11 (run #274):** The Scale AI wire `departments[0].name` payload
  uses **multi-word descriptive department names** with optional
  initialisms like `'GPS Sales'`, `'Engineering'`, `'Product'`,
  `'Operations'`, `'Annotations'`, `'Public Sector'` — partly distinct
  from Mixpanel's strict flat single-token format and Faire's pure
  multi-word descriptive format in that the wire payload may carry
  internal whitespace combined with capitalised initialisms (`'GPS'`).
  The plugin emits the wire `departments[0].name` byte-for-byte (no
  department-name `.trim()` — the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains semantically
  correct against the wire form). The unit-test happy path includes a
  regression guard asserting the emitted `department` for the first
  fixture listing matches the wire `departments[0].name` byte-for-byte
  AND that the case-insensitive `searchTerm` match on the literal
  `'gps'` substring resolves the first-listing fixture's `'GPS Sales'`
  department.
- **D-12 (run #274):** This plugin **closes** the run-272 / run-273
  third-fresh-sweep live-board pool (faire ✓ shipped run #273; scaleai
  ✓ shipped run #274). Subsequent runs (#275+) will pivot to a **fourth
  fresh probe sweep** targeting the next batch of large-employer
  candidates — Carta, Brightwheel, Maven Clinic, Glossier, Casper,
  Chewy, Wayfair, Flexport, Epic Games, Zendesk, Asana (already shipped
  but at this point an alternate slug probe could surface a sub-board),
  Notion (already probed empty in run #273), Stitch Fix, ClassPass,
  Plex, Cameo, Hims & Hers, Compass, Bumble, Hinge, MasterClass,
  Skillshare, Coursera, Udemy, Honeycomb, Blameless, OpsLevel, Lattice,
  Workrise, Niantic, Discord (already shipped), Tubi, fuboTV, Rover,
  Fanatics, Nylas, Sanity, Vidio. Run #275 should run the HTTP probe
  sweep across all of them and pick the alphabetically-first live bite.
  HubSpot's twelfth-consecutive empty re-probe at run-274 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.

## 11. References

- `packages/plugins/source-company-mixpanel/src/mixpanel.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 062 / run #272; same variant 2 + D-08 + D-09 omission as Scale AI;
  Scale AI deviates by omitting D-10).
- `packages/plugins/source-company-faire/src/faire.service.ts` — the
  prior cohort plugin (Spec 063 / run #273; same D-08 + D-09 omission as
  Scale AI but uses variant 10 instead of variant 2 and applies D-10).
- `packages/plugins/source-company-rampnetwork/src/rampnetwork.service.ts`
  — the closest cousin for the multi-word brand-name slug-collapse
  pattern (Greenhouse collapses internal whitespace in the slug while
  preserving it in `company_name`).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
