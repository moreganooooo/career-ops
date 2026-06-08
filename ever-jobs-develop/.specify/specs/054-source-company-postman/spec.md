# Spec: 054 — Source Company Plugin: Postman

| Field          | Value                                                                                                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 054                                                                                                                                                                              |
| Slug           | source-company-postman                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                         |
| Owner          | claude (run #264)                                                                                                                                                                |
| Created        | 2026-05-02                                                                                                                                                                       |
| Last updated   | 2026-05-02                                                                                                                                                                       |
| Supersedes     | (none)                                                                                                                                                                           |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053 |

## 1. Problem Statement

Run #263's Spec 053 closed the gap that the company-direct catalogue had no
entry for the dominant **edge-deployed Jamstack hosting and serverless-functions**
vendor (Netlify) and added the **sixth** plugin to use wire-shape variant 2 (the
US-region permalink subdomain `https://job-boards.greenhouse.io/<slug>/jobs/<id>`).
The catalogue still has no entry for the dominant **API development platform**
vendor — Postman (Postman, Inc.; founded by Abhinav Asthana, Ankit Sobti, and
Abhijit Kane in 2014 in Bangalore, now headquartered in San Francisco; operator
of Postman Workspaces (the per-team API collaboration surface), Postman
Collections (the shareable request-bundle primitive every API team uses),
Postman Mock Servers (the rapid-prototype mock-API runtime), Postman Monitors
(the scheduled API-uptime monitoring product), Postman Flows (the no-code
visual API workflow builder), Postman API Network (the public discovery
catalogue used by 45M+ developers and 500,000+ organisations including 98% of
the Fortune 500), Postman Public Workspaces (the OSS-style public collaboration
layer), Postman Governance (the enterprise API-quality / compliance product),
and Postman Enterprise (the SOC 2 / SSO / audit-log SKU)) lines that anchor the
API-tooling category alongside Insomnia (Kong), Bruno, Hoppscotch, Stoplight,
and Apidog. Its multi-thousand-employee engineering, product, marketing, sales,
ecosystem, and developer-relations hiring across San Francisco, Boston, New
York, Austin, Tokyo, London, and Bangalore puts its corporate openings on the
same "marquee company-direct" tier as Anthropic, Databricks, Discord, Coinbase,
DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma,
Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury,
Buildkite, CircleCI, Ramp Network, and Netlify. Aggregator-callers asking for
"all jobs at major API-tooling / developer-platform vendors" must currently
either (a) deduce the Greenhouse slug `postman` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match. Both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and breaker
scoping.

The gap closes when we add a thin company-direct plugin pinning the
`postman` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-two times (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox,
Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury,
Buildkite, CircleCI, Ramp Network, Netlify).

## 2. Goals

- Ship a `source-company-postman` plugin returning live `JobPostDto` rows
  for the public Postman careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-netlify` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.POSTMAN` enum value, `id` prefixed `postman-`) — Netlify is the
  closest structural cousin because both publish through the new
  `job-boards.greenhouse.io` permalink subdomain family (variant 2) AND emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND emit a wire
  `company_name` matching the bare brand name byte-for-byte (no legal-entity
  suffix). Postman introduces zero new structural deviations — it is the
  **seventh** plugin in the cohort to use variant 2 (the US-region permalink
  subdomain `job-boards.greenhouse.io`), the **tenth** plugin to use the
  entity-decode-then-tag-strip description pipeline, and follows the
  Netlify / Buildkite / Mercury / CircleCI / Ramp Network template for
  brand-name pinning (single-word brand `Postman` matches the wire
  `company_name` byte-for-byte).
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at least
  five failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Postman.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'postman'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-netlify` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Postman's USD / GBP / JPY / INR listings (San
  Francisco / Boston / New York / Austin / Tokyo / London / Bangalore) without
  modification.
- Backfilling historical Postman postings — only the open-roles slice
  the Greenhouse public API returns.
- Wire-content-intro `<div class="content-intro">` paragraph stripping —
  Postman's `content` payload after entity decoding starts with a
  `<div class="content-intro">` wrapper carrying the standard "Who Are We?"
  recruiter blurb. The entity-decode-then-tag-strip pipeline already strips
  the wrapping `<div>` tag, leaving the literal "Who Are We?" / "About Postman"
  text in place; the plugin does not apply a per-source filter to drop
  the content-intro section. A future spec can introduce a generic
  Greenhouse content-intro stripper if needed across multiple tenants.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.POSTMAN`** in the source
> registry, so that **a single `siteType: [Site.POSTMAN]` request returns
> Postman's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io` permalink-subdomain family (variant 2) with
> the entity-decode-then-tag-strip description pipeline AND the
> content-intro-wrapper pass-through**, so that **adding the next
> Greenhouse-only employer that publishes its `absolute_url` on the
> US-region subdomain costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Postman**, so that **a Greenhouse outage on the Postman
> board does not trip the breaker for every other Greenhouse tenant**
> the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.POSTMAN = 'postman'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-postman` under `packages/plugins/`.                 | must     |
| FR-3  | `PostmanService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `postman-`, `site === Site.POSTMAN`, and `companyName === 'Postman'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/postman.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region** permalink-subdomain shape `https://job-boards.greenhouse.io/postman/jobs/<id>` — variant 2 (the seventh plugin in the cohort to use this shape, after Vercel, Affirm, Gusto, Mercury, Buildkite, and Netlify; Spec 054 § 10 D-04). | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[PostmanModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-postman/src/postman.service.ts
@SourcePlugin({ site: Site.POSTMAN, name: 'Postman', category: 'company' })
@Injectable()
export class PostmanService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/postman/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `postman-${listing.id}`,
  site:         Site.POSTMAN,
  title:        listing.title ?? '',
  companyName:  'Postman',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/postman/jobs/${listing.id}`,
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

- **Unit (`__tests__/postman.service.spec.ts`):**
  1. NestJS DI resolves `PostmanService` through `PostmanModule`.
  2. `Site.POSTMAN === 'postman'` literal pin.
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

- **D-01 (run #264):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Postman's
  `https://job-boards.greenhouse.io/postman/jobs/<id>` US-region
  permalink-subdomain URL is the Greenhouse-canonical detail-page proxy on
  the wire (variant 2 family) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise the
  exact same wire format from `source-company-netlify`,
  `source-company-rampnetwork`, `source-company-circleci`,
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
- **D-02 (run #264):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'postman'`.
- **D-03 (run #264):** No salary parser hook beyond the helpers defaults
  — Postman posts USD / GBP / JPY / INR ranges (San Francisco / Boston /
  New York / Austin / Tokyo / London / Bangalore HQ + offices) inside the
  Greenhouse `content` field; Spec 014 / 015's parser already covers the
  relevant currencies without modification; no Spec 054-specific salary
  logic.
- **D-04 (run #264):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink-subdomain** template
  `https://job-boards.greenhouse.io/postman/jobs/<id>` — variant 2.
  Rationale: Postman's tenant publishes its `absolute_url` on the
  US-region Greenhouse permalink subdomain `job-boards.greenhouse.io`
  (the same subdomain Vercel, Affirm, Gusto, Mercury, Buildkite, and
  Netlify use) rather than the EU-region `job-boards.eu.greenhouse.io`
  Ramp Network introduced in Spec 052 — confirmed via run #264's HTTP 200
  probe of the live API where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/postman/jobs/6340592003`. This is the
  **seventh** plugin in the cohort to use variant 2 (after Vercel,
  Affirm, Gusto, Mercury, Buildkite, and Netlify). Functional impact is
  zero because Greenhouse populates `absolute_url` on every Postman
  listing in practice (the fallback is a defence-in-depth path Greenhouse
  has not actually exercised against this tenant in the audit window).
  The unit-test happy path includes a regression guard asserting the
  wire `absolute_url` flows through to `jobUrl` byte-for-byte AND that
  the emitted `jobUrl` contains the literal `job-boards.greenhouse.io`
  substring (locking the US-region subdomain against future refactors
  that might naively normalise to the EU-region subdomain).
- **D-05 (run #264):** Use Greenhouse slug `postman` (the lowercase
  brand name). Rationale: like Netlify (Spec 053 § 10 D-05), Ramp Network
  (Spec 052 § 10 D-05), CircleCI (Spec 051 § 10 D-05), Buildkite (Spec
  050 § 10 D-05), Mercury (Spec 049 § 10 D-05), Gusto (Spec 048 § 10
  D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05),
  Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044 § 10 D-05), Vercel
  (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05), Roblox (Spec 041 §
  10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Postman's Greenhouse tenant
  is published at the slug `postman` with no slug-vs-display-name
  asymmetry. Confirmed via run #264's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/postman/jobs?content=true`.
- **D-06 (run #264):** Class names are `PostmanService` /
  `PostmanModule` (PascalCase splitting on the single-word brand name).
  Rationale: matches the convention Postman's own marketing /
  GitHub / Crunchbase pages use for class-style references to the brand
  (`Postman`), and aligns with the existing repo PascalCase convention
  for single-word brands (e.g. `BuildkiteService`, `NetlifyService`,
  `MercuryService`).
- **D-07 (run #264):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`
  shipped run #261; `rampnetwork` shipped run #262; `netlify` shipped
  run #263; `hubspot`, `postman`, `toast`, `webflow`, `zoominfo`
  remained queued). Run #264's start-of-run probe of `postman` returned
  HTTP 200 with 10 open roles. Postman is alphabetically the next
  remaining candidate (`pos` < `toa` < `web` < `zoo`; HubSpot continues
  to be deferred — last re-probed at run-262 start with `meta.total ===
  0`). The remaining candidates queue up for runs #265+: Toast (variant
  8 — careers-subdomain on a sub-brand `toasttab.com`, ~332 jobs
  observed in Spec 050 sweep — notable structural deviation), Webflow
  (variant 2, ~31 jobs), ZoomInfo (variant 3 family — apex-www
  `careers?gh_jid=<id>`, ~82 jobs, with a wire `company_name`
  `'ZoomInfo Technologies LLC'` legal-entity suffix to clean — first
  since Affirm / Gusto), HubSpot re-probe, plus a fresh probe sweep
  pivot if all pre-probed candidates ship.
- **D-08 (run #264):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Netlify (Spec 053 § 10 D-08), Ramp Network (Spec 052
  § 10 D-08), CircleCI (Spec 051 § 10 D-08), Buildkite (Spec 050 § 10
  D-08), Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10 D-08), Brex
  (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec
  045 § 10 D-08), Postman's tenant emits HTML-entity-encoded content
  (`&lt;div class=&quot;content-intro&quot;&gt;&lt;h2&gt;&lt;strong&gt;
  Who Are We?&lt;/strong&gt;&lt;/h2&gt;...`) rather than raw HTML tags
  (`<div class="content-intro">...`) — confirmed via run #264's HTTP
  probe of the live API where the first job's `content` starts with
  `&lt;div class=&quot;content-intro&quot;&gt;`. Applying
  `stripHtmlTags()` alone to that wire payload would leave the literal
  entities in place (because they are not actual `<…>` tags), producing
  user-facing descriptions full of `&lt;strong&gt;` and `&quot;`
  substrings. Decoding entities **first** (turning `&lt;strong&gt;`
  into `<strong>` and `&quot;` into `"`) and then stripping tags
  (turning `<strong>Who Are We?</strong>` into `Who Are We?`) yields
  clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), (c) does not contain `&#39;` (numeric
  entities decoded), and (d) does not contain `<p>`, `<strong>`, or
  `<div>` (tags stripped after the decode pass), so a future refactor
  that swaps the order or drops one half of the pipeline would surface
  as a test diff. This is the **tenth** company-direct plugin in the
  cohort to use the entity-decode-then-tag-strip pipeline (the first
  nine being Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
  CircleCI, Ramp Network, and Netlify).
- **D-09 (run #264):** Emit the wire `company_name` `'Postman'`
  directly (no brand-name trim required). Rationale: Postman's wire
  `company_name` is the bare brand name `'Postman'` — confirmed via run
  #264's HTTP probe of the live API where the returned job has
  `company_name === "Postman"` (no `, Inc.` suffix, no `Postman Inc.`
  legal-entity suffix). This matches Netlify (Spec 053 § 10 D-09), Ramp
  Network (Spec 052 § 10 D-09), CircleCI (Spec 051 § 10 D-09), Buildkite
  (Spec 050 § 10 D-09), and Mercury (Spec 049 § 10 D-09) — all six pin
  the brand name byte-for-byte against the wire — and contrasts with
  Gusto (Spec 048 § 10 D-09) and Affirm (Spec 044 § 10 D-06), both of
  which emit a wire `company_name` with a legal-entity suffix that
  needed cleaning to the brand name. The plugin pins `companyName ===
  'Postman'` as a string literal in the `JobPostDto` mapping (rather
  than reading `listing.company_name`) for byte-stable consistency with
  the other forty-two company-direct plugins — every prior
  company-direct plugin uses a string literal for `companyName`, and
  Postman follows the same convention. The unit-test happy path asserts
  the emitted `companyName === 'Postman'` to lock the brand-name pin
  against future refactors that might mistakenly read the wire payload.
- **D-10 (run #264):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, Postman's tenant emits clean trimmed titles in every
  observed listing — confirmed via run #264's HTTP probe of the live
  API where the returned jobs have titles with no leading or trailing
  whitespace (e.g. `'Account Development Representative'`, `'Account
  Development Representative (Danish Speaking)'`). Skipping the trim
  is consistent with the Netlify / CircleCI / Mercury / Gusto / Klaviyo
  / Ramp Network template (38 of 42 prior cohort plugins skip the trim;
  only Brex and Buildkite apply it).
- **D-11 (run #264):** The Postman wire `content` payload begins with a
  `<div class="content-intro">` wrapper (after entity decoding) carrying
  the standard "Who Are We?" recruiter blurb that introduces Postman to
  external candidates. The entity-decode-then-tag-strip pipeline
  (D-08) strips the wrapping `<div>` and `<h2>` tags and leaves the
  literal "Who Are We?" / "Postman is the world's leading API
  platform..." text in place. The plugin does **not** apply a per-source
  filter to drop the content-intro section — the `stripHtmlTags()`
  helper already neutralises the structural HTML, and the surviving
  prose is part of the listing's natural job-description body. The
  unit-test happy path includes a regression guard asserting (a) the
  cleaned description contains the literal "Postman" company-context
  string (so the content-intro pass-through is locked against future
  refactors that might naively drop the first paragraph), and (b)
  the cleaned description contains substrings from BOTH the
  content-intro section (`'world&#39;s leading API platform'`) AND the
  role-specific body (e.g. `'Account Development Representative'` /
  `'pipeline for the sales organization'`) so the
  decode-then-strip-pass-through is a complete-document operation.

## 11. References

- `packages/plugins/source-company-netlify/src/netlify.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 053 / run #263; uses the new `job-boards.greenhouse.io`
  permalink subdomain — variant 2 — with the entity-decode pipeline).
- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  the prior variant-2 plugin (Spec 050 / run #260; uses variant 2 with
  the entity-decode pipeline; structurally identical except for the
  brand-name pin and the wire-title `.trim()` deviation Postman does
  not share).
- `packages/plugins/source-company-mercury/src/mercury.service.ts` —
  the prior fintech-cohort plugin (Spec 049 / run #259; uses variant 2
  with the entity-decode pipeline; structurally identical except for
  the brand-name pin).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
