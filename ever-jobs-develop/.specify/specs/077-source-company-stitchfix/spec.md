# Spec: 077 — Source Company Plugin: Stitch Fix

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 077                                                                                                                                                                                            |
| Slug           | source-company-stitchfix                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #287)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..076                                                                                                                                                                        |

## 1. Problem Statement

Run #286's Spec 076 closed end-to-end (Maven Clinic shipped — 8
unit tests green; the **twelfth** live hit alphabetically from the
run-275 fourth-fresh-sweep candidate pool) and explicitly queued
runs #287+ to take **Stitch Fix** next as the alphabetically-
thirteenth live hit from that pool (22 roles confirmed at run-275
probe time; re-confirmed at run-287 start with 22 jobs returned by
the HTTP probe).

Stitch Fix — operator of the **dominant data-science-driven
personal-styling-by-mail e-commerce platform pioneered around the
algorithmic style-recommendation longitudinal-fashion data
model** (founded by Katrina Lake in 2011 in San Francisco; IPO'd
on NASDAQ as `SFIX` in November 2017 at a $1.6B valuation —
peaking near $11B in 2021; ships a hybrid human-stylist /
algorithmic-recommendation styling-as-a-service product across
women's, men's, and kids' apparel-and-accessories segments —
alongside competitors Trunk Club, Wantable, Daily Look, and
Le Tote — with a hybrid in-office / remote workforce concentrated
across the United States and the United Kingdom) — is published
at the bare `stitchfix` Greenhouse slug (the lowercase
concatenated two-word brand-words; case-asymmetric AND length-
asymmetric with the wire `company_name === 'Stitch Fix'` which
carries the brand's two-word internal-whitespace form) and was
confirmed live via run #287's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/stitchfix/jobs?content=true`
(22 open roles confirmed at run-287 start). Stitch Fix publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 16** — the bare-www brand-domain `/careers/jobs`-path
duplicate-gh_jid-query shape
`https://www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
— making this the **first** plugin in the cohort to use variant
16 — the **nineteenth distinct wire-shape variant** in the
company-direct cohort. The duplicated `gh_jid` query parameter is
distinct from every prior cohort variant: variants 1, 2 use
`/jobs/<id>` paths with no query; variant 13 uses
`careers/jobs/<id>?gh_jid=<id>` (id in path AND query, gh_jid
appears once); variant 14 uses
`careers.fubo.tv/fubotv-job-openings/?gh_jid=<id>` (vanity
subdomain, gh_jid appears once); variant 15 uses
`lattice.com/job?gh_jid=<id>` (bare domain, singular `/job`,
gh_jid appears once). Stitch Fix's variant 16 is the first cohort
case where the same query parameter is emitted **twice** in the
URL.

Aggregator-callers asking for "all jobs at major data-science /
e-commerce-styling / fashion-tech vendors" must currently either
(a) deduce the Greenhouse slug `stitchfix` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match — both
paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005), and both
lose the `Site.<KEY>` enum entry that aggregator-side code
branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `stitchfix` Greenhouse slug behind its own `Site` enum value,
in the identical shape the codebase already uses sixty-five times
(Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic, Intercom,
Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass, Coursera,
Epic Games, Flexport, fuboTV, Glossier, Honeycomb, Lattice,
MasterClass, Maven Clinic — plus the seven legacy company-direct
plugins from before Spec 020).

## 2. Goals

- Ship a `source-company-stitchfix` plugin returning live
  `JobPostDto` rows for the public Stitch Fix careers board with
  **no caller config required** (no slug, no auth, no override
  URL).
- Match the structural and behavioural shape of the existing
  `source-company-mavenclinic` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.STITCHFIX` enum value, `id`
  prefixed `stitchfix-`) — Maven Clinic is the closest structural
  cousin because both share the **internal-whitespace wire
  asymmetry** D-09 omission shape (two-word wire with internal
  ASCII space, slug being lowercase-concatenated form), both apply
  D-10 wire-title `.trim()` (Maven Clinic 3/24 padded, Stitch Fix
  3/22 padded — near-identical pad rate ~12.5 % vs ~13.6 %), and
  both omit D-11 fully-clean department pass-through. Stitch Fix
  carries **one structural deviation** from the Maven Clinic
  template — D-04 wire-shape variant 16 (first cohort plugin to
  use variant 16; distinct from Maven Clinic's variant 2
  `job-boards.greenhouse.io/<slug>/jobs/<id>` modern hosted-board
  apex shape).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Stitch Fix.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'stitchfix'` and
  get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-mavenclinic` already supports — the company
  plugins are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Stitch Fix's USD ranges.
- Backfilling historical Stitch Fix postings — only the open-
  roles slice the Greenhouse public API returns.
- Stitch Fix product-API / styling-recommendation / order-
  fulfilment integration — Stitch Fix's algorithmic-styling,
  fulfilment, and customer-app product surfaces are separate
  product surfaces from the careers board; product API data is
  out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.STITCHFIX`** in the
> source registry, so that **a single `siteType:
> [Site.STITCHFIX]` request returns Stitch Fix's open roles
> without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of the
> `careers/jobs?gh_jid=<id>&gh_jid=<id>` duplicate-query
> Greenhouse wire shape (variant 16)**, so that **adding the next
> Greenhouse-only employer publishing on the same duplicate-query
> shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Stitch Fix**, so that **a
> Greenhouse outage on the Stitch Fix board does not trip the
> breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.STITCHFIX = 'stitchfix'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-stitchfix` under `packages/plugins/`.               | must     |
| FR-3  | `StitchfixService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `stitchfix-`, `site === Site.STITCHFIX`, and `companyName === 'Stitch Fix'` (wire `company_name` is the two-word brand `'Stitch Fix'` byte-for-byte; internal-whitespace-asymmetric vs slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'Stitch Fix'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/stitchfix.service.spec.ts`, all using mocked HTTP.    | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-16 duplicate-query shape `https://www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/stitchfix/jobs/<id>` rather than reconstructing the bare-domain shape, because the variant-16 shape requires `stitchfix.com`-side proxying that may not be guaranteed for all listing IDs (same fallback strategy as ClassPass, Epic Games, fuboTV, and Lattice). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 3 of 22 wire titles in the run-287 probe carry trailing ASCII-space padding (`'Principal Full-Stack Data Scientist - Recommendation Algorithms '`, `'Senior Manager of Data Engineering and AI Automation, Business Systems '`, `'Strategic Program Manager, Styling Enablement '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 22 wire department names in the run-287 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 22-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 22-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[StitchfixModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-stitchfix/src/stitchfix.service.ts
@SourcePlugin({ site: Site.STITCHFIX, name: 'Stitch Fix', category: 'company' })
@Injectable()
export class StitchfixService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/stitchfix/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `stitchfix-${listing.id}`,
  site:         Site.STITCHFIX,
  title:        (listing.title ?? '').trim(),                           // D-10 applied (3/22 padded)
  companyName:  listing.company_name ?? 'Stitch Fix',                   // D-09 omitted; internal-ws asymmetry
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/stitchfix/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,                 // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/stitchfix.service.spec.ts`):**
  1. NestJS DI resolves `StitchfixService` through `StitchfixModule`.
  2. `Site.STITCHFIX === 'stitchfix'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-16
     `www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
     shape pass-through lock — duplicate-query parameter
     preserved byte-for-byte; AND fallback URL using the canonical
     Greenhouse variant-2 form
     `job-boards.greenhouse.io/stitchfix/jobs/<id>` when wire
     `absolute_url` is missing — same fallback strategy as
     ClassPass / Epic Games / fuboTV / Lattice; the decode-then-
     strip pipeline cleanliness; the internal-whitespace-
     asymmetric wire `companyName === 'Stitch Fix'` byte-for-byte
     AND `companyName === fixture.jobs[0].company_name` byte-for-
     byte AND byte-distinct from the slug `stitchfix` AND exactly
     1 byte longer than the slug AND case-insensitively-with-
     space-collapsed equal to the slug — locking the internal-
     whitespace asymmetry, the **third** cohort case where wire
     and slug differ by an internal whitespace byte after Scale
     AI and Maven Clinic; the D-10 application lock — emitted
     `title` for the SECOND listing equals trimmed form
     `'Principal Full-Stack Data Scientist - Recommendation
     Algorithms'` byte-distinct from wire-padded form
     `'Principal Full-Stack Data Scientist - Recommendation
     Algorithms '` AND exactly 1 byte shorter (locking the
     single-trailing-pad form), and the D-11 fully-clean
     department pass-through.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form — D-10 search guard).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E
  lives in `source-ats-greenhouse` and exercises the same wire
  shape.
- **Performance:** none beyond NFR-1's narrative budget — the
  helpers bench under
  `packages/common/__tests__/helpers.bench.spec.ts` is the
  ground truth for parser-level perf, and that path is unchanged
  here.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #287):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Stitch Fix's
  `https://www.stitchfix.com/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/stitchfix/jobs` public endpoint.
  We already exercise the broader Greenhouse public-API pattern
  from sixty-five prior company-direct plugins.
- **D-02 (run #287):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'stitchfix'`.
- **D-03 (run #287):** No salary parser hook beyond the helpers
  defaults — Stitch Fix posts USD ranges from US remote / SF
  hybrid roles; Spec 014 / 015's parser already covers USD
  without modification.
- **D-04 (run #287):** **Wire-shape variant 16 — bare-www
  brand-domain `/careers/jobs`-path duplicate-`gh_jid`-query
  shape — first cohort observation.** Stitch Fix's tenant
  publishes its `absolute_url` on a **previously-unobserved
  shape** `https://www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
  — `www.stitchfix.com` (`www` subdomain on the bare brand
  domain — distinct from variant 14's `careers.fubo.tv` vanity
  subdomain and variant 15's bare `lattice.com`); plural
  `/careers/jobs` path (distinct from variant 13's
  `careers/jobs/<id>?gh_jid=<id>` per-id-in-path shape and
  variant 15's singular `/job` path); and the listing ID appears
  **twice** in the same `gh_jid` query parameter (the duplicate
  query parameter is the most distinctive feature — distinct
  from every prior cohort variant where the same query parameter
  appears at most once). Confirmed via run #287's HTTP 200 probe
  of the live API where every wire job carries this shape with
  the duplicate `gh_jid` query parameter byte-for-byte. **First**
  plugin in the cohort to use **wire-shape variant 16** — the
  **nineteenth distinct wire-shape variant** in the company-
  direct cohort.

  The plugin emits `listing.absolute_url` byte-for-byte to
  preserve the canonical destination (including the duplicate
  `gh_jid` query parameter). The **fallback** `jobUrl`
  constructor (when Greenhouse omits `absolute_url` — a defence-
  in-depth path Greenhouse has not exercised against this
  tenant in the audit window) defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/stitchfix/jobs/<id>` rather
  than reconstructing the bare-domain duplicate-query shape,
  because the bare-domain shape requires `stitchfix.com`-side
  proxying that may not be guaranteed for all listing IDs (same
  fallback strategy as ClassPass — Spec 067 § 10 D-04 — Epic
  Games — Spec 069 § 10 D-04 — fuboTV — Spec 071 § 10 D-04 —
  and Lattice — Spec 074 § 10 D-04).
- **D-05 (run #287):** Use Greenhouse slug `stitchfix` (the
  lowercase concatenated two-word brand; case-asymmetric AND
  internal-whitespace-asymmetric with the wire `company_name ===
  'Stitch Fix'`). Rationale: like Maven Clinic (Spec 076 § 10
  D-05), MasterClass (Spec 075 § 10 D-05), and the rest of the
  bare-slug cohort, Stitch Fix's Greenhouse tenant is published
  at the bare lowercase concatenated-words slug. Confirmed via
  run #287's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/stitchfix/jobs?content=true`
  (22 open roles confirmed at run-287 start).
- **D-06 (run #287):** Class names are `StitchfixService` /
  `StitchfixModule` (PascalCase from the lowercase concatenated
  slug `stitchfix` rather than the two-word wire `Stitch Fix`,
  to keep class names slug-derived for grep symmetry across the
  cohort and to avoid TypeScript class names containing internal
  whitespace). Rationale: matches the convention
  `MavenclinicService` / `MasterclassService` / `LatticeService`
  use for slug-derived class names.
- **D-07 (run #287):** Selected from the **fourth fresh probe
  sweep** live-board pool processing, alphabetically-thirteenth
  live-board hit (after `cameo` shipped at run #275, `carta`
  at run #276, `classpass` at run #277, `coursera` at run #278,
  `epicgames` at run #279, `flexport` at run #280, `fubotv` at
  run #281, `glossier` at run #282, `honeycomb` at run #283,
  `lattice` at run #284, `masterclass` at run #285, and
  `mavenclinic` at run #286). Run #275's probe sweep across 36
  candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52,
  run #276 shipped), `classpass` (70, run #277 shipped),
  `coursera` (8, run #278 shipped), `epicgames` (74, run #279
  shipped), `flexport` (113, run #280 shipped), `fubotv` (11,
  run #281 shipped), `glossier` (17, run #282 shipped),
  `honeycomb` (10, run #283 shipped), `lattice` (11, run #284
  shipped), `masterclass` (6, run #285 shipped), `mavenclinic`
  (24, run #286 shipped), `stitchfix` (22, run #287 next bite —
  this spec), `udemy` (17). `stitchfix` is alphabetically
  thirteenth so this run takes Stitch Fix. The remaining one
  live hit queues for run #288 (`udemy` with 17 roles).
- **D-08 (run #287):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Maven Clinic (Spec 076 § 10 D-08), MasterClass (Spec 075
  § 10 D-08), Lattice (Spec 074 § 10 D-08), and the rest of the
  post-Klaviyo cohort, Stitch Fix's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;h3&gt;&lt;strong&gt;About Stitch Fix, Inc. &lt;/strong&gt;&lt;/h3&gt;
  &lt;p&gt;Stitch Fix (NASDAQ: SFIX) is the leading online
  personal styling service...`) rather than raw HTML tags —
  confirmed via run #287's HTTP probe of the live API (every wire
  job carries HTML entities including `&lt;`, `&gt;`, `&amp;`,
  `&quot;`, and numeric entities `&#39;`; none carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would
  leave the literal entities in place. Decoding entities **first**
  and then stripping tags yields clean readable text. The pipeline
  is order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities
  decoded), (b) does not contain `&amp;`, and (c) does not
  contain `<p>`, `<div>`, or `<strong>` (tags stripped after
  the decode pass), so a future refactor that swaps the order
  or drops one half of the pipeline would surface as a test
  diff. This is the **thirty-third** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #287):** Brand-name trim D-09 is **omitted with
  internal-whitespace wire asymmetry**. Rationale: Stitch Fix's
  wire `company_name` is `'Stitch Fix'` byte-for-byte (the
  two-word brand string with single internal ASCII space; 10
  bytes). The slug `stitchfix` is 9 bytes — slug/wire-asymmetric,
  wire LONGER than slug by 1 byte (the internal space between
  `Stitch` and `Fix` at index 6). Confirmed via run #287's probe
  where every wire job carries `company_name === 'Stitch Fix'`
  byte-for-byte. The plugin reads `listing.company_name`
  directly with `'Stitch Fix'` as a defensive fallback, but the
  unit-test happy path asserts the emitted `companyName ===
  'Stitch Fix'` byte-for-byte AND byte-distinct from the lowercase
  slug `stitchfix` AND exactly 1 byte longer than the slug AND
  case-insensitively-with-space-collapsed equal to the slug —
  locking the internal-whitespace asymmetry observable, the
  **third** cohort case where wire and slug differ by an
  internal whitespace byte after Scale AI's slug `scaleai` /
  wire `'Scale AI'` and Maven Clinic's slug `mavenclinic` / wire
  `'Maven Clinic'`. **Twenty-seventh cohort plugin to omit D-09**,
  but the **seventh slug/wire asymmetry case overall** (after
  Ramp Network's brand-shortening asymmetry slug `rampnetwork` /
  wire `'Ramp'`, Scale AI's internal-whitespace asymmetry slug
  `scaleai` / wire `'Scale AI'`, fuboTV's brand-rebrand
  truncation slug `fubotv` / wire `'Fubo'`, Honeycomb's TLD-
  suffix asymmetry slug `honeycomb` / wire `'Honeycomb.io'`,
  MasterClass's case-only asymmetry slug `masterclass` / wire
  `'MasterClass'`, and Maven Clinic's internal-whitespace
  asymmetry slug `mavenclinic` / wire `'Maven Clinic'`) — and
  the **third** internal-whitespace asymmetry case after Scale
  AI and Maven Clinic. Stitch Fix matches Maven Clinic and Scale
  AI exactly on the internal-whitespace asymmetry shape — same
  +1 byte differential, same single-internal-space delta — the
  third proof-point of this asymmetry shape in the cohort
  (proving out that internal-whitespace asymmetry is a stable
  recurring axis rather than a two-off pattern).
- **D-10 (run #287):** Wire-title `.trim()` deviation is
  **applied**. Rationale: 3 of 22 wire titles in the run-287
  probe carry trailing ASCII-space padding (`'Principal
  Full-Stack Data Scientist - Recommendation Algorithms '`,
  `'Senior Manager of Data Engineering and AI Automation,
  Business Systems '`, `'Strategic Program Manager, Styling
  Enablement '` — all single-trailing-space-padded; ~13.6 % pad
  rate). The plugin applies `.trim()` to `listing.title` before
  downstream filters and emit. **Sixteenth cohort plugin to
  apply D-10** (after Brex, Buildkite, ZoomInfo, Attentive,
  Elastic, Intercom, Mixpanel, Faire, Carta, ClassPass, Epic
  Games, Flexport, fuboTV, Glossier, Honeycomb, and Maven
  Clinic). The unit-test happy path asserts the emitted `title`
  for the second listing equals the trimmed form `'Principal
  Full-Stack Data Scientist - Recommendation Algorithms'` AND
  is byte-distinct from the wire form `'Principal Full-Stack
  Data Scientist - Recommendation Algorithms '` (with one
  trailing pad byte) AND is exactly 1 byte shorter — locking the
  single-trailing-pad form.
- **D-11 (run #287):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 22 wire department
  names in the run-287 probe carry trailing ASCII-space padding
  (`'Engineering'`, `'Data Platform'`, `'Marketing'`, `'Product'`,
  etc. — clean single-token and multi-token forms; ~0 % pad
  rate). The plugin emits `listing.departments[0].name` byte-for-
  byte without a `.trim()` (the pass-through is a no-op on the
  clean wire data; if Stitch Fix adds padding upstream in the
  future, the pass-through observability lock catches the diff
  in the unit tests). **Twenty-fifth cohort plugin** with fully-
  clean department pass-through (D-11 omitted; distinct from
  Lattice which applied D-11 — the only cohort plugin so far to
  apply it).
- **D-12 (run #287):** This plugin is the **thirteenth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at
  run #275, Carta at run #276, ClassPass at run #277, Coursera
  at run #278, Epic Games at run #279, Flexport at run #280,
  fuboTV at run #281, Glossier at run #282, Honeycomb at run
  #283, Lattice at run #284, MasterClass at run #285, and Maven
  Clinic at run #286). The remaining one live hit from the run-
  275 probe sweep queues for run #288 in alphabetical order:
  `udemy` (17 roles, run #288 next bite). Subsequent runs after
  the pool is exhausted (#289+ by current arithmetic) will pivot
  to a **fifth fresh probe sweep** targeting yet-untested large-
  employer candidate slugs.
- **D-13 (run #287):** **One structural deviation** from the
  Maven Clinic (Spec 076) template — D-04 wire-shape variant 16
  (first cohort plugin to use variant 16; distinct from Maven
  Clinic's variant 2 modern hosted-board apex shape). All other
  axes share with Maven Clinic: D-08 entity-decode-then-tag-
  strip, D-09 omitted with internal-whitespace wire asymmetry
  (Stitch Fix +1 byte / single-internal-space — same as Maven
  Clinic +1 byte / single-internal-space, same as Scale AI +1
  byte / single-internal-space), D-10 applied (Stitch Fix 3/22
  padded; Maven Clinic 3/24 padded — near-identical pad rate
  ~13.6 % vs ~12.5 %), D-11 fully-clean department pass-through.
  Stitch Fix is the **third cohort plugin** to use internal-
  whitespace slug/wire asymmetry — proving out that the Scale AI
  / Maven Clinic shape is a stable recurring axis.

## 11. References

- `packages/plugins/source-company-mavenclinic/src/mavenclinic.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 076 / run #286; same D-08 + D-09 internal-
  whitespace asymmetry + D-10 applied + D-11 omitted as Stitch
  Fix; Stitch Fix deviates on D-04 variant 16 vs Maven Clinic's
  variant 2).
- `packages/plugins/source-company-scaleai/src/scaleai.service.ts` —
  prior internal-whitespace asymmetry cohort plugin (Spec 064;
  same D-09 internal-whitespace shape as Stitch Fix — slug
  `scaleai` / wire `'Scale AI'`; the **first** cohort case of
  internal-whitespace asymmetry).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  prior new-variant cohort plugin (Spec 074; first cohort plugin
  to use a new wire variant — variant 15; same fallback
  strategy as Stitch Fix — variant-2 fallback for a non-variant-
  2 wire shape; the only cohort plugin so far to apply D-11).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
  — full Greenhouse adapter for the authenticated path (out of
  scope here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the
  `decodeHtmlEntities` + `stripHtmlTags` helpers this spec
  composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in
  this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration
  contract this spec satisfies.
