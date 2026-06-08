# Spec: 154 — Source Company Plugin: BitGo

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 154                                                                                                                                                                                            |
| Slug           | source-company-bitgo                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #364)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..153                                                                                                                                                                        |

## 1. Problem Statement

Run #363's Spec 153 closed end-to-end (Bird shipped — first
cohort observation of D-04 variant 41 `.co` TLD careers-list-
page form; 100-plugin D-09-omission threshold crossed). Run
#364 picks up the **third** live hit alphabetically from the
tenth-fresh-sweep candidate pool: **BitGo** (47 visible roles
confirmed at run-364 start — matches the tenth-sweep estimate
exactly, 1× match).

BitGo Holdings, Inc. — operator of the **dominant institutional-
crypto-custody and digital-asset-trust platform pioneered
around the multi-signature cold-storage data model** (founded
by Mike Belshe and Ben Davenport in 2013 in Palo Alto, CA;
private since the 2023 Series C round at ~$1.75B unicorn
valuation; ships BitGo Custody (multi-sig wallets +
qualified-trust storage), BitGo Trust (regulated trust
company), BitGo Prime (institutional trading + lending), and
BitGo Portfolio (digital-asset analytics) across the
institutional-crypto / digital-asset-custody / regulated-
trust vertical — alongside competitors Anchorage Digital,
Coinbase Custody, Fireblocks, and NYDIG — with a hybrid
distributed workforce concentrated across Palo Alto (HQ),
New York, and Remote across the United States, Europe, and
APAC) — is published at the bare `bitgo` Greenhouse slug
(case-asymmetric vs the wire `company_name === 'BitGo'`
PascalCase concat — same byte-count (5 bytes) but byte-
distinct via case at TWO indices: 0 (`B` vs `b`) and 3 (`G`
vs `g`)).

## 2. Goals

- Ship a `source-company-bitgo` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-pagerduty` plugin — PagerDuty is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 PascalCase TWO-cap case-asymmetric + D-10
  applied + D-11 omitted.
- **Zero structural deviations.** Forty-first Greenhouse-only
  company-direct plugin in run history to ship as a clean
  re-spin.
- **Notable D-09 sub-axis observation**: 8th cohort plugin
  with TWO-cap PascalCase D-09 sub-axis. Caps positions (0/3)
  are **NEW caps-at-0/3 sub-pattern** — distinct from prior
  caps-at-0/2 (SoFi/xAI/GoCardless), 0/5 (StockX/PagerDuty),
  and 0/6 (LaunchDarkly/ComplyAdvantage) sub-patterns.
- **Notable D-10 sub-axis observations**:
  - **2nd cohort observation of triple-trailing-space pad
    form** after Formlabs (Spec 147) — `'Mobile Software
    Engineer E3 - (React Native)   '` carries 3 ASCII trailing
    spaces.
  - **6th cohort observation of leading-pad sub-axis** after
    Chainguard / Oscar / Celonis / Formlabs / GoFundMe —
    `' Senior Director Risk Management'` carries leading
    single-space pad (3 listings share the same padded title).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical BitGo postings.
- BitGo product-API / Custody / Trust / Prime / Portfolio
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BITGO`** in the
> source registry, so that **a single `siteType: [Site.BITGO]`
> request returns BitGo's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.BITGO = 'bitgo'` to the `Site` enum.                                                                           | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bitgo`.                                                                    | must     |
| FR-3  | `BitgoService.scrape(input)` returns a `JobResponseDto`; never throws.                                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `bitgo-`, `site === Site.BITGO`, `companyName === 'BitGo'`.                           | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers mixed pad form (5 of 47 padded ~10.6 %; trailing + triple-trailing + leading). | must     |
| FR-14 | D-11 **omitted** — 0 of 47 wire department names padded across 11 unique departments.                                    | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BITGO, name: 'BitGo', category: 'company' })
@Injectable()
export class BitgoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 TWO-cap PascalCase case-asymmetric wire pin**
  (`'BitGo'` 5 bytes; caps at 0/3 — NEW caps-at-0/3 sub-
  pattern); **D-10 mixed pad title-trim lock** (triple-
  trailing-space + leading-pad sub-axes); D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #364):** Wire-shape variant 2 (canonical
  Greenhouse host). **Sixty-first** plugin in the cohort to
  use variant 2.
- **D-08 (run #364):** Decode-then-strip pipeline. **One-
  hundred-and-tenth cohort plugin to apply D-08 — the cohort
  crosses the 110-plugin D-08-application threshold at this
  run.**
- **D-09 (run #364):** **Omitted** with TWO-cap PascalCase
  case-asymmetric wire form. Wire `company_name === 'BitGo'`
  byte-for-byte (5 bytes; case-asymmetric vs slug `bitgo` at
  TWO byte indices: 0 (`B` vs `b`) and 3 (`G` vs `g`)).
  **8th cohort plugin with TWO-cap PascalCase D-09 sub-axis**
  after SoFi (caps 0/2), StockX (caps 0/5), xAI (caps 0/2
  lowercase first), LaunchDarkly (caps 0/6), PagerDuty (caps
  0/5), ComplyAdvantage (caps 0/6), and GoCardless (caps 0/2).
  **NEW caps-at-0/3 sub-pattern** — distinct from all prior
  TWO-cap PascalCase plugins. **One-hundred-and-first cohort
  plugin to omit D-09**.
- **D-10 (run #364):** **APPLIED with mixed pad form +
  second-cohort triple-trailing-space + sixth-cohort leading-
  pad observations.** 5 of 47 wire titles padded (~10.6 % pad
  rate). 1 trailing-pad (`'Backend Engineer E2 - Trade '`) +
  **1 triple-trailing-space pad** (`'Mobile Software Engineer
  E3 - (React Native)   '` — 3 ASCII trailing spaces; **2nd
  cohort observation of triple-pad form** after Formlabs
  Spec 147) + **3 leading-pad** (`' Senior Director Risk
  Management'` — same title across 3 listings; **6th cohort
  observation of leading-pad sub-axis** after Chainguard /
  Oscar / Celonis / Formlabs / GoFundMe). `.trim()` is byte-
  count agnostic and handles all pad widths and positions
  transparently. **Sixty-ninth cohort plugin to apply D-10**.
- **D-11 (run #364):** **Omitted.** 0 of 47 wire department
  names padded across 11 unique department names
  (`'Compliance'`, `'Digital Technology'`, `'Engineering'`,
  `'Finance'`, `'Marketing'`, `'Operations'`, `'Risk'`,
  `'Sales'`, `'Sales Solutions'`, `'Security'`, `'Trust'` —
  clean single-token / two-token forms). **Eighty-eighth
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #364):** **Zero structural deviations** from
  the PagerDuty (Spec 117) template — making this the
  **forty-first** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin. (The new caps-at-
  0/3 sub-pattern, 2nd-cohort triple-trailing-space pad, and
  6th-cohort leading-pad sub-axis observations are captured
  as observability notes within the existing TWO-cap
  PascalCase / D-10-applied envelope — the trim semantics
  are unchanged.)

## 11. References

- `packages/plugins/source-company-pagerduty/src/pagerduty.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-formlabs/src/formlabs.service.ts` —
  prior cohort observation of triple-trailing-space D-10
  sub-axis.
- `packages/plugins/source-company-bird/src/bird.service.ts` —
  immediate predecessor (run #363).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
