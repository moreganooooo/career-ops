# Spec: 047 — Source Company Plugin: Brex

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spec ID        | 047                                                                                                                                                    |
| Slug           | source-company-brex                                                                                                                                    |
| Status         | accepted                                                                                                                                               |
| Owner          | claude (run #257)                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046  |

## 1. Problem Statement

Run #256's Spec 046 closed the gap that the company-direct catalogue had no
entry for the dominant **mobile-first language-learning education-technology**
vendor (Duolingo, Inc.). The same gap remains for the dominant
**fintech corporate-card / spend-management / business-banking** vendor —
Brex (Brex Inc.; founded by Henrique Dubugras and Pedro Franceschi in 2017
as a YC-backed Stanford-spinout corporate-card play targeting startups with
no FICO; operator of the Brex corporate card, Brex Cash business-banking,
Brex Travel, Brex Empower expense / spend-management, and Brex Embedded
embedded-finance product lines that anchor the technology-spend-management
category alongside Ramp, Mercury, Airbase, Divvy, and Bill.com) — whose
multi-hundred-employee engineering, product, design, GTM, finance, and
operations hiring puts its corporate openings on the same "marquee
company-direct" tier as Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox,
Block, Vercel, Affirm, Klaviyo, and Duolingo. Aggregator-callers asking for
"all jobs at major US fintech / spend-management vendors" must currently
either (a) deduce the Greenhouse slug `brex` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted role
for a company-name match. Both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that aggregator-side
code branches on for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`brex` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-five times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo).

## 2. Goals

- Ship a `source-company-brex` plugin returning live `JobPostDto` rows
  for the public Brex careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-duolingo` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.BREX` enum value, `id` prefixed `brex-`).
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never**
  the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Brex.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'brex'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-duolingo` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Brex's USD listings (San Francisco / NY HQ), CAD listings
  (Vancouver hub), GBP listings (London hub), EUR listings (Berlin /
  Amsterdam hubs) without modification.
- Backfilling historical Brex postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BREX`** in the source
> registry, so that **a single `siteType: [Site.BREX]` request returns
> Brex's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern with the
> `www.<company>.com/careers/<id>?gh_jid=<id>` apex-www permalink-proxy
> variant**, so that **adding the next Greenhouse-only employer that
> proxies `absolute_url` through its own marketing-site careers index
> on the apex `www.` domain with both a path segment AND a `gh_jid`
> query parameter (Gusto, …) costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Brex**, so that **a Greenhouse outage on the
> Brex board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BREX = 'brex'` to `packages/models/src/enums/site.enum.ts`.                             | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-brex` under `packages/plugins/`.                    | must     |
| FR-3  | `BrexService.scrape(input)` returns a `JobResponseDto`; never throws.                             | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `brex-`, `site === Site.BREX`, and `companyName === 'Brex'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/brex.service.spec.ts`, all using mocked HTTP.          | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |
| FR-12 | The emitted `title` is trimmed of leading/trailing whitespace (Brex's tenant pads some titles with surrounding spaces — see § 10 D-09); other plugins in the cohort do not need this because their wire payload does not pad titles. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[BrexModule]})` resolves.       |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-brex/src/brex.service.ts
@SourcePlugin({ site: Site.BREX, name: 'Brex', category: 'company' })
@Injectable()
export class BrexService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/brex/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `brex-${listing.id}`,
  site:         Site.BREX,
  title:        (listing.title ?? '').trim(),
  companyName:  'Brex',
  jobUrl:       listing.absolute_url ?? `https://www.brex.com/careers/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/brex.service.spec.ts`):**
  1. NestJS DI resolves `BrexService` through `BrexModule`.
  2. `Site.BREX === 'brex'` literal pin.
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

- **D-01 (run #257):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Brex's
  `www.brex.com/careers/<id>?gh_jid=<id>` index proxies its detail
  pages through its apex marketing-site `www.` domain that takes the
  Greenhouse job id BOTH as a path segment AND as a `?gh_jid=<id>` query
  parameter that is itself a Greenhouse job id; the Greenhouse public API
  is the canonical machine-readable feed and we already exercise the
  exact same wire format from `source-company-duolingo`,
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
- **D-02 (run #257):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'brex'`.
- **D-03 (run #257):** No salary parser hook beyond the helpers defaults
  — Brex posts USD ranges (San Francisco / NY HQ), CAD ranges (Vancouver
  hub), GBP ranges (London hub), EUR ranges (Berlin / Amsterdam hubs)
  inside the Greenhouse `content` field; Spec 014 / 015's parser already
  covers all four currencies; no Spec 047-specific salary logic.
- **D-04 (run #257):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **Brex apex marketing-site careers
  proxy** template `https://www.brex.com/careers/<id>?gh_jid=<id>`.
  Rationale: like Klaviyo (Spec 045 § 10 D-04) and Duolingo (Spec 046 §
  10 D-04), Brex's tenant publishes its `absolute_url` via the company's
  own marketing-site domain rather than either Greenhouse permalink
  subdomain — but its shape differs from both prior marketing-proxy
  variants in a way that matters for byte-equivalent matching of the
  wire `absolute_url`. (a) Brex uses the apex `www.` domain
  (`www.brex.com`) — same as Klaviyo (`www.klaviyo.com`), unlike
  Duolingo's `careers.` subdomain (`careers.duolingo.com`); (b) Brex's
  URL embeds the Greenhouse job id BOTH as a path segment
  (`/careers/<id>`) AND as a query parameter (`?gh_jid=<id>`) — same as
  Duolingo's path-AND-query shape, unlike Klaviyo's static-path
  query-param-only shape (`/careers/jobs?gh_jid=<id>`); confirmed via
  run #257's HTTP 200 probe of the live API where the first job's
  `absolute_url` is
  `https://www.brex.com/careers/8379353002?gh_jid=8379353002`. This is
  the **fifth** distinct wire-shape variant in the company-direct
  cohort: (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` — used by
  31 plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel and
  Affirm; (3) marketing-site `<company>.com/careers/jobs?gh_jid=<id>` —
  used by Klaviyo (apex domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query). The fallback uses the wire-shape
  `https://www.brex.com/careers/<id>?gh_jid=<id>` exactly for byte-
  equivalence with the wire `absolute_url`. Functional impact is zero
  because Greenhouse populates `absolute_url` on every Brex listing
  in practice (the fallback is a defence-in-depth path Greenhouse has
  not actually exercised against this tenant in the audit window). This
  is the **third** company-direct plugin in the cohort whose fallback
  uses a marketing-site-proxy variant rather than either Greenhouse
  permalink subdomain (the first two being Klaviyo and Duolingo).
- **D-05 (run #257):** Use Greenhouse slug `brex` (the bare display
  name, lowercase). Rationale: like Duolingo (Spec 046 § 10 D-05),
  Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044 § 10 D-05), Vercel
  (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05), Roblox (Spec 041
  § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10
  D-05), Datadog (Spec 038 § 10 D-05), MongoDB (Spec 037 § 10 D-05),
  Cloudflare (Spec 036 § 10 D-05), Twilio (Spec 035 § 10 D-05), Twitch
  (Spec 034 § 10 D-05), Gitlab (Spec 033 § 10 D-05), Figma (Spec 032 §
  10 D-05), Asana (Spec 031 § 10 D-05), Plaid (Spec 030 § 10 D-05),
  Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028 § 10 D-05), and
  Reddit (Spec 027 § 10 D-05), and unlike Robinhood (Spec 026 § 10
  D-05), Brex's Greenhouse tenant is published at the bare `brex` slug
  with no slug-vs-display-name asymmetry; the slug is the company name
  lowercase. Confirmed via run #257's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/brex/jobs?content=true`
  (12 open roles returned at probe time).
- **D-06 (run #257):** Class name is `BrexService` / `BrexModule`
  (PascalCase with the standard initial cap). Rationale: simple
  trademark proper noun with no embedded acronym needing special casing
  — like Duolingo (Spec 046 § 10 D-06), Klaviyo (Spec 045 § 10 D-06),
  Affirm (Spec 044 § 10 D-06), Vercel (Spec 043 § 10 D-06), Block
  (Spec 042 § 10 D-07), Roblox (Spec 041 § 10 D-07), Dropbox (Spec 040
  § 10 D-07), and Instacart (Spec 039 § 10 D-07), Brex is a single
  trademarked word and PascalCase falls out trivially.
- **D-07 (run #257):** Re-confirmation probe sweep — Brex (200, 12
  roles), Gusto (200) all returned HTTP 200 on
  `https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true`.
  Brex picked as the next bite alphabetically per the Spec 046 / run
  #256 close-out note; the remaining one (Gusto) queues up for run
  #258.
- **D-08 (run #257):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Duolingo (Spec 046 § 10 D-08) and Klaviyo (Spec 045 §
  10 D-08), Brex's tenant emits HTML-entity-encoded content
  (`&lt;p&gt;...`) rather than raw HTML tags (`<p>...`) — confirmed via
  run #257's HTTP probe of the live API where the first job's `content`
  starts with `&lt;div class=&quot;content-intro&quot;&gt;&lt;p&gt;
  &lt;strong&gt;Why join us&lt;/strong&gt;&lt;/p&gt;…`. Applying
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
  would surface as a test diff. This is the **third** company-direct
  plugin in the cohort to use the entity-decode-then-tag-strip pipeline
  (the first two being Klaviyo and Duolingo).
- **D-09 (run #257):** Trim leading/trailing whitespace from the wire
  `title`. Rationale: Brex's Greenhouse tenant pads some titles with
  surrounding ASCII spaces (` Account Executive, E-Commerce ` was the
  wire shape on the first listing observed during run #257's probe).
  Other plugins in the cohort do not need this defence because their
  upstream wire payload does not pad titles, but the trim is a cheap
  forward-compatible safety pass that costs nothing if the upstream is
  already clean (idempotent on whitespace-clean strings) and prevents
  downstream consumers (deduplication keys, search index, UI titles)
  from mis-handling padded values. The unit-test happy path asserts the
  emitted `title` matches the trimmed string and is unequal to the
  padded wire string, so a future refactor that drops the trim would
  surface as a test diff. This is the **first** company-direct plugin
  in the cohort to apply a wire-title trim — the deviation is isolated
  to `brex.service.ts` and does not require a shared helper change.

## 11. References

- `packages/plugins/source-company-duolingo/src/duolingo.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 046 / run #256; uses the marketing-site careers-subdomain
  path-AND-query variant and the entity-decode-then-tag-strip
  pipeline).
- `packages/plugins/source-company-klaviyo/src/klaviyo.service.ts` — the
  prior marketing-site-proxy company-direct pattern this spec extends
  (first cohort member to use a marketing-site proxy; apex-domain /
  query-param-only variant).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
