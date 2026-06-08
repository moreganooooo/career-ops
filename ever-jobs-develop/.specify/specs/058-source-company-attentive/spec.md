# Spec: 058 — Source Company Plugin: Attentive

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 058                                                                                                                                                                                    |
| Slug           | source-company-attentive                                                                                                                                                               |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #268)                                                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057 |

## 1. Problem Statement

Run #267's Spec 057 closed out the carry-over named-candidate pool from
Spec 050's nine-200 probe sweep by shipping the **B2B go-to-market
intelligence / sales-and-marketing data platform** vendor (ZoomInfo) with
the **first plugin in the cohort to use wire-shape variant 9** — the
apex-www brand-domain marketing-site shape `https://www.zoominfo.com/
careers?gh_jid=<id>` — and queued runs #268+ for a fresh probe sweep of
the next batch of large-employer candidates. The catalogue still has no
entry for the dominant **AI-native conversational-commerce / SMS &
email-marketing platform** vendor — Attentive (Attentive Mobile Inc.;
founded by Brian Long and Andrew Jones in 2016 in New York City; one of
the fastest-growing SaaS companies in the SMS-marketing category;
currently a private unicorn after Series E rounds led by Coatue, Bain
Capital Ventures, and Sequoia Capital that valued the company at ~$7B
before the 2022 down-round; now operating with its New York City
headquarters plus offices in San Francisco, London, and a remote-first
posture across the United States, Canada, the United Kingdom, and the
European Union; operator of Attentive AI (the conversational-AI agent
brand), Attentive Email (the email-marketing product), Attentive SMS
(the SMS-marketing flagship), Attentive Mobile App (the in-app
messaging surface), Attentive Concierge (the AI-assisted shopping
agent), and Attentive Affinity (the loyalty / lifecycle product) lines
that anchor the AI-marketing category alongside Klaviyo, Iterable,
Braze, OneSignal, MoEngage, Twilio Engage, and HubSpot Marketing). Its
multi-thousand-employee engineering, product, sales, marketing,
customer-success, and corporate hiring across New York City / San
Francisco / London and remote-first across North America and Europe
puts its corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, and ZoomInfo.
Aggregator-callers asking for "all jobs at major AI-marketing /
conversational-commerce / SMS-marketing vendors" must currently either
(a) deduce the Greenhouse slug `attentive` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match — both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`attentive` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-six times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman, Toast, Webflow, ZoomInfo).

## 2. Goals

- Ship a `source-company-attentive` plugin returning live `JobPostDto`
  rows for the public Attentive careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-webflow` plugin (Greenhouse-backed, `category:
  'company'`, `Site.ATTENTIVE` enum value, `id` prefixed `attentive-`) —
  Webflow is the closest structural cousin because both publish their
  `absolute_url` on wire-shape variant 2 (the US-region permalink
  subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`) AND
  both emit HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND both have a
  wire `company_name` that matches the brand byte-for-byte (no D-09
  trim needed). Attentive introduces **one structural deviation** from
  the Webflow template: a subset of Attentive wire titles carry trailing
  ASCII-space padding (4 of 59 titles in the run-268 probe — e.g.
  `'Director of Engineering, Intelligent Messaging '`,
  `'Principal Technical Program Manager '`,
  `'Staff Software Engineer, Streaming '`,
  `'Support Engineer (West) '`) that the plugin trims with `.trim()`
  before emitting (D-10 — fourth cohort plugin to apply a wire-title
  trim, after Brex `Spec 047 § 10 D-10`, Buildkite `Spec 050 § 10
  D-10`, and ZoomInfo `Spec 057 § 10 D-10`).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Attentive.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'attentive'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-webflow` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Attentive's USD / GBP / EUR ranges (New York
  City / San Francisco / London / remote-NA / remote-EU) without
  modification.
- Backfilling historical Attentive postings — only the open-roles slice
  the Greenhouse public API returns.
- Wire-shape variant fingerprinting beyond the existing variant 2 lock —
  Attentive publishes its `absolute_url` on the same US-region permalink
  subdomain as Webflow / Postman / Netlify / Buildkite / Mercury /
  Gusto / Affirm / Vercel; the plugin treats variant 2 as a frozen
  shape and uses the byte-for-byte template fallback.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ATTENTIVE`** in the source
> registry, so that **a single `siteType: [Site.ATTENTIVE]` request returns
> Attentive's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2,
> the entity-decode-then-tag-strip description pipeline, AND a wire-title
> `.trim()`**, so that **adding the next Greenhouse-only employer that
> publishes its `absolute_url` on the US-region permalink subdomain with
> intermittently padded wire titles costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Attentive**, so that **a Greenhouse outage on the
> Attentive board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ATTENTIVE = 'attentive'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-attentive` under `packages/plugins/`.               | must     |
| FR-3  | `AttentiveService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `attentive-`, `site === Site.ATTENTIVE`, and `companyName === 'Attentive'` (D-09 wire `company_name` matches brand byte-for-byte; see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/attentive.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region permalink-subdomain** shape `https://job-boards.greenhouse.io/attentive/jobs/<id>` — variant 2 (the **ninth** plugin in the cohort to use this shape; Spec 058 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to the wire `title` before downstream filters and the `JobPostDto` emit. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[AttentiveModule]})` resolves.  |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-attentive/src/attentive.service.ts
@SourcePlugin({ site: Site.ATTENTIVE, name: 'Attentive', category: 'company' })
@Injectable()
export class AttentiveService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/attentive/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `attentive-${listing.id}`,
  site:         Site.ATTENTIVE,
  title:        (listing.title ?? '').trim(),
  companyName:  'Attentive',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/attentive/jobs/${listing.id}`,
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

- **Unit (`__tests__/attentive.service.spec.ts`):**
  1. NestJS DI resolves `AttentiveService` through `AttentiveModule`.
  2. `Site.ATTENTIVE === 'attentive'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive — post-trim).
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

- **D-01 (run #268):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Attentive's
  `https://job-boards.greenhouse.io/attentive/jobs/<id>` US-region
  permalink subdomain URL is the canonical machine-readable feed for
  this tenant. We already exercise the exact same wire format from
  `source-company-webflow`, `source-company-postman`,
  `source-company-netlify`, `source-company-buildkite`,
  `source-company-mercury`, `source-company-gusto`,
  `source-company-affirm`, `source-company-vercel`,
  `source-company-rampnetwork` (with `.eu` region prefix), and the
  variants applied for `source-company-toast`, `source-company-zoominfo`,
  `source-company-circleci`, `source-company-brex`,
  `source-company-duolingo`, `source-company-klaviyo` (with marketing-
  site overrides). We already exercise the broader Greenhouse public-
  API pattern from `source-company-block`, `source-company-roblox`,
  `source-company-dropbox`, `source-company-instacart`,
  `source-company-datadog`, `source-company-mongodb`,
  `source-company-cloudflare`, `source-company-twilio`,
  `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`,
  `source-company-plaid`, `source-company-lyft`,
  `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #268):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'attentive'`.
- **D-03 (run #268):** No salary parser hook beyond the helpers
  defaults — Attentive posts USD / GBP / EUR ranges (New York City /
  San Francisco / London / remote-NA / remote-EU HQ + offices) inside
  the Greenhouse `content` field; Spec 014 / 015's parser already
  covers the relevant currencies without modification; no Spec
  058-specific salary logic.
- **D-04 (run #268):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink-subdomain**
  template `https://job-boards.greenhouse.io/attentive/jobs/<id>` —
  wire-shape variant 2. This is the **ninth** plugin in the cohort to
  use variant 2 (after Vercel, Affirm, Gusto, Mercury, Buildkite,
  Netlify, Postman, and Webflow). Rationale: Attentive's tenant
  publishes its `absolute_url` on this shape — confirmed via run #268's
  HTTP 200 probe of the live API where the first job's `absolute_url`
  is `https://job-boards.greenhouse.io/attentive/jobs/4187911009`.
  Functional impact is zero because Greenhouse populates `absolute_url`
  on every Attentive listing in practice (the fallback is a defence-in-
  depth path Greenhouse has not actually exercised against this tenant
  in the audit window). The unit-test happy path includes a regression
  guard asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/attentive/jobs/`
  substring (locking the variant-2 shape against future refactors that
  might naively normalise to a marketing-site template).
- **D-05 (run #268):** Use Greenhouse slug `attentive` (the lowercase
  brand name). Rationale: like Webflow (Spec 056 § 10 D-05), Toast
  (Spec 055 § 10 D-05), Postman (Spec 054 § 10 D-05), Netlify (Spec
  053 § 10 D-05), Ramp Network (Spec 052 § 10 D-05), CircleCI (Spec
  051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury (Spec 049
  § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05),
  Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm
  (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec 042
  § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10
  D-05), Instacart (Spec 039 § 10 D-05), ZoomInfo (Spec 057 § 10
  D-05), and unlike Robinhood (Spec 026 § 10 D-05), Attentive's
  Greenhouse tenant is published at the slug `attentive` with no
  slug-vs-display-name asymmetry. Confirmed via run #268's HTTP 200
  probe of `https://api.greenhouse.io/v1/boards/attentive/jobs?
  content=true` (59 open roles returned).
- **D-06 (run #268):** Class names are `AttentiveService` /
  `AttentiveModule` (PascalCase from the bare-brand single-word name).
  Rationale: matches the convention Attentive's own marketing /
  GitHub / Crunchbase pages use for class-style references to the
  brand (`Attentive`), and aligns with the existing repo PascalCase
  convention for single-word brands (e.g. `WebflowService`,
  `PostmanService`, `NetlifyService`, `MercuryService`).
- **D-07 (run #268):** Selected from the **fresh probe sweep** that
  this run pivoted to per Spec 057's run-267 close-out (the carry-over
  named-candidate pool from Spec 050's nine-200 sweep was fully
  exhausted at the close of Spec 057). The run-268 fresh probe sweep
  hit eighteen large-employer Greenhouse-candidate slugs (`snyk`,
  `1password`, `canva`, `chime`, `intercom`, `mixpanel`, `gong`,
  `attentive`, `rippling`, `hashicorp`, `elastic`, `snowflake`,
  `huggingface`, `replicate`, `hubspot`, `benchling`, `segment`,
  `automattic`) and returned HTTP 200 on **six**: `attentive` (59 open
  roles), `chime` (72 open roles), `elastic` (193 open roles),
  `hubspot` (`meta.total === 0` — seventh consecutive empty re-probe),
  `intercom` (174 open roles), `mixpanel` (51 open roles). Attentive
  picked as the **alphabetically-first** bite from the live-board set
  (`att` < `chi` < `ela` < `hub` < `int` < `mix`); the four remaining
  candidates with non-empty boards (Chime, Elastic, Intercom, Mixpanel)
  queue up for runs #269+, plus a HubSpot re-probe pivot.
- **D-08 (run #268):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like ZoomInfo (Spec 057 § 10 D-08), Webflow
  (Spec 056 § 10 D-08), Toast (Spec 055 § 10 D-08), Postman (Spec 054
  § 10 D-08), Netlify (Spec 053 § 10 D-08), Ramp Network (Spec 052
  § 10 D-08), CircleCI (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10
  D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10 D-08),
  Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and
  Klaviyo (Spec 045 § 10 D-08), Attentive's tenant emits HTML-entity-
  encoded content (`&lt;div class=&quot;content-intro&quot;&gt;&lt;
  div&gt;Attentive® is the AI marketing platform for 1:1
  personalization redefining the way brands and people connect`)
  rather than raw HTML tags — confirmed via run #268's HTTP probe of
  the live API. Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text. The
  pipeline is order-sensitive — `decodeHtmlEntities()` must run
  before `stripHtmlTags()`. The unit-test happy path asserts the
  cleaned description (a) does not contain `&lt;` (entities decoded),
  (b) does not contain `&quot;` (named entities decoded), (c) does
  not contain `&#39;` (numeric entities decoded), and (d) does not
  contain `<p>`, `<div>`, `<strong>`, or `<em>` (tags stripped after
  the decode pass), so a future refactor that swaps the order or
  drops one half of the pipeline would surface as a test diff. This
  is the **fourteenth** company-direct plugin in the cohort to use
  the entity-decode-then-tag-strip pipeline.
- **D-09 (run #268):** Emit the brand name `'Attentive'` byte-for-
  byte. Rationale: Attentive's wire `company_name` is the literal
  string `'Attentive'` (the bare brand name; no legal-entity suffix —
  unlike ZoomInfo's `'ZoomInfo Technologies LLC'`, Affirm's
  `'Affirm, Inc.'`, or Gusto's `'Gusto, Inc.'`). The plugin pins
  `companyName === 'Attentive'` as a string literal in the
  `JobPostDto` mapping rather than reading `listing.company_name`
  directly because the literal-pin form matches the pattern every
  other Greenhouse-backed company-direct plugin in the catalogue uses
  (and is robust against an upstream tenant-rename to add a future
  legal-entity suffix). The unit-test happy path asserts (a) the
  emitted `companyName === 'Attentive'` byte-for-byte AND (b) the
  emitted `companyName === fixture.jobs[0].company_name` (locking
  the wire-shape regression guard against the upstream tenant
  changing its registered legal-entity name).
- **D-10 (run #268):** `.trim()` deviation on the wire `title`.
  Rationale: a subset of Attentive wire titles carry trailing ASCII-
  space padding (4 of 59 titles in the run-268 probe — e.g.
  `'Director of Engineering, Intelligent Messaging '`,
  `'Principal Technical Program Manager '`,
  `'Staff Software Engineer, Streaming '`,
  `'Support Engineer (West) '`, similar to the Brex / Buildkite /
  ZoomInfo tenants). Without the trim, `JobPostDto.title` would emit
  the wire-pad bytes through to consumers, and `searchTerm`'s
  `title.toLowerCase().includes(term)` filter would still work for
  prefix matches but would silently fail on equality-style consumer-
  side filters. The plugin applies `.trim()` to the wire `title`
  before the empty-title skip check AND before the `searchTerm`
  filter AND before the `JobPostDto` emit, so the emitted `title` is
  the trimmed form. This is the **fourth** plugin in the cohort to
  apply a wire-title trim (after Brex `Spec 047 § 10 D-10`, Buildkite
  `Spec 050 § 10 D-10`, and ZoomInfo `Spec 057 § 10 D-10`). The
  unit-test happy path includes a regression guard asserting (a) the
  emitted `title` has no leading or trailing whitespace AND (b) for
  the padded-fixture-listing case, the emitted `title !==
  fixture.title` (the trim observably fired).
- **D-11 (run #268):** The Attentive wire `departments[0].name`
  payload uses simple flat single-token department names (`'Finance'`,
  `'Engineering'`, `'Sales'`, `'Customer Success'`, `'Office of CSO'`,
  etc.) — distinct from ZoomInfo's numeric-code-prefix format,
  Toast's colon-separated nested-path format, Webflow's flat names,
  and Netlify's literal-ampersand bearing names. The plugin emits the
  wire string byte-for-byte (no normalisation, no token splitting) —
  consumers wanting per-department analytics get the wire form
  directly. The unit-test happy path includes a regression guard
  asserting (a) the emitted `department` for the first fixture
  listing matches the wire `departments[0].name` byte-for-byte AND
  (b) the case-insensitive `searchTerm` match on the literal
  `'engineering'` substring resolves the Engineering-department
  fixture listing.

## 11. References

- `packages/plugins/source-company-webflow/src/webflow.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 056 / run #266; uses variant 2 with the entity-decode pipeline
  and zero structural deviations from Postman).
- `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts` —
  the prior company-direct plugin (Spec 057 / run #267; the
  third-instance wire-title `.trim()` deviation cousin).
- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  the second-instance wire-title `.trim()` plugin (Spec 050 § 10 D-10).
- `packages/plugins/source-company-brex/src/brex.service.ts` —
  the first-instance wire-title `.trim()` plugin (Spec 047 § 10 D-10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
