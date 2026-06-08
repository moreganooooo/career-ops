# Plan 016 — `helpers.bench.spec.ts` TS1127 fix

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-28 (run #69)                               |
| Last updated | 2026-04-28 (run #69)                               |

## 1. Approach

Spec 016 is the **smallest possible spec** in the repo to date —
a single-byte source-file fix in
[`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
plus the four mandatory doc updates (questions ledger, spec
status, run log, run-tag).

The fix is purely cosmetic: the U+00D7 multiplication sign
(`×`) at line 190 inside a template literal is rejected by the
TypeScript parser on this toolchain (TS5.x + ts-jest +
Windows). Replacing it with the ASCII letter `x` (U+0078)
preserves the test name's semantics while restoring file
parseability. The test name renders `5 000 iterations x 8
currencies` instead of `5 000 iterations × 8 currencies` —
nobody reads bench output literally enough for the cosmetic
delta to matter.

The Q-037 default option A (the chosen path here) was selected
over option B (Unicode escape `×`) and option C (root-cause
investigation) because:

- Option B (Unicode escape) preserves the rendered glyph but
  doubles the byte count of the change (`×` is 6 ASCII
  bytes vs. `c3 97` for the UTF-8 `×`) and introduces a
  potentially-confusing escape sequence in test names that
  jest output dumps render as `×` literally on some
  terminals — net cosmetic loss.
- Option C (root-cause investigation) is open-ended and would
  consume multiple runs; it's logged as a future-spec
  candidate but not a Spec 016 phase.

## 2. Phases

### Phase 1 — Single-character source fix + bench acceptance gate (T01)

- **Goal:** apply the FR-5 single-byte substitution at
  [`helpers.bench.spec.ts:190`](../../../packages/common/__tests__/helpers.bench.spec.ts:190);
  verify FR-1 (file compiles) + FR-2 (bench runs + emits
  p95) + FR-3 (record post-fix p95 baseline in run log) +
  FR-6 (helpers.spec stays at 74 / 74).
- **Deliverables:**
  - **Source:** one byte change in
    [`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
    at line 190 — `×` (U+00D7, `c3 97` UTF-8) → `x` (U+0078,
    `78` ASCII).
  - **Docs:**
    - `docs/questions.md` — Q-037 resolution flipped from
      "_pending review_" to "**resolved** in Spec 016
      (run #69)".
    - `.specify/specs/016-bench-file-ts1127-fix/spec.md`
      Status flipped from "draft (scaffolded run #69); T01
      pending" to "All phases done (T01 run #69); spec
      complete".
    - `.specify/specs/016-bench-file-ts1127-fix/tasks.md`
      T01 row flipped from `[ ]` to `[x]`.
    - `docs/index.md` — Spec 016 row added to the Specs
      table; footer bumped.
    - `docs/log.md` — run #69 closeout entry appended; the
      post-fix bench p95 reading recorded as the new
      baseline.
    - `CLAUDE.md` — run-tag bumped → #69.
- **Acceptance:**
  - `npx jest --testPathPatterns
    'packages/common/__tests__/helpers.bench'` reports
    `Tests: N passed, N total` (N ≥ 1) and emits a p95 number
    < `CI_CEILING_MS` (NFR-1).
  - `npx jest --testPathPatterns
    'packages/common/__tests__/helpers.spec'` reports
    `Tests: 74 passed, 74 total` (FR-6).
  - `npm run lint:docs` clean (FR-4 doc hygiene).
- **Estimate:** 0.05 day.

## 3. Phasing rationale

Spec 016 is a single-phase / single-task / single-run spec
because the fix is a single byte. Splitting into "T01 source
fix / T02 doc closeout" would create two runs to land what
fits cleanly in one. Per the Spec 015 / tasks.md run #69
recommendation: "**Q-037** as a single-run warm-up before
AC-8 / AC-9 commit to a multi-run effort".

The phasing also matches the Spec 014 / Spec 015 lean cadence
precedent: when a spec's source delta is small (≤ 5 LOC) and
the test-coverage delta is zero, a single combined phase is
faster and cheaper than the canonical 3-phase shape.

## 4. Dependencies

- `@ever-jobs/common` package
  ([`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts))
  — modified.
- `@ever-jobs/models` package — UNCHANGED.
- No new external deps. No `package.json` edit.
- No bench fixture extension — the existing 8-currency array
  stays exact.

## 5. Risks

| Risk                                                                          | Likelihood | Mitigation                                                                                |
| ----------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------- |
| The `×` → `x` substitution turns out to NOT be the actual root cause; the file still fails to compile after the fix. | Very low | The TS1127 error pointed exactly at column 57 (the byte position of `×` in the template literal); the byte-level analysis in run #66 (`docs/log.md`) confirmed `c3 97` is the offending sequence. If the fix doesn't compile, T01 acceptance gate (FR-1) fails and the spec stays open for follow-on investigation (likely a Q-037 / option C escalation). |
| The post-fix bench p95 exceeds `CI_CEILING_MS = 0.5 ms`. | Very low | Spec 015 / T01 added ≤ 3 instructions on conditional hot paths and ≤ 3 instructions on the symbol-tier short-circuit; both are well under the budget. The bench exercises the dispatcher hot path against 8 currencies × ~600 iterations after warm-up; p95 should sit comfortably below 0.5 ms on modern hardware. If exceeded, the failure is informative (genuine regression signal) rather than a Spec 016 implementation defect — file as a follow-on Q. |
| `ts-jest` cache holds a stale parse of the broken file and the fix doesn't take effect. | Very low | jest's `--clearCache` flag resolves it; T01 acceptance script can include the flag preemptively if needed. |

## 6. Acceptance gates

- T01: `npx jest --testPathPatterns
  'packages/common/__tests__/helpers.bench'` reports a passing
  test + p95 number < `CI_CEILING_MS`; `npx jest
  --testPathPatterns 'packages/common/__tests__/helpers.spec'`
  reports 74 / 74 pass; `npm run lint:docs` clean; spec.md
  Status reads "All phases done (T01 run #69); spec
  complete"; Q-037 resolution flipped.

## 7. Estimated lifecycle

1 phase / 1 task / 1 run. Actual day-equivalent: ~0.05 day.

## 8. Out-of-scope reminders

- Do NOT extend the bench fixture. The existing 8-currency
  array is the agreed surface; widening it is a separate
  spec.
- Do NOT touch `helpers.ts`. The dispatcher is healthy;
  Spec 016 only repairs the bench file's parser-rejection.
- Do NOT investigate the toolchain root cause (Q-037 /
  option C). The pragmatic ASCII fix is sufficient; the root
  cause is a future-spec candidate, not a T01 deliverable.
- Do NOT rename the bench file or its `describe` block.
  Other docs reference both by name.
- Do NOT add a CI workflow gate that fails on bench p95
  regressions (yet). The post-fix p95 baseline is the
  prerequisite for that gate; once recorded in run #69's
  log, a follow-on spec can wire the CI gate.
