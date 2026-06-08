# Spec: 059 — Source Company Plugin: Chime

| Field          | Value                                                                                                                                                                                  |
| -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 059                                                                                                                                                                                    |
| Slug           | source-company-chime                                                                                                                                                                   |
| Status         | accepted                                                                                                                                                                               |
| Owner          | claude (run #269)                                                                                                                                                                      |
| Created        | 2026-05-02                                                                                                                                                                             |
| Last updated   | 2026-05-02                                                                                                                                                                             |
| Supersedes     | (none)                                                                                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049, 050, 051, 052, 053, 054, 055, 056, 057, 058 |

## 1. Problem Statement

Run #268's Spec 058 closed out by shipping the **AI-native conversational-
commerce / SMS & email-marketing platform** vendor (Attentive) — the
**ninth plugin in the cohort to use wire-shape variant 2** (the
US-region permalink subdomain `https://job-boards.greenhouse.io/<slug>/
jobs/<id>`) — and queued runs #269+ to walk the run-268 fresh-sweep
live-board pool alphabetically (`chime` 72 jobs, `elastic` 193 jobs,
`intercom` 174 jobs, `mixpanel` 51 jobs, plus a HubSpot re-probe pivot).
The catalogue still has no entry for the dominant **US neobank /
challenger-bank / consumer-fintech** vendor — Chime (Chime Financial,
Inc.; founded by Chris Britt and Ryan King in 2012 in San Francisco; one
of the largest US digital-only banks by primary-account count; currently
a private unicorn after Series G rounds led by Sequoia Capital, Tiger
Global, and Coatue that valued the company at ~$25B before the 2022
down-round; now operating with its San Francisco headquarters plus
offices in Chicago, Vancouver (Washington), San Diego, and a remote-
first posture across the United States; operator of Chime Spending
Account (the no-fee debit-card flagship), Chime Credit Builder (the
secured-card product), Chime SpotMe (the no-fee overdraft product),
Chime Savings Account (the high-yield-savings product), Chime Pay
Anyone (the peer-to-peer payments product), and the Chime Mobile App
(the all-in-one banking surface) lines that anchor the US neobank
category alongside Cash App, Varo, Current, Aspiration, Dave, and
Public). Its multi-thousand-employee engineering, product, design,
member-services, risk, compliance, and corporate hiring across San
Francisco / Chicago / Vancouver (WA) / San Diego and remote-first across
the United States puts its corporate openings on the same "marquee
company-direct" tier as Anthropic, Databricks, Discord, Coinbase,
DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart,
Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman, Toast,
Webflow, ZoomInfo, and Attentive. Aggregator-callers asking for "all
jobs at major US neobanks / consumer-fintechs" must currently either
(a) deduce the Greenhouse slug `chime` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted
role for a company-name match — both paths bypass the per-source health
and circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`chime` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses forty-seven times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo,
Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman, Toast, Webflow, ZoomInfo, Attentive).

## 2. Goals

- Ship a `source-company-chime` plugin returning live `JobPostDto` rows
  for the public Chime careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-attentive` plugin (Greenhouse-backed, `category:
  'company'`, `Site.CHIME` enum value, `id` prefixed `chime-`) — Attentive
  is the closest structural cousin because both emit HTML-entity-encoded
  content (`&lt;p&gt;...`) requiring the entity-decode-then-tag-strip
  description pipeline AND both carry the same flat single-token
  department-name format (`'Accounting'`, `'Engineering'`, `'Finance'`).
  Chime introduces **two structural deviations** from the Attentive
  template:
  1. **D-04 — wire-shape variant 10 fallback URL** — Chime's tenant
     publishes its `absolute_url` on the **legacy hosted-board** shape
     `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` (the bare
     `boards.greenhouse.io` apex host without the `job-` prefix, with
     a trailing `?gh_jid=<id>` query suffix). This is the **first plugin
     in the cohort** to use this wire shape — variant 10 — distinct from
     variant 2's modern US-region permalink subdomain. The HTTP 301
     redirect from `boards.greenhouse.io` → `job-boards.greenhouse.io`
     remains on Greenhouse's CDN, so the variant-10 URL still resolves to
     the same listing page, but the wire shape is the legacy form.
  2. **D-09 — brand-name trim string-literal pin** — Chime's wire
     `company_name` carries the legal-entity suffix
     `'Chime Financial, Inc'` (note: no trailing `.` after `Inc`, unlike
     Affirm's `'Affirm, Inc.'` form). The plugin pins
     `companyName === 'Chime'` as a string literal, byte-for-byte, rather
     than passing through the wire `company_name`. Fourth cohort plugin
     to apply a brand-name trim D-09 (after Affirm `Spec 044 § 10 D-09`,
     Gusto `Spec 048 § 10 D-09`, and ZoomInfo `Spec 057 § 10 D-09`); the
     **second** cohort plugin to clean a comma-separated suffix (after
     Affirm) and the **first** to clean a comma-separated suffix where
     the legal-entity token (`'Inc'`) carries no trailing period.
  - Chime does **not** have a wire-title `.trim()` deviation — all 72
    titles in the run-269 probe were already trim-clean, so the plugin
    omits the `.trim()` on `listing.title` (no D-10 deviation). Note this
    is the first cohort plugin since Webflow (Spec 056) to omit D-10.
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Chime.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'chime'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-attentive` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers already cover Chime's USD ranges (San Francisco / Chicago /
  Vancouver-WA / San Diego / remote-US) without modification.
- Backfilling historical Chime postings — only the open-roles slice the
  Greenhouse public API returns.
- Following the HTTP 301 redirect from `boards.greenhouse.io` →
  `job-boards.greenhouse.io` to "normalise" the wire shape. The plugin
  emits the wire `absolute_url` byte-for-byte (D-04 mirrors wire); the
  fallback constructor mirrors the wire shape byte-for-byte. Consumers
  needing the canonical permalink can follow the 301 themselves at
  fetch time.
- A separate `boards.greenhouse.io` HTTP-host alias on the Greenhouse
  base URL — the API call uses `api.greenhouse.io` (the same as every
  other plugin); only the wire `absolute_url` and fallback `jobUrl` differ.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CHIME`** in the source
> registry, so that **a single `siteType: [Site.CHIME]` request returns
> Chime's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining wire-shape variant 10
> (legacy `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`),
> the entity-decode-then-tag-strip description pipeline, AND a
> brand-name trim**, so that **adding the next Greenhouse-only employer
> that publishes its `absolute_url` on the legacy hosted-board apex with
> a comma-separated legal-entity-suffix `company_name` costs ≤ 1 spec
> and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Chime**, so that **a Greenhouse outage on the
> Chime board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CHIME = 'chime'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-chime` under `packages/plugins/`.                   | must     |
| FR-3  | `ChimeService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `chime-`, `site === Site.CHIME`, and `companyName === 'Chime'` (D-09 brand-name trim string-literal pin over wire `'Chime Financial, Inc'`; see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/chime.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must     |
| FR-12 | Fallback `jobUrl` (when Greenhouse omits `absolute_url`) uses the **legacy hosted-board** shape `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` — variant 10 (the **first** plugin in the cohort to use this shape; Spec 059 § 10 D-04). | must     |
| FR-13 | Brand-name trim deviation (D-09) — emit string-literal `'Chime'` rather than the wire `'Chime Financial, Inc'`. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[ChimeModule]})` resolves.      |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-chime/src/chime.service.ts
@SourcePlugin({ site: Site.CHIME, name: 'Chime', category: 'company' })
@Injectable()
export class ChimeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/chime/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `chime-${listing.id}`,
  site:         Site.CHIME,
  title:        listing.title ?? '',
  companyName:  'Chime',
  jobUrl:       listing.absolute_url ?? `https://boards.greenhouse.io/chime/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/chime.service.spec.ts`):**
  1. NestJS DI resolves `ChimeService` through `ChimeModule`.
  2. `Site.CHIME === 'chime'` literal pin.
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

- **D-01 (run #269):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Chime's
  `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` legacy
  hosted-board URL is the canonical machine-readable feed for this
  tenant. We already exercise the broader Greenhouse public-API pattern
  from forty-seven prior company-direct plugins (Anthropic, Databricks,
  Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest,
  Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare,
  MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm,
  Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp
  Network, Netlify, Postman, Toast, Webflow, ZoomInfo, Attentive — plus
  the seven legacy company-direct plugins from before Spec 020).
- **D-02 (run #269):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'chime'`.
- **D-03 (run #269):** No salary parser hook beyond the helpers
  defaults — Chime posts USD ranges (San Francisco / Chicago /
  Vancouver-WA / San Diego / remote-US HQ + offices) inside the
  Greenhouse `content` field; Spec 014 / 015's parser already covers
  the relevant currencies without modification; no Spec 059-specific
  salary logic.
- **D-04 (run #269):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **legacy hosted-board** template
  `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` —
  wire-shape variant 10. This is the **first** plugin in the cohort to
  use variant 10 (the legacy `boards.greenhouse.io` apex host without
  the `job-` prefix, plus the trailing `?gh_jid=<id>` query suffix).
  Rationale: Chime's tenant publishes its `absolute_url` on this shape
  — confirmed via run #269's HTTP 200 probe of the live API where the
  first job's `absolute_url` is
  `https://boards.greenhouse.io/chime/jobs/8391630002?gh_jid=8391630002`.
  The legacy host issues an HTTP 301 redirect to
  `https://job-boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>`
  (confirmed via `curl -I` at run-269 start), but the wire shape is the
  legacy form and the plugin mirrors it byte-for-byte. The `?gh_jid=<id>`
  query suffix is duplicate-of-id-in-path on this variant. Functional
  impact is zero because Greenhouse populates `absolute_url` on every
  Chime listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window). The unit-test happy path includes a regression guard
  asserting (a) the wire `absolute_url` flows through to `jobUrl`
  byte-for-byte AND that the emitted `jobUrl` contains the literal
  `boards.greenhouse.io` substring AND the literal `/chime/jobs/`
  substring AND the literal `?gh_jid=` substring AND must NOT contain
  the `job-boards.greenhouse.io` substring (locking the variant-10
  shape against future refactors that might naively normalise to a
  variant-2 modern permalink template).
- **D-05 (run #269):** Use Greenhouse slug `chime` (the lowercase
  brand name). Rationale: like Attentive (Spec 058 § 10 D-05), Webflow
  (Spec 056 § 10 D-05), Toast (Spec 055 § 10 D-05), Postman (Spec 054
  § 10 D-05), Netlify (Spec 053 § 10 D-05), Ramp Network (Spec 052 §
  10 D-05), CircleCI (Spec 051 § 10 D-05), Buildkite (Spec 050 § 10
  D-05), Mercury (Spec 049 § 10 D-05), Gusto (Spec 048 § 10 D-05),
  Brex (Spec 047 § 10 D-05), Duolingo (Spec 046 § 10 D-05), Klaviyo
  (Spec 045 § 10 D-05), Affirm (Spec 044 § 10 D-05), Vercel (Spec 043
  § 10 D-05), Block (Spec 042 § 10 D-05), Roblox (Spec 041 § 10 D-05),
  Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05),
  ZoomInfo (Spec 057 § 10 D-05), and unlike Robinhood (Spec 026 § 10
  D-05), Chime's Greenhouse tenant is published at the slug `chime`
  with no slug-vs-display-name asymmetry. Confirmed via run #269's
  HTTP 200 probe of `https://api.greenhouse.io/v1/boards/chime/jobs?
  content=true` (72 open roles returned).
- **D-06 (run #269):** Class names are `ChimeService` / `ChimeModule`
  (PascalCase from the bare-brand single-word name). Rationale: matches
  the convention Chime's own marketing / GitHub / Crunchbase pages use
  for class-style references to the brand (`Chime`), and aligns with
  the existing repo PascalCase convention for single-word brands (e.g.
  `AttentiveService`, `WebflowService`, `PostmanService`,
  `MercuryService`).
- **D-07 (run #269):** Selected from the **run-268 fresh-sweep
  live-board pool**, alphabetically-next bite after Attentive (`chi` <
  `ela` < `hub` < `int` < `mix`). The four remaining live-board pool
  members (Elastic, Intercom, Mixpanel — plus a HubSpot re-probe pivot)
  queue up for runs #270+. Confirmed via run #269's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/chime/jobs?content=true`
  returning 72 open roles. The HubSpot re-probe at run-269 start was
  not run separately because Spec 058's run-268 close-out scheduled it
  for the run *after* the alphabetically-first remaining live bite ships
  (i.e. for run #270, after Chime ships); `hub` slots between `ela` and
  `int` alphabetically, so HubSpot would still be picked next if it
  flips to non-empty.
- **D-08 (run #269):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-
  direct plugins (every plugin Block-and-earlier plus Affirm and
  Vercel) used. Rationale: like Attentive (Spec 058 § 10 D-08),
  ZoomInfo (Spec 057 § 10 D-08), Webflow (Spec 056 § 10 D-08), Toast
  (Spec 055 § 10 D-08), Postman (Spec 054 § 10 D-08), Netlify (Spec
  053 § 10 D-08), Ramp Network (Spec 052 § 10 D-08), CircleCI (Spec
  051 § 10 D-08), Buildkite (Spec 050 § 10 D-08), Mercury (Spec 049 §
  10 D-08), Gusto (Spec 048 § 10 D-08), Brex (Spec 047 § 10 D-08),
  Duolingo (Spec 046 § 10 D-08), and Klaviyo (Spec 045 § 10 D-08),
  Chime's tenant emits HTML-entity-encoded content (`&lt;h2&gt;&lt;
  span style=&quot;font-family: helvetica, arial, sans-serif;&quot;
  &gt;&lt;strong&gt;About the role&lt;/strong&gt;...`) rather than raw
  HTML tags — confirmed via run #269's HTTP probe of the live API
  (72 of 72 wire jobs carry HTML entities; 0 of 72 carry raw tags).
  Applying `stripHtmlTags()` alone to that wire payload would leave
  the literal entities in place. Decoding entities **first** and then
  stripping tags yields clean readable text. The pipeline is
  order-sensitive — `decodeHtmlEntities()` must run before
  `stripHtmlTags()`. The unit-test happy path asserts the cleaned
  description (a) does not contain `&lt;` (entities decoded), (b) does
  not contain `&quot;` (named entities decoded), (c) does not contain
  `&#39;` (numeric entities decoded), and (d) does not contain `<p>`,
  `<div>`, `<strong>`, or `<em>` (tags stripped after the decode pass),
  so a future refactor that swaps the order or drops one half of the
  pipeline would surface as a test diff. This is the **fifteenth**
  company-direct plugin in the cohort to use the
  entity-decode-then-tag-strip pipeline.
- **D-09 (run #269):** Emit the brand name `'Chime'` byte-for-byte
  rather than the wire `company_name`. Rationale: Chime's wire
  `company_name` carries the legal-entity suffix `'Chime Financial,
  Inc'` (note: no trailing `.` after `Inc`, unlike Affirm's
  `'Affirm, Inc.'` form — a mid-sentence comma plus a period-less `Inc`
  token). The plugin pins `companyName === 'Chime'` as a string
  literal in the `JobPostDto` mapping rather than reading
  `listing.company_name` directly, because the literal-pin form
  matches the pattern Affirm (Spec 044 § 10 D-09), Gusto (Spec 048 §
  10 D-09), and ZoomInfo (Spec 057 § 10 D-09) use, and shields
  consumers from a future tenant-rename to drop or change the
  legal-entity suffix. This is the **fourth plugin in the cohort** to
  apply a brand-name trim D-09 (after Affirm, Gusto, and ZoomInfo);
  the **second** to clean a comma-separated suffix (after Affirm) and
  the **first** to clean a comma-separated suffix where the
  legal-entity token (`'Inc'`) carries no trailing period — i.e. the
  trim removes the substring `', Inc'` rather than `', Inc.'`. The
  unit-test happy path asserts (a) the emitted `companyName ===
  'Chime'` byte-for-byte AND (b) the emitted `companyName !==
  fixture.jobs[0].company_name` (wire is `'Chime Financial, Inc'`,
  emit is `'Chime'`, so the trim observably fired) AND (c) the emitted
  `companyName` does NOT contain the literal substrings `', Inc'`,
  `', Inc.'`, `'Financial'`, or `'LLC'` (regression-guards against a
  future refactor that naively passes through the wire shape).
- **D-10 (run #269):** `.trim()` on the wire `title` is **omitted**.
  Rationale: all 72 wire titles in the run-269 probe were already
  trim-clean (no leading or trailing ASCII whitespace; equivalence
  `title === title.trim()` held for every job). The plugin omits the
  `.trim()` to keep the structural shape consistent with the
  zero-deviation Webflow / Postman / Netlify / Mercury / Gusto / Affirm
  / Vercel / Toast cohort plugins. Should a future Chime title carry
  trailing pad bytes, `searchTerm`'s `.includes(term)` filter still
  works for non-edge-of-string matches, and the consumer-side
  presentation layer can trim if needed; if pad bytes become endemic on
  Chime later, a follow-up patch can re-introduce D-10 as a one-line
  edit. This is the first cohort plugin since Webflow (Spec 056) to
  omit D-10.
- **D-11 (run #269):** The Chime wire `departments[0].name` payload
  uses simple flat single-token department names (`'Accounting'`,
  `'Enterprise S&M'`, `'Creative Marketing'`, `'Finance'`,
  `'Corporate Compliance'`, `'Product Design'`, `'Data Engineering'`,
  `'Growth Marketing'`, `'Marketing General'`, `'People'`,
  `'Data Analytics'`, `'Lending Product'`, etc.) — distinct from
  ZoomInfo's numeric-code-prefix format and Toast's colon-separated
  nested-path format. Note that one Chime department name carries an
  embedded ampersand (`'Enterprise S&M'`) that flows through the wire
  as a literal `&` byte (not entity-encoded as `&amp;`); this is
  consistent with Netlify's literal-ampersand bearing names. The
  plugin emits the wire string byte-for-byte (no normalisation, no
  token splitting, no entity decoding on the department name) —
  consumers wanting per-department analytics get the wire form
  directly. The unit-test happy path includes a regression guard
  asserting (a) the emitted `department` for the first fixture
  listing matches the wire `departments[0].name` byte-for-byte AND
  (b) the case-insensitive `searchTerm` match on the literal
  `'engineering'` substring resolves the Engineering-department
  fixture listing, AND (c) the literal `&` byte in
  `'Enterprise S&M'` is preserved through the emit (not entity-
  encoded, not stripped).

## 11. References

- `packages/plugins/source-company-attentive/src/attentive.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 058 / run #268; uses variant 2 with the entity-decode pipeline
  and one wire-title `.trim()` deviation — Chime drops the D-10 trim
  and adds a D-04 variant-10 + D-09 brand-name-trim deviation).
- `packages/plugins/source-company-zoominfo/src/zoominfo.service.ts` —
  the prior brand-name trim D-09 cousin (Spec 057 / run #267).
- `packages/plugins/source-company-affirm/src/affirm.service.ts` —
  the original brand-name trim D-09 plugin (Spec 044 § 10 D-09).
- `packages/plugins/source-company-gusto/src/gusto.service.ts` —
  the second brand-name trim D-09 plugin (Spec 048 § 10 D-09).
- `packages/plugins/source-company-webflow/src/webflow.service.ts` —
  the most recent zero-deviation Greenhouse-backed company-direct
  plugin (Spec 056 / run #266).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
