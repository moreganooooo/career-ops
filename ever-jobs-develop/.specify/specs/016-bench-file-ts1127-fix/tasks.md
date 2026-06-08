# Tasks: 016 — `helpers.bench.spec.ts` TS1127 fix

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Single-character source fix + bench acceptance gate

- [x] T01 — Replace the U+00D7 multiplication sign (`×`) at
  [`packages/common/__tests__/helpers.bench.spec.ts:190`](../../../packages/common/__tests__/helpers.bench.spec.ts:190)
  with the ASCII letter `x` (U+0078). Verify the bench
  acceptance gate (FR-1 / FR-2 / NFR-1), record the post-fix
  p95 baseline (FR-3) in the run #69 log, flip Q-037
  resolution (FR-4), regression-sweep helpers.spec at 74 / 74
  (FR-6). **Landed run #69** — bench reports
  `Tests: 2 passed, 2 total` with overall p95 = 0.0174 ms
  (NFR-1 budget 0.5 ms; CI ceiling 2.0 ms); helpers.spec
  stays at 74 / 74 green.
  - **Files (planned):**
    - `packages/common/__tests__/helpers.bench.spec.ts` —
      single byte change at line 190 (`×` → `x`).
    - `docs/questions.md` — Q-037 resolution flip (~5-line
      edit).
    - `.specify/specs/016-bench-file-ts1127-fix/spec.md` —
      Status field flip from "draft (scaffolded run #69);
      T01 pending" to "All phases done (T01 run #69); spec
      complete"; § 10 Decisions log appended with the
      post-fix p95 reading.
    - `.specify/specs/016-bench-file-ts1127-fix/tasks.md` —
      this row flipped from `[ ]` to `[x]`.
    - `docs/index.md` — new Spec 016 row added to the
      § 7 Specs table; footer bumped.
    - `docs/log.md` — run #69 closeout entry appended;
      bench p95 number recorded as the new baseline.
    - `CLAUDE.md` — run-tag bumped → #69.
  - **Acceptance:**
    - The byte at offset corresponding to line 190 column 57
      changes from `c3 97` (UTF-8 `×`) to `78` (ASCII `x`).
      No other byte in `helpers.bench.spec.ts` changes
      (FR-5).
    - `npx jest --testPathPatterns
      'packages/common/__tests__/helpers.bench'` reports
      `Tests: N passed, N total` (N ≥ 1) and emits a p95
      number < `CI_CEILING_MS = 0.5 ms` (FR-1 / FR-2 /
      NFR-1).
    - `npx jest --testPathPatterns
      'packages/common/__tests__/helpers.spec'` reports
      `Tests: 74 passed, 74 total` (FR-6).
    - `npm run lint:docs` clean.
    - Q-037 in `docs/questions.md` reads "**resolved** in
      Spec 016 (run #69)" with the actual landed-run
      number.
    - Spec 016 spec.md Status reads "All phases done (T01
      run #69); spec complete".
    - `docs/index.md` § 7 Specs table has a new row for
      Spec 016 with status "All phases done (T01 run #69);
      spec complete".
    - `docs/log.md` run #69 entry includes the post-fix
      p95 reading as a numeric baseline (e.g. "post-fix p95
      = 0.18 ms across 5 000 iterations × 8 currencies").
  - **Estimate:** 0.05 day.

## Notes for the next run (after T01 lands)

- **Default for run #70** = open Spec 017 candidate slot.
  Two queued candidates from the active backlog (per Spec
  015 / tasks.md / run #69 default-pin):
  - **AC-8** — `seed-companies` refresh (competitor-watch
    backlog row). Touches `packages/persistence-postgres`
    seed fixtures. Estimated 0.5..0.75 day depending on
    upstream churn. Multi-run.
  - **AC-9** — Workable diff (competitor-watch backlog
    row). New ATS scraper plugin scaffold. Estimated
    1.5..2 days; would consume multiple runs.
  Recommended pick: **AC-8** as the smaller of the two
  multi-run efforts; AC-9 as the slot after AC-8 closes.
  The scheduled-task agent at run #70 should cross-check
  `competitor-watch.md` for any upstream churn that
  overtakes the backlog ordering before committing to
  AC-8.

- **Default for run #69 (DONE — landed run #69)** = Spec
  016 / Phase 1 / T01 — single-character ASCII fix at
  `helpers.bench.spec.ts:190`. Restored the bench
  acceptance gate that Spec 015 / T01 / D-02 deferred.
  Post-fix p95 baseline recorded in `docs/log.md` / run
  #69 entry. Q-037 resolution flipped to "**resolved** in
  Spec 016 (run #69)".

## Out-of-scope reminders (do NOT do these in Spec 016)

- Do NOT extend the bench fixture beyond the existing
  8-currency array. Widening the bench surface is a
  separate spec candidate.
- Do NOT touch
  [`packages/common/src/utils/helpers.ts`](../../../packages/common/src/utils/helpers.ts).
  The dispatcher is healthy after Spec 015 / T01; Spec 016
  only repairs the bench file's parser-rejection.
- Do NOT investigate the toolchain root cause (Q-037 /
  option C — TS5.x rejecting U+00D7 in template literals
  on this toolchain). The pragmatic ASCII fix is
  sufficient; the root cause is a future-spec candidate,
  not a T01 deliverable.
- Do NOT rename the bench file or its `describe` block.
  Other docs reference both by name.
- Do NOT add a CI workflow gate that fails on bench p95
  regressions (yet). The post-fix p95 baseline is the
  prerequisite for that gate; once recorded in run #69's
  log, a follow-on spec can wire the CI gate.
- Do NOT change `CI_CEILING_MS` or any other constant
  declared near the top of `helpers.bench.spec.ts`. The
  ceiling stays at the value Spec 012 / T04 established.
- **Lockfile sync:** Spec 016 / T01 adds zero deps; no
  `package-lock.json` regeneration this run.
