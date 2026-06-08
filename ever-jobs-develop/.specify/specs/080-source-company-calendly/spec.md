# Spec: 080 — Source Company Plugin: Calendly

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 080                                                                                                                                                                                            |
| Slug           | source-company-calendly                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #290)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..079                                                                                                                                                                        |

## 1. Problem Statement

Run #289's Spec 079 closed end-to-end (Bitwarden shipped — 8 unit
tests green; the **first** live hit alphabetically from the run-289
fifth-fresh-sweep candidate pool). Run #290 is the **second run of
the fifth fresh probe sweep** — proceeding through the run-289
live-board pool in alphabetical order. The next live hit at
run-290 start is `calendly` (40 jobs reported in the run-289 sweep;
re-confirmed live at run-290 start via HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`
returning 20 open roles — pad-rate normalisation observed against
the run-289 sweep snapshot, well within the expected churn
envelope for live careers boards).

Calendly — operator of the **dominant scheduling-automation
platform pioneered around the meeting-link-and-availability
data model** (founded by Tope Awotona in 2013 in Atlanta; raised
$350M+ across rounds led by OpenView Venture Partners and Iconiq
Capital at a peak $3B valuation in 2021; ships a freemium B2C
scheduling-link product + a B2B Calendly-for-Teams enterprise-
scheduling platform across the productivity-software segment —
alongside competitors Doodle, Cal.com, Acuity Scheduling,
Microsoft Bookings, and Google Appointment Schedules — with a
hybrid distributed workforce concentrated in Atlanta and Remote
US) — is published at the bare `calendly` Greenhouse slug (the
lowercase brand name; case-symmetric with the wire `company_name
=== 'Calendly'`) and was confirmed live via run #290's HTTP 200
probe of
`https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`
(20 open roles confirmed at run-290 start). Calendly publishes
its `absolute_url` on the **canonical Greenhouse wire-shape
variant 2** —
`https://job-boards.greenhouse.io/calendly/jobs/<id>` — the same
host-and-path shape as the Calendly's predecessor wave of
Greenhouse-hosted plugins (Klaviyo, Brex, Buildkite, ZoomInfo,
Attentive, etc.) and the Spec 071 (fuboTV) and Spec 075
(MasterClass) baseline-variant cohort.

Aggregator-callers asking for "all jobs at major productivity-
SaaS / scheduling-automation / meeting-tooling vendors" must
currently either (a) deduce the Greenhouse slug `calendly` and
call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `calendly` Greenhouse slug behind its own `Site` enum value,
in the identical shape the codebase already uses sixty-eight
times (after Bitwarden — Spec 079 / run #289).

## 2. Goals

- Ship a `source-company-calendly` plugin returning live
  `JobPostDto` rows for the public Calendly careers board with
  **no caller config required** (no slug, no auth, no override
  URL).
- Match the structural and behavioural shape of the existing
  baseline-variant Greenhouse-backed company-direct plugins.
  The closest structural cousin is the **Bitwarden (Spec 079)**
  plugin — both use the case-symmetric bare-brand wire
  `company_name` against a lowercase slug (D-09 omitted), both
  emit HTML-entity-encoded content requiring the entity-decode-
  then-tag-strip description pipeline (D-08), both apply D-10
  wire-title `.trim()` (Bitwarden 1/11 padded ~9.1 %, Calendly
  1/20 padded ~5.0 %), and both omit D-11 fully-clean department
  pass-through. Calendly carries **one structural deviation**
  from the Bitwarden template — D-04 wire-shape **variant 2**
  (canonical Greenhouse host; Calendly returns to baseline shape
  after Bitwarden's variant-18 first-cohort observation).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Calendly.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'calendly'` and get
  the richer payload.
- Any locale / search-term / location filtering beyond what the
  Bitwarden plugin already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Calendly's USD ranges.
- Backfilling historical Calendly postings — only the open-
  roles slice the Greenhouse public API returns.
- Calendly product-API / OAuth / webhook / Embed integration —
  Calendly's scheduling-API, OAuth, and Embed product surfaces
  are separate product surfaces from the careers board; product
  API data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CALENDLY`** in the
> source registry, so that **a single `siteType: [Site.CALENDLY]`
> request returns Calendly's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **a return-to-baseline
> reference plugin pinning the canonical Greenhouse variant-2
> wire shape after Bitwarden's variant-18 first-cohort
> observation**, so that **adding the next Greenhouse-only
> employer publishing on the canonical variant-2 shape costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Calendly**, so that **a Greenhouse
> outage on the Calendly board does not trip the breaker for
> every other Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CALENDLY = 'calendly'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-calendly` under `packages/plugins/`.                | must     |
| FR-3  | `CalendlyService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `calendly-`, `site === Site.CALENDLY`, and `companyName === 'Calendly'` (wire `company_name === 'Calendly'` byte-for-byte; case-symmetric with the lowercase slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'Calendly'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/calendly.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the canonical variant-2 shape `https://job-boards.greenhouse.io/calendly/jobs/<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) reconstructs the same canonical variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 1 of 20 wire titles in the run-290 probe carries trailing ASCII-space padding (`'Sr. Director, Engineering '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 20 wire department names in the run-290 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 20-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 20-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[CalendlyModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-calendly/src/calendly.service.ts
@SourcePlugin({ site: Site.CALENDLY, name: 'Calendly', category: 'company' })
@Injectable()
export class CalendlyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `calendly-${listing.id}`,
  site:         Site.CALENDLY,
  title:        (listing.title ?? '').trim(),                          // D-10 applied (1/20 padded)
  companyName:  listing.company_name ?? 'Calendly',                    // D-09 omitted; case-symmetric
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/calendly/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,                // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/calendly.service.spec.ts`):**
  1. NestJS DI resolves `CalendlyService` through `CalendlyModule`.
  2. `Site.CALENDLY === 'calendly'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the canonical variant-2
     `job-boards.greenhouse.io/calendly/jobs/<id>` shape pass-
     through lock; the decode-then-strip pipeline cleanliness;
     the case-symmetric wire `companyName === 'Calendly'` byte-
     for-byte AND `companyName === fixture.jobs[0].company_name`
     byte-for-byte AND case-insensitively-equal to the slug
     `calendly`; the D-10 application lock — emitted `title` for
     the SECOND listing equals trimmed form `'Sr. Director,
     Engineering'` byte-distinct from wire-padded form `'Sr.
     Director, Engineering '` AND exactly 1 byte shorter
     (locking the single-trailing-pad form); and the D-11 fully-
     clean department pass-through for both listings).
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

- **D-01 (run #290):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Calendly's
  `https://calendly.com/jobs` careers landing page renders jobs
  from a Greenhouse-hosted board — the canonical machine-readable
  feed for this tenant is the
  `api.greenhouse.io/v1/boards/calendly/jobs` public endpoint.
  We already exercise the broader Greenhouse public-API pattern
  from sixty-eight prior company-direct plugins (after Bitwarden
  — Spec 079 / run #289).
- **D-02 (run #290):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'calendly'`.
- **D-03 (run #290):** No salary parser hook beyond the helpers
  defaults — Calendly posts USD ranges from US remote roles;
  Spec 014 / 015's parser already covers USD without
  modification.
- **D-04 (run #290):** **Wire-shape variant 2 — canonical
  Greenhouse host (`job-boards.greenhouse.io/<slug>/jobs/<id>`).**
  Calendly's tenant publishes its `absolute_url` on the canonical
  Greenhouse variant-2 shape
  `https://job-boards.greenhouse.io/calendly/jobs/<id>` — the
  baseline shape used by the majority of cohort plugins from
  Klaviyo onwards. Calendly **returns to baseline** after
  Bitwarden's first-cohort variant-18 observation in Spec 079.
  No new variant introduced. The plugin emits
  `listing.absolute_url` byte-for-byte; the fallback constructor
  reconstructs the same canonical variant-2 form
  `https://job-boards.greenhouse.io/calendly/jobs/<id>`
  (deterministic given the listing ID — no defence-in-depth
  divergence between wire and fallback).
- **D-05 (run #290):** Use Greenhouse slug `calendly` (the
  lowercase brand name; case-symmetric with the wire
  `company_name === 'Calendly'`). Rationale: Calendly's
  Greenhouse tenant is published at the bare lowercase slug.
  Confirmed via run #290's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/calendly/jobs?content=true`
  (20 open roles confirmed at run-290 start).
- **D-06 (run #290):** Class names are `CalendlyService` /
  `CalendlyModule` (PascalCase from the lowercase slug).
  Rationale: matches the convention `BitwardenService` /
  `UdemyService` / `LatticeService` use for slug-derived class
  names.
- **D-07 (run #290):** Selected from the **fifth fresh probe
  sweep** live-board pool processing, alphabetically-second
  live-board hit (after Bitwarden — Spec 079 / run #289). The
  pool — `bitwarden` (shipped run #289), `calendly` (this run),
  `datacamp`, `fivetran`, `lookout`, `marqeta`, `newrelic`,
  `peloton`, `scopely`, `squarespace`, `typeform` — proceeds in
  alphabetical order. After `calendly`, the queue is `datacamp`
  (run #291), `fivetran` (run #292), and so on through `typeform`
  (run #299), exhausting the pool by run #299 and pivoting to a
  sixth fresh probe sweep at run #300.
- **D-08 (run #290):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Bitwarden (Spec 079 § 10 D-08), Udemy (Spec 078 § 10
  D-08), Stitch Fix (Spec 077 § 10 D-08), and the rest of the
  post-Klaviyo cohort, Calendly's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;h4&gt;&lt;strong&gt;What's in it for you?&amp;nbsp;
  &lt;/strong&gt;&lt;/h4&gt;`) rather than raw HTML tags —
  confirmed via run #290's HTTP probe of the live API (every
  wire job carries HTML entities including `&lt;`, `&gt;`,
  `&amp;`, `&quot;`, `&#39;`, `&nbsp;`; none carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would
  leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text.
  The pipeline is order-sensitive — `decodeHtmlEntities()` must
  run before `stripHtmlTags()`. The unit-test happy path asserts
  the cleaned description does not contain `&lt;` (entities
  decoded), `&amp;`, `<p>`, `<div>`, or `<strong>` (tags
  stripped after the decode pass). This is the **thirty-sixth**
  company-direct plugin in the cohort to use the entity-decode-
  then-tag-strip pipeline.
- **D-09 (run #290):** Brand-name trim D-09 is **omitted** with
  case-symmetric bare-brand wire form. Rationale: Calendly's
  wire `company_name === 'Calendly'` byte-for-byte (the single-
  token bare brand name; case-symmetric with the lowercase slug
  `calendly`); no legal-entity suffix on the wire — distinct
  from the legal-entity name "Calendly LLC" that may appear in
  corporate filings. The plugin reads `listing.company_name`
  directly with `'Calendly'` as a defensive fallback. **Thirtieth
  cohort plugin to omit D-09**, returning to the case-symmetric
  bare-brand wire form (after the seven slug/wire asymmetry
  cases — Ramp Network, Scale AI, fuboTV, Honeycomb, MasterClass,
  Maven Clinic, and Stitch Fix).
- **D-10 (run #290):** Wire-title `.trim()` deviation is
  **applied**. Rationale: 1 of 20 wire titles in the run-290
  probe carries trailing ASCII-space padding (`'Sr. Director,
  Engineering '` — single-trailing-space-padded; ~5.0 % pad
  rate; lower than Bitwarden's 9.1 % rate — a similar-magnitude
  but slightly cleaner posting hygiene). The plugin applies
  `.trim()` to `listing.title` before downstream filters and
  emit. **Nineteenth cohort plugin to apply D-10** (after Brex,
  Buildkite, ZoomInfo, Attentive, Elastic, Intercom, Mixpanel,
  Faire, Carta, ClassPass, Epic Games, Flexport, fuboTV,
  Glossier, Honeycomb, Maven Clinic, Stitch Fix, Udemy, and
  Bitwarden). The unit-test happy path asserts the emitted
  `title` for the second listing equals the trimmed form `'Sr.
  Director, Engineering'` AND is byte-distinct from the wire
  form `'Sr. Director, Engineering '` (with one trailing pad
  byte) AND is exactly 1 byte shorter — locking the single-
  trailing-pad form.
- **D-11 (run #290):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 20 wire department
  names in the run-290 probe carry trailing ASCII-space padding
  (`'Marketing'`, `'Engineering'`, `'Product'`, `'Customer
  Experience'`, `'Security'` — clean single-token and multi-
  token forms; ~0 % pad rate). The plugin emits
  `listing.departments[0].name` byte-for-byte without a `.trim()`
  (the pass-through is a no-op on the clean wire data; if
  Calendly adds padding upstream in the future, the pass-through
  observability lock catches the diff in the unit tests).
  **Twenty-eighth cohort plugin** with fully-clean department
  pass-through (D-11 omitted; distinct from Lattice which
  applied D-11 — the only cohort plugin so far to apply it).
- **D-12 (run #290):** This plugin is the **second** in the
  fifth-fresh-sweep live-board pool processing (after Bitwarden
  — Spec 079 / run #289). The pool now has 9 remaining alphabet-
  sorted live hits queued (`datacamp`, `fivetran`, `lookout`,
  `marqeta`, `newrelic`, `peloton`, `scopely`, `squarespace`,
  `typeform`), targeting runs #291–#299. Subsequent runs after
  this pool is exhausted (#300+ by current arithmetic) will
  pivot to a **sixth fresh probe sweep**.
- **D-13 (run #290):** **One structural deviation** from the
  Bitwarden (Spec 079) template — D-04 wire-shape **variant 2**
  (canonical Greenhouse host; Calendly returns to baseline shape
  after Bitwarden's variant-18 first-cohort observation in Spec
  079). All other axes share with Bitwarden: D-08 entity-decode-
  then-tag-strip, D-09 omitted with case-symmetric bare-brand
  wire (Calendly `'Calendly'` / Bitwarden `'Bitwarden'`), D-10
  applied (Calendly 1/20 padded ~5.0 %; Bitwarden 1/11 padded
  ~9.1 % — Calendly's posting hygiene is slightly cleaner),
  D-11 fully-clean department pass-through. The variant-2
  return-to-baseline is the most distinctive feature — the
  fallback URL constructor in this plugin is identical to the
  wire URL form (deterministic given the listing ID), so there
  is no defence-in-depth divergence between wire and fallback.

## 11. References

- `packages/plugins/source-company-bitwarden/src/bitwarden.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 079 / run #289; same D-08 + D-09 case-symmetric
  + D-10 applied + D-11 omitted axes as Calendly; Calendly
  deviates on D-04 variant 2 vs Bitwarden's variant 18, returning
  to baseline canonical Greenhouse host).
- `packages/plugins/source-company-udemy/src/udemy.service.ts` —
  prior cohort plugin (Spec 078; same D-08 + D-09 case-symmetric
  + D-10 applied + D-11 omitted axes as Calendly; Udemy deviates
  on D-04 variant 17 third-party-SaaS-host shape).
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
