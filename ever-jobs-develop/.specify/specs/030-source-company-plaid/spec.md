# Spec: 030 — Source Company Plugin: Plaid

| Field          | Value                                                           |
| -------------- | --------------------------------------------------------------- |
| Spec ID        | 030                                                             |
| Slug           | source-company-plaid                                            |
| Status         | accepted                                                        |
| Owner          | claude (run #240)                                               |
| Created        | 2026-05-01                                                      |
| Last updated   | 2026-05-01                                                      |
| Supersedes     | (none)                                                          |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029 |

## 1. Problem Statement

Run #239's Spec 029 closed end-to-end the gap that the company-direct
catalogue had no entry for the dominant rideshare / mobility platform
vendor (Lyft). The same gap remains for the dominant **fintech / open-
banking infrastructure** vendor — Plaid — whose multi-thousand-employee
engineering, payments, identity, and risk-and-fraud hiring put its
corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, and Lyft. Aggregator-callers asking for "all jobs
at major US fintech infrastructure platforms" must currently either
(a) deduce the Greenhouse slug `plaid` and call `source-ats-greenhouse`
by hand, or (b) post-filter the firehose of every Greenhouse-hosted
role for a company-name match. Both paths bypass the per-source health
and circuit-breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that aggregator-
side code branches on for analytics, dedup affinity, and breaker
scoping.

The gap closes when we add a thin company-direct plugin pinning the
`plaid` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses eighteen times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft).

## 2. Goals

- Ship a `source-company-plaid` plugin returning live `JobPostDto` rows
  for the public Plaid careers board with **no caller config required**
  (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-lyft` plugin (Greenhouse-backed, `category:
  'company'`, `Site.PLAID` enum value, `id` prefixed `plaid-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Plaid.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'plaid'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-lyft` already supports — the company plugins are
  thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Plaid's USD listings without modification.
- Backfilling historical Plaid postings — only the open-roles slice
  the Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.PLAID`** in the source
> registry, so that **a single `siteType: [Site.PLAID]` request returns
> Plaid's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a nineteenth proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Asana, Figma, Gitlab, Twitch, …)
> costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Plaid**, so that **a Greenhouse outage on
> the Plaid board does not trip the breaker for every other Greenhouse
> tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.PLAID = 'plaid'` to `packages/models/src/enums/site.enum.ts`.                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-plaid` under `packages/plugins/`.              | must     |
| FR-3  | `PlaidService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry. | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `plaid-`, `site === Site.PLAID`, and `companyName === 'Plaid'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.       | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.      | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/plaid.service.spec.ts`, all using mocked HTTP.    | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[PlaidModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-plaid/src/plaid.service.ts
@SourcePlugin({ site: Site.PLAID, name: 'Plaid', category: 'company' })
@Injectable()
export class PlaidService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/plaid/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `plaid-${listing.id}`,
  site:         Site.PLAID,
  title:        listing.title,
  companyName:  'Plaid',
  jobUrl:       listing.absolute_url ?? `https://plaid.com/careers/openings/${listing.id}/`,
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

- **Unit (`__tests__/plaid.service.spec.ts`):**
  1. NestJS DI resolves `PlaidService` through `PlaidModule`.
  2. `Site.PLAID === 'plaid'` literal pin.
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

- **D-01 (run #240):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Plaid's `plaid.com/careers` jobs
  index links its detail pages out to `boards.greenhouse.io/plaid`;
  the Greenhouse public API is the canonical machine-readable feed
  and we already exercise the exact same wire format from
  `source-company-lyft`, `source-company-pinterest`,
  `source-company-reddit`, `source-company-robinhood`,
  `source-company-airbnb`, `source-company-doordash`,
  `source-company-coinbase`, `source-company-discord`,
  `source-company-databricks`, and `source-company-anthropic`.
- **D-02 (run #240):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'plaid'`.
- **D-03 (run #240):** No salary parser hook beyond the helpers
  defaults — Plaid posts USD ranges (typically as a Pay-Range block
  inside the Greenhouse `content` field) that Spec 014 / 015's
  parser already covers; no Spec 030-specific salary logic.
- **D-04 (run #240):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Plaid careers detail-page
  template `https://plaid.com/careers/openings/<id>/`. Rationale:
  that path is the canonical permalink Plaid uses for its individual
  position pages on its primary `plaid.com` careers domain; mirrors
  the `source-company-lyft` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when
  a fallback is needed.
- **D-05 (run #240):** Use Greenhouse slug `plaid` (the bare
  display name). Rationale: like Lyft (Spec 029 § 10 D-05),
  Pinterest (Spec 028 § 10 D-05), Reddit (Spec 027 § 10 D-05),
  and unlike Robinhood (Spec 026 § 10 D-05), Plaid's Greenhouse
  tenant is published at `boards.greenhouse.io/plaid/` with no
  slug-vs-display-name asymmetry; the slug is the company name
  lowercase. Confirmed via Plaid's careers index, which redirects
  all detail clicks to the `plaid` Greenhouse slug.

## 11. References

- `packages/plugins/source-company-lyft/src/lyft.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 029 / run #239).
- `packages/plugins/source-company-pinterest/src/pinterest.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
