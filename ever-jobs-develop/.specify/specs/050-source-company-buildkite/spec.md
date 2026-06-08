# Spec: 050 — Source Company Plugin: Buildkite

| Field          | Value                                                                                                                                                       |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 050                                                                                                                                                         |
| Slug           | source-company-buildkite                                                                                                                                    |
| Status         | accepted                                                                                                                                                    |
| Owner          | claude (run #260)                                                                                                                                           |
| Created        | 2026-05-02                                                                                                                                                  |
| Last updated   | 2026-05-02                                                                                                                                                  |
| Supersedes     | (none)                                                                                                                                                      |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043, 044, 045, 046, 047, 048, 049 |

## 1. Problem Statement

Run #259's Spec 049 closed the gap that the company-direct catalogue had no
entry for the dominant **SMB / startup business-banking +
spend-management** vendor (Mercury Technologies, Inc.). The same gap remains
for the dominant **CI/CD pipeline + test-execution +
distributed-build-orchestration** vendor — Buildkite (Buildkite Pty Ltd;
founded by Keith Pitt and Tim Lucas in 2014 in Melbourne, Australia, as a
hybrid SaaS / on-prem agent-runner CI platform targeting the segment
underserved by Travis CI's hosted-only model and Jenkins's bring-your-own-
plumbing legacy; operator of Buildkite Pipelines (the core CI/CD orchestrator
that runs on customer-controlled agents), Buildkite Test Engine (the test
analytics + flaky-test detection product), Buildkite Package Registries (the
artifact-repository product), Buildkite Mobile Delivery Cloud (the
iOS/Android device-farm pipeline product), and Buildkite Compute & Agents
(the managed-agent-fleet product) lines that anchor the developer-controlled
CI/CD category alongside CircleCI, GitHub Actions, GitLab CI, Jenkins,
Travis CI, TeamCity, Bamboo, AWS CodeBuild, and Azure Pipelines) — whose
multi-hundred-employee engineering, brand, sales, and partnerships hiring
across the Australia / New Zealand / United States / Pacific Time hubs puts
its corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, Klaviyo, Duolingo, Brex, Gusto, and Mercury. Aggregator-callers
asking for "all jobs at major developer-tools vendors" must currently
either (a) deduce the Greenhouse slug `buildkite` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of every
Greenhouse-hosted role for a company-name match. Both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct
plugins sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry
that aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`buildkite` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty-eight times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex, Gusto, Mercury).

## 2. Goals

- Ship a `source-company-buildkite` plugin returning live `JobPostDto` rows
  for the public Buildkite careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-mercury` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.BUILDKITE` enum value, `id` prefixed `buildkite-`) — Mercury is the
  closest structural cousin because both publish through the new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain, both
  emit HTML-entity-encoded content (`&lt;p&gt;...`) requiring the
  entity-decode-then-tag-strip description pipeline, AND both emit a wire
  `company_name` that is the bare brand name (no legal-entity suffix to
  clean).
- Bundle a unit test suite (≥ 8 cases) that exercises happy path + at
  least five failure / boundary modes against deterministic fixtures —
  **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Buildkite.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse`
  with `companySlug: 'buildkite'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-mercury` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Buildkite's USD / AUD / NZD / CAD listings (Australia /
  New Zealand / United States / Pacific Time / Canada hubs) without
  modification.
- Backfilling historical Buildkite postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BUILDKITE`** in the source
> registry, so that **a single `siteType: [Site.BUILDKITE]` request returns
> Buildkite's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern combining the new
> `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain with
> the entity-decode-then-tag-strip description pipeline AND a wire-title
> trim deviation**, so that **adding the next Greenhouse-only employer
> that pads its wire titles with surrounding ASCII spaces — like Brex
> already does — costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Buildkite**, so that **a Greenhouse outage on the
> Buildkite board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BUILDKITE = 'buildkite'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-buildkite` under `packages/plugins/`.               | must     |
| FR-3  | `BuildkiteService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `buildkite-`, `site === Site.BUILDKITE`, and `companyName === 'Buildkite'` (matches the wire `company_name` byte-for-byte; no D-09 trim required — see § 10 D-09). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/buildkite.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags so the wire-encoded `&lt;p&gt;` form Greenhouse returns for this tenant becomes readable text rather than literal `&lt;p&gt;` substrings (see § 10 D-08). | must |
| FR-12 | The wire `title` is `.trim()`ed before mapping to handle the trailing-space padding observed on a subset of Buildkite roles (e.g. `'Staff Engineer - Compute & Agents '`, `'Staff GTM Engineer '`, `'Technical Account Manager '`) — see § 10 D-10. | must |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[BuildkiteModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-buildkite/src/buildkite.service.ts
@SourcePlugin({ site: Site.BUILDKITE, name: 'Buildkite', category: 'company' })
@Injectable()
export class BuildkiteService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/buildkite/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `buildkite-${listing.id}`,
  site:         Site.BUILDKITE,
  title:        (listing.title ?? '').trim(),
  companyName:  'Buildkite',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/buildkite/jobs/${listing.id}`,
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

- **Unit (`__tests__/buildkite.service.spec.ts`):**
  1. NestJS DI resolves `BuildkiteService` through `BuildkiteModule`.
  2. `Site.BUILDKITE === 'buildkite'` literal pin.
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

- **D-01 (run #260):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Buildkite's
  `https://job-boards.greenhouse.io/buildkite/jobs/<id>` permalink is the
  Greenhouse-canonical detail-page proxy on the new permalink subdomain
  — the same one Vercel (Spec 043), Affirm (Spec 044), Gusto (Spec 048),
  and Mercury (Spec 049) already use — and the Greenhouse public API is
  the canonical machine-readable feed for this wire-shape variant. We
  already exercise the exact same wire format from `source-company-mercury`,
  `source-company-gusto`, `source-company-brex`,
  `source-company-duolingo`, `source-company-klaviyo`,
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
- **D-02 (run #260):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'buildkite'`.
- **D-03 (run #260):** No salary parser hook beyond the helpers defaults
  — Buildkite posts USD / AUD / NZD / CAD ranges (Australia / New Zealand
  / United States / Pacific Time / Canada hubs) inside the Greenhouse
  `content` field; Spec 014 / 015's parser already covers the relevant
  currencies without modification; no Spec 050-specific salary logic.
- **D-04 (run #260):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the **new Greenhouse permalink subdomain**
  template `https://job-boards.greenhouse.io/buildkite/jobs/<id>`.
  Rationale: like Vercel (Spec 043 § 10 D-04), Affirm (Spec 044 §
  10 D-04), Gusto (Spec 048 § 10 D-04), and Mercury (Spec 049 § 10 D-04),
  Buildkite's tenant publishes its `absolute_url` on the new
  `job-boards.greenhouse.io` permalink subdomain — confirmed via run
  #260's HTTP 200 probe of the live API where the first job's
  `absolute_url` is
  `https://job-boards.greenhouse.io/buildkite/jobs/4951727008`. This is
  the **fifth** plugin in this variant (after Vercel, Affirm, Gusto,
  Mercury) out of five total wire-shape variants in the company-direct
  cohort: (1) legacy `boards.greenhouse.io/<slug>/jobs/<id>` — used by
  31 plugins from Block-and-earlier; (2) new
  `job-boards.greenhouse.io/<slug>/jobs/<id>` — used by Vercel, Affirm,
  Gusto, Mercury, and Buildkite (this spec is the **fifth** plugin in
  this variant); (3) marketing-site
  `<company>.com/careers/jobs?gh_jid=<id>` — used by Klaviyo (apex
  domain, query-param-only); (4) marketing-site
  `careers.<company>.com/jobs/<id>?gh_jid=<id>` — Duolingo (careers
  subdomain, path-AND-query); (5) marketing-site
  `www.<company>.com/careers/<id>?gh_jid=<id>` — Brex (apex-www domain,
  path-AND-query). The fallback uses the wire-shape
  `https://job-boards.greenhouse.io/buildkite/jobs/<id>` exactly for
  byte-equivalence with the wire `absolute_url`. Functional impact is
  zero because Greenhouse populates `absolute_url` on every Buildkite
  listing in practice (the fallback is a defence-in-depth path
  Greenhouse has not actually exercised against this tenant in the
  audit window).
- **D-05 (run #260):** Use Greenhouse slug `buildkite` (the bare display
  name, lowercase). Rationale: like Mercury (Spec 049 § 10 D-05), Gusto
  (Spec 048 § 10 D-05), Brex (Spec 047 § 10 D-05), Duolingo (Spec 046
  § 10 D-05), Klaviyo (Spec 045 § 10 D-05), Affirm (Spec 044 § 10 D-05),
  Vercel (Spec 043 § 10 D-05), Block (Spec 042 § 10 D-05), Roblox (Spec
  041 § 10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 §
  10 D-05), and unlike Robinhood (Spec 026 § 10 D-05), Buildkite's
  Greenhouse tenant is published at the bare `buildkite` slug with no
  slug-vs-display-name asymmetry; the slug is the company brand name
  lowercase. Confirmed via run #260's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/buildkite/jobs?content=true`.
- **D-06 (run #260):** Class name is `BuildkiteService` /
  `BuildkiteModule` (PascalCase with the standard initial cap).
  Rationale: simple trademark proper noun with no embedded acronym
  needing special casing — like Mercury (Spec 049 § 10 D-06), Gusto
  (Spec 048 § 10 D-06), Brex (Spec 047 § 10 D-06), Duolingo (Spec 046
  § 10 D-06), Klaviyo (Spec 045 § 10 D-06), Affirm (Spec 044 § 10 D-06),
  Vercel (Spec 043 § 10 D-06), Block (Spec 042 § 10 D-07), Roblox (Spec
  041 § 10 D-07), Dropbox (Spec 040 § 10 D-07), and Instacart (Spec 039
  § 10 D-07), Buildkite is a single trademarked word and PascalCase
  falls out trivially.
- **D-07 (run #260):** Probe sweep of fresh developer-tools / SaaS
  candidates — Buildkite, Toast, HashiCorp, 1Password, Webflow, Miro,
  Postman, Netlify, Segment, HubSpot, ZoomInfo, Retool, CircleCI,
  Postmates, Supabase, plus the carry-over `rampnetwork` from Spec 049 —
  produced **nine** HTTP 200 responses on
  `https://api.greenhouse.io/v1/boards/<slug>/jobs?content=true`:
  `buildkite`, `circleci`, `hubspot`, `netlify`, `postman`, `rampnetwork`
  (carry-over from Spec 049), `toast`, `webflow`, and `zoominfo`.
  Buildkite picked as the alphabetically-first bite (and as the
  developer-tools cohort's natural next move); the eight remaining
  candidates queue up for runs #261+. All other slugs probed
  (`hashicorp`, `1password`, `miro`, `segment`, `retool`, `postmates`,
  `supabase`) returned 404 — these companies are either on different
  ATS platforms (Lever / Ashby / Workday / bespoke) or use non-trivial
  Greenhouse tenant slugs that the next probe sweep can attempt.
- **D-08 (run #260):** Description-cleanup pipeline is `stripHtmlTags(
  decodeHtmlEntities(listing.content))` rather than the bare
  `stripHtmlTags(listing.content)` form thirty-three prior company-direct
  plugins (every plugin Block-and-earlier plus Affirm and Vercel) used.
  Rationale: like Mercury (Spec 049 § 10 D-08), Gusto (Spec 048 § 10
  D-08), Brex (Spec 047 § 10 D-08), Duolingo (Spec 046 § 10 D-08), and
  Klaviyo (Spec 045 § 10 D-08), Buildkite's tenant emits HTML-entity-
  encoded content (`&lt;p&gt;...`) rather than raw HTML tags
  (`<p>...`) — confirmed via run #260's HTTP probe of the live API
  where the first job's `content` starts with
  `&lt;p&gt;At Buildkite, our mission is to unblock every developer on
  the planet…`. Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place (because they are not actual
  `<…>` tags), producing user-facing descriptions full of `&lt;p&gt;`
  substrings. Decoding entities **first** (turning `&lt;p&gt;` into
  `<p>`) and then stripping tags (turning `<p>real text</p>` into `real
  text`) yields clean readable text. The pipeline is order-sensitive —
  `decodeHtmlEntities()` must run before `stripHtmlTags()`. The
  unit-test happy path asserts the cleaned description (a) does not
  contain `&lt;` (entities decoded) and (b) does not contain `<p>`
  (tags stripped after the decode pass), so a future refactor that
  swaps the order or drops one half of the pipeline would surface as
  a test diff. This is the **sixth** company-direct plugin in the cohort
  to use the entity-decode-then-tag-strip pipeline (the first five being
  Klaviyo, Duolingo, Brex, Gusto, and Mercury). Notably, this is the
  **third** plugin in the cohort to combine the new
  `job-boards.greenhouse.io` permalink subdomain (variant 2) with the
  entity-decode-then-tag-strip pipeline — Gusto (Spec 048) was the first
  in that combination, Mercury (Spec 049) the second; Vercel and Affirm
  use variant 2 with raw HTML content (no entity decoding); Klaviyo /
  Duolingo / Brex use the entity-decode pipeline with marketing-site
  shapes (variants 3 / 4 / 5).
- **D-09 (run #260):** Emit the wire `company_name` `Buildkite` directly
  (no brand-name trim required). Rationale: Buildkite's wire
  `company_name` is the bare brand name `Buildkite` — confirmed via run
  #260's HTTP probe of the live API where the first job's `company_name`
  is `"Buildkite"` (no `, Inc.` suffix, no `Pty Ltd` legal-entity
  suffix). This matches Mercury (Spec 049 § 10 D-09) — both pin the
  brand name byte-for-byte against the wire — and contrasts with Gusto
  (Spec 048 § 10 D-09) and Affirm (Spec 044 § 10 D-06), both of which
  emit a wire `company_name` with a legal-entity suffix that needed
  cleaning to the brand name. The plugin pins
  `companyName === 'Buildkite'` as a string literal in the `JobPostDto`
  mapping (rather than reading `listing.company_name`) for byte-stable
  consistency with the other thirty-eight company-direct plugins —
  every prior company-direct plugin uses a string literal for
  `companyName`, and Buildkite follows the same convention. The
  unit-test happy path asserts the emitted `companyName === 'Buildkite'`
  to lock the brand-name pin against future refactors that might
  mistakenly read the wire payload.
- **D-10 (run #260):** Apply `.trim()` to the wire `title` before
  mapping. Rationale: like Brex (Spec 047 § 10 D-10), a subset of
  Buildkite's tenant publishes `title` strings padded with surrounding
  ASCII spaces — confirmed via run #260's HTTP probe of the live API
  where roles such as `'Staff Engineer - Compute & Agents '`,
  `'Staff GTM Engineer '`, and `'Technical Account Manager '` carry a
  trailing ASCII space (the leading-space form has not been observed
  on this tenant, but the `.trim()` form is cheap defence-in-depth and
  matches Brex's symmetric approach). This is the **second** plugin in
  the cohort to apply a wire-title trim (after Brex). The unit-test
  happy path includes a fixture listing with a trailing-space title
  asserting that the emitted `title` does NOT have the trailing space
  (regression guard for the trim pass).

## 11. References

- `packages/plugins/source-company-mercury/src/mercury.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 049 / run #259; uses the new `job-boards.greenhouse.io` permalink
  subdomain — the same wire-shape variant Buildkite uses — AND the
  entity-decode-then-tag-strip description pipeline AND emits a bare
  brand-name wire `company_name`).
- `packages/plugins/source-company-gusto/src/gusto.service.ts` —
  the second new-permalink-subdomain plugin to combine variant 2 with
  the entity-decode pipeline (Buildkite extends this combination; Gusto's
  D-09 brand-name-pin trims a legal-entity suffix that Buildkite doesn't
  have).
- `packages/plugins/source-company-brex/src/brex.service.ts` —
  the prior wire-title-trim plugin (Spec 047 / run #257). Buildkite is
  the second plugin in the cohort to apply the title trim.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the `decodeHtmlEntities`
  + `stripHtmlTags` helpers this spec composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
