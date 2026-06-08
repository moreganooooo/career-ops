# Spec: 039 — Source Company Plugin: Instacart

| Field          | Value                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 039                                                                                                            |
| Slug           | source-company-instacart                                                                                       |
| Status         | accepted                                                                                                       |
| Owner          | claude (run #249)                                                                                              |
| Created        | 2026-05-02                                                                                                     |
| Last updated   | 2026-05-02                                                                                                     |
| Supersedes     | (none)                                                                                                         |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038   |

## 1. Problem Statement

Run #248's Spec 038 closed the gap that the company-direct catalogue
had no entry for the dominant **observability / cloud-monitoring SaaS**
vendor (Datadog). The same gap remains for the dominant **online
grocery-delivery / instant-commerce marketplace** vendor — Instacart
(Maplebear Inc., parent of the Instacart Marketplace consumer app, the
Instacart Connected Stores enterprise platform, the Caper AI smart-cart
hardware acquired in 2021, the FoodStorm catering OS acquired in 2022,
the Eversight pricing-optimisation platform acquired in 2022, and the
Rosie e-grocery platform acquired in 2024) — whose multi-thousand-
employee engineering, product, design, ad-sales, partnerships, and
operations hiring put its corporate openings on the same "marquee
company-direct" tier as Anthropic, Databricks, Discord, Coinbase,
DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, and Datadog.
Aggregator-callers asking for "all jobs at major US online-grocery /
instant-commerce vendors" must currently either (a) deduce the
Greenhouse slug `instacart` and call `source-ats-greenhouse` by hand,
or (b) post-filter the firehose of every Greenhouse-hosted role for a
company-name match. Both paths bypass the per-source health and
circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and
breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`instacart` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses twenty-seven times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog).

## 2. Goals

- Ship a `source-company-instacart` plugin returning live `JobPostDto`
  rows for the public Instacart careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-datadog` plugin (Greenhouse-backed, `category:
  'company'`, `Site.INSTACART` enum value, `id` prefixed
  `instacart-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Instacart.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'instacart'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-datadog` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Instacart's USD / CAD listings without modification.
- Backfilling historical Instacart postings — only the open-roles
  slice the Greenhouse public API returns.
- A combined "Instacart + Caper AI" plugin. Instacart's recent
  acquisitions (Caper AI 2021, FoodStorm 2022, Eversight 2022, Rosie
  2024) all post through the same `instacart` Greenhouse tenant, so
  they are already covered by this single plugin; if any acquisition
  ever splits to a separate tenant, a follow-up spec can split this
  plugin in turn.
- A separate `source-shopper` plugin for Instacart's shopper / driver
  hiring funnel — those positions are recruited through the
  consumer-side Shopper app and OnX onboarding flow, not the corporate
  Greenhouse tenant. Out of scope for this corporate-careers plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.INSTACART`** in the
> source registry, so that **a single `siteType: [Site.INSTACART]`
> request returns Instacart's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a twenty-eighth proof-point of
> the Greenhouse-backed company-direct pattern**, so that **adding
> the next Greenhouse-only employer (Dropbox, Roblox, Snowflake,
> …) costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Instacart**, so that **a Greenhouse outage
> on the Instacart board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.INSTACART = 'instacart'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-instacart` under `packages/plugins/`.               | must     |
| FR-3  | `InstacartService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `instacart-`, `site === Site.INSTACART`, and `companyName === 'Instacart'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/instacart.service.spec.ts`, all using mocked HTTP.     | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[InstacartModule]})` resolves.  |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-instacart/src/instacart.service.ts
@SourcePlugin({ site: Site.INSTACART, name: 'Instacart', category: 'company' })
@Injectable()
export class InstacartService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/instacart/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `instacart-${listing.id}`,
  site:         Site.INSTACART,
  title:        listing.title,
  companyName:  'Instacart',
  jobUrl:       listing.absolute_url ?? `https://instacart.careers/job/?gh_jid=${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(listing.content) : null,
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

- **Unit (`__tests__/instacart.service.spec.ts`):**
  1. NestJS DI resolves `InstacartService` through `InstacartModule`.
  2. `Site.INSTACART === 'instacart'` literal pin.
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

- **D-01 (run #249):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Instacart's `instacart.careers`
  index links its detail pages out to
  `instacart.careers/job/?gh_jid=<id>` (a Greenhouse-mirrored path);
  the Greenhouse public API is the canonical machine-readable feed and
  we already exercise the exact same wire format from
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
- **D-02 (run #249):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'instacart'`.
- **D-03 (run #249):** No salary parser hook beyond the helpers
  defaults — Instacart posts USD ranges (typically as a pay-range
  block inside the Greenhouse `content` field for US-located roles)
  that Spec 014 / 015's parser already covers; no Spec 039-specific
  salary logic.
- **D-04 (run #249):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Instacart careers permalink
  template `https://instacart.careers/job/?gh_jid=<id>`. Rationale:
  that path is the canonical permalink Instacart's careers site uses
  to redirect into the Greenhouse-hosted detail page (verified via
  run #249's HTTP probe — the live `absolute_url` returned by the
  Greenhouse public API for Instacart is itself
  `https://instacart.careers/job/?gh_jid=<id>`, so the fallback
  matches the live wire shape exactly). This mirrors the
  `source-company-datadog` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when a
  fallback is needed.
- **D-05 (run #249):** Use Greenhouse slug `instacart` (the bare
  display name). Rationale: like Datadog (Spec 038 § 10 D-05),
  MongoDB (Spec 037 § 10 D-05), Cloudflare (Spec 036 § 10 D-05),
  Twilio (Spec 035 § 10 D-05), Twitch (Spec 034 § 10 D-05), Gitlab
  (Spec 033 § 10 D-05), Figma (Spec 032 § 10 D-05), Asana (Spec 031
  § 10 D-05), Plaid (Spec 030 § 10 D-05), Lyft (Spec 029 § 10 D-05),
  Pinterest (Spec 028 § 10 D-05), and Reddit (Spec 027 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Instacart's Greenhouse
  tenant is published at `boards.greenhouse.io/instacart/` with no
  slug-vs-display-name asymmetry; the slug is the company name
  lowercase. Confirmed via run #249's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/instacart/jobs?content=true`
  (134 open roles returned at probe time).
- **D-06 (run #249):** Ship Instacart as its own `Site.INSTACART`
  plugin rather than splitting recent acquisitions (Caper AI 2021,
  FoodStorm 2022, Eversight 2022, Rosie 2024) into separate plugins.
  Rationale: every acquired entity now posts through the same
  `instacart` Greenhouse tenant and applies through the same
  Greenhouse-backed application flow, so a single `Site.INSTACART`
  plugin covers all of them. If any acquisition later splits to a
  separate tenant, a follow-up spec can split this plugin along the
  same Spec-005 circuit-breaker isolation lines used for every other
  multi-brand company.
- **D-07 (run #249):** Class name is `InstacartService` /
  `InstacartModule` (PascalCase with the standard initial cap).
  Rationale: simple compound proper noun with no embedded acronym
  needing special casing — like Datadog (Spec 038 § 10 D-07),
  Instacart is a single trademarked word and PascalCase falls out
  trivially.
- **D-08 (run #249):** Do **not** ship a separate `source-shopper`
  plugin for Instacart's shopper / driver hiring funnel. Rationale:
  shopper hiring runs through the consumer Shopper app and the OnX
  onboarding flow, not the corporate Greenhouse tenant; folding
  shopper roles into a corporate-careers plugin would mix two
  fundamentally different application flows, source-of-truth APIs,
  and target-audience cohorts. A future spec can carve the
  shopper-side surface area out as its own plugin if and when a
  caller surfaces the demand.

## 11. References

- `packages/plugins/source-company-datadog/src/datadog.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 038 / run #248).
- `packages/plugins/source-company-mongodb/src/mongodb.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
