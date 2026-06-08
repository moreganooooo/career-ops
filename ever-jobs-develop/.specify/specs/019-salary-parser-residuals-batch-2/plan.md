# Plan 019 — Salary Parser Residuals, Batch 2 (Bare-Path Threshold Bump)

> Phased implementation plan for [Spec 019](./spec.md). Three phases /
> three runs; lean cadence mirroring Spec 014 (5 phases, 5 runs) and
> Spec 015 (3 phases, 3 runs).

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Plan ID        | 019                                |
| Spec           | [`spec.md`](./spec.md)             |
| Tasks          | [`tasks.md`](./tasks.md)           |
| Created        | 2026-04-28 (run #78)               |
| Last updated   | 2026-04-28 (run #78)               |

---

## 1. Phasing Overview

| Phase | Run     | Task | What lands                                                                  | LOC delta (approx.)                          | Test count delta |
| ----- | ------- | ---- | --------------------------------------------------------------------------- | -------------------------------------------- | ---------------- |
| 0     | #78     | —    | Spec / Plan / Tasks scaffold + Q-041 + log/index/CLAUDE updates             | 0 `.ts`; ~700 `.md` (scaffold)               | 0                |
| 1     | #79     | T01  | Single-token source edit at [`helpers.ts:803`](../../../packages/common/src/utils/helpers.ts) | -4 tokens (`lowerLimit / 12` → `lowerLimit`) | 0                |
| 2     | #80     | T02  | Test pins in [`helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts) (3 new `it(...)` blocks) | +30 `.ts` lines               | +3               |
| 3     | #81     | T03  | Closeout: PERFORMANCE_TUNING.md update + spec status flip + log entries     | +20 `.md` lines                              | 0                |

**Total cadence:** 4 runs (Phase 0 scaffold + 3 implementation
phases). NFR-4 budget is "≤ 3 runs" for the
implementation lifecycle (Phases 1..3). Scaffold pass
(Phase 0) is overhead and not counted against NFR-4 — same
convention used by Spec 015 (Phase 0 at run #65, Phase 1..3 at
runs #66..#68).

## 2. Packages Touched

| Package                                                | Phase | Files                                         |
| ------------------------------------------------------ | ----- | --------------------------------------------- |
| [`packages/common`](../../../packages/common)         | 1, 2  | `src/utils/helpers.ts` (T01), `__tests__/helpers.spec.ts` (T02) |
| [`docs/`](../../../docs)                               | 0, 3  | `questions.md` (Q-041, this run), `index.md`, `log.md` (this run + run #79..#81 entries), `PERFORMANCE_TUNING.md` (T03) |
| [`.specify/specs/019-salary-parser-residuals-batch-2`](.) | 0, 1..3 | `spec.md`, `plan.md`, `tasks.md`              |
| (out-of-repo upstream-watch ledger)                    | 0     | Sync Log entry only (run #78); no upstream-watch row addition (Spec 019 is internal-correctness, not upstream-driven) |
| [`CLAUDE.md`](../../../CLAUDE.md)                      | 0..3  | Run-tag bump per phase (`run #77` → `#78` this pass) |

**Untouched (FR-9 / Non-Goal):**

- All eight source plugins
  ([`packages/plugins/source-*`](../../../packages/plugins))
  — pick up the new behaviour transparently via
  `@ever-jobs/common` barrel.
- All ATS plugins
  ([`packages/plugins/source-ats-*`](../../../packages/plugins))
  — same as above.
- `parseSalaryCurrency`, `parseSalaryNumber`,
  `resolveSalaryLocale`, `buildSalaryRegexBare`,
  `buildSalaryRegexPrefix`, `buildSalaryRegexSuffix` —
  all six helper functions stay byte-identical (FR-9 inherited
  from Spec 015).
- `CURRENCY_TO_NATURAL_LOCALE`,
  `SALARY_NUMBER_REGEX_SRC`,
  `SALARY_SYMBOL_ALTERNATIONS`,
  `SALARY_LOCALE_MAP` — all four module-private constants
  stay byte-identical.
- [`packages/models`](../../../packages/models) — no
  `Country` / `SalaryLocale` / `JobPostDto` change.
- [`packages/plugin`](../../../packages/plugin) — no plugin
  registry change.
- [`packages/analytics`](../../../packages/analytics) — no
  analytics core change.
- [`apps/api`](../../../apps/api),
  [`apps/cli`](../../../apps/cli),
  [`apps/mcp`](../../../apps/mcp) — no orchestration change.

## 3. Risks

### 3.1 Substitute-case regression risk (carried from Spec 015)

The Spec 015 / T01 implementation note flagged a substitute-case
regression risk for any change to the bare-path raw-value
pre-check: any input that was **admitted** at the Spec 015
threshold (`83 ≤ minSalary`) but is now **rejected** at the
Spec 019 threshold (`< 1000`) creates a behavioural delta. The
existing 73-case `helpers.spec.ts` suite must not contain any
case where (a) the input matches the bare path AND (b) the raw
min is in the band `83 ≤ minSalary < 1000`.

**Mitigation:** Run T01 acceptance gate before T02 lands.
Verify the 73-case sweep stays green at T01 BEFORE adding the
3 new cases. If T01 surfaces a regression in the existing
suite, the threshold bump must be narrowed (e.g. via Q-041
Option C — bare regex tightening) before T02 proceeds.

**Audit trail:** the pre-T01 grep for the 73-case suite's
bare-path inputs (run during T01 acceptance) will be recorded
in Spec 019 / spec.md / § 10 / D-NN at run #79.

### 3.2 Operator-facing behaviour change (Continental hourly low-end)

Operators who relied on the Spec 015 / FR-8 admitted shape
(`"100 - 150" + country=GERMANY` → admit hourly EUR) will see
the row return all-`null` after Spec 019 / T01 lands. Per the
Spec 019 / Q-041 Option A trade-off analysis, these operators
have three escape hatches:

1. Include the EUR symbol: `"€100 - €150"` → prefix path admit.
2. Include the EUR ISO: `"100 EUR - 150 EUR"` → suffix path
   admit.
3. Provide K-suffix: `"0.1K - 0.15K"` (admittedly awkward; not
   commonly written in EU job ads).

**Mitigation:** the T03 closeout pass updates
[`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
with the new behaviour and the recommended escape hatch. The
Spec 015 / FR-8 paragraph is rewritten (not deleted — Spec 019
keeps the audit trail of why the limitation existed and why
it was closed).

### 3.3 Bench p95 regression risk

The threshold change is a single inequality token; it should
not measurably affect bench p95. But if the bench surfaces an
unexpected regression at T01 (`p95 > 0.1174 ms`, i.e. > +0.1 ms
delta from the Spec 016 baseline), T01 cannot proceed. The
investigation path: confirm the diff is exactly the four-token
edit; if not, narrow the diff. If the diff is correct and the
bench still regresses, the root cause lies elsewhere (test
environment noise, bench fixture flakiness) and the spec is
revised to widen NFR-1 to "≤ +0.2 ms" with a Decision D-NN
documenting the asymmetry.

**Mitigation:** Run the bench at T01 acceptance and pin the
p95 in the spec / § 10 Decisions log.

### 3.4 Continental locale interpretation of `"1000 - 1500"`

The FR-2.c admit-side test case admits `"1000 - 1500" +
country=GERMANY` as `{ interval: 'monthly', minAmount: 1000,
maxAmount: 1500, currency: 'EUR' }`. Verify that the existing
`hourlyThreshold = 350` and `monthlyThreshold = 30000` defaults
classify `1000 ≥ hourlyThreshold` as monthly (not hourly). The
expected branch:

```
minSalary = 1000
hourlyThreshold = 350
monthlyThreshold = 30000

Branch 1: 1000 < 350 → NO (skip hourly)
Branch 2: 1000 < 30000 → YES → interval = 'monthly'
annualMinSalary = 1000 * 12 = 12000 ≥ lowerLimit = 1000 ✓
annualMaxSalary = 1500 * 12 = 18000 ≤ upperLimit = 700000 ✓
```

So the admission resolves to `{ interval: 'monthly',
minAmount: 1000, maxAmount: 1500, currency: 'EUR' }` (raw
amounts because `enforceAnnualSalary` defaults to `false`).

**Mitigation:** if the existing helpers.spec.ts convention
uses `enforceAnnualSalary: true` (annualised amounts) by
default in newer cases, T02 adjusts the literal to match
the suite's convention. The functional shape (admit at
threshold boundary) stays load-bearing.

### 3.5 Prose-immunity case 75 captures different shape

The case 75 input `"team of 100 - 150 employees"` matches the
bare regex via `100 - 150`. The country-tier guard is
satisfied (country=GERMANY drives the `'country'` confidence
on `parseSalaryCurrency`'s default-EUR fallback). The
threshold check `100 < 1000` rejects. Verify the bare regex
does not match the broader span `"team of 100 - 150 employees"`
as a whole — the regex builder
[`buildSalaryRegexBare`](../../../packages/common/src/utils/helpers.ts:692)
is `<num>K?\s*<dash>\s*<num>K?` with no leading/trailing
anchor; `String.prototype.match` returns the first match,
which would be `100 - 150` (digits-only).

**Mitigation:** the spec.md / § 7.3 coverage matrix
explicitly enumerates the FR-2.b prose-immunity case as a
bare-path match shape. T02 acceptance verifies via runtime
(jest assertion) that the result is all-`null` — if the
underlying regex captures a different sub-string, the
assertion fails and T02 cannot proceed.

## 4. Per-Run Stop Conditions

A phase ends and the agent commits + pushes when:

- **Phase 0 (this run, #78):** `npm run lint:docs` exits 0;
  `git status -sb` shows the four expected new files
  (`spec.md`, `plan.md`, `tasks.md`, `Q-041` block in
  `questions.md`) plus log/index/CLAUDE edits (and a parallel
  out-of-repo Sync Log update); no `.ts` file is in the diff
  (FR-9 / NFR-3).
- **Phase 1 (run #79):** `npm run lint:docs` exits 0;
  `npx jest packages/common/__tests__/helpers.spec` returns
  `73/73 passed`; `npx jest packages/common/__tests__/helpers.bench`
  reports p95 ≤ 0.1174 ms; the only `.ts` file in the diff is
  `packages/common/src/utils/helpers.ts` with exactly the
  four-token edit; spec.md / tasks.md flips T01 to `[x]` with
  Decision D-01 logged in § 10.
- **Phase 2 (run #80):** `npm run lint:docs` exits 0;
  `npx jest packages/common/__tests__/helpers.spec` returns
  `76/76 passed`; bench p95 stays within range; the only
  `.ts` file in the diff is
  `packages/common/__tests__/helpers.spec.ts` with three
  new `it(...)` blocks; spec.md / tasks.md flips T02 to `[x]`
  with Decision D-02 logged in § 10.
- **Phase 3 (run #81):** `npm run lint:docs` exits 0; no
  `.ts` file in the diff; the only `.md` files in the diff
  are `docs/PERFORMANCE_TUNING.md` (FR-8 paragraph
  rewrite), `spec.md` (status flip + Decision D-03), `tasks.md`
  (T03 → `[x]`), `docs/log.md` (run #81 entry), `docs/index.md`
  (Spec 019 row Status update), `CLAUDE.md` (run-tag bump).
  Spec 019 closes lifecycle.

## 5. Acceptance Gates per Phase

| Phase | Gate                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------- |
| 0     | `npm run lint:docs` clean. No `.ts` in diff. Q-041 default = A. Four scaffold files exist in `019-...` folder. |
| 1     | 73/73 helpers.spec green. Bench p95 ≤ 0.1174 ms. Single source edit (`lowerLimit / 12` → `lowerLimit`). FR-5 idempotence verified (`grep -c 'lowerLimit / 12' helpers.ts` returns 0 post-edit). |
| 2     | 76/76 helpers.spec green. Bench p95 within range. Three new `it(...)` blocks pin FR-2.a / FR-2.b / FR-2.c.    |
| 3     | `PERFORMANCE_TUNING.md` reflects new behaviour. Spec 019 / spec.md Status = `All phases done`. Lint clean.    |

## 6. Rollback / Out-of-Scope Reminders

- Spec 019 has **zero** plugin-source touches. No plugin tests
  change. Plugins inherit the new behaviour via the
  `@ever-jobs/common` barrel transparently.
- Spec 019 has **zero** dependency additions. No
  `package.json`, no `package-lock.json` regeneration.
- Spec 019 has **zero** new modules. The change is to one
  inequality token in an existing function body.
- Spec 019 must NOT modify
  [`buildSalaryRegexBare`](../../../packages/common/src/utils/helpers.ts:692).
  The Q-041 Option C alternative was explicitly rejected;
  the regex stays byte-identical.
- Spec 019 must NOT modify the K-suffix bypass guard
  (`match[2] !== 'k' && match[4] !== 'k'`). FR-6 is
  load-bearing.
- Spec 019 must NOT introduce a stop-word filter.
  Q-041 Option B explicitly rejected.
- Spec 019 must NOT change `lowerLimit`, `upperLimit`,
  `hourlyThreshold`, or `monthlyThreshold` defaults. The
  threshold bump is to the **multiplier** of `lowerLimit` in
  the pre-check (1/12 → 1/1), not to `lowerLimit` itself.

## 7. Why Lean (3-Phase) Cadence

The Spec 014 / Spec 015 cadence established that pure
`helpers.ts` body edits with parallel
`helpers.spec.ts` test pins fit a 3-task lifecycle (T01 source
edit / T02 test pin / T03 closeout). Spec 019 is dimensionally
a sub-spec of Spec 015 — it retunes a single inequality token
that Spec 015 introduced. The behavioural surface area is
provably narrower than Spec 015 (which added a new module-
private constant, a new tier in `resolveSalaryLocale`, AND a
new pre-check block), so the lifecycle is at most as long as
Spec 015's. The 3-phase / 3-run plan is justified.

## 8. Forward Compatibility

If Q-041 Option A's behavioural delta produces real-world
operator complaints (≥ 1% of EU plugin calls dropping
legitimate Continental hourly low-end ranges via the bare
path), a Spec 020 candidate could revisit:

- **Option A.1** (graduated threshold): differentiate the
  threshold by `country` — DE / NL / FR / BE / AT use
  `lowerLimit` (because hourly ads in those markets typically
  carry the EUR symbol), while emerging markets where bare
  shapes are more common use `lowerLimit / 4` or `/ 6`.
- **Option A.2** (operator opt-in): expose the bare-path
  threshold as a new `bareNumericThreshold` option on
  `ExtractSalaryOptions`, defaulting to `lowerLimit` per Spec
  019 / FR-1, but settable to `lowerLimit / 12` (Spec 015
  behaviour) by operators who want the prior admission set.

Both options are out-of-scope for Spec 019 (NFR-3 / Non-Goal).
The Spec 020 candidate would open if telemetry warrants.
