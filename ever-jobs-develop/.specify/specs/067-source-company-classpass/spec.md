# Spec: 067 — Source Company Plugin: ClassPass

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 067                                                                                                                                                                                            |
| Slug           | source-company-classpass                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #277)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..066                                                                                                                                                                        |

## 1. Problem Statement

Run #276's Spec 066 closed end-to-end (Carta shipped — 8 unit tests
green; the **second** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #277+ to take **ClassPass** next as the alphabetically-third live
hit from that pool (70 roles confirmed at run-275 probe time;
re-confirmed at run-277 start with 70 jobs returned by the HTTP probe).
Run #277 also re-probes the rolling `hubspot` candidate to keep the
documented "remains deferred" pattern fresh (fifteenth-consecutive
empty re-probe at run-277 start — `meta.total === 0`).

ClassPass — operator of the **dominant subscription-fitness-aggregator
platform** (founded by Payal Kadakia in 2013 in New York City;
acquired by Mindbody in 2021 to form a unified wellness/fitness
marketplace; the subscription-fitness-aggregator surface that anchors
the boutique-fitness category alongside Gympass / Wellhub, EquinoxPlus,
and the wave of corporate-wellness challengers; operating with anchor
offices in San Francisco, New York, London, Lisbon, and Singapore)
— is published at the bare `classpass` Greenhouse slug (the
single-token bare brand name; no whitespace transform required since
the brand is a single word) and was confirmed live via run #277's
HTTP 200 probe of `https://api.greenhouse.io/v1/boards/classpass/jobs?content=true`
(70 open roles confirmed at run-277 start). Notably, ClassPass's
tenant publishes its `absolute_url` on a **previously-unobserved
wire-shape variant** — the **vanity-domain shape**
`https://www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
(parent-domain `www.playlist.com` rather than ClassPass's own
`classpass.com`; `careers/opportunities` path; single `gh_jid`
query parameter — distinct from Elastic's variant-11
duplicate-`gh_jid` shape). This is **wire-shape variant 12** — the
**fifteenth distinct wire-shape variant** in the company-direct
cohort and the **first vanity-domain variant** with a non-`jobs.<brand>.<tld>`
host pattern.

Aggregator-callers asking for "all jobs at major
subscription-fitness-aggregator / wellness-marketplace / corporate-
wellness vendors" must currently either (a) deduce the Greenhouse slug
`classpass` and call `source-ats-greenhouse` by hand, or (b)
post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`classpass` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-five times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo, Carta).

## 2. Goals

- Ship a `source-company-classpass` plugin returning live `JobPostDto`
  rows for the public ClassPass careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-carta` plugin (Greenhouse-backed, `category:
  'company'`, `Site.CLASSPASS` enum value, `id` prefixed `classpass-`)
  — Carta is the closest structural cousin because both publish from
  Greenhouse public API AND both emit HTML-entity-encoded content
  (`&lt;p&gt;...`) requiring the entity-decode-then-tag-strip
  description pipeline AND both apply D-10 `.trim()` to wire titles
  AND both omit D-09 brand-name trim (single-token bare brand).
  ClassPass deviates from the Carta template on **one** axis: (1)
  **D-04 wire-shape variant 12** — ClassPass publishes `absolute_url`
  on the **vanity-domain shape**
  `https://www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
  rather than Carta's variant-2 `job-boards.greenhouse.io/carta/jobs/<id>`
  shape. The wire `absolute_url` flows through to `jobUrl`
  byte-for-byte (no normalisation); the **fallback** `jobUrl`
  constructor (when Greenhouse omits `absolute_url` — a
  defence-in-depth path Greenhouse has not exercised against this
  tenant in the audit window) defaults to the **canonical Greenhouse
  variant-2 form** `https://job-boards.greenhouse.io/classpass/jobs/<id>`
  rather than reconstructing the vanity-domain shape, because the
  fallback can only produce a guaranteed-resolvable URL using the
  Greenhouse subdomain (the vanity-domain shape requires
  ClassPass-side proxying that may not be guaranteed for all listing
  IDs).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case ClassPass.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'classpass'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-carta` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover ClassPass's USD / GBP / EUR / SGD ranges.
- Backfilling historical ClassPass postings — only the open-roles slice
  the Greenhouse public API returns.
- Mindbody-parent ATS integration — ClassPass's careers board is
  separate from Mindbody's parent-company board; the parent's roles
  are out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CLASSPASS`** in the source
> registry, so that **a single `siteType: [Site.CLASSPASS]` request
> returns ClassPass's open roles without my code knowing the
> underlying ATS slug or the vanity-domain wire shape**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining a
> previously-unobserved wire-shape variant 12 (vanity-domain
> `playlist.com/careers/opportunities` shape) with the
> entity-decode-then-tag-strip description pipeline AND a single-token
> bare-brand `company_name` AND the wire-title `.trim()` deviation
> AND a fully-clean department pass-through**, so that **adding the
> next Greenhouse-only employer publishing on a vanity-domain
> redirect costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for ClassPass**, so that **a Greenhouse outage on
> the ClassPass board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CLASSPASS = 'classpass'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-classpass` under `packages/plugins/`.               | must     |
| FR-3  | `ClasspassService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `classpass-`, `site === Site.CLASSPASS`, and `companyName === 'ClassPass'` (wire `company_name` is the single-token bare brand `'ClassPass'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/classpass.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-12 vanity-domain shape `https://www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse variant-2 form `https://job-boards.greenhouse.io/classpass/jobs/<id>` rather than reconstructing the vanity-domain shape (Spec 067 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 10 of 70 wire titles in the run-277 probe carry trailing ASCII-space padding (`'Director, Product Management, ClassPass Consumer '`); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 70 wire department names in the run-277 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ClasspassModule]})` resolves.  |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-classpass/src/classpass.service.ts
@SourcePlugin({ site: Site.CLASSPASS, name: 'ClassPass', category: 'company' })
@Injectable()
export class ClasspassService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/classpass/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `classpass-${listing.id}`,
  site:         Site.CLASSPASS,
  title:        (listing.title ?? '').trim(),               // D-10 applied
  companyName:  listing.company_name ?? 'ClassPass',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/classpass/jobs/${listing.id}`,
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

- **Unit (`__tests__/classpass.service.spec.ts`):**
  1. NestJS DI resolves `ClasspassService` through `ClasspassModule`.
  2. `Site.CLASSPASS === 'classpass'` literal pin.
  3. Happy path — fixture with two listings (one clean title, one
     padded title) → two `JobPostDto`s, mapped fields verified
     (including the variant-12 vanity-domain `playlist.com/careers/opportunities/<id>?gh_jid=<id>`
     shape lock for the wire `absolute_url` pass-through, the
     decode-then-strip pipeline cleanliness, the single-token
     bare-brand `companyName === 'ClassPass'` lock, the D-10
     application — emitted `title` is the trimmed form `'Director,
     Product Management, ClassPass Consumer'` — distinct from the wire
     `'Director, Product Management, ClassPass Consumer '` with a
     trailing pad byte, and the D-11 fully-clean department pass-through).
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

- **D-01 (run #277):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: ClassPass's `https://classpass.com/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board
  (with the `absolute_url` field surfaced on a `playlist.com` vanity-
  domain redirect — see D-04) — the canonical machine-readable feed
  for this tenant is the `api.greenhouse.io/v1/boards/classpass/jobs`
  public endpoint. We already exercise the broader Greenhouse public-
  API pattern from fifty-five prior company-direct plugins.
- **D-02 (run #277):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'classpass'`.
- **D-03 (run #277):** No salary parser hook beyond the helpers
  defaults — ClassPass posts USD ranges from US offices and GBP / EUR /
  SGD from London / Lisbon / Singapore offices; Spec 014 / 015's
  parser already covers these locales without modification.
- **D-04 (run #277):** **Wire-shape variant 12 — vanity-domain
  `playlist.com/careers/opportunities/<id>?gh_jid=<id>`.** ClassPass's
  tenant publishes its `absolute_url` on the previously-unobserved
  vanity-domain shape `https://www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
  — confirmed via run #277's HTTP 200 probe of the live API where
  every wire job carries this shape (the first job's `absolute_url`
  is `https://www.playlist.com/careers/opportunities/4662072006?gh_jid=4662072006`).
  The plugin emits `listing.absolute_url` byte-for-byte to preserve
  the canonical destination. The **fallback** `jobUrl` constructor
  (when Greenhouse omits `absolute_url` — a defence-in-depth path
  Greenhouse has not exercised against this tenant in the audit
  window) defaults to the canonical Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/classpass/jobs/<id>` rather than
  reconstructing the vanity-domain shape, because the vanity-domain
  shape requires `playlist.com`-side proxying that may not be
  guaranteed for all listing IDs (e.g. listings in transit between
  vanity-redirect cache invalidation windows). The unit-test happy
  path includes a regression guard asserting (a) the wire
  `absolute_url` flows through to `jobUrl` byte-for-byte AND that the
  emitted `jobUrl` contains the literal `playlist.com/careers/opportunities/`
  substring AND the literal `?gh_jid=` query parameter (locking the
  variant-12 shape against future refactors that might naively
  normalise to variant 2 / 10 / 11). This is the **first** plugin in
  the cohort to use **wire-shape variant 12** — the **fifteenth
  distinct** wire-shape variant in the company-direct cohort.
- **D-05 (run #277):** Use Greenhouse slug `classpass` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like Carta (Spec 066 § 10 D-05),
  Cameo (Spec 065 § 10 D-05), Faire (Spec 063 § 10 D-05), Mixpanel
  (Spec 062 § 10 D-05), Intercom (Spec 061 § 10 D-05), Elastic (Spec
  060 § 10 D-05), Chime (Spec 059 § 10 D-05), Attentive (Spec 058 §
  10 D-05), Webflow (Spec 056 § 10 D-05), Toast (Spec 055 § 10 D-05),
  Postman (Spec 054 § 10 D-05), Netlify (Spec 053 § 10 D-05),
  Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10 D-05), Brex
  (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec
  045 § 10 D-05), and Block (Spec 042 § 10 D-05), ClassPass's
  Greenhouse tenant is published at the bare slug `classpass` with no
  slug/wire asymmetry (the wire `company_name` is the single-token
  `'ClassPass'` byte-for-byte and the slug is `classpass`). Confirmed
  via run #277's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/classpass/jobs?content=true`
  (70 open roles confirmed at run-277 start).
- **D-06 (run #277):** Class names are `ClasspassService` /
  `ClasspassModule` (PascalCase from the lowercase slug — the
  brand's marketing form is `ClassPass` with internal capital P, but
  TypeScript class naming uses `Classpass` to match the slug-derived
  PascalCase convention from Cameo, Carta, Faire, Mixpanel, etc.).
  Rationale: matches the convention `CartaService` / `CameoService`
  use for slug-derived class names, and aligns with the existing
  repo PascalCase convention for slug-derived class names. The
  emitted `companyName === 'ClassPass'` (with internal capital P)
  preserves the marketing-form brand display in the user-facing
  payload while keeping the TypeScript symbol naming consistent
  with the slug.
- **D-07 (run #277):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-third live-board hit
  (after `cameo` shipped at run #275 and `carta` shipped at run
  #276). Run #275's probe sweep across 36 candidate slugs found
  exactly **fourteen** live boards on Greenhouse: `cameo` (3 jobs,
  run #275 shipped), `carta` (52, run #276 shipped), `classpass`
  (70, run #277 next bite — this spec), `coursera` (8), `epicgames`
  (74), `flexport` (113), `fubotv` (11), `glossier` (17), `honeycomb`
  (10), `lattice` (11), `masterclass` (6), `mavenclinic` (24),
  `stitchfix` (22), `udemy` (17). `classpass` is alphabetically third
  after `cameo` and `carta`, so this run takes ClassPass. The
  remaining eleven live hits queue for runs #278+ in alphabetical
  order (`coursera` next at run #278 with 8 roles). HubSpot's
  fifteenth-consecutive empty re-probe at run-277 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.
- **D-08 (run #277):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Carta (Spec 066 § 10 D-08), Cameo
  (Spec 065 § 10 D-08), Scale AI (Spec 064 § 10 D-08), Faire (Spec
  063 § 10 D-08), Mixpanel (Spec 062 § 10 D-08), Intercom (Spec 061
  § 10 D-08), Elastic (Spec 060 § 10 D-08), Chime (Spec 059 § 10
  D-08), Attentive (Spec 058 § 10 D-08), ZoomInfo (Spec 057 § 10
  D-08), Webflow (Spec 056 § 10 D-08), Toast (Spec 055 § 10 D-08),
  Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10 D-08), Ramp
  Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10 D-08),
  Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08), Gusto
  (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec
  046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08), ClassPass's
  tenant emits HTML-entity-encoded content (`&lt;div class=&quot;content-intro&quot;&gt;...`)
  rather than raw HTML tags — confirmed via run #277's HTTP probe
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
  pipeline would surface as a test diff. This is the **twenty-third**
  company-direct plugin in the cohort to use the entity-decode-then-
  tag-strip pipeline.
- **D-09 (run #277):** Brand-name trim D-09 is **omitted**. Rationale:
  ClassPass's wire `company_name` is `'ClassPass'` byte-for-byte (the
  single-token bare brand name with internal capital P; no legal-
  entity suffix on the wire — confirmed via run-277 probe where every
  wire job carries `company_name === 'ClassPass'`, distinct from the
  parent-company name "Mindbody" that owns ClassPass since 2021 and
  the legal-entity name "Classpass Inc." that may appear in older
  SEC filings). The plugin reads `listing.company_name` directly
  without a string-literal pin, but the unit-test happy path asserts
  the emitted `companyName === 'ClassPass'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a parent-
  company suffix or merge with Mindbody's careers board; if such a
  rename happens, a follow-up patch can re-introduce D-09 as a
  one-line edit. **Seventeenth cohort plugin to omit D-09**, returning
  to the single-word bare-brand wire form (Carta `'Carta'`, Cameo
  `'Cameo'`, Mixpanel `'Mixpanel'`, Faire `'Faire'`, Intercom
  `'Intercom'`, Elastic `'Elastic'`, Webflow `'Webflow'`, Attentive
  `'Attentive'`, Postman `'Postman'`, Netlify `'Netlify'`, Mercury
  `'Mercury'`, Buildkite `'Buildkite'`, CircleCI `'CircleCI'`, Toast
  `'Toast'`, plus the Ramp Network slug-collapse case where the wire
  `company_name === 'Ramp'` was single-word despite the slug being
  `rampnetwork`) — distinct from Scale AI's first-of-its-kind
  multi-token bare-brand wire `company_name === 'Scale AI'` (with
  internal whitespace).
- **D-10 (run #277):** Wire-title `.trim()` deviation is **applied**.
  Rationale: at least 10 of the 70 wire titles in the run-277 probe
  carry trailing ASCII-space padding (`'Director, Product Management,
  ClassPass Consumer '`, `'Engineering Manager - Consumer &
  Merchandising '`, `'Field Account Executive - Portland, OR '`, plus
  7 others — confirmed via the curl probe). The other 60 are clean
  (~14.3 % pad rate). The plugin applies `.trim()` to the wire
  `title` before downstream filters and emit. The unit-test happy
  path asserts the emitted `title` matches the trimmed form
  (`'Director, Product Management, ClassPass Consumer'`, no trailing
  pad byte) AND is byte-distinct from the wire form (`'Director,
  Product Management, ClassPass Consumer '`, with trailing pad byte)
  — locking the D-10 application against a future refactor that
  drops the `.trim()` and reintroduces the wire pad byte. **Tenth
  cohort plugin to apply D-10** (after Brex `Spec 047 § 10 D-10`,
  Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`,
  Attentive `Spec 058 § 10 D-10`, Elastic `Spec 060 § 10 D-10`,
  Intercom `Spec 061 § 10 D-10`, Mixpanel `Spec 062 § 10 D-10`,
  Faire `Spec 063 § 10 D-10`, and Carta `Spec 066 § 10 D-10`).
- **D-11 (run #277):** The ClassPass wire `departments[0].name`
  payload uses **fully-clean single-token department names** like
  `'Sales'`, `'Marketing'`, `'Engineering'` — similar to Carta's
  all-trim-clean pure descriptive format and distinct from Cameo's
  partial-pad pass-through. Specifically 0 of the 70 wire department
  names in the run-277 probe carry trailing ASCII-space padding
  (0 % pad-rate). The plugin emits the wire `departments[0].name`
  byte-for-byte (no department-name `.trim()` needed because no
  wire-side padding was observed; the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains
  semantically correct against the clean wire form). The unit-test
  happy path includes (a) a regression guard asserting the emitted
  `department` for the first fixture listing matches the wire
  `departments[0].name === 'Sales'` byte-for-byte (clean single-
  token form), and (b) a regression guard asserting the emitted
  `department` for the second fixture listing matches the wire
  `departments[0].name === 'Marketing'` byte-for-byte (clean
  single-token form).
- **D-12 (run #277):** This plugin is the **third** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at run
  #275 and Carta at run #276). The remaining eleven live hits from
  the run-275 probe sweep queue for runs #278+ in alphabetical
  order: `coursera` (8 roles, run #278 next bite), `epicgames` (74),
  `flexport` (113), `fubotv` (11), `glossier` (17), `honeycomb`
  (10), `lattice` (11), `masterclass` (6), `mavenclinic` (24),
  `stitchfix` (22), `udemy` (17). Subsequent runs after the pool is
  exhausted (#288+ by current arithmetic) will pivot to a **fifth
  fresh probe sweep** targeting yet-untested large-employer
  candidate slugs. HubSpot's fifteenth-consecutive empty re-probe
  at run-277 start (`meta.total === 0`) further confirms the
  documented "remains deferred" pattern.

## 11. References

- `packages/plugins/source-company-carta/src/carta.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 066 / run #276; same D-08, D-09 omission, D-10 application,
  and D-11 fully-clean department pass-through as ClassPass; ClassPass
  deviates by using the previously-unobserved variant-12 vanity-domain
  wire shape instead of variant 2).
- `packages/plugins/source-company-elastic/src/elastic.service.ts` —
  the closest structural cousin for the **vanity-domain** wire-shape
  pattern (Spec 060 / run #270; Elastic uses variant 11 with
  `jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` shape with duplicate
  query parameter — distinct from ClassPass's variant-12 shape but
  similar in the vanity-domain pattern).
- `packages/plugins/source-company-faire/src/faire.service.ts` —
  the prior cohort plugin with D-10 applied + D-11 fully-clean (Spec
  063 / run #273; Faire uses variant 10 instead of variant 12 but is
  the closest D-10 + D-11 fully-clean cousin with single-token bare
  brand name).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
