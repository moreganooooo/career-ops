# Spec: 053 — Source Company Plugin: Netlify

| Field          | Value                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 053                                                                                                                                                                         |
| Slug           | source-company-netlify                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                    |
| Owner          | claude (run #263)                                                                                                                                                           |
| Created        | 2026-05-02                                                                                                                                                                  |
| Last updated   | 2026-05-02                                                                                                                                                                  |
| Supersedes     | (none)                                                                                                                                                                      |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052 |

## 1. Problem Statement

Run #262's Spec 052 closed the gap that the company-direct catalogue had no
entry for the dominant **Web3 fiat-to-crypto onramp toolkit** vendor (Ramp
Network) and pivoted the cohort to the **sixth** distinct wire-shape variant
(EU-region permalink subdomain `job-boards.eu.greenhouse.io`). The catalogue
still has no entry for the dominant **edge-deployed Jamstack hosting and
serverless-functions** vendor — Netlify (Netlify, Inc.; founded by Mathias
Biilmann and Christian Bach in 2014 in San Francisco as the original Jamstack
edge-deploy platform; operator of the Netlify Edge Network (the global edge
CDN serving Jamstack sites with sub-second deploys), Netlify Functions (the
serverless-functions runtime), Netlify Edge Functions (the V8-isolate
edge-runtime layer), Netlify Forms (the form-handling backend), Netlify
Identity (the auth product), Netlify Build (the CI/CD pipeline that runs
every Git push), Netlify Drawer / Netlify CMS (the open-source headless-CMS
project), and Netlify Connect (the data-layer-aggregation product)) lines
that anchor the Jamstack-and-edge-hosting category alongside Vercel,
Cloudflare Pages, Render, Fly.io, and Heroku. Its multi-hundred-employee
engineering, product, marketing, sales, and ecosystem hiring across the
United States / Europe / APAC remote-first hubs (with a Remote-first
engineering posture) puts its corporate openings on the same "marquee
company-direct" tier as Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox,
Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, and Ramp Network. Aggregator-callers asking for "all jobs at major
edge-hosting / Jamstack-PaaS vendors" must currently either (a) deduce the
Greenhouse slug `netlify` and call `source-ats-greenhouse` by hand, or (b)
post-filter the firehose of every Greenhouse-hosted role for a company-name
match. Both paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for analytics,
dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`netlify` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-one times (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid,
Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network).

## 2. Goals

- Ship a `source-company-netlify` plugin returning live `JobPostDto` rows
  for the public Netlify careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-buildkite` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.NETLIFY` enum value, `id` prefixed `netlify-`) — Buildkite is the
  closest structural cousin because both publish through the new
  `job-boards.greenhouse.io` permalink subdomain family (variant 2) AND emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline. Netlify introduces
  zero new structural deviations — it is the **sixth** plugin in the cohort
  to use variant 2 (the US-region permalink subdomain
  `job-boards.greenhouse.io`), the **ninth** plugin to use the
  entity-decode-then-tag-strip description pipeline, and follows the
  Buildkite / Mercury / CircleCI / Ramp Network template for brand-name
  pinning (single-word brand `Netlify` matches the wire `company_name`
  byte-for-byte).
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Netlify.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'netlify'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-buildkite` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Netlify's USD / EUR / GBP listings (United States /
  Europe / APAC remote-first hubs) without modification.
- Backfilling historical Netlify postings — only the open-roles slice
  the Greenhouse public API returns.
- Department-name-with-ampersand normalisation — Netlify's tenant emits
  department names like `'R&D'` and `'G&A'` with literal ASCII ampersands
  in the wire payload; the plugin pins them byte-for-byte (D-11). A future
  spec can introduce a per-source department-name-cleanup pass if needed.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.NETLIFY`** in the source
> registry, so that **a single `siteType: [Site.NETLIFY]` request returns
> Netlify's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io` permalink-subdomain family (variant 2) with
> the entity-decode-then-tag-strip description pipeline**, so that **adding
> the next Greenhouse-only employer that publishes its `absolute_url` on
> the US-region subdomain costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Netlify**, so that **a Greenhouse outage on the Netlify
> board does not trip the breaker for every other Greenhouse tenant**
> the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.NETLIFY = 'netlify'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-netlify` under `packages/plugins/`.                 | must     |
| FR-3  | `NetlifyService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `netlify-`, `site === Site.NETLIFY`, and `companyName === 'Netlify'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/netlify.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region** permalink-subdomain shape `https://job-boards.greenhouse.io/netlify/jobs/<id>` — variant 2 (the sixth plugin in the cohort to use this shape, after Vercel, Affirm, Gusto, Mercury, and Buildkite; Spec 053 § 10 D-04). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[NetlifyModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-netlify/src/netlify.service.ts
@SourcePlugin({ site: Site.NETLIFY, name: 'Netlify', category: 'company' })
@Injectable()
export class NetlifyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/netlify/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `netlify-${listing.id}`,
  site:         Site.NETLIFY,
  title:        listing.title ?? '',
  companyName:  'Netlify',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/netlify/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/netlify.service.spec.ts`):**
  1. NestJS DI resolves `NetlifyService` through `NetlifyModule`.
  2. `Site.NETLIFY === 'netlify'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-insensitive,
     including the literal-ampersand `R&D` department to lock the
     ampersand-pass-through guard against future refactors).
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

- **D-01 (run #263):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Netlify's
  `https://job-boards.greenhouse.io/netlify/jobs/<id>` US-region
  permalink-subdomain URL is the Greenhouse-canonical detail-page proxy on
  the wire (variant 2 family) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise the
  exact same wire format from `source-company-rampnetwork`,
  `source-company-circleci`, `source-company-buildkite`,
  `source-company-mercury`, `source-company-gusto`,
  `source-company-brex`, `source-company-duolingo`,
  `source-company-klaviyo`, `source-company-affirm`,
  `source-company-vercel`, `source-company-block`, `source-company-roblox`,
  `source-company-dropbox`, `source-company-instacart`,
  `source-company-datadog`, `source-company-mongodb`,
  `source-company-cloudflare`, `source-company-twilio`,
  `source-company-twitch`, `source-company-gitlab`, `source-company-figma`,
  `source-company-asana`, `source-company-plaid`, `source-company-lyft`,
  `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #263):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'netlify'`.
- **D-03 (run #263):** No salary parser hook beyond the helpers defaults
  — Netlify posts USD / EUR / GBP ranges (United States / Europe / APAC
  remote-first hubs) inside the Greenhouse `content` field; Spec 014 /
  015's parser already covers the relevant currencies without
  modification; no Spec 053-specific salary logic.
- **D-04 (run #263):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink-subdomain** template
  `https://job-boards.greenhouse.io/netlify/jobs/<id>` — variant 2.
  Rationale: Netlify's tenant publishes its `absolute_url` on the
  US-region Greenhouse permalink subdomain `job-boards.greenhouse.io`
  (the same subdomain Vercel, Affirm, Gusto, Mercury, and Buildkite use)
  rather than the EU-region `job-boards.eu.greenhouse.io` Ramp Network
  introduced in Spec 052 — confirmed via run #263's HTTP 200 probe of the
  live API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/netlify/jobs/8441719002`. This is the
  **sixth** plugin in the cohort to use variant 2 (after Vercel,
  Affirm, Gusto, Mercury, and Buildkite). Functional impact is zero
  because Greenhouse populates `absolute_url` on every Netlify listing in
  practice (the fallback is a defence-in-depth path Greenhouse has not
  actually exercised against this tenant in the audit window). The
  unit-test happy path includes a regression guard asserting the wire
  `absolute_url` flows through to `jobUrl` byte-for-byte AND that the
  emitted `jobUrl` contains the literal `job-boards.greenhouse.io`
  substring (locking the US-region subdomain against future refactors
  that might naively normalise to the EU-region subdomain).
- **D-05 (run #263):** Use Greenhouse slug `netlify` (the lowercase
  brand name). Rationale: like Ramp Network (Spec 052 § 10 D-05),
  CircleCI (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury
  (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10
  D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05),
  Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec
  042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10
  D-05), Instacart (Spec 039 § 10 D-05), and unlike Robinhood (Spec 026 §
  10 D-05), Netlify's Greenhouse tenant is published at the slug
  `netlify` with no slug-vs-display-name asymmetry. Confirmed via run
  #263's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/netlify/jobs?content=true`.
- **D-06 (run #263):** Class names are `NetlifyService` /
  `NetlifyModule` (PascalCase splitting on the single-word brand name).
  Rationale: matches the convention Netlify's own marketing / GitHub /
  Crunchbase pages use for class-style references to the brand
  (`Netlify`), and aligns with the existing repo PascalCase convention
  for single-word brands (e.g. `BuildkiteService`, `CircleCIService`,
  `MercuryService`).
- **D-07 (run #263):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `rampnetwork` shipped run #262; `hubspot`,
  `netlify`, `postman`, `toast`, `webflow`, `zoominfo` remained queued).
  HubSpot — alphabetically next at `hub` per the Spec 051 close-out note
  — was last re-probed at run-262 start and returned an empty `jobs[]`
  array (`{"jobs":[],"meta":{"total":0}}` on HTTP 200), making it not
  viable for a useful happy-path unit test against a real-world fixture
  today. HubSpot is therefore deferred to a future run when its board
  has open roles again, and Netlify is selected as the
  alphabetically-next remaining live bite (`net` < `pos` < `toa` < `web`
  < `zoo`). Netlify was specifically queued as the next-up candidate
  in Spec 052's run #262 close-out note. The remaining candidates queue
  up for runs #264+: Postman (variant 2, 115 jobs), Toast (variant 8 —
  careers-subdomain on a sub-brand `toasttab.com`, 332 jobs — notable
  structural deviation), Webflow (variant 2, 31 jobs), ZoomInfo (variant
  3 family — apex-www `careers?gh_jid=<id>`, 82 jobs, with a wire
  `company_name` `'ZoomInfo Technologies LLC'` legal-entity suffix to
  clean — first since Affirm / Gusto), HubSpot re-probe, plus a fresh
  probe sweep pivot if all pre-probed candidates ship.
- **D-08 (run #263):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec 051
  § 10 D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10
  D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo
  (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08), Netlify's
  tenant emits HTML-entity-encoded content (`&lt;p&gt;...`) rather than
  raw HTML tags (`<p>...`) — confirmed via run #263's HTTP probe of the
  live API where the first job's `content` starts with
  `&lt;p&gt;&lt;strong&gt;About the Team:&lt;/strong&gt;&lt;/p&gt;`.
  Applying `stripHtmlTags()` alone to that wire payload would leave the
  literal entities in place (because they are not actual `<…>` tags),
  producing user-facing descriptions full of `&lt;strong&gt;` and
  `&quot;` substrings. Decoding entities **first** (turning
  `&lt;strong&gt;` into `<strong>` and `&quot;` into `"`) and then
  stripping tags (turning `<strong>About the Team:</strong>` into `About
  the Team:`) yields clean readable text. The pipeline is order-
  sensitive — `decodeHtmlEntities()` must run before `stripHtmlTags()`.
  The unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), (c) does not contain `&#39;` (numeric
  entities decoded), and (d) does not contain `<p>` or `<strong>` (tags
  stripped after the decode pass), so a future refactor that swaps the
  order or drops one half of the pipeline would surface as a test diff.
  This is the **ninth** company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline (the first eight being Klaviyo,
  Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, and Ramp
  Network). Notably, the Netlify wire payload also includes the
  named entity `&amp;nbsp;` (which decodes to a non-breaking space
  ` ` U+00A0) — a different named entity than CircleCI's
  `&amp;rsquo;` or Buildkite's `&amp;rsquo;`/`&amp;#39;` mix; the
  unit-test happy path includes a regression guard asserting the
  cleaned description does not contain `&nbsp;` (named-entity decode
  ran on the non-breaking-space entity).
- **D-09 (run #263):** Emit the wire `company_name` `'Netlify'`
  directly (no brand-name trim required). Rationale: Netlify's wire
  `company_name` is the bare brand name `'Netlify'` — confirmed via run
  #263's HTTP probe of the live API where the returned job has
  `company_name === "Netlify"` (no `, Inc.` suffix, no `Netlify Inc.`
  legal-entity suffix). This matches Ramp Network (Spec 052 § 10 D-09),
  CircleCI (Spec 051 § 10 D-09), Buildkite (Spec 050 § 10 D-09), and
  Mercury (Spec 049 § 10 D-09) — all five pin the brand name byte-for-
  byte against the wire — and contrasts with Gusto (Spec 048 § 10 D-09)
  and Affirm (Spec 044 § 10 D-06), both of which emit a wire
  `company_name` with a legal-entity suffix that needed cleaning to the
  brand name. The plugin pins `companyName === 'Netlify'` as a string
  literal in the `JobPostDto` mapping (rather than reading
  `listing.company_name`) for byte-stable consistency with the other
  forty-one company-direct plugins — every prior company-direct plugin
  uses a string literal for `companyName`, and Netlify follows the same
  convention. The unit-test happy path asserts the emitted `companyName
  === 'Netlify'` to lock the brand-name pin against future refactors
  that might mistakenly read the wire payload.
- **D-10 (run #263):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, Netlify's tenant emits clean trimmed titles in every
  observed listing — confirmed via run #263's HTTP probe of the live
  API where the returned jobs have titles with no leading or trailing
  whitespace (e.g. `'Senior UX Engineer (Marketing)'`, `'Your Chance to
  Join Our Talent Community!'`). Skipping the trim is consistent with
  the CircleCI / Mercury / Gusto / Klaviyo / Ramp Network template (37
  of 41 prior cohort plugins skip the trim; only Brex and Buildkite
  apply it).
- **D-11 (run #263):** Department-name pass-through preserves literal
  ASCII ampersands. Rationale: Netlify's tenant publishes department
  names like `'R&D'` (Research & Development) and `'G&A'` (General &
  Administrative) with literal ASCII ampersands in the wire payload —
  confirmed via run #263's HTTP probe of the live API where the first
  job has `departments[0].name === "R&D"` and the second job has
  `departments[0].name === "G&A"`. Unlike Twilio (whose dept names are
  cleanly word-form like `'Engineering'`) and unlike Cloudflare /
  Buildkite (whose dept names are also word-form), Netlify is the
  **first** plugin in the cohort to ship a fixture where a department
  name contains a literal `&` character. The plugin pins the
  ampersand-bearing dept names byte-for-byte (no entity-encoding pass
  on department names — only on the `content` description field per
  D-08), since the dept name is consumer-facing UI text not an HTML-
  encoded payload. The unit-test happy path includes a regression guard
  asserting (a) `dto.jobs[0].department === 'R&D'` (literal ampersand
  preserved byte-for-byte) and (b) the case-insensitive `searchTerm`
  filter on `'r&d'` correctly matches the `'R&D'` department (locks the
  ampersand-pass-through against future refactors that might naively
  decode or strip ampersand characters from department names). This is
  the **first** plugin in the cohort to ship a fixture with an
  ampersand-bearing department name.

## 11. References

- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 050 / run #260; uses the new `job-boards.greenhouse.io`
  permalink subdomain — variant 2 — with the entity-decode pipeline).
- `packages/plugins/source-company-rampnetwork/src/rampnetwork.service.ts` —
  the prior company-direct plugin (Spec 052 / run #262; uses the
  EU-region permalink subdomain — variant 6 — with the entity-decode
  pipeline; the run-262 close-out flagged Netlify as the next-up
  candidate).
- `packages/plugins/source-company-mercury/src/mercury.service.ts` —
  the prior fintech-cohort plugin (Spec 049 / run #259; uses variant 2
  with the entity-decode pipeline; structurally identical except for
  the brand-name pin and ampersand-bearing dept names).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
