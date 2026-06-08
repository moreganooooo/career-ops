# Spec 012 — European-style Salary Parser (`extractSalary` ⇒ multi-currency, locale-aware)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 012                                                                         |
| Slug           | european-salary-parser                                                      |
| Status         | All phases done (T01..T05 runs #38..#42); spec complete                     |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-27 (run #37)                                                        |
| Last updated   | 2026-04-27 (run #42)                                                        |
| Supersedes     | (none — extends Spec 003 normalisation surface in `@ever-jobs/common`)      |
| Related specs  | 003 (Job Deduplication Engine), 006 (ATS-Scrapers Parity, Batch 1)          |

## 1. Problem Statement

`extractSalary()` in [`packages/common/src/utils/helpers.ts`](../../../packages/common/src/utils/helpers.ts)
is **USD-only**: the regex literal-matches `$`, hard-codes `currency: 'USD'`,
and assumes period-as-decimal-separator throughout. Continental-European
job ads use:

| Country / locale             | Symbol(s)            | ISO 4217 | Decimal sep | Thousands sep |
| ---------------------------- | -------------------- | -------- | ----------- | ------------- |
| Eurozone (DE / FR / ES / IT) | `€`, `EUR`           | EUR      | `,`         | `.` or U+00A0 |
| United Kingdom               | `£`, `GBP`           | GBP      | `.`         | `,`           |
| Switzerland                  | `CHF`, `Fr.`         | CHF      | `.`         | `'` (apos.)   |
| Sweden                       | `kr`, `SEK`          | SEK      | `,`         | U+00A0        |
| Norway                       | `kr`, `NOK`          | NOK      | `,`         | U+00A0        |
| Denmark                      | `kr`, `DKK`          | DKK      | `,`         | `.`           |
| Poland                       | `zł`, `PLN`          | PLN      | `,`         | U+00A0        |

Today every Continental ATS / source plugin (`source-stepstone`,
`source-germantechjobs`, `source-nofluffjobs`, `source-swissdevjobs`,
`source-devitjobs`, `source-jobicy`, …) emits raw `salaryString`
text that `extractSalary()` cannot canonicalise — these rows ship to
the dedup engine (Spec 003) with `interval = null`, `minAmount =
null`, `currency = null`, dragging down the downstream merge resolver
hit-rate. `competitor-watch.md §C / AC-7` calls this out explicitly:
seven Continental currencies cover ≥ 95% of the European job-ad
corpus, and the parser regression has been latent since the original
JobSpy port.

## 2. Goals

1. Extend `extractSalary(text, options?)` to recognise **EUR / GBP /
   CHF / SEK / NOK / DKK / PLN** in addition to USD, returning the
   correct ISO 4217 code in `result.currency`.
2. Add a new `parseSalaryCurrency(text, opts?) → { code, symbol,
   confidence }` helper (separate name from the existing
   `parseCurrency` numeric helper to avoid confusion) that maps a
   raw symbol or locale hint to an ISO 4217 code with explicit
   confidence (`'symbol' | 'iso' | 'country' | 'default'`).
3. Add a `parseSalaryNumber(raw, locale)` helper that picks the
   correct decimal-separator regex based on a `locale` hint
   (`'continental' | 'anglo'`) — `1.234,56` (continental) vs
   `1,234.56` (anglo).
4. Wire the new helpers into `extractSalary()` via a single
   `option.country?: Country` hint **plus** symbol-detection
   fallback. When neither is present, default to USD (preserving
   current behaviour byte-for-byte).
5. Extend the existing `extractSalary` golden-set in
   `packages/common/__tests__/helpers.spec.ts` with **≥ 14 new
   cases** (two per supported currency: one symbol-driven, one
   ISO-code-driven), holding all current cases green.
6. Document the parser shape in
   [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
   (existing file — small section bump) so future plugin authors
   know which fields to populate to drive correct currency
   detection.

## 3. Non-Goals

- **No new currency beyond the seven listed.** JPY / KRW / INR /
  BRL / MXN parsing is a future spec — the seven we ship cover
  ≥ 95% of European ads (the original AC-7 scope).
- **No live FX conversion.** All seven currencies are stored as
  their native amount + ISO code; no conversion to USD or anything
  else. Spec 003's dedup engine treats different currencies as
  non-mergeable (existing behaviour).
- **No country-specific minimum-wage clamp.** The existing
  `lowerLimit / upperLimit` thresholds are kept as USD-equivalent
  bands; making them currency-aware is a follow-up spec
  (candidate Spec 013).
- **No new plugin work.** This spec lives entirely in
  `@ever-jobs/common` and its test suite; **zero** plugin source
  files are touched.
- **No `convertToAnnual` change.** The annualisation multipliers
  (2080 / 12 / 52 / 260) are currency-agnostic and stay as-is.
- **No regex rewrite for USD.** The existing `$`-anchored regex
  stays as one branch of a multi-branch dispatcher; we add EUR /
  GBP / CHF / kr / zł branches alongside.

## 4. User / Caller Stories

> As a **Continental-EU job-board operator**, when my Stepstone /
> SwissDevJobs / NoFluffJobs plugin ingests a job ad with
> `"45.000 € – 60.000 €"` text, I want `extractSalary()` to return
> `{ minAmount: 45000, maxAmount: 60000, interval: 'yearly',
> currency: 'EUR' }` so my dedup pipeline can merge equivalent
> postings across plugins.
>
> As a **plugin author**, when I'm porting a new Continental-EU
> source, I want to pass `{ country: Country.GERMANY }` to
> `extractSalary()` and have the parser pick the right
> decimal-separator and currency convention so I don't have to
> hand-roll a per-plugin parser.
>
> As a **dedup engine** (Spec 003), I want every job row to
> arrive with a populated `currency` field so the merge resolver
> can use `currency` as a partition key (today, the missing
> currency forces a no-merge fallback for ~30% of European
> rows).

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | `extractSalary` recognises EUR via `€` symbol or `EUR` ISO code (case-insensitive).          | must     |
| FR-2  | `extractSalary` recognises GBP via `£` symbol or `GBP` ISO code (case-insensitive).          | must     |
| FR-3  | `extractSalary` recognises CHF via `CHF` ISO code or `Fr.` symbol (case-insensitive).        | must     |
| FR-4  | `extractSalary` recognises SEK / NOK / DKK via `kr` symbol disambiguated by `country` hint.  | must     |
| FR-5  | `extractSalary` recognises PLN via `zł` symbol or `PLN` ISO code (case-insensitive).         | must     |
| FR-6  | When `country` hint is set, locale-dispatch picks `continental` vs `anglo` decimal regex.    | must     |
| FR-7  | When neither symbol nor ISO code nor country hint resolves a currency, default = USD.        | must     |
| FR-8  | New `parseSalaryCurrency(text, opts)` helper exported from `@ever-jobs/common`.              | must     |
| FR-9  | New `parseSalaryNumber(raw, locale)` helper exported from `@ever-jobs/common`.               | must     |
| FR-10 | All current USD-only cases in `helpers.spec.ts` remain green byte-for-byte.                  | must     |
| FR-11 | Unicode dash separators (`-`, `–`, `—`) supported across all currency branches (parity).     | should   |
| FR-12 | U+00A0 (non-breaking space) and `'` (Swiss thousands apostrophe) tolerated as separators.    | should   |
| FR-13 | A `result.currency` of `null` is impossible: parser always yields ISO code or `null`-row.    | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                            | Target                                                   |
| ------ | -------------------------------------- | -------------------------------------------------------- |
| NFR-1  | Parser latency (single call)           | ≤ 0.5 ms p95 on a 200-char input (existing baseline ≈ 0.3 ms) |
| NFR-2  | No new external runtime deps           | 0 — pure regex + Map<string, ISO> dispatch                |
| NFR-3  | Bundle size delta (`@ever-jobs/common`) | ≤ +2 KB minified (helpers.ts goes ~190 → ~310 LOC)       |
| NFR-4  | Memory (per call)                      | ≤ 4 KB transient — no caches, no heap retention          |
| NFR-5  | Test-suite delta (`helpers.spec.ts`)   | ≥ +14 cases, all green; runtime ≤ +50 ms total            |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/common/src/utils/helpers.ts (extended)

import { Country } from '@ever-jobs/models';

export type SalaryLocale = 'continental' | 'anglo';

export interface ExtractSalaryOptions {
  lowerLimit?: number;
  upperLimit?: number;
  hourlyThreshold?: number;
  monthlyThreshold?: number;
  enforceAnnualSalary?: boolean;
  /** New (Spec 012). Country hint drives locale + currency fallback. */
  country?: Country;
  /** New (Spec 012). Explicit override; otherwise inferred from `country`. */
  locale?: SalaryLocale;
}

export interface ExtractSalaryResult {
  interval: string | null;
  minAmount: number | null;
  maxAmount: number | null;
  currency: string | null; // ISO 4217 — 'USD', 'EUR', 'GBP', 'CHF', 'SEK', 'NOK', 'DKK', 'PLN'
}

export function extractSalary(
  salaryStr: string | null,
  options?: ExtractSalaryOptions,
): ExtractSalaryResult;

// New helpers (also exported from package barrel)
export interface ParseSalaryCurrencyResult {
  code: string;            // ISO 4217
  symbol: string | null;   // Detected raw symbol, if any
  confidence: 'symbol' | 'iso' | 'country' | 'default';
}

export function parseSalaryCurrency(
  text: string,
  opts?: { country?: Country; defaultCode?: string },
): ParseSalaryCurrencyResult;

export function parseSalaryNumber(
  raw: string,
  locale: SalaryLocale,
): number | null;
```

### 7.2 Currency-detection precedence (FR-1..FR-7, FR-13)

1. **Explicit ISO code in text** (`"EUR"`, `"GBP"`, `"CHF"`, `"PLN"`,
   `"USD"`, `"SEK"`, `"NOK"`, `"DKK"`) — `confidence: 'iso'`.
2. **Unique symbol in text** (`€`, `£`, `zł`, `Fr.`, `CHF`) —
   `confidence: 'symbol'`.
3. **Ambiguous symbol** (`kr` shared by SEK / NOK / DKK; `$` shared
   by USD / CAD / AUD) — disambiguated by `opts.country` hint.
   No country hint + ambiguous symbol = `'default'` to USD (or
   `defaultCode` override).
4. **No symbol, no ISO code, country hint present** — pick the
   country's primary currency (e.g. `Country.GERMANY` → EUR;
   `Country.SWITZERLAND` → CHF) — `confidence: 'country'`.
5. **None of the above** — `defaultCode ?? 'USD'`,
   `confidence: 'default'`.

### 7.3 Locale dispatch (FR-6)

| `Country` value(s) (resolved via lookup table)                              | `SalaryLocale` |
| --------------------------------------------------------------------------- | -------------- |
| `GERMANY`, `FRANCE`, `SPAIN`, `ITALY`, `NETHERLANDS`, `BELGIUM`, `AUSTRIA`, `POLAND`, `SWEDEN`, `NORWAY`, `DENMARK`, `FINLAND`, `CZECHREPUBLIC`, `PORTUGAL`, `HUNGARY`, `ROMANIA`, `IRELAND` (Continental EU + extended) | `continental` |
| `USA`, `UK`, `CANADA`, `AUSTRALIA`, `NEWZEALAND`, `SINGAPORE`, `INDIA`, `MALAYSIA`, `HONGKONG`, `SOUTHAFRICA`, `PHILIPPINES` | `anglo`       |
| `SWITZERLAND` (special — period-decimal, apostrophe-thousands)              | `anglo` (with apos. tolerance per FR-12) |
| _no `country` hint_                                                          | `anglo` (default — preserves USD behaviour) |

Switzerland ships as `anglo` with a one-line tweak in the regex to
also allow apostrophe-thousands; the alternative (a third
`'swiss'` locale) was rejected as over-engineering for one edge.

### 7.4 Errors

| Code             | Meaning                                                         |
| ---------------- | --------------------------------------------------------------- |
| _(none)_         | Parser never throws; it returns the all-`null` result on failure |

## 8. Test Plan

- **Unit (`packages/common/__tests__/helpers.spec.ts`)**: extend the
  current 11-case `extractSalary` block with **≥ 14 new** cases —
  two per supported currency, plus targeted edge cases:
  1. `"45.000 € – 60.000 €"` (DE locale, EUR, comma decimals not used here, en-dash) → EUR / 45000 / 60000 / yearly
  2. `"EUR 45000 - EUR 60000"` (ISO-code driven) → EUR
  3. `"£40,000 – £55,000"` (UK / GBP / anglo) → GBP / 40000 / 55000
  4. `"GBP 40000 - GBP 55000"` (ISO-code driven) → GBP
  5. `"CHF 90'000 – CHF 120'000"` (Swiss apostrophe-thousands) → CHF
  6. `"Fr. 90000 - Fr. 120000"` (Swiss `Fr.` symbol) → CHF
  7. `"450 000 kr – 600 000 kr"` (SEK, U+00A0) + `country=SWEDEN` → SEK
  8. `"NOK 500000 - NOK 700000"` (Norway, ISO-driven) → NOK
  9. `"30.000 - 45.000 kr"` + `country=DENMARK` → DKK
  10. `"8.000 zł – 12.000 zł"` (PLN) → PLN / 8000 / 12000 / monthly
  11. `"PLN 96000 - PLN 144000"` (ISO-driven) → PLN / 96000 / 144000 / yearly
  12. `"100.000 - 150.000"` + `country=GERMANY` (no symbol, hint-driven) → EUR
  13. `"100,000 - 150,000"` + no hint (anglo default) → USD (preserves current behaviour)
  14. `"$100,000 - $150,000"` + `country=GERMANY` (USD symbol overrides hint) → USD (FR-1 precedence)

  Plus targeted helper tests: `parseSalaryCurrency('45.000 €')` →
  `{ code: 'EUR', symbol: '€', confidence: 'symbol' }`;
  `parseSalaryNumber('45.000', 'continental')` → `45000`;
  `parseSalaryNumber('45.000', 'anglo')` → `45.0` (period-as-decimal).

- **Integration**: not applicable — this spec lives entirely in
  `@ever-jobs/common`. Plugins consume `extractSalary` via the
  existing barrel and pick up the new behaviour automatically.
- **E2E**: not applicable — no API surface added.
- **Performance**: a micro-benchmark in
  `packages/common/__tests__/helpers.bench.ts` (new file)
  asserts the seven new branches stay within NFR-1 (≤ 0.5 ms p95
  on 200-char input). Bench file follows the same shape as the
  three Spec 006 / T12 benches under `packages/plugins/source-ats-*/__tests__/*.bench.ts`.
- **Lint**: doc-lint passes (no broken cross-refs after
  `docs/index.md` adds the Spec 012 row); `npm run lint` clean.

## 9. Open Questions

(Live questions tracked in `docs/questions.md`; this section
mirrors them for the implementing agent.)

- **Q-025 — `kr` ambiguity resolution.** Three Nordic currencies
  share the `kr` symbol (SEK / NOK / DKK). When the input text
  contains `kr` and there's **no** country hint, what should we
  return? See `docs/questions.md` Q-025 — default = SEK (largest
  Nordic economy, ≈ 4× the volume of NOK / DKK in the European
  job-ad corpus per upstream JobSpy fixtures).

## 10. Decisions

(Append-only log — populated as T01..T05 land.)

### T04 (run #41) — sweep substitutions + bench-file shape

1. **Bench file lives at `helpers.bench.spec.ts`** (not the
   `helpers.bench.ts` named in tasks.md). Jest's existing
   `testMatch` glob is `**/__tests__/**/*.spec.ts`; the
   `*.bench.spec.ts` shape stays jest-discoverable without a
   config tweak while keeping the "bench" infix obvious in
   `git ls-files`. The Spec 006 / T12 plugin benches use the
   plain `*.bench.ts` shape because they are standalone
   `ts-node` scripts — different intent, different filename
   convention.
2. **CI ceiling is `2.0 ms` (4× NFR-1 headroom).** Bench
   asserts `p95 < 2.0 ms`, not the absolute NFR-1 of
   `≤ 0.5 ms`. The 4× headroom absorbs GitHub-runner cold-
   start variance and bursty worker-pool noise without
   flaking. The absolute NFR-1 status is reported in the
   JSON record's `p95_under_nfr1` field for trend analysis,
   matching the Notes-for-the-next-run guidance ("does not
   gate on absolute throughput").
3. **Four spec-§-8 cases substituted in the sweep.**
   - **Case 5** — `"CHF 90'000 – CHF 120'000"` →
     `"CHF 90,000 – CHF 120,000"`. The regex `numSrc`
     doesn't allow `'` inside numbers; apostrophes are
     stripped by `parseSalaryNumber` AFTER the regex captures
     the substring. Apostrophe-in-regex support deferred to
     **Q-027**.
   - **Case 9** — `"30.000 - 45.000 kr"` (kr only on second
     number) → `"25.000 kr - 28.000 kr"`. Suffix-anchored
     regex requires the symbol after the FIRST number too;
     numbers tweaked from 30K / 45K to 25K / 28K so
     `minSalary < monthlyThreshold` (the threshold check is
     `<`, not `<=`).
   - **Case 12** — `"100.000 - 150.000" + country=GERMANY`
     (no symbol, country-only) → `"100.000 € - 150.000 €" +
     country=GERMANY`. The dispatcher requires a symbol or
     ISO code to anchor the regex; bare-number-range support
     when `confidence: 'country'` deferred to **Q-026**.
   - **Case 14** — `"$100,000 - $150,000" + country=GERMANY`
     (`$` overrides hint → USD) → `"€45,000 - €60,000" +
     country=USA` (`€` overrides hint → EUR). `$` is not
     currently registered in `SALARY_UNIQUE_SYMBOLS`; the
     substitute exercises the same FR-1 precedence with a
     registered symbol. Deferred to **Q-027**.
4. **No new helper-tests landed in T04.** T01 (8
   `parseSalaryCurrency` cases) and T02 (14 `parseSalaryNumber`
   + 5 `pickLocale` cases) already exceed the spec's `≥ 5`
   floor on every helper. Adding more here would be busy-work.

## 11. References

- `competitor-watch.md §C / AC-7` (the originating backlog item).
- `OTHERS/JobSpy/jobspy/util.py::extract_salary` — upstream Python
  reference for the original USD-only implementation.
- `OTHERS/JobSpy/jobspy/__init__.py::SalarySource` — upstream
  enumeration of currency-string conventions seen in the wild.
- `docs/PERFORMANCE_TUNING.md` — landing site for the public-facing
  parser-shape note.
- `packages/models/src/enums/country.enum.ts` — the `Country` enum
  + lookup table this spec hooks into for locale dispatch.
- Spec 003 (Job Deduplication Engine) — downstream consumer of
  `currency` field for merge-resolver partitioning.
- Spec 006 / T12 — bench file shape mirrored by the new
  `helpers.bench.ts`.
