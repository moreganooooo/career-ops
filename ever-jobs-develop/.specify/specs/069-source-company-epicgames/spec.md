# Spec: 069 — Source Company Plugin: Epic Games

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 069                                                                                                                                                                                            |
| Slug           | source-company-epicgames                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #279)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..068                                                                                                                                                                        |

## 1. Problem Statement

Run #278's Spec 068 closed end-to-end (Coursera shipped — 8 unit tests
green; the **fourth** live hit alphabetically from the run-275
fourth-fresh-sweep candidate pool of 36 slugs) and explicitly queued
runs #279+ to take **Epic Games** next as the alphabetically-fifth
live hit from that pool (74 roles confirmed at run-275 probe time;
re-confirmed at run-279 start with 74 jobs returned by the HTTP
probe). Run #279 also re-probes the rolling `hubspot` candidate to
keep the documented "remains deferred" pattern fresh
(seventeenth-consecutive empty re-probe at run-279 start —
`meta.total === 0`).

Epic Games, Inc. — operator of the **dominant interactive-entertainment
publisher and engine vendor** (founded by Tim Sweeney in 1991 in Cary,
North Carolina, originally as Potomac Computer Systems / Epic
MegaGames; rebranded to Epic Games in 1999; currently a private
company majority-owned by Tencent and the Sweeney family; operating
with anchor offices in Cary, North Carolina (HQ), Montreal, Quebec,
Vancouver, British Columbia, Bellevue, Washington, Helsinki,
Stockholm, London, and Seoul; operator of **Fortnite** (the dominant
free-to-play battle-royale and metaverse platform with 500M+
registered users since the 2017 launch), **Unreal Engine** (the
industry-leading real-time 3D engine used across games, film/TV,
architecture, and automotive), the **Epic Games Store** (the
PC-game-distribution storefront launched in 2018 as a direct
challenger to Steam with a 88/12 revenue-share model), **Bandcamp**
(acquired in 2022, the music-distribution platform), **Cubic Motion**
(facial-animation tech), **3Lateral** (3D scanning), **Quixel**
(megascans library), and **Mediatonic** (Fall Guys studio); plus the
recurring Epic v. Apple antitrust litigation that culminated in the
2024 Ninth Circuit ruling on app-store competition) — is published at
the bare `epicgames` Greenhouse slug (the lowercase brand name with
the inter-word space collapsed to a single token) and was confirmed
live via run #279's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/epicgames/jobs?content=true`
(74 open roles confirmed at run-279 start). Notably, Epic Games's
tenant publishes its `absolute_url` on a **previously-unobserved
wire-shape variant** — the **vanity-domain shape**
`https://epicgames.com/careers/jobs/<id>?gh_jid=<id>` (bare
brand-domain `epicgames.com` rather than the `www.epicgames.com`
parent-domain or any `jobs.epicgames.com` subdomain; `careers/jobs`
path; single `gh_jid` query parameter — distinct from ClassPass's
variant-12 `www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
parent-domain shape and Elastic's variant-11 duplicate-`gh_jid`
shape). This is **wire-shape variant 13** — the **sixteenth distinct
wire-shape variant** in the company-direct cohort and the **second
vanity-domain variant** with a non-`jobs.<brand>.<tld>` host pattern.

Aggregator-callers asking for "all jobs at major
interactive-entertainment publishers / game engine vendors / metaverse
platforms" must currently either (a) deduce the Greenhouse slug
`epicgames` and call `source-ats-greenhouse` by hand, or (b)
post-filter the firehose of every Greenhouse-hosted role for a
company-name match — both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`epicgames` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses fifty-seven times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime, Elastic, Intercom, Mixpanel, Faire, Scale AI,
Cameo, Carta, ClassPass, Coursera).

## 2. Goals

- Ship a `source-company-epicgames` plugin returning live `JobPostDto`
  rows for the public Epic Games careers board with **no caller
  config required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-classpass` plugin (Greenhouse-backed, `category:
  'company'`, `Site.EPICGAMES` enum value, `id` prefixed `epicgames-`)
  — ClassPass is the closest structural cousin because both publish
  from Greenhouse public API on a **vanity-domain wire-shape variant**
  (ClassPass on variant 12; Epic Games on variant 13 — the two
  vanity-domain variants observed in the cohort to date), both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline (D-08), both
  apply D-10 wire-title `.trim()` against partly-padded wire titles,
  and both emit fully-clean wire `departments[0].name` byte-for-byte
  (D-11 fully-clean). Epic Games carries **one structural deviation**
  from the ClassPass template — **D-04 wire-shape variant 13** —
  the second vanity-domain variant in the cohort.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Epic Games.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'epicgames'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-classpass` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Epic Games's USD / CAD / GBP / EUR / SEK / KRW
  ranges.
- Backfilling historical Epic Games postings — only the open-roles
  slice the Greenhouse public API returns.
- Unreal Engine licensee directory or Fortnite Creative Mode partner
  directory integration — Epic Games's developer/creator surfaces
  are separate product surfaces from the careers board; licensee /
  creator data is out of scope for this plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.EPICGAMES`** in the
> source registry, so that **a single `siteType: [Site.EPICGAMES]`
> request returns Epic Games's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern with the
> entity-decode-then-tag-strip description pipeline AND a multi-token
> bare-brand `company_name` AND a wire-title `.trim()` deviation
> AND a fully-clean department pass-through AND a previously-unobserved
> vanity-domain wire-shape variant**, so that **adding the next
> Greenhouse-only employer publishing on a vanity-domain shape costs
> ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Epic Games**, so that **a Greenhouse outage
> on the Epic Games board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.EPICGAMES = 'epicgames'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-epicgames` under `packages/plugins/`.               | must     |
| FR-3  | `EpicgamesService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `epicgames-`, `site === Site.EPICGAMES`, and `companyName === 'Epic Games'` (wire `company_name` is the multi-token bare brand `'Epic Games'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/epicgames.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-13 vanity-domain shape `https://epicgames.com/careers/jobs/<id>?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse variant-2 form `https://job-boards.greenhouse.io/epicgames/jobs/<id>` rather than reconstructing the vanity-domain shape, because the fallback can only produce a guaranteed-resolvable URL using the Greenhouse subdomain (Spec 069 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — at least 2 of 74 wire titles in the run-279 probe carry trailing ASCII-space padding (`'Partnerships Director - Sports & Talent '`); the plugin applies `.trim()` to the wire `title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is emitted byte-for-byte without a `.trim()` (D-11) — 0 of 74 wire department names in the run-279 probe carry trailing ASCII-space padding; the pass-through preserves byte-fidelity to the wire shape. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[EpicgamesModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-epicgames/src/epicgames.service.ts
@SourcePlugin({ site: Site.EPICGAMES, name: 'Epic Games', category: 'company' })
@Injectable()
export class EpicgamesService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/epicgames/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `epicgames-${listing.id}`,
  site:         Site.EPICGAMES,
  title:        (listing.title ?? '').trim(),               // D-10 applied
  companyName:  listing.company_name ?? 'Epic Games',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/epicgames/jobs/${listing.id}`,
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

- **Unit (`__tests__/epicgames.service.spec.ts`):**
  1. NestJS DI resolves `EpicgamesService` through `EpicgamesModule`.
  2. `Site.EPICGAMES === 'epicgames'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-13
     `epicgames.com/careers/jobs/<id>?gh_jid=<id>` shape lock for the
     wire `absolute_url` pass-through, the decode-then-strip pipeline
     cleanliness, the multi-token bare-brand
     `companyName === 'Epic Games'` lock, the D-10 application —
     emitted `title` for the second listing equals the trimmed form
     `'Partnerships Director - Sports & Talent'` AND is byte-distinct
     from the wire-padded form, and the D-11 fully-clean department
     pass-through).
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

- **D-01 (run #279):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Epic Games's
  `https://www.epicgames.com/site/en-US/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board — the canonical
  machine-readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/epicgames/jobs` public endpoint. We
  already exercise the broader Greenhouse public-API pattern from
  fifty-seven prior company-direct plugins.
- **D-02 (run #279):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'epicgames'`.
- **D-03 (run #279):** No salary parser hook beyond the helpers
  defaults — Epic Games posts USD ranges from US offices, CAD from
  Montreal / Vancouver, GBP from London, EUR from Helsinki, SEK from
  Stockholm, and KRW from Seoul; Spec 014 / 015's parser already
  covers these locales without modification.
- **D-04 (run #279):** **Wire-shape variant 13 — vanity-domain
  bare-brand `epicgames.com/careers/jobs/<id>?gh_jid=<id>`.** Epic
  Games's tenant publishes its `absolute_url` on a previously-unobserved
  vanity-domain shape — confirmed via run #279's HTTP 200 probe of
  the live API where every wire job carries this shape (the first
  job's `absolute_url` is
  `https://epicgames.com/careers/jobs/5711341004?gh_jid=5711341004`).
  This is **wire-shape variant 13** — the **sixteenth distinct
  wire-shape variant** in the company-direct cohort and the **second
  vanity-domain variant** with a non-`jobs.<brand>.<tld>` host pattern
  (after ClassPass's variant-12 `www.playlist.com/careers/opportunities/<id>?gh_jid=<id>`
  parent-domain shape). Variant 13 is byte-distinct from variant 12
  on three axes: (a) bare brand-domain `epicgames.com` rather than
  `www.<parent>.com` (no `www.` subdomain prefix; no parent-domain
  redirect), (b) `careers/jobs` path rather than `careers/opportunities`,
  and (c) the path uses the brand's own root domain rather than a
  parent-company vanity-redirect chain. The plugin emits
  `listing.absolute_url` byte-for-byte to preserve the canonical
  destination. The **fallback** `jobUrl` constructor (when Greenhouse
  omits `absolute_url` — a defence-in-depth path Greenhouse has not
  exercised against this tenant in the audit window) defaults to the
  canonical Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/epicgames/jobs/<id>` rather than
  reconstructing the vanity-domain shape, because the fallback can
  only produce a guaranteed-resolvable URL using the Greenhouse
  subdomain (the same fallback strategy as ClassPass — Spec 067 § 10
  D-04). The unit-test happy path includes a regression guard
  asserting the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `epicgames.com/careers/jobs/` substring (locking the variant-13
  shape against future refactors that might naively normalise to the
  canonical Greenhouse subdomain).
- **D-05 (run #279):** Use Greenhouse slug `epicgames` (the lowercase
  brand name with the inter-word space collapsed to a single token).
  Rationale: like Coursera (Spec 068 § 10 D-05), ClassPass (Spec 067
  § 10 D-05), Carta (Spec 066 § 10 D-05), Cameo (Spec 065 § 10 D-05),
  Faire (Spec 063 § 10 D-05), Mixpanel (Spec 062 § 10 D-05), and the
  rest of the post-Klaviyo cohort, Epic Games's Greenhouse tenant is
  published at the bare slug `epicgames`. Slug/wire asymmetry: the
  wire `company_name` is the multi-token `'Epic Games'` (with internal
  space) byte-for-byte while the slug is `epicgames` (collapsed). The
  asymmetry is structurally analogous to Scale AI's slug/wire
  asymmetry where the wire `company_name === 'Scale AI'` (multi-token
  with internal space) and the slug is `scaleai` (collapsed).
  Confirmed via run #279's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/epicgames/jobs?content=true`
  (74 open roles confirmed at run-279 start).
- **D-06 (run #279):** Class names are `EpicgamesService` /
  `EpicgamesModule` (PascalCase from the lowercase slug — matches the
  convention `ScaleaiService` / `ScaleaiModule` use for slug-derived
  class names against the multi-token wire brand `'Scale AI'`).
  Rationale: the strict slug-derived PascalCase convention from
  ClassPass (`ClasspassService` against the brand's marketing form
  `ClassPass` with internal capital P) and Scale AI (`ScaleaiService`
  against the multi-token wire brand `'Scale AI'`) means that
  `epicgames` collapses to `Epicgames` in the TypeScript class name
  even though the brand's marketing form is `Epic Games`. The unit
  test asserts `companyName === 'Epic Games'` byte-for-byte to lock
  the wire-side multi-token form (D-09 omission lock).
- **D-07 (run #279):** Selected from the **fourth fresh probe sweep**
  live-board pool processing, alphabetically-fifth live-board hit
  (after `cameo` shipped at run #275, `carta` at run #276, `classpass`
  at run #277, and `coursera` at run #278). Run #275's probe sweep
  across 36 candidate slugs found exactly **fourteen** live boards on
  Greenhouse: `cameo` (3 jobs, run #275 shipped), `carta` (52, run
  #276 shipped), `classpass` (70, run #277 shipped), `coursera` (8,
  run #278 shipped), `epicgames` (74, run #279 next bite — this
  spec), `flexport` (113), `fubotv` (11), `glossier` (17), `honeycomb`
  (10), `lattice` (11), `masterclass` (6), `mavenclinic` (24),
  `stitchfix` (22), `udemy` (17). `epicgames` is alphabetically
  fifth after `cameo`, `carta`, `classpass`, and `coursera`, so this
  run takes Epic Games. The remaining nine live hits queue for runs
  #280+ in alphabetical order (`flexport` next at run #280 with 113
  roles). HubSpot's seventeenth-consecutive empty re-probe at
  run-279 start (`meta.total === 0`) further confirms the documented
  "remains deferred" pattern.
- **D-08 (run #279):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Coursera (Spec 068 § 10 D-08),
  ClassPass (Spec 067 § 10 D-08), Carta (Spec 066 § 10 D-08), Cameo
  (Spec 065 § 10 D-08), Scale AI (Spec 064 § 10 D-08), and the rest
  of the post-Klaviyo cohort, Epic Games's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;&lt;h2&gt;WHAT MAKES US EPIC?&lt;/h2&gt;...`)
  rather than raw HTML tags — confirmed via run #279's HTTP probe of
  the live API (every wire job carries HTML entities including
  `&lt;`, `&gt;`, `&quot;`, and `&amp;`; none carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would leave
  the literal entities in place. Decoding entities **first** and
  then stripping tags yields clean readable text. The pipeline is
  order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b)
  does not contain `&quot;` (named entities decoded), (c) does not
  contain `&amp;`, and (d) does not contain `<p>`, `<div>`,
  `<strong>`, or `<h2>` (tags stripped after the decode pass), so a
  future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the
  **twenty-fifth** company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #279):** Brand-name trim D-09 is **omitted**. Rationale:
  Epic Games's wire `company_name` is `'Epic Games'` byte-for-byte
  (the multi-token bare brand name with internal whitespace; no
  legal-entity suffix on the wire — confirmed via run-279 probe where
  every wire job carries `company_name === 'Epic Games'`, distinct
  from the legal-entity name "Epic Games, Inc." that appears in
  current SEC filings and the prior "Epic MegaGames, Inc." legal
  name from before the 1999 rebrand). The plugin reads
  `listing.company_name` directly without a string-literal pin, but
  the unit-test happy path asserts the emitted
  `companyName === 'Epic Games'` byte-for-byte (multi-token
  preserved) to lock the observable shape against a future tenant
  rename to add a legal-entity suffix; if such a rename happens, a
  follow-up patch can re-introduce D-09 as a one-line edit.
  **Nineteenth cohort plugin to omit D-09**, returning to the
  bare-brand wire form — but the **second** cohort plugin to ship
  with a multi-token bare-brand wire `company_name` (after Scale AI
  `'Scale AI'`). Distinct from the trim-applied cohort: Affirm,
  Gusto, ZoomInfo, and Chime.
- **D-10 (run #279):** Wire-title `.trim()` deviation is **applied**.
  Rationale: at least 2 of 74 wire titles in the run-279 probe carry
  trailing ASCII-space padding (`'Partnerships Director - Sports &
  Talent '` — twice, on two distinct listing IDs targeting the
  Cary, North Carolina office; ~2.7 % pad rate — confirmed via the
  curl probe). The plugin applies `.trim()` to the wire `title`
  before downstream filters and emit. The unit-test happy path
  asserts the emitted `title` for the second listing equals the
  trimmed form `'Partnerships Director - Sports & Talent'` AND is
  byte-distinct from the wire-padded form — locking the D-10
  application against a future refactor that drops the `.trim()`.
  **Eleventh cohort plugin to apply D-10** (after Brex, Buildkite,
  ZoomInfo, Attentive, Elastic, Intercom, Mixpanel, Faire, Carta,
  and ClassPass).
- **D-11 (run #279):** The Epic Games wire `departments[0].name`
  payload uses **fully-clean multi-token department names** like
  `'Art'`, `'Data Science'`, `'General Design'`, `'Sales/Licensing'`,
  `'Counsel'`, `'Product Support'`, `'Production'`, `'Product Mgmt'`,
  `'Engineering Specialist'`, `'Partnerships'` — similar to
  Coursera's all-trim-clean pure descriptive format and distinct from
  Cameo's partial-pad pass-through. Specifically 0 of the 74 wire
  department names in the run-279 probe carry trailing ASCII-space
  padding (0 % pad-rate). The plugin emits the wire
  `departments[0].name` byte-for-byte (no department-name `.trim()`
  needed because no wire-side padding was observed; the
  case-insensitive `searchTerm.toLowerCase().includes(...)` filter
  remains semantically correct against the clean wire form). The
  unit-test happy path includes (a) a regression guard asserting the
  emitted `department` for the first fixture listing matches the
  wire `departments[0].name === 'Art'` byte-for-byte (clean
  single-token form), and (b) a regression guard asserting the
  emitted `department` for the second fixture listing matches the
  wire `departments[0].name === 'Partnerships'` byte-for-byte (clean
  single-token form).
- **D-12 (run #279):** This plugin is the **fifth** in the
  fourth-fresh-sweep live-board pool processing (after Cameo at run
  #275, Carta at run #276, ClassPass at run #277, and Coursera at
  run #278). The remaining nine live hits from the run-275 probe
  sweep queue for runs #280+ in alphabetical order: `flexport` (113
  roles, run #280 next bite), `fubotv` (11), `glossier` (17),
  `honeycomb` (10), `lattice` (11), `masterclass` (6), `mavenclinic`
  (24), `stitchfix` (22), `udemy` (17). Subsequent runs after the
  pool is exhausted (#288+ by current arithmetic) will pivot to a
  **fifth fresh probe sweep** targeting yet-untested large-employer
  candidate slugs. HubSpot's seventeenth-consecutive empty re-probe
  at run-279 start (`meta.total === 0`) further confirms the
  documented "remains deferred" pattern.

## 11. References

- `packages/plugins/source-company-classpass/src/classpass.service.ts`
  — closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 067 / run #277; same D-08 entity-decode-then-tag-strip,
  D-09 omitted, D-10 applied, D-11 fully-clean as Epic Games; one
  structural deviation — D-04 wire-shape variant 13 instead of
  variant 12).
- `packages/plugins/source-company-coursera/src/coursera.service.ts`
  — prior cohort plugin with D-11 fully-clean (Spec 068 / run #278;
  Coursera shares D-08, D-09 omitted, D-11 fully-clean with Epic
  Games but uses variant 2 + D-10 omitted, distinct from Epic
  Games's variant 13 + D-10 applied).
- `packages/plugins/source-company-scaleai/src/scaleai.service.ts`
  — prior cohort plugin with multi-token bare-brand wire
  `company_name` (Spec 064 / run #274; Scale AI was the first cohort
  plugin to ship a multi-token bare-brand wire `company_name === 'Scale AI'`;
  Epic Games is the second — `'Epic Games'`).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
