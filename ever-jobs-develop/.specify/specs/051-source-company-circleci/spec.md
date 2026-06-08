# Spec: 051 — Source Company Plugin: CircleCI

| Field          | Value                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 051                                                                                                                                                         |
| Slug           | source-company-circleci                                                                                                                                     |
| Status         | accepted                                                                                                                                                    |
| Owner          | claude (run #261)                                                                                                                                           |
| Created        | 2026-05-02                                                                                                                                                  |
| Last updated   | 2026-05-02                                                                                                                                                  |
| Supersedes     | (none)                                                                                                                                                      |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050 |

## 1. Problem Statement

Run #260's Spec 050 closed the gap that the company-direct catalogue had no
entry for the dominant **CI/CD pipeline + test-execution +
distributed-build-orchestration** vendor (Buildkite Pty Ltd). The same gap
remains for the original **continuous-integration-as-a-service /
hosted-Docker-CI** vendor — CircleCI (Circle Internet Services, Inc.;
founded by Paul Biggar and Allen Rose in 2011 in San Francisco as the
hosted-CI competitor to Travis CI; operator of CircleCI Cloud (the
hosted SaaS pipeline runner across Linux / macOS / Windows / Arm64
executors), CircleCI Server (the on-prem deployment for regulated
customers), CircleCI Insights (the pipeline analytics + flaky-test
detection product), CircleCI Runner (the self-hosted agent for hybrid
deployments), and the CircleCI Orbs registry (the reusable pipeline-step
marketplace) lines that anchor the developer-controlled CI/CD category
alongside Buildkite, GitHub Actions, GitLab CI, Jenkins, Travis CI,
TeamCity, Bamboo, AWS CodeBuild, and Azure Pipelines) — whose
multi-hundred-employee engineering, design, sales, and customer-success
hiring across the United States / Canada / United Kingdom / Mexico hubs
puts its corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, and Buildkite.
Aggregator-callers asking for "all jobs at major developer-tools
vendors" must currently either (a) deduce the Greenhouse slug `circleci`
and call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name match. Both
paths bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`circleci` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-nine times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite).

## 2. Goals

- Ship a `source-company-circleci` plugin returning live `JobPostDto` rows
  for the public CircleCI careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-brex` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.CIRCLECI` enum value, `id` prefixed `circleci-`) — Brex is the
  closest structural cousin because both publish through an apex-www
  marketing-site `absolute_url` shape (variant 5 family), both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline, AND both emit a
  wire `company_name` that the JobPostDto pins as a string literal.
  CircleCI introduces a new structural deviation isolated to the
  fallback URL shape — the seventh distinct wire-shape variant in the
  cohort — because CircleCI's tenant publishes its `absolute_url` on the
  HTTP scheme (not HTTPS) with a `/careers/jobs/<id>/` path-with-
  trailing-slash (`http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>`),
  distinct from Brex's `https://www.brex.com/careers/<id>?gh_jid=<id>`.
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case CircleCI.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'circleci'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-brex` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover CircleCI's USD / CAD / GBP / MXN listings (United States /
  Canada / United Kingdom / Mexico hubs) without modification.
- Backfilling historical CircleCI postings — only the open-roles slice
  the Greenhouse public API returns.
- HTTPS upgrade of the wire `absolute_url` — CircleCI's tenant publishes
  the wire URL on the HTTP scheme; the plugin pins the wire shape
  byte-for-byte for byte-equivalence with the wire payload (D-04). A
  future spec can introduce a per-source URL-normalisation pass if
  needed.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CIRCLECI`** in the source
> registry, so that **a single `siteType: [Site.CIRCLECI]` request returns
> CircleCI's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the apex-www
> marketing-site shape (variant 5 family) with an HTTP scheme + trailing
> slash deviation (variant 7)**, so that **adding the next
> Greenhouse-only employer that publishes its `absolute_url` on a
> non-HTTPS scheme costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for CircleCI**, so that **a Greenhouse outage on the
> CircleCI board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CIRCLECI = 'circleci'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-circleci` under `packages/plugins/`.                | must     |
| FR-3  | `CircleCIService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `circleci-`, `site === Site.CIRCLECI`, and `companyName === 'CircleCI'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/circleci.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the apex-www marketing-site shape `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>` — HTTP scheme, trailing slash before query — preserving byte-equivalence with the wire `absolute_url` (Spec 051 § 10 D-04). | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[CircleCIModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-circleci/src/circleci.service.ts
@SourcePlugin({ site: Site.CIRCLECI, name: 'CircleCI', category: 'company' })
@Injectable()
export class CircleCIService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/circleci/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `circleci-${listing.id}`,
  site:         Site.CIRCLECI,
  title:        listing.title ?? '',
  companyName:  'CircleCI',
  jobUrl:       listing.absolute_url ?? `http://www.circleci.com/careers/jobs/${listing.id}/?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/circleci.service.spec.ts`):**
  1. NestJS DI resolves `CircleCIService` through `CircleCIModule`.
  2. `Site.CIRCLECI === 'circleci'` literal pin.
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

- **D-01 (run #261):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: CircleCI's
  `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>` apex-www
  marketing-site URL is the Greenhouse-canonical detail-page proxy on
  the wire (variant 7 family, the **seventh** distinct wire-shape variant
  observed across the cohort) and the Greenhouse public API is the
  canonical machine-readable feed for this tenant. We already exercise
  the exact same wire format from `source-company-buildkite`,
  `source-company-mercury`, `source-company-gusto`,
  `source-company-brex`, `source-company-duolingo`,
  `source-company-klaviyo`, `source-company-affirm`,
  `source-company-vercel`, `source-company-block`, `source-company-roblox`,
  `source-company-dropbox`, `source-company-instacart`,
  `source-company-datadog`, `source-company-mongodb`,
  `source-company-cloudflare`, `source-company-twilio`,
  `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`,
  `source-company-reddit`, `source-company-robinhood`,
  `source-company-airbnb`, `source-company-doordash`,
  `source-company-coinbase`, `source-company-discord`,
  `source-company-databricks`, and `source-company-anthropic`.
- **D-02 (run #261):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'circleci'`.
- **D-03 (run #261):** No salary parser hook beyond the helpers defaults
  — CircleCI posts USD / CAD / GBP / MXN ranges (United States / Canada /
  United Kingdom / Mexico hubs) inside the Greenhouse `content` field;
  Spec 014 / 015's parser already covers the relevant currencies without
  modification; no Spec 051-specific salary logic.
- **D-04 (run #261):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **apex-www marketing-site, HTTP scheme,
  path-with-trailing-slash-AND-query** template
  `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>`. Rationale:
  CircleCI's tenant publishes its `absolute_url` on the HTTP scheme
  (not HTTPS) with a `/careers/jobs/<id>/` path-with-trailing-slash
  before the query string — confirmed via run #261's HTTP 200 probe of
  the live API where the first job's `absolute_url` is
  `http://www.circleci.com/careers/jobs/8481915002/?gh_jid=8481915002`
  (every one of the 13 returned jobs uses HTTP, no HTTPS). This is the
  **seventh** distinct wire-shape variant observed across the cohort:
  (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` — used by 31
  plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel, Affirm,
  Gusto, Mercury, and Buildkite; (3) marketing-site
  `<company>.com/careers/jobs?gh_jid=<id>` — used by Klaviyo (apex
  domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query); (6) EU-region permalink subdomain
  `job-boards.eu.greenhouse.io/<slug>/jobs/<id>` — observed on
  `rampnetwork`, queued for a future run; (7) **THIS SPEC** —
  `http://www.<company>.com/careers/jobs/<id>/?gh_jid=<id>` — apex-www
  domain, path-with-`jobs`-segment-AND-trailing-slash-AND-query, HTTP
  scheme. The fallback uses the wire-shape
  `http://www.circleci.com/careers/jobs/<id>/?gh_jid=<id>` exactly for
  byte-equivalence with the wire `absolute_url`. Functional impact is
  zero because Greenhouse populates `absolute_url` on every CircleCI
  listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). **CircleCI is the first plugin in the cohort to
  publish its `absolute_url` on the HTTP scheme** — every prior plugin
  uses HTTPS unconditionally — so the fallback URL pins HTTP exactly
  to match the wire byte-for-byte. The unit-test happy path includes
  a regression guard asserting the wire `absolute_url` flows through
  to `jobUrl` byte-for-byte AND that the emitted `jobUrl` starts with
  `http://` (locking the HTTP scheme, the trailing-slash-before-query
  construction, and the apex-www prefix against future refactors that
  might naively HTTPS-upgrade or drop the trailing slash).
- **D-05 (run #261):** Use Greenhouse slug `circleci` (the bare brand
  name, lowercase). Rationale: like Buildkite (Spec 050 § 10 D-05),
  Mercury (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec
  047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 §
  10 D-05), Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05),
  Block (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox
  (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05), and unlike
  Robinhood (Spec 026 § 10 D-05), CircleCI's Greenhouse tenant is
  published at the bare `circleci` slug with no slug-vs-display-name
  asymmetry; the slug is the company brand name lowercase (the embedded
  `CI` acronym collapses to lowercase in the slug). Confirmed via run
  #261's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/circleci/jobs?content=true`.
- **D-06 (run #261):** Class names are `CircleCIService` /
  `CircleCIModule` (PascalCase preserving the trademark embedded-acronym
  casing `CircleCI`). Rationale: matches the OpenAI precedent
  (`OpenAIService` / `OpenAIModule`) of preserving the brand's two-letter
  initialism in its trademark form rather than collapsing it to
  `CirclecIService`/`CircleCiService` Pascal-case-style. The OpenAI
  plugin has shipped against this convention since Phase 6 with no
  caller-side issue.
- **D-07 (run #261):** Selected from the carry-over named-candidate
  pool from Spec 050's nine HTTP-200 probe-sweep candidates (`circleci`,
  `hubspot`, `netlify`, `postman`, `rampnetwork`, `toast`, `webflow`,
  `zoominfo` — Buildkite shipped from this pool in run #260). CircleCI
  picked as the alphabetically-first remaining bite (`cir` < `hub` <
  `net` < `pos` < `ram` < `toa` < `web` < `zoo`) and as a natural
  developer-tools-cohort sibling to Buildkite (both are CI/CD
  vendors). The eight remaining candidates queue up for runs #262+:
  HubSpot (alphabetically next at `hub`), Netlify, Postman, Ramp Network
  (variant 6 EU-region subdomain), Toast, Webflow, ZoomInfo, plus a
  fresh probe sweep pivot if all pre-probed candidates ship.
- **D-08 (run #261):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 §
  10 D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08),
  Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08),
  CircleCI's tenant emits HTML-entity-encoded content (`&lt;p&gt;...`)
  rather than raw HTML tags (`<p>...`) — confirmed via run #261's HTTP
  probe of the live API where the first job's `content` starts with
  `&lt;h3 data-start=&quot;545&quot; data-end=&quot;563&quot;&gt;About the
  Role&lt;/h3&gt;`. Applying `stripHtmlTags()` alone to that wire
  payload would leave the literal entities in place (because they are
  not actual `<…>` tags), producing user-facing descriptions full of
  `&lt;h3&gt;` and `&quot;` substrings. Decoding entities **first**
  (turning `&lt;h3&gt;` into `<h3>` and `&quot;` into `"`) and then
  stripping tags (turning `<h3>About the Role</h3>` into `About the
  Role`) yields clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded), (b) does not contain `&quot;`
  (named entities decoded), and (c) does not contain `<p>` or `<h3>`
  (tags stripped after the decode pass), so a future refactor that
  swaps the order or drops one half of the pipeline would surface as
  a test diff. This is the **seventh** company-direct plugin in the
  cohort to use the entity-decode-then-tag-strip pipeline (the first
  six being Klaviyo, Duolingo, Brex, Gusto, Mercury, and Buildkite).
  Notably, this is the **first** plugin in the cohort to combine the
  apex-www marketing-site path-with-`jobs`-segment shape (variant 7)
  with the entity-decode-then-tag-strip pipeline.
- **D-09 (run #261):** Emit the wire `company_name` `CircleCI` directly
  (no brand-name trim required). Rationale: CircleCI's wire
  `company_name` is the bare brand name `CircleCI` — confirmed via run
  #261's HTTP probe of the live API where every one of the 13 returned
  jobs has `company_name === "CircleCI"` (no `, Inc.` suffix, no
  `Internet Services` legal-entity suffix). This matches Buildkite
  (Spec 050 § 10 D-09) and Mercury (Spec 049 § 10 D-09) — all three
  pin the brand name byte-for-byte against the wire — and contrasts
  with Gusto (Spec 048 § 10 D-09) and Affirm (Spec 044 § 10 D-06), both
  of which emit a wire `company_name` with a legal-entity suffix that
  needed cleaning to the brand name. The plugin pins
  `companyName === 'CircleCI'` as a string literal in the `JobPostDto`
  mapping (rather than reading `listing.company_name`) for byte-stable
  consistency with the other thirty-nine company-direct plugins —
  every prior company-direct plugin uses a string literal for
  `companyName`, and CircleCI follows the same convention. The
  unit-test happy path asserts the emitted `companyName === 'CircleCI'`
  to lock the brand-name pin against future refactors that might
  mistakenly read the wire payload.
- **D-10 (run #261):** No wire-title `.trim()` deviation. Rationale:
  unlike Brex (Spec 047 § 10 D-10) and Buildkite (Spec 050 § 10 D-10)
  whose tenants pad a subset of role titles with surrounding ASCII
  spaces, CircleCI's tenant emits clean trimmed titles in every observed
  listing — confirmed via run #261's HTTP probe of the live API where
  all 13 returned jobs have titles with no leading or trailing
  whitespace (e.g. `'AI Community Engineer'`, `'CircleCI Associate
  Rotation Program (New/Recent Grads)'`, `'Software Engineer,
  Execution'`). Skipping the trim is consistent with the Mercury / Gusto
  / Klaviyo template (35 of 39 prior cohort plugins skip the trim; only
  Brex and Buildkite apply it).

## 11. References

- `packages/plugins/source-company-brex/src/brex.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 047 / run #257; uses an apex-www marketing-site path-AND-query
  `absolute_url` shape — the same variant-5-family wire shape CircleCI
  uses with the variant-7 HTTP-scheme + trailing-slash deviation —
  AND the entity-decode-then-tag-strip description pipeline).
- `packages/plugins/source-company-buildkite/src/buildkite.service.ts` —
  the prior CI/CD-cohort plugin (Spec 050 / run #260; sibling
  developer-tools vendor; uses the new `job-boards.greenhouse.io`
  permalink subdomain — variant 2 — with the entity-decode pipeline).
- `packages/plugins/source-company-openai/src/openai.service.ts` —
  the precedent for preserving an embedded-acronym brand casing in
  PascalCase (`OpenAIService` / `OpenAIModule`); CircleCI follows the
  same convention as `CircleCIService` / `CircleCIModule`.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
