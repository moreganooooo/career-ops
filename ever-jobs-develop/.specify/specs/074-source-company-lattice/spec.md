# Spec: 074 — Source Company Plugin: Lattice

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 074                                                                                                                                                                                            |
| Slug           | source-company-lattice                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #284)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..073                                                                                                                                                                        |

## 1. Problem Statement

Run #283's Spec 073 closed end-to-end (Honeycomb shipped — 8 unit
tests green; the **ninth** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool) and explicitly queued runs #284+
to take **Lattice** next as the alphabetically-tenth live hit from
that pool (11 roles confirmed at run-275 probe time; re-confirmed at
run-284 start with 11 jobs returned by the HTTP probe).

Lattice — operator of the **dominant continuous-performance-
management and HR-software platform pioneered around the
employee-engagement, OKR-tracking, growth-and-feedback data
model** (founded by Jack Altman and Eric Koslow in 2015 in
San Francisco; raised $328M+ across rounds led by Tiger Global,
Founders Fund, Y Combinator, Khosla Ventures, and Thrive Capital
at a peak $3B valuation in 2022; ships an HRIS / performance /
engagement / growth / compensation suite across the
people-management segment alongside competitors Workday,
BambooHR, Culture Amp, 15Five, and Leapsome, with a remote-first
workforce concentrated across the United States, Canada, and the
United Kingdom) — is published at the bare `lattice` Greenhouse
slug (the lowercase brand name; symmetric with the wire
`company_name`) and was confirmed live via run #284's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/lattice/jobs?content=true`
(11 open roles confirmed at run-284 start). Lattice publishes its
`absolute_url` on a **previously-unobserved wire-shape variant 15**
— the bare brand-domain shape `https://lattice.com/job?gh_jid=<id>`
(bare `lattice.com` rather than `www.lattice.com` or any vanity
subdomain like `careers.lattice.com`; **`/job`** singular fixed path
— distinct from variant 13's `careers/jobs/<id>?gh_jid=<id>` shape
where the ID also appears in the path; the listing ID appears
**only** in the `gh_jid` query parameter, not in the path — distinct
from variant 14's `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>`
vanity-subdomain shape). This is the **first** plugin in the cohort
to use **wire-shape variant 15** — the **eighteenth distinct
wire-shape variant** in the company-direct cohort.

Aggregator-callers asking for "all jobs at major HR-software /
people-management / performance-management vendors" must currently
either (a) deduce the Greenhouse slug `lattice` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match — both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`lattice` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses sixty-two times (Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo, Carta, ClassPass, Coursera, Epic Games, Flexport, fuboTV,
Glossier, Honeycomb — plus the seven legacy company-direct plugins
from before Spec 020).

## 2. Goals

- Ship a `source-company-lattice` plugin returning live `JobPostDto`
  rows for the public Lattice careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-honeycomb` plugin (Greenhouse-backed, `category:
  'company'`, `Site.LATTICE` enum value, `id` prefixed `lattice-`)
  — Honeycomb is the closest structural cousin because both publish
  from Greenhouse public API, both emit HTML-entity-encoded content
  (`&lt;p&gt;...`) requiring the entity-decode-then-tag-strip
  description pipeline (D-08), both omit D-09 brand-name trim (the
  plugin reads `listing.company_name` directly). Lattice carries
  **three structural deviations** from the Honeycomb template —
  D-04 wire-shape variant 15 (bare brand-domain, singular `/job`
  fixed path, query-only-id; first cohort plugin to use variant 15),
  D-10 NOT applied (0/11 wire titles padded — clean wire-title
  pass-through, distinct from Honeycomb's 2/10 trailing-pad form),
  and D-11 APPLIED for the **first time in cohort history** (3/11
  wire department names carry trailing ASCII-space padding —
  `'Customer Account Management '`, `'Product '` × 2 listings — so
  the plugin applies `.trim()` to `listing.departments[0].name`
  before downstream filters and emit; **first cohort plugin to apply
  D-11** — opening the deviation axis from "fully-clean
  pass-through" to "trim-on-emit").
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path +
  at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Lattice.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'lattice'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-honeycomb` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Lattice's USD / GBP / CAD ranges.
- Backfilling historical Lattice postings — only the open-roles
  slice the Greenhouse public API returns.
- Lattice product-API / engagement-survey integration — Lattice's
  HRIS / performance / engagement product surfaces are separate
  product surfaces from the careers board; product API data is out
  of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.LATTICE`** in the
> source registry, so that **a single `siteType: [Site.LATTICE]`
> request returns Lattice's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of
> the Greenhouse-backed company-direct pattern with the entity-
> decode-then-tag-strip description pipeline AND the FIRST cohort
> plugin to apply D-11 wire-department `.trim()` AND a
> previously-unobserved bare-brand-domain `/job?gh_jid=<id>` wire
> shape**, so that **adding the next Greenhouse-only employer
> publishing on a similar bare-domain singular-/job query-only-id
> shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Lattice**, so that **a Greenhouse outage on
> the Lattice board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.LATTICE = 'lattice'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-lattice` under `packages/plugins/`.                 | must     |
| FR-3  | `LatticeService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `lattice-`, `site === Site.LATTICE`, and `companyName === 'Lattice'` (wire `company_name` is the single-token bare brand `'Lattice'` byte-for-byte; slug-symmetric with the lowercase slug `lattice`; D-09 omitted — the plugin reads `listing.company_name` directly with `'Lattice'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/lattice.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;h2&gt;&lt;strong&gt;...&lt;/strong&gt;&lt;/h2&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;h2&gt;&lt;strong&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-15 shape `https://lattice.com/job?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/lattice/jobs/<id>` rather than reconstructing the bare-domain shape (Spec 074 § 10 D-04 — same fallback strategy as ClassPass / Epic Games / fuboTV). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 11 wire titles in the run-284 probe carry whitespace padding; the plugin emits `listing.title` byte-for-byte without a `.trim()` (the wire is fully clean). | must     |
| FR-14 | Wire `departments[0].name` IS trimmed via `.trim()` before downstream filters and emit (D-11 **applied** — 3 of 11 wire department names in the run-284 probe carry trailing ASCII-space padding: `'Customer Account Management '` × 1, `'Product '` × 2; ~27 % pad rate); **first cohort plugin to apply D-11** — opening the deviation axis. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for an 11-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on an 11-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[LatticeModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-lattice/src/lattice.service.ts
@SourcePlugin({ site: Site.LATTICE, name: 'Lattice', category: 'company' })
@Injectable()
export class LatticeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/lattice/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `lattice-${listing.id}`,
  site:         Site.LATTICE,
  title:        listing.title ?? null,                                // D-10 omitted (clean wire)
  companyName:  listing.company_name ?? 'Lattice',                    // D-09 omitted; slug-symmetric
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/lattice/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   (listing.departments?.[0]?.name ?? '').trim() || null, // D-11 APPLIED — first cohort
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/lattice.service.spec.ts`):**
  1. NestJS DI resolves `LatticeService` through `LatticeModule`.
  2. `Site.LATTICE === 'lattice'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-15
     `lattice.com/job?gh_jid=<id>` shape lock for the wire
     `absolute_url` pass-through, the decode-then-strip pipeline
     cleanliness, the slug-symmetric wire `companyName === 'Lattice'`
     byte-for-byte AND `companyName === fixture.jobs[0].company_name`
     byte-for-byte AND case-insensitively equal to the slug
     `lattice` (locking the slug-symmetric wire observable — D-09
     omission lock with case-symmetric wire variant), the **D-11
     application lock** — emitted `department` for the second
     listing equals trimmed form `'Product'` AND is byte-distinct
     from wire-padded form `'Product '` AND is exactly 1 byte
     shorter; locking the first-ever cohort D-11 application).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the byte-for-byte wire form — D-10 omitted).
  6. `searchTerm` filters listings by department name (case-
     insensitive, against the trimmed form — D-11 search guard).
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

- **D-01 (run #284):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Lattice's
  `https://lattice.com/careers` careers landing page redirects buyers
  to a Greenhouse-hosted board — the canonical machine-readable feed
  for this tenant is the
  `api.greenhouse.io/v1/boards/lattice/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  sixty-two prior company-direct plugins.
- **D-02 (run #284):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'lattice'`.
- **D-03 (run #284):** No salary parser hook beyond the helpers
  defaults — Lattice posts USD / GBP / CAD ranges from US, UK, and
  Canadian remote roles; Spec 014 / 015's parser already covers all
  three currencies without modification.
- **D-04 (run #284):** **Wire-shape variant 15 — bare brand-domain
  singular-`/job` query-only-id.** Lattice's tenant publishes its
  `absolute_url` on a **previously-unobserved bare brand-domain
  shape** `https://lattice.com/job?gh_jid=<id>` — confirmed via
  run #284's HTTP 200 probe of the live API where every wire job
  carries this shape (the first job's `absolute_url` is
  `https://lattice.com/job?gh_jid=8483245002`). The shape is
  characterised by:
    - bare brand domain `lattice.com` (not `www.lattice.com`, not
      any `careers.` or `jobs.` subdomain);
    - singular `/job` fixed path (not plural `/jobs/`, not
      `/careers/jobs/`, not `/careers/opportunities/`);
    - listing ID appears **only** in the `gh_jid` query parameter
      (no path-embedded ID — distinct from variant 13's
      `epicgames.com/careers/jobs/<id>?gh_jid=<id>` where the ID
      duplicates in path and query).
  This is the **first** plugin in the cohort to use **wire-shape
  variant 15** — the **eighteenth distinct wire-shape variant** in
  the company-direct cohort. The plugin emits `listing.absolute_url`
  byte-for-byte to preserve the canonical destination. The
  **fallback** `jobUrl` constructor (when Greenhouse omits
  `absolute_url` — a defence-in-depth path Greenhouse has not
  exercised against this tenant in the audit window) defaults to
  the canonical Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/lattice/jobs/<id>` rather than
  reconstructing the bare-domain shape, because the bare-domain
  shape requires `lattice.com`-side proxying that may not be
  guaranteed for all listing IDs (same fallback strategy as
  ClassPass — Spec 067 § 10 D-04 — Epic Games — Spec 069 § 10 D-04
  — and fuboTV — Spec 071 § 10 D-04). The unit-test happy path
  includes a regression guard asserting (a) the wire `absolute_url`
  flows through to `jobUrl` byte-for-byte AND (b) the emitted
  `jobUrl` contains the literal `lattice.com/job?gh_jid=` substring
  AND must NOT contain `job-boards.greenhouse.io` (locking the
  variant-15 bare-domain shape against future refactors that might
  naively normalise to variant 2).
- **D-05 (run #284):** Use Greenhouse slug `lattice` (the lowercase
  bare brand name; symmetric case-insensitively with the wire
  `company_name === 'Lattice'`). Rationale: like Honeycomb (Spec 073
  § 10 D-05) and the rest of the bare-slug cohort, Lattice's
  Greenhouse tenant is published at the bare slug `lattice`.
  Confirmed via run #284's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/lattice/jobs?content=true`
  (11 open roles confirmed at run-284 start).
- **D-06 (run #284):** Class names are `LatticeService` /
  `LatticeModule` (PascalCase from the lowercase slug `lattice`).
  Rationale: matches the convention `HoneycombService` /
  `CartaService` / `CameoService` use for slug-derived class names.
- **D-07 (run #284):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-tenth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276,
  `classpass` at run #277, `coursera` at run #278, `epicgames` at
  run #279, `flexport` at run #280, `fubotv` at run #281,
  `glossier` at run #282, and `honeycomb` at run #283). Run #275's
  probe sweep across 36 candidate slugs found exactly **fourteen**
  live boards on Greenhouse: `cameo` (3 jobs, run #275 shipped),
  `carta` (52, run #276 shipped), `classpass` (70, run #277
  shipped), `coursera` (8, run #278 shipped), `epicgames` (74, run
  #279 shipped), `flexport` (113, run #280 shipped), `fubotv` (11,
  run #281 shipped), `glossier` (17, run #282 shipped), `honeycomb`
  (10, run #283 shipped), `lattice` (11, run #284 next bite — this
  spec), `masterclass` (6), `mavenclinic` (24), `stitchfix` (22),
  `udemy` (17). `lattice` is alphabetically tenth so this run takes
  Lattice. The remaining four live hits queue for runs #285+ in
  alphabetical order (`masterclass` next at run #285 with 6 roles).
- **D-08 (run #284):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Honeycomb (Spec 073 § 10 D-08),
  Glossier (Spec 072 § 10 D-08), fuboTV (Spec 071 § 10 D-08), and
  the rest of the post-Klaviyo cohort, Lattice's tenant emits
  HTML-entity-encoded content (`&lt;h2&gt;&lt;strong&gt;This is Sales
  at Lattice&lt;/strong&gt;&lt;/h2&gt;...`) rather than raw HTML
  tags — confirmed via run #284's HTTP probe of the live API (every
  wire job carries HTML entities including `&lt;`, `&gt;`, `&amp;`,
  and curly typographic apostrophe `’`; none carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would leave
  the literal entities in place. Decoding entities **first** and
  then stripping tags yields clean readable text. The pipeline is
  order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b)
  does not contain `&amp;`, and (c) does not contain `<p>`, `<h2>`,
  `<div>`, or `<strong>` (tags stripped after the decode pass), so
  a future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **thirtieth**
  company-direct plugin in the cohort to use the entity-decode-
  then-tag-strip pipeline.
- **D-09 (run #284):** Brand-name trim D-09 is **omitted**.
  Rationale: Lattice's wire `company_name` is `'Lattice'`
  byte-for-byte (the single-token bare brand name; case-symmetric
  with the lowercase slug `lattice`; no legal-entity suffix on the
  wire — confirmed via run-284 probe where every wire job carries
  `company_name === 'Lattice'`, distinct from any "Lattice, Inc."
  legal-entity name that may appear in corporate filings). The
  plugin reads `listing.company_name` directly with `'Lattice'` as
  a defensive fallback, but the unit-test happy path asserts the
  emitted `companyName === 'Lattice'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a
  legal-entity suffix; if such a rename happens, a follow-up patch
  can re-introduce D-09 as a one-line edit. **Twenty-fourth cohort
  plugin to omit D-09**, returning to the case-symmetric
  bare-brand wire form.
- **D-10 (run #284):** Wire-title `.trim()` deviation is **omitted**.
  Rationale: 0 of 11 wire titles in the run-284 probe carry
  whitespace padding (the wire is fully clean) — confirmed via the
  curl probe. The plugin emits `listing.title` byte-for-byte
  without a `.trim()` (the pass-through preserves byte-fidelity to
  the wire shape; if Lattice introduces title padding upstream in
  the future, the pass-through observability lock catches the diff
  in the unit tests). The unit-test happy path's emitted titles
  match the wire titles byte-for-byte. **Eleventh cohort plugin to
  omit D-10** (after every plugin from the early cohort up through
  fuboTV's strict trim-cohort that DID apply D-10 against any
  observable pad bytes).
- **D-11 (run #284):** Wire `departments[0].name` `.trim()`
  deviation is **APPLIED** for the **first time in cohort history**.
  Rationale: 3 of 11 wire department names in the run-284 probe
  carry trailing ASCII-space padding —
    - listing 8468904002 (Customer Account Manager, SMB) →
      `'Customer Account Management '` (single trailing space);
    - listing 8523623002 (Staff Product Manager, AI) → `'Product '`
      (single trailing space);
    - listing 8523624002 (Staff Product Manager, AI) → `'Product '`
      (single trailing space).
  ~27 % pad rate; the wire-padded forms appear repeatedly across
  distinct department buckets (Customer Account Management vs.
  Product), so this is not a one-off Greenhouse-side typo but a
  systematic padding pattern in Lattice's tenant data. The plugin
  applies `.trim()` to `listing.departments?.[0]?.name` before
  downstream filters and emit so the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter sees the trimmed
  form, and the emitted `JobPostDto.department` does not carry pad
  bytes. The unit-test happy path's second listing fixture uses the
  wire-padded department `'Product '` (with one trailing space) and
  asserts (a) the emitted `department` equals the trimmed form
  `'Product'` AND is byte-distinct from the wire form AND (b) is
  exactly **1 byte shorter** (locking the trailing-pad form against
  a future refactor that drops the `.trim()` and reintroduces the
  wire pad bytes). **First cohort plugin to apply D-11** — opening
  the deviation axis from "fully-clean pass-through" to "trim-on-
  emit". Twenty-three prior cohort plugins emitted department names
  byte-for-byte because their wire data was 0/N padded; Lattice is
  the first plugin where the wire pad rate is non-zero on the
  department axis.
- **D-12 (run #284):** This plugin is the **tenth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, ClassPass at run #277, Coursera at
  run #278, Epic Games at run #279, Flexport at run #280, fuboTV
  at run #281, Glossier at run #282, and Honeycomb at run #283).
  The remaining four live hits from the run-275 probe sweep queue
  for runs #285+ in alphabetical order: `masterclass` (6 roles,
  run #285 next bite), `mavenclinic` (24), `stitchfix` (22),
  `udemy` (17). Subsequent runs after the pool is exhausted
  (#288+ by current arithmetic) will pivot to a **fifth fresh
  probe sweep** targeting yet-untested large-employer candidate
  slugs.
- **D-13 (run #284):** **Three structural deviations** from the
  Honeycomb (Spec 073) template:
    1. D-04 wire-shape variant 15 (bare brand-domain singular-
       `/job` query-only-id; first cohort plugin to use variant 15;
       distinct from Honeycomb's variant 2 modern hosted-board
       apex);
    2. D-10 omitted (Lattice 0/11 titles padded; Honeycomb 2/10
       padded);
    3. D-11 APPLIED (Lattice 3/11 departments padded; first cohort
       plugin to apply D-11; Honeycomb 0/10 padded — fully-clean
       pass-through).
  All other axes share with Honeycomb: D-08 entity-decode-then-tag-
  strip, D-09 omitted (with case-symmetric wire variant rather than
  Honeycomb's TLD-suffix wire variant). Lattice is the **first
  cohort plugin** to apply D-11 (department trim) — opening the
  deviation axis.

## 11. References

- `packages/plugins/source-company-honeycomb/src/honeycomb.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 073 / run #283; same D-08 entity-decode-then-tag-
  strip + D-09 omitted as Lattice; Lattice deviates on D-04 wire-
  shape variant 15, D-10 omitted, and D-11 applied).
- `packages/plugins/source-company-fubotv/src/fubotv.service.ts` —
  closest precedent for a vanity / bare-domain wire shape
  (Spec 071 / run #281; fuboTV uses variant 14
  `careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>` — distinct
  from Lattice's variant 15 bare-domain singular-`/job`).
- `packages/plugins/source-company-epicgames/src/epicgames.service.ts` —
  prior cohort plugin with bare brand-domain wire shape (Spec 069
  / run #279; Epic Games uses variant 13
  `epicgames.com/careers/jobs/<id>?gh_jid=<id>` — distinct from
  Lattice's variant 15 by `/careers/jobs/` path with embedded ID
  vs. Lattice's `/job` singular path with query-only-id).
- `packages/plugins/source-company-classpass/src/classpass.service.ts` —
  another prior cohort plugin with bare-domain-style wire shape
  (Spec 067 / run #277; ClassPass uses variant 12
  `www.playlist.com/careers/opportunities/<id>?gh_jid=<id>` —
  distinct on www-prefix, parent-domain, and embedded ID).
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
