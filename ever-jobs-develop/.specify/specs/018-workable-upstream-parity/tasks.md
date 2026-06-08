# Tasks: 018 — Workable Upstream Parity

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 0 — Scaffolding (run #76)

- [x] T00 — Create `.specify/specs/018-workable-upstream-parity/`
  with spec.md / plan.md / tasks.md; thread Spec 018 through
  the four ledger surfaces (`docs/index.md` § 7 row, `docs/log.md`
  run #76 entry, `competitor-watch.md` Sync Log run #76 entry,
  `CLAUDE.md` run-tag bump). **Landed run #76** — all six file
  edits (3 new spec-folder files + 3 ledger surfaces +
  CLAUDE.md run-tag) committed in a single docs-only commit.
  AC-9 row in `competitor-watch.md` § C **stays as-is** at this
  scaffold pass — the flip is owned by T01 at run #77.
  - **Files:**
    - `.specify/specs/018-workable-upstream-parity/spec.md` (new — ~270 lines).
    - `.specify/specs/018-workable-upstream-parity/plan.md` (new — ~150 lines).
    - `.specify/specs/018-workable-upstream-parity/tasks.md` (new — this file).
    - `docs/index.md` — Spec 018 row added to § 7 table; footer bumped.
    - `docs/log.md` — run #76 entry prepended at top.
    - `competitor-watch.md` — Sync Log run #76 entry prepended.
    - `CLAUDE.md` — run-tag bumped → #76.
  - **Acceptance:**
    - `npm run lint:docs` clean (NFR-5).
    - All four ledger surfaces reference Spec 018 by name + run number.
    - The Spec 018 row in `docs/index.md` § 7 reads `draft (scaffolded run #76); Phase 0 only — Phase 1 (T01) pending`.
    - No `.ts` file modified (FR-6 / NFR-3).
  - **Estimate:** 0.1 day.

## Phase 1 — Verdict closeout + AC-9 flip (T01, run #77)

- [x] T01 — Decision D-01 (verdict text from § 7.2 formalised
  in § 10) landed; no `D-02..D-NN` discovery notes opened
  (the re-read of
  [`workable.service.ts`](../../../packages/plugins/source-ats-workable/src/workable.service.ts)
  against the upstream coverage matrix surfaced no additional
  ambiguity). `competitor-watch.md` § C row AC-9 flipped
  from `agent` to `agent ✅ (run #77)`; Spec 018 spec.md Status
  flipped to `All phases done (T01 run #77); spec complete`.
  **Landed run #77** — six docs-only file edits committed in a
  single closeout commit; zero `.ts` file changes.
  - **Files (landed run #77):**
    - `.specify/specs/018-workable-upstream-parity/spec.md` —
      Status field flipped; Last updated bumped to
      `2026-04-28 (run #77)`; § 10 Decisions appended with
      D-01 verdict text (re-read of `WorkableService` against
      the § 7.3 coverage matrix; consequences enumerated).
    - `.specify/specs/018-workable-upstream-parity/tasks.md` —
      this T01 row flipped from `[ ]` to `[x]`.
    - `competitor-watch.md` § C row AC-9 — `agent` →
      `agent ✅ (run #77)`; Sync Log run #77 entry prepended.
    - `docs/index.md` — Spec 018 row Status updated to match
      spec.md (`All phases done (T01 run #77); spec complete`);
      footer bumped to `2026-04-28 (run #77)`.
    - `docs/log.md` — run #77 closeout entry prepended at top.
    - `CLAUDE.md` — run-tag bumped → #77.
  - **Source:** _none._ Zero `.ts` file changes (FR-6 / NFR-3).
  - **Acceptance (verified at T01 closeout):**
    - `npm run lint:docs` clean (NFR-5; exit 0).
    - `git show 312c7b6 -- workable/main.py` in
      `OTHERS/Ats-scrapers/` matches Spec 018 § 7.1
      byte-for-byte (FR-5 idempotence re-verified; Test Plan #4).
    - `competitor-watch.md` § C row AC-9 reads `agent ✅`
      (FR-4; Test Plan #5).
    - Spec 018 spec.md Status reads
      `All phases done (T01 run #77); spec complete`
      (Test Plan #6).
    - `docs/index.md` Spec 018 row matches spec.md Status.
    - `docs/log.md` run #77 entry includes Decision D-01
      verdict summary.
    - Existing
      [`__tests__/workable.e2e-spec.ts`](../../../packages/plugins/source-ats-workable/__tests__/workable.e2e-spec.ts)
      3-case suite untouched (NFR-2 / Test Plan #3 — test
      count delta = 0). Sandbox cannot run `npx jest` (no
      `node_modules`); CI on push validates the test count
      stays exact.
  - **Estimate:** 0.05 day.

## Notes for the next run (after Spec 018 closes — landed run #77)

- **Default for run #76 (DONE — landed run #76)** = Spec
  018 / Phase 0 — scaffold pass. Three new spec-folder files +
  four ledger surfaces threaded; AC-9 stayed at `agent` until
  T01 run #77 flipped it.

- **Default for run #77 (DONE — landed run #77)** = Spec 018 /
  Phase 1 / T01 — verdict closeout. Six docs-only file edits
  committed in a single closeout commit: AC-9 flipped to
  `agent ✅ (run #77)`, Decision D-01 appended to spec.md § 10,
  Spec 018 spec.md Status flipped to `All phases done (T01 run #77); spec complete`,
  tasks.md T01 row flipped from `[ ]` to `[x]`, run #77 entries
  prepended to `docs/log.md` + `competitor-watch.md`, `CLAUDE.md`
  run-tag bumped → #77, `npm run lint:docs` clean (NFR-5
  verified; exit 0). FR-5 idempotence re-verified at T01
  closeout (`git show 312c7b6 -- workable/main.py` matches
  § 7.1 byte-for-byte). Zero `.ts` files modified across Spec
  018's full lifecycle (FR-6 / NFR-3 honoured). Existing
  3-case `workable.e2e-spec.ts` suite untouched (NFR-2 — test
  count delta = 0).

- **Default for run #78 (after Spec 018 closes)** = **next
  backlog candidate**. Spec 018 closed the AC-9 row in
  `competitor-watch.md` § C; the section's remaining
  agent-owned rows post-run-#77 are:
  - **AC-3..AC-7** — all `agent ✅` (closed in earlier
    spec passes).
  - **AC-8** — `agent ✅` (closed runs #71..#74 by Spec 017).
  - **AC-9** — `agent ✅ (run #77)` (closed by this spec).
  After AC-9 closes, the agent-driven backlog in § C is
  exhausted for the current upstream snapshot (Ats-scrapers @
  `3bacd6e`, JobSpy @ `fda080a`, Jobspy-api @ `26bb6f4` — all
  unchanged for 56 consecutive zero-churn runs). The next
  pickup choices are:
  - **(a) Q-026 / Q-027 / Q-035 / Q-036** — internal-correctness
    salary-parser residuals still open in `docs/questions.md`.
    Most fit a Spec 019 candidate (`salary-parser-residuals-batch-2`).
  - **(b) Spec 006 / Spec 013 § 3 non-goals carry-over** — ATS
    detail-page enrichment renumbered to Spec 017 candidate at
    Spec 013 closeout (run #58); was deferred when Spec 017
    landed seed-companies refresh instead. Now eligible again.
  - **(c) New `competitor-watch.md` § C row** — if the
    upstream `OTHERS/Ats-scrapers/`, `OTHERS/JobSpy/`, or
    `OTHERS/Jobspy-api/` repos churn, the agent at run #78
    would record the new commit + open a fresh `AC-NN` row.
  Recommended pick: **(a)** salary-parser-residuals-batch-2,
  on the same rationale as Spec 014 → Spec 015 → Spec 016
  cadence (warm-internal-correctness backlog vs. cold-external
  upstream backlog after AC-9 closes).

## Out-of-scope reminders (do NOT do these in Spec 018)

- Do NOT modify
  [`packages/plugins/source-ats-workable/src/workable.service.ts`](../../../packages/plugins/source-ats-workable/src/workable.service.ts).
  The verdict is **no-op absorption** (D-01); any future
  source-code change against the Workable plugin requires
  a fresh spec slot.
- Do NOT modify the Workable plugin's `package.json`,
  `tsconfig.json`, `__tests__/` fixtures, or
  `workable.constants.ts`. Test count delta = 0 (NFR-2).
- Do NOT extend the Workable plugin to absorb the upstream
  `should_scrape_company` checkpoint subsystem. That work
  belongs in `persistence-postgres` (Spec 004 boundary) and
  the `JobsAggregator` (Spec 005 boundary), not in
  `source-ats-workable`.
- Do NOT touch the Workable rows in
  [`docs/COMPANY_SLUG_DIRECTORY.md`](../../../docs/COMPANY_SLUG_DIRECTORY.md).
  Spec 017 / T03 (run #73) refreshed those to 27 rows; Spec
  018 does not own the directory section.
- Do NOT open a fresh `Q-NNN` entry in `docs/questions.md` at
  scaffold pass (run #76). The 312c7b6 diff is unambiguous;
  the verdict is well-supported by existing Spec 004 / Spec
  005 boundaries. If T01 implementation discovers ambiguity,
  open Q-041 then.
- Do NOT promote the `gap-acknowledged` § 7.3 row 5
  (`ssl=False`) to a follow-on spec candidate. The divergence
  is a security upgrade in Ever Jobs's favour; absorbing the
  upstream behaviour would be a regression.
- Do NOT refresh the Workable section of
  [`docs/ATS_INTEGRATIONS.md`](../../../docs/ATS_INTEGRATIONS.md).
  The plugin behaviour described there is unchanged.
- **Lockfile sync:** Spec 018 / T01 adds zero deps; no
  `package-lock.json` regeneration this spec.
