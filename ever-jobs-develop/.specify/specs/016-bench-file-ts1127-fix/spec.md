# Spec 016 — `helpers.bench.spec.ts` TS1127 fix (`×` U+00D7 → ASCII `x` in template literal)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 016                                                                         |
| Slug           | bench-file-ts1127-fix                                                       |
| Status         | All phases done (T01 run #69); spec complete                                |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-28 (run #69)                                                        |
| Last updated   | 2026-04-28 (run #69)                                                        |
| Supersedes     | (none — restores the bench acceptance gate that Spec 015 / T01 / D-02 deferred) |
| Related specs  | 012 (European Salary Parser — owns `helpers.bench.spec.ts`), 015 (Salary Parser Locale & Prose Immunity — opened Q-037 / D-02) |

## 1. Problem Statement

[`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts)
fails to compile under TypeScript with TS1127
("Invalid character") at line 190:

```
it(`p95 < ${CI_CEILING_MS} ms across 5 000 iterations × 8 currencies`, () => {
```

The U+00D7 multiplication sign (`×`, encoded as `c3 97` in
UTF-8) inside the template literal is rejected by the
TypeScript parser. The file has been broken since it landed in
Spec 012 / T04 (commit `836a6c6`); jest reports
`Tests: 0 total` rather than producing the bench numbers.

The pre-existing failure was surfaced during Spec 015 / T01
(run #66) when the bench acceptance gate
(`npx jest packages/common/__tests__/helpers.bench`) was first
exercised end-to-end and produced the TS1127 error rather
than a p95 number. Spec 015 / T01 / D-02 deferred the gate
and opened
[Q-037](../../../docs/questions.md#q-037--helpersbenchspects-fails-to-compile-ts1127-at-line-190----in-template-literal)
with default option A: replace the `×` literal with the ASCII
letter `x`.

The dispatcher hot path itself is healthy — the regression
sweep at Spec 015 / T01 (71 / 71 helpers.spec green) proves
the parser semantics are intact; only the bench fixture's
test-name template literal carries the offending byte.

## 2. Goals

1. Restore `helpers.bench.spec.ts` to a compilable, runnable
   state under the project's `ts-jest` pipeline so the bench
   acceptance gate can be exercised end-to-end (FR-1 / FR-2).
2. Capture the post-fix bench p95 baseline against the Spec
   012 / T04 + Spec 015 / T01 surface so future runs have a
   concrete number to gate against (FR-3 / NFR-1).
3. Resolve [Q-037](../../../docs/questions.md#q-037--helpersbenchspects-fails-to-compile-ts1127-at-line-190----in-template-literal)
   in the docs questions ledger (FR-4).

## 3. Non-Goals

- **No bench fixture extension.** The existing 8-currency
  array stays exact; this spec is purely a parser-fix pass.
- **No new bench file.** The Spec 015 / Non-Goals "no bench
  file delta" rule still applies to the dispatcher edits;
  Spec 016 only repairs the existing bench file.
- **No `helpers.ts` source-code edit.** The dispatcher and
  `extractSalary()` body stay byte-identical to the post-Spec-
  015 / T01 surface.
- **No tsconfig / jest config edit.** The fix is purely at the
  file-content layer; no toolchain changes.
- **No Q-037 root-cause investigation.** Q-037 / Option C
  (investigate why TS5.x rejects U+00D7 in template literals
  on this toolchain — possibly Windows-specific code-page or a
  ts-jest layer bug) is explicitly out of scope. The pragmatic
  ASCII fix is sufficient to restore the bench acceptance gate.
- **No `helpers.spec.ts` edit.** The 74-case suite stays exact.

## 4. User / Caller Stories

> As the **scheduled-task agent**, when I run the bench
> acceptance gate (`npx jest
> packages/common/__tests__/helpers.bench`) per the Spec 012 /
> T04 + Spec 015 / T01 acceptance text, I want a p95
> number — not a TS1127 compile error.

> As a **future spec author** (Spec 017 / 018 / etc.), when I
> need to verify my dispatcher edits stay within the NFR-1
> performance budget (≤ 0.5 ms p95), I want the bench to
> compile and produce numbers — not silently report
> `Tests: 0 total`.

## 5. Functional Requirements

| ID    | Requirement                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------- | -------- |
| FR-1  | [`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts) compiles under `ts-jest` with zero TS-class errors. | must     |
| FR-2  | `npx jest --testPathPatterns 'packages/common/__tests__/helpers.bench'` reports `Tests: N passed, N total` (N ≥ 1) and emits a p95 number. | must     |
| FR-3  | The post-fix bench p95 number is recorded in the run #69 log entry as the new baseline against which Spec 017+ runs gate. | must     |
| FR-4  | Q-037 in `docs/questions.md` is flipped from "_pending review_" to "**resolved** in Spec 016 (run #69)" with the actual landed-run number. | must     |
| FR-5  | The `helpers.bench.spec.ts` fix is the **single** byte change at line 190 — `×` (U+00D7) → `x` (U+0078). No other byte in the file changes. | must     |
| FR-6  | All 74 existing Spec 012 + Spec 014 + Spec 015 helper test cases stay green byte-for-byte (no removal, no assertion edit, no source-file impact). | must     |

## 6. Non-Functional Requirements

| ID    | Requirement                                                              | Target           |
| ----- | ------------------------------------------------------------------------ | ---------------- |
| NFR-1 | Bench p95 absolute reading remains under the documented 0.5 ms `CI_CEILING_MS` ceiling (the constant declared near the top of `helpers.bench.spec.ts`). | < 0.5 ms         |
| NFR-2 | Bundle-size delta from Spec 016 source edits.                            | 0 bytes (test file only) |
| NFR-3 | Spec 016 lifecycle fits 1 phase / 1 task / 1 run (single-run warm-up before AC-8 / AC-9 multi-run efforts). | ≤ 1 run          |
| NFR-4 | Test-count delta: 74 → 74 (no new helpers.spec cases; bench file count is whatever the existing `it()` shape contributes — likely 1..2). | +0 helpers.spec cases |

## 7. Contracts

### 7.1 Source change

The fix is a single-character substitution at
[`packages/common/__tests__/helpers.bench.spec.ts:190`](../../../packages/common/__tests__/helpers.bench.spec.ts:190):

```ts
// BEFORE
it(`p95 < ${CI_CEILING_MS} ms across 5 000 iterations × 8 currencies`, () => {

// AFTER
it(`p95 < ${CI_CEILING_MS} ms across 5 000 iterations x 8 currencies`, () => {
```

The `×` (U+00D7, encoded `c3 97` in UTF-8) is replaced by the
ASCII letter `x` (U+0078, encoded `78`). Net byte delta: −1
byte. The test name renders `5 000 iterations x 8 currencies`
in jest output instead of `5 000 iterations × 8 currencies`;
this is a cosmetic-only change.

The narrow-NBSP-style separator `5 000` (with regular ASCII
space, per the run #66 hex dump in `docs/log.md`) stays
exact.

### 7.2 No external surface change

`extractSalary()` / `parseSalaryNumber()` /
`parseSalaryCurrency()` / `resolveSalaryLocale()` signatures
all stay byte-identical. No new constants. No new imports. No
test fixture extension.

### 7.3 Errors / sentinels

No new error codes. No bench fixture renames. No CI workflow
edits.

## 8. Test Plan

| # | Case                                                                                  | Outcome                                                                                | Phase |
| - | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- | ----- |
| 1 | `npx jest --testPathPatterns 'packages/common/__tests__/helpers.bench'` (FR-2)        | `Tests: N passed, N total` (N ≥ 1) and a p95 number ≤ `CI_CEILING_MS` (NFR-1).         | T01   |
| 2 | `npx tsc --noEmit -p packages/common/tsconfig.json` (FR-1, indirect via type-check)   | Clean (no errors). The bench file isn't included in the package tsconfig but is parsed by ts-jest at test-run time, so this is the indirect FR-1 verification. | T01   |
| 3 | `npx jest --testPathPatterns 'packages/common/__tests__/helpers.spec'` (FR-6)         | `Tests: 74 passed, 74 total` (regression sweep on the dispatcher surface).             | T01   |
| 4 | `npm run lint:docs` (FR-4 plus general doc hygiene)                                   | Clean.                                                                                 | T01   |

## 9. Open Questions

(None — Spec 016 is the resolution path for Q-037; no new
ambiguities surfaced during scaffolding.)

## 10. Decisions

(Append-only log of decisions made during implementation.
Populated as T01 lands.)

### Decision D-01 (run #69, T01) — post-fix bench p95 baseline recorded

**Context:** FR-3 calls for the post-fix bench p95 number to
be recorded as the new baseline against which Spec 017+ runs
gate. T01 ran the bench acceptance gate
(`npx jest --testPathPatterns
'packages/common/__tests__/helpers.bench'`) and produced the
following overall reading on the scheduled-task agent's
Windows host:

| Stat   | Value (ms) | NFR-1 budget (0.5 ms) | CI ceiling (2.0 ms) |
| ------ | ---------- | --------------------- | ------------------- |
| min    | 0.0071     | OK                    | OK                  |
| median | 0.0095     | OK                    | OK                  |
| mean   | 0.0139     | OK                    | OK                  |
| **p95** | **0.0174** | **~3 % of NFR-1**     | **~0.9 % of CI ceiling** |
| p99    | 0.0425     | OK                    | OK                  |
| max    | 14.8187    | (cold-start outlier — p99 is the last meaningful percentile) | OK |

Per-currency p95s sit between 0.0123 ms (CHF) and 0.0212 ms
(SEK); USD = 0.0165 ms, EUR = 0.0137 ms, GBP = 0.0192 ms,
NOK = (≈ 0.02 ms), DKK = (≈ 0.02 ms), PLN = (≈ 0.02 ms).
The full per-currency breakdown lives in
`dist/bench/helpers-salary.json` (build-artefact only —
gitignored; regenerated each bench run by `ts-jest` so
the path resolves on whatever host runs the bench).

**Decision:** record the **0.0174 ms overall p95** as the
post-Spec-015 / T01 + Spec-016 / T01 baseline. Spec 017+
runs that touch `extractSalary()` or its callees should gate
on `p95 ≤ 0.0174 ms + 0.1 ms = 0.1174 ms` (using the
NFR-1-style "≤ +0.1 ms of baseline" budget the prior specs
referenced). The 0.5 ms NFR-1 absolute target stays as the
overall ceiling.

**Implementation:** the baseline number is also recorded in
`docs/log.md` / run #69 closeout entry alongside the
per-currency table.

### Decision D-02 (run #69, T01) — Q-037 / option C left open

**Context:** Q-037 / option C (root-cause investigation —
why does TS5.x reject U+00D7 in template literals on this
toolchain?) was explicitly left out of Spec 016 scope. The
fix here is option A (pragmatic ASCII substitution). The
parser's behaviour is interesting:

- U+2014 (em-dash, `—`, `e2 80 94`) is accepted in template
  literals at file line 2 of `helpers.bench.spec.ts` (the
  comment block).
- U+00D7 (multiplication sign, `×`, `c3 97`) is rejected at
  file line 190 in a template literal.

The asymmetry suggests a code-page / locale-specific
preprocessing step rather than a TypeScript spec violation
(both characters are well-formed in UTF-8 and the
`StringLiteral` grammar in TS5.x admits them).

**Decision:** leave Q-037 / option C open as a future-spec
candidate (Spec 020+ slot — non-urgent now that the bench
gate is restored). If the rejection re-surfaces against a
different Unicode character in a future bench fixture, the
investigation moves to that spec; otherwise it stays a
known-wart in the toolchain.

**Implementation:** no source-code change. Q-037 in
`docs/questions.md` is flipped to "**resolved (option A)
in Spec 016 (run #69)**"; the option C escalation path is
named in the resolution text.

## 11. References

- [`packages/common/__tests__/helpers.bench.spec.ts`](../../../packages/common/__tests__/helpers.bench.spec.ts) —
  the single file touched by this spec.
- `docs/questions.md` — [Q-037](../../../docs/questions.md#q-037--helpersbenchspects-fails-to-compile-ts1127-at-line-190----in-template-literal)
  ledger entry; flips to "**resolved**" at T01 closeout.
- `.specify/specs/015-salary-parser-locale-and-prose-immunity/spec.md` —
  parent context: § 10 / D-02 deferred the bench gate and
  named Q-037 as the follow-on candidate.
- `.specify/specs/012-european-salary-parser/spec.md` —
  original owner of `helpers.bench.spec.ts` (Spec 012 / T04
  commit `836a6c6` introduced the file with the `×` byte).
- `docs/PERFORMANCE_TUNING.md` — Spec 015 closeout's "Spec 015
  locale & prose-immunity extensions" subsection references
  the dispatcher hot-path budget; Spec 016 / T01 restores the
  bench gate that pins it.
