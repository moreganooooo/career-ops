# Spec: 073 — Source Company Plugin: Honeycomb

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 073                                                                                                                                                                                            |
| Slug           | source-company-honeycomb                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #283)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..072                                                                                                                                                                        |

## 1. Problem Statement

Run #282's Spec 072 closed end-to-end (Glossier shipped — 8 unit
tests green; the **eighth** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool) and explicitly queued runs #283+
to take **Honeycomb** next as the alphabetically-ninth live hit from
that pool (10 roles confirmed at run-275 probe time; re-confirmed at
run-283 start with 10 jobs returned by the HTTP probe). Run #283
also re-probes the rolling `hubspot` candidate to keep the documented
"remains deferred" pattern fresh (twenty-first-consecutive empty
re-probe at run-283 start — `meta.total === 0`).

Honeycomb.io, Inc. — operator of the **dominant
production-observability platform pioneered around the high-cardinality
event-as-the-unit-of-work data model** (founded by Christine Yen and
Charity Majors in 2016 in San Francisco; raised $200M+ across rounds
led by Insight Partners, Scale Venture Partners, e.ventures, Storm
Ventures, and Headline at a Series D valuation; coined the modern
usage of "observability" in software engineering through Charity
Majors's writing and conference talks; ships an OpenTelemetry-native
SaaS product across the engineering-observability segment alongside
competitors Datadog, New Relic, Splunk, and Grafana Cloud, with a
remote-first workforce concentrated across the United States,
United Kingdom, Ireland, and Canada) — is published at the bare
`honeycomb` Greenhouse slug (the lowercase brand name without the
`.io` TLD that appears in the wire `company_name`) and was confirmed
live via run #283's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/honeycomb/jobs?content=true`
(10 open roles confirmed at run-283 start). Honeycomb publishes its
`absolute_url` on **wire-shape variant 2** — the modern
`https://job-boards.greenhouse.io/honeycomb/jobs/<id>` shape — making
this the **fifteenth** plugin in the cohort to use variant 2 (after
Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman, Webflow,
Attentive, Intercom, Mixpanel, Scale AI, Cameo, and Carta).

Aggregator-callers asking for "all jobs at major engineering
observability / dev-tools / SRE platforms" must currently either
(a) deduce the Greenhouse slug `honeycomb` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match — both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`honeycomb` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses sixty-one times (Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo, Carta, ClassPass, Coursera, Epic Games, Flexport, fuboTV,
Glossier — plus the seven legacy company-direct plugins from before
Spec 020).

## 2. Goals

- Ship a `source-company-honeycomb` plugin returning live `JobPostDto`
  rows for the public Honeycomb careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-carta` plugin (Greenhouse-backed, `category:
  'company'`, `Site.HONEYCOMB` enum value, `id` prefixed `honeycomb-`)
  — Carta is the closest structural cousin because both publish from
  Greenhouse public API on **wire-shape variant 2** (the modern
  `job-boards.greenhouse.io` apex), both emit HTML-entity-encoded
  content (`&lt;p&gt;...`) requiring the entity-decode-then-tag-strip
  description pipeline (D-08), both omit D-09 brand-name trim (the
  plugin reads `listing.company_name` directly), both apply D-10
  wire-title `.trim()` against a non-zero pad rate, and both emit
  fully-clean wire `departments[0].name` byte-for-byte (D-11
  fully-clean). Honeycomb carries **one structural deviation** from
  the Carta template — the wire `company_name === 'Honeycomb.io'`
  carries the brand's `.io` TLD as a 3-byte trailing suffix
  (slug/wire asymmetric — slug `honeycomb` is 9 bytes, wire
  `'Honeycomb.io'` is 12 bytes; wire LONGER than slug — the
  **fourth** slug/wire asymmetry case in the cohort after Ramp
  Network, Scale AI, and fuboTV; the **second** asymmetry case where
  the wire is **longer** than the slug after Scale AI's 8-byte wire
  vs. 7-byte slug; the **first** cohort plugin where the wire
  `company_name` carries the brand's TLD as a 3-byte trailing
  suffix).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path +
  at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Honeycomb.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'honeycomb'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-carta` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Honeycomb's USD / GBP / EUR / CAD
  remote-first US-Canada-UK-Ireland ranges.
- Backfilling historical Honeycomb postings — only the open-roles
  slice the Greenhouse public API returns.
- Honeycomb product-API / event-ingest integration — Honeycomb's
  observability ingest surface and dashboard surface are separate
  product surfaces from the careers board; product API data is out
  of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.HONEYCOMB`** in the
> source registry, so that **a single `siteType: [Site.HONEYCOMB]`
> request returns Honeycomb's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of
> the Greenhouse-backed company-direct pattern with the entity-
> decode-then-tag-strip description pipeline AND a slug/wire-
> asymmetric `company_name` (TLD-suffix variant) AND a wire-title
> `.trim()` application AND a fully-clean department pass-through
> AND a variant-2 modern hosted-board fallback**, so that **adding
> the next Greenhouse-only employer publishing a TLD-suffix wire
> `company_name` costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Honeycomb**, so that **a Greenhouse outage on
> the Honeycomb board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.HONEYCOMB = 'honeycomb'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-honeycomb` under `packages/plugins/`.               | must     |
| FR-3  | `HoneycombService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `honeycomb-`, `site === Site.HONEYCOMB`, and `companyName === 'Honeycomb.io'` (wire `company_name` is the brand-with-TLD `'Honeycomb.io'` byte-for-byte; slug/wire-asymmetric — the wire carries the `.io` TLD as a 3-byte trailing suffix that the slug `honeycomb` does not; D-09 omitted — the plugin reads `listing.company_name` directly with `'Honeycomb.io'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/honeycomb.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;div class=&quot;content-intro&quot;&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;div class=&quot;content-intro&quot;&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-2 shape `https://job-boards.greenhouse.io/honeycomb/jobs/<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse variant-2 form (Spec 073 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 2 of 10 wire titles in the run-283 probe carry trailing ASCII-space padding (`'Staff Solution Architect '` × 2 listings, ~20 % pad rate); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 10 wire department names in the run-283 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 10-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 10-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[HoneycombModule]})` resolves.  |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-honeycomb/src/honeycomb.service.ts
@SourcePlugin({ site: Site.HONEYCOMB, name: 'Honeycomb', category: 'company' })
@Injectable()
export class HoneycombService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/honeycomb/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `honeycomb-${listing.id}`,
  site:         Site.HONEYCOMB,
  title:        (listing.title ?? '').trim(),                 // D-10 applied
  companyName:  listing.company_name ?? 'Honeycomb.io',       // D-09 omitted; TLD-suffix wire
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/honeycomb/jobs/${listing.id}`,
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

- **Unit (`__tests__/honeycomb.service.spec.ts`):**
  1. NestJS DI resolves `HoneycombService` through `HoneycombModule`.
  2. `Site.HONEYCOMB === 'honeycomb'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-2
     `job-boards.greenhouse.io/honeycomb/jobs/<id>` shape lock for
     the wire `absolute_url` pass-through, the decode-then-strip
     pipeline cleanliness, the TLD-suffix wire `companyName ===
     'Honeycomb.io'` byte-for-byte AND `companyName ===
     fixture.jobs[0].company_name` byte-for-byte AND distinct from
     the slug `honeycomb` AND exactly 3 bytes longer than the slug
     (locking the slug/wire asymmetry observable — D-09 omission
     lock with TLD-suffix wire variant), the D-10 application —
     emitted `title` for the second listing equals trimmed form
     `'Staff Solution Architect'` AND is byte-distinct from
     wire-padded form `'Staff Solution Architect '` AND is exactly
     1 byte shorter, and the D-11 fully-clean department
     pass-through for both `'Sales'` and `'Finance & Accounting'`).
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

- **D-01 (run #283):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Honeycomb's
  `https://www.honeycomb.io/careers` careers landing page redirects
  buyers to a Greenhouse-hosted board — the canonical machine-
  readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/honeycomb/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  sixty-one prior company-direct plugins.
- **D-02 (run #283):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'honeycomb'`.
- **D-03 (run #283):** No salary parser hook beyond the helpers
  defaults — Honeycomb posts USD / GBP / EUR / CAD ranges from US,
  UK, Irish, and Canadian remote roles; Spec 014 / 015's parser
  already covers all four currencies without modification.
- **D-04 (run #283):** **Wire-shape variant 2 — modern
  `job-boards.greenhouse.io/honeycomb/jobs/<id>`.** Honeycomb's
  tenant publishes its `absolute_url` on the variant-2 shape —
  confirmed via run #283's HTTP 200 probe of the live API where
  every wire job carries this shape (the first job's `absolute_url`
  is `https://job-boards.greenhouse.io/honeycomb/jobs/5202308008`).
  The plugin emits `listing.absolute_url` byte-for-byte to preserve
  the canonical destination. The **fallback** `jobUrl` constructor
  (when Greenhouse omits `absolute_url` — a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window) defaults to the same canonical Greenhouse **variant-2**
  form `https://job-boards.greenhouse.io/honeycomb/jobs/<id>`. This
  is the **fifteenth** plugin in the cohort to use variant 2 (after
  Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman,
  Webflow, Attentive, Intercom, Mixpanel, Scale AI, Cameo, and
  Carta). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io/honeycomb/jobs/` substring AND must
  NOT contain `?gh_jid=` (locking the variant-2 shape against
  future refactors that might naively normalise to a different
  variant).
- **D-05 (run #283):** Use Greenhouse slug `honeycomb` (the
  lowercase bare brand name without the `.io` TLD that appears in
  the wire `company_name`). Rationale: like Carta (Spec 066 § 10
  D-05), Cameo (Spec 065 § 10 D-05), and the rest of the bare-slug
  cohort, Honeycomb's Greenhouse tenant is published at the bare
  slug `honeycomb` — but unlike most cohort plugins, the slug
  drops the `.io` TLD that the wire `company_name` carries (the
  wire is `'Honeycomb.io'` byte-for-byte, 12 bytes; the slug is
  `honeycomb`, 9 bytes — slug/wire-asymmetric, wire LONGER than
  slug by the `.io` TLD suffix). Confirmed via run #283's HTTP
  200 probe of
  `https://api.greenhouse.io/v1/boards/honeycomb/jobs?content=true`
  (10 open roles confirmed at run-283 start).
- **D-06 (run #283):** Class names are `HoneycombService` /
  `HoneycombModule` (PascalCase from the lowercase slug — derived
  from the slug `honeycomb` rather than the wire `company_name`
  `'Honeycomb.io'`, dropping the `.io` TLD because TypeScript class
  names cannot contain `.`). Rationale: matches the convention
  `CartaService` / `CameoService` / `FlexportService` /
  `GlossierService` use for slug-derived class names.
- **D-07 (run #283):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-ninth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276,
  `classpass` at run #277, `coursera` at run #278, `epicgames` at
  run #279, `flexport` at run #280, `fubotv` at run #281, and
  `glossier` at run #282). Run #275's probe sweep across 36
  candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52,
  run #276 shipped), `classpass` (70, run #277 shipped), `coursera`
  (8, run #278 shipped), `epicgames` (74, run #279 shipped),
  `flexport` (113, run #280 shipped), `fubotv` (11, run #281
  shipped), `glossier` (17, run #282 shipped), `honeycomb` (10,
  run #283 next bite — this spec), `lattice` (11), `masterclass`
  (6), `mavenclinic` (24), `stitchfix` (22), `udemy` (17).
  `honeycomb` is alphabetically ninth after `cameo`, `carta`,
  `classpass`, `coursera`, `epicgames`, `flexport`, `fubotv`, and
  `glossier`, so this run takes Honeycomb. The remaining five live
  hits queue for runs #284+ in alphabetical order (`lattice` next
  at run #284 with 11 roles). HubSpot's twenty-first-consecutive
  empty re-probe at run-283 start (`meta.total === 0`) further
  confirms the documented "remains deferred" pattern.
- **D-08 (run #283):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Glossier (Spec 072 § 10 D-08),
  fuboTV (Spec 071 § 10 D-08), Flexport (Spec 070 § 10 D-08), and
  the rest of the post-Klaviyo cohort, Honeycomb's tenant emits
  HTML-entity-encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;div&gt;&lt;strong&gt;What We're Building&lt;/strong&gt;&lt;/div&gt;
  ...`) rather than raw HTML tags — confirmed via run #283's HTTP
  probe of the live API (every wire job carries HTML entities
  including `&lt;`, `&gt;`, `&quot;`, and `&amp;`; none carry raw
  tags). Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text. The
  pipeline is order-sensitive — `decodeHtmlEntities()` must run
  before `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities
  decoded), (b) does not contain `&quot;` (named entities decoded),
  (c) does not contain `&amp;`, and (d) does not contain `<p>`,
  `<div>`, `<strong>`, or `<em>` (tags stripped after the decode
  pass), so a future refactor that swaps the order or drops one
  half of the pipeline would surface as a test diff. This is the
  **twenty-ninth** company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #283):** Brand-name trim D-09 is **omitted**.
  Rationale: Honeycomb's wire `company_name` is `'Honeycomb.io'`
  byte-for-byte (the brand name with the `.io` TLD as a trailing
  3-byte suffix; no legal-entity suffix on the wire — confirmed
  via run-283 probe where every wire job carries
  `company_name === 'Honeycomb.io'`, distinct from the legal-entity
  name "Honeycomb.io, Inc." that may appear in corporate filings).
  The plugin reads `listing.company_name` directly with
  `'Honeycomb.io'` as a defensive fallback, but the unit-test happy
  path asserts the emitted `companyName === 'Honeycomb.io'`
  byte-for-byte to lock the observable shape against a future
  tenant rename to drop the TLD suffix or add a legal-entity suffix;
  if such a rename happens, a follow-up patch can re-introduce D-09
  as a one-line edit. **Twenty-third cohort plugin to omit D-09**,
  but the **fourth** slug/wire asymmetry case in the cohort (after
  Ramp Network slug `rampnetwork` / wire `'Ramp'`, Scale AI slug
  `scaleai` / wire `'Scale AI'`, and fuboTV slug `fubotv` / wire
  `'Fubo'`) — and the **second** asymmetry case where the wire
  `company_name` is **longer** than the slug (after Scale AI's
  8-byte wire `'Scale AI'` vs. 7-byte slug `scaleai`). Honeycomb is
  the **first** cohort plugin where the wire `company_name` carries
  the brand's TLD as a 3-byte trailing suffix (`.io`) — distinct
  from Scale AI's internal-whitespace asymmetry, fuboTV's
  brand-rebrand truncation, and Ramp Network's brand-shortening
  asymmetry. The slug-vs-wire diff is exactly the 3-byte `.io`
  suffix.
- **D-10 (run #283):** Wire-title `.trim()` deviation is **applied**.
  Rationale: at least 2 of 10 wire titles in the run-283 probe
  carry trailing ASCII-space padding (`'Staff Solution
  Architect '` appears as the wire title for two distinct
  Honeycomb listings — IDs 5162709008 and 5162707008 — both
  trailing-single-space-padded; ~20 % pad rate) — confirmed via
  the curl probe. The plugin applies `.trim()` to the wire `title`
  before downstream filters and emit so the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter sees the trimmed
  form, and the emitted `JobPostDto.title` does not carry pad
  bytes. The unit-test happy path's second listing fixture uses
  the wire-padded title `'Staff Solution Architect '` (with one
  trailing space) and asserts (a) the emitted `title` equals the
  trimmed form `'Staff Solution Architect'` AND is byte-distinct
  from the wire form AND (b) is exactly **1 byte shorter** (locking
  the trailing-pad form against a future refactor that drops the
  `.trim()` and reintroduces the wire pad bytes). **Fourteenth
  cohort plugin to apply D-10** (after Brex, Buildkite, ZoomInfo,
  Attentive, Elastic, Intercom, Mixpanel, Faire, Carta, ClassPass,
  Epic Games, Flexport, fuboTV, and Glossier).
- **D-11 (run #283):** The Honeycomb wire `departments[0].name`
  payload uses **fully-clean department names** like `'Sales'`,
  `'Finance & Accounting'`, `'RevOps'`, `'Engineering'` — similar
  to Carta's all-trim-clean format and distinct from Cameo's
  partial-pad pass-through. Specifically 0 of the 10 wire
  department names in the run-283 probe carry trailing ASCII-space
  padding (0 % pad-rate). The plugin emits the wire
  `departments[0].name` byte-for-byte (no department-name
  `.trim()` needed because no wire-side padding was observed; the
  case-insensitive `searchTerm.toLowerCase().includes(...)` filter
  remains semantically correct against the clean wire form). The
  unit-test happy path includes (a) a regression guard asserting
  the emitted `department` for the first fixture listing matches
  the wire `departments[0].name === 'Sales'` byte-for-byte (clean
  single-token form), and (b) a regression guard asserting the
  emitted `department` for the second fixture listing matches the
  wire `departments[0].name === 'Finance & Accounting'`
  byte-for-byte (clean multi-token form with internal ampersand
  and whitespace).
- **D-12 (run #283):** This plugin is the **ninth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, ClassPass at run #277, Coursera at
  run #278, Epic Games at run #279, Flexport at run #280, fuboTV
  at run #281, and Glossier at run #282). The remaining five live
  hits from the run-275 probe sweep queue for runs #284+ in
  alphabetical order: `lattice` (11 roles, run #284 next bite),
  `masterclass` (6), `mavenclinic` (24), `stitchfix` (22),
  `udemy` (17). Subsequent runs after the pool is exhausted
  (#288+ by current arithmetic) will pivot to a **fifth fresh
  probe sweep** targeting yet-untested large-employer candidate
  slugs. HubSpot's twenty-first-consecutive empty re-probe at
  run-283 start (`meta.total === 0`) further confirms the
  documented "remains deferred" pattern.
- **D-13 (run #283):** **One structural deviation** from the Carta
  (Spec 066) template — D-09 omitted with **TLD-suffix wire
  asymmetry** (slug `honeycomb` 9 bytes; wire `'Honeycomb.io'`
  12 bytes; slug/wire-asymmetric — wire LONGER by the 3-byte
  `.io` TLD suffix). All other axes share with Carta: D-04
  variant 2, D-08 entity-decode-then-tag-strip, D-09 omitted (with
  the TLD-suffix wrinkle), D-10 applied, D-11 fully-clean.
  Honeycomb is the **first cohort plugin where the wire
  `company_name` carries the brand's TLD as a trailing suffix**.

## 11. References

- `packages/plugins/source-company-carta/src/carta.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 066 / run #276; same D-04 variant 2, D-08 entity-
  decode-then-tag-strip, D-09 omitted, D-10 applied, D-11
  fully-clean as Honeycomb; Honeycomb's only deviation is the
  TLD-suffix wire `company_name`).
- `packages/plugins/source-company-glossier/src/glossier.service.ts` —
  immediately prior cohort plugin (Spec 072 / run #282; Glossier
  uses variant 10 + D-08 + D-09 omitted + D-10 applied + D-11
  fully-clean — distinct from Honeycomb on D-04 wire-shape variant;
  both apply D-10).
- `packages/plugins/source-company-fubotv/src/fubotv.service.ts` —
  prior cohort plugin with slug/wire asymmetry (Spec 071 / run
  #281; fuboTV slug `fubotv` 6 bytes / wire `'Fubo'` 4 bytes —
  wire SHORTER than slug; distinct from Honeycomb's wire-LONGER
  asymmetry).
- `packages/plugins/source-company-scaleai/src/scaleai.service.ts` —
  prior cohort plugin with wire-LONGER asymmetry (Spec 064 / run
  #274; Scale AI slug `scaleai` 7 bytes / wire `'Scale AI'`
  8 bytes — wire longer by 1 byte due to internal whitespace;
  distinct from Honeycomb's wire-LONGER-by-3-bytes-from-TLD
  asymmetry).
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
