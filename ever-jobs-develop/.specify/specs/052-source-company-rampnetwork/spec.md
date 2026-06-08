# Spec: 052 — Source Company Plugin: Ramp Network

| Field          | Value                                                                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 052                                                                                                                                                                    |
| Slug           | source-company-rampnetwork                                                                                                                                             |
| Status         | accepted                                                                                                                                                               |
| Owner          | claude (run #262)                                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051 |

## 1. Problem Statement

Run #261's Spec 051 closed the gap that the company-direct catalogue had no
entry for the original **continuous-integration-as-a-service / hosted-Docker-CI**
vendor (Circle Internet Services, Inc.). The catalogue still has no entry for
the dominant **Web3 fiat-to-crypto onramp toolkit** vendor — Ramp Network (Ramp
Swaps Ltd; founded by Szymon Sypniewicz and Przemek Kowalczyk in 2017 in
London / Warsaw as a unified fiat-to-crypto checkout layer for Web3 wallets,
exchanges, and dApps; operator of the Ramp Network on-ramp (the fiat-to-crypto
purchase widget integrated by hundreds of crypto wallets and dApps), the Ramp
Network off-ramp (the crypto-to-fiat sell widget), the Ramp Network B2B SDK
(the embeddable SDK distributed to wallet partners), the Ramp Pay-Outs API
(the bank-rail payouts product for crypto businesses), and the Ramp Network
Compliance & KYC stack (the AML / KYC / fraud-prevention layer that wraps
every transaction) lines that anchor the EU-and-UK-regulated Web3 onramp
category alongside MoonPay, Transak, Mercuryo, Onramper, and Wyre. Its
multi-hundred-employee finance, engineering, compliance, and partnerships
hiring across the United Kingdom / Poland / Ireland / Switzerland hubs (with
a Poland-Remote-first engineering posture) puts its corporate openings on
the same "marquee company-direct" tier as Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid,
Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex,
Gusto, Mercury, Buildkite, and CircleCI. Aggregator-callers asking for
"all jobs at major Web3 / crypto-fintech vendors" must currently either
(a) deduce the Greenhouse slug `rampnetwork` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted role for
a company-name match. Both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind (Spec
005), and both lose the `Site.<KEY>` enum entry that aggregator-side code
branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`rampnetwork` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty times (Amazon, Apple, Cursor,
Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase,
DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma,
Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury,
Buildkite, CircleCI).

## 2. Goals

- Ship a `source-company-rampnetwork` plugin returning live `JobPostDto` rows
  for the public Ramp Network careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-buildkite` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.RAMPNETWORK` enum value, `id` prefixed `rampnetwork-`) — Buildkite is
  the closest structural cousin because both publish through the new
  `job-boards.greenhouse.io` permalink subdomain family AND emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline. Ramp Network introduces
  one new structural deviation isolated to the fallback URL shape — the
  **sixth distinct wire-shape variant** in the cohort — because Ramp Network's
  tenant publishes its `absolute_url` on the **EU-region permalink subdomain**
  `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>`, distinct from
  the US-region `job-boards.greenhouse.io` Buildkite / Mercury / Gusto /
  Affirm / Vercel use. Ramp Network is the **first plugin in the cohort**
  to use the EU-region subdomain.
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Ramp Network.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'rampnetwork'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-buildkite` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Ramp Network's GBP / EUR / PLN / CHF listings (United
  Kingdom / Poland / Ireland / Switzerland hubs) without modification.
- Backfilling historical Ramp Network postings — only the open-roles slice
  the Greenhouse public API returns.
- Region-routing by EU-vs-US subdomain — Ramp Network's tenant always
  publishes `absolute_url` on the EU-region subdomain regardless of the
  caller's region; the plugin pins the wire shape byte-for-byte (D-04). A
  future spec can introduce a per-source URL-region-normalisation pass if
  needed.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.RAMPNETWORK`** in the source
> registry, so that **a single `siteType: [Site.RAMPNETWORK]` request returns
> Ramp Network's open roles without my code knowing the underlying ATS slug
> or the EU-region subdomain**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io` permalink-subdomain family with an EU-region
> deviation (variant 6)**, so that **adding the next Greenhouse-only employer
> that publishes its `absolute_url` on the EU-region subdomain costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Ramp Network**, so that **a Greenhouse outage on the Ramp
> Network board does not trip the breaker for every other Greenhouse tenant**
> the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.RAMPNETWORK = 'rampnetwork'` to `packages/models/src/enums/site.enum.ts`.               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-rampnetwork` under `packages/plugins/`.             | must     |
| FR-3  | `RampNetworkService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `rampnetwork-`, `site === Site.RAMPNETWORK`, and `companyName === 'Ramp Network'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/rampnetwork.service.spec.ts`, all using mocked HTTP.   | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **EU-region** permalink-subdomain shape `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>` — the sixth wire-shape variant in the cohort and the first plugin to use the EU-region subdomain (Spec 052 § 10 D-04). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[RampNetworkModule]})` resolves. |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-rampnetwork/src/rampnetwork.service.ts
@SourcePlugin({ site: Site.RAMPNETWORK, name: 'Ramp Network', category: 'company' })
@Injectable()
export class RampNetworkService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/rampnetwork/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `rampnetwork-${listing.id}`,
  site:         Site.RAMPNETWORK,
  title:        listing.title ?? '',
  companyName:  'Ramp Network',
  jobUrl:       listing.absolute_url ?? `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/${listing.id}`,
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

- **Unit (`__tests__/rampnetwork.service.spec.ts`):**
  1. NestJS DI resolves `RampNetworkService` through `RampNetworkModule`.
  2. `Site.RAMPNETWORK === 'rampnetwork'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
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

- **D-01 (run #262):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Ramp Network's
  `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>` EU-region
  permalink-subdomain URL is the Greenhouse-canonical detail-page proxy on
  the wire (variant 6 family, the **sixth** distinct wire-shape variant
  observed across the cohort) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise the
  exact same wire format from `source-company-circleci`,
  `source-company-buildkite`, `source-company-mercury`,
  `source-company-gusto`, `source-company-brex`, `source-company-duolingo`,
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
- **D-02 (run #262):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'rampnetwork'`.
- **D-03 (run #262):** No salary parser hook beyond the helpers defaults
  — Ramp Network posts GBP / EUR / PLN / CHF ranges (United Kingdom /
  Poland / Ireland / Switzerland hubs) inside the Greenhouse `content`
  field; Spec 014 / 015's parser already covers the relevant currencies
  without modification; no Spec 052-specific salary logic.
- **D-04 (run #262):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **EU-region permalink-subdomain** template
  `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>`. Rationale:
  Ramp Network's tenant publishes its `absolute_url` on the EU-region
  Greenhouse permalink subdomain `job-boards.eu.greenhouse.io` rather
  than the US-region default `job-boards.greenhouse.io` — confirmed via
  run #262's HTTP 200 probe of the live API where the first job's
  `absolute_url` is
  `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/4830509101`. This
  is the **sixth** distinct wire-shape variant observed across the
  cohort: (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` — used by 31
  plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel, Affirm,
  Gusto, Mercury, and Buildkite; (3) marketing-site
  `<company>.com/careers/jobs?gh_jid=<id>` — used by Klaviyo (apex
  domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query); (6) **THIS SPEC** —
  `https://job-boards.eu.greenhouse.io/<slug>/jobs/<id>` — EU-region
  permalink subdomain, structurally identical to variant 2 except for
  the `.eu` region prefix on the subdomain; (7)
  `http://www.<company>.com/careers/jobs/<id>/?gh_jid=<id>` — apex-www
  marketing-site, HTTP scheme, path-with-trailing-slash-AND-query —
  used by CircleCI. The fallback uses the wire-shape
  `https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>` exactly for
  byte-equivalence with the wire `absolute_url`. Functional impact is
  zero because Greenhouse populates `absolute_url` on every Ramp Network
  listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). **Ramp Network is the first plugin in the cohort to
  publish its `absolute_url` on the EU-region permalink subdomain** —
  every prior plugin (40 Greenhouse-backed company-direct plugins) uses
  the US-region subdomain or one of the marketing-site variants. The
  unit-test happy path includes a regression guard asserting the wire
  `absolute_url` flows through to `jobUrl` byte-for-byte AND that the
  emitted `jobUrl` contains the literal `job-boards.eu.greenhouse.io`
  substring (locking the EU-region subdomain against future refactors
  that might naively normalise to the US-region subdomain).
- **D-05 (run #262):** Use Greenhouse slug `rampnetwork` (the lowercase,
  whitespace-collapsed brand name). Rationale: like CircleCI (Spec 051 §
  10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049 § 10 D-05),
  Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec
  046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044 § 10
  D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05), Roblox
  (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart (Spec
  039 § 10 D-05), and unlike Robinhood (Spec 026 § 10 D-05), Ramp
  Network's Greenhouse tenant is published at the slug `rampnetwork`
  with no slug-vs-display-name asymmetry beyond the standard
  whitespace-collapse: the wire `company_name` is the two-word
  `'Ramp Network'` and the Greenhouse slug is the one-word lowercase
  `rampnetwork` (Greenhouse strips the inter-word space — common
  convention for multi-word brand-name slugs). Confirmed via run
  #262's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/rampnetwork/jobs?content=true`.
- **D-06 (run #262):** Class names are `RampNetworkService` /
  `RampNetworkModule` (PascalCase splitting on the multi-word brand
  name). Rationale: matches the convention Ramp Network's own marketing
  / GitHub / Crunchbase pages use for class-style references to the
  brand (`RampNetwork`, not `Rampnetwork`), and aligns with the existing
  repo PascalCase convention for multi-word brands. The slug is
  unaffected (still `rampnetwork`, the lowercase whitespace-collapsed
  form Greenhouse uses).
- **D-07 (run #262):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `hubspot`, `netlify`, `postman`, `rampnetwork`,
  `toast`, `webflow`, `zoominfo` remained queued). HubSpot —
  alphabetically next at `hub` per the Spec 051 close-out note — was
  re-probed live at run-262 start and returned an empty `jobs[]` array
  (`{"jobs":[],"meta":{"total":0}}` on HTTP 200), making it not viable
  for a useful happy-path unit test against a real-world fixture today.
  HubSpot is therefore deferred to a future run when its board has open
  roles again, and Ramp Network is selected as the alphabetically-next
  remaining live bite (`net` < `pos` < `ram` < `toa` < `web` < `zoo`,
  with Netlify only having two open roles vs Ramp Network's variant-6
  structural novelty preference noted in run #259, #260, and #261's
  close-outs). Ramp Network was specifically queued for a future run as
  the variant-6 EU-region pivot in run #259's Spec 049 close-out — this
  spec executes that pivot. The remaining candidates queue up for runs
  #263+: Netlify (variant 2, 2 jobs), Postman (variant 2, 115 jobs),
  Toast (variant 8 — careers-subdomain on a sub-brand `toasttab.com`,
  332 jobs — notable structural deviation), Webflow (variant 2, 31
  jobs), ZoomInfo (variant 3 family — apex-www `careers?gh_jid=<id>`,
  82 jobs, with a wire `company_name` `'ZoomInfo Technologies LLC'`
  legal-entity suffix to clean — first since Affirm / Gusto), HubSpot
  re-probe, plus a fresh probe sweep pivot if all pre-probed candidates
  ship.
- **D-08 (run #262):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like CircleCI (Spec 051 § 10 D-08), Buildkite (Spec 050 §
  10 D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10 D-08),
  Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and Klaviyo
  (Spec 045 § 10 D-08), Ramp Network's tenant emits HTML-entity-encoded
  content (`&lt;p&gt;...`) rather than raw HTML tags (`<p>...`) —
  confirmed via run #262's HTTP probe of the live API where the first
  job's `content` starts with `&lt;div class=&quot;content-intro&quot;&gt;
  &lt;h2&gt;&lt;strong&gt;Join the Web3 revolution at Ramp Network!
  &lt;/strong&gt;&lt;/h2&gt;`. Applying `stripHtmlTags()` alone to that
  wire payload would leave the literal entities in place (because they
  are not actual `<…>` tags), producing user-facing descriptions full
  of `&lt;h3&gt;` and `&quot;` substrings. Decoding entities **first**
  (turning `&lt;h3&gt;` into `<h3>` and `&quot;` into `"`) and then
  stripping tags (turning `<h3>About the Role</h3>` into `About the
  Role`) yields clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), and (c) does not contain `<p>` or `<h3>`
  (tags stripped after the decode pass), so a future refactor that
  swaps the order or drops one half of the pipeline would surface as a
  test diff. This is the **eighth** company-direct plugin in the cohort
  to use the entity-decode-then-tag-strip pipeline (the first seven
  being Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, and
  CircleCI). Notably, this is the **first** plugin in the cohort to
  combine the EU-region subdomain shape (variant 6) with the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #262):** Emit the wire `company_name` `'Ramp Network'`
  directly (no brand-name trim required). Rationale: Ramp Network's
  wire `company_name` is the two-word brand name `'Ramp Network'` —
  confirmed via run #262's HTTP probe of the live API where the
  returned job has `company_name === "Ramp Network"` (no `, Ltd.`
  suffix, no `Ramp Swaps Limited` legal-entity suffix). This matches
  CircleCI (Spec 051 § 10 D-09), Buildkite (Spec 050 § 10 D-09), and
  Mercury (Spec 049 § 10 D-09) — all four pin the brand name
  byte-for-byte against the wire — and contrasts with Gusto (Spec 048 §
  10 D-09) and Affirm (Spec 044 § 10 D-06), both of which emit a wire
  `company_name` with a legal-entity suffix that needed cleaning to the
  brand name. The plugin pins `companyName === 'Ramp Network'` as a
  string literal in the `JobPostDto` mapping (rather than reading
  `listing.company_name`) for byte-stable consistency with the other
  forty company-direct plugins — every prior company-direct plugin
  uses a string literal for `companyName`, and Ramp Network follows the
  same convention. The unit-test happy path asserts the emitted
  `companyName === 'Ramp Network'` to lock the brand-name pin against
  future refactors that might mistakenly read the wire payload. This
  is also the **first** plugin in the cohort to pin a multi-word
  brand-name string literal containing an inter-word ASCII space —
  every prior cohort plugin pins a single-word brand (`'Buildkite'`,
  `'CircleCI'`, `'Mercury'`, `'Brex'`, etc.) or a brand without inter-
  word space (`'OpenAI'`, `'DoorDash'`).
- **D-10 (run #262):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, Ramp Network's tenant emits clean trimmed titles in every
  observed listing — confirmed via run #262's HTTP probe of the live
  API where the returned job has a title with no leading or trailing
  whitespace (e.g. `'Senior Management Accountant - 6 month FTC'`).
  Skipping the trim is consistent with the CircleCI / Mercury / Gusto /
  Klaviyo template (36 of 40 prior cohort plugins skip the trim; only
  Brex and Buildkite apply it).

## 11. References

- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 050 / run #260; uses the new `job-boards.greenhouse.io`
  permalink subdomain — variant 2 — with the entity-decode pipeline).
- `packages/plugins/source-company-circleci/src/circleci.service.ts` —
  the prior company-direct plugin (Spec 051 / run #261; uses the
  apex-www marketing-site, HTTP-scheme, path-with-trailing-slash
  variant 7 with the entity-decode pipeline).
- `packages/plugins/source-company-mercury/src/mercury.service.ts` —
  the prior fintech-cohort plugin (Spec 049 / run #259; uses variant 2
  with the entity-decode pipeline; runs #259, #260, #261 close-outs
  flagged Ramp Network as the variant-6 EU-region pivot future-bite).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
