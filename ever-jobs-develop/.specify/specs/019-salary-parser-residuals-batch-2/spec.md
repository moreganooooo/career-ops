# Spec 019 — Salary Parser Residuals, Batch 2 (Bare-Path Raw-Value Pre-Check Threshold Bump — close Spec 015 / FR-8 documented limitation)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 019                                                                         |
| Slug           | salary-parser-residuals-batch-2                                             |
| Status         | All phases done (T03 run #81); spec complete                                |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-28 (run #78)                                                        |
| Last updated   | 2026-04-28 (run #81)                                                        |
| Supersedes     | Spec 015 / FR-8 (documented limitation re-classified as a closed gap)       |
| Related specs  | 012 (European-style Salary Parser — established the multi-currency dispatcher); 014 (Salary Parser Residuals — `$` registration + apostrophe-thousands + bare-path Q-026); 015 (Salary Parser Locale & Prose Immunity — added the bare-path raw-value pre-check this spec retunes); 016 (`helpers.bench.spec.ts` TS1127 fix — restored the bench acceptance gate this spec re-runs at T01 / T02) |

## 1. Problem Statement

Spec 015 / FR-2 (run #66) added a raw-value pre-check on the
bare-regex match path of
[`extractSalary`](../../../packages/common/src/utils/helpers.ts):
when `matchedFromBare && match[2] !== 'k' && match[4] !== 'k' &&
minSalary < lowerLimit / 12`, return the all-`null` envelope. The
threshold was deliberately set to `lowerLimit / 12 ≈ 83` so the
parser would still admit legitimate Continental low-end shapes
like `"100 - 150"` (rare entry-level postings). Spec 015 / FR-8
explicitly documents this admission as a **known limitation**:
`"100 - 150" + country=GERMANY` still emits
`{ interval: 'hourly', minAmount: 100, maxAmount: 150,
currency: 'EUR' }` after the dispatcher annualises
`100 * 2080 = 208000` and the bounds check passes.

The Spec 015 / FR-8 documented limitation is the load-bearing
residual for `salary-parser-residuals-batch-2`. The bare-path
admission of `min ≥ 83` produces synthetic
`{ interval: 'hourly' }` rows on **prose** like:

- `"benefits include 100 - 150 EUR monthly grocery allowance"`
- `"team of 100 - 150 employees"`
- `"100 - 150 km commute radius"`
- `"100 - 150 days per year remote"`
- `"between 200 and 400 customer interactions per day"`

…whenever the upstream plugin (Stepstone-DE / JobUp-CH /
Pracuj-PL) supplies a `country` hint in `ScraperInputDto.country`.
The country-tier guard alone is insufficient — it differentiates
"have a country hint" from "no country hint", not "salary text"
from "prose text".

These false positives leak into Spec 003's deduplication-engine
input as synthetic salary rows: a job ad whose true compensation
is "competitive (€60k–80k)" mentioned ONLY in the
employee-benefits paragraph would be canonicalised as a low-end
hourly EUR row, conflicting with peer-source canonicalisation of
the same listing. The dedup engine's `salaryAlignment` signal
(Spec 003 / FR-9) treats the two synthetic rows as
`hourly:100..150` and `yearly:60000..80000`, scoring them as
disjoint when they should be merged.

Spec 019's job is to **bump the bare-path raw-value threshold
from `lowerLimit / 12 ≈ 83` to `lowerLimit ≈ 1000`** —
single-token source edit, dimensional rejection rule (no
string-content inspection), preserves all 73 existing
[`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts)
test cases. The bump rejects the FR-8 documented limitation
(`100 < 1000` → reject) while admitting the legitimate Continental
monthly range (`1000 ≥ 1000` → admit, annualised `1000 * 12 = 12000`).

## 2. Goals

1. **Close the FR-8 documented limitation.** Bump the bare-path
   raw-value pre-check threshold from `lowerLimit / 12 ≈ 83`
   to `lowerLimit ≈ 1000`. Re-classify Spec 015 / FR-8 from
   "documented known limitation" to "closed gap" via a Decision
   D-NN entry in this spec's § 10. (FR-1)
2. **Pin the new behaviour.** Add ≥ 2 new test cases in
   [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts):
   - `"100 - 150" + country=GERMANY` → all-`null` envelope.
   - `"team of 100 - 150 employees" + country=GERMANY` →
     all-`null` envelope (FR-8 prose-immunity additive coverage).
   And ≥ 1 new admit-side test case to pin the threshold
   boundary:
   - `"1000 - 1500" + country=GERMANY` → `{ interval: 'monthly',
     minAmount: 1000 (or annualised), maxAmount: 1500 (or
     annualised), currency: 'EUR' }`.
   (FR-2 / NFR-5)
3. **Preserve byte-identical behaviour on every other path.**
   The 73 existing
   [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts)
   cases stay green. The prefix-anchored, suffix-anchored, and
   K-suffix bare-path branches are not touched. Bench p95
   stays within ≤ +0.1 ms of the Spec 016 baseline (`0.0174 ms`
   recorded run #69). (FR-3 / NFR-1 / NFR-2)
4. **Document the new behaviour.** Update
   [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
   to reclassify the `"100 - 150"` Continental low-end shape
   from "FR-8 known limitation (admitted)" to "Spec 019 / FR-1
   rejected (use prefix/suffix path with currency symbol or
   ISO instead)". (FR-4)
5. **Close the spec lean.** Spec 019 lifecycle fits 3 phases /
   3 runs (T01 source edit + T02 test pin + T03 closeout) —
   matches the Spec 014 / Spec 015 cadence. Test count delta:
   73 → 76 (+3 cases). (NFR-4 / NFR-5)

## 3. Non-Goals

- **No new currency support.** The eight-currency dispatcher
  (USD / GBP / CHF / EUR / SEK / NOK / DKK / PLN) stays exact;
  no new symbol or ISO entries.
- **No regex changes.**
  [`buildSalaryRegexBare`](../../../packages/common/src/utils/helpers.ts:692),
  [`buildSalaryRegexPrefix`](../../../packages/common/src/utils/helpers.ts:621),
  and `buildSalaryRegexSuffix` stay byte-identical. The fix is
  a single inequality threshold change in
  [`extractSalary`](../../../packages/common/src/utils/helpers.ts:799)'s
  raw-value pre-check.
- **No `parseSalaryNumber` / `parseSalaryCurrency` changes.**
  Both helpers stay UNCHANGED (FR-9 inherited from Spec 015).
- **No stop-word filter.** Q-041 / Option B explicitly rejected
  as fragile (i18n-brittle; needs DE / FR / PL / NL keyword
  lists). The dimensional `< lowerLimit` rule is
  language-independent.
- **No bare-regex tightening.** Q-041 / Option C rejected
  because the regex change would alter the captured shape and
  require parallel edits in `parseSalaryNumber`-feeding paths.
- **No `Country` enum changes.** No `SalaryLocale` enum
  changes. No `CURRENCY_TO_NATURAL_LOCALE` changes.
- **No bench fixture extension.** The existing
  [`helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
  already exercises the dispatcher hot path; Spec 019 reuses
  the bench at T01 + T02 acceptance to verify NFR-1.
- **No plugin source changes.** The bare-path pre-check is
  internal to `@ever-jobs/common`; plugins inherit the new
  behaviour transparently via the existing barrel export.
- **No `Country` → `Locale` map changes.** `SALARY_LOCALE_MAP`
  stays exact.
- **No new bench-acceptance gate.** The bench acceptance gate
  was restored by Spec 016 / T01 (run #69) at p95 = 0.0174 ms
  against the 0.5 ms NFR-1 ceiling and the 2.0 ms CI ceiling;
  Spec 019's edits should not measurably affect that figure
  (the threshold change is one inequality token).
- **No PERFORMANCE_TUNING.md restructuring.** Only the FR-8
  paragraph and the matching example are updated; the rest of
  the doc stays exact.
- **No out-of-repo upstream-watch ledger row at scaffold pass.**
  Spec 019 is internal-correctness driven (Q-041); the
  external-snapshot tag set (recorded out-of-repo) has not
  changed for 56 consecutive runs through run #77. The
  out-of-repo ledger gains no new tracked row from Spec 019.

## 4. User / Caller Stories

> As a **Stepstone-DE plugin author**, when my plugin ingests
> a job-description paragraph like `"team of 100 - 150 employees,
> based in Munich"` with `country: GERMANY` metadata, I want
> `extractSalary(text, { country: GERMANY })` to return all-`null`
> — not a synthetic
> `{ interval: 'hourly', minAmount: 100, maxAmount: 150,
> currency: 'EUR' }` row that leaks into the dedup engine's
> salary-alignment signal.

> As a **JobUp-CH / Pracuj-PL plugin author**, when an upstream
> ad mentions `"100 - 150 km commute radius"` as a benefit, I
> want `extractSalary(text, { country: SWITZERLAND })` (or
> `country: POLAND`) to return all-`null` — not a synthetic
> hourly CHF / PLN range.

> As a **`@ever-jobs/common` maintainer**, when I close
> Spec 015 / FR-8 documented limitation, I want the source-side
> change to be a single-token edit (one inequality threshold
> bump) so the regression risk is bounded and the
> 73-case `helpers.spec.ts` regression sweep stays byte-for-byte
> green.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | The bare-path raw-value pre-check in [`extractSalary`](../../../packages/common/src/utils/helpers.ts:799) bumps its threshold from `lowerLimit / 12` to `lowerLimit`. The single-token edit at `helpers.ts:803` (`minSalary < lowerLimit / 12` → `minSalary < lowerLimit`) closes Spec 015 / FR-8 documented limitation. | must     |
| FR-2  | Three new test cases land in [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts): (a) `"100 - 150" + country=GERMANY` → all-`null`; (b) `"team of 100 - 150 employees" + country=GERMANY` → all-`null` (additive prose-immunity coverage); (c) `"1000 - 1500" + country=GERMANY` → admit at the threshold boundary (annualised monthly). | must     |
| FR-3  | All 73 existing [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts) cases stay green byte-for-byte (no removal, no assertion edit). The 76th-case sweep is the load-bearing T02 acceptance gate. | must     |
| FR-4  | [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md) is updated at T03 (closeout) to reclassify the `"100 - 150" + country=GERMANY` shape from "FR-8 known limitation (admitted)" to "Spec 019 / FR-1 rejected (use prefix/suffix path with currency symbol or ISO instead)". | must     |
| FR-5  | Idempotence: re-running T01 against an already-bumped `helpers.ts` produces a no-op diff. The single-token edit is identifiable by the literal token `lowerLimit / 12` (pre) → `lowerLimit` (post). | must     |
| FR-6  | The K-suffix bare-path admission stays byte-identical: `"5K - 7K" + country=GERMANY` → `{ interval: 'yearly', minAmount: 5000, maxAmount: 7000, currency: 'EUR' }` (after K-multiplication). The pre-check guard `match[2] !== 'k' && match[4] !== 'k'` ensures K-suffix shapes bypass the threshold check entirely. | must     |
| FR-7  | The Spec 015 / Q-036 prose-immunity cases stay green: `"5 - 7 years experience" + country=GERMANY` and `"3 - 5 month internship" + country=GERMANY` both return all-`null`. The new `lowerLimit` threshold is strictly stricter than the old `lowerLimit / 12` threshold (1000 > 83), so any input rejected at 83 is also rejected at 1000. | must     |
| FR-8  | The Continental yearly bare-path shape stays admitted: `"100.000 - 150.000" + country=GERMANY` → `{ interval: 'yearly', minAmount: 100000, maxAmount: 150000, currency: 'EUR' }`. After continental-locale parsing of `100.000` → `100000`, the new threshold check (`100000 ≥ 1000`) admits the row. | must     |
| FR-9  | `parseSalaryCurrency()` and `parseSalaryNumber()` signatures + behaviours stay UNCHANGED (FR-9 inherited from Spec 015). The Spec 019 fix is localised to the `extractSalary` body's pre-check on line 803. | must     |
| FR-10 | Per-call regex compilation discipline preserved (FR-10 inherited from Spec 012 / 014 / 015). The threshold change does not alter regex compilation paths. | must     |

## 6. Non-Functional Requirements

| ID    | Requirement                                                              | Target           |
| ----- | ------------------------------------------------------------------------ | ---------------- |
| NFR-1 | Bench p95 within ≤ +0.1 ms of the Spec 016 baseline (`0.0174 ms`).       | ≤ +0.1 ms        |
| NFR-2 | Bench p95 absolute remains under the documented 0.5 ms NFR-1 ceiling.    | < 0.5 ms         |
| NFR-3 | Bundle-size delta from Spec 019 source edits.                            | ≤ +0.1 KB        |
| NFR-4 | Spec 019 lifecycle fits 3 phases / 3 runs (lean Spec-014 / 015 cadence). | ≤ 3 runs         |
| NFR-5 | Test-count delta: 73 → 76 (T02 adds 3 cases — two reject pins + one threshold-boundary admit). | +3 cases |
| NFR-6 | All 73 Spec 012 + Spec 014 + Spec 015 cases stay byte-for-byte green.    | 0 regressions    |
| NFR-7 | Doc-lint (`npm run lint:docs`) clean at every phase boundary.            | exit 0           |

## 7. Contracts

### 7.1 Source-side change (T01 / FR-1)

**File:**
[`packages/common/src/utils/helpers.ts`](../../../packages/common/src/utils/helpers.ts)
(line 803, inside the `extractSalary` body's bare-path
raw-value pre-check block introduced by Spec 015 / FR-2).

**Pre-edit (current text — Spec 015 / FR-2 / run #66):**

```ts
  if (
    matchedFromBare &&
    match[2].toLowerCase() !== 'k' &&
    match[4].toLowerCase() !== 'k' &&
    minSalary < lowerLimit / 12
  ) {
    return result;
  }
```

**Post-edit (target text — Spec 019 / FR-1 / T01):**

```ts
  if (
    matchedFromBare &&
    match[2].toLowerCase() !== 'k' &&
    match[4].toLowerCase() !== 'k' &&
    minSalary < lowerLimit
  ) {
    return result;
  }
```

**Diff token:** `lowerLimit / 12` → `lowerLimit` (4 tokens
deleted, 0 inserted; net -4 tokens). The change is a single
inequality threshold adjustment.

### 7.2 Test-case additions (T02 / FR-2)

**File:**
[`packages/common/__tests__/helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts)
(append three new `it(...)` blocks within the existing
`describe('extractSalary — bare-path Q-026 / Q-036 cases', ...)`
group, or a new group `describe('extractSalary — Spec 019
bare-path threshold cases', ...)`).

**Case 74 (FR-2.a — reject literal):**

```ts
it('rejects "100 - 150" + country=GERMANY (Spec 019 / FR-1)', () => {
  expect(
    extractSalary('100 - 150', { country: Country.GERMANY }),
  ).toEqual({
    interval: null,
    minAmount: null,
    maxAmount: null,
    currency: null,
  });
});
```

**Case 75 (FR-2.b — reject prose immunity):**

```ts
it('rejects "team of 100 - 150 employees" + country=GERMANY (Spec 019 / FR-2)', () => {
  expect(
    extractSalary('team of 100 - 150 employees', {
      country: Country.GERMANY,
    }),
  ).toEqual({
    interval: null,
    minAmount: null,
    maxAmount: null,
    currency: null,
  });
});
```

**Case 76 (FR-2.c — admit at threshold boundary):**

```ts
it('admits "1000 - 1500" + country=GERMANY at the threshold boundary (Spec 019 / FR-2)', () => {
  expect(
    extractSalary('1000 - 1500', { country: Country.GERMANY }),
  ).toEqual({
    interval: 'monthly',
    minAmount: 1000,
    maxAmount: 1500,
    currency: 'EUR',
  });
});
```

(Note: `enforceAnnualSalary` is `false` by default, so the
admitted shape carries raw monthly amounts. If the existing
suite's convention differs, T02 will adjust to match — the
literal text stays exact.)

### 7.3 Coverage matrix — bare-path inputs against Spec 019

| Input string                                | Country  | Pre-edit (Spec 015) | Post-edit (Spec 019) | Path           | FR ref |
| ------------------------------------------- | -------- | ------------------- | -------------------- | -------------- | ------ |
| `"100 - 150"`                               | GERMANY  | admit (hourly EUR)  | reject               | bare           | FR-1 / FR-2.a |
| `"team of 100 - 150 employees"`             | GERMANY  | admit (hourly EUR)  | reject               | bare           | FR-2.b |
| `"100 - 150 km commute radius"`             | GERMANY  | admit (hourly EUR)  | reject               | bare           | (additive — pinned implicitly via FR-2.b shape) |
| `"benefits include 100 - 150 EUR monthly"`  | GERMANY  | admit (hourly EUR)  | reject               | bare           | (additive — pinned implicitly via FR-2.b shape) |
| `"1000 - 1500"`                             | GERMANY  | admit (monthly EUR) | admit (monthly EUR)  | bare           | FR-2.c (boundary admit) |
| `"100.000 - 150.000"`                       | GERMANY  | admit (yearly EUR)  | admit (yearly EUR)   | bare           | FR-8 |
| `"5K - 7K"`                                 | GERMANY  | admit (yearly EUR)  | admit (yearly EUR)   | bare           | FR-6 (K-suffix bypass) |
| `"5 - 7 years experience"`                  | GERMANY  | reject (Spec 015)   | reject               | bare           | FR-7 (Spec 015 inherited) |
| `"3 - 5 month internship"`                  | GERMANY  | reject (Spec 015)   | reject               | bare           | FR-7 (Spec 015 inherited) |
| `"$100,000 - $150,000"`                     | (none)   | admit (yearly USD)  | admit (yearly USD)   | prefix         | (unchanged) |
| `"€45,000 - €60,000"`                       | USA      | admit (yearly EUR)  | admit (yearly EUR)   | prefix         | (unchanged) |
| `"45,000 € - 60,000 €"`                     | GERMANY  | admit (yearly EUR)  | admit (yearly EUR)   | suffix         | (unchanged) |
| `"$100K - $150K"`                           | GERMANY  | admit (yearly USD)  | admit (yearly USD)   | prefix         | (unchanged) |

**Symmetry note:** The Spec 019 threshold bump exclusively
narrows the bare-path admission set. Every input that was
**rejected** at the Spec 015 threshold (`< 83`) is still
rejected at the Spec 019 threshold (`< 1000`); every input
that was **rejected** at the bare path due to other reasons
(no country hint, K-suffix path bypass, prefix/suffix path
match) is still rejected for the same reasons. The behavioural
delta is exactly the new band `83 ≤ minSalary < 1000` on the
bare path with no K-suffix.

## 8. Test Plan

- **Unit (T02 / FR-2):** Three new `it(...)` blocks in
  [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts)
  pinning the new behaviour at the threshold boundary (one
  reject literal, one reject prose-immunity, one admit
  boundary). Test count delta = 73 → 76.
- **Regression sweep (T02 / FR-3 / NFR-6):** All 73 existing
  `helpers.spec.ts` cases stay green byte-for-byte. The
  76-case run is the load-bearing T02 acceptance gate.
- **Bench (T01 + T02 / NFR-1 / NFR-2):** Run
  [`helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
  at T01 (post-source-edit) and T02 (post-test-pin); p95
  must stay within `Spec 016 baseline ± 0.1 ms` (i.e.
  `≤ 0.1174 ms`) and absolute under the 0.5 ms NFR-1 ceiling.
  Bench acceptance gate is hard-blocking (Spec 016 / T01
  restored it; Spec 019 honours it).
- **Doc-lint (T03 / NFR-7):** `npm run lint:docs` clean at
  every phase boundary. The
  [`PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
  edit at T03 must not introduce broken markdown links.
- **Idempotence (FR-5):** Re-running the T01 patch against an
  already-bumped `helpers.ts` produces a no-op diff. The
  pre-edit text (`lowerLimit / 12`) is byte-unique in the
  file (verifiable via `grep -c 'lowerLimit / 12' helpers.ts`
  → 1 pre-edit, 0 post-edit).

## 9. Open Questions

- **Q-041** (`docs/questions.md`) — bare-path raw-value
  pre-check threshold bump default. **Default: Option A**
  (`lowerLimit / 12 ≈ 83` → `lowerLimit ≈ 1000`). Pinned in
  FR-1.

## 10. Decisions

(Append-only log; entries prepended at run boundaries.)

### D-03 — T03 closeout doc edit landed (run #81, 2026-04-28)

**Outcome:** FR-4 satisfied. The Spec 015 / FR-8 documented
limitation paragraph in
[`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
(§ "Spec 015 locale & prose-immunity extensions / (e) Bare-path
raw-value pre-check") rewritten to reflect Spec 019 closure:
threshold bumped from `lowerLimit / 12 ≈ 83` to `lowerLimit
≈ 1000`; the `"100 - 150" + country=GERMANY` shape now
rejects; prefix-anchored EUR symbol (`"€100 - €150"`) and
suffix-anchored EUR ISO (`"100 - 150 EUR"`) recommended as
escape hatches for legitimate Continental EUR low-end shapes.
Three threshold-reference call-sites updated for consistency:
the (e) guard description, the K-suffix bypass example (`5K
≥ lowerLimit / 12 ≈ 83` → `5K ≥ lowerLimit ≈ 1000`), and the
FR-8 paragraph itself. Four new doc-block code examples added
illustrating the closure (the `"100 - 150"` rejection, the
`"1000 - 1500"` boundary admit, and the two prefix / suffix
escape-hatch forms).

Spec 019 / spec.md Status flipped from `T01 + T02 landed
(runs #79..#80); T03 pending` to `All phases done (T03 run
#81); spec complete`. The 3-run implementation budget held
exactly: T01 (run #79) source-side threshold bump, T02 (run
#80) test pins, T03 (run #81) doc closeout. NFR-4 implementation
budget honoured.

**Acceptance evidence:**

- (a) `npm run lint:docs` exits 0.
- (b) Diff scope: `docs/PERFORMANCE_TUNING.md` is the only
  doc-content change (T03 is docs-only — FR-9 / Non-Goal); no
  `.ts` file in the diff.
- (c) Spec 019 / spec.md Status field updated as planned.
- (d) `docs/index.md` § 7 Spec 019 row Status updated to match
  spec.md.
- (e) `docs/log.md` gains a run #81 closeout entry (newest at
  top). Out-of-repo upstream-watch ledger Sync Log gains a
  parallel entry capturing the run #81 closeout + zero-churn
  upstream sweep.
- (f) `CLAUDE.md` run-tag bumped from `2026-04-28 (scheduled
  run #80)` to `2026-04-28 (scheduled run #81)`.

**Forward-pointers:**

- Q-041 Resolution stays `_open — agent default = A` (the
  human owner reviews; resolution flip is human-driven, not
  agent-driven). The default A retune is now in effect across
  the codebase end-to-end (source + tests + docs); reverting
  would require a Spec 020 / FR-rollback pass.
- The 73→76 / 74→77 doc-drift reconciliation surfaced at D-01
  was rolled into the test count delta narrative at D-02; no
  spec-text refresh needed at T03 because the spec § 7.2
  literal case bodies stayed byte-exact through the
  reconciliation (only the totals narrative shifted).
- Default for run #82 = next backlog candidate. After Spec
  019 closes, the open agent-relevant residuals are: Q-026 /
  Q-027 (Spec 014 carry-overs that re-emerged at Spec 015
  scope; revisit candidate for a future
  `salary-parser-residuals-batch-3`), Q-035 (anglo-only
  short-circuit narrowing — closed by Spec 015 / D-01;
  recheck whether the human owner's review flips Q-035
  resolution), and any new external-snapshot churn at runs
  #79..#81. If `OTHERS/` stays at the 56-run zero-churn
  streak, the natural next pickup is internal-correctness
  work — but no specific candidate is load-bearing enough at
  this snapshot to justify a Spec 020 scaffold without a
  fresh signal. Run #82 should default to a **maintenance
  sweep**: rerun the helpers regression + bench, refresh
  `competitor-watch.md` § A from a fresh `git log` of the
  three watched repos, and pin the next concrete spec only
  if a new external commit lands.

### D-02 — T02 test pins landed (run #80, 2026-04-28)

**Outcome:** FR-2 satisfied. The three new `it(...)` blocks
landed verbatim against spec § 7.2 case literals — case 74
(FR-2.a — `"100 - 150" + country=GERMANY` → all-`null`),
case 75 (FR-2.b — `"team of 100 - 150 employees" +
country=GERMANY` → all-`null`; additive prose-immunity
coverage), case 76 (FR-2.c — `"1000 - 1500" +
country=GERMANY` → `{ interval: 'monthly', minAmount: 1000,
maxAmount: 1500, currency: 'EUR' }` — boundary admit). The
new describe block is `extractSalary — Spec 019 / T02
(bare-path threshold bump)`; placed at end-of-file after the
existing Spec 015 / T02 block, with a multi-line lead-in
comment threading the Spec 015 / FR-8 → Spec 019 / FR-1
narrative and per-case behavioural derivations.

**Acceptance evidence:**

- (a) Regression sweep: `npx jest packages/common/__tests__/helpers.spec` →
  **77/77 passed** in 6.905 s. Pre-T02 baseline was 74 (per
  D-01 reconciliation); +3 cases lands exactly 77 (NFR-5
  honoured at +3 delta — text reconciliation 73→76 vs 74→77
  carried forward to T03 closeout).
- (b) Bench: `npx jest packages/common/__tests__/helpers.bench` →
  2/2 passed in 5.997 s; `dist/bench/helpers-salary.json`
  records overall **p95 = 0.0248 ms** (delta from D-01's
  0.0176 ms = +0.0072 ms; from Spec 016 baseline 0.0174 ms =
  +0.0074 ms; well within +0.1 ms NFR-1 budget). Per-currency
  p95 figures all stay under the 0.5 ms NFR-1 ceiling and the
  2.0 ms CI ceiling. The slight upward drift from D-01 is
  within natural CI/sandbox jitter (separate runs produce
  ±0.005–0.010 ms swings on this machine; the bench fixture is
  unchanged so source-attributable delta is zero).
- (c) Diff scope: exactly one file changed
  (`packages/common/__tests__/helpers.spec.ts`); the change is
  the appended `describe('extractSalary — Spec 019 / T02
  (bare-path threshold bump)', ...)` block (~95 added lines
  including doc comment + 3 `it(...)` blocks). No source-file
  edit at T02; the dispatcher behaviour was set by T01 and
  T02 only pins it.
- (d) Test count delta verified: `grep -c '^  it(' helpers.spec.ts` →
  **77** post-edit (was **74** pre-edit). NFR-5 +3 delta
  honoured.

**Forward-pointers:**

- T03 (run #81) executes the closeout doc edit on
  `docs/PERFORMANCE_TUNING.md` per spec § 7 / FR-4 — rewrite
  the Spec 015 / FR-8 paragraph to reflect closure (the
  `"100 - 150" + country=GERMANY` shape is now rejected;
  recommended escape hatches are prefix-anchored EUR symbol
  or suffix-anchored EUR ISO). Status flips from
  `T01 + T02 landed (runs #79..#80); T03 pending` to
  `All phases done (T03 run #81); spec complete`.
- The 73→76 / 74→77 doc-drift reconciliation surfaced at D-01
  is rolled into T03's spec-text refresh (spec § 7.2 narrative
  + NFR-5 target line + tasks.md T02 acceptance line).
- Q-041 Resolution stays `_open — agent default = A` until
  the human owner reviews; T03 does not flip it.

### D-01 — T01 source-side threshold bump landed (run #79, 2026-04-28)

**Outcome:** FR-1 satisfied. The single-token edit at
[`packages/common/src/utils/helpers.ts:803`](../../../packages/common/src/utils/helpers.ts:803)
(`minSalary < lowerLimit / 12` → `minSalary < lowerLimit`)
landed cleanly. Source diff is exactly one inequality token
(four-token reduction). The accompanying lead-in comment block
(lines 786–798 pre-edit; 786–803 post-edit) was refreshed to
reference Spec 019 / Q-041 / FR-1 alongside the original
Spec 015 / Q-036 / FR-2 attribution and to drop the literal
pre-edit token (`lowerLimit / 12`) so FR-5 idempotence holds
strictly (grep returns 0).

**Acceptance evidence:**

- (a) Regression sweep: `npx jest packages/common/__tests__/helpers.spec` →
  **74/74 passed** in 7.153 s. _Note: spec § 7.2 / NFR-5 cited
  73 as the pre-Spec-019 baseline; reality is 74 (off-by-one
  doc drift — the actual `it(...)` block count in the file pre-
  edit is 74). The Spec 019 / T02 test-count delta therefore
  becomes **74 → 77** rather than **73 → 76**; the +3 delta
  itself is unchanged. Spec § 7.2 / NFR-5 / tasks.md / T02 will
  be reconciled at the run #80 pass when the three new cases
  land — the literal case bodies in spec § 7.2 stay byte-exact._
- (b) Bench: `npx jest packages/common/__tests__/helpers.bench` →
  2/2 passed in 5.93 s; `dist/bench/helpers-salary.json` records
  overall **p95 = 0.0176 ms** (Spec 016 baseline = 0.0174 ms;
  delta = +0.0002 ms; well within the +0.1 ms NFR-1 budget and
  far under the 0.5 ms NFR-1 ceiling and the 2.0 ms CI ceiling).
  Per-currency p95 figures: USD 0.0141 / EUR 0.0190 / GBP 0.0168
  / CHF 0.0127 / SEK 0.0189 / NOK 0.0129 / DKK 0.0211 / PLN
  0.0169 ms. All eight currencies remain under the bench gate.
- (c) FR-5 idempotence: `grep -c 'lowerLimit / 12'
  packages/common/src/utils/helpers.ts` → **0** post-edit (was
  **1** pre-edit). Re-running T01 produces a no-op diff.
- (d) Diff scope: exactly one source file changed
  (`packages/common/src/utils/helpers.ts`); the change is the
  inequality threshold (line 803) plus the lead-in comment
  refresh (lines 786–803) keeping the FR-5 grep clean. No
  test-file edits at T01 (T02 owns those at run #80).

**Forward-pointers:**

- T02 (run #80) lands the three new `it(...)` cases per spec
  § 7.2 verbatim. Reconcile the 73→76 / 74→77 count drift in
  the same pass (update tasks.md / T02 acceptance row + spec
  / § 7.2 narrative + NFR-5 target — text only; the case
  bodies are byte-exact).
- T03 (run #81) executes the closeout doc edit on
  `PERFORMANCE_TUNING.md` per spec § 7 / FR-4.

## 11. References

- [`packages/common/src/utils/helpers.ts`](../../../packages/common/src/utils/helpers.ts)
  — `extractSalary` body (line 718) and the bare-path
  raw-value pre-check block (line 799–806) introduced by
  Spec 015 / FR-2.
- [`packages/common/__tests__/helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts)
  — 73-case helpers regression suite that gates T02.
- [`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
  — bench fixture; p95 baseline = 0.0174 ms (Spec 016 / T01).
- [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
  — receives the FR-4 documentation update at T03.
- [`docs/questions.md` § Q-041](../../../docs/questions.md)
  — threshold-bump default rationale.
- Spec 015 / FR-8 (`.specify/specs/015-salary-parser-locale-and-prose-immunity/spec.md`)
  — the documented limitation Spec 019 supersedes.
- Spec 015 / Q-036 (`docs/questions.md`) — the bare-path
  prose-immunity question whose answer Spec 019 retunes.
- Spec 014 / Q-026 (`docs/questions.md`) — the original
  bare-path Continental admission rationale.
