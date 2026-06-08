# Spec: 024 — Source Company Plugin: DoorDash

| Field          | Value                                            |
| -------------- | ------------------------------------------------ |
| Spec ID        | 024                                              |
| Slug           | source-company-doordash                          |
| Status         | accepted                                         |
| Owner          | claude (run #234)                                |
| Created        | 2026-05-01                                       |
| Last updated   | 2026-05-01                                       |
| Supersedes     | (none)                                           |
| Related specs  | 001, 003, 005, 020, 021, 022, 023                |

## 1. Problem Statement

Run #233's Spec 023 closed end-to-end the gap that the company-direct
catalogue had no entry for the dominant US-regulated crypto-exchange
platform (Coinbase). The same gap remains for the dominant **US
last-mile delivery & local-commerce logistics** vendor — DoorDash —
whose multi-billion-dollar operating footprint and 7000+ corporate
employees put its engineering, operations-strategy, product, and
data-science hiring on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, and Coinbase.  Aggregator-callers
asking for "all jobs at major gig-economy / logistics platforms"
must currently either (a) deduce the Greenhouse slug `doordash` and
call `source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match. Both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`doordash` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses twelve times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase).

## 2. Goals

- Ship a `source-company-doordash` plugin returning live `JobPostDto`
  rows for the public DoorDash careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-coinbase` plugin (Greenhouse-backed, `category:
  'company'`, `Site.DOORDASH` enum value, `id` prefixed
  `doordash-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case DoorDash.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'doordash'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-coinbase` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover DoorDash's USD listings without modification.
- Backfilling historical DoorDash postings — only the open-roles
  slice the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DOORDASH`** in the
> source registry, so that **a single `siteType: [Site.DOORDASH]`
> request returns DoorDash's open roles without my code knowing the
> underlying ATS slug**.

> As a **plugin author**, I want **a thirteenth proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Robinhood, Airbnb, Reddit, …)
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for DoorDash**, so that **a Greenhouse outage on
> the DoorDash board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DOORDASH = 'doordash'` to `packages/models/src/enums/site.enum.ts`.                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-doordash` under `packages/plugins/`.           | must     |
| FR-3  | `DoorDashService.scrape(input)` returns a `JobResponseDto`; never throws.                    | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry. | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `doordash-`, `site === Site.DOORDASH`, and `companyName === 'DoorDash'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.       | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.      | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/doordash.service.spec.ts`, all using mocked HTTP. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                              |
| ------ | -------------------------------------- | ----------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.    |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.  |
| NFR-3  | Zero new third-party deps.             | `package.json` is `name + main + types` only, like its peers. |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[DoorDashModule]})` resolves. |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-doordash/src/doordash.service.ts
@SourcePlugin({ site: Site.DOORDASH, name: 'DoorDash', category: 'company' })
@Injectable()
export class DoorDashService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/doordash/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `doordash-${listing.id}`,
  site:         Site.DOORDASH,
  title:        listing.title,
  companyName:  'DoorDash',
  jobUrl:       listing.absolute_url ?? `https://careersatdoordash.com/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(listing.content) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,
}
```

### 7.2 Errors

| Code             | Meaning                                                           |
| ---------------- | ----------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/doordash.service.spec.ts`):**
  1. NestJS DI resolves `DoorDashService` through `DoorDashModule`.
  2. `Site.DOORDASH === 'doordash'` literal pin.
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

- **D-01 (run #234):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: DoorDash links from
  `careersatdoordash.com` to `boards.greenhouse.io/doordash`; the
  Greenhouse public API is the canonical machine-readable feed and we
  already exercise the exact same wire format from
  `source-company-coinbase`, `source-company-discord`,
  `source-company-databricks`, and `source-company-anthropic`.
- **D-02 (run #234):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'doordash'`.
- **D-03 (run #234):** No salary parser hook beyond the helpers
  defaults — DoorDash posts USD ranges (often a National-Pay-Range
  block embedded in the Greenhouse `content` field) that Spec 014 /
  015's parser already covers; no Spec 024-specific salary logic.
- **D-04 (run #234):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public DoorDash careers detail-page
  template `https://careersatdoordash.com/jobs/<id>`. Rationale: that
  path is the canonical permalink DoorDash uses for its individual
  position pages on its branded careers domain; mirrors the
  `source-company-coinbase` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when a
  fallback is needed.

## 11. References

- `packages/plugins/source-company-coinbase/src/coinbase.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 023 / run #233).
- `packages/plugins/source-company-discord/src/discord.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
