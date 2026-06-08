# Spec: 068 — Source Company Plugin: Coursera

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 068                                                                                                                                                                                            |
| Slug           | source-company-coursera                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #278)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..067                                                                                                                                                                        |

## 1. Problem Statement

Run #277's Spec 067 closed end-to-end (ClassPass shipped — 8 unit tests
green; the **third** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #278+ to take **Coursera** next as the alphabetically-fourth live
hit from that pool (8 roles confirmed at run-275 probe time;
re-confirmed at run-278 start with 8 jobs returned by the HTTP probe).
Run #278 also re-probes the rolling `hubspot` candidate to keep the
documented "remains deferred" pattern fresh (sixteenth-consecutive
empty re-probe at run-278 start — `meta.total === 0`).

Coursera, Inc. — operator of the **dominant
massive-open-online-course (MOOC) platform** (founded by Andrew Ng
and Daphne Koller in 2012 in Mountain View, California; publicly
traded on NYSE under ticker `COUR` since the 2021 IPO; 205M+
registered learners as of March 2026; partners with 375+ leading
universities and industry partners including Stanford, Yale, Google,
IBM, and Meta; offers professional certificates, bachelor's and
master's degrees, and the Coursera Plus subscription product;
operating with anchor offices in Mountain View, New York City,
Toronto, London, Gurgaon (India), Abu Dhabi, and Doha) — is
published at the bare `coursera` Greenhouse slug (the lowercase
brand name; no whitespace transform required since the brand is a
single word) and was confirmed live via run #278's HTTP 200 probe
of `https://api.greenhouse.io/v1/boards/coursera/jobs?content=true`
(8 open roles confirmed at run-278 start). Coursera publishes its
`absolute_url` on **wire-shape variant 2** — the modern US-region
permalink subdomain `https://job-boards.greenhouse.io/coursera/jobs/<id>`
shape — making this the **fourteenth** plugin in the cohort to use
variant 2 (after Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify,
Postman, Webflow, Attentive, Intercom, Mixpanel, Scale AI, Cameo,
and Carta).

Aggregator-callers asking for "all jobs at major
online-learning / MOOC / EdTech vendors" must currently either (a)
deduce the Greenhouse slug `coursera` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted
role for a company-name match — both paths bypass the per-source
health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`coursera` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-six times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo, Carta, ClassPass).

## 2. Goals

- Ship a `source-company-coursera` plugin returning live `JobPostDto`
  rows for the public Coursera careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-chime` plugin (Greenhouse-backed, `category:
  'company'`, `Site.COURSERA` enum value, `id` prefixed `coursera-`)
  — Chime is the closest structural cousin because both publish from
  Greenhouse public API on **wire-shape variant 2**, both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline (D-08), both omit
  D-09 brand-name trim (single-token bare brand wire `company_name`),
  both omit D-10 wire-title `.trim()` (trim-clean wire titles), and
  both emit fully-clean wire `departments[0].name` byte-for-byte
  (D-11 fully-clean). Coursera carries **zero structural deviations**
  from the Chime template — making this the **first** Greenhouse-only
  company-direct plugin in run-history to ship as a clean re-spin of
  a prior cohort plugin with no per-axis deviations.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Coursera.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'coursera'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-chime` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Coursera's USD / CAD / GBP / INR / AED / QAR
  ranges.
- Backfilling historical Coursera postings — only the open-roles slice
  the Greenhouse public API returns.
- Coursera Learning Platform integration — Coursera's MOOC platform
  is a separate product surface from the careers board; learner /
  course / partner data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.COURSERA`** in the source
> registry, so that **a single `siteType: [Site.COURSERA]` request
> returns Coursera's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern with the
> entity-decode-then-tag-strip description pipeline AND a single-token
> bare-brand `company_name` AND no wire-title `.trim()` deviation
> AND a fully-clean department pass-through**, so that **adding the
> next Greenhouse-only employer publishing on the canonical
> variant-2 shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Coursera**, so that **a Greenhouse outage on
> the Coursera board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.COURSERA = 'coursera'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-coursera` under `packages/plugins/`.                | must     |
| FR-3  | `CourseraService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `coursera-`, `site === Site.COURSERA`, and `companyName === 'Coursera'` (wire `company_name` is the single-token bare brand `'Coursera'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/coursera.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-2 shape `https://job-boards.greenhouse.io/coursera/jobs/<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse variant-2 form (Spec 068 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 8 wire titles in the run-278 probe carry trailing ASCII-space padding; the plugin emits `listing.title` byte-for-byte. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 8 wire department names in the run-278 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[CourseraModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-coursera/src/coursera.service.ts
@SourcePlugin({ site: Site.COURSERA, name: 'Coursera', category: 'company' })
@Injectable()
export class CourseraService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/coursera/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `coursera-${listing.id}`,
  site:         Site.COURSERA,
  title:        listing.title ?? '',                        // D-10 omitted (no trim)
  companyName:  listing.company_name ?? 'Coursera',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/coursera/jobs/${listing.id}`,
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

- **Unit (`__tests__/coursera.service.spec.ts`):**
  1. NestJS DI resolves `CourseraService` through `CourseraModule`.
  2. `Site.COURSERA === 'coursera'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-2
     `job-boards.greenhouse.io/coursera/jobs/<id>` shape lock for the
     wire `absolute_url` pass-through, the decode-then-strip pipeline
     cleanliness, the single-token bare-brand
     `companyName === 'Coursera'` lock, the D-10 omission — emitted
     `title` matches the wire `title` byte-for-byte, and the D-11
     fully-clean department pass-through).
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

- **D-01 (run #278):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Coursera's `https://www.coursera.org/about/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board
  — the canonical machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/coursera/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  fifty-six prior company-direct plugins.
- **D-02 (run #278):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'coursera'`.
- **D-03 (run #278):** No salary parser hook beyond the helpers
  defaults — Coursera posts USD ranges from US offices, CAD from
  Toronto, GBP from London, INR from Gurgaon, AED from Abu Dhabi, and
  QAR from Doha; Spec 014 / 015's parser already covers these locales
  without modification.
- **D-04 (run #278):** **Wire-shape variant 2 — modern US-region
  permalink subdomain `job-boards.greenhouse.io/coursera/jobs/<id>`.**
  Coursera's tenant publishes its `absolute_url` on the variant-2
  shape — confirmed via run #278's HTTP 200 probe of the live API
  where every wire job carries this shape (the first job's
  `absolute_url` is `https://job-boards.greenhouse.io/coursera/jobs/5982730004`).
  The plugin emits `listing.absolute_url` byte-for-byte to preserve
  the canonical destination. The **fallback** `jobUrl` constructor
  (when Greenhouse omits `absolute_url` — a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window) defaults to the same canonical Greenhouse **variant-2**
  form `https://job-boards.greenhouse.io/coursera/jobs/<id>`. This
  is the **fourteenth** plugin in the cohort to use variant 2 (after
  Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman,
  Webflow, Attentive, Intercom, Mixpanel, Scale AI, Cameo, and
  Carta). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io/coursera/jobs/` substring (locking the
  variant-2 shape against future refactors that might naively
  normalise to a different variant).
- **D-05 (run #278):** Use Greenhouse slug `coursera` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like ClassPass (Spec 067 § 10 D-05),
  Carta (Spec 066 § 10 D-05), Cameo (Spec 065 § 10 D-05), Faire
  (Spec 063 § 10 D-05), Mixpanel (Spec 062 § 10 D-05), Intercom
  (Spec 061 § 10 D-05), Elastic (Spec 060 § 10 D-05), Chime (Spec
  059 § 10 D-05), Attentive (Spec 058 § 10 D-05), Webflow (Spec 056
  § 10 D-05), Toast (Spec 055 § 10 D-05), Postman (Spec 054 § 10
  D-05), Netlify (Spec 053 § 10 D-05), Buildkite (Spec 050 § 10
  D-05), Mercury (Spec 049 § 10 D-05), Brex (Spec 047 § 10 D-05),
  Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), and
  Block (Spec 042 § 10 D-05), Coursera's Greenhouse tenant is
  published at the bare slug `coursera` with no slug/wire asymmetry
  (the wire `company_name` is the single-token `'Coursera'`
  byte-for-byte and the slug is `coursera`). Confirmed via run
  #278's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/coursera/jobs?content=true`
  (8 open roles confirmed at run-278 start).
- **D-06 (run #278):** Class names are `CourseraService` /
  `CourseraModule` (PascalCase from the lowercase slug — matches the
  brand's marketing form `Coursera` because the slug is already in
  the brand's marketing case). Rationale: matches the convention
  `CartaService` / `CameoService` / `ChimeService` use for
  slug-derived class names.
- **D-07 (run #278):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-fourth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276, and
  `classpass` at run #277). Run #275's probe sweep across 36
  candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52, run
  #276 shipped), `classpass` (70, run #277 shipped), `coursera` (8,
  run #278 next bite — this spec), `epicgames` (74), `flexport`
  (113), `fubotv` (11), `glossier` (17), `honeycomb` (10), `lattice`
  (11), `masterclass` (6), `mavenclinic` (24), `stitchfix` (22),
  `udemy` (17). `coursera` is alphabetically fourth after `cameo`,
  `carta`, and `classpass`, so this run takes Coursera. The
  remaining ten live hits queue for runs #279+ in alphabetical
  order (`epicgames` next at run #279 with 74 roles). HubSpot's
  sixteenth-consecutive empty re-probe at run-278 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.
- **D-08 (run #278):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like ClassPass (Spec 067 § 10 D-08),
  Carta (Spec 066 § 10 D-08), Cameo (Spec 065 § 10 D-08), Scale AI
  (Spec 064 § 10 D-08), Faire (Spec 063 § 10 D-08), Mixpanel (Spec
  062 § 10 D-08), Intercom (Spec 061 § 10 D-08), Elastic (Spec 060
  § 10 D-08), Chime (Spec 059 § 10 D-08), and the rest of the
  post-Klaviyo cohort, Coursera's tenant emits HTML-entity-encoded
  content (`&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;&lt;strong&gt;About Coursera&lt;/strong&gt;&lt;/p&gt;...`)
  rather than raw HTML tags — confirmed via run #278's HTTP probe
  of the live API (every wire job carries HTML entities including
  `&lt;`, `&gt;`, `&quot;`, and `&amp;`; none carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would leave
  the literal entities in place. Decoding entities **first** and
  then stripping tags yields clean readable text. The pipeline is
  order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b)
  does not contain `&quot;` (named entities decoded), (c) does not
  contain `&amp;`, and (d) does not contain `<p>`, `<div>`,
  `<strong>`, or `<em>` (tags stripped after the decode pass), so a
  future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the
  **twenty-fourth** company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #278):** Brand-name trim D-09 is **omitted**. Rationale:
  Coursera's wire `company_name` is `'Coursera'` byte-for-byte (the
  single-token bare brand name; no legal-entity suffix on the wire —
  confirmed via run-278 probe where every wire job carries
  `company_name === 'Coursera'`, distinct from the legal-entity name
  "Coursera, Inc." that may appear in older SEC filings or the
  NYSE ticker `COUR`). The plugin reads `listing.company_name`
  directly without a string-literal pin, but the unit-test happy
  path asserts the emitted `companyName === 'Coursera'`
  byte-for-byte to lock the observable shape against a future tenant
  rename to add a legal-entity suffix; if such a rename happens, a
  follow-up patch can re-introduce D-09 as a one-line edit.
  **Eighteenth cohort plugin to omit D-09**, returning to the
  single-word bare-brand wire form (ClassPass `'ClassPass'`, Carta
  `'Carta'`, Cameo `'Cameo'`, Mixpanel `'Mixpanel'`, Faire
  `'Faire'`, Intercom `'Intercom'`, Elastic `'Elastic'`, Webflow
  `'Webflow'`, Attentive `'Attentive'`, Postman `'Postman'`,
  Netlify `'Netlify'`, Mercury `'Mercury'`, Buildkite
  `'Buildkite'`, CircleCI `'CircleCI'`, Toast `'Toast'`, plus the
  Ramp Network slug-collapse case where the wire `company_name ===
  'Ramp'` was single-word despite the slug being `rampnetwork`) —
  distinct from Scale AI's first-of-its-kind multi-token bare-brand
  wire `company_name === 'Scale AI'` (with internal whitespace).
- **D-10 (run #278):** Wire-title `.trim()` deviation is **omitted**.
  Rationale: 0 of 8 wire titles in the run-278 probe carry trailing
  ASCII-space padding (`'Chief of Staff - CTO'`, `'Content Ingestion
  & Transformation Specialist'`, `'Degree Program Operations
  Specialist (NCR Region)'`, `'Degrees Success Manager'`,
  `'Director, Global Benefits'`, `'Senior Product Marketing
  Manager'`, `'Stock Compensation Accountant'`, `'VP, Corporate
  Development'` — confirmed via the curl probe). All 8 are clean
  (0 % pad rate). The plugin emits `listing.title` byte-for-byte
  without a `.trim()`. The unit-test happy path asserts the
  emitted `title` matches the wire `title` byte-for-byte for both
  fixture listings — locking the D-10 omission against a future
  refactor that introduces an unnecessary `.trim()`. **Sixth
  cohort plugin to omit D-10** — structurally analogous to Chime
  (Spec 059 § 10 D-10), Scale AI (Spec 064 § 10 D-10), Cameo (Spec
  065 § 10 D-10), Webflow (Spec 056), and the pre-Brex cohort —
  all pure pass-through. Distinct from the trim-applied cohort:
  Brex, Buildkite, ZoomInfo, Attentive, Elastic, Intercom,
  Mixpanel, Faire, Carta, and ClassPass.
- **D-11 (run #278):** The Coursera wire `departments[0].name`
  payload uses **fully-clean multi-token department names** like
  `'Chief of Staff'`, `'Industry Partnerships'`, `'Degrees
  Marketing'`, `'People'`, `'Product Marketing'`, `'Accounting'`,
  `'Corporate Strategy'` — similar to Carta's all-trim-clean pure
  descriptive format and distinct from Cameo's partial-pad
  pass-through. Specifically 0 of the 8 wire department names in
  the run-278 probe carry trailing ASCII-space padding (0 % pad-rate).
  The plugin emits the wire `departments[0].name` byte-for-byte
  (no department-name `.trim()` needed because no wire-side padding
  was observed; the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains
  semantically correct against the clean wire form). The unit-test
  happy path includes (a) a regression guard asserting the emitted
  `department` for the first fixture listing matches the wire
  `departments[0].name === 'Chief of Staff'` byte-for-byte (clean
  multi-token form), and (b) a regression guard asserting the
  emitted `department` for the second fixture listing matches the
  wire `departments[0].name === 'Industry Partnerships'`
  byte-for-byte (clean multi-token form).
- **D-12 (run #278):** This plugin is the **fourth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, and ClassPass at run #277). The
  remaining ten live hits from the run-275 probe sweep queue for
  runs #279+ in alphabetical order: `epicgames` (74 roles, run
  #279 next bite), `flexport` (113), `fubotv` (11), `glossier`
  (17), `honeycomb` (10), `lattice` (11), `masterclass` (6),
  `mavenclinic` (24), `stitchfix` (22), `udemy` (17). Subsequent
  runs after the pool is exhausted (#288+ by current arithmetic)
  will pivot to a **fifth fresh probe sweep** targeting yet-untested
  large-employer candidate slugs. HubSpot's sixteenth-consecutive
  empty re-probe at run-278 start (`meta.total === 0`) further
  confirms the documented "remains deferred" pattern.

## 11. References

- `packages/plugins/source-company-chime/src/chime.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 059 / run #269; same D-04 variant 2, D-08 entity-
  decode-then-tag-strip, D-09 omitted, D-10 omitted, D-11 fully-clean
  as Coursera; zero structural deviations).
- `packages/plugins/source-company-cameo/src/cameo.service.ts` —
  prior cohort plugin with D-10 omitted (Spec 065 / run #275; Cameo
  uses variant 2 + D-08 + D-09 omitted + D-10 omitted as Coursera but
  has D-11 partial-pad pass-through instead of fully-clean).
- `packages/plugins/source-company-carta/src/carta.service.ts` —
  prior cohort plugin with D-11 fully-clean (Spec 066 / run #276;
  Carta uses variant 2 + D-08 + D-09 omitted + D-11 fully-clean as
  Coursera but applies D-10 instead of omitting it).
- `packages/plugins/source-company-classpass/src/classpass.service.ts` —
  immediately prior cohort plugin (Spec 067 / run #277; ClassPass
  uses variant 12 vanity-domain + D-08 + D-09 omitted + D-10 applied
  + D-11 fully-clean — distinct from Coursera on D-04 wire-shape and
  D-10 application).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
