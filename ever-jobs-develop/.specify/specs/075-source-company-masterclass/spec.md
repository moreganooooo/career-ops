# Spec: 075 — Source Company Plugin: MasterClass

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 075                                                                                                                                                                                            |
| Slug           | source-company-masterclass                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #285)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..074                                                                                                                                                                        |

## 1. Problem Statement

Run #284's Spec 074 closed end-to-end (Lattice shipped — 8 unit tests
green; the **tenth** live hit alphabetically from the run-275 fourth-
fresh-sweep candidate pool) and explicitly queued runs #285+ to take
**MasterClass** next as the alphabetically-eleventh live hit from
that pool (6 roles confirmed at run-275 probe time; re-confirmed at
run-285 start with 6 jobs returned by the HTTP probe).

MasterClass — operator of the **dominant celebrity-led streaming
education platform pioneered around the premium video-class
masterclass-by-instructor data model** (founded by David Rogier
and Aaron Rasmussen in 2015 in San Francisco; raised $469M+
across rounds led by Fidelity, Eldridge Industries, IVP, Javelin
Venture Partners, NEA, and NewView Capital at a peak $2.75B
valuation in 2021; ships an annual-subscription streaming
product across 200+ classes taught by top-tier named instructors
across cooking, writing, music, business, design, sports, and
science segments — alongside competitors Skillshare, Udemy,
Coursera, Domestika, and CreativeLive — with a hybrid in-office
/ remote workforce concentrated across the United States) — is
published at the bare `masterclass` Greenhouse slug (the
lowercase brand name; case-asymmetric with the wire
`company_name === 'MasterClass'` which carries the brand's
CamelCase form) and was confirmed live via run #285's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/masterclass/jobs?content=true`
(6 open roles confirmed at run-285 start). MasterClass publishes
its `absolute_url` on **wire-shape variant 2** — the modern
hosted-board apex shape `https://job-boards.greenhouse.io/masterclass/jobs/<id>`
— making this the **sixteenth** plugin in the cohort to use
variant 2 (after Vercel, Affirm, Gusto, Mercury, Buildkite,
Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel, Scale
AI, Cameo, Carta, and Honeycomb).

Aggregator-callers asking for "all jobs at major online-education
/ celebrity-led-streaming-education / continuing-education
vendors" must currently either (a) deduce the Greenhouse slug
`masterclass` and call `source-ats-greenhouse` by hand, or (b)
post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit
behind (Spec 005), and both lose the `Site.<KEY>` enum entry
that aggregator-side code branches on for analytics, dedup
affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `masterclass` Greenhouse slug behind its own `Site` enum
value, in the identical shape the codebase already uses sixty-
three times (Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma,
Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart,
Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex,
Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify,
Postman, Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic,
Intercom, Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass,
Coursera, Epic Games, Flexport, fuboTV, Glossier, Honeycomb,
Lattice — plus the seven legacy company-direct plugins from
before Spec 020).

## 2. Goals

- Ship a `source-company-masterclass` plugin returning live
  `JobPostDto` rows for the public MasterClass careers board
  with **no caller config required** (no slug, no auth, no
  override URL).
- Match the structural and behavioural shape of the existing
  `source-company-honeycomb` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.MASTERCLASS` enum value, `id`
  prefixed `masterclass-`) — Honeycomb is the closest structural
  cousin because both publish from Greenhouse public API on
  wire-shape variant 2, both emit HTML-entity-encoded content
  requiring the entity-decode-then-tag-strip description
  pipeline (D-08), both omit D-09 brand-name trim. MasterClass
  carries **two structural deviations** from the Honeycomb
  template — D-09 omitted with **case-only wire asymmetry**
  (wire `'MasterClass'` is equal-byte-length to slug
  `masterclass` but byte-distinct via the internal capital `C`
  at index 6 — first cohort observation of equal-length-case-
  only asymmetry, distinct from Honeycomb's TLD-suffix length
  asymmetry) and D-10 omitted (0/6 wire titles padded — fully
  clean wire-title pass-through, distinct from Honeycomb's 2/10
  trailing-pad form).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case MasterClass.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'masterclass'` and
  get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-honeycomb` already supports — the company
  plugins are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover MasterClass's USD ranges.
- Backfilling historical MasterClass postings — only the open-
  roles slice the Greenhouse public API returns.
- MasterClass product-API / streaming-catalogue integration —
  MasterClass's class-catalogue and subscription product
  surfaces are separate product surfaces from the careers board;
  product API data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MASTERCLASS`** in
> the source registry, so that **a single `siteType:
> [Site.MASTERCLASS]` request returns MasterClass's open roles
> without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point
> of the Greenhouse-backed company-direct pattern with the
> entity-decode-then-tag-strip description pipeline AND the
> first cohort observation of equal-length-case-only slug/wire
> asymmetry**, so that **adding the next Greenhouse-only
> employer publishing on a similar CamelCase brand wire shape
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for MasterClass**, so that **a
> Greenhouse outage on the MasterClass board does not trip the
> breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MASTERCLASS = 'masterclass'` to `packages/models/src/enums/site.enum.ts`.               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-masterclass` under `packages/plugins/`.             | must     |
| FR-3  | `MasterclassService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `masterclass-`, `site === Site.MASTERCLASS`, and `companyName === 'MasterClass'` (wire `company_name` is the CamelCase brand `'MasterClass'` byte-for-byte; equal-length-case-asymmetric vs slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'MasterClass'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/masterclass.service.spec.ts`, all using mocked HTTP.   | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-2 shape `https://job-boards.greenhouse.io/masterclass/jobs/<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse **variant-2** form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 6 wire titles in the run-285 probe carry whitespace padding; the plugin emits `listing.title` byte-for-byte without a `.trim()` (the wire is fully clean). | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 6 wire department names in the run-285 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 6-job page.                                          |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 6-job page.                                        |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[MasterclassModule]})` resolves. |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-masterclass/src/masterclass.service.ts
@SourcePlugin({ site: Site.MASTERCLASS, name: 'MasterClass', category: 'company' })
@Injectable()
export class MasterclassService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/masterclass/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `masterclass-${listing.id}`,
  site:         Site.MASTERCLASS,
  title:        listing.title ?? null,                                  // D-10 omitted (clean wire)
  companyName:  listing.company_name ?? 'MasterClass',                  // D-09 omitted; case-only asymmetry
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/masterclass/jobs/${listing.id}`,
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

- **Unit (`__tests__/masterclass.service.spec.ts`):**
  1. NestJS DI resolves `MasterclassService` through `MasterclassModule`.
  2. `Site.MASTERCLASS === 'masterclass'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-2
     `job-boards.greenhouse.io/masterclass/jobs/<id>` shape lock,
     the decode-then-strip pipeline cleanliness, the case-
     asymmetric wire `companyName === 'MasterClass'` byte-for-
     byte AND `companyName === fixture.jobs[0].company_name`
     byte-for-byte AND case-insensitively equal to the slug
     `masterclass` AND equal byte-length to the slug (locking
     the equal-length-case-only asymmetry — D-09 omission lock,
     first cohort case where wire/slug are equal-byte-length but
     byte-distinct via case alone), the D-10 omission lock —
     emitted `title` for both listings equals the wire `title`
     byte-for-byte (no trim applied; pass-through observable),
     and the D-11 fully-clean department pass-through.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the byte-for-byte wire form — D-10 omitted).
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

- **D-01 (run #285):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: MasterClass's
  `https://www.masterclass.com/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/masterclass/jobs` public
  endpoint. We already exercise the broader Greenhouse public-
  API pattern from sixty-three prior company-direct plugins.
- **D-02 (run #285):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'masterclass'`.
- **D-03 (run #285):** No salary parser hook beyond the helpers
  defaults — MasterClass posts USD ranges from US remote / SF
  hybrid roles; Spec 014 / 015's parser already covers USD
  without modification.
- **D-04 (run #285):** **Wire-shape variant 2 — modern hosted-
  board apex.** MasterClass's tenant publishes its
  `absolute_url` on the
  `https://job-boards.greenhouse.io/masterclass/jobs/<id>`
  shape — confirmed via run #285's HTTP 200 probe of the live
  API where every wire job carries this shape. **Sixteenth**
  plugin in the cohort to use variant 2 (after Vercel, Affirm,
  Gusto, Mercury, Buildkite, Netlify, Postman, Webflow,
  Attentive, Intercom, Mixpanel, Scale AI, Cameo, Carta, and
  Honeycomb). The fallback `jobUrl` constructor mirrors the
  same shape byte-for-byte.
- **D-05 (run #285):** Use Greenhouse slug `masterclass` (the
  lowercase brand name; case-asymmetric with the wire
  `company_name === 'MasterClass'`). Rationale: like Honeycomb
  (Spec 073 § 10 D-05) and the rest of the bare-slug cohort,
  MasterClass's Greenhouse tenant is published at the bare
  lowercase slug. Confirmed via run #285's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/masterclass/jobs?content=true`
  (6 open roles confirmed at run-285 start).
- **D-06 (run #285):** Class names are `MasterclassService` /
  `MasterclassModule` (PascalCase from the lowercase slug
  `masterclass` rather than the CamelCase wire `MasterClass`,
  to keep class names slug-derived for grep symmetry across the
  cohort). Rationale: matches the convention `HoneycombService`
  / `CartaService` / `LatticeService` use for slug-derived class
  names.
- **D-07 (run #285):** Selected from the **fourth fresh probe
  sweep** live-board pool processing, alphabetically-eleventh
  live-board hit (after `cameo` shipped at run #275, `carta`
  at run #276, `classpass` at run #277, `coursera` at run #278,
  `epicgames` at run #279, `flexport` at run #280, `fubotv` at
  run #281, `glossier` at run #282, `honeycomb` at run #283,
  and `lattice` at run #284). Run #275's probe sweep across 36
  candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52,
  run #276 shipped), `classpass` (70, run #277 shipped),
  `coursera` (8, run #278 shipped), `epicgames` (74, run #279
  shipped), `flexport` (113, run #280 shipped), `fubotv` (11,
  run #281 shipped), `glossier` (17, run #282 shipped),
  `honeycomb` (10, run #283 shipped), `lattice` (11, run #284
  shipped), `masterclass` (6, run #285 next bite — this spec),
  `mavenclinic` (24), `stitchfix` (22), `udemy` (17).
  `masterclass` is alphabetically eleventh so this run takes
  MasterClass. The remaining three live hits queue for runs
  #286+ in alphabetical order (`mavenclinic` next at run #286
  with 24 roles).
- **D-08 (run #285):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Honeycomb (Spec 073 § 10 D-08), Lattice (Spec 074 § 10
  D-08), Glossier (Spec 072 § 10 D-08), and the rest of the
  post-Klaviyo cohort, MasterClass's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;...`)
  rather than raw HTML tags — confirmed via run #285's HTTP
  probe of the live API (every wire job carries HTML entities
  including `&lt;`, `&gt;`, `&amp;`, `&quot;`, and numeric
  entities `&#39;`; none carry raw tags). Applying
  `stripHtmlTags()` alone to that wire payload would leave the
  literal entities in place. Decoding entities **first** and
  then stripping tags yields clean readable text. The pipeline
  is order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities
  decoded), (b) does not contain `&amp;`, and (c) does not
  contain `<p>`, `<div>`, or `<strong>` (tags stripped after
  the decode pass), so a future refactor that swaps the order
  or drops one half of the pipeline would surface as a test
  diff. This is the **thirty-first** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #285):** Brand-name trim D-09 is **omitted with
  equal-length-case-only wire asymmetry**. Rationale:
  MasterClass's wire `company_name` is `'MasterClass'` byte-
  for-byte (the CamelCase brand string; 11 bytes). The slug
  `masterclass` is also 11 bytes — slug/wire EQUAL-LENGTH but
  byte-distinct via case at byte index 6 (`c` vs `C`).
  Confirmed via run #285's probe where every wire job carries
  `company_name === 'MasterClass'` byte-for-byte. The plugin
  reads `listing.company_name` directly with `'MasterClass'` as
  a defensive fallback, but the unit-test happy path asserts
  the emitted `companyName === 'MasterClass'` byte-for-byte AND
  byte-distinct from the lowercase slug `masterclass` AND
  case-insensitively equal to the slug AND of equal byte
  length to the slug — locking the equal-length-case-only
  asymmetry observable, the **first** cohort case where wire
  and slug have the same byte length but differ via case
  alone. **Twenty-fifth cohort plugin to omit D-09**, but the
  **fifth slug/wire asymmetry case overall** (after Ramp
  Network's brand-shortening asymmetry slug `rampnetwork` /
  wire `'Ramp'`, Scale AI's internal-whitespace asymmetry
  slug `scaleai` / wire `'Scale AI'`, fuboTV's brand-rebrand
  truncation slug `fubotv` / wire `'Fubo'`, and Honeycomb's
  TLD-suffix asymmetry slug `honeycomb` / wire `'Honeycomb.io'`)
  — and the **first** asymmetry case where slug and wire are
  equal-byte-length-but-case-distinct. Distinct from Honeycomb's
  TLD-suffix length asymmetry (wire 3 bytes longer), Scale AI's
  internal-whitespace asymmetry (wire 1 byte longer), fuboTV's
  truncation (wire 2 bytes shorter), and Ramp Network's
  shortening (wire 7 bytes shorter).
- **D-10 (run #285):** Wire-title `.trim()` deviation is
  **omitted**. Rationale: 0 of 6 wire titles in the run-285
  probe carry whitespace padding (the wire is fully clean) —
  confirmed via the curl probe (`'AI Creator / Artist /
  Technical Artist (CONTRACTOR)'`, `'Communications Manager
  (TEMP)'`, `'Learning Experience Designer (TEMP)'`, `'Senior
  Product Marketing Manager'`, `'Staff AI / ML Engineer'`,
  `'Staff Software Engineer, Infrastructure'` — all clean, no
  leading or trailing whitespace). The plugin emits
  `listing.title` byte-for-byte without a `.trim()` (the pass-
  through preserves byte-fidelity to the wire shape; if
  MasterClass introduces title padding upstream in the future,
  the pass-through observability lock catches the diff in the
  unit tests). The unit-test happy path's emitted titles match
  the wire titles byte-for-byte. **Twelfth cohort plugin to
  omit D-10** (after the prior fully-clean cohort).
- **D-11 (run #285):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 6 wire department
  names in the run-285 probe carry trailing ASCII-space
  padding (`'Content Production'`, `'Marketing'` × 2,
  `'Content'`, `'Engineering'` × 2 — clean single-token and
  multi-token forms with internal whitespace; ~0 % pad rate).
  The plugin emits `listing.departments[0].name` byte-for-byte
  without a `.trim()` (the pass-through is a no-op on the
  clean wire data; if MasterClass adds padding upstream in the
  future, the pass-through observability lock catches the diff
  in the unit tests). **Twenty-third cohort plugin** with
  fully-clean department pass-through (D-11 omitted; distinct
  from Lattice which applied D-11 — the only cohort plugin so
  far to apply it).
- **D-12 (run #285):** This plugin is the **eleventh** in the
  fourth-fresh-sweep live-board pool processing (after Cameo
  at run #275, Carta at run #276, ClassPass at run #277,
  Coursera at run #278, Epic Games at run #279, Flexport at
  run #280, fuboTV at run #281, Glossier at run #282,
  Honeycomb at run #283, and Lattice at run #284). The
  remaining three live hits from the run-275 probe sweep queue
  for runs #286+ in alphabetical order: `mavenclinic` (24
  roles, run #286 next bite), `stitchfix` (22), `udemy` (17).
  Subsequent runs after the pool is exhausted (#288+ by
  current arithmetic) will pivot to a **fifth fresh probe
  sweep** targeting yet-untested large-employer candidate
  slugs.
- **D-13 (run #285):** **Two structural deviations** from the
  Honeycomb (Spec 073) template:
    1. D-09 omitted with **case-only wire asymmetry** vs.
       Honeycomb's TLD-suffix length asymmetry (MasterClass
       wire 11 bytes vs. slug 11 bytes equal-length; Honeycomb
       wire 12 bytes vs. slug 9 bytes — wire 3 bytes longer);
    2. D-10 omitted (MasterClass 0/6 titles padded; Honeycomb
       2/10 padded — D-10 applied).
  All other axes share with Honeycomb: D-04 wire-shape variant
  2 (modern hosted-board apex), D-08 entity-decode-then-tag-
  strip, D-11 fully-clean department pass-through. MasterClass
  is the **first cohort plugin** to use equal-length-case-only
  slug/wire asymmetry — extending the asymmetry-axis taxonomy
  from length-only differences to case-only differences.

## 11. References

- `packages/plugins/source-company-honeycomb/src/honeycomb.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 073 / run #283; same D-04 variant 2 + D-08
  entity-decode-then-tag-strip + D-09 omitted as MasterClass;
  MasterClass deviates on D-09 case-asymmetry vs Honeycomb's
  TLD-suffix asymmetry, and D-10 omitted vs Honeycomb's D-10
  applied).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  immediate predecessor in the alphabetical pool processing
  (Spec 074 / run #284; Lattice uses variant 15 vs MasterClass's
  variant 2, applies D-11 trim vs MasterClass's D-11 omission).
- `packages/plugins/source-company-carta/src/carta.service.ts` —
  prior fully-clean Greenhouse variant-2 cohort plugin (Spec
  066 / run #276; same shape as MasterClass on D-04 / D-08 /
  D-10 / D-11; deviates on D-09 — Carta wire was bare brand,
  no asymmetry).
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
