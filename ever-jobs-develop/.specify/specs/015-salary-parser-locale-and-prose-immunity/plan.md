# Plan 015 — Salary Parser Locale & Prose Immunity

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-28 (run #65)                               |
| Last updated | 2026-04-28 (run #65)                               |

## 1. Approach

Spec 015 is intentionally narrow — even narrower than Spec 014.
The work lives **inside one source file**
(`packages/common/src/utils/helpers.ts`) plus its sibling test
suite, with one cross-reference touch in
`docs/PERFORMANCE_TUNING.md` (the existing Salary-parser
section gains a paragraph about the Q-035 locale short-circuit
and the Q-036 raw-value pre-check, plus the FR-8 documented
limitation).

The dispatcher pattern from Spec 012 / T03 stays exact. Two
narrowly-scoped edits land:

1. **G-4 — `resolveSalaryLocale()` tier-1 short-circuit on
   symbol-tier resolutions (Q-035).** New tier inserted ahead
   of `options.country`: when `confidence === 'symbol'` AND the
   resolved currency is in the new
   `CURRENCY_TO_NATURAL_LOCALE` lookup, return that currency's
   natural locale. Lifts FR-1 ("symbol > country") from
   currency-only to currency-AND-locale.
2. **G-5 — `extractSalary()` bare-path raw-value pre-check
   (Q-036).** New 3-line guard inserted AFTER `parseSalaryNumber`
   returns and BEFORE the K-suffix multiplication: if the
   matched path was the bare regex (NOT prefix or suffix)
   AND neither match captures a `K` suffix AND `minSalary <
   lowerLimit / 12 ≈ 83`, reject the row. Bare-path-only;
   prefix/suffix paths stay byte-identical (NFR / FR-6).

The two edits sum to ~15-20 LOC; bundle-size delta (NFR-3:
≤ +0.3 KB) holds easily because no new external imports land.

## 2. Phases

### Phase 1 — Two-fix source-side pass (T01)

- **Goal:** land G-4 (FR-1) + G-5 (FR-2) in a single source-
  edit pass. Both fixes are needed before any of the three
  deferred T02 cases can pass.
- **Deliverables:**
  - New `CURRENCY_TO_NATURAL_LOCALE` ReadonlyMap declared near
    the existing `SALARY_NUMBER_REGEX_SRC` / `SALARY_LOCALE_MAP`
    block (~lines 517–565). 8 entries: USD/GBP/CHF →
    `'anglo'`; EUR/SEK/NOK/DKK/PLN → `'continental'`.
  - `resolveSalaryLocale()` body extended with a new tier-1
    branch ahead of the existing `options.country` cascade.
    The branch fires when the caller passes
    `{ confidence: 'symbol', currency: <X> }` AND
    `CURRENCY_TO_NATURAL_LOCALE.has(currency)`.
  - `extractSalary()` body extended with a 3-line raw-value
    pre-check between `parseSalaryNumber` returns and K-suffix
    multiplication. The check requires (a) match came from
    the bare path (NOT prefix or suffix), (b) neither
    K-suffix capture is `'k'`, (c) `minSalary < lowerLimit /
    12`. The "bare path" detection uses the `barePattern` /
    `prefixPattern` / `suffixPattern` locals already
    established in T03's match cascade — no new variable
    needed.
  - Comment-only edits on `resolveSalaryLocale()` and
    `extractSalary()` JSDoc to name the new tier and the new
    guard.
- **Acceptance:** zero new test cases YET (those land in T02);
  Spec 014 / T03's 70-case suite stays green; the implicit
  smoke test is that `tsc` clean + `npm test` clean +
  `lint:docs` clean.
- **Estimate:** 0.25 day.

### Phase 2 — Three deferred Spec 014 / T04 cases land (T02)

- **Goal:** add the three cases blocked by Q-035 + Q-036 to
  the test suite. All three should pass byte-cleanly under
  the T01 source edits.
- **Deliverables:**
  - 3 new cases in a new
    `describe('extractSalary — Spec 015 / T02 …')` block at
    the bottom of `helpers.spec.ts`:
    1. `"$100,000 - $150,000" + country=GERMANY` → USD /
       100000 / 150000 / yearly (FR-3 — restored Spec 012 §
       8 case 14).
    2. `"5 - 7 years experience" + country=GERMANY` →
       all-`null` (FR-4 — bare-regex prose immunity case 1).
    3. `"3 - 5 month internship" + country=GERMANY` →
       all-`null` (FR-5 — bare-regex prose immunity case 2).
  - JSDoc above the describe block names Q-035 + Q-036 as
    the originating questions and links to the Spec 015 § 8
    test plan rows.
- **Acceptance:** test count grows from 70 → 73; all 73 pass;
  the existing 70 cases stay byte-for-byte green (FR-6).
- **Estimate:** 0.15 day.

### Phase 3 — Documentation + closeout (T03)

- **Goal:** ship the documentation pass + spec status flip +
  question-resolution flip + index/log updates.
- **Deliverables:**
  - `docs/PERFORMANCE_TUNING.md` — paragraph extension to the
    existing Spec 014 closeout paragraph (around the bullet
    list of Spec 014's three behaviours): name the two new
    fixes (locale short-circuit + raw-value pre-check) with
    one example apiece + the FR-8 documented limitation
    (`"100 - 150" + country=GERMANY` still emits — the
    pre-check threshold `lowerLimit / 12 ≈ 83` admits 100).
  - `docs/questions.md` — Q-035 + Q-036 resolution text
    flipped from "_pending review_" to "**resolved** in
    Spec 015 (runs #65..#XX)" with the actual landed-run
    numbers.
  - `.specify/specs/015-salary-parser-locale-and-prose-immunity/spec.md`
    Status flipped from "draft (scaffolded run #65); T01
    pending" to "All phases done (T01..T03 runs #65..#XX);
    spec complete"; § 10 Decisions log appended with
    implementation observations.
  - `.specify/specs/015-salary-parser-locale-and-prose-immunity/tasks.md`
    T03 row flipped from `[ ]` to `[x]`.
  - `.specify/specs/014-salary-parser-residuals/tasks.md`
    T04 row flipped from `[~]` to `[x]` with a "Closed via
    Spec 015 (runs #65..#XX)" annotation; Spec 014 spec.md
    Status field updated to "All phases done (T01..T05
    runs #59..#64); T04 closed via Spec 015 (runs
    #65..#XX)".
  - `docs/index.md` Spec 015 row reflects closeout status;
    footer bumped.
  - `docs/log.md` closeout entry under run #67 (or
    whichever run T03 lands).
  - `CLAUDE.md` run-tag bump.
- **Acceptance:** all `lint:docs` checks green; no new
  questions opened; T03 estimate ≤ 0.1 day.
- **Estimate:** 0.1 day.

## 3. Phasing rationale

Spec 015 has 2 source-side fixes that are functionally
independent but deferred-test-coverage-coupled (the three
deferred cases each need at least one of the two fixes). The
linter's run-#64 pin proposed "T01 = source / T02 = tests /
T03 = closeout" — a 3-phase / 3-run shape mirroring Spec 014's
lean cadence. We adopt the same pattern.

Alternative considered: split T01 into two separate phases
(T01a Q-035 / T01b Q-036) for cleaner audit trail. Rejected
because the two fixes are small enough (~10 + ~5 LOC) that
combining them in one source-edit pass keeps the diff
readable AND lets the linter / CI run a single regression
sweep against the combined surface, rather than two
half-passes that could mask cross-fix interactions.

## 4. Dependencies

- `@ever-jobs/common` package (`packages/common/`) —
  modified.
- `@ever-jobs/models` package — UNCHANGED. The `Country` enum
  and the `SalaryLocale` literal type stay exact.
- No new external deps. No `package.json` edit.

## 5. Risks

| Risk                                                                          | Likelihood | Mitigation                                                                                |
| ----------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| Q-035 fix accidentally regresses the substitute case `"€45,000 - €60,000" + country=USA`. | Low        | The new tier-1 branch fires ONLY when `confidence === 'symbol'` AND lookup hit; EUR is in the lookup as `'continental'` AND USA's natural locale is `'anglo'` — the substitute case currently routes through the country tier (USA → anglo); after T01, EUR's natural locale wins and routes through `'continental'`. **Wait, this is wrong** — the substitute case asserts `'EUR / 45000 / 60000 / yearly'`. Continental locale parses `45,000` as `45.000` decimal ≈ `45`. The substitute case would REGRESS. **Mitigation:** verify-step in T01 — re-run the full 70-case suite after the T01 edits; if the substitute case fails, the T01 edit needs a `prefer-options.country-when-ambiguous` clause OR the substitute case needs an explicit `options.locale` override OR Q-035 needs Option C (caller responsibility). Track the verify-step outcome in T01's § 10 Decisions entry. |
| Q-036 raw-value pre-check threshold `lowerLimit / 12` admits `"100 - 150"` and rejects bare-prose like `"5 - 7"`, but the boundary at `83` is arbitrary. | Low        | Documented in FR-8 as a known limitation; the threshold can be tuned via the existing `lowerLimit` option. Future users that need stricter prose immunity can pass a higher `lowerLimit`. |
| Bench p95 regresses past +0.1 ms baseline (NFR-1).                            | Very low   | Both fixes add ≤ 3 instructions on conditional hot paths; the raw-value pre-check is gated to bare-path matches only; the locale short-circuit is one Map lookup. |
| `tsc --noEmit` regression from the new `CURRENCY_TO_NATURAL_LOCALE` lookup.   | Very low   | Plain `ReadonlyMap<string, SalaryLocale>` with literal-typed entries; same shape as `SALARY_LOCALE_MAP`. |

The Q-035 substitute-case regression risk is the load-bearing
one and warrants a verify-step gate in T01 acceptance. See
T01's tasks.md acceptance section for the explicit "run the
70-case suite after T01 source edits and confirm zero
regressions" step.

## 6. Acceptance gates

- T01: `tsc --noEmit` clean; `npm test --testPathPatterns
  'packages/common/__tests__/helpers.spec'` reports 70 / 70
  pass; bench p95 within ≤ +0.1 ms of baseline.
- T02: test count 70 → 73; all 73 pass.
- T03: `lint:docs` clean; spec.md Status reads "All phases
  done"; Q-035 + Q-036 resolution flipped; Spec 014 / T04 row
  flipped from `[~]` to `[x]`.

## 7. Estimated lifecycle

3 phases / 3 tasks / 3 runs (matches Spec 014's lean cadence
post-T01-T03; T04 + T05 of Spec 014 are recreated here as
T02 + T03). Actual day-equivalent: ~0.5 day total.
