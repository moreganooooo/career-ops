# Spec: 081 — Source Company Plugin: DataCamp

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 081                                                                                                                                                                                            |
| Slug           | source-company-datacamp                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #291)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..080                                                                                                                                                                        |

## 1. Problem Statement

Run #290's Spec 080 closed end-to-end (Calendly shipped — 8 unit
tests green; the **second** live hit alphabetically from the
fifth-fresh-sweep candidate pool). Run #291 picks up the
**third** live hit alphabetically from that pool: **DataCamp**
(41 roles confirmed at run-291 start).

DataCamp — operator of the **dominant data-and-AI-skills online-
learning platform pioneered around the in-browser interactive-
coding-exercise data model** (founded by Jonathan Cornelissen,
Dieter De Mesmaeker, and Martijn Theuwissen in 2013 in Leuven,
Belgium; raised $30M+ across rounds led by Spectrum Equity,
Accomplice, and Arthur Ventures; ships a hybrid B2C
interactive-coding-tutorial subscription + B2B DataCamp for
Business enterprise-skill-tracking platform across the lifelong-
learning segment — alongside competitors Coursera, Udemy,
Pluralsight, edX, and Codecademy — with a hybrid distributed
workforce concentrated across Belgium, the Netherlands, the
United Kingdom, and Remote EU/US) — is published at the bare
`datacamp` Greenhouse slug (the lowercase concatenated brand-
words; case-asymmetric with the wire `company_name === 'DataCamp'`
which carries the brand's CamelCase form) and was confirmed
live via run #291's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/datacamp/jobs?content=true`
(41 open roles confirmed at run-291 start). DataCamp publishes
its `absolute_url` on the canonical Greenhouse variant-2 shape
`https://job-boards.greenhouse.io/datacamp/jobs/<id>`.

Aggregator-callers asking for "all jobs at major data-and-AI-
skills / online-learning / corporate-skill-platform vendors"
must currently either (a) deduce the Greenhouse slug `datacamp`
and call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `datacamp` Greenhouse slug behind its own `Site` enum value,
in the identical shape the codebase already uses sixty-nine
times.

## 2. Goals

- Ship a `source-company-datacamp` plugin returning live
  `JobPostDto` rows for the public DataCamp careers board with
  **no caller config required** (no slug, no auth, no override
  URL).
- Match the structural and behavioural shape of the existing
  `source-company-masterclass` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.DATACAMP` enum value, `id`
  prefixed `datacamp-`) — MasterClass is the closest structural
  cousin because both publish on Greenhouse public API at
  variant 2 (modern hosted-board apex), both use the **case-
  only-asymmetric** wire `company_name` (CamelCase wire vs
  lowercase concatenated slug — second cohort observation of
  this asymmetry shape after MasterClass), both emit HTML-
  entity-encoded content requiring the entity-decode-then-tag-
  strip description pipeline (D-08), both omit D-10 wire-title
  `.trim()` (both 0/N padded). DataCamp carries **one
  structural deviation** from the MasterClass template — D-11
  applied with **leading-pad form** (1 of 41 wire department
  names carries leading ASCII-space padding — `' IT'` —
  whereas MasterClass had 0/6 padded; **second cohort plugin
  to apply D-11** after Lattice, and the **first cohort
  observation of leading-space pad on the department axis**).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case DataCamp.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'datacamp'`.
- Any locale / search-term / location filtering beyond what
  `source-company-masterclass` already supports — the company
  plugins are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover DataCamp's USD/EUR ranges.
- Backfilling historical DataCamp postings — only the open-roles
  slice the Greenhouse public API returns.
- DataCamp product-API / course-catalog / B2B DataCamp-for-
  Business integration — DataCamp's interactive-tutorial,
  classroom-management, and skill-tracking product surfaces are
  separate product surfaces from the careers board; product API
  data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DATACAMP`** in the
> source registry, so that **a single `siteType: [Site.DATACAMP]`
> request returns DataCamp's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of
> leading-ASCII-space padding on the department axis**, so that
> **the existing `String.prototype.trim()` semantic in D-11 is
> validated for both leading- AND trailing-pad forms (Lattice
> covered the trailing-pad case at run #284)**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for DataCamp**, so that **a Greenhouse
> outage on the DataCamp board does not trip the breaker for
> every other Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DATACAMP = 'datacamp'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-datacamp` under `packages/plugins/`.                | must     |
| FR-3  | `DatacampService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `datacamp-`, `site === Site.DATACAMP`, and `companyName === 'DataCamp'` (wire `company_name === 'DataCamp'` byte-for-byte; case-asymmetric — equal-byte-length with the slug `datacamp`, byte-distinct via case at byte index 4 (`C` vs `c`); D-09 omitted — the plugin reads `listing.company_name` directly with `'DataCamp'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/datacamp.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-2 shape `https://job-boards.greenhouse.io/datacamp/jobs/<id>`); the **fallback** `jobUrl` constructor reconstructs the same canonical variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 41 wire titles in the run-291 probe carry whitespace padding; the plugin emits `listing.title` byte-for-byte without a `.trim()`. | must     |
| FR-14 | Wire `departments[0].name` IS trimmed (D-11 applied) — 1 of 41 wire department names in the run-291 probe carries **leading** ASCII-space padding (`' IT'`); the plugin applies `.trim()` to `listing.departments?.[0]?.name` before downstream filters and emit. **Second cohort plugin to apply D-11** after Lattice; **first cohort observation of leading-space pad on the department axis** — distinct from Lattice's three trailing-space-pad observations. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 41-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 41-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[DatacampModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-datacamp/src/datacamp.service.ts
@SourcePlugin({ site: Site.DATACAMP, name: 'DataCamp', category: 'company' })
@Injectable()
export class DatacampService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/datacamp/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `datacamp-${listing.id}`,
  site:         Site.DATACAMP,
  title:        listing.title ?? '',                                    // D-10 omitted (clean wire)
  companyName:  listing.company_name ?? 'DataCamp',                     // D-09 omitted; case-only asymmetry
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/datacamp/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   (listing.departments?.[0]?.name ?? '').trim() || null,  // D-11 applied (leading-pad)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/datacamp.service.spec.ts`):**
  1. NestJS DI resolves `DatacampService` through `DatacampModule`.
  2. `Site.DATACAMP === 'datacamp'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-2 URL pass-
     through, decode-then-strip pipeline cleanliness, the case-
     only-asymmetric wire `companyName === 'DataCamp'` byte-for-
     byte AND byte-distinct from the slug `datacamp` AND of
     equal byte length to the slug AND case-insensitively-equal
     to the slug — locking the equal-length-case-only asymmetry
     observable, the **second** cohort observation of this shape
     after MasterClass; the D-10 omission lock — wire-clean
     title pass-through for both listings; the D-11 application
     lock — emitted `department` for the SECOND listing equals
     the trimmed form `'IT'` AND is byte-distinct from wire-
     padded form `' IT'` AND is exactly 1 byte shorter — locking
     the single-leading-pad form, **first cohort observation of
     leading-space pad on the department axis**).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-
     insensitive against the trimmed form — D-11 search guard).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E
  lives in `source-ats-greenhouse` and exercises the same wire
  shape.
- **Performance:** none beyond NFR-1's narrative budget.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #291):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: DataCamp's
  `https://www.datacamp.com/about/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/datacamp/jobs` public endpoint.
  We already exercise the broader Greenhouse public-API pattern
  from sixty-nine prior company-direct plugins.
- **D-02 (run #291):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'datacamp'`.
- **D-03 (run #291):** No salary parser hook beyond the helpers
  defaults — DataCamp posts USD and EUR ranges from US/EU remote
  and EU hybrid roles; Spec 014 / 015's parser already covers
  USD and EUR without modification.
- **D-04 (run #291):** **Wire-shape variant 2 — modern hosted-
  board apex.** DataCamp's tenant publishes its `absolute_url`
  on the `https://job-boards.greenhouse.io/datacamp/jobs/<id>`
  shape — confirmed via run #291's HTTP 200 probe of the live
  API where every wire job carries this shape. **Eighteenth**
  plugin in the cohort to use variant 2 (after Vercel, Affirm,
  Gusto, Mercury, Buildkite, Netlify, Postman, Webflow,
  Attentive, Intercom, Mixpanel, Scale AI, Cameo, Carta,
  Honeycomb, MasterClass, Maven Clinic, and Calendly). The
  fallback `jobUrl` constructor reconstructs the same canonical
  variant-2 form.
- **D-05 (run #291):** Use Greenhouse slug `datacamp` (the
  lowercase concatenated two-word brand; case-asymmetric with
  the wire `company_name === 'DataCamp'`). Rationale: like
  MasterClass (Spec 075 § 10 D-05), DataCamp's Greenhouse tenant
  is published at the bare lowercase concatenated-words slug.
  Confirmed via run #291's HTTP 200 probe.
- **D-06 (run #291):** Class names are `DatacampService` /
  `DatacampModule` (PascalCase from the lowercase concatenated
  slug `datacamp`, distinct from the wire CamelCase `DataCamp`,
  to keep class names slug-derived for grep symmetry across the
  cohort). Same convention as `MasterclassService` /
  `BitwardenService`.
- **D-07 (run #291):** Selected from the **fifth fresh probe
  sweep** live-board pool processing, alphabetically-third
  live-board hit (after `bitwarden` shipped at run #289 and
  `calendly` at run #290). The remaining eight live hits queue
  for runs #292+ in alphabetical order: `fivetran` (~346),
  `lookout` (~12), `marqeta` (~330), `newrelic` (~370),
  `peloton` (~104), `scopely` (~1190), `squarespace` (~72),
  `typeform` (~132).
- **D-08 (run #291):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Calendly (Spec 080 § 10 D-08), Bitwarden (Spec 079 § 10
  D-08), MasterClass (Spec 075 § 10 D-08), and the rest of the
  post-Klaviyo cohort, DataCamp's tenant emits HTML-entity-
  encoded content (`&lt;p&gt;&lt;strong&gt;About DataCamp&lt;/strong&gt;&lt;/p&gt;
  &lt;p&gt;Data and AI skills are critical for thriving today,
  and DataCamp is the platform that empowers everyone to learn
  them...`) rather than raw HTML tags. Decoding entities **first**
  and then stripping tags yields clean readable text. This is
  the **thirty-seventh** company-direct plugin in the cohort to
  use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #291):** Brand-name trim D-09 is **omitted** with
  **case-only asymmetry**. Rationale: DataCamp's wire
  `company_name === 'DataCamp'` byte-for-byte (the CamelCase
  brand; 8 bytes). The slug `datacamp` is also 8 bytes — slug/
  wire EQUAL-byte-length but byte-distinct via case alone at
  byte index 4 (`c` vs `C`). Same shape as MasterClass (Spec
  075 § 10 D-09 — slug `masterclass` / wire `'MasterClass'`).
  The plugin reads `listing.company_name` directly with
  `'DataCamp'` as a defensive fallback. **Thirty-first cohort
  plugin to omit D-09**, but the **eighth slug/wire asymmetry
  case overall** (after Ramp Network, Scale AI, fuboTV,
  Honeycomb, MasterClass, Maven Clinic, and Stitch Fix) — and
  the **second** equal-length-case-only asymmetry case after
  MasterClass.
- **D-10 (run #291):** Wire-title `.trim()` deviation is
  **omitted**. Rationale: 0 of 41 wire titles in the run-291
  probe carry whitespace padding (the wire is fully clean —
  `'Curriculum Manager - Data Science and AI'`, `'Senior Data
  Engineer'`, etc.). The plugin emits `listing.title` byte-for-
  byte without a `.trim()` (the pass-through preserves byte-
  fidelity to the wire shape; if DataCamp introduces title
  padding upstream, the pass-through observability lock catches
  the diff in the unit tests). **Thirteenth cohort plugin to
  omit D-10**.
- **D-11 (run #291):** Wire `departments[0].name` `.trim()`
  deviation is **APPLIED**. Rationale: 1 of 41 wire department
  names in the run-291 probe carries **leading** ASCII-space
  padding (`' IT'` — the leading-space form is distinct from
  every prior cohort observation; Lattice's three padded
  departments at run #284 were all trailing-space padded
  (`'Customer Account Management '`, `'Product '` × 2)). The
  plugin applies `.trim()` to `listing.departments?.[0]?.name`
  before downstream filters and emit, handling both leading
  AND trailing pad bytes via the standard
  `String.prototype.trim()` semantic. **Second cohort plugin
  to apply D-11** after Lattice — and the **first cohort
  observation of leading-space pad on the department axis**.
  The unit-test happy path asserts the emitted `department` for
  the `' IT'` listing equals the trimmed form `'IT'` AND is
  byte-distinct from the wire form `' IT'` (with one leading
  pad byte) AND is exactly 1 byte shorter — locking the single-
  leading-pad form.
- **D-12 (run #291):** This plugin is the **third** in the
  fifth-fresh-sweep live-board pool processing (after Bitwarden
  at run #289 and Calendly at run #290). The remaining eight
  live hits queue for runs #292+ in alphabetical order. After
  the pool is exhausted (#300+ by current arithmetic), runs
  will pivot to a **sixth fresh probe sweep**.
- **D-13 (run #291):** **One structural deviation** from the
  MasterClass (Spec 075) template — D-11 applied with leading-
  pad form (DataCamp 1/41 padded with single-leading-space
  `' IT'`; MasterClass 0/6 padded). All other axes share with
  MasterClass: D-04 wire-shape variant 2, D-08 entity-decode-
  then-tag-strip, D-09 omitted with case-only asymmetry
  (DataCamp `'DataCamp'` 8 bytes byte 4 / MasterClass
  `'MasterClass'` 11 bytes byte 6), D-10 omitted (both 0/N
  padded). DataCamp is the **second cohort plugin** with case-
  only slug/wire asymmetry — proving out the MasterClass shape
  is a recurring axis. **Distinct deviation axis from
  Lattice's first D-11 application**: DataCamp leading-space
  vs Lattice trailing-space; both handled by the same
  `String.prototype.trim()` semantic.

## 11. References

- `packages/plugins/source-company-masterclass/src/masterclass.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 075 / run #285; same D-04 variant 2 + D-08 +
  D-09 case-only asymmetry + D-10 omitted axes as DataCamp;
  DataCamp deviates on D-11 applied vs MasterClass omitted).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  prior D-11 cohort plugin (Spec 074 / run #284; first cohort
  plugin to apply D-11 with trailing-space-pad form; DataCamp
  is the second cohort plugin to apply D-11 with leading-space-
  pad form — distinct deviation axis).
- `packages/plugins/source-company-calendly/src/calendly.service.ts` —
  immediate predecessor in the fifth-fresh-sweep pool
  processing (Spec 080 / run #290; same D-04 variant 2 + D-08
  axes as DataCamp; deviates on D-09 case-only asymmetry vs
  Calendly's case-symmetric, D-10 omitted vs Calendly's
  applied, D-11 applied vs Calendly's omitted).
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
