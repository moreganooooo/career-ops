# Plan 018 — Workable Upstream Parity

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-28 (run #76)                               |
| Last updated | 2026-04-28 (run #76)                               |

## 1. Approach

Spec 018 is an **absorption-pass spec** — the same shape as the
Spec 006 / Spec 013 ATS-Parity precedents, but at the smallest
possible scale: a single named upstream commit (`312c7b6`) whose
diff is six added lines plus two removed lines, all of which
land entirely inside an upstream Python script's checkpoint
subsystem (`should_scrape_company`) that has **no analog at the
plugin layer** in our architecture.

The verdict is therefore: **documented no-op absorption**. The
spec's value is not in landing TypeScript code (none lands), but
in:

1. Recording the byte-level diff verbatim so a future agent
   doesn't have to re-establish what `312c7b6` actually
   contains (FR-1 / § 7.1 of `spec.md`).
2. Recording the architectural mismatch (`IScraper` is stateless;
   the upstream improvement applies to a checkpoint subsystem
   that lives in `persistence-postgres` + `JobsAggregator` in
   our world) so future Workable-related specs can scope
   correctly without redoing the analysis (FR-2 / § 7.2).
3. Recording the broader 8-row coverage matrix (FR-3 / § 7.3)
   so the next commit-shape audit against
   `OTHERS/Ats-scrapers/workable/main.py` knows the baseline
   of what's already mirrored / mirrored-elsewhere /
   out-of-scope / gap-acknowledged.
4. Closing AC-9 in `competitor-watch.md` § C (FR-4) so the
   backlog can move forward to the next Spec 019 candidate.

The spec is **deliberately the second-smallest in the repo
after Spec 016** (single-byte fix). It lands across two runs:
the run #76 scaffold pass (this one) sets up spec.md / plan.md
/ tasks.md + the four ledger surfaces; the run #77 T01
closeout flips AC-9 + the spec Status + appends Decision D-01.

## 2. Phases

### Phase 0 — Scaffolding (this run, #76)

- **Goal:** create `.specify/specs/018-workable-upstream-parity/`
  with spec.md / plan.md / tasks.md; thread Spec 018 through
  the four ledger surfaces (`docs/index.md` § 7 row, `docs/log.md`
  run #76 entry, `competitor-watch.md` Sync Log run #76 entry,
  `CLAUDE.md` run-tag bump).
- **Deliverables:**
  - **New folder:** `.specify/specs/018-workable-upstream-parity/`
    with three files (spec.md, plan.md, tasks.md) — all docs.
  - **Docs:**
    - `docs/index.md` — Spec 018 row added at end of § 7
      table; footer "Last revised" bumped to `2026-04-28 (run #76)`.
    - `docs/log.md` — run #76 entry prepended at top.
    - `competitor-watch.md` — Sync Log run #76 entry prepended;
      AC-9 row in § C **stays as-is** at this scaffold pass
      (the flip lands at T01 / run #77).
    - `CLAUDE.md` — `_Last revised: 2026-04-28 (scheduled run #76)_`.
- **Acceptance:**
  - `npm run lint:docs` clean (NFR-5).
  - All four ledger surfaces reference Spec 018 by name + run
    number.
  - The Spec 018 row in `docs/index.md` § 7 reads `draft (scaffolded run #76); Phase 0 only — Phase 1 (T01) pending`.
  - No `.ts` file modified (FR-6 / NFR-3).
- **Estimate:** 0.1 day.

### Phase 1 — Verdict closeout + AC-9 flip (T01, run #77)

- **Goal:** land Decision D-01 (the verdict text from § 7.2
  formalised in § 10) plus any D-02..D-NN discovery notes from
  re-reading `WorkableService` against the upstream audit
  matrix; flip `competitor-watch.md` § C row AC-9 from `agent`
  to `agent ✅`; flip Spec 018 spec.md Status to `All phases done`.
- **Deliverables:**
  - **Docs:**
    - `.specify/specs/018-workable-upstream-parity/spec.md` —
      Status flipped from `draft (scaffolded run #76); Phase 0
      only — Phase 1 (T01) pending` to `All phases done (T01
      run #77); spec complete`. § 10 Decisions appended with
      D-01 (verdict).
    - `.specify/specs/018-workable-upstream-parity/tasks.md` —
      T01 row flipped from `[ ]` to `[x]` with the actual
      landed-run number.
    - `competitor-watch.md` § C row AC-9 — `agent` → `agent ✅`
      with run number `(run #77)`.
    - `competitor-watch.md` Sync Log run #77 entry prepended
      with the AC-9 flip + verdict pointer.
    - `docs/index.md` — Spec 018 row Status updated to match
      spec.md; footer bumped to `2026-04-28 (run #77)`.
    - `docs/log.md` — run #77 closeout entry prepended.
    - `CLAUDE.md` — run-tag bumped → #77.
  - **Source:** _none._ No `.ts` file changes (FR-6 / NFR-3).
- **Acceptance:**
  - `npm run lint:docs` clean (NFR-5).
  - `npx jest --testPathPatterns 'packages/plugins/source-ats-workable'`
    sanity sweep — existing test count unchanged, all green
    (NFR-2 / Test Plan #3).
  - `git show 312c7b6 -- workable/main.py` in
    `OTHERS/Ats-scrapers/` matches Spec 018 § 7.1 byte-for-byte
    (FR-5 idempotence; Test Plan #4).
  - `competitor-watch.md` § C row AC-9 reads `agent ✅` (FR-4;
    Test Plan #5).
  - Spec 018 spec.md Status reads `All phases done (T01 run #77);
    spec complete` (Test Plan #6).
  - `docs/index.md` Spec 018 row matches spec.md Status.
  - `docs/log.md` run #77 entry includes Decision D-01 verdict
    summary.
- **Estimate:** 0.05 day.

## 3. Phasing rationale

Two-phase / two-run cadence (Phase 0 scaffold + Phase 1 T01)
mirrors the **Spec 017 lifecycle pattern**: run #70 scaffolded
017's spec.md / plan.md / tasks.md, runs #71..#75 landed
T01..T05. Spec 018 needs only a Phase 0 + a Phase 1, because
T01 itself is just docs flips — there is no source-code work
to break out into separate task slots.

A **single-phase / single-run cadence** (Spec 016 pattern) was
considered but rejected for Spec 018 because:

- The scheduled-task agent runs hourly; landing both the
  scaffold and the closeout in one run risks breaking the
  established convention that AC-9 flips happen at named T01
  closeout runs (parallel to AC-7 / AC-8 patterns).
- Splitting into two runs gives a future agent a clean
  interleaving point if the scaffold lands but a hot upstream
  commit appears between runs — the run #77 T01 closeout can
  then pick up either the original `312c7b6` audit or fold in
  the new commit's diff into a follow-on D-02 entry.
- Spec 016's single-run cadence was justified by a literal
  one-byte source change. Spec 018's docs-only deltas across
  4 ledger surfaces + 3 spec files at scaffold + further
  ledger flips at T01 fit better as two runs of moderate
  edit size than one run of large-batch edits.

## 4. Dependencies

- `OTHERS/Ats-scrapers/workable/main.py` — upstream source
  under audit. Read-only. Pulled to commit `3bacd6e` HEAD;
  diff anchor at `312c7b6`.
- [`packages/plugins/source-ats-workable/`](../../../packages/plugins/source-ats-workable/) —
  the Ever Jobs plugin; **read-only** across this spec
  (FR-6 / NFR-3 — no `.ts` file modified).
- [`packages/models/src/interfaces/scraper.interface.ts`](../../../packages/models/src/interfaces/scraper.interface.ts) —
  `IScraper` contract quoted in § 7.2; read-only.
- [`packages/common/src/http/http-client.ts`](../../../packages/common/src/http/http-client.ts) —
  `createHttpClient` retry surface referenced in § 7.3 row 3;
  read-only.
- No new external deps. No `package.json` edit. No
  `package-lock.json` regeneration.

## 5. Risks

| Risk                                                                                                | Likelihood | Mitigation                                                                                                                                                              |
| --------------------------------------------------------------------------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upstream `OTHERS/Ats-scrapers/workable/main.py` lands a NEW commit between runs #76 and #77, invalidating the `312c7b6` anchor. | Very low — the upstream repo has been quiescent (54 consecutive zero-churn runs in `OTHERS/` per run #75 log; the most recent meaningful commit on this file is `312c7b6` from 2025-12-24). | If a new commit appears, run #77 either (a) records it as Decision D-02 alongside D-01, or (b) defers it to a Spec 019 candidate slot. The `312c7b6` anchor diff stays valid as the "absorbed-as-of run #77" baseline. |
| The architectural-mismatch verdict (D-01 / § 7.2) is contested in human review.                       | Low — the `IScraper` interface shape is byte-quoted from the live source; the layer mapping in § 7.2 reflects existing Spec 004 / Spec 005 boundaries. | If contested, a follow-on spec would need to reshape the plugin contract to absorb checkpoint behaviour — that's a larger architectural change, properly scoped as a fresh spec, not a Spec 018 amendment. |
| `npm run lint:docs` rejects the diff fence syntax in § 7.1.                                          | Low — prior specs (013, 014, 015, 016, 017) include code blocks heavily; the docs-lint rules are forgiving about `diff` fences. | If lint fails, fall back to plain triple-backtick fences without the `diff` language tag (renders the same in GitHub markdown). |
| The Coverage Matrix in § 7.3 over-claims `mirrored-elsewhere` for the retry policy when the actual `createHttpClient` defaults differ numerically from upstream. | Low — `createHttpClient` carries `maxRetries` / `retryDelay` / `retryBackoff` knobs that cover the upstream's retry semantics; the row text already calls out the numeric-profile difference explicitly. | If the numeric profile is judged a meaningful gap, T01 can append D-02 with a remediation plan (passing explicit retry options in `WorkableService`); that does NOT require source-code change in this spec, but opens a Spec 019 candidate. |

## 6. Acceptance gates

- **Phase 0 (run #76):** scaffold pass — three new files in
  `.specify/specs/018-workable-upstream-parity/`; four ledger
  surfaces updated (docs/index.md, docs/log.md,
  competitor-watch.md, CLAUDE.md); `npm run lint:docs` clean;
  no `.ts` file modified.
- **Phase 1 / T01 (run #77):** verdict closeout —
  `competitor-watch.md` § C row AC-9 flipped to `agent ✅`;
  Spec 018 spec.md Status flipped to `All phases done`; § 10
  Decisions appended with D-01; tasks.md T01 row flipped to
  `[x]`; sanity-sweep jest pass against the Workable plugin
  unchanged; `npm run lint:docs` clean.

## 7. Estimated lifecycle

2 phases / 1 task / 2 runs total. Actual day-equivalent:
~0.15 day total (0.10 scaffold + 0.05 closeout).

## 8. Out-of-scope reminders

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
  scaffold pass. The 312c7b6 diff is unambiguous; the verdict
  is well-supported by existing Spec 004 / Spec 005
  boundaries. If T01 implementation discovers ambiguity,
  open Q-041 then.
- Do NOT promote the `gap-acknowledged` § 7.3 row 5 (`ssl=False`)
  to a follow-on spec candidate. The divergence is a security
  upgrade in Ever Jobs's favour; absorbing the upstream
  behaviour would be a regression.
- Do NOT refresh the Workable section of
  [`docs/ATS_INTEGRATIONS.md`](../../../docs/ATS_INTEGRATIONS.md).
  The plugin behaviour described there is unchanged.
- **Lockfile sync:** Spec 018 / T01 adds zero deps; no
  `package-lock.json` regeneration this spec.
