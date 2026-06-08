# Spec: 043 — Source Company Plugin: Vercel

| Field          | Value                                                                                                                              |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 043                                                                                                                                |
| Slug           | source-company-vercel                                                                                                              |
| Status         | accepted                                                                                                                           |
| Owner          | claude (run #253)                                                                                                                  |
| Created        | 2026-05-02                                                                                                                         |
| Last updated   | 2026-05-02                                                                                                                         |
| Supersedes     | (none)                                                                                                                             |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042  |

## 1. Problem Statement

Run #252's Spec 042 closed the gap that the company-direct catalogue had no
entry for the dominant **multi-brand fintech / consumer-payments / merchant-
commerce / Bitcoin-infrastructure parent** (Block, Inc.). The same gap remains
for the dominant **frontend cloud / Next.js framework / edge-network developer-
platform** vendor — Vercel (Vercel Inc., privately held; creators of Next.js;
operator of the Vercel deployment cloud, the Vercel edge network, the v0 AI-
assisted-development surface, and the Vercel Marketplace integrations layer) —
whose multi-hundred-employee engineering, product, design, developer-relations,
sales, and support hiring puts its corporate openings on the same "marquee
company-direct" tier as Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch,
Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, and Block.
Aggregator-callers asking for "all jobs at major US developer-platform / cloud-
hosting vendors" must currently either (a) deduce the Greenhouse slug `vercel`
and call `source-ats-greenhouse` by hand, or (b) post-filter the firehose of
every Greenhouse-hosted role for a company-name match. Both paths bypass the
per-source health and circuit-breaker plumbing that the company-direct plugins
sit behind (Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity, and breaker
scoping.

The gap closes when we add a thin company-direct plugin pinning the `vercel`
Greenhouse slug behind its own `Site` enum value, in the identical shape the
codebase already uses thirty-one times (Amazon, Apple, Cursor, Google, IBM,
Meta, OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox,
Block).

## 2. Goals

- Ship a `source-company-vercel` plugin returning live `JobPostDto` rows for
  the public Vercel careers board with **no caller config required** (no slug,
  no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-block` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.VERCEL` enum value, `id` prefixed `vercel-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at least
  four failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Vercel.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'vercel'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-block` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Vercel's USD listings (and Vercel's German / British / Swiss
  / Singaporean / Spanish / Australian listings — EUR / GBP / CHF / SGD / AUD
  ranges) without modification.
- Backfilling historical Vercel postings — only the open-roles slice the
  Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.VERCEL`** in the source
> registry, so that **a single `siteType: [Site.VERCEL]` request returns
> Vercel's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the next
> Greenhouse-only employer (Klaviyo, Affirm, …) costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Vercel**, so that **a Greenhouse outage on the Vercel board
> does not trip the breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.VERCEL = 'vercel'` to `packages/models/src/enums/site.enum.ts`.                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-vercel` under `packages/plugins/`.                  | must     |
| FR-3  | `VercelService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `vercel-`, `site === Site.VERCEL`, and `companyName === 'Vercel'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/vercel.service.spec.ts`, all using mocked HTTP.        | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[VercelModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-vercel/src/vercel.service.ts
@SourcePlugin({ site: Site.VERCEL, name: 'Vercel', category: 'company' })
@Injectable()
export class VercelService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/vercel/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `vercel-${listing.id}`,
  site:         Site.VERCEL,
  title:        listing.title,
  companyName:  'Vercel',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/vercel/jobs/${listing.id}`,
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

- **Unit (`__tests__/vercel.service.spec.ts`):**
  1. NestJS DI resolves `VercelService` through `VercelModule`.
  2. `Site.VERCEL === 'vercel'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s, mapped fields verified.
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E lives in
  `source-ats-greenhouse` and exercises the same wire shape.
- **Performance:** none beyond NFR-1's narrative budget — the helpers bench
  under `packages/common/__tests__/helpers.bench.spec.ts` is the ground truth
  for parser-level perf, and that path is unchanged here.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #253):** Wrap Greenhouse public API rather than build a bespoke
  HTML scraper. Rationale: Vercel's `vercel.com/careers` index links its
  detail pages out to `job-boards.greenhouse.io/vercel/jobs/<id>` directly;
  the Greenhouse public API is the canonical machine-readable feed and we
  already exercise the exact same wire format from `source-company-block`,
  `source-company-roblox`, `source-company-dropbox`,
  `source-company-instacart`, `source-company-datadog`,
  `source-company-mongodb`, `source-company-cloudflare`,
  `source-company-twilio`, `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #253):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'vercel'`.
- **D-03 (run #253):** No salary parser hook beyond the helpers defaults —
  Vercel posts USD ranges (US listings) and EUR / GBP / CHF / SGD / AUD
  ranges (Vercel International — Berlin / London / Zürich / Singapore /
  Sydney listings) inside the Greenhouse `content` field; Spec 014 / 015's
  parser already covers all six currencies; no Spec 043-specific salary
  logic.
- **D-04 (run #253):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the Greenhouse new-permalink template
  `https://job-boards.greenhouse.io/vercel/jobs/<id>`. Rationale: that path
  is the canonical permalink Vercel's careers site uses — verified via run
  #253's HTTP probe of the Greenhouse public API for Vercel, where the live
  `absolute_url` Greenhouse returns for this tenant is wire-shape
  `https://job-boards.greenhouse.io/vercel/jobs/<id>` (note: this is the
  newer Greenhouse permalink subdomain `job-boards.greenhouse.io`, not the
  legacy `boards.greenhouse.io` form most prior company-direct cohort
  members use; Greenhouse migrated newer / re-onboarded tenants to the
  `job-boards.greenhouse.io` host in 2024 and the two hosts return identical
  payloads — `boards.greenhouse.io/vercel/jobs/<id>` issues a 301 to the
  `job-boards.greenhouse.io/...` form when probed live). The fallback uses
  the wire-shape `https://job-boards.greenhouse.io/vercel/jobs/<id>` exactly
  for byte-equivalence with the wire `absolute_url`. Functional impact is
  zero because Greenhouse populates `absolute_url` on every listing in
  practice (the fallback is a defence-in-depth path Greenhouse has not
  actually exercised against any tenant in the audit window). This is the
  first spec in the company-direct cohort whose fallback uses the new
  `job-boards.greenhouse.io` permalink subdomain rather than the legacy
  `boards.greenhouse.io` form.
- **D-05 (run #253):** Use Greenhouse slug `vercel` (the bare display name,
  lowercase). Rationale: like Block (Spec 042 § 10 D-05), Roblox (Spec 041 §
  10 D-05), Dropbox (Spec 040 § 10 D-05), Instacart (Spec 039 § 10 D-05),
  Datadog (Spec 038 § 10 D-05), MongoDB (Spec 037 § 10 D-05), Cloudflare
  (Spec 036 § 10 D-05), Twilio (Spec 035 § 10 D-05), Twitch (Spec 034 § 10
  D-05), Gitlab (Spec 033 § 10 D-05), Figma (Spec 032 § 10 D-05), Asana
  (Spec 031 § 10 D-05), Plaid (Spec 030 § 10 D-05), Lyft (Spec 029 § 10
  D-05), Pinterest (Spec 028 § 10 D-05), and Reddit (Spec 027 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Vercel's Greenhouse tenant is
  published at `job-boards.greenhouse.io/vercel/` with no slug-vs-display-
  name asymmetry; the slug is the company name lowercase. Confirmed via run
  #253's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/vercel/jobs?content=true` (11 open
  roles returned at probe time).
- **D-06 (run #253):** Class name is `VercelService` / `VercelModule`
  (PascalCase with the standard initial cap). Rationale: simple trademark
  proper noun with no embedded acronym needing special casing — like Block
  (Spec 042 § 10 D-07), Roblox (Spec 041 § 10 D-07), Dropbox (Spec 040 § 10
  D-07), and Instacart (Spec 039 § 10 D-07), Vercel is a single trademarked
  word and PascalCase falls out trivially.

## 11. References

- `packages/plugins/source-company-block/src/block.service.ts` — closest
  structural cousin (Greenhouse-backed company-direct, shipped Spec 042 / run
  #252).
- `packages/plugins/source-company-roblox/src/roblox.service.ts` — the prior
  Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` — full
  Greenhouse adapter for the authenticated path (out of scope here, see
  D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract this
  spec satisfies.
