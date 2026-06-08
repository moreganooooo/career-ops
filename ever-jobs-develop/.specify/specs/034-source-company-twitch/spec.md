# Spec: 034 — Source Company Plugin: Twitch

| Field          | Value                                                                               |
| -------------- | ----------------------------------------------------------------------------------- |
| Spec ID        | 034                                                                                 |
| Slug           | source-company-twitch                                                               |
| Status         | accepted                                                                            |
| Owner          | claude (run #244)                                                                   |
| Created        | 2026-05-01                                                                          |
| Last updated   | 2026-05-01                                                                          |
| Supersedes     | (none)                                                                              |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033 |

## 1. Problem Statement

Run #243's Spec 033 closed end-to-end the gap that the company-direct
catalogue had no entry for the dominant all-remote DevOps / source-control
platform vendor (Gitlab). The same gap remains for the dominant
**live-streaming and creator-economy platform** vendor — Twitch (an
Amazon subsidiary that staffs and recruits independently of `amazon.jobs`)
— whose multi-thousand-employee engineering, product, design, sales,
trust-and-safety, and creator-success hiring put its corporate openings
on the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest,
Lyft, Plaid, Asana, Figma, and Gitlab. Aggregator-callers asking for
"all jobs at major US live-streaming / creator-economy platforms"
must currently either (a) deduce the Greenhouse slug `twitch` and
call `source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match. Both paths
bypass the per-source health and circuit-breaker plumbing that the
company-direct plugins sit behind (Spec 005), and both lose the
`Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`twitch` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses twenty-two times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab).

## 2. Goals

- Ship a `source-company-twitch` plugin returning live `JobPostDto`
  rows for the public Twitch careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-gitlab` plugin (Greenhouse-backed, `category:
  'company'`, `Site.TWITCH` enum value, `id` prefixed `twitch-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Twitch.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'twitch'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-gitlab` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Twitch's USD listings without modification.
- Backfilling historical Twitch postings — only the open-roles slice
  the Greenhouse public API returns.
- A combined "Amazon family" plugin that covers Twitch, AWS, Whole
  Foods, etc. under one Site key. Twitch staffs and posts roles
  independently of `amazon.jobs`; merging the two would defeat the
  per-source circuit-breaker isolation that Spec 005 grants.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.TWITCH`** in the source
> registry, so that **a single `siteType: [Site.TWITCH]` request returns
> Twitch's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a twenty-third proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Twilio, Zendesk, Snowflake, …)
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Twitch**, so that **a Greenhouse outage on
> the Twitch board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.TWITCH = 'twitch'` to `packages/models/src/enums/site.enum.ts`.                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-twitch` under `packages/plugins/`.             | must     |
| FR-3  | `TwitchService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry. | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `twitch-`, `site === Site.TWITCH`, and `companyName === 'Twitch'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.       | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.      | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/twitch.service.spec.ts`, all using mocked HTTP.   | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[TwitchModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-twitch/src/twitch.service.ts
@SourcePlugin({ site: Site.TWITCH, name: 'Twitch', category: 'company' })
@Injectable()
export class TwitchService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/twitch/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `twitch-${listing.id}`,
  site:         Site.TWITCH,
  title:        listing.title,
  companyName:  'Twitch',
  jobUrl:       listing.absolute_url ?? `https://www.twitch.tv/jobs/en/${listing.id}/`,
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

- **Unit (`__tests__/twitch.service.spec.ts`):**
  1. NestJS DI resolves `TwitchService` through `TwitchModule`.
  2. `Site.TWITCH === 'twitch'` literal pin.
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

- **D-01 (run #244):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Twitch's `twitch.tv/jobs/` index
  links its detail pages out to `boards.greenhouse.io/twitch`; the
  Greenhouse public API is the canonical machine-readable feed and we
  already exercise the exact same wire format from
  `source-company-gitlab`, `source-company-figma`,
  `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`,
  `source-company-reddit`, `source-company-robinhood`,
  `source-company-airbnb`, `source-company-doordash`,
  `source-company-coinbase`, `source-company-discord`,
  `source-company-databricks`, and `source-company-anthropic`.
- **D-02 (run #244):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'twitch'`.
- **D-03 (run #244):** No salary parser hook beyond the helpers
  defaults — Twitch posts USD ranges (typically as a Pay-Range block
  inside the Greenhouse `content` field for US-located roles) that
  Spec 014 / 015's parser already covers; no Spec 034-specific salary
  logic.
- **D-04 (run #244):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Twitch careers detail-page
  template `https://www.twitch.tv/jobs/en/<id>/`. Rationale: that
  path is the canonical permalink Twitch uses for its individual
  position pages on its primary `twitch.tv` careers domain; mirrors
  the `source-company-gitlab` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when a
  fallback is needed.
- **D-05 (run #244):** Use Greenhouse slug `twitch` (the bare
  display name). Rationale: like Gitlab (Spec 033 § 10 D-05), Figma
  (Spec 032 § 10 D-05), Asana (Spec 031 § 10 D-05), Plaid (Spec 030
  § 10 D-05), Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028 § 10
  D-05), Reddit (Spec 027 § 10 D-05), and unlike Robinhood (Spec
  026 § 10 D-05), Twitch's Greenhouse tenant is published at
  `boards.greenhouse.io/twitch/` with no slug-vs-display-name
  asymmetry; the slug is the company name lowercase. Confirmed via
  Twitch's careers index, which redirects all detail clicks to the
  `twitch` Greenhouse slug.
- **D-06 (run #244):** Ship Twitch as its own `Site.TWITCH` plugin
  rather than folding it into `source-company-amazon`. Rationale:
  Twitch staffs and recruits independently of `amazon.jobs`, posts
  to a separate Greenhouse board, and historically rolls
  organisation-specific benefits and compensation. Folding it into
  `Amazon` would defeat the per-source circuit-breaker isolation
  guaranteed by Spec 005, and would obscure analytics signal that
  treats Twitch's hiring rhythm as distinct from AWS / retail
  Amazon.

## 11. References

- `packages/plugins/source-company-gitlab/src/gitlab.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 033 / run #243).
- `packages/plugins/source-company-figma/src/figma.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
