# Spec: 061 — Source Company Plugin: Intercom

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 061                                                                                                                                                                                    |
| Slug           | source-company-intercom                                                                                                                                                                |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #271)                                                                                                                                                                      |
| Created        | 2026-05-03                                                                                                                                                                             |
| Last updated   | 2026-05-03                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060 |

## 1. Problem Statement

Run #270's Spec 060 closed out by shipping the **dominant search /
observability / security analytics platform** vendor (Elastic) — the
**first plugin in the cohort to use wire-shape variant 11** (the
vanity-domain `https://jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>`
form) — and queued runs #271+ to walk the run-268 fresh-sweep live-board
pool alphabetically (`intercom` 174 jobs, `mixpanel` 51 jobs, plus a
HubSpot re-probe pivot). The catalogue still has no entry for the
dominant **AI-native customer-service / customer-messaging platform**
vendor — Intercom Inc. (founded by Eoghan McCabe, Des Traynor, David
Barrett, and Ciaran Lee in 2011 in San Francisco; currently a private
unicorn after Series D rounds led by Kleiner Perkins, Index Ventures,
ICONIQ Capital, and Bessemer Venture Partners that valued the company
at ~$1.275B before the 2022 down-round; now operating with its San
Francisco headquarters plus offices in Dublin (the engineering EMEA
hub), London, Sydney, and a remote-first posture across the United
States, the United Kingdom, the Republic of Ireland, France, and
Australia; operator of Fin (the AI customer-service agent flagship
released in 2023 alongside the OpenAI GPT-4 launch), Intercom Inbox
(the agent-side conversation routing surface), Intercom Messenger (the
embeddable chat-widget product), Intercom Help Center (the self-serve
knowledge-base product), Intercom Outbound (the proactive-messaging
campaign product), Workflows (the no-code automation builder), and the
Intercom Customer Data Platform lines that anchor the AI-customer-
service category alongside Zendesk, Salesforce Service Cloud, Freshdesk,
HubSpot Service Hub, Help Scout, Kustomer, and the new wave of AI-
native challengers — Decagon, Sierra, Crescendo, Forethought,
Kapture.cx) — is published at the bare `intercom` Greenhouse slug (the
lowercase brand name) and was confirmed live via run #271's HTTP 200
probe of `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true`
(174 open roles returned). Aggregator-callers asking for "all jobs at
major customer-service / customer-messaging platforms" must currently
either (a) deduce the Greenhouse slug `intercom` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match — both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct
plugins sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry
that aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`intercom` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-nine times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman,
Toast, Webflow, ZoomInfo, Attentive, Chime, Elastic).

## 2. Goals

- Ship a `source-company-intercom` plugin returning live `JobPostDto`
  rows for the public Intercom careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-attentive` plugin (Greenhouse-backed, `category:
  'company'`, `Site.INTERCOM` enum value, `id` prefixed `intercom-`) —
  Attentive is the closest structural cousin because both emit
  HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline AND both apply a
  wire-title `.trim()` (D-10) on a subset of titles AND both publish
  `absolute_url` on variant 2 (`job-boards.greenhouse.io/<slug>/jobs/<id>`)
  AND both pass `company_name` through byte-for-byte (no D-09 trim) AND
  both emit flat single-token department names (`'Sales'`, `'Engineering'`,
  `'Product'`, etc.). Intercom introduces **zero structural deviations**
  from the Attentive template — it is a near-pure Attentive twin (the
  fifty-third bare-`<slug>` Greenhouse-backed company-direct plugin to
  ship since the Spec 020 cohort opened with Anthropic).
- Apply the **D-10 wire-title `.trim()`** deviation, since 25 of the
  174 wire titles in the run-271 probe (14.4 %) carry trailing
  ASCII-space padding (`'Account Executive, Commercial '`, `'Account
  Executive, Commercial - French Speaking '`, `'Account Executive
  (Existing Business), Commercial '`, `'Business Development
  Representative, Emerging AI Products '`, `'Director, Sales Strategy
  & Planning '`, etc.). Sixth plugin in the cohort to apply D-10 (after
  Brex `Spec 047 § 10 D-10`, Buildkite `Spec 050 § 10 D-10`, ZoomInfo
  `Spec 057 § 10 D-10`, Attentive `Spec 058 § 10 D-10`, and Elastic
  `Spec 060 § 10 D-10`). The 14.4 % pad-rate is the **highest of any
  cohort plugin to date** — beating Elastic's 8.3 %, ZoomInfo's 6.1 %,
  Attentive's 6.8 %, Buildkite's 7.4 %, and Brex's smaller pad-rate.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Intercom.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'intercom'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-attentive` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Intercom's USD / EUR / GBP / AUD ranges (the
  Dublin / London / Sydney / SF posture spans GBP + EUR + AUD + USD
  without modification).
- Backfilling historical Intercom postings — only the open-roles slice
  the Greenhouse public API returns.
- Trimming the trailing-whitespace pad on the wire department name
  `'Legal '` (one of fifteen distinct department names in the run-271
  probe). The plugin emits the wire `departments[0].name` byte-for-byte
  (D-11 mirrors wire) — consumers wanting a trimmed form can normalise
  themselves at fetch time. The pad-byte does **not** affect the
  case-insensitive `searchTerm` substring match because the filter
  lower-cases both sides and `'legal'.includes('legal ')` is false but
  `'legal '.toLowerCase().includes('legal')` is true (the wire form
  trivially contains the unpadded substring), so the search filter
  remains semantically correct against the padded form.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.INTERCOM`** in the source
> registry, so that **a single `siteType: [Site.INTERCOM]` request returns
> Intercom's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 2
> (the US-region `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink
> subdomain), the entity-decode-then-tag-strip description pipeline, AND
> a wire-title `.trim()` against a 14.4 % pad-rate**, so that **adding
> the next Greenhouse-only employer with a high-pad-rate wire-title
> shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Intercom**, so that **a Greenhouse outage on the
> Intercom board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.INTERCOM = 'intercom'` to `packages/models/src/enums/site.enum.ts`.                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-intercom` under `packages/plugins/`.                | must     |
| FR-3  | `IntercomService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `intercom-`, `site === Site.INTERCOM`, and `companyName === 'Intercom'` (wire `company_name` is already the bare brand `'Intercom'` byte-for-byte; no D-09 trim needed). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/intercom.service.spec.ts`, all using mocked HTTP.      | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **US-region permalink subdomain** shape `https://job-boards.greenhouse.io/intercom/jobs/<id>` — variant 2 (the **tenth** plugin in the cohort to use this shape; Spec 061 § 10 D-04). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) — apply `.trim()` to `listing.title` before downstream filters and emit, since 25 of 174 wire titles in the run-271 probe (14.4 %) carry trailing ASCII-space padding. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[IntercomModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-intercom/src/intercom.service.ts
@SourcePlugin({ site: Site.INTERCOM, name: 'Intercom', category: 'company' })
@Injectable()
export class IntercomService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `intercom-${listing.id}`,
  site:         Site.INTERCOM,
  title:        (listing.title ?? '').trim(),  // D-10
  companyName:  'Intercom',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/intercom/jobs/${listing.id}`,
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

- **Unit (`__tests__/intercom.service.spec.ts`):**
  1. NestJS DI resolves `IntercomService` through `IntercomModule`.
  2. `Site.INTERCOM === 'intercom'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive) — even after the D-10 wire-title trim observably fires.
  6. `searchTerm` filters listings by department name (case-insensitive — including the literal `'engineering'` substring matching the flat single-token department in the second listing).
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

- **D-01 (run #271):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Intercom's
  `https://www.intercom.com/careers/job-openings` careers landing page
  is itself a Greenhouse iframe — the canonical machine-readable feed
  for this tenant is the `api.greenhouse.io/v1/boards/intercom/jobs`
  public endpoint. We already exercise the broader Greenhouse public-API
  pattern from forty-nine prior company-direct plugins.
- **D-02 (run #271):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'intercom'`.
- **D-03 (run #271):** No salary parser hook beyond the helpers
  defaults — Intercom posts USD / EUR / GBP / AUD ranges (its Dublin /
  London / Sydney / SF posture) inside the Greenhouse `content` field;
  Spec 014 / 015's parser already covers the relevant currencies without
  modification.
- **D-04 (run #271):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **US-region permalink subdomain**
  template `https://job-boards.greenhouse.io/intercom/jobs/<id>` —
  wire-shape variant 2. This is the **tenth** plugin in the cohort to
  use variant 2 (the same wire shape as Vercel, Affirm, Gusto, Mercury,
  Buildkite, Netlify, Postman, Webflow, and Attentive — distinct from
  variant 1's `boards.greenhouse.io/<slug>` apex shape, variant 10's
  legacy `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>` shape, and
  variant 11's vanity-domain `jobs.<brand>.<tld>/jobs?gh_jid=<id>&gh_jid=<id>`
  shape). Rationale: Intercom's tenant publishes its `absolute_url` on
  this shape — confirmed via run #271's HTTP 200 probe of the live API
  where the first job's `absolute_url` is
  `https://job-boards.greenhouse.io/intercom/jobs/7247950`. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Intercom listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the audit
  window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `job-boards.greenhouse.io` substring AND the literal `/intercom/jobs/`
  substring AND must NOT contain `?gh_jid=` (locking the variant-2
  shape against future refactors that might naively normalise to a
  variant-1, variant-10, or variant-11 template).
- **D-05 (run #271):** Use Greenhouse slug `intercom` (the lowercase
  brand name). Rationale: like Elastic (Spec 060 § 10 D-05), Chime (Spec
  059 § 10 D-05), Attentive (Spec 058 § 10 D-05), Webflow (Spec 056 § 10
  D-05), Toast (Spec 055 § 10 D-05), Postman (Spec 054 § 10 D-05),
  Netlify (Spec 053 § 10 D-05), Ramp Network (Spec 052 § 10 D-05),
  CircleCI (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10 D-05), Mercury
  (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05), Brex (Spec 047 § 10
  D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo (Spec 045 § 10 D-05),
  Affirm (Spec 044 § 10 D-05), Vercel (Spec 043 § 10 D-05), Block (Spec
  042 § 10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10
  D-05), Instacart (Spec 039 § 10 D-05), ZoomInfo (Spec 057 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Intercom's Greenhouse
  tenant is published at the slug `intercom` with no slug-vs-display-
  name asymmetry. Confirmed via run #271's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true` (174
  open roles returned).
- **D-06 (run #271):** Class names are `IntercomService` /
  `IntercomModule` (PascalCase from the bare-brand single-word name).
  Rationale: matches the convention Intercom's own marketing / GitHub /
  press use for class-style references to the brand (`Intercom`), and
  aligns with the existing repo PascalCase convention for single-word
  brands (e.g. `ElasticService`, `ChimeService`, `AttentiveService`,
  `WebflowService`, `MercuryService`).
- **D-07 (run #271):** Selected from the **run-268 fresh-sweep
  live-board pool**, alphabetically-next bite after Elastic (`int` <
  `mix`). The one remaining live-board pool member (Mixpanel — plus a
  HubSpot re-probe pivot) queues up for runs #272+. Confirmed via run
  #271's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/intercom/jobs?content=true`
  returning 174 open roles. The HubSpot re-probe at run-271 start
  returned HTTP 200 with `meta.total === 0` — ninth-consecutive empty
  re-probe across runs #262–#271; HubSpot remains deferred.
- **D-08 (run #271):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Elastic (Spec 060 § 10 D-08), Chime
  (Spec 059 § 10 D-08), Attentive (Spec 058 § 10 D-08), ZoomInfo (Spec
  057 § 10 D-08), Webflow (Spec 056 § 10 D-08), Toast (Spec 055 § 10
  D-08), Postman (Spec 054 § 10 D-08), Netlify (Spec 053 § 10 D-08),
  Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec 051 § 10 D-08),
  Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 § 10 D-08), Gusto
  (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec 046
  § 10 D-08), and Klaviyo (Spec 045 § 10 D-08), Intercom's tenant emits
  HTML-entity-encoded content (`&lt;div class=&quot;content-intro
  &quot;&gt;&lt;p&gt;Intercom is the AI Customer Service company on a
  mission to help businesses provide incredible customer experiences...`)
  rather than raw HTML tags — confirmed via run #271's HTTP probe of
  the live API (174 of 174 wire jobs carry HTML entities; 0 of 174
  carry raw tags). Applying `stripHtmlTags()` alone to that wire
  payload would leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text. The
  pipeline is order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b) does
  not contain `&quot;` (named entities decoded), (c) does not contain
  `&#39;` (numeric entities decoded), and (d) does not contain `<p>`,
  `<div>`, `<strong>`, or `<em>` (tags stripped after the decode pass),
  so a future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **seventeenth**
  company-direct plugin in the cohort to use the entity-decode-then-
  tag-strip pipeline.
- **D-09 (run #271):** Brand-name trim D-09 is **omitted**. Rationale:
  Intercom's wire `company_name` is `'Intercom'` byte-for-byte (the
  bare brand name; no legal-entity suffix on the wire — confirmed via
  run-271 probe where 174 of 174 wire jobs carry `company_name ===
  'Intercom'`). The plugin reads `listing.company_name` directly without
  a string-literal pin, but the unit-test happy path asserts the
  emitted `companyName === 'Intercom'` byte-for-byte to lock the
  observable shape against a future tenant rename to add a legal-entity
  suffix; if such a rename happens, a follow-up patch can re-introduce
  D-09 as a one-line edit. Sixth cohort plugin to omit D-09 against a
  single-word bare-brand wire `company_name` (after Webflow / Spec 056,
  Attentive / Spec 058, Elastic / Spec 060, plus the older Postman /
  Spec 054, Netlify / Spec 053, Mercury / Spec 049, Buildkite / Spec
  050, CircleCI / Spec 051, Ramp Network / Spec 052, Toast / Spec 055).
- **D-10 (run #271):** Apply `.trim()` to `listing.title` before
  downstream filters and emit. Rationale: 25 of the 174 wire titles in
  the run-271 probe carry trailing ASCII-space padding (`'Account
  Executive, Commercial '`, `'Account Executive, Commercial - French
  Speaking '`, `'Account Executive (Existing Business), Commercial '`,
  `'Business Development Representative, Emerging AI Products '`,
  `'Director, Sales Strategy & Planning '`, etc. — 14.4 % of the open
  roles, the **highest pad-rate of any cohort plugin to date** —
  beating Elastic's 8.3 %, Attentive's 6.8 %, ZoomInfo's 6.1 %,
  Buildkite's 7.4 %, and Brex's smaller pad-rate). The plugin trims via
  `.trim()` to give downstream consumers the non-padded form for
  display, sort, and equality checks. This is the **sixth plugin in
  the cohort** to apply D-10 (after Brex `Spec 047 § 10 D-10`,
  Buildkite `Spec 050 § 10 D-10`, ZoomInfo `Spec 057 § 10 D-10`,
  Attentive `Spec 058 § 10 D-10`, and Elastic `Spec 060 § 10 D-10`).
  The unit-test happy path asserts (a) at least one fixture title
  carries trailing pad bytes pre-emit AND (b) the emitted `title ===
  fixture.jobs[i].title.trim()` byte-for-byte AND (c) `searchTerm`'s
  case-insensitive substring filter still matches a padded fixture
  title via the trim (regression-guards against a future refactor that
  drops the `.trim()` before the searchTerm filter and exposes the pad
  bytes to the downstream string compare).
- **D-11 (run #271):** The Intercom wire `departments[0].name` payload
  uses **flat single-token department names** (`'Sales'`, `'Engineering'`,
  `'Product'`, `'Marketing'`, `'Finance & Business Operations'`,
  `'Customer Success & Solutions'`, `'AI Group'`, `'R&D'`, `'Recruiting'`,
  `'Research, Analytics & Data Science'`, `'Customer Support'`, `'Legal '`,
  `'People'`, `'Product Design'`, `'Revenue Operations'`) — distinct
  from Elastic's compound `' - '`-separated regional-scoped format,
  ZoomInfo's numeric-code-prefix format, Toast's colon-separated
  nested-path format, and Chime's single-token format with literal `&`
  bytes. Notably, one wire department name (`'Legal '`) carries
  trailing ASCII-space padding similar to the wire-title pad pattern
  D-10 captures, but the plugin emits the wire `departments[0].name`
  byte-for-byte (no department-name `.trim()` — the case-insensitive
  `searchTerm.toLowerCase().includes(...)` filter remains semantically
  correct against the padded form because the padded `'Legal '` still
  trivially contains the unpadded `'legal'` substring). Consumers
  wanting the trimmed form can normalise themselves at fetch time.
  The unit-test happy path includes a regression guard asserting the
  emitted `department` for the first fixture listing matches the wire
  `departments[0].name` byte-for-byte AND that the case-insensitive
  `searchTerm` match on the literal `'sales'` substring resolves the
  first-listing fixture's `'Sales'` department AND that the
  case-insensitive `searchTerm` match on the literal `'engineering'`
  substring resolves the second-listing fixture's `'Engineering'`
  department.

## 11. References

- `packages/plugins/source-company-attentive/src/attentive.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 058 / run #268; uses variant 2 with the entity-decode pipeline
  and one wire-title `.trim()` deviation — Intercom is a near-pure
  Attentive twin: same variant 2, same D-08, same D-09 omission, same
  D-10 application, just a higher pad-rate and different department
  shape).
- `packages/plugins/source-company-elastic/src/elastic.service.ts` —
  the prior cohort plugin (Spec 060 / run #270; uses variant 11 vanity-
  domain shape and applies D-10 — Intercom shares D-10 application
  but uses variant 2 and the simpler flat-token department shape).
- `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts` —
  the simultaneous D-08 + D-10 cousin (Spec 057 § 10 D-08, D-10).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
