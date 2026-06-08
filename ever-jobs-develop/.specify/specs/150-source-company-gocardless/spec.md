# Spec: 150 — Source Company Plugin: GoCardless

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 150                                                                                                                                                                                            |
| Slug           | source-company-gocardless                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #360)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..149                                                                                                                                                                        |

## 1. Problem Statement

Run #359's Spec 149 closed end-to-end (Fox shipped — 38th
clean re-spin off BEAM; fourth cohort observation of slug-
truncation D-09 with NEW largest slug-token-truncation factor;
30-plugin D-10-omission threshold crossed). Run #360 picks up
the **sixteenth** live hit alphabetically from the ninth-
fresh-sweep candidate pool: **GoCardless** (41 visible roles
confirmed at run-360 start — ninth-sweep estimate ~36; ~1.14×
ratio, near-1× match).

GoCardless Ltd. — operator of the **dominant bank-debit
recurring-payments-as-a-service platform pioneered around the
direct-debit / bank-payment data model** (founded by Hiroki
Takeuchi, Matt Robinson, and Tom Blomfield in 2011 in London,
UK; private since the 2022 Series G round at ~$2.1B unicorn
valuation; ships GoCardless Direct Debit, Instant Bank Pay,
Protect+ (AI fraud / verified-mandates), and Embedded Finance
APIs across the bank-payment / payment-orchestration / SME-
fintech vertical — alongside competitors Stripe, Adyen, Plaid
Pay-by-Bank, Bottomline, and Token.io — with a hybrid
distributed workforce concentrated across London (HQ), Paris,
Munich, Melbourne, and Remote across the United Kingdom,
Europe, the United States, and APAC) — is published at the
bare `gocardless` Greenhouse slug (case-asymmetric vs the
wire `company_name === 'GoCardless'` PascalCase concat —
same byte-count (10 bytes) but byte-distinct via case at TWO
indices: 0 (`G` vs `g`) and 2 (`C` vs `c`)).

## 2. Goals

- Ship a `source-company-gocardless` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-pagerduty` plugin — PagerDuty is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 PascalCase TWO-cap case-asymmetric + D-10
  applied + D-11 omitted.
- **Zero structural deviations.** Thirty-ninth Greenhouse-
  only company-direct plugin in run history to ship as a
  clean re-spin.
- **Notable D-09 sub-axis observation**: 7th cohort plugin
  with TWO-cap PascalCase D-09 sub-axis. Caps positions
  (0/2) match SoFi (Spec 102) and xAI (Spec 105 lowercase-
  first) exactly — **third cohort plugin with caps-at-0/2
  sub-pattern**.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical GoCardless postings.
- GoCardless product-API / Direct Debit / Instant Bank Pay
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.GOCARDLESS`** in
> the source registry, so that **a single `siteType:
> [Site.GOCARDLESS]` request returns GoCardless's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.GOCARDLESS = 'gocardless'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-gocardless`.                                                               | must     |
| FR-3  | `GocardlessService.scrape(input)` returns a `JobResponseDto`; never throws.                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `gocardless-`, `site === Site.GOCARDLESS`, `companyName === 'GoCardless'`.            | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (1 of 41 padded ~2.4 %).                                 | must     |
| FR-14 | D-11 **omitted** — 0 of 41 wire department names padded across 6 unique departments.                                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GOCARDLESS, name: 'GoCardless', category: 'company' })
@Injectable()
export class GocardlessService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 TWO-cap PascalCase case-asymmetric wire pin**
  (`'GoCardless'` 10 bytes; caps at 0/2); D-10 trailing-pad
  title-trim lock (`'Site Reliability Engineer '` → `'Site
  Reliability Engineer'`); D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #360):** Wire-shape variant 2 (canonical
  Greenhouse host). **Fifty-eighth** plugin in the cohort
  to use variant 2.
- **D-08 (run #360):** Decode-then-strip pipeline. **One-
  hundred-and-sixth** cohort plugin to apply D-08.
- **D-09 (run #360):** **Omitted** with TWO-cap PascalCase
  case-asymmetric wire form. Wire `company_name ===
  'GoCardless'` byte-for-byte (10 bytes; case-asymmetric vs
  slug `gocardless` at TWO byte indices: 0 (`G` vs `g`) and
  2 (`C` vs `c`)). **7th cohort plugin with TWO-cap
  PascalCase D-09 sub-axis** after SoFi (caps 0/2), StockX
  (caps 0/5), xAI (caps 0/2 lowercase first), LaunchDarkly
  (caps 0/6), PagerDuty (caps 0/5), and ComplyAdvantage
  (caps 0/6). **Caps-at-0/2 matches SoFi (Spec 102) and xAI
  (Spec 105) exactly** — **third cohort plugin with caps-
  at-0/2 sub-pattern**. Distinct from xAI by being uppercase-
  first (xAI is lowercase-first). **Ninety-seventh cohort
  plugin to omit D-09**.
- **D-10 (run #360):** **APPLIED with trailing-pad form.** 1
  of 41 wire titles padded with single-trailing-ASCII-space
  form (~2.4 % pad rate, all trailing-only — `'Site
  Reliability Engineer '`). **Sixty-fifth cohort plugin to
  apply D-10**.
- **D-11 (run #360):** **Omitted.** 0 of 41 wire department
  names padded across 6 unique department names (`'Customer'`,
  `'Marketing'`, `'People'`, `'Product Development'`,
  `'Risk'`, `'Sales'` — clean single-token / two-token forms).
  **Eighty-fifth cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #360):** **Zero structural deviations** from the
  PagerDuty (Spec 117) template — making this the **thirty-
  ninth** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin. (The caps-at-0/2 sub-pattern is
  captured as an observability note within the existing
  TWO-cap PascalCase D-09 sub-axis — the trim semantics are
  unchanged.)

## 11. References

- `packages/plugins/source-company-pagerduty/src/pagerduty.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-sofi/src/sofi.service.ts` —
  prior cohort plugin with caps-at-0/2 sub-pattern.
- `packages/plugins/source-company-fox/src/fox.service.ts` —
  immediate predecessor (run #359).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
