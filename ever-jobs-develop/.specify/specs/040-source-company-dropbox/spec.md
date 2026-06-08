# Spec: 040 — Source Company Plugin: Dropbox

| Field          | Value                                                                                                                |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 040                                                                                                                  |
| Slug           | source-company-dropbox                                                                                               |
| Status         | accepted                                                                                                             |
| Owner          | claude (run #250)                                                                                                    |
| Created        | 2026-05-02                                                                                                           |
| Last updated   | 2026-05-02                                                                                                           |
| Supersedes     | (none)                                                                                                               |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039    |

## 1. Problem Statement

Run #249's Spec 039 closed the gap that the company-direct catalogue
had no entry for the dominant **online grocery-delivery / instant-
commerce marketplace** vendor (Instacart). The same gap remains for the
dominant **cloud file-sync / collaborative-workspace SaaS** vendor —
Dropbox (Dropbox, Inc., parent of the Dropbox file-sync product, the
Dropbox Dash universal-search workspace, the Dropbox Sign e-signature
platform formerly known as HelloSign acquired in 2019, the FormSwift
document-automation product line acquired in 2023, the DocSend
document-tracking surface acquired in 2021, and the Capture
screen-recording product) — whose multi-thousand-employee engineering,
product, design, customer-success, and operations hiring put its
corporate openings on the same "marquee company-direct" tier as
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, and Instacart. Aggregator-callers asking
for "all jobs at major US cloud-file-sync / collaborative-workspace
vendors" must currently either (a) deduce the Greenhouse slug `dropbox`
and call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name match.
Both paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005), and both lose
the `Site.<KEY>` enum entry that aggregator-side code branches on for
analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the
`dropbox` Greenhouse slug behind its own `Site` enum value, in the
identical shape the codebase already uses twenty-eight times (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart).

## 2. Goals

- Ship a `source-company-dropbox` plugin returning live `JobPostDto`
  rows for the public Dropbox careers board with **no caller config
  required** (no slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-instacart` plugin (Greenhouse-backed, `category:
  'company'`, `Site.DROPBOX` enum value, `id` prefixed `dropbox-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at
  least four failure / boundary modes against deterministic fixtures
  — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Dropbox.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'dropbox'` and get the
  richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-instacart` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Dropbox's USD / CAD / EUR / GBP listings without
  modification.
- Backfilling historical Dropbox postings — only the open-roles slice
  the Greenhouse public API returns.
- A combined "Dropbox + HelloSign" plugin. Dropbox's recent
  acquisitions (HelloSign 2019 — rebranded to Dropbox Sign in 2023,
  DocSend 2021, FormSwift 2023) all post through the same `dropbox`
  Greenhouse tenant, so they are already covered by this single plugin;
  if any acquisition ever splits to a separate tenant, a follow-up
  spec can split this plugin in turn.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DROPBOX`** in the source
> registry, so that **a single `siteType: [Site.DROPBOX]` request
> returns Dropbox's open roles without my code knowing the underlying
> ATS slug**.

> As a **plugin author**, I want **a twenty-ninth proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the
> next Greenhouse-only employer (Roblox, Snowflake, …) costs ≤ 1
> spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source
> failure isolation for Dropbox**, so that **a Greenhouse outage on
> the Dropbox board does not trip the breaker for every other
> Greenhouse tenant** the platform tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DROPBOX = 'dropbox'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-dropbox` under `packages/plugins/`.                 | must     |
| FR-3  | `DropboxService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `dropbox-`, `site === Site.DROPBOX`, and `companyName === 'Dropbox'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/dropbox.service.spec.ts`, all using mocked HTTP.       | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[DropboxModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-dropbox/src/dropbox.service.ts
@SourcePlugin({ site: Site.DROPBOX, name: 'Dropbox', category: 'company' })
@Injectable()
export class DropboxService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/dropbox/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `dropbox-${listing.id}`,
  site:         Site.DROPBOX,
  title:        listing.title,
  companyName:  'Dropbox',
  jobUrl:       listing.absolute_url ?? `https://jobs.dropbox.com/listing/${listing.id}?gh_jid=${listing.id}`,
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

- **Unit (`__tests__/dropbox.service.spec.ts`):**
  1. NestJS DI resolves `DropboxService` through `DropboxModule`.
  2. `Site.DROPBOX === 'dropbox'` literal pin.
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

- **D-01 (run #250):** Wrap Greenhouse public API rather than build a
  bespoke HTML scraper. Rationale: Dropbox's `jobs.dropbox.com` index
  links its detail pages out to
  `jobs.dropbox.com/listing/<id>?gh_jid=<id>` (a Greenhouse-mirrored
  path); the Greenhouse public API is the canonical machine-readable
  feed and we already exercise the exact same wire format from
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
- **D-02 (run #250):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2);
  callers needing Harvest can use `source-ats-greenhouse` with
  `companySlug: 'dropbox'`.
- **D-03 (run #250):** No salary parser hook beyond the helpers
  defaults — Dropbox posts USD ranges (typically as a pay-range block
  inside the Greenhouse `content` field for US-located roles) that
  Spec 014 / 015's parser already covers; no Spec 040-specific salary
  logic.
- **D-04 (run #250):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the public Dropbox careers permalink
  template `https://jobs.dropbox.com/listing/<id>?gh_jid=<id>`.
  Rationale: that path is the canonical permalink Dropbox's careers
  site uses — verified via run #250's HTTP probe of the Greenhouse
  public API for Dropbox, where the live `absolute_url` Greenhouse
  returns for this tenant is itself
  `https://jobs.dropbox.com/listing/<id>?gh_jid=<id>`, so the fallback
  matches the live wire shape exactly. This mirrors the
  `source-company-instacart` choice of using each company's
  marketing-domain career-page over the Greenhouse-board URL when a
  fallback is needed.
- **D-05 (run #250):** Use Greenhouse slug `dropbox` (the bare display
  name). Rationale: like Instacart (Spec 039 § 10 D-05), Datadog (Spec
  038 § 10 D-05), MongoDB (Spec 037 § 10 D-05), Cloudflare (Spec 036
  § 10 D-05), Twilio (Spec 035 § 10 D-05), Twitch (Spec 034 § 10
  D-05), Gitlab (Spec 033 § 10 D-05), Figma (Spec 032 § 10 D-05),
  Asana (Spec 031 § 10 D-05), Plaid (Spec 030 § 10 D-05), Lyft (Spec
  029 § 10 D-05), Pinterest (Spec 028 § 10 D-05), and Reddit (Spec
  027 § 10 D-05), and unlike Robinhood (Spec 026 § 10 D-05),
  Dropbox's Greenhouse tenant is published at
  `boards.greenhouse.io/dropbox/` with no slug-vs-display-name
  asymmetry; the slug is the company name lowercase. Confirmed via
  run #250's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/dropbox/jobs?content=true`.
- **D-06 (run #250):** Ship Dropbox as its own `Site.DROPBOX` plugin
  rather than splitting recent acquisitions (HelloSign 2019 — rebranded
  to Dropbox Sign in 2023, DocSend 2021, FormSwift 2023) into separate
  plugins. Rationale: every acquired entity now posts through the same
  `dropbox` Greenhouse tenant and applies through the same
  Greenhouse-backed application flow, so a single `Site.DROPBOX`
  plugin covers all of them. If any acquisition later splits to a
  separate tenant, a follow-up spec can split this plugin along the
  same Spec-005 circuit-breaker isolation lines used for every other
  multi-brand company.
- **D-07 (run #250):** Class name is `DropboxService` /
  `DropboxModule` (PascalCase with the standard initial cap).
  Rationale: simple compound proper noun with no embedded acronym
  needing special casing — like Instacart (Spec 039 § 10 D-07),
  Dropbox is a single trademarked word and PascalCase falls out
  trivially.

## 11. References

- `packages/plugins/source-company-instacart/src/instacart.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct, shipped
  Spec 039 / run #249).
- `packages/plugins/source-company-datadog/src/datadog.service.ts` —
  the earlier Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path (out of scope
  here, see D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this
  spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract
  this spec satisfies.
