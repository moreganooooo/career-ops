# Spec: 044 — Source Company Plugin: Affirm

| Field          | Value                                                                                                                                   |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 044                                                                                                                                     |
| Slug           | source-company-affirm                                                                                                                   |
| Status         | accepted                                                                                                                                |
| Owner          | claude (run #254)                                                                                                                       |
| Created        | 2026-05-02                                                                                                                              |
| Last updated   | 2026-05-02                                                                                                                              |
| Supersedes     | (none)                                                                                                                                  |
| Related specs  | 001, 003, 005, 020, 021, 022, 023, 024, 025, 026, 027, 028, 029, 030, 031, 032, 033, 034, 035, 036, 037, 038, 039, 040, 041, 042, 043   |

## 1. Problem Statement

Run #253's Spec 043 closed the gap that the company-direct catalogue had no
entry for the dominant **frontend cloud / Next.js framework / edge-network
developer-platform** vendor (Vercel Inc.). The same gap remains for the
dominant **buy-now-pay-later / consumer-credit-fintech / merchant-checkout-
financing** vendor — Affirm (Affirm Holdings, Inc., NASDAQ: AFRM; founded by
Max Levchin in 2012; operator of the Affirm point-of-sale instalment loan
product, the Affirm Card debit card, the Affirm Money savings product, and
the Affirm merchant-network checkout integrations layer that anchors the
US BNPL category alongside Klarna, AfterPay-via-Block, and PayPal Pay-in-4)
— whose multi-hundred-employee engineering, risk-analytics, credit-modelling,
product, design, sales, and merchant-success hiring puts its corporate
openings on the same "marquee company-direct" tier as Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, and Vercel. Aggregator-callers asking for
"all jobs at major US BNPL / consumer-credit fintechs" must currently either
(a) deduce the Greenhouse slug `affirm` and call `source-ats-greenhouse` by
hand, or (b) post-filter the firehose of every Greenhouse-hosted role for a
company-name match. Both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind (Spec 005), and
both lose the `Site.<KEY>` enum entry that aggregator-side code branches on
for analytics, dedup affinity, and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning the `affirm`
Greenhouse slug behind its own `Site` enum value, in the identical shape the
codebase already uses thirty-two times (Amazon, Apple, Cursor, Google, IBM,
Meta, OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox,
Block, Vercel).

## 2. Goals

- Ship a `source-company-affirm` plugin returning live `JobPostDto` rows for
  the public Affirm careers board with **no caller config required** (no
  slug, no auth, no override URL).
- Match the structural and behavioural shape of the existing
  `source-company-vercel` plugin (Greenhouse-backed, `category: 'company'`,
  `Site.AFFIRM` enum value, `id` prefixed `affirm-`).
- Bundle a unit test suite (≥ 6 cases) that exercises happy path + at least
  four failure / boundary modes against deterministic fixtures — **never** the
  live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the `JobsModule`
  picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Affirm.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public board is
  sufficient; if a customer later supplies an API key through
  `input.auth.greenhouse.apiKey`, they can call `source-ats-greenhouse` with
  `companySlug: 'affirm'` and get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-vercel` already supports — the company plugins are thin
  wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-immunity
  helpers cover Affirm's USD listings (and Affirm Canada's CAD listings, and
  Affirm Poland's PLN listings) without modification.
- Backfilling historical Affirm postings — only the open-roles slice the
  Greenhouse public API returns.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.AFFIRM`** in the source
> registry, so that **a single `siteType: [Site.AFFIRM]` request returns
> Affirm's open roles without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **a thirty-second proof-point of the
> Greenhouse-backed company-direct pattern**, so that **adding the next
> Greenhouse-only employer (Klaviyo, Duolingo, Brex, Gusto, …) costs ≤ 1 spec
> and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-source failure
> isolation for Affirm**, so that **a Greenhouse outage on the Affirm board
> does not trip the breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.AFFIRM = 'affirm'` to `packages/models/src/enums/site.enum.ts`.                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-affirm` under `packages/plugins/`.                  | must     |
| FR-3  | `AffirmService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `affirm-`, `site === Site.AFFIRM`, and `companyName === 'Affirm'`. | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 6 cases under `__tests__/affirm.service.spec.ts`, all using mocked HTTP.        | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 100-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 100-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[AffirmModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-affirm/src/affirm.service.ts
@SourcePlugin({ site: Site.AFFIRM, name: 'Affirm', category: 'company' })
@Injectable()
export class AffirmService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/affirm/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `affirm-${listing.id}`,
  site:         Site.AFFIRM,
  title:        listing.title,
  companyName:  'Affirm',
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/affirm/jobs/${listing.id}`,
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

- **Unit (`__tests__/affirm.service.spec.ts`):**
  1. NestJS DI resolves `AffirmService` through `AffirmModule`.
  2. `Site.AFFIRM === 'affirm'` literal pin.
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

- **D-01 (run #254):** Wrap Greenhouse public API rather than build a bespoke
  HTML scraper. Rationale: Affirm's `affirm.com/careers` index links its
  detail pages out to `job-boards.greenhouse.io/affirm/jobs/<id>` directly;
  the Greenhouse public API is the canonical machine-readable feed and we
  already exercise the exact same wire format from `source-company-vercel`,
  `source-company-block`, `source-company-roblox`, `source-company-dropbox`,
  `source-company-instacart`, `source-company-datadog`,
  `source-company-mongodb`, `source-company-cloudflare`,
  `source-company-twilio`, `source-company-twitch`, `source-company-gitlab`,
  `source-company-figma`, `source-company-asana`, `source-company-plaid`,
  `source-company-lyft`, `source-company-pinterest`, `source-company-reddit`,
  `source-company-robinhood`, `source-company-airbnb`,
  `source-company-doordash`, `source-company-coinbase`,
  `source-company-discord`, `source-company-databricks`, and
  `source-company-anthropic`.
- **D-02 (run #254):** Skip the Harvest API code path in this plugin.
  Rationale: company-direct plugins stay thin (Spec 001 / FR-2); callers
  needing Harvest can use `source-ats-greenhouse` with `companySlug:
  'affirm'`.
- **D-03 (run #254):** No salary parser hook beyond the helpers defaults —
  Affirm posts USD ranges (US listings), CAD ranges (Affirm Canada
  listings), and PLN ranges (Affirm Poland engineering hub listings) inside
  the Greenhouse `content` field; Spec 014 / 015's parser already covers
  all three currencies; no Spec 044-specific salary logic.
- **D-04 (run #254):** Fallback `jobUrl` (when Greenhouse omits
  `absolute_url`) points at the Greenhouse new-permalink template
  `https://job-boards.greenhouse.io/affirm/jobs/<id>`. Rationale: that path
  is the canonical permalink Affirm's careers site uses — verified via run
  #254's HTTP probe of the Greenhouse public API for Affirm, where the live
  `absolute_url` Greenhouse returns for this tenant is wire-shape
  `https://job-boards.greenhouse.io/affirm/jobs/<id>` (note: this is the
  newer Greenhouse permalink subdomain `job-boards.greenhouse.io` — the
  same pattern Vercel uses (Spec 043 § 10 D-04); Greenhouse migrated newer
  / re-onboarded tenants to the `job-boards.greenhouse.io` host in 2024 and
  the two hosts return identical payloads — `boards.greenhouse.io/affirm/
  jobs/<id>` issues a 301 to the `job-boards.greenhouse.io/...` form when
  probed live). The fallback uses the wire-shape
  `https://job-boards.greenhouse.io/affirm/jobs/<id>` exactly for byte-
  equivalence with the wire `absolute_url`. Functional impact is zero
  because Greenhouse populates `absolute_url` on every listing in practice
  (the fallback is a defence-in-depth path Greenhouse has not actually
  exercised against any tenant in the audit window). This is the **second**
  spec in the company-direct cohort whose fallback uses the new
  `job-boards.greenhouse.io` permalink subdomain rather than the legacy
  `boards.greenhouse.io` form (Spec 043 / Vercel was the first).
- **D-05 (run #254):** Use Greenhouse slug `affirm` (the bare display name,
  lowercase). Rationale: like Vercel (Spec 043 § 10 D-05), Block (Spec 042 §
  10 D-05), Roblox (Spec 041 § 10 D-05), Dropbox (Spec 040 § 10 D-05),
  Instacart (Spec 039 § 10 D-05), Datadog (Spec 038 § 10 D-05), MongoDB
  (Spec 037 § 10 D-05), Cloudflare (Spec 036 § 10 D-05), Twilio (Spec 035 §
  10 D-05), Twitch (Spec 034 § 10 D-05), Gitlab (Spec 033 § 10 D-05), Figma
  (Spec 032 § 10 D-05), Asana (Spec 031 § 10 D-05), Plaid (Spec 030 § 10
  D-05), Lyft (Spec 029 § 10 D-05), Pinterest (Spec 028 § 10 D-05), and
  Reddit (Spec 027 § 10 D-05), and unlike Robinhood (Spec 026 § 10 D-05),
  Affirm's Greenhouse tenant is published at `job-boards.greenhouse.io/
  affirm/` with no slug-vs-display-name asymmetry; the slug is the company
  name lowercase. Confirmed via run #254's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/affirm/jobs?content=true` (174 open
  roles returned at probe time).
- **D-06 (run #254):** Class name is `AffirmService` / `AffirmModule`
  (PascalCase with the standard initial cap). Rationale: simple trademark
  proper noun with no embedded acronym needing special casing — like Vercel
  (Spec 043 § 10 D-06), Block (Spec 042 § 10 D-07), Roblox (Spec 041 § 10
  D-07), Dropbox (Spec 040 § 10 D-07), and Instacart (Spec 039 § 10 D-07),
  Affirm is a single trademarked word and PascalCase falls out trivially.
- **D-07 (run #254):** Niantic and Snap probed and dropped from the
  candidate set during this run. `niantic` / `nianticlabs` / `niantictech`
  all returned HTTP 404 (Niantic's careers board is not on Greenhouse —
  their public listings live at `careers.nianticlabs.com`, proxied to a
  Lever / Workday tenant per `niantic.com/careers` redirects). `snap` /
  `snapchat` / `snapinc` / `snap-inc` / `snapincorporated` all returned
  HTTP 404 (Snap Inc.'s careers board is not on Greenhouse; their listings
  live at `careers.snap.com`, proxied to a custom in-house ATS). Both fall
  outside the Greenhouse-backed company-direct cohort and are recorded
  here for the benefit of future runs so the next agent doesn't repeat
  the failed probes — same convention Spec 042 § 10 D-05 used for the
  Snowflake-not-on-Greenhouse finding.

## 11. References

- `packages/plugins/source-company-vercel/src/vercel.service.ts` — closest
  structural cousin (Greenhouse-backed company-direct, shipped Spec 043 / run
  #253; uses the same `job-boards.greenhouse.io` new-permalink subdomain).
- `packages/plugins/source-company-block/src/block.service.ts` — the prior
  Greenhouse-backed company-direct pattern this spec extends.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` — full
  Greenhouse adapter for the authenticated path (out of scope here, see
  D-02).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration contract this
  spec satisfies.
