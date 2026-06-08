# Spec: 049 — Source Company Plugin: Mercury

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spec ID        | 049                                                                                                                                                    |
| Slug           | source-company-mercury                                                                                                                                 |
| Status         | accepted                                                                                                                                               |
| Owner          | claude (run #259)                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048 |

## 1. Problem Statement

Run #258's Spec 048 closed the gap that the company-direct catalogue had no
entry for the dominant **small-business payroll / benefits / HR-platform**
vendor (Gusto, Inc.). The same gap remains for the dominant
**SMB / startup business-banking + spend-management** vendor —
Mercury (Mercury Technologies, Inc.; founded by Immad Akhund, Max Tagher,
and Jason Zhang in 2017 as a Y-Combinator-backed banking-for-startups play
targeting the segment ignored by JPMorgan, Bank of America, Wells Fargo, and
Silicon Valley Bank's pre-2023 incumbents; operator of Mercury Checking,
Mercury Savings, Mercury Treasury (the Bill.com-comparable money-market /
treasury-yield product), Mercury Credit (the corporate-card line), Mercury
Bill Pay, Mercury IO (the API-banking platform), and Mercury Personal
product lines that anchor the **300,000+** ambitious-business banking
category alongside Brex, Ramp, Bluevine, Relay, Novo, Lili, Bank of America
Business, JPMorgan Chase Business, and SVB) — whose multi-hundred-employee
engineering, product, design, GTM, finance, compliance, risk, BSA / AML,
and operations hiring across San Francisco / New York / Portland / Remote-US
hubs puts its corporate openings on the same "marquee company-direct" tier
as Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, Klaviyo, Duolingo, Brex, and Gusto. Aggregator-callers asking for
"all jobs at major US business-banking vendors" must currently either (a)
deduce the Greenhouse slug `mercury` and call `source-ats-greenhouse` by
hand, or (b) post-filter the firehose of every Greenhouse-hosted role for
a company-name match. Both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that aggregator-side
code branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`mercury` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-seven times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto).

## 2. Goals

- Ship a `source-company-mercury` plugin returning live `JobPostDto` rows
  for the public Mercury careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-gusto` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.MERCURY` enum value, `id` prefixed `mercury-`) — Gusto is the
  closest structural cousin because both publish through the new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain AND both
  emit HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline.
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Mercury.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'mercury'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-gusto` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Mercury's USD listings (San Francisco / New York /
  Portland hubs) without modification.
- Backfilling historical Mercury postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MERCURY`** in the source
> registry, so that **a single `siteType: [Site.MERCURY]` request returns
> Mercury's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain with
> the entity-decode-then-tag-strip description pipeline**, so that
> **adding the next Greenhouse-only employer that uses both the new
> permalink subdomain AND emits HTML-entity-encoded content costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Mercury**, so that **a Greenhouse outage on the
> Mercury board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MERCURY = 'mercury'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-mercury` under `packages/plugins/`.                 | must     |
| FR-3  | `MercuryService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `mercury-`, `site === Site.MERCURY`, and `companyName === 'Mercury'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/mercury.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[MercuryModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-mercury/src/mercury.service.ts
@SourcePlugin({ site: Site.MERCURY, name: 'Mercury', category: 'company' })
@Injectable()
export class MercuryService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/mercury/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `mercury-${listing.id}`,
  site:         Site.MERCURY,
  title:        listing.title ?? '',
  companyName:  'Mercury',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/mercury/jobs/${listing.id}`,
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

- **Unit (`__tests__/mercury.service.spec.ts`):**
  1. NestJS DI resolves `MercuryService` through `MercuryModule`.
  2. `Site.MERCURY === 'mercury'` literal pin.
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

- **D-01 (run #259):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Mercury's
  `https://job-boards.greenhouse.io/mercury/jobs/<id>` permalink is the
  Greenhouse-canonical detail-page proxy on the new permalink subdomain
  — the same one Vercel (Spec 043), Affirm (Spec 044), and Gusto (Spec
  048) already use — and the Greenhouse public API is the canonical
  machine-readable feed for this wire-shape variant. We already exercise
  the exact same wire format from `source-company-gusto`,
  `source-company-brex`, `source-company-duolingo`,
  `source-company-klaviyo`, `source-company-affirm`,
  `source-company-vercel`, `source-company-block`,
  `source-company-roblox`, `source-company-dropbox`,
  `source-company-instacart`, `source-company-datadog`,
  `source-company-mongodb`, `source-company-cloudflare`,
  `source-company-twilio`, `source-company-twitch`,
  `source-company-gitlab`, `source-company-figma`, `source-company-asana`,
  `source-company-plaid`, `source-company-lyft`,
  `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #259):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'mercury'`.
- **D-03 (run #259):** No salary parser hook beyond the helpers defaults
  — Mercury posts USD ranges (San Francisco / New York / Portland hubs)
  inside the Greenhouse `content` field; Spec 014 / 015's parser already
  covers USD without modification; no Spec 049-specific salary logic.
- **D-04 (run #259):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **new Greenhouse permalink subdomain**
  template `https://job-boards.greenhouse.io/mercury/jobs/<id>`.
  Rationale: like Vercel (Spec 043 § 10 D-04), Affirm (Spec 044 §
  10 D-04), and Gusto (Spec 048 § 10 D-04), Mercury's tenant publishes
  its `absolute_url` on the new `job-boards.greenhouse.io` permalink
  subdomain — confirmed via run #259's HTTP 200 probe of the live API
  where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/mercury/jobs/5820682004`. This is
  the **fourth** plugin in this variant (after Vercel, Affirm, Gusto)
  out of five total wire-shape variants in the company-direct cohort:
  (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` — used by 31
  plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel, Affirm,
  Gusto, and Mercury (this spec is the **fourth** plugin in this
  variant); (3) marketing-site `<company>.com/careers/jobs?gh_jid=<id>`
  — used by Klaviyo (apex domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query). The fallback uses the wire-shape
  `https://job-boards.greenhouse.io/mercury/jobs/<id>` exactly for byte-
  equivalence with the wire `absolute_url`. Functional impact is zero
  because Greenhouse populates `absolute_url` on every Mercury listing
  in practice (the fallback is a defence-in-depth path Greenhouse has
  not actually exercised against this tenant in the audit window).
- **D-05 (run #259):** Use Greenhouse slug `mercury` (the bare display
  name, lowercase). Rationale: like Gusto (Spec 048 § 10 D-05), Brex
  (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec
  045 § 10 D-05), Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10
  D-05), Block (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05),
  Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05), and
  unlike Robinhood (Spec 026 § 10 D-05), Mercury's Greenhouse tenant is
  published at the bare `mercury` slug with no slug-vs-display-name
  asymmetry; the slug is the company brand name lowercase. Confirmed
  via run #259's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/mercury/jobs?content=true`.
- **D-06 (run #259):** Class name is `MercuryService` / `MercuryModule`
  (PascalCase with the standard initial cap). Rationale: simple
  trademark proper noun with no embedded acronym needing special casing
  — like Gusto (Spec 048 § 10 D-06), Brex (Spec 047 § 10 D-06),
  Duolingo (Spec 046 § 10 D-06), Klaviyo (Spec 045 § 10 D-06), Affirm
  (Spec 044 § 10 D-06), Vercel (Spec 043 § 10 D-06), Block (Spec 042
  § 10 D-07), Roblox (Spec 041 § 10 D-07), Dropbox (Spec 040 § 10 D-07),
  and Instacart (Spec 039 § 10 D-07), Mercury is a single trademarked
  word and PascalCase falls out trivially.
- **D-07 (run #259):** Probe sweep of the post-Spec-048 named-candidate
  well — Stripe-adjacent fintechs (Mercury, Modern Treasury, Ramp),
  vertical SaaS (Notion, Linear, Loom, Front), e-commerce (Shopify) —
  produced **two** HTTP 200 responses on
  `https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true`:
  `mercury` (200) and `rampnetwork` (200, but a different tenant: Ramp
  Network — the Web3 fiat-to-crypto-onramp company, NOT Ramp Inc., the
  US fintech-spend-management company). Mercury picked as the next bite
  (alphabetically first); Ramp Network queues up for run #260 (and
  introduces a **sixth** wire-shape variant, the EU-region permalink
  subdomain `job-boards.eu.greenhouse.io/<slug>/jobs/<id>`, observed
  on the rampnetwork wire). All other slugs probed (`ramp`,
  `moderntreasury`, `modern-treasury`, `notion`, `linear`, `loom`,
  `front`, `shopify`, plus several variant spellings) returned 404 —
  these companies are either on different ATS platforms (Lever / Ashby
  / Workday / bespoke) or use non-trivial Greenhouse tenant slugs that
  the next probe sweep can attempt.
- **D-08 (run #259):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08),
  Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08),
  Mercury's tenant emits HTML-entity-encoded content (`&lt;p&gt;...`)
  rather than raw HTML tags (`<p>...`) — confirmed via run #259's HTTP
  probe of the live API where the first job's `content` starts with
  `&lt;p&gt;Railroads didn't change the world…`. Applying
  `stripHtmlTags()` alone to that wire payload would leave the literal
  entities in place (because they are not actual `<…>` tags), producing
  user-facing descriptions full of `&lt;p&gt;` substrings. Decoding
  entities **first** (turning `&lt;p&gt;` into `<p>`) and then stripping
  tags (turning `<p>real text</p>` into `real text`) yields clean
  readable text. The pipeline is order-sensitive — `decodeHtmlEntities()`
  must run before `stripHtmlTags()`. The unit-test happy path asserts
  the cleaned description (a) does not contain `&lt;` (entities decoded)
  and (b) does not contain `<p>` (tags stripped after the decode pass),
  so a future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **fifth**
  company-direct plugin in the cohort to use the entity-decode-then-
  tag-strip pipeline (the first four being Klaviyo, Duolingo, Brex, and
  Gusto). Notably, this is the **second** plugin in the cohort to combine
  the new `job-boards.greenhouse.io` permalink subdomain (variant 2)
  with the entity-decode-then-tag-strip pipeline — Gusto (Spec 048) was
  the first; Vercel and Affirm use variant 2 with raw HTML content (no
  entity decoding); Klaviyo / Duolingo / Brex use the entity-decode
  pipeline with marketing-site shapes (variants 3 / 4 / 5).
- **D-09 (run #259):** Emit the wire `company_name` `Mercury` directly
  (no brand-name trim required). Rationale: Mercury's wire `company_name`
  is the bare brand name `Mercury` — confirmed via run #259's HTTP
  probe of the live API where the first job's `company_name` is
  `"Mercury"` (no `, Inc.` suffix, no `Technologies, Inc.` legal-entity
  suffix). This contrasts with Gusto (Spec 048 § 10 D-09) and Affirm
  (Spec 044 § 10 D-06), both of which emit a wire `company_name` with
  a legal-entity suffix that needed cleaning to the brand name. The
  plugin pins `companyName === 'Mercury'` as a string literal in the
  `JobPostDto` mapping (rather than reading `listing.company_name`)
  for byte-stable consistency with the other thirty-seven company-direct
  plugins — every prior company-direct plugin uses a string literal for
  `companyName`, and Mercury follows the same convention. The unit-test
  happy path asserts the emitted `companyName === 'Mercury'` to lock
  the brand-name pin against future refactors that might mistakenly
  read the wire payload.

## 11. References

- `packages/plugins/source-company-gusto/src/gusto.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 048 / run #258; uses the new `job-boards.greenhouse.io` permalink
  subdomain — the same wire-shape variant Mercury uses — AND the
  entity-decode-then-tag-strip description pipeline).
- `packages/plugins/source-company-affirm/src/affirm.service.ts` —
  the prior new-permalink-subdomain company-direct plugin (variant 2
  with raw HTML content, no entity decoding — Mercury extends this
  shape with the entity-decode pipeline).
- `packages/plugins/source-company-vercel/src/vercel.service.ts` —
  the first new-permalink-subdomain plugin in the cohort.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
