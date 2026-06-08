# Tasks 019 — Salary Parser Residuals, Batch 2

> Ordered task list for [Spec 019](./spec.md). Each task targets ≤ 1 day
> of agent work. Acceptance criteria are explicit; phases gate on the
> tasks of the prior phase being `[x]`.

| Field          | Value                              |
| -------------- | ---------------------------------- |
| Tasks ID       | 019                                |
| Spec           | [`spec.md`](./spec.md)             |
| Plan           | [`plan.md`](./plan.md)             |
| Created        | 2026-04-28 (run #78)               |
| Last updated   | 2026-04-28 (run #81)               |

---

## Phase 0 — Scaffold (run #78, this pass)

> Phase 0 is overhead and not counted against the NFR-4 ≤ 3-run
> implementation budget (same convention as Spec 015 / Phase 0).

| ID  | Task                                                                                  | Acceptance                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T00 | Create `.specify/specs/019-salary-parser-residuals-batch-2/{spec,plan,tasks}.md`. Open Q-041 in `docs/questions.md`. Update `docs/index.md` Spec 019 row. Prepend run #78 entry to `docs/log.md` (and a parallel entry to the out-of-repo upstream-watch ledger Sync Log). Bump `CLAUDE.md` run-tag to `2026-04-28 (scheduled run #78)`. | Doc-lint clean. No `.ts` in diff. Four new files (`spec.md`, `plan.md`, `tasks.md`, plus updated `questions.md` block). Five edits (`docs/index.md`, `docs/log.md`, the out-of-repo upstream-watch ledger, `CLAUDE.md`, `docs/questions.md`). | [x]    |

## Phase 1 — T01: source-side threshold bump (target run #79)

| ID  | Task                                                                                  | Acceptance                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T01 | Single-token edit at [`packages/common/src/utils/helpers.ts:803`](../../../packages/common/src/utils/helpers.ts:803): `minSalary < lowerLimit / 12` → `minSalary < lowerLimit` (FR-1, spec § 7.1). | (a) `npx jest packages/common/__tests__/helpers.spec` returns 74/74 passed _(spec doc cited 73; off-by-one doc drift reconciled in D-01)_. (b) `npx jest packages/common/__tests__/helpers.bench` reports p95 = 0.0176 ms (Spec 016 baseline + 0.0002 ms — well under the +0.1 ms NFR-1 budget). (c) FR-5 idempotence verified: `grep -c 'lowerLimit / 12' packages/common/src/utils/helpers.ts` returns 0 post-edit (was 1 pre-edit; required a parallel comment-block refresh on lines 786–803 that drops the literal pre-edit token while preserving Spec 015 / Q-036 audit context). (d) Diff is exactly one file (`helpers.ts`) with the inequality threshold token + the comment-block refresh. (e) Spec 019 / spec.md / § 10 gains Decision D-01 documenting acceptance evidence + the 73→74 baseline reconciliation forward-pointer for T02. (f) `docs/log.md` gains a run #79 entry. | [x]    |

## Phase 2 — T02: test pins for new behaviour (target run #80)

| ID  | Task                                                                                  | Acceptance                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T02 | Add three new `it(...)` blocks in [`packages/common/__tests__/helpers.spec.ts`](../../../packages/common/__tests__/helpers.spec.ts) per spec § 7.2. Cases 74 (FR-2.a — `"100 - 150"` reject), 75 (FR-2.b — `"team of 100 - 150 employees"` reject), 76 (FR-2.c — `"1000 - 1500"` admit at threshold boundary). | (a) `npx jest packages/common/__tests__/helpers.spec` returned **77/77 passed** in 6.905 s (D-01 reconciled the pre-Spec-019 baseline from 73 → 74; +3 delta lands at 77 — NFR-5 honoured). (b) Bench p95 = **0.0248 ms** (D-01 baseline 0.0176 ms + 0.0072 ms; well within +0.1 ms NFR-1 budget; 2/2 bench cases passed in 5.997 s). (c) Diff is exactly one file (`helpers.spec.ts`) with the appended `describe('extractSalary — Spec 019 / T02 (bare-path threshold bump)', ...)` block (~95 added lines: doc comment + 3 `it(...)` blocks). No source-side edit at T02. (d) NFR-5 verified: test count delta is exactly +3 (74 → 77 per D-01 reconciliation; +3 delta unchanged). (e) Spec 019 / spec.md / § 10 gains Decision D-02 documenting acceptance evidence + forward-pointer to T03 doc-drift reconciliation. (f) `docs/log.md` gains a run #80 entry. | [x]    |

## Phase 3 — T03: closeout (target run #81)

| ID  | Task                                                                                  | Acceptance                                                                                                                                                          | Status |
| --- | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| T03 | (a) Update [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md): rewrite the Spec 015 / FR-8 paragraph to reflect Spec 019 closure (the `"100 - 150" + country=GERMANY` shape is now rejected; recommended escape hatches are prefix-anchored EUR symbol or suffix-anchored EUR ISO). (b) Flip Spec 019 / spec.md Status from `draft (Phase 0 scaffolded run #78); Phase 1..3 pending` to `All phases done (T03 run #81); spec complete`. (c) Update `docs/index.md` Spec 019 row Status to match. (d) Append Decision D-03 to Spec 019 / § 10 documenting T03 acceptance + the doc edit summary. (e) Prepend run #81 entry to `docs/log.md` (and a parallel entry to the out-of-repo upstream-watch ledger Sync Log). (f) Bump `CLAUDE.md` run-tag to run #81. | (a) `npm run lint:docs` exits 0. (b) No `.ts` file in the diff (T03 is docs-only — FR-9 / Non-Goal). (c) Spec 019 / spec.md Status reads `All phases done (T03 run #81); spec complete`. (d) Spec 019 closes its full lifecycle in **3 implementation runs** (T01 + T02 + T03 at runs #79..#81). (e) Q-041 Resolution stays `_open — agent default = A` (the user owner reviews; resolution flip is human-driven, not agent-driven). | [x]    |

---

## Notes for the next run (run #81)

- **Default for run #81** (after T01 + T02 landed) = Spec 019 /
  Phase 3 / T03 — closeout pass. T03 is docs-only; rewrites
  the Spec 015 / FR-8 paragraph in
  [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
  to reflect closure (the `"100 - 150" + country=GERMANY`
  shape is now rejected; recommended escape hatches are
  prefix-anchored EUR symbol or suffix-anchored EUR ISO).

  **T03 acceptance recipe:**

  1. Open
     [`docs/PERFORMANCE_TUNING.md`](../../../docs/PERFORMANCE_TUNING.md)
     and locate the Spec 015 / FR-8 paragraph (search for
     "100 - 150" or "FR-8 known limitation").
  2. Rewrite the paragraph: keep the audit trail (the
     limitation existed under Spec 015; Spec 019 closed it),
     update the current-behaviour line to "Spec 019 / FR-1
     rejected", document the escape hatches (prefix-anchored
     EUR symbol, suffix-anchored EUR ISO).
  3. Reconcile the 73→76 / 74→77 doc-drift surfaced at D-01:
     update spec § 7.2 narrative + NFR-5 target line to
     reference the actual baseline (74 → 77) while leaving
     the case literals byte-exact.
  4. Flip Spec 019 / spec.md Status from
     `T01 + T02 landed (runs #79..#80); T03 pending` to
     `All phases done (T03 run #81); spec complete`.
  5. Update `docs/index.md` Spec 019 row Status to match.
  6. Append Decision D-03 to Spec 019 / § 10 documenting T03
     acceptance + the doc edit summary.
  7. Prepend run #81 entry to `docs/log.md`.
  8. Bump `CLAUDE.md` run-tag to `2026-04-28 (scheduled run #81)`.
  9. Flip Spec 019 / tasks.md / T03 row from `[ ]` to `[x]`.
  10. `npm run lint:docs` clean.
  11. Commit + push.

  Spec 019 closes its full lifecycle in 4 runs (1 scaffold +
  3 implementation) — matches Spec 014 / Spec 015 cadence.

- **Default for run #82** (after Spec 019 closes) = next
  backlog candidate. The agent-driven upstream-watch backlog
  has been exhausted since run #77; the salary-parser-
  residuals-batch-2 work item closes at run #81. Open
  candidates per Spec 015 / D-02 (root-cause investigation
  on TS5.x rejecting U+00D7 in template literals — Spec 016
  forward-pointer), Spec 019 / plan.md § 8 (forward-compat
  graduated thresholds — Spec 020 candidate if telemetry
  warrants), or any new external-snapshot tag set churn.

- **If the external-snapshot tag set changes at run #81**:
  prepend a fresh row to the out-of-repo upstream-watch ledger
  capturing the new tag, but do NOT block T03. The
  internal-correctness backlog (Spec 019) and the
  upstream-driven backlog (out-of-repo ledger) are independent.

## Out-of-scope reminders (do NOT do these in Spec 019)

- Do NOT modify
  [`buildSalaryRegexBare`](../../../packages/common/src/utils/helpers.ts:692).
  The Q-041 Option C alternative was explicitly rejected.
- Do NOT modify
  [`buildSalaryRegexPrefix`](../../../packages/common/src/utils/helpers.ts:621)
  or `buildSalaryRegexSuffix`. Both stay byte-identical.
- Do NOT modify the K-suffix bypass guard
  (`match[2] !== 'k' && match[4] !== 'k'`). FR-6 is
  load-bearing.
- Do NOT introduce a stop-word filter (Q-041 Option B
  explicitly rejected — fragile / i18n-brittle).
- Do NOT change `lowerLimit`, `upperLimit`, `hourlyThreshold`,
  `monthlyThreshold`, or `enforceAnnualSalary` defaults in
  `ExtractSalaryOptions`. The threshold bump is to the
  **multiplier** of `lowerLimit` in the pre-check (1/12 → 1/1),
  not to `lowerLimit` itself.
- Do NOT modify `parseSalaryCurrency`, `parseSalaryNumber`, or
  `resolveSalaryLocale` (FR-9 inherited from Spec 015).
- Do NOT modify `CURRENCY_TO_NATURAL_LOCALE`,
  `SALARY_NUMBER_REGEX_SRC`, `SALARY_SYMBOL_ALTERNATIONS`, or
  `SALARY_LOCALE_MAP`. All four module-private constants stay
  byte-identical.
- Do NOT modify any plugin source code (FR-9 inherited from
  Spec 015). Plugins inherit the new behaviour via the
  `@ever-jobs/common` barrel transparently.
- Do NOT add a new bench fixture. The existing
  [`helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
  already exercises the dispatcher hot path (Spec 016 / T01
  restored compilation; Spec 019 honours the gate).
- Do NOT extend the Spec 019 scope to cover `country` enum
  additions, new currency support, or new dispatcher paths.
  Forward-compat candidates (`bareNumericThreshold` operator
  opt-in, graduated per-country thresholds) are tracked in
  Spec 019 / plan.md / § 8 for a future Spec 020 if telemetry
  warrants.
- Do NOT delete the Spec 015 / FR-8 paragraph from
  `PERFORMANCE_TUNING.md`. Rewrite it to reflect the closure
  (the limitation existed; Spec 019 closed it; the audit
  trail stays).
- Do NOT add a new row to the out-of-repo upstream-watch
  ledger at any phase. Spec 019 is internal-correctness
  driven (Q-041); the out-of-repo ledger did not motivate it.
  The Sync Log entries for runs #78..#81 are appropriate;
  upstream-watch row additions are not.
- **Lockfile sync:** Spec 019 / T01 adds zero deps; no
  `package-lock.json` regeneration this spec.
