# Plan 017 — Seed-Companies Slug Directory Refresh (Batch 1)

| Field        | Value                                              |
| ------------ | -------------------------------------------------- |
| Spec         | [`spec.md`](./spec.md)                             |
| Created      | 2026-04-28 (run #70)                               |
| Last updated | 2026-04-28 (run #70)                               |

## 1. Approach

Spec 017 closes `AC-8` from `competitor-watch.md` §C (the
file lives at the workspace root outside the ever-jobs repo) —
the long-pending "refresh the four high-volume Western-tier
ATS slug-directory sections from upstream CSV corpora" item.

The work is **purely documentation** (`docs/COMPANY_SLUG_DIRECTORY.md`
+ `docs/SOURCE_ADOPTION_BACKLOG.md` row + `competitor-watch.md`
AC-8 flip). No `.ts` source code is touched. No tests are
added or removed. The bench p95 baseline from Spec 016
(0.0174 ms) stays untouched.

The lifecycle splits into **6 runs**:

- Phase 0 (run #70): scaffolding pass — spec.md / plan.md /
  tasks.md authored; questions Q-038 / Q-039 / Q-040 opened
  with defaults; index / log / run-tag bumped; **no
  row-append**.
- Phase 1 (run #71): T01 — append 25 deterministic-indexed
  Greenhouse rows.
- Phase 2 (run #72): T02 — append 25 Lever rows.
- Phase 3 (run #73): T03 — append 25 Workable rows.
- Phase 4 (run #74): T04 — append 25 SmartRecruiters rows.
- Phase 5 (run #75): T05 — closeout (SOURCE_ADOPTION_BACKLOG
  row update + AC-8 flip in competitor-watch.md).

This matches the Spec 014 (5 runs) / Spec 013 (15 runs over
multiple plugins) cadence precedent of "one substantial
deliverable per scheduled run".

## 2. Phases

### Phase 0 — Scaffolding (run #70 — THIS RUN)

- **Goal:** land the spec/plan/tasks scheme and the
  scaffolding-pass paperwork without touching any data-bearing
  rows. Defer T01..T05 to subsequent runs.
- **Deliverables:**
  - **Specs (3 files, NEW):**
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      11 sections per `spec.template.md`; FR-1..FR-11 (must /
      should split); NFR-1..NFR-5; § 10 Decisions log
      pre-populated with D-01..D-04 (multi-phase shape /
      pure-numeric filter / em-dash Industry placeholder /
      Phase 0 = scaffolding-only); § 7 Contracts
      enumerates per-vendor URL → slug derivation.
    - `.specify/specs/017-seed-companies-refresh-batch-1/plan.md` —
      THIS file. 6-phase shape; per-phase deliverables and
      acceptance gates; risk matrix; out-of-scope reminders.
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      T01..T05 with per-task acceptance criteria; "Notes for
      the next run" pinned to T01 (Greenhouse) for run #71.
  - **Docs (3 files, EDITS):**
    - `docs/questions.md` — Q-038 / Q-039 / Q-040 opened with
      defaults marked `(default — proceeding)`. ~120 LOC
      added (3 questions × ~40 LOC each).
    - `docs/index.md` — § 7 Specs table grows by one row for
      Spec 017; footer "Last revised" bumped to run #70.
    - `docs/log.md` — run #70 closeout entry appended at the
      top (newest-first per the lint:docs ordering check).
  - **Top-level (1 file, EDIT):**
    - `CLAUDE.md` — run-tag bumped from #69 → #70.
  - **Cross-repo log (1 file, EDIT):**
    - `competitor-watch.md` — Sync Log entry for run #70
      appended at the top (49th consecutive zero-churn run
      across the three watched corpora).
- **Acceptance:**
  - `npm run lint:docs` exits 0 (NFR-1).
  - The three new spec files (`spec.md` / `plan.md` /
    `tasks.md`) pass lint:docs's frontmatter check (H1 +
    metadata table for spec.md / plan.md; tasks.md exempt
    per the existing rule).
  - `docs/index.md` § 7 contains a new row for Spec 017
    pointing at the three new files.
  - `docs/log.md` newest entry is dated `2026-04-28` and
    references **run #70** with a unique
    `date#run-number` key.
  - `docs/questions.md` contains three new entries Q-038 /
    Q-039 / Q-040 each with a `**Default (proceeding):**`
    line.
  - `CLAUDE.md` footer reads `_Last revised: 2026-04-28
    (scheduled run #70)_`.
  - `git status` reports the eight expected file changes
    (3 NEW under `.specify/`, 3 EDITS under `docs/`, 1 EDIT
    in `CLAUDE.md`, 1 EDIT in `competitor-watch.md`); no
    other files modified.
- **Estimate:** 0.20 day (this run).

### Phase 1 — Greenhouse refresh (T01, run #71)

- **Goal:** append 25 deterministic-indexed Greenhouse slug
  rows under the Greenhouse section of
  `docs/COMPANY_SLUG_DIRECTORY.md`.
- **Deliverables:**
  - **Source surface — UNCHANGED.** No `.ts` file touched.
  - **Docs (4 files, EDITS):**
    - `docs/COMPANY_SLUG_DIRECTORY.md` — 25 new rows
      appended under the Greenhouse table; existing 28 rows
      preserved byte-for-byte.
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      § 10 Decisions log appended with D-05 (the 25-slug
      selection list, recorded for FR-11 audit).
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      T01 row flipped from `[ ]` to `[x]`.
    - `docs/log.md` — run #71 closeout entry appended.
  - **Top-level (1 file, EDIT):**
    - `CLAUDE.md` — run-tag bumped → #71.
  - **Cross-repo log (1 file, EDIT):**
    - `competitor-watch.md` — Sync Log entry for run #71
      appended.
- **Acceptance:**
  - `npm run lint:docs` exits 0.
  - Greenhouse table row count = 28 (existing) + 25 (new) =
    **53**.
  - The 25 new rows match the spec § 7.1 sampling rule
    deterministically (re-running the methodology against
    the same CSV produces the same 25 slugs).
  - `git diff` for `docs/COMPANY_SLUG_DIRECTORY.md` shows
    +25 inserted rows and 0 modified rows in the
    Greenhouse section (FR-5).
- **Estimate:** 0.15 day.

### Phase 2 — Lever refresh (T02, run #72)

- **Goal:** append 25 deterministic-indexed Lever slug rows
  under the Lever section.
- **Deliverables:** (mirrors Phase 1 with Lever as the
  vendor)
- **Acceptance:**
  - Lever table row count = 5 + 25 = **30**.
  - Spec § 10 D-06 records the 25 selected slugs.
- **Estimate:** 0.15 day.

### Phase 3 — Workable refresh (T03, run #73)

- **Goal:** append 25 deterministic-indexed Workable slug
  rows under the Workable section.
- **Deliverables:** (mirrors Phase 1 with Workable as the
  vendor)
- **Acceptance:**
  - Workable table row count = 2 + 25 = **27**.
  - Spec § 10 D-07 records the 25 selected slugs **and**
    notes any leading-dash slugs encountered (per spec
    § 7.2's Workable-specific note about the literal
    leading `-` in some subdomains, e.g. ` Our Home` →
    `-our-home`).
- **Estimate:** 0.15 day.

### Phase 4 — SmartRecruiters refresh (T04, run #74)

- **Goal:** append 25 deterministic-indexed SmartRecruiters
  slug rows under the SmartRecruiters section.
- **Deliverables:** (mirrors Phase 1 with SmartRecruiters as
  the vendor)
- **Acceptance:**
  - SmartRecruiters table row count = 4 + 25 = **29**.
  - Spec § 10 D-08 records the 25 selected slugs **and**
    notes any case-preserved slugs encountered (the existing
    rows like `Visa`, `BoschGroup` confirm SmartRecruiters
    slugs are case-sensitive in the upstream URL).
- **Estimate:** 0.15 day.

### Phase 5 — Closeout (T05, run #75)

- **Goal:** flip `AC-8` to done in `competitor-watch.md` §C
  and refresh `docs/SOURCE_ADOPTION_BACKLOG.md`'s `(seed
  lists)` row.
- **Deliverables:**
  - **Docs (3 files, EDITS):**
    - `competitor-watch.md` § C — `AC-8` row flipped from
      `agent` to `agent ✅` with the four phase run-numbers
      (e.g. "DONE (runs #71..#74)").
    - `docs/SOURCE_ADOPTION_BACKLOG.md` — `(seed lists)`
      row description updated to read "≥ 25 sampled per
      vendor (Greenhouse 53 / Lever 30 / Workable 27 /
      SmartRecruiters 29 — refreshed Spec 017 runs
      #71..#74)".
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      Status field flipped from "draft (scaffolded run
      #70); Phase 0 only — Phase 1..5 pending" to "All
      phases done (T01..T05 runs #71..#75); spec
      complete".
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      T05 row flipped from `[ ]` to `[x]`.
    - `docs/log.md` — run #75 closeout entry appended.
  - **Top-level (1 file, EDIT):**
    - `CLAUDE.md` — run-tag bumped → #75.
  - **Cross-repo log (1 file, EDIT):**
    - `competitor-watch.md` — Sync Log entry for run #75
      appended (already covered by the §C flip but the
      Sync Log line is appended separately for cadence
      consistency).
- **Acceptance:**
  - `npm run lint:docs` exits 0.
  - `competitor-watch.md` §C grep for `AC-8` returns a row
    with the `agent ✅` marker.
  - Spec 017 spec.md Status reads "All phases done
    (T01..T05 runs #71..#75); spec complete".
- **Estimate:** 0.10 day.

## 3. Phasing rationale

Six runs total. The breakdown:

- One scaffolding run (Phase 0) — keeps the Spec Kit pattern
  consistent with Spec 013 / 014 / 015 / 016 precedents.
- Four vendor runs (Phase 1..4) — one per ATS vendor. The
  per-vendor split protects each commit from compound failure
  modes (a Workable-specific slug-derivation bug doesn't
  contaminate the Greenhouse diff).
- One closeout run (Phase 5) — pure-paperwork pass to flip
  AC-8 and refresh the backlog row.

The alternative (one combined task that lands all 100 rows
+ the closeout in a single run) was rejected at D-01 — see
`spec.md` § 10.

## 4. Dependencies

- `OTHERS/Ats-scrapers/{greenhouse,lever,workable,smartrecruiters}/<vendor>_companies.csv`
  — read-only sources; no commits to those upstream
  repos. The CSVs are pulled via the standard run-#N
  competitor-watch sync at the top of each scheduled
  run.
- `docs/COMPANY_SLUG_DIRECTORY.md` — the only file with
  data-bearing edits.
- `docs/SOURCE_ADOPTION_BACKLOG.md` — single-row edit at T05.
- `competitor-watch.md` — Sync Log entries per run + §C `AC-8`
  flip at T05.
- No `package.json` edits. No `tsconfig.base.json` edits. No
  `jest.config.js` edits. No new dependencies.

## 5. Risks

| Risk                                                                                                         | Likelihood | Mitigation                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| The deterministic-indexed sample produces a slug that's already in the existing 39 preserved rows (FR-5 violation by duplication). | Low | The methodology (§ 7.1 step 2) drops case-insensitive duplicates against the existing section before sampling. The spec § 10 / D-02 rule covers numeric IDs. If a residual duplicate slips through, T01..T04's `lint:docs` ledger plus the visual-grep test plan rows (#6..#9) flag it pre-commit.                                          |
| The upstream CSV's row count changes mid-Spec-017 (e.g. Greenhouse adds 50 new companies between Phase 1 and Phase 5). | Very low | The competitor-watch sync has had 49 consecutive zero-churn runs (per the run #70 entry). If churn arrives, the Phase that's mid-flight uses the CSV state at its commit time; the spec doesn't require all four phases to sample from the same CSV snapshot.                                                                              |
| A Workable slug with a literal leading `-` (e.g. `-our-home`) trips a markdown renderer that interprets `-` at row start as a list marker. | Very low | The slug is wrapped in backticks (`<code>-our-home</code>`) in § 7.2's row shape — markdown renderers respect code spans. The lint:docs check is link-resolution, not markdown semantic parsing, so renderer-specific rendering quirks are out of scope for the gate. |
| `lint:docs` rejects the new questions.md entries because of a missing section header pattern.               | Very low | The existing questions.md format (Q-001..Q-037) is well-established; new entries follow the same template (`## Q-NNN — <title>` + Context + Options + Default + Resolution scaffold).                                                                                                                                                       |
| A future spec needs to absorb the Workable scraper's recent upstream behaviour change (AC-9). The backlog row update at T05 must not collide with AC-9's own future closeout. | Low | T05 only edits the `AC-8` row. AC-9 keeps its own row untouched. The two are independent.                                                                                                                                                                                                                                                       |
| The 25-row sample includes a row whose `name` field has unusual characters (UTF-8 quotes, em-dashes, accented characters) that the markdown table renders awkwardly. | Low | The four CSVs' `name` field is plain ASCII for ~99 % of rows on inspection (per `head -3` at run #70). If a non-ASCII name appears in the sample, it lands as-is — markdown handles UTF-8 fine; no escaping is needed for table cells.                                                                                                          |

## 6. Acceptance gates

- **Phase 0 (run #70):** `npm run lint:docs` clean; the three
  new spec files exist and parse; index / log / run-tag /
  questions / competitor-watch updated. No row-append yet.
- **Phase 1..4 (runs #71..#74):** `npm run lint:docs` clean
  per phase; per-vendor row count matches the FR (28+25=53,
  5+25=30, 2+25=27, 4+25=29); existing rows byte-identical;
  spec.md § 10 records the 25-slug selection.
- **Phase 5 (run #75):** AC-8 flipped to `agent ✅` in
  `competitor-watch.md` §C; SOURCE_ADOPTION_BACKLOG row
  refreshed; spec.md Status flipped to "All phases done".

## 7. Estimated lifecycle

- 6 phases / 5 tasks (Phase 0 = scaffolding, no T-number)
- 6 scheduled runs (#70..#75)
- Total day-equivalent: ~0.90 day (Phase 0 = 0.20 +
  Phase 1..4 = 0.60 + Phase 5 = 0.10 = 0.90)

## 8. Out-of-scope reminders

- Do NOT touch any `.ts` source file. Spec 017 is docs-only.
- Do NOT delete or edit the existing 39 rows in the four
  vendor sections. AGENTS.md §2 rule 9 forbids deletion;
  spec § 5 / FR-5 forbids edits.
- Do NOT extend Spec 017 to other vendors (Workday / iCIMS /
  Taleo / SuccessFactors / BambooHR / Recruitee / Manatal /
  Phenom). A `seed-companies-refresh-batch-2` follow-up
  spec is the right place for those.
- Do NOT attempt live HTTP verification of the sampled
  slugs. The scheduled-task agent has no `node_modules`
  installed and the run is non-interactive — live scraping
  is out of scope.
- Do NOT regenerate `tool_manifest.json`. The manifest
  references `COMPANY_SLUG_DIRECTORY.md` by path only; its
  content is unaffected.
- Do NOT run any of the bench scripts (`bench:avature`,
  `bench:gem`, etc.) as part of Spec 017. The bench suite
  has zero coupling to the docs surface.
- Do NOT touch `package-lock.json`. Spec 017 adds zero deps;
  no lockfile regeneration this spec.
- Do NOT split a single phase into multiple commits. Each
  phase = one commit (T01..T04) plus the closeout commit
  (T05) — keeps `git log -- docs/COMPANY_SLUG_DIRECTORY.md`
  per-vendor scannable.
