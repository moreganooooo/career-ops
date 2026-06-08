# Spec: 048 — Source Company Plugin: Gusto

| Field          | Value                                                                                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Spec ID        | 048                                                                                                                                                    |
| Slug           | source-company-gusto                                                                                                                                   |
| Status         | accepted                                                                                                                                               |
| Owner          | claude (run #258)                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047 |

## 1. Problem Statement

Run #257's Spec 047 closed the gap that the company-direct catalogue had no
entry for the dominant **fintech corporate-card / spend-management /
business-banking** vendor (Brex Inc.). The same gap remains for the dominant
**small-business payroll / benefits / HR-platform** vendor —
Gusto (Gusto, Inc.; founded by Joshua Reeves, Edward Kim, and Tomer London
in 2011 as ZenPayroll; rebranded to Gusto in 2015; operator of the Gusto
full-service payroll, Gusto Benefits health-insurance and 401(k)
administration, Gusto Time Tools time-tracking and PTO, Gusto Hiring &
Onboarding ATS, Gusto Pay-as-you-go workers' comp, and Gusto Embedded
embedded-payroll product lines that anchor the SMB-payroll-and-HR
category alongside ADP RUN, Paychex Flex, QuickBooks Payroll, Rippling,
Justworks, Paylocity, Bamboo HR, and TriNet) — whose multi-thousand-employee
engineering, product, design, GTM, finance, compliance, and operations
hiring across Denver / San Francisco / New York hubs puts its corporate
openings on the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, and
Brex. Aggregator-callers asking for "all jobs at major US payroll / HR-tech
vendors" must currently either (a) deduce the Greenhouse slug `gusto` and
call `source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match. Both paths bypass
the per-source health and circuit-breaker plumbing that the company-direct
plugins sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry
that aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`gusto` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-six times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex).

## 2. Goals

- Ship a `source-company-gusto` plugin returning live `JobPostDto` rows
  for the public Gusto careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-affirm` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.GUSTO` enum value, `id` prefixed `gusto-`) — Affirm is the closest
  structural cousin because both publish through the new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain, and
  both expose a wire `company_name` whose legal-entity suffix
  (`, Inc.` for Gusto; `Holdings, Inc.` for Affirm) needs cleaning to
  the brand name.
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Gusto.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'gusto'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-affirm` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Gusto's USD listings (Denver / San Francisco / New York
  hubs) and any future CAD listings (no current Toronto hub but Gusto
  has a remote-CA presence) without modification.
- Backfilling historical Gusto postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.GUSTO`** in the source
> registry, so that **a single `siteType: [Site.GUSTO]` request returns
> Gusto's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain with
> the entity-decode-then-tag-strip description pipeline**, so that
> **adding the next Greenhouse-only employer that uses both the new
> permalink subdomain AND emits HTML-entity-encoded content costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Gusto**, so that **a Greenhouse outage on the
> Gusto board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.GUSTO = 'gusto'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-gusto` under `packages/plugins/`.                   | must     |
| FR-3  | `GustoService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `gusto-`, `site === Site.GUSTO`, and `companyName === 'Gusto'` (NOT `'Gusto, Inc.'` — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/gusto.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[GustoModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-gusto/src/gusto.service.ts
@SourcePlugin({ site: Site.GUSTO, name: 'Gusto', category: 'company' })
@Injectable()
export class GustoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/gusto/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `gusto-${listing.id}`,
  site:         Site.GUSTO,
  title:        listing.title ?? '',
  companyName:  'Gusto',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/gusto/jobs/${listing.id}`,
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

- **Unit (`__tests__/gusto.service.spec.ts`):**
  1. NestJS DI resolves `GustoService` through `GustoModule`.
  2. `Site.GUSTO === 'gusto'` literal pin.
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

- **D-01 (run #258):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Gusto's
  `https://job-boards.greenhouse.io/gusto/jobs/<id>` permalink is the
  Greenhouse-canonical detail-page proxy on the new permalink subdomain
  — the same one Vercel (Spec 043) and Affirm (Spec 044) already use —
  and the Greenhouse public API is the canonical machine-readable feed
  for this wire-shape variant. We already exercise the exact same wire
  format from `source-company-brex`, `source-company-duolingo`,
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
- **D-02 (run #258):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'gusto'`.
- **D-03 (run #258):** No salary parser hook beyond the helpers defaults
  — Gusto posts USD ranges (Denver / San Francisco / New York hubs)
  inside the Greenhouse `content` field; Spec 014 / 015's parser already
  covers USD without modification; no Spec 048-specific salary logic.
- **D-04 (run #258):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **new Greenhouse permalink subdomain**
  template `https://job-boards.greenhouse.io/gusto/jobs/<id>`.
  Rationale: like Vercel (Spec 043 § 10 D-04) and Affirm (Spec 044 §
  10 D-04), Gusto's tenant publishes its `absolute_url` on the new
  `job-boards.greenhouse.io` permalink subdomain — confirmed via run
  #258's HTTP 200 probe of the live API where the first job's
  `absolute_url` is
  `https://job-boards.greenhouse.io/gusto/jobs/7714510`. This is the
  **second** distinct wire-shape variant in the company-direct cohort,
  with five total variants: (1) legacy `boards.greenhouse.io/<slug>/
  jobs/<id>` — used by 31 plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel, Affirm,
  and Gusto (this spec is the **third** plugin in this variant);
  (3) marketing-site `<company>.com/careers/jobs?gh_jid=<id>` — used by
  Klaviyo (apex domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query). The fallback uses the wire-shape
  `https://job-boards.greenhouse.io/gusto/jobs/<id>` exactly for byte-
  equivalence with the wire `absolute_url`. Functional impact is zero
  because Greenhouse populates `absolute_url` on every Gusto listing
  in practice (the fallback is a defence-in-depth path Greenhouse has
  not actually exercised against this tenant in the audit window).
- **D-05 (run #258):** Use Greenhouse slug `gusto` (the bare display
  name, lowercase). Rationale: like Brex (Spec 047 § 10 D-05),
  Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm
  (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042 §
  10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05),
  Instacart (Spec 039 § 10 D-05), Datadog (Spec 038 § 10 D-05), MongoDB
  (Spec 037 § 10 D-05), Cloudflare (Spec 036 § 10 D-05), Twilio (Spec
  035 § 10 D-05), Twitch (Spec 034 § 10 D-05), Gitlab (Spec 033 § 10
  D-05), Figma (Spec 032 § 10 D-05), Asana (Spec 031 § 10 D-05), Plaid
  (Spec 030 § 10 D-05), Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028
  § 10 D-05), and Reddit (Spec 027 § 10 D-05), and unlike Robinhood
  (Spec 026 § 10 D-05), Gusto's Greenhouse tenant is published at the
  bare `gusto` slug with no slug-vs-display-name asymmetry; the slug is
  the company brand name lowercase. Confirmed via run #258's HTTP 200
  probe of `https://api.greenhouse.io/v1/boards/gusto/jobs?content=true`
  (79 open roles returned at probe time).
- **D-06 (run #258):** Class name is `GustoService` / `GustoModule`
  (PascalCase with the standard initial cap). Rationale: simple
  trademark proper noun with no embedded acronym needing special casing
  — like Brex (Spec 047 § 10 D-06), Duolingo (Spec 046 § 10 D-06),
  Klaviyo (Spec 045 § 10 D-06), Affirm (Spec 044 § 10 D-06), Vercel
  (Spec 043 § 10 D-06), Block (Spec 042 § 10 D-07), Roblox (Spec 041
  § 10 D-07), Dropbox (Spec 040 § 10 D-07), and Instacart (Spec 039
  § 10 D-07), Gusto is a single trademarked word and PascalCase falls
  out trivially.
- **D-07 (run #258):** Re-confirmation probe — `gusto` (200, 79 roles)
  returned HTTP 200 on
  `https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true`. Gusto
  was the last queued ergonomic bite from the Spec 044 / run #254
  named-candidate well (after Klaviyo / Duolingo / Brex shipped in runs
  #255 / #256 / #257). With Gusto shipped, the named-candidate well is
  empty; future runs (post Spec 048) will need a fresh probe-sweep
  against e.g. Stripe-adjacent fintechs (Modern Treasury, Mercury,
  Ramp), e-commerce platforms (Shopify-adjacent), or vertical SaaS
  (Notion, Linear, Loom, Front).
- **D-08 (run #258):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10
  D-08), and Klaviyo (Spec 045 § 10 D-08), Gusto's tenant emits HTML-
  entity-encoded content (`&lt;p&gt;...`) rather than raw HTML tags
  (`<p>...`) — confirmed via run #258's HTTP probe of the live API
  where the first job's `content` starts with `&lt;div class=&quot;
  content-intro&quot;&gt;&lt;p style=&quot;line-height: 1.2;
  &quot;&gt;&amp;nbsp;&lt;/p&gt;`. Applying `stripHtmlTags()` alone
  to that wire payload would leave the literal entities in place
  (because they are not actual `<…>` tags), producing user-facing
  descriptions full of `&lt;p&gt;` substrings. Decoding entities
  **first** (turning `&lt;p&gt;` into `<p>`) and then stripping tags
  (turning `<p>real text</p>` into `real text`) yields clean readable
  text. The pipeline is order-sensitive — `decodeHtmlEntities()` must
  run before `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities decoded)
  and (b) does not contain `<p>` (tags stripped after the decode pass),
  so a future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **fourth**
  company-direct plugin in the cohort to use the entity-decode-then-
  tag-strip pipeline (the first three being Klaviyo, Duolingo, and Brex).
  Notably, this is the **first** plugin in the cohort to combine the
  new `job-boards.greenhouse.io` permalink subdomain (variant 2) with
  the entity-decode-then-tag-strip pipeline — Vercel and Affirm use
  variant 2 with raw HTML content (no entity decoding), while
  Klaviyo / Duolingo / Brex use the entity-decode pipeline with
  marketing-site shapes (variants 3 / 4 / 5).
- **D-09 (run #258):** Emit the cleaned brand name `Gusto` rather than
  the wire `company_name` `Gusto, Inc.`. Rationale: like Affirm
  (Spec 044 § 10 D-06 emits `Affirm` rather than wire `Affirm Holdings,
  Inc.`), Gusto's wire `company_name` includes a legal-entity suffix
  (`, Inc.`) that is appropriate for tax filings and SEC documents but
  not for end-user-visible job-listing UIs, dedup affinity, or analytics
  rollups. The plugin pins `companyName === 'Gusto'` as a string
  literal in the `JobPostDto` mapping rather than reading
  `listing.company_name` from the wire payload — same approach every
  prior company-direct plugin uses. The unit-test happy path asserts
  the emitted `companyName === 'Gusto'` to lock the brand-name pin
  against future refactors that might mistakenly read the wire
  payload.

## 11. References

- `packages/plugins/source-company-affirm/src/affirm.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 044 / run #254; uses the new `job-boards.greenhouse.io`
  permalink subdomain — the same wire-shape variant Gusto uses — but
  with raw HTML content rather than HTML-entity-encoded content).
- `packages/plugins/source-company-brex/src/brex.service.ts` — the
  prior entity-decode-then-tag-strip company-direct pattern this spec
  extends (third cohort member to use the entity-decode pipeline; uses
  the apex-www marketing-site careers proxy variant).
- `packages/plugins/source-company-duolingo/src/duolingo.service.ts` —
  the second cohort member to use the entity-decode pipeline; uses
  the careers-subdomain marketing-site careers proxy variant.
- `packages/plugins/source-company-klaviyo/src/klaviyo.service.ts` —
  the first cohort member to use the entity-decode pipeline; uses
  the apex-domain marketing-site careers index variant.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
