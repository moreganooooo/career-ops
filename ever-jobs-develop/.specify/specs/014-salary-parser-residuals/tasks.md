# Tasks: 014 — Salary Parser Residuals

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — `$` registration + helper-test pin

- [x] T01 — `SALARY_UNIQUE_SYMBOLS` includes `['$', 'USD']`;
  `parseSalaryCurrency('$', { country: <non-USA> })` resolves
  to USD via the symbol tier (FR-1 / FR-8).
  **Landed run #60.**
  - **Files (planned):**
    - `packages/common/src/utils/helpers.ts` (extend
      `SALARY_UNIQUE_SYMBOLS`).
    - `packages/common/__tests__/helpers.spec.ts` (extend the
      existing `describe('parseSalaryCurrency …')` block with
      ≥ 1 new case).
  - **Acceptance:**
    - `SALARY_UNIQUE_SYMBOLS` array length grows from 4 → 5;
      the new entry `['$', 'USD']` is appended at the END
      (preserves existing iteration order so EUR / GBP / PLN /
      CHF detection paths stay byte-for-byte identical).
    - `parseSalaryCurrency('$100,000', { country: GERMANY })`
      → `{ code: 'USD', symbol: '$', confidence: 'symbol' }`
      (was: `{ code: 'EUR', symbol: null, confidence:
      'country' }` — see Spec 014 § 1 G-1).
    - Sanity sweep: re-run the 8-case `parseSalaryCurrency`
      block from Spec 012 / T01 — none must regress. The
      load-bearing existing case is
      `parseSalaryCurrency('foo bar')` →
      `{ code: 'USD', symbol: null, confidence: 'default' }`
      (FR-7 default-USD; the new `$`-symbol entry MUST NOT
      shadow this when no `$` is present).
    - Fast-fail check on a likely false-positive shape:
      `parseSalaryCurrency('see $TODO inline', { country:
      GERMANY })` → `{ code: 'USD', symbol: '$', confidence:
      'symbol' }`. Documents that ANY `$` in the input now
      wins; this is intentional per Spec 014 / § 7.2 (the `$`
      tier promotion was a documented gap, not an unintended
      side-effect).
  - **Estimate:** 0.15 day.

## Phase 2 — Apostrophe-in-regex extension + literal Spec 012 § 8 case 5

- [x] T02 — `SALARY_NUMBER_REGEX_SRC.anglo` tolerates `'` as
  a thousands separator; literal Swiss `"CHF 90'000 – CHF
  120'000"` parses end-to-end (FR-2 / FR-6 / FR-9).
  **Landed run #61.**
  - **Files (planned):**
    - `packages/common/src/utils/helpers.ts` (1-character
      edit to the `anglo` regex source string).
    - `packages/common/__tests__/helpers.spec.ts` (extend
      the `extractSalary` block with the literal Spec 012
      § 8 case 5).
  - **Acceptance:**
    - `SALARY_NUMBER_REGEX_SRC.anglo` is
      `"\\d+(?:[,\\u00A0']\\d{3})*(?:\\.\\d+)?"` (was
      `"\\d+(?:[,\\u00A0]\\d{3})*(?:\\.\\d+)?"` — `'` added
      to the thousands character class).
    - `extractSalary("CHF 90'000 – CHF 120'000")` →
      `{ interval: 'yearly', minAmount: 90000, maxAmount:
      120000, currency: 'CHF' }`.
    - The existing comma-thousands substitute case
      (`extractSalary("CHF 90,000 – CHF 120,000")` →
      same envelope) stays green — additive, no removal.
    - Defence-in-depth check: `parseSalaryNumber("90'000",
      'anglo')` continues to return `90000` (FR-9 — the
      apostrophe-strip in `parseSalaryNumber` line ~374
      stays as a defence-in-depth path; both layers
      tolerate `'`).
    - Continental regex source (`SALARY_NUMBER_REGEX_SRC.
      continental`) is **unchanged**. Regression check:
      `parseSalaryNumber("45'000", 'continental')` returns
      `45000` (the helper's apostrophe-strip handles it
      AFTER the regex; if the continental regex itself
      grew `'`, dual-decimal Continental shapes like
      `"45'000,50"` would mis-classify the `'` as a
      thousands separator).
    - **Critical regression check (FR-5):** all 11 original
      USD cases stay byte-for-byte green. Anglo regex
      grew `'` — the original cases use `,` thousands —
      but the character class is union (`[,\\u00A0']`),
      not a replacement, so `,` thousands keep matching.
  - **Estimate:** 0.15 day.

## Phase 3 — Bare-numeric-range third branch + literal Spec 012 § 8 case 12

- [x] T03 — `extractSalary()` adds a third bare-numeric-range
  regex variant gated on `detected.confidence === 'country'`;
  literal `"100.000 - 150.000" + country=GERMANY` parses
  (FR-3 / FR-4 / FR-7).
  **Landed run #62.**
  - **Files (planned):**
    - `packages/common/src/utils/helpers.ts` (new private
      `buildSalaryRegexBare(numSrc)` function + 3-line
      edit to `extractSalary()` body).
    - `packages/common/__tests__/helpers.spec.ts` (2 new
      cases: literal Spec 012 § 8 case 12 + FR-7 negative).
  - **Acceptance:**
    - New `buildSalaryRegexBare(numSrc: string): RegExp`
      private function; capture-group shape mirrors the
      existing prefix/suffix builders exactly (`[1] = min`,
      `[2] = min K-suffix`, `[3] = max`, `[4] = max
      K-suffix`) so the existing K-suffix arithmetic at
      `extractSalary()` line ~684 doesn't need a branch
      to handle the bare match.
    - `extractSalary()` body: after the existing
      `prefixPattern ?? suffixPattern` cascade, IF `match`
      is null AND `detected.confidence === 'country'`,
      try `buildSalaryRegexBare(numSrc)`. The guard MUST
      be the literal string check `=== 'country'` — NOT
      `!== 'default'` (which would wrongly include
      `'symbol'` and `'iso'` paths that already passed the
      first two patterns and missed for some other reason).
    - `extractSalary("100.000 - 150.000", { country:
      GERMANY })` → `{ interval: 'yearly', minAmount:
      100000, maxAmount: 150000, currency: 'EUR' }`. The
      symbol-present substitute (`"100.000 € - 150.000 €"
      + country=GERMANY`) stays green alongside —
      additive.
    - **FR-7 negative (load-bearing):**
      `extractSalary("100.000 - 150.000")` (NO country
      hint) → `{ interval: null, minAmount: null,
      maxAmount: null, currency: null }`. Confirms the
      `confidence === 'country'` guard works — the bare
      regex MUST NOT fire when `confidence === 'default'`.
    - **Existing all-`null` cases stay green (FR-5).**
      Specifically: any USD-default case with no symbol
      and no ISO and no country hint that today returns
      all-`null` continues to do so. The bare regex's
      gate keeps the "no signal" path exactly as it was.
    - The bare regex is compiled per-call (FR-10) —
      consistent with the existing prefix/suffix
      builders' shape; no module-level cache.
  - **Estimate:** 0.2 day.

## Phase 4 — Spec 012 / § 8 case 14 literal + FR-7 false-positive immunity

- [x] T04 — Literal `"$100,000 - $150,000" + country=GERMANY`
  re-enabled (depends on T01's G-1 landing); FR-7 false-
  positive immunity case for plain-prose numbers (FR-1 /
  FR-6 / FR-7). **Partial landing run #63 — see "Run #63
  partial-landing notes" below; closed via Spec 015 (runs
  #65..#68). The literal comma-thousands case 14 + the two
  FR-7 false-positive immunity cases all landed in Spec 015 /
  T02 (run #67) under the source-side fixes shipped at
  Spec 015 / T01 (run #66). T03 closeout (run #68) flipped
  this row from `[~]` partial to `[x]` closed.**
  - **Files (planned):**
    - `packages/common/__tests__/helpers.spec.ts` (2 new
      cases — no source-code edits).
  - **Acceptance:**
    - `extractSalary("$100,000 - $150,000", { country:
      GERMANY })` → `{ interval: 'yearly', minAmount:
      100000, maxAmount: 150000, currency: 'USD' }`.
      Confirms FR-1 precedence END-TO-END through
      `extractSalary` (T01 pinned the
      `parseSalaryCurrency` slice; T04 pins the full
      dispatcher slice).
    - The `€` substitute case from Spec 012 / T04
      (`"€45,000 - €60,000" + country=USA` → EUR /
      45000 / 60000 / yearly) stays green alongside.
    - **FR-7 false-positive immunity:**
      `extractSalary("5 - 7 years experience", { country:
      GERMANY })` → all-`null`. The bare regex captures
      the `5 - 7` substring under the `confidence ===
      'country'` guard, but `5` < `lowerLimit = 1000`,
      so the existing limit-check at
      `extractSalary()` line ~709 correctly rejects the
      row. Documents the safety net — the
      `lowerLimit / upperLimit` clamp is the second line
      of defence against bare-regex over-matching.
    - One more belt-and-braces case:
      `extractSalary("3 - 5 month internship", { country:
      GERMANY })` → all-`null`. Same mechanism.
    - **Bench re-run check (NFR-1 / NFR-6):** running
      `npx jest packages/common/__tests__/helpers.bench`
      after T01..T04 all land must report a p95 within
      ≤ +0.1 ms of the Spec 012 / T04 baseline. The
      bench's CI ceiling (2.0 ms — Spec 012 / T04
      Decision 2) gives ample headroom.
  - **Run #63 partial-landing notes (Q-035 + Q-036
    discoveries):** the literal `"$100,000 - $150,000" +
    country=GERMANY` cannot be pinned tests-only as the
    parent spec assumed — the country tier in
    `resolveSalaryLocale` overrides locale to
    `'continental'` even when the symbol tier resolved
    USD, and continental num-regex interprets `,` as
    decimal so `100,000` parses as `100`. Tracked as
    Q-035. Similarly, the FR-7 false-positive immunity
    claim ("`5` < `lowerLimit = 1000` rejects the row")
    is incorrect: the dispatcher annualises raw `5` via
    `* 2080` (hourly threshold path) → `10400` which DOES
    pass `lowerLimit`. Tracked as Q-036.
    **Run #63 ships:** the K-suffix variant of case 14
    (`"$100K - $150K" + country=GERMANY` → USD / 100000 /
    150000 / yearly) — the K-suffix arithmetic bypasses
    the comma-thousands locale conflict, so this case
    pins FR-1 precedence end-to-end via a workable shape.
    The literal comma-thousands case 14 + the two FR-7
    immunity cases are deferred to the **Spec 015
    candidate** (which addresses Q-035 + Q-036 with a
    bundled source-side fix). T04's `[~]` flag stays
    until Spec 015 lands or the parent acceptance is
    re-scoped at T05 closeout.
  - **Estimate:** 0.15 day (run #63 partial; full close
    blocked on Q-035 + Q-036).

## Phase 5 — Documentation + closeout

- [x] T05 — Doc bump in `PERFORMANCE_TUNING.md`; spec status
  flip; questions resolution flip; `docs/index.md` row update;
  `docs/log.md` entry.
  **Landed run #64.**
  - **Files (planned):**
    - `docs/PERFORMANCE_TUNING.md` (~15-line bump under the
      existing "Salary parser shape / currency detection
      precedence / locale dispatch" section).
    - `.specify/specs/014-salary-parser-residuals/spec.md`
      (Status field flip from "draft" to "All phases done
      (T01..T05 runs #59..#XX); spec complete"; § 10
      Decisions log appended with implementation
      observations).
    - `.specify/specs/014-salary-parser-residuals/tasks.md`
      (T05 row flip).
    - `docs/questions.md` (Q-026 + Q-027 resolution text
      flipped from "open — agent default = B" to
      "**resolved** in Spec 014 (runs #59..#XX)").
    - `docs/index.md` (Spec 014 row updated with closeout
      status).
    - `docs/log.md` (closeout entry).
    - `CLAUDE.md` (run-tag bump).
  - **Acceptance:**
    - `docs/PERFORMANCE_TUNING.md` has a paragraph naming
      each of the three new behaviours with one example
      apiece:
      (a) `$`-symbol promotion to `'symbol'` confidence;
      (b) Swiss apostrophe-thousands now match the regex
      directly;
      (c) bare-number ranges parse when a `country` hint
      is supplied (and the over-matching prevention via
      the `confidence === 'country'` guard + `lowerLimit`
      clamp).
    - Spec 014 spec.md Status reads "All phases done
      (T01..T05 runs #59..#XX); spec complete".
    - Q-026 / Q-027 in `docs/questions.md` show the
      resolution flip with the actual landed-run numbers.
    - `docs/index.md` Spec 014 row reflects closeout
      status.
    - `npm run lint:docs` clean.
    - **No `competitor-watch.md` entry** — Spec 014 is
      not linked to a `§C / AC-N` row (Q-026 / Q-027 are
      internal-correctness gaps surfaced during Spec 012's
      sweep, not upstream-driven coverage gaps).
  - **Estimate:** 0.15 day.

## Notes for the next run (after this scaffold lands)

- **Default for run #65** = open the **Spec 015 candidate**
  scaffolding pass. Three new artefacts under
  `.specify/specs/015-salary-parser-locale-and-prose-immunity/`
  (spec.md + plan.md + tasks.md). Pure docs / Spec-Kit pass;
  NO source code. The scaffolding addresses the two open
  questions opened during Spec 014 / T04 (Q-035: locale
  resolution end-to-end precedence; Q-036: bare-regex
  prose immunity) plus the three Spec 014 deferred test
  cases (literal Spec 012 § 8 case 14 + the two FR-7
  false-positive immunity cases). Phase split likely
  mirrors Spec 014's lean pattern: T01 = source-side
  edits to `resolveSalaryLocale` (Q-035 default A) +
  `extractSalary()` bare-path raw-value pre-check
  (Q-036 default B); T02 = three deferred test cases land;
  T03 = doc + closeout. Estimated 3 phases / 3 runs.
- **Default for run #64 (DONE — landed run #64)** = Spec 014
  / Phase 5 / T05 — documentation + closeout pass.
  Added the `docs/PERFORMANCE_TUNING.md` paragraph naming
  the three T01..T03 behaviours (`$`-symbol promotion /
  Swiss apostrophe-thousands / bare-number country
  fallback) with one example apiece + the documented
  asymmetries from Q-035 + Q-036. Flipped
  `docs/questions.md` Q-026 + Q-027 resolution text from
  "open — agent default = B" to
  "**resolved** in Spec 014 (runs #59..#64)" with the
  actual landed-run numbers; updated `.specify/specs/`
  and `docs/index.md` Spec 014 row to closeout status;
  bumped `CLAUDE.md` run-tag to #64. T04 stays flagged
  `[~]` partial (full close blocks on Spec 015 candidate
  per the Q-035 + Q-036 source-side fixes).
- **Default for run #63 (DONE — landed run #63 partial)** =
  Spec 014 / Phase 4 / T04 — landed the K-suffix variant
  of case 14 (`"$100K - $150K" + country=GERMANY` → USD /
  100000 / 150000 / yearly) end-to-end through
  `extractSalary()`. The literal comma-thousands case 14
  + the two FR-7 false-positive immunity cases were
  blocked on the run-#63 discoveries Q-035 (locale
  resolution doesn't honour symbol-tier precedence
  end-to-end) and Q-036 (bare regex over-matches plain
  prose via the hourly conversion path). T04 stays
  `[~]` partial; the deferred cases land alongside the
  Spec 015 candidate's bundled source-side fix.
- **Default for run #62 (DONE — landed run #62)** = Spec 014
  / Phase 3 / T03 — Bare-numeric-range third branch. Added
  private `buildSalaryRegexBare(numSrc)` with the four-capture
  shape mirroring prefix/suffix builders. Wired into
  `extractSalary()` body via a third try-branch gated on
  literal `detected.confidence === 'country'` (NOT
  `!== 'default'`). Three new test cases pin the literal
  Spec 012 § 8 case 12 + the symbol-present substitute
  (suffix path; additive coverage) + the FR-7 negative
  (no-country-hint → all-`null`).
- **Default for run #61 (DONE — landed run #61)** = Spec 014
  / Phase 2 / T02 — Apostrophe-in-regex extension. Edited
  `SALARY_NUMBER_REGEX_SRC.anglo` to add `'` to the
  thousands-separator character class (`[,\\u00A0]` →
  `[,\\u00A0']`); added the literal Spec 012 § 8 case 5
  (`extractSalary("CHF 90'000 – CHF 120'000")` → CHF /
  90000 / 120000 / yearly) PLUS the comma-thousands
  substitute regression pin. Continental regex source
  unchanged. All prior cases stay green byte-identical.
- **Default for run #60 (DONE — landed run #60)** = Spec 014
  / Phase 1 / T01 — `$` registration in
  `SALARY_UNIQUE_SYMBOLS` + 2 new helper test cases (the
  required "outranks country=GERMANY" + the documented
  "any `$` wins" fast-fail check). 65/65 helper tests pass;
  the FR-7 default-USD case (`parseSalaryCurrency('foo bar')`
  → all-`null` symbol) stays byte-identical.
- **Default for run #59 (DONE — landed run #59)** = Spec 014
  scaffolding pass. Three new artefacts under
  `.specify/specs/014-salary-parser-residuals/` (spec.md +
  plan.md + tasks.md). Pure docs / Spec-Kit pass; NO source
  code. The scaffolding addresses the two open questions
  (Q-026 / Q-027) logged at Spec 012 / T04 (run #41).
- **Cross-spec coordination:**
  - When Spec 014 / T05 lands, update `docs/questions.md`
    Q-026 / Q-027 resolution text from
    "open — agent default = B" to
    "**resolved** in Spec 014 (runs #59..#XX)" with the
    actual landed-run numbers.
  - Spec 014 lifecycle should be **5 runs across 5 phases**
    (one task per run, mirroring Spec 012's lean pattern).
    If T01..T05 close before run #63, the next pinned spec
    is **Spec 015** = AC-8 (seed-companies refresh from
    upstream CSVs) per Spec 013 / T15 Notes-for-the-next-run
    line. Note that AC-8's "refresh from CSVs" carries the
    ongoing zero-churn risk (43 consecutive zero-churn runs
    in `OTHERS/` as of run #59) — if no upstream signal has
    landed by Spec 014 closeout, Spec 015 candidate may
    flip to **AC-9 (Workable diff)** instead, which has
    similar zero-churn weather but a clearer
    self-contained scope.
- **Out-of-scope reminders (do NOT do these in Spec 014):**
  - Do NOT add a `'swiss'` locale enum value. Spec 012 /
    Notes-for-the-next-run decision 2 rejected this; Spec
    014 honours that by keeping Switzerland on `anglo`
    with the regex tweak.
  - Do NOT extend `SALARY_UNIQUE_SYMBOLS` beyond the one
    new entry (`['$', 'USD']`). Multi-`$` disambiguation
    (CAD / AUD / NZD / SGD / HKD) is a future spec —
    log as Q-033 if a fixture demands it.
  - Do NOT touch the continental regex source. Only the
    `anglo` shape gains `'`.
  - Do NOT add a fourth try-branch. The bare regex is the
    third and final variant; further dispatcher cascading
    would invite over-matching.
  - Do NOT add a public helper for the bare regex. It's an
    implementation detail of `extractSalary()` and stays
    private.
  - Do NOT change any plugin source code. Plugins pick up
    the new behaviour transparently via the existing
    barrel.
- **Lockfile sync:** if any new files cause a
  `package-lock.json` regeneration (none expected — Spec 014
  adds zero deps), use the npmjs.org registry override per
  `MEMORY.md` "Lockfile registry rule".
