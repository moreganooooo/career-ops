# Tasks: 015 — Salary Parser Locale & Prose Immunity

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Two-fix source-side pass

- [x] T01 — `resolveSalaryLocale()` adds tier-1 short-circuit
  on symbol-tier resolutions (Q-035 / FR-1) AND
  `extractSalary()` adds a raw-value pre-check on the
  bare-regex match path (Q-036 / FR-2). **Landed run #66**
  with anglo-only narrowing on the new tier (see Spec 015 /
  spec.md / § 10 / D-01 "narrowing rationale"). Single
  source-edit pass; 71 / 71 helpers.spec stays green.
  - **Files (planned):**
    - `packages/common/src/utils/helpers.ts` — three edits:
      (a) new `CURRENCY_TO_NATURAL_LOCALE` ReadonlyMap
      declared near the existing `SALARY_NUMBER_REGEX_SRC` /
      `SALARY_LOCALE_MAP` block (~line 530); (b) new
      tier-1 branch inserted at the top of
      `resolveSalaryLocale()` body (~line 574); (c) 3-line
      raw-value pre-check inserted in `extractSalary()`
      between `parseSalaryNumber` returns and K-suffix
      multiplication (~line 720).
    - **No test edits in T01** — the three new test cases
      land at T02. T01 is a pure source-edit pass with the
      regression sweep as its acceptance gate.
  - **Acceptance:**
    - New `CURRENCY_TO_NATURAL_LOCALE` lookup has 8 entries
      (USD/GBP/CHF → `'anglo'`; EUR/SEK/NOK/DKK/PLN →
      `'continental'`).
    - `resolveSalaryLocale()` body's first cascade tier
      becomes "if `options.locale` set → use it"; the new
      SECOND tier is "if `confidence === 'symbol'` AND
      `CURRENCY_TO_NATURAL_LOCALE.has(currency)` → return
      that natural locale". The previous second tier
      (`options.country`) becomes the third tier.
    - `extractSalary()` body's match cascade gains a guard
      AFTER `parseSalaryNumber` returns and BEFORE K-suffix
      multiplication: if (a) the match came from
      `barePattern` (NOT `prefixPattern` or `suffixPattern`)
      AND (b) neither `match[2]` nor `match[4]` is `'k'`
      (case-insensitive) AND (c) `minSalary < lowerLimit /
      12`, return `result` (all-`null` envelope).
    - **Critical regression sweep (FR-6):** all 70 existing
      Spec 012 + Spec 014 test cases stay green byte-for-
      byte. Run
      `npx jest --testPathPatterns 'packages/common/__tests__/helpers.spec'`
      after the T01 edits and confirm `Tests: 70 passed,
      70 total` (or whatever number is current at run
      start). Particular attention to the substitute case
      `"€45,000 - €60,000" + country=USA` → EUR / 45000 /
      60000 / yearly: the new locale tier MUST NOT regress
      this. Investigate at T01 implementation time whether
      EUR's natural-locale routing through the new tier
      changes the locale; if it does, the T01 edit needs a
      narrowing clause OR the substitute case needs an
      explicit `options.locale` override.
    - **Bench gate (NFR-1):** `npx jest packages/common/__tests__/helpers.bench`
      reports a p95 within ≤ +0.1 ms of the Spec 012 / T04
      baseline. The fix sums to ≤ 3 instructions on the
      affected hot paths; the bare-path raw-value pre-check
      is gated to bare-path matches only.
  - **Estimate:** 0.25 day.

## Phase 2 — Three deferred Spec 014 / T04 cases land

- [x] T02 — Add 3 new cases in a new
  `describe('extractSalary — Spec 015 / T02 …')` block at the
  bottom of `helpers.spec.ts`. All three should pass
  byte-cleanly under the T01 source edits.
  **Landed run #67.**
  - **Files (planned):**
    - `packages/common/__tests__/helpers.spec.ts` (3 new
      cases — no source-code edits).
  - **Acceptance:**
    - **Case 1 (FR-3 — restored Spec 012 § 8 case 14):**
      `extractSalary("$100,000 - $150,000", { country:
      Country.GERMANY })` →
      `{ currency: 'USD', minAmount: 100000, maxAmount:
      150000, interval: 'yearly' }`.
    - **Case 2 (FR-4 — bare-regex prose immunity case 1):**
      `extractSalary("5 - 7 years experience", { country:
      Country.GERMANY })` → all-`null`.
    - **Case 3 (FR-5 — bare-regex prose immunity case 2):**
      `extractSalary("3 - 5 month internship", { country:
      Country.GERMANY })` → all-`null`.
    - JSDoc above the describe block names Q-035 + Q-036 as
      the originating questions and links to Spec 015 § 8
      test plan rows.
    - Test count grows from 70 → 73; all 73 pass.
    - Existing 70 cases stay byte-for-byte green (FR-6).
  - **Estimate:** 0.15 day.

## Phase 3 — Documentation + closeout

- [x] T03 — Doc bump in `PERFORMANCE_TUNING.md`; spec status
  flip; questions resolution flip; Spec 014 / T04 row
  promoted from `[~]` partial to `[x]` closed; `docs/index.md`
  row update; `docs/log.md` entry; `CLAUDE.md` run-tag.
  **Landed run #68.**
  - **Files (planned):**
    - `docs/PERFORMANCE_TUNING.md` (~10-line addition to the
      existing Spec 014 closeout paragraph naming the two
      new fixes + the FR-8 documented limitation).
    - `.specify/specs/015-salary-parser-locale-and-prose-immunity/spec.md`
      (Status field flip from "draft" to "All phases done
      (T01..T03 runs #65..#XX); spec complete"; § 10
      Decisions log appended with implementation
      observations).
    - `.specify/specs/015-salary-parser-locale-and-prose-immunity/tasks.md`
      (T03 row flip).
    - `.specify/specs/014-salary-parser-residuals/tasks.md`
      (T04 row flipped from `[~]` to `[x]` with "Closed
      via Spec 015 (runs #65..#XX)" annotation).
    - `.specify/specs/014-salary-parser-residuals/spec.md`
      (Status field updated to "All phases done (T01..T05
      runs #59..#64); T04 closed via Spec 015 (runs
      #65..#XX)").
    - `docs/questions.md` (Q-035 + Q-036 resolution text
      flipped from "_pending review_" to "**resolved** in
      Spec 015 (runs #65..#XX)").
    - `docs/index.md` (Spec 015 row updated with closeout
      status).
    - `docs/log.md` (closeout entry).
    - `CLAUDE.md` (run-tag bump).
  - **Acceptance:**
    - `docs/PERFORMANCE_TUNING.md` has a paragraph naming
      each of the two new behaviours with one example
      apiece:
      (a) Locale short-circuit on symbol-tier resolutions
      (`"$100,000 - $150,000" + country=GERMANY` →
      USD / 100000 / 150000 / yearly via the new tier);
      (b) Bare-path raw-value pre-check
      (`"5 - 7 years experience" + country=GERMANY` →
      all-`null` via the threshold guard).
      Plus the FR-8 documented limitation:
      `"100 - 150" + country=GERMANY` still emits because
      `100 ≥ lowerLimit / 12 ≈ 83`.
    - Spec 015 spec.md Status reads "All phases done
      (T01..T03 runs #65..#XX); spec complete".
    - Q-035 / Q-036 in `docs/questions.md` show the
      resolution flip with the actual landed-run numbers.
    - Spec 014 / T04 row is `[x]` with the cross-spec
      annotation; Spec 014 spec.md Status field updated.
    - `docs/index.md` Spec 015 row reflects closeout
      status.
    - `npm run lint:docs` clean.
    - **No `competitor-watch.md` entry** — Spec 015 is
      not linked to a `§C / AC-N` row (Q-035 / Q-036 are
      internal-correctness gaps surfaced during Spec
      014's sweep, not upstream-driven coverage gaps).
  - **Estimate:** 0.1 day.

## Notes for the next run (after T03 landed — Spec 015 closed)

- **Default for run #69** = open Spec 016 candidate slot.
  Three queued candidates from the active backlog:
  - **Q-037** — `helpers.bench.spec.ts` TS1127 fix at
    line 190 (`×` → ASCII `x`); tiniest scope; restores
    the bench acceptance gate that Spec 015 / T01 (D-02)
    deferred. One-character source edit + a CHANGELOG
    note. Estimated 0.05 day.
  - **AC-8** — `seed-companies` refresh (competitor-watch
    backlog row). Touches `packages/persistence-postgres`
    seed fixtures. Estimated 0.5..0.75 day depending on
    upstream churn.
  - **AC-9** — Workable diff (competitor-watch backlog
    row). New ATS scraper plugin scaffold. Estimated
    1.5..2 days; would consume multiple runs.
  Recommended pick: **Q-037** as a single-run warm-up
  before AC-8 / AC-9 commit to a multi-run effort. The
  scheduled-task agent should pick up Q-037 at run #69
  unless a higher-priority signal surfaces (e.g. a
  competitor-watch upstream churn that overtakes the
  backlog ordering).

- **Default for run #68 (DONE — landed run #68)** = Spec
  015 / Phase 3 / T03 — documentation + closeout pass.
  Doc paragraph added to `docs/PERFORMANCE_TUNING.md`
  (new "Spec 015 locale & prose-immunity extensions"
  subsection); Q-035 + Q-036 resolution text flipped
  from "_partially resolved_" to "**resolved** in
  Spec 015 (runs #65..#68)"; Spec 015 spec.md Status
  flipped to "All phases done (T01..T03 runs #65..#68);
  spec complete"; Spec 014 / T04 row flipped from `[~]`
  partial to `[x]` closed with "Closed via Spec 015
  (runs #65..#68)" annotation; Spec 014 / spec.md Status
  updated; `docs/index.md` Spec 015 row + footer
  refreshed; CLAUDE.md run-tag bumped → #68;
  `docs/log.md` run #68 closeout entry appended. No
  `competitor-watch.md` entry. Pure docs-only pass; 0
  source-code edits.

- **Default for run #67 (DONE — landed run #67)** = Spec
  015 / Phase 2 / T02 — three deferred test cases landed
  in a new `describe('extractSalary — Spec 015 / T02 …')`
  block at the bottom of `helpers.spec.ts`. All three
  pass byte-cleanly under the T01 source edits:
  1. `"$100,000 - $150,000" + country=GERMANY` → USD /
     100000 / 150000 / yearly (FR-3) — exercises the
     T01 / D-01 anglo-only short-circuit.
  2. `"5 - 7 years experience" + country=GERMANY` →
     all-`null` (FR-4) — exercises the T01 / FR-2
     raw-value pre-check.
  3. `"3 - 5 month internship" + country=GERMANY` →
     all-`null` (FR-5) — same mechanism as Case 2.

  Pure tests-only pass; NO source edits. Test count grew
  from 71 → 74; all 74 pass; the existing 71 stay
  byte-for-byte green (FR-6).

- **T01 landed observations (run #66 — already in tree):**
  - The spec's literal FR-1 wording was tightened to an
    **anglo-only narrowing** to preserve the substitute
    case `"€45,000 - €60,000" + country=USA` (FR-6). See
    Spec 015 / spec.md / § 10 / D-01 for the full
    rationale. The deferred T02 case
    `"$100,000 - $150,000" + country=GERMANY` falls into
    the anglo-natural branch (USD natural=anglo) and is
    therefore unblocked.
  - The bench acceptance gate (`npx jest
    packages/common/__tests__/helpers.bench`) could not
    be exercised due to a pre-existing TS1127 failure at
    `helpers.bench.spec.ts:190` (the `×` multiplication
    sign in a template literal — broken since Spec 012 /
    T04, commit `836a6c6`). Tracked as
    [Q-037](../../../docs/questions.md#q-037--helpersbenchspects-fails-to-compile-ts1127-at-line-190----in-template-literal)
    with default option A (one-character ASCII fix).
    Spec 016 candidate slot.

- **Default for run #65 (DONE — landed run #65)** = Spec 015
  scaffolding pass. Three new artefacts under
  `.specify/specs/015-salary-parser-locale-and-prose-immunity/`
  (spec.md + plan.md + tasks.md) addressing Q-035 (locale
  precedence) + Q-036 (bare-regex prose immunity) + the
  three deferred Spec 014 / T04 cases.

### Historical default-pin (kept for audit trail)

- **Default for run #66 (DONE — landed run #66)** = Spec 015 / Phase 1 / T01 — two-
  fix source-side pass:
  1. New `CURRENCY_TO_NATURAL_LOCALE` lookup (8 entries)
     declared near `SALARY_NUMBER_REGEX_SRC`.
  2. `resolveSalaryLocale()` body extended with a new
     tier-1 short-circuit (after `options.locale` tier,
     before `options.country` tier): if `confidence ===
     'symbol'` AND `CURRENCY_TO_NATURAL_LOCALE.has(currency)`,
     return that natural locale.
  3. `extractSalary()` body extended with a 3-line raw-
     value pre-check between `parseSalaryNumber` returns
     and K-suffix multiplication: if bare-path AND not
     K-suffix AND `minSalary < lowerLimit / 12`, return
     all-`null`.

  No new test cases in T01 — the three deferred cases land
  at T02. T01's acceptance gate is the 70-case regression
  sweep + the bench p95 baseline check. The substitute-case
  regression risk (`"€45,000 - €60,000" + country=USA`) is
  the load-bearing concern: if the new tier changes the
  routed locale for that case, T01 needs a narrowing clause
  before T02 can proceed cleanly. Estimated 0.25 day.

- **Default for run #65 (DONE — landed run #65)** = Spec 015
  scaffolding pass. Three new artefacts under
  `.specify/specs/015-salary-parser-locale-and-prose-immunity/`
  (spec.md + plan.md + tasks.md) addressing Q-035 (locale
  precedence) + Q-036 (bare-regex prose immunity) + the
  three deferred Spec 014 / T04 cases.

- **Out-of-scope reminders (do NOT do these in Spec 015):**
  - Do NOT add a `'swiss'` locale enum value. Spec 012 +
    Spec 014's "no third locale" reminder still applies.
  - Do NOT extend `CURRENCY_TO_NATURAL_LOCALE` beyond the 8
    entries (one per supported currency). Multi-`$`
    disambiguation (CAD / AUD / NZD / SGD / HKD) is
    Q-033 / future spec.
  - Do NOT change the `Country` enum.
  - Do NOT add a stop-word filter (Q-036 Option C). Linguistic
    filters are fragile; the dimensional pre-check is the
    chosen approach.
  - Do NOT tighten the bare regex itself (Q-036 Option A).
    Would reject legitimate Continental low-end shapes like
    `"100 - 150"`; the raw-value pre-check is the chosen
    approach.
  - Do NOT extend `parseSalaryNumber` or `parseSalaryCurrency`.
    Both stay UNCHANGED (FR-9). The Spec 015 fixes are
    localised to `resolveSalaryLocale()` and `extractSalary()`'s
    body.
  - Do NOT change any plugin source code. Plugins pick up
    the new behaviour transparently via the existing
    `@ever-jobs/common` barrel.
  - Do NOT add a new bench fixture. The existing
    `helpers.bench.spec.ts` (Spec 012 / T04) already
    exercises the dispatcher hot path and stays
    representative.

- **Lockfile sync:** if any new files cause a
  `package-lock.json` regeneration (none expected — Spec 015
  adds zero deps), use the npmjs.org registry override per
  `MEMORY.md` "Lockfile registry rule".
