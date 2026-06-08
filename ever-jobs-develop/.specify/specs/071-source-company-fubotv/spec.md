# Spec: 071 — Source Company Plugin: fuboTV

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 071                                                                                                                                                                                            |
| Slug           | source-company-fubotv                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #281)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..070                                                                                                                                                                        |

## 1. Problem Statement

Run #280's Spec 070 closed end-to-end (Flexport shipped — 8 unit
tests green; the **sixth** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #281+ to take **fuboTV** next as the alphabetically-seventh live
hit from that pool (11 roles confirmed at run-275 probe time;
re-confirmed at run-281 start with 11 jobs returned by the HTTP probe).
Run #281 also re-probes the rolling `hubspot` candidate to keep the
documented "remains deferred" pattern fresh
(nineteenth-consecutive empty re-probe at run-281 start —
`meta.total === 0`).

fuboTV — operator of the **dominant
sports-first-live-TV-streaming platform** (founded as Fanvision by
David Gandler, Sung Ho Ahn, and Alberto Horihuela in 2015 in New
York City; rebranded to fuboTV in 2017; publicly traded on NYSE
under ticker `FUBO` since the 2020 IPO; combined with Hulu + Live TV
in 2025 to form an enlarged streaming portfolio under the parent
"FuboTV Inc."; operating with anchor offices in New York City (HQ),
Paris, and Bengaluru; offers sports-first live TV streaming,
premium add-on content packs, multiview, free-to-play games, and
advertising on its proprietary CTV platform across CTV, Smart TV,
mobile, and web surfaces; 1.7M+ paid subscribers in North America
plus an expanded base via the Hulu + Live TV acquisition) — is
published at the bare `fubotv` Greenhouse slug (the lowercase
brand name including the legacy "TV" suffix) and was confirmed
live via run #281's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`
(11 open roles confirmed at run-281 start). fuboTV publishes its
`absolute_url` on a **previously-unobserved wire-shape variant** —
the **vanity-domain fixed-path query-only-id shape**
`https://careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`
(vanity-domain `careers.fubo.tv` rather than the parent
`fubotv.com` or any `jobs.fubo.tv` subdomain;
`fubotv-job-openings/` fixed path; single `gh_jid` query
parameter — the listing ID appears **only** in the query
parameter, not in the path — distinct from variant 12's
`careers/opportunities/<id>?gh_jid=<id>` shape and variant 13's
`careers/jobs/<id>?gh_jid=<id>` shape, where the ID is
duplicated in both path and query). This is **wire-shape
variant 14** — the **seventeenth distinct wire-shape variant**
in the company-direct cohort and the **first** to publish the
listing ID **only** in the query parameter (no path-embedded
ID).

Aggregator-callers asking for "all jobs at major
sports-streaming / OTT-streaming / linear-TV-streaming vendors"
must currently either (a) deduce the Greenhouse slug `fubotv`
and call `source-ats-greenhouse` by hand, or (b) post-filter
the firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `fubotv` Greenhouse slug behind its own `Site` enum value, in
the identical shape the codebase already uses fifty-nine times
(Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic, Intercom,
Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass, Coursera,
Epic Games, Flexport — plus the seven legacy company-direct
plugins from before Spec 020).

## 2. Goals

- Ship a `source-company-fubotv` plugin returning live `JobPostDto`
  rows for the public fuboTV careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-classpass` plugin (Greenhouse-backed, `category:
  'company'`, `Site.FUBOTV` enum value, `id` prefixed `fubotv-`)
  — ClassPass is the closest structural cousin because both
  publish from Greenhouse public API on a **vanity-domain**
  shape with **canonical Greenhouse variant-2 fallback** (D-04),
  both emit HTML-entity-encoded content (`&lt;p&gt;...`)
  requiring the entity-decode-then-tag-strip description
  pipeline (D-08), both have a wire `company_name` that is a
  single-token bare brand without legal-entity suffix (D-09
  omitted), both apply D-10 wire-title `.trim()`, and both
  emit fully-clean wire `departments[0].name` byte-for-byte
  (D-11 fully-clean). fuboTV carries **two structural
  deviations** from the ClassPass template — D-04 wire-shape
  variant 14 (vs. ClassPass's variant 12) and the new D-12
  location-side `.trim()` (since 11 of 11 wire `location.name`
  values carry trailing pad bytes — first cohort plugin to
  apply D-12).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy
  path + at least five failure / boundary modes against
  deterministic fixtures — **never** the live Greenhouse
  endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case fuboTV.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board
  is sufficient.
- Any locale / search-term / location filtering beyond what
  `source-company-classpass` already supports — the company
  plugins are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover fuboTV's USD ranges. Spec 015's
  helpers parse the New York City salary banding (`$130,000 –
  $160,000 per year`) without modification.
- Backfilling historical fuboTV postings — only the open-roles
  slice the Greenhouse public API returns.
- Hulu + Live TV / Molotov integration — fuboTV's M&A
  acquisitions retain separate careers surfaces.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FUBOTV`** in the
> source registry, so that **a single `siteType: [Site.FUBOTV]`
> request returns fuboTV's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point
> of the Greenhouse-backed company-direct pattern with a
> previously-unobserved wire-shape variant (vanity-domain
> fixed-path query-only-id), AND a slug/wire-asymmetric
> `company_name` (slug `fubotv`, wire `'Fubo'`), AND a
> wire-title `.trim()` application against an extreme ~91 %
> pad rate, AND a fully-clean department pass-through, AND a
> brand-new D-12 location-side `.trim()` against a 100 %
> location-pad rate**, so that **adding the next Greenhouse-
> only employer publishing on a similarly-shaped vanity-domain
> board costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want
> **per-source failure isolation for fuboTV**, so that **a
> Greenhouse outage on the fuboTV board does not trip the
> breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.FUBOTV = 'fubotv'` to `packages/models/src/enums/site.enum.ts`.                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-fubotv` under `packages/plugins/`.                  | must     |
| FR-3  | `FubotvService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `fubotv-`, `site === Site.FUBOTV`, and `companyName === 'Fubo'` (wire `company_name` is the single-token bare brand `'Fubo'` byte-for-byte; **slug/wire asymmetry** since the slug is `fubotv` but the wire is `'Fubo'`; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/fubotv.service.spec.ts`, all using mocked HTTP.        | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-14 shape `https://careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) defaults to the canonical Greenhouse variant-2 form `https://job-boards.greenhouse.io/fubotv/jobs/<id>` rather than reconstructing the vanity-domain shape (Spec 071 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 10 of 11 wire titles in the run-281 probe carry trailing ASCII-space padding (`'Director, Content Strategy & Analysis '`, `'Senior Software Engineer, Backend '`, `'Live Events Engineer '`, plus 7 others — ~91 % pad rate, the **highest pad rate observed in the cohort to date**); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 11 wire department names in the run-281 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |
| FR-15 | Wire `location.name` is **trimmed** via `.trim()` (D-12 — new axis) — 11 of 11 wire location names in the run-281 probe carry trailing ASCII-space padding (`'New York, NY '`, `'Denver, CO '`); the plugin applies `.trim()` before constructing `LocationDto`. **First cohort plugin to apply D-12.** | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for an 11-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on an 11-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[FubotvModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-fubotv/src/fubotv.service.ts
@SourcePlugin({ site: Site.FUBOTV, name: 'fuboTV', category: 'company' })
@Injectable()
export class FubotvService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `fubotv-${listing.id}`,
  site:         Site.FUBOTV,
  title:        (listing.title ?? '').trim(),                 // D-10 applied
  companyName:  listing.company_name ?? 'Fubo',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/fubotv/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr.trim() }) : null,  // D-12 applied
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

- **Unit (`__tests__/fubotv.service.spec.ts`):**
  1. NestJS DI resolves `FubotvService` through `FubotvModule`.
  2. `Site.FUBOTV === 'fubotv'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-14
     `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>` shape lock
     for the wire `absolute_url` pass-through, the decode-then-strip
     pipeline cleanliness, the slug/wire-asymmetric
     `companyName === 'Fubo'` lock against the wire byte-for-byte,
     the D-10 application — emitted `title` for the second
     listing equals trimmed form `'Senior Software Engineer,
     Backend'` AND is byte-distinct from wire-padded form AND is
     exactly 1 byte shorter, the D-11 fully-clean department
     pass-through, and the D-12 location-side `.trim()` —
     emitted `location.city` for the first listing equals
     trimmed `'New York, NY'` AND is byte-distinct from
     wire-padded `'New York, NY '` form).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form).
  6. `searchTerm` filters listings by department name (case-insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E
  lives in `source-ats-greenhouse` and exercises the same wire
  shape.
- **Performance:** none beyond NFR-1's narrative budget.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #281):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: fuboTV's
  `https://careers.fubo.tv/` careers landing page is rendered
  client-side from a Greenhouse iframe — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/fubotv/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern
  from fifty-nine prior company-direct plugins.
- **D-02 (run #281):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'fubotv'`.
- **D-03 (run #281):** No salary parser hook beyond the helpers
  defaults — fuboTV posts USD ranges from New York City; Spec
  014 / 015's parser already covers USD without modification.
- **D-04 (run #281):** **Wire-shape variant 14 — vanity-domain
  fixed-path query-only-id `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`.**
  fuboTV's tenant publishes its `absolute_url` on the
  previously-unobserved variant-14 shape — confirmed via run
  #281's HTTP 200 probe of the live API where every wire job
  carries this shape (the first job's `absolute_url` is
  `https://careers.fubo.tv/fubotv-job-openings/?gh_jid=7661733`).
  The plugin emits `listing.absolute_url` byte-for-byte to
  preserve the canonical destination. The **fallback** `jobUrl`
  constructor (when Greenhouse omits `absolute_url` — a
  defence-in-depth path Greenhouse has not exercised against
  this tenant in the audit window) defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/fubotv/jobs/<id>` rather
  than reconstructing the vanity-domain shape, because the
  vanity-domain shape requires `fubo.tv`-side proxying that may
  not be guaranteed for all listing IDs (same fallback strategy
  as ClassPass — Spec 067 § 10 D-04 — and Epic Games — Spec
  069 § 10 D-04). This is the **first** plugin in the cohort
  to use **wire-shape variant 14** — the **seventeenth distinct
  wire-shape variant** and the **first** to publish the listing
  ID **only** in the query parameter (no path-embedded ID),
  byte-distinct from variant 12's `<id>` in path **and** query
  and variant 13's `<id>` in path **and** query. The unit-test
  happy path includes a regression guard asserting (a) the
  wire `absolute_url` flows through to `jobUrl` byte-for-byte
  AND (b) the emitted `jobUrl` contains the literal
  `careers.fubo.tv/fubotv-job-openings/` substring AND the
  literal `?gh_jid=` query parameter AND must NOT contain
  `job-boards.greenhouse.io` (locking the variant-14 shape
  against future refactors that might naively normalise to
  variant 2).
- **D-05 (run #281):** Use Greenhouse slug `fubotv` (the
  lowercase legacy brand name with the "TV" suffix). The wire
  `company_name === 'Fubo'` byte-for-byte, **byte-distinct
  from the slug `fubotv`** — this is the **third** slug/wire
  asymmetry case in the cohort after Ramp Network (slug
  `rampnetwork`, wire `'Ramp'`) and Scale AI (slug `scaleai`,
  wire `'Scale AI'`) — but the **first** asymmetry case where
  the wire `company_name` is **shorter** than the slug (wire
  `'Fubo'` is 4 bytes; slug `fubotv` is 6 bytes), reflecting
  the brand's 2023 rename from "fuboTV" to "Fubo" while the
  Greenhouse tenant retained the legacy `fubotv` slug.
  Confirmed via run #281's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/fubotv/jobs?content=true`
  (11 open roles confirmed at run-281 start).
- **D-06 (run #281):** Class names are `FubotvService` /
  `FubotvModule` (PascalCase from the lowercase slug `fubotv`
  as a single Pascal token — matches the convention
  `EpicgamesService` and `ClasspassService` use for slug-derived
  class names from compound slugs that don't decompose along
  obvious word boundaries; we treat `fubotv` as a single
  Pascal token rather than the more visually intuitive
  `FuboTVService` / `FuboTVModule` that would mirror the
  brand's marketing form). The plugin's `@SourcePlugin({ name:
  'fuboTV' })` decorator preserves the brand's marketing form
  for human-facing display.
- **D-07 (run #281):** Selected from the **fourth fresh probe
  sweep** live-board pool processing, alphabetically-seventh
  live-board hit (after `cameo` shipped at run #275, `carta`
  at run #276, `classpass` at run #277, `coursera` at run
  #278, `epicgames` at run #279, and `flexport` at run #280).
  Run #275's probe sweep across 36 candidate slugs found
  exactly **fourteen** live boards on Greenhouse. The
  remaining seven live hits queue for runs #282+ in
  alphabetical order (`glossier` next at run #282 with 17
  roles). HubSpot's nineteenth-consecutive empty re-probe at
  run-281 start (`meta.total === 0`) further confirms the
  documented "remains deferred" pattern.
- **D-08 (run #281):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form
  thirty-three prior company-direct plugins used. Rationale:
  like every plugin from Klaviyo onwards, fuboTV's tenant
  emits HTML-entity-encoded content (`&lt;p&gt;&lt;strong&gt;
  About Fubo:&lt;/strong&gt;&lt;/p&gt;...`) rather than raw
  HTML tags — confirmed via run #281's HTTP probe of the
  live API. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`.
  The unit-test happy path asserts the cleaned description
  (a) does not contain `&lt;` (entities decoded), (b) does
  not contain `&quot;` (named entities decoded), (c) does
  not contain `&amp;`, and (d) does not contain `<p>`,
  `<div>`, `<strong>`, or `<em>` (tags stripped after the
  decode pass), so a future refactor that swaps the order
  or drops one half of the pipeline would surface as a test
  diff. This is the **twenty-seventh** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip
  pipeline.
- **D-09 (run #281):** Brand-name trim D-09 is **omitted**.
  Rationale: fuboTV's wire `company_name` is `'Fubo'`
  byte-for-byte (the single-token bare brand name reflecting
  the 2023 rebrand from "fuboTV"; no legal-entity suffix on
  the wire — distinct from the legal-entity name "FuboTV
  Inc." that appears in current SEC filings under NYSE ticker
  `FUBO` and the prior brand "fuboTV" used in the
  pre-rename marketing). The plugin reads
  `listing.company_name` directly with `'Fubo'` as a defensive
  fallback. The unit-test happy path asserts the emitted
  `companyName === 'Fubo'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a
  legal-entity suffix or revert to the prior "fuboTV" brand;
  if such a rename happens, a follow-up patch can re-introduce
  D-09 as a one-line edit. **Twenty-first cohort plugin to
  omit D-09**, returning to the single-word bare-brand wire
  form.
- **D-10 (run #281):** Wire-title `.trim()` deviation is
  **applied**. Rationale: at least 10 of 11 wire titles in the
  run-281 probe carry trailing ASCII-space padding
  (`'Director, Content Strategy & Analysis '`, `'Director of
  Engineering - Site Reliability/Infrastructure '`, `'Live
  Events Engineer '`, `'Senior Director, Business Development '`,
  `'Senior Director, Content Strategy & Acquisition '`,
  `'Senior Software Engineer, Backend '`, `'Senior Software
  Engineer, Platform '`, `'Senior Software Engineer, Search &
  Personalization '`, `'Software Engineer, Backend '`,
  `'Software Engineer, Video Input/Output Systems '` — ~91 %
  pad rate, the **highest pad rate observed in the cohort to
  date**, edging out Flexport's run-280 ~9.7 % pad rate by an
  order of magnitude). The single clean-title listing is
  `'Manager, Business Development - Platform Partnerships'`.
  The plugin applies `.trim()` to the wire `title` before
  downstream filters and emit so the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter sees the
  trimmed form, and the emitted `JobPostDto.title` does not
  carry trailing pad bytes. The unit-test happy path's second
  listing fixture uses the wire-padded title `'Senior
  Software Engineer, Backend '` (with trailing single space)
  and asserts (a) the emitted `title` equals the trimmed
  form `'Senior Software Engineer, Backend'` AND is
  byte-distinct from the wire form `'Senior Software
  Engineer, Backend '` AND (b) is exactly 1 byte shorter —
  locking the D-10 application against a future refactor
  that drops the `.trim()`. **Thirteenth cohort plugin to
  apply D-10** (after Brex, Buildkite, ZoomInfo, Attentive,
  Elastic, Intercom, Mixpanel, Faire, Carta, ClassPass, Epic
  Games, and Flexport).
- **D-11 (run #281):** The fuboTV wire `departments[0].name`
  payload uses **fully-clean multi-word descriptive department
  names** like `'Content Strategy'`, `'Technology'`, and
  `'Business Development'`. Specifically 0 of the 11 wire
  department names in the run-281 probe carry trailing
  ASCII-space padding (0 % pad-rate). The plugin emits the
  wire `departments[0].name` byte-for-byte (no department-name
  `.trim()` needed). The unit-test happy path includes
  per-listing regression guards asserting the emitted
  `department` matches the wire `departments[0].name`
  byte-for-byte (`'Business Development'` for the first
  fixture listing, `'Technology'` for the second).
- **D-12 (run #281):** **Wire-`location.name` `.trim()`
  applied — new axis.** Rationale: 11 of 11 wire
  `location.name` values in the run-281 probe carry
  trailing ASCII-space padding (`'New York, NY '` and
  `'Denver, CO '` — 100 % pad-rate). This is qualitatively
  different from the title-side D-10 axis: every listing
  is affected, so passing through padded location strings
  would emit observably-padded `location.city` to every
  caller. The plugin applies `.trim()` to
  `listing.location?.name` before constructing the
  `LocationDto({ city })` so that downstream consumers see
  `'New York, NY'` (clean) rather than `'New York, NY '`
  (padded). The case-insensitive
  `locationStr.toLowerCase().includes(input.location)`
  filter remains semantically correct against either
  form because `.includes()` is substring-match. The
  unit-test happy path asserts the emitted
  `location.city` for both fixture listings equals the
  trimmed form byte-for-byte AND is byte-distinct from the
  wire form AND is exactly 1 byte shorter. **First cohort
  plugin to apply D-12** — opening a new deviation axis
  that prior plugins (Cameo, Scale AI, Carta, ClassPass,
  Coursera, Epic Games, Flexport, etc.) did not exercise
  because their wire `location.name` payloads were
  trim-clean. The `isRemote` derivation uses the
  pre-trim raw `locationStr` for substring matching
  (`.toLowerCase().includes('remote')`) since the trim
  doesn't change semantic content for that boolean flag.
- **D-13 (run #281):** **Two structural deviations** from
  the ClassPass (Spec 067) template — D-04 wire-shape
  variant 14 (vs. ClassPass's variant 12) and D-12
  location-side `.trim()` (new axis, first cohort
  application). All other axes share with ClassPass: D-08
  entity-decode-then-tag-strip pipeline, D-09 omitted
  (single-token bare brand), D-10 applied, D-11
  fully-clean. Distinct from Flexport (Spec 070; same
  D-08 / D-09 omitted / D-10 applied / D-11 fully-clean
  but variant 10 instead of variant 14, and no D-12
  application).

## 11. References

- `packages/plugins/source-company-classpass/src/classpass.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 067 / run #277; same D-08 + D-09 omitted +
  D-10 applied + D-11 fully-clean + canonical-Greenhouse-
  variant-2-fallback strategy as fuboTV; distinct on D-04
  wire-shape variant and on the new D-12 application).
- `packages/plugins/source-company-flexport/src/flexport.service.ts` —
  immediately prior cohort plugin (Spec 070 / run #280;
  Flexport uses variant 10 + D-08 + D-09 omitted + D-10
  applied + D-11 fully-clean — distinct from fuboTV on D-04
  wire-shape variant and on D-12).
- `packages/plugins/source-company-rampnetwork/src/rampnetwork.service.ts` —
  prior slug/wire-asymmetry cohort plugin (Spec 052 / run
  #262; slug `rampnetwork`, wire `'Ramp'` — first asymmetry
  case; structurally analogous to fuboTV's `fubotv`/`'Fubo'`
  slug-vs-wire pair).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of
  scope here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the
  `decodeHtmlEntities` + `stripHtmlTags` helpers this spec
  composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in
  this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration
  contract this spec satisfies.
