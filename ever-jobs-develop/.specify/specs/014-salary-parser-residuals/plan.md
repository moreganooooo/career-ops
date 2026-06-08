# Plan 014 — Salary Parser Residuals

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-28 (run #59)                               |
| Last updated | 2026-04-28 (run #59)                               |

## 1. Approach

Spec 014 is intentionally smaller than Spec 012. The work lives
**inside one source file** (`packages/common/src/utils/helpers.ts`)
plus its sibling test suite, with one cross-reference touch in
`docs/PERFORMANCE_TUNING.md` (the existing "Salary parser shape /
currency detection precedence / locale dispatch" section gains
a paragraph about the bare-number branch and the `$` symbol
registration).

The dispatcher pattern from Spec 012 / T03 stays exact. Three
narrowly-scoped edits land:

1. **G-1 — `$` registration.** One-line addition to
   `SALARY_UNIQUE_SYMBOLS`. Promotes `$`-detection from the
   `'default'` confidence tier (rule 5) to the `'symbol'` tier
   (rule 2) — matching Spec 012 / § 7.2's documented precedence.
2. **G-2 — apostrophe in anglo number regex.** One-character
   addition to `SALARY_NUMBER_REGEX_SRC.anglo` (`'` joined with
   `,` and U+00A0 in the thousands character class). The
   apostrophe-strip in `parseSalaryNumber` (FR-12 / Spec 012 /
   T02) stays as defence-in-depth — both layers tolerate `'`
   now.
3. **G-3 — bare-numeric-range third try-branch.** New private
   builder `buildSalaryRegexBare(numSrc)` mirrors the existing
   `buildSalaryRegexPrefix` / `buildSalaryRegexSuffix`. The
   dispatcher tries it ONLY when the prefix/suffix variants
   miss AND `detected.confidence === 'country'` — the gate
   that prevents over-matching on no-signal inputs (FR-7).

The three edits sum to ~10–25 LOC; bundle-size delta (NFR-3:
≤ +0.5 KB) holds easily because no new external imports land.

## 2. Phases

### Phase 1 — `$` registration + helper-test pin (T01)

- **Goal:** land G-1 (FR-1, FR-8) — extend `SALARY_UNIQUE_SYMBOLS`
  to include `['$', 'USD']` and pin the precedence-fix with a
  `parseSalaryCurrency` helper test.
- **Deliverables:**
  - 1-LOC addition to `SALARY_UNIQUE_SYMBOLS` in `helpers.ts`.
  - 1 new test case in `helpers.spec.ts`'s
    `describe('parseSalaryCurrency …')` block:
    `parseSalaryCurrency('$100,000', { country: GERMANY })`
    → `{ code: 'USD', symbol: '$', confidence: 'symbol' }`.
  - Sanity sweep: re-run the existing 8-case
    `parseSalaryCurrency` block — none must regress (the
    `$`-symbol entry is appended at the END of the unique-
    symbols array so EUR / GBP / PLN / CHF detection paths are
    unchanged in their iteration order).
- **Exit criteria:** `npx jest packages/common` reports `Tests:
  ≥ 26 passed` (existing 25 + 1 new). Existing FR-7 default-USD
  case (`parseSalaryCurrency('foo bar')` → `{ code: 'USD',
  symbol: null, confidence: 'default' }`) stays green
  byte-for-byte — **important** because the new `$`-symbol entry
  must NOT shadow the `'default'` tier when no `$` is present.
- **Estimate:** 0.15 day.

### Phase 2 — Apostrophe-in-regex extension + literal Spec 012 case 5 (T02)

- **Goal:** land G-2 (FR-2, FR-9) — extend
  `SALARY_NUMBER_REGEX_SRC.anglo` to tolerate `'` thousands and
  re-enable Spec 012 / § 8 case 5 in `helpers.spec.ts`.
- **Deliverables:**
  - 1-character edit to `SALARY_NUMBER_REGEX_SRC.anglo`
    (`[,\\u00A0]` → `[,\\u00A0']`).
  - 1 new `extractSalary` case in `helpers.spec.ts`:
    `"CHF 90'000 – CHF 120'000"` → CHF / 90000 / 120000 /
    yearly. The existing comma-thousands substitute
    (`"CHF 90,000 – CHF 120,000"`) stays alongside as
    carry-over — both shapes parse now.
  - Defence-in-depth check: `parseSalaryNumber("90'000",
    'anglo')` continues to return `90000` (FR-9 — the
    apostrophe-strip in the helper is still the canonical
    path; the regex extension just lets the dispatcher capture
    the substring in the first place).
- **Exit criteria:** `npx jest packages/common` reports `Tests:
  ≥ 27 passed`. The `parseSalaryNumber` block's
  apostrophe-tolerance case stays green. The continental regex
  source is untouched (continental locales don't use
  apostrophe-thousands; only Switzerland-on-anglo does, per
  Spec 012 / § 7.3).
- **Estimate:** 0.15 day.

### Phase 3 — Bare-numeric-range third branch + literal Spec 012 case 12 (T03)

- **Goal:** land G-3 (FR-3, FR-4, FR-7) — add the
  `buildSalaryRegexBare()` builder and the country-tier guard
  to `extractSalary()`. Re-enable Spec 012 / § 8 case 12.
- **Deliverables:**
  - New private function `buildSalaryRegexBare(numSrc: string):
    RegExp` mirroring the prefix/suffix builders' shape
    (capture groups `[1] = min`, `[2] = min K-suffix`, `[3] =
    max`, `[4] = max K-suffix`).
  - 3-line edit to `extractSalary()`'s body (after the existing
    `prefixPattern ?? suffixPattern` cascade): if `match` is
    null AND `detected.confidence === 'country'`, try the bare
    pattern.
  - 2 new `extractSalary` cases in `helpers.spec.ts`:
    1. Spec 012 § 8 case 12 (literal): `"100.000 - 150.000" +
       country=GERMANY` → EUR / 100000 / 150000 / yearly.
    2. FR-7 negative: `extractSalary('100.000 - 150.000')`
       (no country, no symbol) → all-`null`.
- **Exit criteria:** `npx jest packages/common` reports `Tests:
  ≥ 29 passed`. The FR-7 negative case is the load-bearing one:
  it confirms the `confidence === 'country'` guard works. The
  existing all-`null` cases (anglo-default + non-currency
  inputs) stay green.
- **Estimate:** 0.2 day.

### Phase 4 — Spec 012 / § 8 case 14 literal + FR-7 false-positive immunity (T04)

- **Goal:** with G-1 already landed in T01, the literal case 14
  (`"$100,000 - $150,000" + country=GERMANY` → USD) becomes a
  drop-in test addition. Plus the FR-7 false-positive immunity
  case for plain-prose numbers under a country hint
  (`"5 - 7 years experience" + country=GERMANY` → all-`null`,
  filtered by the `lowerLimit` check).
- **Deliverables:**
  - 2 new `extractSalary` cases in `helpers.spec.ts`:
    1. Spec 012 § 8 case 14 (literal): `"$100,000 - $150,000" +
       country=GERMANY` → USD / 100000 / 150000 / yearly.
       Confirms FR-1 precedence end-to-end.
    2. FR-7 false-positive immunity: `extractSalary('5 - 7
       years experience', { country: GERMANY })` → all-`null`.
       Documents the safety net for plain-prose numbers under
       the bare-regex's country-tier path.
- **Exit criteria:** `npx jest packages/common` reports `Tests:
  ≥ 31 passed`. All three substituted Spec 012 / T04 cases
  (cases 5 / 12 / 14 substitutes) stay green alongside the
  newly-enabled literals — additive, no removals.
- **Estimate:** 0.15 day.

### Phase 5 — Documentation + closeout (T05)

- **Goal:** wire the new shape into the public docs and
  graduate the spec.
- **Deliverables:**
  - ~15-line section bump in
    [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
    under the existing "Salary parser shape" heading covering:
    (a) `$` is now a registered unique-symbol — `confidence:
    'symbol'` for `$`-prefixed inputs even with a non-USA
    country hint; (b) Swiss apostrophe-thousands now match the
    regex directly — no more silent fall-through; (c) bare
    numeric ranges now parse when a `country` hint is supplied,
    with a worked example and the over-matching-prevention
    rationale.
  - Spec `Status` flips to `done`.
  - `docs/index.md` Spec 014 row updated.
  - `docs/questions.md` Q-026 / Q-027 resolution text flipped
    from "open — agent default = B" to
    "**resolved** in Spec 014 (runs #59..#XX)".
  - `docs/log.md` entry.
  - **No `competitor-watch.md` entry needed** — Spec 014 is
    NOT linked to a `§C / AC-N` row (the §C backlog covers
    upstream-driven coverage gaps; Q-026 / Q-027 are
    internal-correctness gaps surfaced during Spec 012's own
    sweep).
- **Exit criteria:** `npm run lint:docs` clean; spec graduated;
  CI green on push.
- **Estimate:** 0.15 day.

## 3. Packages Touched

| Package                        | Change                                                     |
| ------------------------------ | ---------------------------------------------------------- |
| `packages/common`              | 3 narrow edits to `helpers.ts` + ≥ 6 new cases in `helpers.spec.ts` |
| `packages/models`              | (no change)                                                |
| `packages/plugin`              | (no change)                                                |
| `packages/plugins/*`           | (no change) — plugins pick up new behaviour transparently  |
| `apps/api`                     | (no change)                                                |
| `apps/cli`                     | (no change)                                                |
| `docs/PERFORMANCE_TUNING.md`   | +15-line bump under "Salary parser shape"                   |
| `docs/index.md`                | new Spec 014 row                                           |
| `docs/log.md`                  | per-task entries                                           |
| `docs/questions.md`            | Q-026 / Q-027 resolution flip on T05                        |

## 4. Dependencies

| Library                | Version  | Rationale                                                |
| ---------------------- | -------- | -------------------------------------------------------- |
| _(none — zero new external runtime deps)_                                                              |

Same pure-regex / pure-Map approach as Spec 012. No
`currency.js` / `dinero.js` / etc.; the three edits are
small enough that a library would be drastic over-reach.

## 5. Risks & Mitigations

| Risk                                                                             | Likelihood | Impact | Mitigation                                                                                          |
| -------------------------------------------------------------------------------- | ---------- | ------ | --------------------------------------------------------------------------------------------------- |
| **`$` shadows USD-default branch** — every input that contains a stray `$` (e.g. a regex literal in description text) now resolves `confidence: 'symbol'` instead of `'default'` | M | M | T01 phase exit criterion is "FR-7 default-USD case stays green byte-for-byte"; new T01 helper test pins the `$` case explicitly. |
| **Bare regex over-matches plain-prose number ranges** — `"5 - 7 years experience"` style | M | M | FR-7 + the `confidence === 'country'` guard + the existing `lowerLimit` check (Spec 012 line ~709). Phase 4 includes an explicit false-positive immunity test. |
| **Apostrophe in continental regex breaks Continental EU parsing** | L | M | Continental regex is left untouched; only `anglo` gains the `'`. Switzerland-on-anglo is the only target. |
| **NFR-1 latency regression** from the third try-branch          | L | L      | The bare regex is gated on `confidence === 'country'` — common-case (USD / EUR with symbol or ISO) hits the prefix variant on the first try. Bench re-run during T04 closeout. |
| **Plugin author confusion** — `$` semantics changing might surprise existing callers | L | L | Spec 014 / § 3 Non-Goals documents `$` = unconditionally USD; PERFORMANCE_TUNING bump (T05) calls out the symmetry with `€`/`£`/`zł`/`Fr.`. |
| **Bundle-size budget breach (NFR-3)**                                            | L | L      | T05 measures `dist/common/utils/helpers.js` size delta; rollback if > 0.5 KB. |
| **Test-suite runtime budget breach (NFR-5)**                                     | L | L      | The 6 new cases all use small string literals; no I/O, no fixture loading. Runtime delta easily < 30 ms. |

## 6. Rollback Plan

Mechanical: revert the `helpers.ts` diff (3 edit-points); the
package barrel is unaffected (no new public API); the ≥ 6 new
cases in `helpers.spec.ts` are deleted along with the diff.
The doc bump in `PERFORMANCE_TUNING.md` is moved to
`docs/_archive/2026-04-28-spec-014-rolled-back.md` per AGENTS.md
§ 2 / rule 9 (no deletion). Plugin call-sites unaffected — the
three changes are purely additive at the public-API surface
(no new options, no new helpers).

No data migration needed — the three changes are output-shape
edits only, and re-parsing on the next ingest run picks up the
new behaviour.

## 7. Migration Plan (if applicable)

None. All three edits are purely additive at the public-API
surface. Existing callers see strictly more correct output:

- Inputs with `$` + non-USA country hint that previously
  resolved as EUR / etc. via the country tier now resolve
  as USD via the symbol tier (FR-1 precedence honoured).
- Swiss apostrophe-thousands inputs that previously fell
  through to all-`null` now parse correctly (FR-2).
- Bare-number ranges with a country hint that previously fell
  through to all-`null` now parse correctly (FR-3 / FR-4).

Downstream consumers (the dedup engine in Spec 003) gain
**more** populated `currency` rows and **fewer** false merges
across currencies. No existing rows lose a populated field.

## 8. Open Questions for Plan

- **Q-033 candidate** — multi-`$` disambiguation (CAD / AUD /
  NZD / SGD / HKD). Open ONLY if a Canadian / Australian fixture
  surfaces during T01..T04 that demands it; the spec defers
  this to a future spec by treating `$` as unconditionally USD.
- **Q-034 candidate** — Swiss `Fr.` shorthand variants
  (`"Fr. 90'000.-"`). Open ONLY if a fixture demands it;
  the spec leaves the `Fr.` matcher exact.
