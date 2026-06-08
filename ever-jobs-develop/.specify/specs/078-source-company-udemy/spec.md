# Spec: 078 — Source Company Plugin: Udemy

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 078                                                                                                                                                                                            |
| Slug           | source-company-udemy                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #288)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..077                                                                                                                                                                        |

## 1. Problem Statement

Run #287's Spec 077 closed end-to-end (Stitch Fix shipped — 8 unit
tests green; the **thirteenth** live hit alphabetically from the
run-275 fourth-fresh-sweep candidate pool) and explicitly queued
run #288 to take **Udemy** next as the alphabetically-fourteenth
and **last** live hit from that pool (17 roles confirmed at run-275
probe time; re-confirmed at run-288 start with 17 jobs returned by
the HTTP probe).

Udemy — operator of the **dominant marketplace-driven online-
learning platform pioneered around the user-generated-course
longitudinal-skills-acceleration data model** (founded by
Eren Bali, Oktay Caglar, and Gagan Biyani in 2010 in Ankara/San
Francisco; IPO'd on NASDAQ as `UDMY` in October 2021 at a $4B
valuation; ships a hybrid B2C course-marketplace + B2B Udemy
Business enterprise-skill-platform product across the lifelong-
learning segment — alongside competitors Coursera, MasterClass,
Skillshare, Pluralsight, LinkedIn Learning, and Domestika — with
a hybrid in-office / remote workforce concentrated across the
United States, Turkey, Ireland, and India) — is published at the
bare `udemy` Greenhouse slug (the lowercase brand name; case-
symmetric with the wire `company_name === 'Udemy'`) and was
confirmed live via run #288's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/udemy/jobs?content=true`
(17 open roles confirmed at run-288 start). Udemy publishes its
`absolute_url` on a **previously-unobserved wire-shape variant
17** — the **third-party SaaS-host shape**
`https://app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`
— making this the **first** plugin in the cohort to use variant
17 — the **twentieth distinct wire-shape variant** in the
company-direct cohort and the **first** to publish through a
third-party SaaS career-board host (CareerPuck, the third-party
job-board front-end SaaS provider that proxies Greenhouse boards
through its `app.careerpuck.com` host) rather than a brand-owned
domain or a Greenhouse-owned host.

Aggregator-callers asking for "all jobs at major online-learning
/ marketplace-education / corporate-skill-platform vendors" must
currently either (a) deduce the Greenhouse slug `udemy` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match — both
paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005), and both
lose the `Site.<KEY>` enum entry that aggregator-side code
branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `udemy` Greenhouse slug behind its own `Site` enum value, in
the identical shape the codebase already uses sixty-six times
(Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic, Intercom,
Mixpanel, Faire, Scale AI, Cameo, Carta, ClassPass, Coursera,
Epic Games, Flexport, fuboTV, Glossier, Honeycomb, Lattice,
MasterClass, Maven Clinic, Stitch Fix — plus the seven legacy
company-direct plugins from before Spec 020).

## 2. Goals

- Ship a `source-company-udemy` plugin returning live `JobPostDto`
  rows for the public Udemy careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-carta` plugin (Greenhouse-backed, `category:
  'company'`, `Site.UDEMY` enum value, `id` prefixed `udemy-`) —
  Carta is the closest structural cousin because both use the
  case-symmetric bare-brand wire `company_name` (Carta `'Carta'`,
  Udemy `'Udemy'`) against a lowercase slug, both emit HTML-
  entity-encoded content requiring the entity-decode-then-tag-
  strip description pipeline (D-08), both apply D-10 wire-title
  `.trim()` (Carta 1/10 padded, Udemy 2/17 padded — near-
  identical pad rate ~10 % vs ~11.8 %), and both omit D-11
  fully-clean department pass-through. Udemy carries **one
  structural deviation** from the Carta template — D-04 wire-
  shape variant 17 (first cohort plugin to use variant 17;
  distinct from Carta's variant 2 modern hosted-board apex
  shape).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Udemy.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'udemy'` and get
  the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-carta` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Udemy's USD ranges.
- Backfilling historical Udemy postings — only the open-roles
  slice the Greenhouse public API returns.
- Udemy product-API / course-catalog / B2B Udemy-Business
  integration — Udemy's marketplace, course-content, and
  enterprise-platform product surfaces are separate product
  surfaces from the careers board; product API data is out of
  scope for this plugin.
- A dedicated CareerPuck adapter — the plugin treats
  CareerPuck as a wire-shape observation only (the
  `absolute_url` happens to be served from `app.careerpuck.com`
  for this tenant), not as a configurable SaaS host. If future
  cohort plugins ship behind CareerPuck, a shared
  `careerpuck-fallback-url` helper can be extracted in a follow-
  up spec, but the inline expression in this plugin is
  sufficient for the first observation.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.UDEMY`** in the
> source registry, so that **a single `siteType: [Site.UDEMY]`
> request returns Udemy's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of the
> CareerPuck third-party-SaaS-hosted Greenhouse wire shape
> (variant 17)**, so that **adding the next CareerPuck-fronted
> Greenhouse employer costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Udemy**, so that **a Greenhouse
> outage on the Udemy board does not trip the breaker for every
> other Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.UDEMY = 'udemy'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-udemy` under `packages/plugins/`.                   | must     |
| FR-3  | `UdemyService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `udemy-`, `site === Site.UDEMY`, and `companyName === 'Udemy'` (wire `company_name === 'Udemy'` byte-for-byte; case-symmetric with the lowercase slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'Udemy'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/udemy.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-17 third-party-SaaS-host shape `https://app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/udemy/jobs/<id>` rather than reconstructing the third-party-SaaS-host shape, because the variant-17 shape requires `app.careerpuck.com`-side proxying that may not be guaranteed for all listing IDs (same fallback strategy as ClassPass, Epic Games, fuboTV, Lattice, and Stitch Fix). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 2 of 17 wire titles in the run-288 probe carry trailing ASCII-space padding (`'Join Our Talent Community '`, `'Sales Development Representative '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 16 populated wire department names in the run-288 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. One listing has `departments` empty (no `[0]`), and the optional-chain emits `null` for that case. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 17-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 17-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[UdemyModule]})` resolves.       |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-udemy/src/udemy.service.ts
@SourcePlugin({ site: Site.UDEMY, name: 'Udemy', category: 'company' })
@Injectable()
export class UdemyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/udemy/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `udemy-${listing.id}`,
  site:         Site.UDEMY,
  title:        (listing.title ?? '').trim(),                          // D-10 applied (2/17 padded)
  companyName:  listing.company_name ?? 'Udemy',                       // D-09 omitted; case-symmetric
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/udemy/jobs/${listing.id}`,
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

- **Unit (`__tests__/udemy.service.spec.ts`):**
  1. NestJS DI resolves `UdemyService` through `UdemyModule`.
  2. `Site.UDEMY === 'udemy'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-17
     `app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`
     shape pass-through lock — third-party-SaaS host preserved
     byte-for-byte; AND fallback URL using the canonical Greenhouse
     variant-2 form `job-boards.greenhouse.io/udemy/jobs/<id>` —
     same fallback strategy as ClassPass / Epic Games / fuboTV /
     Lattice / Stitch Fix; the decode-then-strip pipeline
     cleanliness; the case-symmetric wire `companyName === 'Udemy'`
     byte-for-byte AND `companyName === fixture.jobs[0].company_name`
     byte-for-byte AND case-insensitively-equal to the slug
     `udemy`; the D-10 application lock — emitted `title` for the
     SECOND listing equals trimmed form `'Sales Development
     Representative'` byte-distinct from wire-padded form `'Sales
     Development Representative '` AND exactly 1 byte shorter
     (locking the single-trailing-pad form); and the D-11 fully-
     clean department pass-through).
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

- **D-01 (run #288):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Udemy's
  `https://about.udemy.com/careers` careers landing page
  redirects buyers to a CareerPuck-fronted board that itself
  pulls from Greenhouse — the canonical machine-readable feed
  for this tenant is the
  `api.greenhouse.io/v1/boards/udemy/jobs` public endpoint
  (CareerPuck is a presentation layer; Greenhouse is the data
  layer). We already exercise the broader Greenhouse public-API
  pattern from sixty-six prior company-direct plugins.
- **D-02 (run #288):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'udemy'`.
- **D-03 (run #288):** No salary parser hook beyond the helpers
  defaults — Udemy posts USD ranges from US remote / SF hybrid
  roles; Spec 014 / 015's parser already covers USD without
  modification.
- **D-04 (run #288):** **Wire-shape variant 17 — third-party-
  SaaS-host (CareerPuck) shape — first cohort observation.**
  Udemy's tenant publishes its `absolute_url` on a **previously-
  unobserved third-party-SaaS-host shape**
  `https://app.careerpuck.com/job-board/udemy/job/<id>?gh_jid=<id>`
  (`app.careerpuck.com` — the third-party CareerPuck SaaS host
  proxying Greenhouse boards through its job-board front-end,
  distinct from every prior cohort variant which all use either
  Greenhouse-owned hosts (`boards.greenhouse.io`,
  `job-boards.greenhouse.io`) or the brand's own domain (bare,
  `www.`-prefixed, vanity-subdomain, or parent-domain — variants
  10..16); `/job-board/udemy/` path with the slug embedded;
  singular `/job/<id>` path with the listing ID; single `gh_jid`
  query parameter — same single-query-parameter shape as
  variants 10, 12, 13, 14, 15). This is the **first** plugin in
  the cohort to use **wire-shape variant 17** — the **twentieth
  distinct wire-shape variant** in the company-direct cohort and
  the **first** to publish through a third-party SaaS career-
  board host (CareerPuck) rather than a brand-owned domain or a
  Greenhouse-owned host. Confirmed via run #288's HTTP 200 probe
  of the live API where every wire job carries this shape with
  the `app.careerpuck.com` host byte-for-byte.

  The plugin emits `listing.absolute_url` byte-for-byte to
  preserve the canonical destination. The **fallback** `jobUrl`
  constructor (when Greenhouse omits `absolute_url` — a defence-
  in-depth path Greenhouse has not exercised against this tenant
  in the audit window) defaults to the canonical Greenhouse
  **variant-2** form `https://job-boards.greenhouse.io/udemy/jobs/<id>`
  rather than reconstructing the third-party-SaaS-host shape,
  because the bare CareerPuck shape requires `app.careerpuck.com`-
  side proxying that may not be guaranteed for all listing IDs
  (same fallback strategy as ClassPass — Spec 067 § 10 D-04 —
  Epic Games — Spec 069 § 10 D-04 — fuboTV — Spec 071 § 10
  D-04 — Lattice — Spec 074 § 10 D-04 — and Stitch Fix —
  Spec 077 § 10 D-04).
- **D-05 (run #288):** Use Greenhouse slug `udemy` (the lowercase
  brand name; case-symmetric with the wire `company_name ===
  'Udemy'` — same shape as Cameo / Carta / Lattice). Rationale:
  Udemy's Greenhouse tenant is published at the bare lowercase
  slug. Confirmed via run #288's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/udemy/jobs?content=true`
  (17 open roles confirmed at run-288 start).
- **D-06 (run #288):** Class names are `UdemyService` /
  `UdemyModule` (PascalCase from the lowercase slug). Rationale:
  matches the convention `CartaService` / `LatticeService` /
  `StitchfixService` use for slug-derived class names.
- **D-07 (run #288):** Selected from the **fourth fresh probe
  sweep** live-board pool processing, alphabetically-fourteenth
  and **last** live-board hit (after `cameo` shipped at run #275,
  `carta` at run #276, `classpass` at run #277, `coursera` at
  run #278, `epicgames` at run #279, `flexport` at run #280,
  `fubotv` at run #281, `glossier` at run #282, `honeycomb` at
  run #283, `lattice` at run #284, `masterclass` at run #285,
  `mavenclinic` at run #286, and `stitchfix` at run #287). Run
  #275's probe sweep across 36 candidate slugs found exactly
  **fourteen** live boards on Greenhouse: `cameo` (3 jobs, run
  #275 shipped), `carta` (52, run #276 shipped), `classpass` (70,
  run #277 shipped), `coursera` (8, run #278 shipped), `epicgames`
  (74, run #279 shipped), `flexport` (113, run #280 shipped),
  `fubotv` (11, run #281 shipped), `glossier` (17, run #282
  shipped), `honeycomb` (10, run #283 shipped), `lattice` (11,
  run #284 shipped), `masterclass` (6, run #285 shipped),
  `mavenclinic` (24, run #286 shipped), `stitchfix` (22, run #287
  shipped), `udemy` (17, run #288 next bite — this spec).
  `udemy` is alphabetically fourteenth and last so this run takes
  Udemy and **closes out the fourth-fresh-sweep candidate pool**.
  Subsequent runs (#289+ by current arithmetic) will pivot to a
  **fifth fresh probe sweep** targeting yet-untested large-
  employer candidate slugs.
- **D-08 (run #288):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Stitch Fix (Spec 077 § 10 D-08), Maven Clinic (Spec 076
  § 10 D-08), MasterClass (Spec 075 § 10 D-08), and the rest of
  the post-Klaviyo cohort, Udemy's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;
  &lt;h3&gt;&lt;strong&gt;Join Udemy. Help &lt;/strong&gt;&lt;strong&gt;define&lt;em&gt;...`)
  rather than raw HTML tags — confirmed via run #288's HTTP probe
  of the live API (every wire job carries HTML entities including
  `&lt;`, `&gt;`, `&amp;`, `&quot;`, and numeric entities `&#39;`;
  none carry raw tags). Applying `stripHtmlTags()` alone to that
  wire payload would leave the literal entities in place. Decoding
  entities **first** and then stripping tags yields clean readable
  text. The pipeline is order-sensitive — `decodeHtmlEntities()`
  must run before `stripHtmlTags()`. The unit-test happy path
  asserts the cleaned description (a) does not contain `&lt;`
  (entities decoded), (b) does not contain `&amp;`, and (c) does
  not contain `<p>`, `<div>`, or `<strong>` (tags stripped after
  the decode pass). This is the **thirty-fourth** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip
  pipeline.
- **D-09 (run #288):** Brand-name trim D-09 is **omitted** with
  case-symmetric bare-brand wire form. Rationale: Udemy's wire
  `company_name === 'Udemy'` byte-for-byte (the single-token bare
  brand name; case-symmetric with the lowercase slug `udemy` —
  same shape as Cameo `'Cameo'` / Carta `'Carta'` / Lattice
  `'Lattice'`); no legal-entity suffix on the wire — distinct
  from the legal-entity name "Udemy, Inc." that appears in
  current SEC filings under NASDAQ ticker `UDMY`. The plugin
  reads `listing.company_name` directly with `'Udemy'` as a
  defensive fallback. **Twenty-eighth cohort plugin to omit
  D-09**, returning to the case-symmetric bare-brand wire form
  (after the seven slug/wire asymmetry cases — Ramp Network,
  Scale AI, fuboTV, Honeycomb, MasterClass, Maven Clinic, and
  Stitch Fix).
- **D-10 (run #288):** Wire-title `.trim()` deviation is
  **applied**. Rationale: 2 of 17 wire titles in the run-288
  probe carry trailing ASCII-space padding (`'Join Our Talent
  Community '`, `'Sales Development Representative '` — both
  single-trailing-space-padded; ~11.8 % pad rate). The plugin
  applies `.trim()` to `listing.title` before downstream filters
  and emit. **Seventeenth cohort plugin to apply D-10** (after
  Brex, Buildkite, ZoomInfo, Attentive, Elastic, Intercom,
  Mixpanel, Faire, Carta, ClassPass, Epic Games, Flexport,
  fuboTV, Glossier, Honeycomb, Maven Clinic, and Stitch Fix).
  The unit-test happy path asserts the emitted `title` for the
  second listing equals the trimmed form `'Sales Development
  Representative'` AND is byte-distinct from the wire form
  `'Sales Development Representative '` (with one trailing pad
  byte) AND is exactly 1 byte shorter — locking the single-
  trailing-pad form.
- **D-11 (run #288):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 16 populated wire
  department names in the run-288 probe carry trailing ASCII-
  space padding (`'UB Sales - ADR'`, `'Sales'`, `'Consumer
  Partnerships'`, `'Product Design and UXR'`, `'UB Sales -
  Enterprise'`, `'Product Management'`, `'Engineering'`, etc.
  — clean single-token and multi-token forms with internal
  whitespace, hyphens, and ampersands; ~0 % pad rate). One
  listing has an empty `departments` array — the plugin's
  `?.[0]?.name` optional-chain emits `null` for that listing.
  The plugin emits `listing.departments?.[0]?.name` byte-for-
  byte without a `.trim()` (the pass-through is a no-op on the
  clean wire data; if Udemy adds padding upstream in the future,
  the pass-through observability lock catches the diff in the
  unit tests). **Twenty-sixth cohort plugin** with fully-clean
  department pass-through (D-11 omitted; distinct from Lattice
  which applied D-11 — the only cohort plugin so far to apply
  it).
- **D-12 (run #288):** This plugin is the **fourteenth and last**
  in the fourth-fresh-sweep live-board pool processing (after
  Cameo at run #275, Carta at run #276, ClassPass at run #277,
  Coursera at run #278, Epic Games at run #279, Flexport at
  run #280, fuboTV at run #281, Glossier at run #282, Honeycomb
  at run #283, Lattice at run #284, MasterClass at run #285,
  Maven Clinic at run #286, and Stitch Fix at run #287). With
  Udemy shipped, the fourth-fresh-sweep candidate pool is
  **fully exhausted**. Subsequent runs (#289+ by current
  arithmetic) will pivot to a **fifth fresh probe sweep**
  targeting yet-untested large-employer candidate slugs.
- **D-13 (run #288):** **One structural deviation** from the
  Carta (Spec 066) template — D-04 wire-shape variant 17 (first
  cohort plugin to use variant 17; first cohort observation of
  a third-party SaaS career-board host (CareerPuck); distinct
  from Carta's variant 2 modern hosted-board apex shape
  `job-boards.greenhouse.io/<slug>/jobs/<id>`). All other axes
  share with Carta: D-08 entity-decode-then-tag-strip, D-09
  omitted with case-symmetric bare-brand wire (Udemy `'Udemy'` /
  Carta `'Carta'`), D-10 applied (Udemy 2/17 padded; Carta 1/10
  padded — near-identical pad rate ~11.8 % vs ~10 %), D-11
  fully-clean department pass-through.

## 11. References

- `packages/plugins/source-company-carta/src/carta.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 066 / run #276; same D-08 + D-09 case-symmetric
  + D-10 applied + D-11 omitted axes as Udemy; Udemy deviates
  on D-04 variant 17 vs Carta's variant 2).
- `packages/plugins/source-company-stitchfix/src/stitchfix.service.ts` —
  prior new-variant cohort plugin (Spec 077; first cohort plugin
  to use a new wire variant — variant 16; same fallback
  strategy as Udemy — variant-2 fallback for a non-variant-2
  wire shape; the **immediate predecessor** in the alphabetical
  pool processing).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  prior new-variant cohort plugin (Spec 074; first cohort plugin
  to use a non-Greenhouse-host new wire variant — variant 15
  bare brand-domain; same fallback strategy as Udemy — variant-2
  fallback for a non-variant-2 wire shape).
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
