# Spec: 042 — Source Company Plugin: Block

| Field          | Value                                                                                                                          |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Spec ID        | 042                                                                                                                            |
| Slug           | source-company-block                                                                                                           |
| Status         | accepted                                                                                                                       |
| Owner          | claude (run #252)                                                                                                              |
| Created        | 2026-05-02                                                                                                                     |
| Last updated   | 2026-05-02                                                                                                                     |
| Supersedes     | (none)                                                                                                                         |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041    |

## 1. Problem Statement

Run #251's Spec 041 closed the gap that the company-direct catalogue
had no entry for the dominant **immersive 3D experiences /
user-generated-content gaming platform** vendor (Roblox). The same
gap remains for the dominant **multi-brand fintech / consumer-
payments / merchant-commerce / Bitcoin-infrastructure** parent — Block
(Block, Inc., NYSE: SQ; rebranded from Square Inc. in December 2021),
parent of the **Square** merchant-commerce / point-of-sale stack, the
**Cash App** consumer payments / Cash-Card / Cash-App-Investing /
Cash-App-Pay surface, the **Tidal** music streaming subsidiary, the
**Spiral** Bitcoin open-source-engineering arm, the **TBD**
decentralized-financial-services arm, and the **AfterPay** /
**Clearpay** buy-now-pay-later subsidiary (acquired 2022) — whose
multi-thousand-employee engineering, product, design, customer-
success, trust-and-safety, fraud-and-risk, and operations hiring
puts its corporate openings on the same "marquee company-direct" tier
as Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb,
Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, and
Roblox. Aggregator-callers asking for "all jobs at major US fintech /
consumer-payments / merchant-commerce vendors" must currently either
(a) deduce the Greenhouse slug `block` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match. Both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`block` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses thirty times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox).

## 2. Goals

- Ship a `source-company-block` plugin returning live `JobPostDto`
  rows for the public Block careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-roblox` plugin (Greenhouse-backed, `category:
  'company'`, `Site.BLOCK` enum value, `id` prefixed `block-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Block.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'block'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-roblox` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Block's USD listings (and Block's Australian /
  British / Canadian / Spanish / Japanese AfterPay-and-Square-
  international listings — AUD / GBP / CAD / EUR / JPY ranges) without
  modification.
- Backfilling historical Block postings — only the open-roles slice
  the Greenhouse public API returns.
- A separate plugin for Square / Cash App / Tidal / Spiral / TBD /
  AfterPay subsidiary career portals — Block consolidated all
  subsidiary hiring under the corporate `block` Greenhouse tenant
  after the December 2021 Block rebrand (and after the 2022 AfterPay
  acquisition rolled the AfterPay / Clearpay roles in too); the
  consolidated tenant is what this plugin already covers. If Block
  ever splits a subsidiary back out to its own ATS tenant, a follow-
  up spec can add a separate `source-company-<subsidiary>` plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BLOCK`** in the source
> registry, so that **a single `siteType: [Site.BLOCK]` request
> returns Block's open roles without my code knowing the underlying
> ATS slug**.

> As a **plugin author**, I want **a thirty-first proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Klaviyo, Affirm, …) costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Block**, so that **a Greenhouse outage on
> the Block board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BLOCK = 'block'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-block` under `packages/plugins/`.                   | must     |
| FR-3  | `BlockService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `block-`, `site === Site.BLOCK`, and `companyName === 'Block'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/block.service.spec.ts`, all using mocked HTTP.         | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[BlockModule]})` resolves.     |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-block/src/block.service.ts
@SourcePlugin({ site: Site.BLOCK, name: 'Block', category: 'company' })
@Injectable()
export class BlockService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/block/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `block-${listing.id}`,
  site:         Site.BLOCK,
  title:        listing.title,
  companyName:  'Block',
  jobUrl:       listing.absolute_url ?? `https://block.xyz/careers/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/block.service.spec.ts`):**
  1. NestJS DI resolves `BlockService` through `BlockModule`.
  2. `Site.BLOCK === 'block'` literal pin.
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

- **D-01 (run #252):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Block's `block.xyz/careers` index
  links its detail pages out to
  `block.xyz/careers/jobs/<id>?gh_jid=<id>` (a Greenhouse-mirrored
  path); the Greenhouse public API is the canonical machine-readable
  feed and we already exercise the exact same wire format from
  `source-company-roblox`, `source-company-dropbox`,
  `source-company-instacart`, `source-company-datadog`,
  `source-company-mongodb`, `source-company-cloudflare`,
  `source-company-twilio`, `source-company-twitch`,
  `source-company-gitlab`, `source-company-figma`,
  `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`,
  `source-company-reddit`, `source-company-robinhood`,
  `source-company-airbnb`, `source-company-doordash`,
  `source-company-coinbase`, `source-company-discord`,
  `source-company-databricks`, and `source-company-anthropic`.
- **D-02 (run #252):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'block'`.
- **D-03 (run #252):** No salary parser hook beyond the helpers
  defaults — Block posts USD ranges (US listings) and AUD / GBP /
  CAD / EUR / JPY ranges (AfterPay / Square International / Tidal-
  Australia listings) inside the Greenhouse `content` field; Spec 014
  / 015's parser already covers all six currencies; no Spec 042-
  specific salary logic.
- **D-04 (run #252):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Block careers permalink
  template `https://block.xyz/careers/jobs/<id>?gh_jid=<id>`.
  Rationale: that path is the canonical permalink Block's careers
  site uses — verified via run #252's HTTP probe of the Greenhouse
  public API for Block, where the live `absolute_url` Greenhouse
  returns for this tenant is wire-shape `http://block.xyz/careers/
  jobs/<id>?gh_jid=<id>` (HTTP scheme — Greenhouse still stores
  Block's pre-HSTS canonical URL). Block's `block.xyz` host enforces
  HTTPS (HSTS-style upgrade); the `http://` form is followed by an
  immediate 301/308 to the `https://` form, and both `curl`-followed
  variants land at the identical `https://` canonical. The fallback
  uses `https://` for security best-practice, accepting the trivial
  scheme deviation from Greenhouse's wire shape — this is the first
  spec in the company-direct cohort where the fallback is *not* a
  byte-exact match for the wire `absolute_url` (every prior spec —
  Roblox / Dropbox / Instacart / Datadog / MongoDB / Cloudflare /
  Twilio / Twitch / Gitlab / Figma / Asana / Plaid / Lyft /
  Pinterest / Reddit — had `https://` wire shapes). Functional impact
  is zero because Greenhouse populates `absolute_url` on every listing
  in practice (the fallback is a defence-in-depth path Greenhouse
  has not actually exercised against any tenant in the audit window).
- **D-05 (run #252):** Use Greenhouse slug `block` (the bare display
  name, lowercase). Rationale: like Roblox (Spec 041 § 10 D-05),
  Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05),
  Datadog (Spec 038 § 10 D-05), MongoDB (Spec 037 § 10 D-05),
  Cloudflare (Spec 036 § 10 D-05), Twilio (Spec 035 § 10 D-05),
  Twitch (Spec 034 § 10 D-05), Gitlab (Spec 033 § 10 D-05), Figma
  (Spec 032 § 10 D-05), Asana (Spec 031 § 10 D-05), Plaid (Spec 030
  § 10 D-05), Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028 § 10
  D-05), and Reddit (Spec 027 § 10 D-05), and unlike Robinhood (Spec
  026 § 10 D-05), Block's Greenhouse tenant is published at
  `boards.greenhouse.io/block/` with no slug-vs-display-name
  asymmetry; the slug is the company name lowercase. Confirmed via
  run #252's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/block/jobs?content=true`
  (170 open roles returned at probe time). Run #252 also probed
  `snowflake`, `snowflakeinc`, `snowflakedb`, `snowflakeio`,
  `square`, `squareinc`, `squareup`, `block-inc`, `blockinc` — all
  HTTP 404 — so neither Snowflake (which posts via Workday / its
  own portal) nor Square-as-its-own-tenant (consolidated under the
  `block` parent tenant after the December 2021 rebrand) is a
  Greenhouse-direct candidate.
- **D-06 (run #252):** Ship Block as its own `Site.BLOCK` plugin
  covering all corporate Block-Inc. roles — including Square / Cash
  App / Tidal / Spiral / TBD / AfterPay subsidiary roles — under the
  single consolidated `block` Greenhouse tenant. Rationale: Block
  consolidated all subsidiary hiring under the corporate `block`
  Greenhouse tenant after the December 2021 Block rebrand (and the
  2022 AfterPay acquisition rolled the AfterPay / Clearpay roles in
  shortly after). Per the run #252 wire-shape probe, every listing
  on the `block` tenant carries `block.xyz/careers/jobs/<id>` as its
  `absolute_url` regardless of subsidiary, and `companyName` is
  uniformly *Block* (the parent) on the wire. If Block ever splits a
  subsidiary back out to its own ATS tenant, a follow-up spec can
  add a separate `source-company-<subsidiary>` plugin.
- **D-07 (run #252):** Class name is `BlockService` / `BlockModule`
  (PascalCase with the standard initial cap). Rationale: simple
  trademark proper noun with no embedded acronym needing special
  casing — like Roblox (Spec 041 § 10 D-07), Dropbox (Spec 040 § 10
  D-07), and Instacart (Spec 039 § 10 D-07), Block is a single
  trademarked word and PascalCase falls out trivially.

## 11. References

- `packages/plugins/source-company-roblox/src/roblox.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 041 / run #251).
- `packages/plugins/source-company-dropbox/src/dropbox.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
