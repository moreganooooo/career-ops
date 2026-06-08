# Spec: 046 — Source Company Plugin: Duolingo

| Field          | Value                                                                                                                                              |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 046                                                                                                                                                |
| Slug           | source-company-duolingo                                                                                                                            |
| Status         | accepted                                                                                                                                           |
| Owner          | claude (run #256)                                                                                                                                  |
| Created        | 2026-05-02                                                                                                                                         |
| Last updated   | 2026-05-02                                                                                                                                         |
| Supersedes     | (none)                                                                                                                                             |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045    |

## 1. Problem Statement

Run #255's Spec 045 closed the gap that the company-direct catalogue had no
entry for the dominant **email / SMS / customer-data marketing-automation**
vendor (Klaviyo, Inc.). The same gap remains for the dominant
**mobile-first language-learning education-technology** vendor — Duolingo
(Duolingo, Inc., NASDAQ: DUOL; founded by Luis von Ahn and Severin Hacker
in 2011 as a spin-out from Carnegie Mellon's reCAPTCHA project; operator of
the Duolingo language-learning consumer app, the Duolingo English Test
high-stakes language-proficiency exam, the Duolingo for Schools education
product, and the Duolingo Math / Music vertical-expansion suites that
anchor the consumer-mobile language-learning category alongside Babbel,
Rosetta Stone, Busuu, Memrise, and Pimsleur) — whose multi-hundred-employee
engineering, product, design, learning-science, and operations hiring puts
its corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, and Klaviyo. Aggregator-callers asking for "all jobs at major US
consumer-mobile / education-technology vendors" must currently either
(a) deduce the Greenhouse slug `duolingo` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted role
for a company-name match. Both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that aggregator-side
code branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`duolingo` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-four times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo).

## 2. Goals

- Ship a `source-company-duolingo` plugin returning live `JobPostDto` rows
  for the public Duolingo careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-klaviyo` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.DUOLINGO` enum value, `id` prefixed `duolingo-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at least
  four failure / boundary modes against deterministic fixtures — **never**
  the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Duolingo.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'duolingo'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-klaviyo` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Duolingo's USD listings (Pittsburgh / NY HQ), GBP listings
  (Duolingo UK / London hub), EUR listings (Duolingo Germany / Berlin
  hub), and BRL / MXN listings (the LatAm Business team) without
  modification.
- Backfilling historical Duolingo postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DUOLINGO`** in the source
> registry, so that **a single `siteType: [Site.DUOLINGO]` request returns
> Duolingo's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern with the
> `careers.<company>.com/jobs/<id>?gh_jid=<id>` permalink-proxy variant**,
> so that **adding the next Greenhouse-only employer that proxies
> `absolute_url` through its own marketing-site careers index with both
> a path segment AND a `gh_jid` query parameter (Brex, Gusto, …) costs
> ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Duolingo**, so that **a Greenhouse outage on the
> Duolingo board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DUOLINGO = 'duolingo'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-duolingo` under `packages/plugins/`.                | must     |
| FR-3  | `DuolingoService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `duolingo-`, `site === Site.DUOLINGO`, and `companyName === 'Duolingo'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/duolingo.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[DuolingoModule]})` resolves.  |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-duolingo/src/duolingo.service.ts
@SourcePlugin({ site: Site.DUOLINGO, name: 'Duolingo', category: 'company' })
@Injectable()
export class DuolingoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/duolingo/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `duolingo-${listing.id}`,
  site:         Site.DUOLINGO,
  title:        listing.title,
  companyName:  'Duolingo',
  jobUrl:       listing.absolute_url ?? `https://careers.duolingo.com/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/duolingo.service.spec.ts`):**
  1. NestJS DI resolves `DuolingoService` through `DuolingoModule`.
  2. `Site.DUOLINGO === 'duolingo'` literal pin.
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

- **D-01 (run #256):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Duolingo's
  `careers.duolingo.com/jobs/<id>?gh_jid=<id>` index proxies its detail
  pages through a marketing-site careers subdomain that takes the
  Greenhouse job id BOTH as a path segment AND as a `?gh_jid=<id>` query
  parameter that is itself a Greenhouse job id; the Greenhouse public API
  is the canonical machine-readable feed and we already exercise the
  exact same wire format from `source-company-klaviyo`,
  `source-company-affirm`, `source-company-vercel`, `source-company-block`,
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
- **D-02 (run #256):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'duolingo'`.
- **D-03 (run #256):** No salary parser hook beyond the helpers defaults
  — Duolingo posts USD ranges (Pittsburgh / NY HQ), GBP ranges (Duolingo
  UK / London hub), EUR ranges (Duolingo Germany / Berlin hub), and
  BRL / MXN ranges (LatAm Business team) inside the Greenhouse
  `content` field; Spec 014 / 015's parser already covers all five
  currencies; no Spec 046-specific salary logic.
- **D-04 (run #256):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **Duolingo marketing-site careers proxy**
  template `https://careers.duolingo.com/jobs/<id>?gh_jid=<id>`.
  Rationale: like Klaviyo (Spec 045 § 10 D-04), Duolingo's tenant
  publishes its `absolute_url` via the company's own marketing-site
  domain rather than either Greenhouse permalink subdomain — but its
  shape differs from Klaviyo's in two ways that matter for byte-equivalent
  matching of the wire `absolute_url`. (a) Duolingo uses the `careers.`
  subdomain (`careers.duolingo.com`) rather than the bare apex
  (`www.klaviyo.com`); (b) Duolingo's URL embeds the Greenhouse job id
  BOTH as a path segment (`/jobs/<id>`) AND as a query parameter
  (`?gh_jid=<id>`) — confirmed via run #256's HTTP 200 probe of the
  live API where the first job's `absolute_url` is
  `https://careers.duolingo.com/jobs/8369239002?gh_jid=8369239002`.
  This is the **fourth** distinct wire-shape variant in the company-
  direct cohort: (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` —
  used by 31 plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel and
  Affirm; (3) marketing-site `<company>.com/careers/jobs?gh_jid=<id>` —
  used by Klaviyo (apex domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query). The fallback uses the wire-shape
  `https://careers.duolingo.com/jobs/<id>?gh_jid=<id>` exactly for byte-
  equivalence with the wire `absolute_url`. Functional impact is zero
  because Greenhouse populates `absolute_url` on every Duolingo listing
  in practice (the fallback is a defence-in-depth path Greenhouse has
  not actually exercised against this tenant in the audit window). This
  is the **second** company-direct plugin in the cohort whose fallback
  uses a marketing-site-proxy variant rather than either Greenhouse
  permalink subdomain (the first being Klaviyo).
- **D-05 (run #256):** Use Greenhouse slug `duolingo` (the bare display
  name, lowercase). Rationale: like Klaviyo (Spec 045 § 10 D-05),
  Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block
  (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040
  § 10 D-05), Instacart (Spec 039 § 10 D-05), Datadog (Spec 038 § 10
  D-05), MongoDB (Spec 037 § 10 D-05), Cloudflare (Spec 036 § 10 D-05),
  Twilio (Spec 035 § 10 D-05), Twitch (Spec 034 § 10 D-05), Gitlab
  (Spec 033 § 10 D-05), Figma (Spec 032 § 10 D-05), Asana (Spec 031 §
  10 D-05), Plaid (Spec 030 § 10 D-05), Lyft (Spec 029 § 10 D-05),
  Pinterest (Spec 028 § 10 D-05), and Reddit (Spec 027 § 10 D-05), and
  unlike Robinhood (Spec 026 § 10 D-05), Duolingo's Greenhouse tenant
  is published at the bare `duolingo` slug with no slug-vs-display-name
  asymmetry; the slug is the company name lowercase. Confirmed via run
  #256's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/duolingo/jobs?content=true`
  (84 open roles returned at probe time).
- **D-06 (run #256):** Class name is `DuolingoService` / `DuolingoModule`
  (PascalCase with the standard initial cap). Rationale: simple
  trademark proper noun with no embedded acronym needing special casing
  — like Klaviyo (Spec 045 § 10 D-06), Affirm (Spec 044 § 10 D-06),
  Vercel (Spec 043 § 10 D-06), Block (Spec 042 § 10 D-07), Roblox
  (Spec 041 § 10 D-07), Dropbox (Spec 040 § 10 D-07), and Instacart
  (Spec 039 § 10 D-07), Duolingo is a single trademarked word and
  PascalCase falls out trivially.
- **D-07 (run #256):** Re-confirmation probe sweep — Duolingo (200, 84
  roles), Brex (200), Gusto (200) all returned HTTP 200 on
  `https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true`.
  Duolingo picked as the next bite alphabetically per the Spec 045 / run
  #255 close-out note; the other two (Brex, Gusto) queue up for runs
  #257 / #258 respectively.
- **D-08 (run #256):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Klaviyo (Spec 045 § 10 D-08), Duolingo's tenant emits
  HTML-entity-encoded content (`&lt;p&gt;...`) rather than raw HTML tags
  (`<p>...`) — confirmed via run #256's HTTP probe of the live API
  where the first job's `content` starts with `&lt;p&gt;Our mission at
  Duolingo is to develop the best education in the world…`. Applying
  `stripHtmlTags()` alone to that wire payload would leave the literal
  entities in place (because they are not actual `<…>` tags), producing
  user-facing descriptions full of `&lt;p&gt;` substrings. Decoding
  entities **first** (turning `&lt;p&gt;` into `<p>`) and then stripping
  tags (turning `<p>real text</p>` into `real text`) yields clean
  readable text. The pipeline is order-sensitive — `decodeHtmlEntities()`
  must run before `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities decoded) and
  (b) does not contain `<p>` (tags stripped after the decode pass), so a
  future refactor that swaps the order or drops one half of the pipeline
  would surface as a test diff. This is the **second** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip pipeline
  (the first being Klaviyo).

## 11. References

- `packages/plugins/source-company-klaviyo/src/klaviyo.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 045 / run #255; uses the marketing-site-proxy variant — query-
  param-only / apex domain — and the entity-decode-then-tag-strip
  pipeline).
- `packages/plugins/source-company-affirm/src/affirm.service.ts` — the
  prior Greenhouse-backed company-direct pattern this spec extends
  (second cohort member to use the new permalink subdomain).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
