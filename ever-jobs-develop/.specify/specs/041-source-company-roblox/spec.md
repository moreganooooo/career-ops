# Spec: 041 — Source Company Plugin: Roblox

| Field          | Value                                                                                                                  |
| -------------- | ---------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 041                                                                                                                    |
| Slug           | source-company-roblox                                                                                                  |
| Status         | accepted                                                                                                               |
| Owner          | claude (run #251)                                                                                                      |
| Created        | 2026-05-02                                                                                                             |
| Last updated   | 2026-05-02                                                                                                             |
| Supersedes     | (none)                                                                                                                 |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040 |

## 1. Problem Statement

Run #250's Spec 040 closed the gap that the company-direct catalogue
had no entry for the dominant **cloud file-sync / collaborative-
workspace SaaS** vendor (Dropbox). The same gap remains for the
dominant **immersive 3D experiences / user-generated-content gaming
platform** vendor — Roblox (Roblox Corporation, parent of the Roblox
client / Roblox Studio creator stack, the Roblox Marketplace
in-experience-economy surface, the Roblox Connect social-presence
surface, the Roblox Talent Hub developer-hiring board, and the Roblox
Cloud edge-platform that powers the experience runtime) — whose
multi-thousand-employee engineering, product, design, customer-success,
trust-and-safety, and operations hiring put its corporate openings on
the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest,
Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB,
Datadog, Instacart, and Dropbox. Aggregator-callers asking for "all
jobs at major US immersive-3D / UGC-platform vendors" must currently
either (a) deduce the Greenhouse slug `roblox` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match. Both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`roblox` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses twenty-nine times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox).

## 2. Goals

- Ship a `source-company-roblox` plugin returning live `JobPostDto`
  rows for the public Roblox careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-dropbox` plugin (Greenhouse-backed, `category:
  'company'`, `Site.ROBLOX` enum value, `id` prefixed `roblox-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Roblox.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'roblox'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-dropbox` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Roblox's USD listings without modification.
- Backfilling historical Roblox postings — only the open-roles slice
  the Greenhouse public API returns.
- A separate plugin for the Roblox Talent Hub developer-hiring board —
  Talent Hub is a marketplace for *third-party* experience-creator
  hiring, not for first-party Roblox Corporation roles. First-party
  roles all post through the corporate `roblox` Greenhouse tenant
  this plugin already covers; if Roblox ever surfaces first-party
  roles through Talent Hub, a follow-up spec can add a separate
  `source-roblox-talenthub` niche plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ROBLOX`** in the source
> registry, so that **a single `siteType: [Site.ROBLOX]` request
> returns Roblox's open roles without my code knowing the underlying
> ATS slug**.

> As a **plugin author**, I want **a thirtieth proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Snowflake, Block, …) costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Roblox**, so that **a Greenhouse outage on
> the Roblox board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ROBLOX = 'roblox'` to `packages/models/src/enums/site.enum.ts`.                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-roblox` under `packages/plugins/`.                  | must     |
| FR-3  | `RobloxService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `roblox-`, `site === Site.ROBLOX`, and `companyName === 'Roblox'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/roblox.service.spec.ts`, all using mocked HTTP.        | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[RobloxModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-roblox/src/roblox.service.ts
@SourcePlugin({ site: Site.ROBLOX, name: 'Roblox', category: 'company' })
@Injectable()
export class RobloxService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/roblox/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `roblox-${listing.id}`,
  site:         Site.ROBLOX,
  title:        listing.title,
  companyName:  'Roblox',
  jobUrl:       listing.absolute_url ?? `https://careers.roblox.com/jobs/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/roblox.service.spec.ts`):**
  1. NestJS DI resolves `RobloxService` through `RobloxModule`.
  2. `Site.ROBLOX === 'roblox'` literal pin.
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

- **D-01 (run #251):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Roblox's `careers.roblox.com` index
  links its detail pages out to
  `careers.roblox.com/jobs/<id>?gh_jid=<id>` (a Greenhouse-mirrored
  path); the Greenhouse public API is the canonical machine-readable
  feed and we already exercise the exact same wire format from
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
- **D-02 (run #251):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'roblox'`.
- **D-03 (run #251):** No salary parser hook beyond the helpers
  defaults — Roblox posts USD ranges (typically as a pay-range block
  inside the Greenhouse `content` field for US-located roles) that
  Spec 014 / 015's parser already covers; no Spec 041-specific salary
  logic.
- **D-04 (run #251):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Roblox careers permalink
  template `https://careers.roblox.com/jobs/<id>?gh_jid=<id>`.
  Rationale: that path is the canonical permalink Roblox's careers
  site uses — verified via run #251's HTTP probe of the Greenhouse
  public API for Roblox, where the live `absolute_url` Greenhouse
  returns for this tenant is itself
  `https://careers.roblox.com/jobs/<id>?gh_jid=<id>`, so the fallback
  matches the live wire shape exactly. This mirrors the
  `source-company-dropbox` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when a
  fallback is needed.
- **D-05 (run #251):** Use Greenhouse slug `roblox` (the bare display
  name). Rationale: like Dropbox (Spec 040 § 10 D-05), Instacart (Spec
  039 § 10 D-05), Datadog (Spec 038 § 10 D-05), MongoDB (Spec 037 § 10
  D-05), Cloudflare (Spec 036 § 10 D-05), Twilio (Spec 035 § 10 D-05),
  Twitch (Spec 034 § 10 D-05), Gitlab (Spec 033 § 10 D-05), Figma
  (Spec 032 § 10 D-05), Asana (Spec 031 § 10 D-05), Plaid (Spec 030
  § 10 D-05), Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028 § 10
  D-05), and Reddit (Spec 027 § 10 D-05), and unlike Robinhood (Spec
  026 § 10 D-05), Roblox's Greenhouse tenant is published at
  `boards.greenhouse.io/roblox/` with no slug-vs-display-name
  asymmetry; the slug is the company name lowercase. Confirmed via
  run #251's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/roblox/jobs?content=true`.
- **D-06 (run #251):** Ship Roblox as its own `Site.ROBLOX` plugin
  covering first-party Roblox Corporation roles only — do **not**
  add a separate plugin for the Roblox Talent Hub developer-hiring
  board. Rationale: Talent Hub is a marketplace for *third-party*
  experience-creator hiring (game-studio operators recruiting
  freelance Lua / Roblox-Studio scripters and 3D artists), not for
  first-party Roblox Corporation roles. First-party roles all post
  through the corporate `roblox` Greenhouse tenant this plugin
  already covers; if Roblox ever surfaces first-party roles through
  Talent Hub, a follow-up spec can add a separate
  `source-roblox-talenthub` niche plugin (under the `niche` /
  `freelance` category, not `company`).
- **D-07 (run #251):** Class name is `RobloxService` /
  `RobloxModule` (PascalCase with the standard initial cap).
  Rationale: simple compound proper noun with no embedded acronym
  needing special casing — like Dropbox (Spec 040 § 10 D-07) and
  Instacart (Spec 039 § 10 D-07), Roblox is a single trademarked
  word and PascalCase falls out trivially.

## 11. References

- `packages/plugins/source-company-dropbox/src/dropbox.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 040 / run #250).
- `packages/plugins/source-company-instacart/src/instacart.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
