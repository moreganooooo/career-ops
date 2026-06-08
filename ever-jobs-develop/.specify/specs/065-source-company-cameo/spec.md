# Spec: 065 — Source Company Plugin: Cameo

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 065                                                                                                                                                                                            |
| Slug           | source-company-cameo                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #275)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064 |

## 1. Problem Statement

Run #274's Spec 064 closed end-to-end (Scale AI shipped — 9 unit tests
green; the run-273 third-fresh-sweep candidate pool's second live hit)
and explicitly queued runs #275+ to pivot to a **fourth fresh probe
sweep** targeting the next batch of large-employer Greenhouse-candidate
slugs. Run #275 ran the HTTP probe sweep across the run-274-queued
candidate pool of 36 slugs (`carta`, `brightwheel`, `mavenclinic`,
`glossier`, `casper`, `chewy`, `wayfair`, `flexport`, `epicgames`,
`zendesk`, `stitchfix`, `classpass`, `plex`, `cameo`, `hims`,
`compass`, `bumble`, `hinge`, `masterclass`, `skillshare`, `coursera`,
`udemy`, `honeycomb`, `blameless`, `opslevel`, `lattice`, `workrise`,
`niantic`, `tubi`, `fubotv`, `rover`, `fanatics`, `nylas`, `sanity`,
`vidio`, plus the rolling `hubspot` re-probe). Fourteen returned HTTP
200: `cameo` (3 jobs), `carta` (52), `classpass` (70), `coursera` (8),
`epicgames` (74), `flexport` (113), `fubotv` (11), `glossier` (17),
`honeycomb` (10), `lattice` (11), `masterclass` (6), `mavenclinic`
(24), `stitchfix` (22), `udemy` (17). The other 21 returned HTTP 404
(those tenants are either not on Greenhouse, on authenticated-only
boards, or on a non-public ATS — most likely Lever, Ashby, Workday
native, Workable). HubSpot's thirteenth-consecutive re-probe
(`meta.total === 0`) confirms the documented "remains deferred"
pattern.

`cameo` is alphabetically first among the live hits, so this run takes
**Cameo, Inc.** — the **dominant celebrity-personalised-video
marketplace** vendor (founded by Steven Galanis, Martin Blencowe, and
Devon Spinnler Townsend in 2017 in Chicago, Illinois; currently a
private company after Series C rounds led by Softbank Vision Fund 2,
e.ventures, Lightspeed Venture Partners, Bain Capital Ventures,
Kleiner Perkins, Spark Capital, and others; now operating as a
remote-first organisation with anchor offices in Chicago, Los
Angeles, and New York; operator of Cameo Marketplace (the
celebrity-video flagship), Cameo for Business (the B2B branded-video
program), Cameo Calls (the live-video Q&A surface), Cameo Kids (the
parental-mode children's-celebrity surface), Cameo Direct (the
premium fan-engagement subscription), and Cameo Pass (the
all-you-can-stream subscription) lines that anchor the personalised-
video category alongside Memmo, Greetzly, StarsForFans, ShoutOutMe,
and the wave of TikTok-Live celebrity-engagement and Substack-
celebrity-newsletter challengers) — is published at the bare `cameo`
Greenhouse slug (the lowercase brand name, no whitespace transform
required) and was confirmed live via run #275's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/cameo/jobs?content=true` (3 open
roles returned at probe time). Aggregator-callers asking for "all
jobs at major personalised-video / creator-economy vendors" must
currently either (a) deduce the Greenhouse slug `cameo` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match — both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`cameo` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-three times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI).

## 2. Goals

- Ship a `source-company-cameo` plugin returning live `JobPostDto`
  rows for the public Cameo careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-scaleai` plugin (Greenhouse-backed, `category:
  'company'`, `Site.CAMEO` enum value, `id` prefixed `cameo-`) —
  Scale AI is the closest structural cousin because both publish
  `absolute_url` on **wire-shape variant 2** (the modern US-region
  permalink subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`
  shape) AND both emit HTML-entity-encoded content (`&lt;p&gt;...`)
  requiring the entity-decode-then-tag-strip description pipeline AND
  both omit the brand-name trim D-09 against a bare-brand wire
  `company_name` AND both omit the wire-title `.trim()` deviation
  D-10 (zero padded titles in their respective probes). Cameo
  deviates from the Scale AI template on **one** axis: (1) **D-11
  trailing-pad on department name** — 1 of 3 wire `departments[0].name`
  values in the run-275 probe carries a trailing ASCII-space pad
  byte (`'Cameo for Business '` — the second-listing department; the
  other two are clean). The plugin emits the wire
  `departments[0].name` byte-for-byte (no department-name trim — the
  pass-through preserves byte-fidelity to the wire shape and the
  case-insensitive `searchTerm.toLowerCase().includes(...)` filter
  remains semantically correct against the padded form). The brand-
  name handling is the **single-token bare brand** form (`'Cameo'`),
  byte-distinct from Scale AI's multi-token `'Scale AI'` (with
  internal whitespace) but identical in pipeline shape.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Cameo.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'cameo'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-scaleai` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Cameo's USD ranges (the Chicago / Los Angeles /
  New York remote-first US posture is dominated by USD without
  modification).
- Backfilling historical Cameo postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CAMEO`** in the source
> registry, so that **a single `siteType: [Site.CAMEO]` request returns
> Cameo's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2
> (the modern US-region permalink subdomain shape, thirteenth cohort
> plugin in this variant) with the entity-decode-then-tag-strip
> description pipeline AND a single-token bare-brand `company_name` AND
> no wire-title trim deviation AND a partial-pad department-name
> pass-through**, so that **adding the next Greenhouse-only employer
> with a small-board count and a partially-padded department field
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Cameo**, so that **a Greenhouse outage on the
> Cameo board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CAMEO = 'cameo'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-cameo` under `packages/plugins/`.                   | must     |
| FR-3  | `CameoService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `cameo-`, `site === Site.CAMEO`, and `companyName === 'Cameo'` (wire `company_name` is the single-token bare brand `'Cameo'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/cameo.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **modern US-region permalink subdomain** shape `https://job-boards.greenhouse.io/cameo/jobs/<id>` — variant 2 (the **thirteenth** plugin in the cohort to use this shape after Vercel, Affirm, Gusto, Mercury, Buildkite, Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel, and Scale AI; Spec 065 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 3 wire titles in the run-275 probe carry trailing ASCII-space padding; the plugin emits `listing.title` byte-for-byte without a `.trim()`. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 1 of 3 wire department names carries trailing ASCII-space padding (`'Cameo for Business '`); the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[CameoModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-cameo/src/cameo.service.ts
@SourcePlugin({ site: Site.CAMEO, name: 'Cameo', category: 'company' })
@Injectable()
export class CameoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/cameo/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `cameo-${listing.id}`,
  site:         Site.CAMEO,
  title:        listing.title ?? '',                        // D-10 omitted (no .trim())
  companyName:  listing.company_name ?? 'Cameo',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/cameo/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,     // D-11 byte-for-byte (preserves padding)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/cameo.service.spec.ts`):**
  1. NestJS DI resolves `CameoService` through `CameoModule`.
  2. `Site.CAMEO === 'cameo'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified
     (including the variant-2 `job-boards.greenhouse.io/cameo/jobs/<id>` shape lock,
     the decode-then-strip pipeline cleanliness, the single-token bare-brand
     `companyName === 'Cameo'` lock, the D-10 omission lock, and the
     D-11 partial-pad department pass-through with the second listing
     carrying the padded `'Cameo for Business '` department).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-insensitive,
     including the padded multi-word form — `'business'` matching the
     padded `'Cameo for Business '`).
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

- **D-01 (run #275):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Cameo's `https://www.cameo.com/careers`
  careers landing page redirects buyers to a Greenhouse-hosted board —
  the canonical machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/cameo/jobs` public endpoint. We already
  exercise the broader Greenhouse public-API pattern from fifty-three
  prior company-direct plugins.
- **D-02 (run #275):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'cameo'`.
- **D-03 (run #275):** No salary parser hook beyond the helpers
  defaults — Cameo posts USD ranges (its Chicago / Los Angeles / New
  York remote-first US posture is dominated by USD without
  modification); Spec 014 / 015's parser already covers the relevant
  currency without modification.
- **D-04 (run #275):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **modern US-region permalink
  subdomain** template `https://job-boards.greenhouse.io/cameo/jobs/<id>`
  — wire-shape variant 2. This is the **thirteenth** plugin in the
  cohort to use variant 2 (after Vercel, Affirm, Gusto, Mercury,
  Buildkite, Netlify, Postman, Webflow, Attentive, Intercom, Mixpanel,
  and Scale AI — distinct from variant 1's `boards.greenhouse.io/<slug>`
  bare-board apex shape, variant 10's
  `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` legacy hosted-
  board apex shape used by Chime and Faire, and variant 11's vanity-
  domain `jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>` shape used
  by Elastic). Rationale: Cameo's tenant publishes its `absolute_url`
  on this shape — confirmed via run #275's HTTP 200 probe of the live
  API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/cameo/jobs/7657872003`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Cameo listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/cameo/jobs/`
  substring AND must NOT contain `?gh_jid=` (locking the variant-2
  shape against future refactors that might naively normalise to a
  variant-10 or variant-11 template).
- **D-05 (run #275):** Use Greenhouse slug `cameo` (the lowercase
  bare brand name; no whitespace transform required since the brand
  is a single word). Rationale: like Faire (Spec 063 § 10 D-05),
  Mixpanel (Spec 062 § 10 D-05), Intercom (Spec 061 § 10 D-05),
  Elastic (Spec 060 § 10 D-05), Chime (Spec 059 § 10 D-05), Attentive
  (Spec 058 § 10 D-05), Webflow (Spec 056 § 10 D-05), Toast (Spec
  055 § 10 D-05), Postman (Spec 054 § 10 D-05), Netlify (Spec 053 §
  10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10
  D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05),
  Klaviyo (Spec 045 § 10 D-05), and Block (Spec 042 § 10 D-05),
  Cameo's Greenhouse tenant is published at the bare slug `cameo`
  with no slug/wire asymmetry (the wire `company_name` is the
  single-token `'Cameo'` byte-for-byte and the slug is `cameo`).
  Confirmed via run #275's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/cameo/jobs?content=true` (3
  open roles returned).
- **D-06 (run #275):** Class names are `CameoService` / `CameoModule`
  (PascalCase from the bare-brand single-word name). Rationale:
  matches the convention `MixpanelService` / `IntercomService` use
  for single-word brand names, and aligns with the existing repo
  PascalCase convention for slug-derived class names.
- **D-07 (run #275):** Selected from the **fourth fresh probe sweep**,
  alphabetically-first live-board hit. Run #275's probe sweep across
  36 candidate slugs (`carta`, `brightwheel`, `mavenclinic`,
  `glossier`, `casper`, `chewy`, `wayfair`, `flexport`, `epicgames`,
  `zendesk`, `stitchfix`, `classpass`, `plex`, `cameo`, `hims`,
  `compass`, `bumble`, `hinge`, `masterclass`, `skillshare`,
  `coursera`, `udemy`, `honeycomb`, `blameless`, `opslevel`,
  `lattice`, `workrise`, `niantic`, `tubi`, `fubotv`, `rover`,
  `fanatics`, `nylas`, `sanity`, `vidio`, plus the rolling `hubspot`
  re-probe) found exactly **fourteen** live boards on Greenhouse:
  `cameo` (3 jobs), `carta` (52), `classpass` (70), `coursera` (8),
  `epicgames` (74), `flexport` (113), `fubotv` (11), `glossier` (17),
  `honeycomb` (10), `lattice` (11), `masterclass` (6), `mavenclinic`
  (24), `stitchfix` (22), `udemy` (17). `cameo` is alphabetically
  first among the live hits, so this run takes Cameo. The remaining
  thirteen live hits queue for runs #276+ in alphabetical order
  (`carta` next at run #276 with 52 roles). Cameo at 3 roles is
  **below** the prior cohort minimum of 9 roles (Mixpanel shipped at
  9; ZoomInfo at 14; Scale AI at 11), making this the **first cohort
  plugin to redefine the floor downward to 3** — a defensible move
  because the plugin is a thin wrapper that emits whatever the live
  board returns, and 3 roles is enough to exercise the happy-path
  fixture and the cohort statistic of "smallest live board to date
  in the cohort". HubSpot's thirteenth-consecutive empty re-probe at
  run-275 start (`meta.total === 0`) further confirms the documented
  "remains deferred" pattern.
- **D-08 (run #275):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Scale AI (Spec 064 § 10 D-08), Faire
  (Spec 063 § 10 D-08), Mixpanel (Spec 062 § 10 D-08), Intercom (Spec
  061 § 10 D-08), Elastic (Spec 060 § 10 D-08), Chime (Spec 059 § 10
  D-08), Attentive (Spec 058 § 10 D-08), ZoomInfo (Spec 057 § 10
  D-08), Webflow (Spec 056 § 10 D-08), Toast (Spec 055 § 10 D-08),
  Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10 D-08), Ramp
  Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10 D-08),
  Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08),
  Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo
  (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08), Cameo's
  tenant emits HTML-entity-encoded content (`&lt;p&gt;At Cameo, we
  make impossible connections possible...`) rather than raw HTML
  tags — confirmed via run #275's HTTP probe of the live API (every
  wire job carries HTML entities; none carry raw tags). Applying
  `stripHtmlTags()` alone to that wire payload would leave the
  literal entities in place. Decoding entities **first** and then
  stripping tags yields clean readable text. The pipeline is order-
  sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b)
  does not contain `&quot;` (named entities decoded), (c) does not
  contain `&#39;` (numeric entities decoded), and (d) does not
  contain `<p>`, `<div>`, `<strong>`, or `<em>` (tags stripped after
  the decode pass), so a future refactor that swaps the order or
  drops one half of the pipeline would surface as a test diff. This
  is the **twenty-first** company-direct plugin in the cohort to use
  the entity-decode-then-tag-strip pipeline.
- **D-09 (run #275):** Brand-name trim D-09 is **omitted**. Rationale:
  Cameo's wire `company_name` is `'Cameo'` byte-for-byte (the
  single-token bare brand name; no legal-entity suffix on the wire —
  confirmed via run-275 probe where every wire job carries
  `company_name === 'Cameo'`, distinct from the legal-entity name
  "Cameo, Inc." that appears in SEC filings and press releases).
  The plugin reads `listing.company_name` directly without a
  string-literal pin, but the unit-test happy path asserts the
  emitted `companyName === 'Cameo'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a legal-
  entity suffix; if such a rename happens, a follow-up patch can
  re-introduce D-09 as a one-line edit. **Fifteenth cohort plugin
  to omit D-09**, returning to the single-word bare-brand wire form
  (Mixpanel `'Mixpanel'`, Faire `'Faire'`, Intercom `'Intercom'`,
  Elastic `'Elastic'`, Webflow `'Webflow'`, Attentive `'Attentive'`,
  Postman `'Postman'`, Netlify `'Netlify'`, Mercury `'Mercury'`,
  Buildkite `'Buildkite'`, CircleCI `'CircleCI'`, Toast `'Toast'`,
  plus the Ramp Network slug-collapse case where the wire
  `company_name === 'Ramp'` was single-word despite the slug being
  `rampnetwork`) — distinct from Scale AI's first-of-its-kind
  multi-token bare-brand wire `company_name === 'Scale AI'`.
- **D-10 (run #275):** Wire-title `.trim()` deviation is **omitted**.
  Rationale: 0 of the 3 wire titles in the run-275 probe carry
  trailing ASCII-space padding (every title surveyed —
  `'Automation Engineer'`, `'Business Development Representative -
  Cameo for Business'`, `'Summer Internship (2026)- Talent/Creator
  Acquisition'` — closes with an alphanumeric byte). The plugin
  emits `listing.title` byte-for-byte without a `.trim()`. The unit-
  test happy path asserts the emitted `title` matches the wire
  `title` byte-for-byte (no trim observable — regression guard
  against a future refactor that introduces a spurious `.trim()` and
  shifts the observable title shape on a future-padded fixture).
  This is structurally analogous to Chime (Spec 059 § 10 D-10) and
  Scale AI (Spec 064 § 10 D-10) — both also omitted, distinct from
  the trim-applied cohort: Brex, Buildkite, ZoomInfo, Attentive,
  Elastic, Intercom, Mixpanel, and Faire.
- **D-11 (run #275):** The Cameo wire `departments[0].name` payload
  uses **mixed clean and pad-suffixed multi-word descriptive
  department names** like `'Engineering'` (single-token, trim-clean),
  `'Cameo for Business '` (multi-token brand-self-referential,
  trailing pad byte), and `'Talent'` (single-token, trim-clean) —
  distinct from Scale AI's all-trim-clean multi-word format and
  Faire's all-trim-clean pure descriptive format. Specifically 1 of
  the 3 wire department names in the run-275 probe (`'Cameo for
  Business '`) carries trailing ASCII-space padding (~33.3 % pad-
  rate, the highest single-listing pad rate in the cohort to date).
  The plugin emits the wire `departments[0].name` byte-for-byte (no
  department-name `.trim()` — the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains
  semantically correct against the wire-padded form because
  `'business'` is a substring of `'cameo for business '` after
  lowercasing). The unit-test happy path includes (a) a regression
  guard asserting the emitted `department` for the first fixture
  listing matches the wire `departments[0].name === 'Engineering'`
  byte-for-byte, (b) a regression guard asserting the emitted
  `department` for the second fixture listing matches the wire
  `departments[0].name === 'Cameo for Business '` byte-for-byte
  (with trailing pad byte preserved — locking the D-11 byte-fidelity
  pass-through against a future refactor that introduces a spurious
  `.trim()` on the department field), and (c) a regression guard
  asserting the case-insensitive `searchTerm` match on the literal
  `'business'` substring resolves the second-listing fixture's
  padded `'Cameo for Business '` department. **First cohort plugin
  to ship a wire department-name with trailing ASCII-space padding
  pass-through observability** — every prior plugin had either
  fully-clean department names or applied a `.trim()` upstream
  before this spec.
- **D-12 (run #275):** This plugin opens the **fourth fresh probe
  sweep** live-board pool processing. The remaining thirteen live
  hits from the run-275 probe sweep queue for runs #276+ in
  alphabetical order: `carta` (52 roles, run #276 next bite),
  `classpass` (70), `coursera` (8), `epicgames` (74), `flexport`
  (113), `fubotv` (11), `glossier` (17), `honeycomb` (10), `lattice`
  (11), `masterclass` (6), `mavenclinic` (24), `stitchfix` (22),
  `udemy` (17). Subsequent runs after the pool is exhausted (#289+
  by current arithmetic) will pivot to a **fifth fresh probe sweep**
  targeting yet-untested large-employer candidate slugs. HubSpot's
  thirteenth-consecutive empty re-probe at run-275 start
  (`meta.total === 0`) further confirms the documented "remains
  deferred" pattern.

## 11. References

- `packages/plugins/source-company-scaleai/src/scaleai.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 064 / run #274; same variant 2 + D-08 + D-09 omission + D-10
  omission as Cameo; Cameo deviates by introducing the D-11 partial-
  pad department pass-through).
- `packages/plugins/source-company-mixpanel/src/mixpanel.service.ts` —
  the prior cohort plugin with single-token bare-brand wire (Spec 062
  / run #272; same variant 2 + D-08 + D-09 omission as Cameo but
  applies D-10 instead of omitting it).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
