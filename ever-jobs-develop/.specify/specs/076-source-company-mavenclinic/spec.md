# Spec: 076 — Source Company Plugin: Maven Clinic

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 076                                                                                                                                                                                            |
| Slug           | source-company-mavenclinic                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #286)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..075                                                                                                                                                                        |

## 1. Problem Statement

Run #285's Spec 075 closed end-to-end (MasterClass shipped — 8 unit
tests green; the **eleventh** live hit alphabetically from the
run-275 fourth-fresh-sweep candidate pool) and explicitly queued
runs #286+ to take **Maven Clinic** next as the alphabetically-
twelfth live hit from that pool (24 roles confirmed at run-275
probe time; re-confirmed at run-286 start with 24 jobs returned by
the HTTP probe).

Maven Clinic — operator of the **dominant virtual women's-and-
family-health clinic platform pioneered around the digital-first
maternity / fertility / parenting longitudinal-care data model**
(founded by Kate Ryder in 2014 in New York City; raised $300M+
across rounds led by General Catalyst, Sequoia Capital, Oak
HC/FT, Dragoneer Investment Group, and Lux Capital at a peak
$1.35B valuation in 2022 — the first women's-and-family-health
unicorn in the United States; ships an employer-and-payor-funded
virtual-care product across maternity, fertility, menopause,
parenting, and pediatric segments — alongside competitors
Progyny, Carrot Fertility, Kindbody, Tia, and Origin — with a
hybrid in-office / remote workforce concentrated across the
United States) — is published at the bare `mavenclinic`
Greenhouse slug (the lowercase concatenated brand-words; case-
asymmetric AND length-asymmetric with the wire `company_name ===
'Maven Clinic'` which carries the brand's two-word internal-
whitespace form) and was confirmed live via run #286's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/mavenclinic/jobs?content=true`
(24 open roles confirmed at run-286 start). Maven Clinic
publishes its `absolute_url` on **wire-shape variant 2** — the
modern hosted-board apex shape
`https://job-boards.greenhouse.io/mavenclinic/jobs/<id>` —
making this the **seventeenth** plugin in the cohort to use
variant 2 (after Vercel, Affirm, Gusto, Mercury, Buildkite,
Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel, Scale
AI, Cameo, Carta, Honeycomb, and MasterClass).

Aggregator-callers asking for "all jobs at major virtual-care /
women's-health / employer-funded-benefit-network vendors" must
currently either (a) deduce the Greenhouse slug `mavenclinic`
and call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `mavenclinic` Greenhouse slug behind its own `Site` enum
value, in the identical shape the codebase already uses sixty-
four times (Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma,
Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart,
Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex,
Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify,
Postman, Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic,
Intercom, Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass,
Coursera, Epic Games, Flexport, fuboTV, Glossier, Honeycomb,
Lattice, MasterClass — plus the seven legacy company-direct
plugins from before Spec 020).

## 2. Goals

- Ship a `source-company-mavenclinic` plugin returning live
  `JobPostDto` rows for the public Maven Clinic careers board
  with **no caller config required** (no slug, no auth, no
  override URL).
- Match the structural and behavioural shape of the existing
  `source-company-honeycomb` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.MAVENCLINIC` enum value, `id`
  prefixed `mavenclinic-`) — Honeycomb is the closest structural
  cousin because both publish from Greenhouse public API on
  wire-shape variant 2, both emit HTML-entity-encoded content
  requiring the entity-decode-then-tag-strip description
  pipeline (D-08), both apply D-10 wire-title `.trim()`, and
  both omit D-11 department `.trim()`. Maven Clinic carries
  **one structural deviation** from the Honeycomb template —
  D-09 omitted with **internal-whitespace wire asymmetry** (wire
  `'Maven Clinic'` is 12 bytes, slug `mavenclinic` is 11 bytes;
  wire LONGER by 1 byte (the internal space at index 5),
  distinct from Honeycomb's 3-byte TLD-suffix length asymmetry —
  this is the **second** internal-whitespace asymmetry case in
  the cohort after Scale AI's slug `scaleai` / wire `'Scale AI'`).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Maven Clinic.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'mavenclinic'` and
  get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-honeycomb` already supports — the company
  plugins are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Maven Clinic's USD ranges.
- Backfilling historical Maven Clinic postings — only the open-
  roles slice the Greenhouse public API returns.
- Maven Clinic product-API / patient-EMR integration — Maven
  Clinic's clinical-care, telehealth, and member-app product
  surfaces are separate product surfaces from the careers board;
  product API data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MAVENCLINIC`** in
> the source registry, so that **a single `siteType:
> [Site.MAVENCLINIC]` request returns Maven Clinic's open roles
> without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point
> of the Greenhouse-backed company-direct pattern with the
> entity-decode-then-tag-strip description pipeline AND the
> second cohort observation of internal-whitespace slug/wire
> asymmetry**, so that **adding the next Greenhouse-only
> employer publishing on a similar two-word brand wire shape
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Maven Clinic**, so that **a
> Greenhouse outage on the Maven Clinic board does not trip the
> breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MAVENCLINIC = 'mavenclinic'` to `packages/models/src/enums/site.enum.ts`.               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-mavenclinic` under `packages/plugins/`.             | must     |
| FR-3  | `MavenclinicService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `mavenclinic-`, `site === Site.MAVENCLINIC`, and `companyName === 'Maven Clinic'` (wire `company_name` is the two-word brand `'Maven Clinic'` byte-for-byte; internal-whitespace-asymmetric vs slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'Maven Clinic'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/mavenclinic.service.spec.ts`, all using mocked HTTP.   | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-2 shape `https://job-boards.greenhouse.io/mavenclinic/jobs/<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the same canonical Greenhouse **variant-2** form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 3 of 24 wire titles in the run-286 probe carry trailing ASCII-space padding (`'Clinical Outcomes Analyst '`, `'Director, Employer Sales '`, `'Manager, Member Services '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 24 wire department names in the run-286 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 24-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 24-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[MavenclinicModule]})` resolves. |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-mavenclinic/src/mavenclinic.service.ts
@SourcePlugin({ site: Site.MAVENCLINIC, name: 'Maven Clinic', category: 'company' })
@Injectable()
export class MavenclinicService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/mavenclinic/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `mavenclinic-${listing.id}`,
  site:         Site.MAVENCLINIC,
  title:        (listing.title ?? '').trim(),                            // D-10 applied (3/24 padded)
  companyName:  listing.company_name ?? 'Maven Clinic',                  // D-09 omitted; internal-ws asymmetry
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/mavenclinic/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,                  // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/mavenclinic.service.spec.ts`):**
  1. NestJS DI resolves `MavenclinicService` through `MavenclinicModule`.
  2. `Site.MAVENCLINIC === 'mavenclinic'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-2
     `job-boards.greenhouse.io/mavenclinic/jobs/<id>` shape lock,
     the decode-then-strip pipeline cleanliness, the internal-
     whitespace-asymmetric wire `companyName === 'Maven Clinic'`
     byte-for-byte AND `companyName === fixture.jobs[0].company_name`
     byte-for-byte AND byte-distinct from the slug
     `mavenclinic` AND exactly 1 byte longer than the slug AND
     case-insensitively-with-space-collapsed equal to the slug
     (locking the internal-whitespace asymmetry — D-09 omission
     lock, second cohort case where wire and slug differ by an
     internal whitespace byte after Scale AI), the D-10
     application lock — emitted `title` for the SECOND listing
     equals trimmed form `'Clinical Outcomes Analyst'` byte-
     distinct from wire-padded form `'Clinical Outcomes
     Analyst '` AND exactly 1 byte shorter (locking the single-
     trailing-pad form), and the D-11 fully-clean department
     pass-through.
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

- **D-01 (run #286):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Maven Clinic's
  `https://www.mavenclinic.com/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/mavenclinic/jobs` public
  endpoint. We already exercise the broader Greenhouse public-
  API pattern from sixty-four prior company-direct plugins.
- **D-02 (run #286):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'mavenclinic'`.
- **D-03 (run #286):** No salary parser hook beyond the helpers
  defaults — Maven Clinic posts USD ranges from US remote / NYC
  hybrid roles; Spec 014 / 015's parser already covers USD
  without modification.
- **D-04 (run #286):** **Wire-shape variant 2 — modern hosted-
  board apex.** Maven Clinic's tenant publishes its
  `absolute_url` on the
  `https://job-boards.greenhouse.io/mavenclinic/jobs/<id>`
  shape — confirmed via run #286's HTTP 200 probe of the live
  API where every wire job carries this shape. **Seventeenth**
  plugin in the cohort to use variant 2 (after Vercel, Affirm,
  Gusto, Mercury, Buildkite, Netlify, Postman, Webflow,
  Attentive, Intercom, Mixpanel, Scale AI, Cameo, Carta,
  Honeycomb, and MasterClass). The fallback `jobUrl` constructor
  mirrors the same shape byte-for-byte.
- **D-05 (run #286):** Use Greenhouse slug `mavenclinic` (the
  lowercase concatenated two-word brand; case-asymmetric AND
  internal-whitespace-asymmetric with the wire `company_name ===
  'Maven Clinic'`). Rationale: like Honeycomb (Spec 073 § 10
  D-05), MasterClass (Spec 075 § 10 D-05), and the rest of the
  bare-slug cohort, Maven Clinic's Greenhouse tenant is published
  at the bare lowercase concatenated-words slug. Confirmed via
  run #286's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/mavenclinic/jobs?content=true`
  (24 open roles confirmed at run-286 start).
- **D-06 (run #286):** Class names are `MavenclinicService` /
  `MavenclinicModule` (PascalCase from the lowercase concatenated
  slug `mavenclinic` rather than the two-word wire `Maven Clinic`,
  to keep class names slug-derived for grep symmetry across the
  cohort and to avoid TypeScript class names containing internal
  whitespace). Rationale: matches the convention `HoneycombService`
  / `MasterclassService` / `LatticeService` use for slug-derived
  class names.
- **D-07 (run #286):** Selected from the **fourth fresh probe
  sweep** live-board pool processing, alphabetically-twelfth
  live-board hit (after `cameo` shipped at run #275, `carta`
  at run #276, `classpass` at run #277, `coursera` at run #278,
  `epicgames` at run #279, `flexport` at run #280, `fubotv` at
  run #281, `glossier` at run #282, `honeycomb` at run #283,
  `lattice` at run #284, and `masterclass` at run #285). Run
  #275's probe sweep across 36 candidate slugs found exactly
  **fourteen** live boards on Greenhouse: `cameo` (3 jobs, run
  #275 shipped), `carta` (52, run #276 shipped), `classpass`
  (70, run #277 shipped), `coursera` (8, run #278 shipped),
  `epicgames` (74, run #279 shipped), `flexport` (113, run #280
  shipped), `fubotv` (11, run #281 shipped), `glossier` (17,
  run #282 shipped), `honeycomb` (10, run #283 shipped),
  `lattice` (11, run #284 shipped), `masterclass` (6, run #285
  shipped), `mavenclinic` (24, run #286 next bite — this spec),
  `stitchfix` (22), `udemy` (17). `mavenclinic` is alphabetically
  twelfth so this run takes Maven Clinic. The remaining two live
  hits queue for runs #287+ in alphabetical order (`stitchfix`
  next at run #287 with 22 roles).
- **D-08 (run #286):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Honeycomb (Spec 073 § 10 D-08), MasterClass (Spec 075
  § 10 D-08), Lattice (Spec 074 § 10 D-08), and the rest of the
  post-Klaviyo cohort, Maven Clinic's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;p&gt;Maven is the world&#39;s largest virtual clinic for
  women and families...`) rather than raw HTML tags — confirmed
  via run #286's HTTP probe of the live API (every wire job
  carries HTML entities including `&lt;`, `&gt;`, `&amp;`,
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
  diff. This is the **thirty-second** company-direct plugin in
  the cohort to use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #286):** Brand-name trim D-09 is **omitted with
  internal-whitespace wire asymmetry**. Rationale: Maven Clinic's
  wire `company_name` is `'Maven Clinic'` byte-for-byte (the
  two-word brand string with single internal ASCII space; 12
  bytes). The slug `mavenclinic` is 11 bytes — slug/wire-
  asymmetric, wire LONGER than slug by 1 byte (the internal space
  between `Maven` and `Clinic` at index 5). Confirmed via run
  #286's probe where every wire job carries `company_name ===
  'Maven Clinic'` byte-for-byte. The plugin reads
  `listing.company_name` directly with `'Maven Clinic'` as a
  defensive fallback, but the unit-test happy path asserts the
  emitted `companyName === 'Maven Clinic'` byte-for-byte AND
  byte-distinct from the lowercase slug `mavenclinic` AND
  exactly 1 byte longer than the slug AND case-insensitively-
  with-space-collapsed equal to the slug — locking the internal-
  whitespace asymmetry observable, the **second** cohort case
  where wire and slug differ by an internal whitespace byte
  after Scale AI's slug `scaleai` / wire `'Scale AI'`. **Twenty-
  sixth cohort plugin to omit D-09**, but the **sixth slug/wire
  asymmetry case overall** (after Ramp Network's brand-shortening
  asymmetry slug `rampnetwork` / wire `'Ramp'`, Scale AI's
  internal-whitespace asymmetry slug `scaleai` / wire `'Scale AI'`,
  fuboTV's brand-rebrand truncation slug `fubotv` / wire
  `'Fubo'`, Honeycomb's TLD-suffix asymmetry slug `honeycomb` /
  wire `'Honeycomb.io'`, and MasterClass's case-only asymmetry
  slug `masterclass` / wire `'MasterClass'`) — and the **second**
  internal-whitespace asymmetry case after Scale AI. Distinct
  from Honeycomb's TLD-suffix length asymmetry (wire 3 bytes
  longer), MasterClass's case-only asymmetry (equal byte length),
  fuboTV's truncation (wire 2 bytes shorter), and Ramp Network's
  shortening (wire 7 bytes shorter). Maven Clinic shares the
  internal-whitespace asymmetry shape with Scale AI exactly —
  same +1 byte differential, same single-internal-space delta —
  the second proof-point of this asymmetry shape in the cohort.
- **D-10 (run #286):** Wire-title `.trim()` deviation is
  **applied**. Rationale: 3 of 24 wire titles in the run-286
  probe carry trailing ASCII-space padding (`'Clinical Outcomes
  Analyst '`, `'Director, Employer Sales '`, `'Manager, Member
  Services '` — all single-trailing-space-padded; ~12.5 % pad
  rate). The plugin applies `.trim()` to `listing.title` before
  downstream filters and emit. **Fifteenth cohort plugin to
  apply D-10** (after Brex, Buildkite, ZoomInfo, Attentive,
  Elastic, Intercom, Mixpanel, Faire, Carta, ClassPass, Epic
  Games, Flexport, fuboTV, Glossier, and Honeycomb). The unit-
  test happy path asserts the emitted `title` for the second
  listing equals the trimmed form `'Clinical Outcomes Analyst'`
  AND is byte-distinct from the wire form `'Clinical Outcomes
  Analyst '` (with one trailing pad byte) AND is exactly 1 byte
  shorter — locking the single-trailing-pad form.
- **D-11 (run #286):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 24 wire department
  names in the run-286 probe carry trailing ASCII-space padding
  (`'Brand & Communications'`, `'Clinical Outcomes'`, `'Employer
  Sales'`, `'Member Services'`, `'Engineering'`, etc. — clean
  single-token and multi-token forms with internal ampersands
  and whitespace; ~0 % pad rate). The plugin emits
  `listing.departments[0].name` byte-for-byte without a `.trim()`
  (the pass-through is a no-op on the clean wire data; if Maven
  Clinic adds padding upstream in the future, the pass-through
  observability lock catches the diff in the unit tests).
  **Twenty-fourth cohort plugin** with fully-clean department
  pass-through (D-11 omitted; distinct from Lattice which
  applied D-11 — the only cohort plugin so far to apply it).
- **D-12 (run #286):** This plugin is the **twelfth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo
  at run #275, Carta at run #276, ClassPass at run #277,
  Coursera at run #278, Epic Games at run #279, Flexport at
  run #280, fuboTV at run #281, Glossier at run #282,
  Honeycomb at run #283, Lattice at run #284, and MasterClass
  at run #285). The remaining two live hits from the run-275
  probe sweep queue for runs #287+ in alphabetical order:
  `stitchfix` (22 roles, run #287 next bite), `udemy` (17).
  Subsequent runs after the pool is exhausted (#288+ by current
  arithmetic) will pivot to a **fifth fresh probe sweep**
  targeting yet-untested large-employer candidate slugs.
- **D-13 (run #286):** **One structural deviation** from the
  Honeycomb (Spec 073) template — D-09 omitted with **internal-
  whitespace wire asymmetry** (Maven Clinic wire 12 bytes vs.
  slug 11 bytes — wire 1 byte longer with internal space at
  index 5; Honeycomb wire 12 bytes vs. slug 9 bytes — wire 3
  bytes longer with TLD suffix). All other axes share with
  Honeycomb: D-04 wire-shape variant 2 (modern hosted-board
  apex), D-08 entity-decode-then-tag-strip, D-10 applied (Maven
  Clinic 3/24 padded; Honeycomb 2/10 padded), D-11 fully-clean
  department pass-through. Maven Clinic is the **second cohort
  plugin** to use internal-whitespace slug/wire asymmetry —
  proving out that Scale AI's internal-whitespace shape was not
  a one-off but rather a recurring asymmetry-axis case.

## 11. References

- `packages/plugins/source-company-honeycomb/src/honeycomb.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 073 / run #283; same D-04 variant 2 + D-08
  entity-decode-then-tag-strip + D-10 applied + D-11 omitted as
  Maven Clinic; Maven Clinic deviates on D-09 internal-
  whitespace asymmetry vs Honeycomb's TLD-suffix asymmetry).
- `packages/plugins/source-company-masterclass/src/masterclass.service.ts` —
  immediate predecessor in the alphabetical pool processing
  (Spec 075 / run #285; same D-04 variant 2 + D-08 + D-11 as
  Maven Clinic; deviates on D-09 case-only asymmetry vs Maven
  Clinic's internal-whitespace asymmetry, and D-10 omitted vs
  Maven Clinic's D-10 applied).
- `packages/plugins/source-company-scaleai/src/scaleai.service.ts` —
  prior internal-whitespace asymmetry cohort plugin (Spec 064;
  same D-09 internal-whitespace shape as Maven Clinic — slug
  `scaleai` / wire `'Scale AI'`; the only prior internal-
  whitespace asymmetry case in the cohort).
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
