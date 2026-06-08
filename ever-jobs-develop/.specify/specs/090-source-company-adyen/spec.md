# Spec: 090 — Source Company Plugin: Adyen

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 090                                                                                                                                                                                            |
| Slug           | source-company-adyen                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #300)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..089                                                                                                                                                                        |

## 1. Problem Statement

Run #299's Spec 089 closed end-to-end (Typeform shipped — eleventh
and last live hit from the fifth-fresh-sweep candidate pool). Run
#300 launches the **sixth fresh probe sweep** — a new probe sweep
across yet-untested large-employer candidate slugs.

Run #300's probe sweep across ~80 candidate slugs found
**seventeen** fresh non-empty live hits forming the sixth-sweep
candidate pool: `adyen` (260 jobs), `benevity` (~25),
`billcom` (~46), `bobbie` (~9), `cerebral` (~6), `coalition`
(~38), `dollarshaveclub` (~5), `hellofresh` (~1104 keys —
likely ~150-200 actual jobs), `misfitsmarket` (~132 keys),
`monzo` (~65), `n26` (~94), `planetscale` (~6), `sofi` (~2652
keys — large board), `stockx` (~50), `sweetgreen` (~132),
`xai` (~498 keys). Plus deferred-empty: `gather` (HTTP 200 with
0 jobs) and `calm` (HTTP 200 with 1 job — verify count).

Adyen N.V. — operator of the **dominant European payment-
processing platform pioneered around the unified-acquiring-and-
issuing single-payment-platform data model** (founded by Pieter
van der Does and Arnout Schuijff in 2006 in Amsterdam; IPO'd on
Euronext Amsterdam as `ADYEN` in June 2018; ships a unified
acquiring + issuing + risk-management + tokenisation product
across the merchant-payments segment — alongside competitors
Stripe, Worldpay, PayPal Braintree, Checkout.com, and Block —
with a hybrid distributed workforce concentrated across
Amsterdam, San Francisco, Singapore, São Paulo, and Remote
across Europe, the Americas, and Asia-Pacific) — is published at
the bare `adyen` Greenhouse slug (the lowercase brand name;
case-symmetric with the wire `company_name === 'Adyen'`) and was
confirmed live via run #300's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/adyen/jobs?content=true`
(260 open roles confirmed at run-300 start). Adyen publishes its
`absolute_url` on the canonical Greenhouse variant-2 shape.

## 2. Goals

- Ship a `source-company-adyen` plugin returning live `JobPostDto`
  rows for the public Adyen careers board with **no caller
  config required**.
- Match the structural and behavioural shape of the existing
  `source-company-marqeta` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.ADYEN` enum value, `id` prefixed
  `adyen-`) — Marqeta is the closest structural cousin because
  both share all five primary axes: D-04 wire-shape variant 2,
  D-08 entity-decode-then-tag-strip, D-09 omitted with case-
  symmetric bare-brand wire, D-10 applied (Marqeta 2/33 ~6.1 %,
  Adyen 26/260 ~10 %), and D-11 omitted (departments fully
  clean). **Zero structural deviations** from the Marqeta
  template — making this the **eighth** Greenhouse-only company-
  direct plugin in run-history to ship as a clean re-spin
  (after Coursera off Chime, Flexport off Faire, Glossier off
  Flexport, Marqeta off Calendly, New Relic off Maven Clinic,
  Scopely off Marqeta, and Typeform-which-was-actually-one-
  deviation off Lattice).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-marqeta` already supports.
- A dedicated salary parser pass.
- Backfilling historical Adyen postings.
- Adyen product-API / payment-processing / merchant-onboarding
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ADYEN`** in the
> source registry, so that **a single `siteType: [Site.ADYEN]`
> request returns Adyen's open roles without my code knowing
> the underlying ATS slug**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Adyen**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ADYEN = 'adyen'` to `packages/models/src/enums/site.enum.ts`.                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-adyen` under `packages/plugins/`.                   | must     |
| FR-3  | `AdyenService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `adyen-`, `site === Site.ADYEN`, and `companyName === 'Adyen'` (D-09 omitted; case-symmetric bare-brand). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/adyen.service.spec.ts`, all using mocked HTTP.         | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (variant 2). Fallback uses canonical Greenhouse variant-2 form. | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 26 of 260 wire titles in the run-300 probe carry trailing ASCII-space padding (~10 % pad rate). | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 260 wire department names padded. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 260-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 260-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only.                           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[AdyenModule]})` resolves.       |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-adyen/src/adyen.service.ts
@SourcePlugin({ site: Site.ADYEN, name: 'Adyen', category: 'company' })
@Injectable()
export class AdyenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. |

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts D-10 trim lock, D-11
  omission lock, variant-2 URL, decode-then-strip pipeline.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01..D-03 (run #300):** Wrap Greenhouse public API; skip
  Harvest API; no salary parser hook.
- **D-04 (run #300):** **Wire-shape variant 2 — canonical
  Greenhouse host.** **Twenty-second** plugin in the cohort to
  use variant 2.
- **D-05 (run #300):** Use Greenhouse slug `adyen`.
- **D-06 (run #300):** Class names are `AdyenService` /
  `AdyenModule`.
- **D-07 (run #300):** **First plugin in the sixth fresh probe
  sweep.** Selected as the alphabetically-first live-board hit
  from the sixth-sweep candidate pool. The run-300 probe
  sampled ~80 candidate slugs and found seventeen fresh non-
  empty live hits: `adyen` (260, run #300 next bite — this
  spec), `benevity` (~25), `billcom` (~46), `bobbie` (~9),
  `cerebral` (~6), `coalition` (~38), `dollarshaveclub` (~5),
  `hellofresh` (~150-200 actual), `misfitsmarket` (~132 keys),
  `monzo` (~65), `n26` (~94), `planetscale` (~6), `sofi` (large),
  `stockx` (~50), `sweetgreen` (~132 keys), `xai` (~498 keys).
  Plus 2 deferred-empty (`gather`, `calm`).
- **D-08 (run #300):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  sixth** company-direct plugin to apply D-08.
- **D-09 (run #300):** Brand-name trim **omitted** with case-
  symmetric bare-brand wire form. Wire `company_name ===
  'Adyen'` byte-for-byte (5 bytes — fully clean). **Thirty-
  ninth cohort plugin to omit D-09**.
- **D-10 (run #300):** Wire-title `.trim()` deviation is
  **applied**. 26 of 260 wire titles in the run-300 probe carry
  trailing ASCII-space padding (~10 % pad rate). **Twenty-fifth
  cohort plugin to apply D-10**.
- **D-11 (run #300):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 260 wire department names
  padded (`'Account Management'`, `'Finance'`, `'Merchant
  Operations'`, `'Infrastructure'`, `'Compliance'`, etc. —
  clean multi-token forms with internal whitespace). **Thirty-
  fifth cohort plugin** with fully-clean department pass-through.
- **D-12 (run #300):** First plugin in the sixth-fresh-sweep
  pool processing.
- **D-13 (run #300):** **Zero structural deviations** from the
  Marqeta (Spec 084) template — making this the **eighth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin (after Coursera off Chime at run #278,
  Flexport off Faire at run #280, Glossier off Flexport at run
  #282, Marqeta off Calendly at run #294, New Relic off Maven
  Clinic at run #295, Scopely off Marqeta at run #297, and
  Typeform-which-was-actually-one-deviation off Lattice at run
  #299).

## 11. References

- `packages/plugins/source-company-marqeta/src/marqeta.service.ts` —
  closest structural cousin (zero deviations).
- `packages/plugins/source-company-typeform/src/typeform.service.ts` —
  immediate predecessor in run-history.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
