# Tasks: 017 — Seed-Companies Slug Directory Refresh (Batch 1)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 0 — Scaffolding (run #70 — landed this run)

- [x] T00 — Author `spec.md` / `plan.md` / `tasks.md` under
  `.specify/specs/017-seed-companies-refresh-batch-1/`. Open
  Q-038 / Q-039 / Q-040 in `docs/questions.md` with defaults.
  Add a Spec 017 row to `docs/index.md` § 7 Specs table.
  Append run #70 closeout entry to `docs/log.md` (newest at
  top). Bump `CLAUDE.md` run-tag → #70. Append run #70 Sync
  Log entry to `competitor-watch.md` (49th consecutive
  zero-churn run). **Landed run #70.**
  - **Files (touched):**
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      NEW. ~280 LOC. 11 sections per `spec.template.md`.
      FR-1..FR-11 (must / should split); NFR-1..NFR-5; § 10
      Decisions log pre-populated with D-01..D-04.
    - `.specify/specs/017-seed-companies-refresh-batch-1/plan.md` —
      NEW. ~210 LOC. 6-phase shape (Phase 0 scaffolding +
      Phase 1..4 vendor refresh + Phase 5 closeout).
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      NEW. THIS file. T00 (scaffolding, landed) + T01..T05
      (pending). Notes-for-the-next-run pinned to T01
      (Greenhouse) for run #71.
    - `docs/questions.md` — Q-038 / Q-039 / Q-040 NEW.
    - `docs/index.md` — § 7 Specs table appended with Spec
      017 row; footer "Last revised" bumped.
    - `docs/log.md` — run #70 closeout entry prepended at
      top.
    - `CLAUDE.md` — run-tag bumped from #69 → #70.
    - `competitor-watch.md` — Sync Log entry for run #70
      prepended at top.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - `docs/index.md` § 7 has a Spec 017 row pointing at
      the three new spec files.
    - `docs/log.md` newest entry references run #70 with a
      unique `date#run-number` key.
    - `docs/questions.md` has three new entries Q-038 /
      Q-039 / Q-040 each with `**Default (proceeding):**`.
    - Spec 017 spec.md `Status` reads "draft (scaffolded
      run #70); Phase 0 only — Phase 1..5 pending".
    - No `.ts` file modified. No source-side test added.
  - **Estimate:** 0.20 day.

## Phase 1 — Greenhouse refresh (T01, run #71 — pending)

- [x] T01 — Append 25 deterministic-indexed Greenhouse slug
  rows to the Greenhouse table in
  [`docs/COMPANY_SLUG_DIRECTORY.md`](../../../docs/COMPANY_SLUG_DIRECTORY.md)
  (FR-1 / FR-9). Sample from
  `OTHERS/Ats-scrapers/greenhouse/greenhouse_companies.csv`
  per spec § 7.1 (deterministic-indexed sample after
  duplicate-and-numeric filter). Record the 25 selected
  slugs as Decision D-05 in `spec.md` § 10 (FR-11). Verify
  Greenhouse table row count = 28 + 25 = **53**.
  **Landed run #71.**
  - **Files (planned):**
    - `docs/COMPANY_SLUG_DIRECTORY.md` — +25 rows under
      Greenhouse section; existing 28 rows preserved
      byte-for-byte.
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      § 10 Decisions log appended with D-05 (the 25-slug
      selection list verbatim, slug + upstream `name`).
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      T01 row flipped from `[ ]` to `[x]`.
    - `docs/log.md` — run #71 closeout entry prepended.
    - `CLAUDE.md` — run-tag bumped → #71.
    - `competitor-watch.md` — Sync Log entry for run #71
      prepended.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - Greenhouse table row count = 53 (re-count via
      `grep -c '^|' docs/COMPANY_SLUG_DIRECTORY.md` in the
      Greenhouse section, minus the 2-line header rows).
    - Each new slug derives from § 7.2's Greenhouse rule
      (last path segment of the URL, lowercased; works for
      both `job-boards.greenhouse.io/<slug>` modern and
      `boards.greenhouse.io/<slug>` legacy forms).
    - Existing 28 Greenhouse rows byte-identical (FR-5).
    - Re-running the § 7.1 methodology against the same
      CSV produces the same 25 slugs (FR-6).
    - Test suite delta = 0 (NFR-2). Optional regression
      sweep: `npx jest --testPathPatterns
      'packages/common/__tests__/helpers'` reports 74 / 74
      pass (NFR-5).
  - **Estimate:** 0.15 day.

## Phase 2 — Lever refresh (T02, run #72 — landed this run)

- [x] T02 — Append 25 deterministic-indexed Lever slug rows
  to the Lever table (FR-2 / FR-9). Sample from
  `OTHERS/Ats-scrapers/lever/lever_companies.csv`. Record
  selection as Decision D-06. Verify row count = 5 + 25 =
  **30**. **Landed run #72.**
  - **Files (planned):** mirror Phase 1 with Lever as the
    vendor.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - Lever table row count = 30.
    - Each new slug derives from § 7.2's Lever rule (last
      path segment of `https://jobs.lever.co/<slug>`; case
      preserved per the existing Spec 014 / 015 / 016
      precedent of preserving upstream-canonical case in
      the directory).
    - Existing 5 Lever rows byte-identical (FR-5).
    - § 10 D-06 lists the 25 selected slugs verbatim.
  - **Estimate:** 0.15 day.

## Phase 3 — Workable refresh (T03, run #73 — pending)

- [x] T03 — Append 25 deterministic-indexed Workable slug
  rows to the Workable table (FR-3 / FR-9). Sample from
  `OTHERS/Ats-scrapers/workable/workable_companies.csv`.
  Record selection as Decision D-07. Verify row count = 2 +
  25 = **27**.
  **Landed run #73.**
  - **Files (planned):** mirror Phase 1 with Workable as the
    vendor.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - Workable table row count = 27.
    - Each new slug derives from § 7.2's Workable rule
      (last path segment of `https://apply.workable.com/<slug>`;
      lowercase; literal leading `-` preserved when the
      upstream URL carries it — e.g. ` Our Home` →
      `-our-home`). The leading dash is a real Workable
      subdomain, not a markup artefact.
    - Existing 2 Workable rows byte-identical (FR-5).
    - § 10 D-07 lists the 25 selected slugs verbatim **and**
      flags any leading-dash slugs encountered (with a
      one-line note that this is a real Workable subdomain
      shape).
  - **Estimate:** 0.15 day.

## Phase 4 — SmartRecruiters refresh (T04, run #74 — landed this run)

- [x] T04 — Append 25 deterministic-indexed SmartRecruiters
  slug rows to the SmartRecruiters table (FR-4 / FR-9).
  Sample from
  `OTHERS/Ats-scrapers/smartrecruiters/smartrecruiters_companies.csv`.
  Record selection as Decision D-08. Verify row count = 4 +
  25 = **29**. **Landed run #74.**
  - **Files (planned):** mirror Phase 1 with SmartRecruiters
    as the vendor.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - SmartRecruiters table row count = 29.
    - Each new slug derives from § 7.2's SmartRecruiters
      rule (last path segment of
      `https://jobs.smartrecruiters.com/<slug>`; case
      preserved — SmartRecruiters slugs are case-sensitive
      in upstream URLs, e.g. `Visa` / `BoschGroup`
      precedent in the existing 4 rows).
    - Existing 4 SmartRecruiters rows byte-identical
      (FR-5).
    - § 10 D-08 lists the 25 selected slugs verbatim **and**
      flags any case-preserved-mixed-case slugs.
  - **Estimate:** 0.15 day.

## Phase 5 — Closeout (T05, run #75 — landed this run)

- [x] T05 — Flip `AC-8` to `agent ✅` in `competitor-watch.md`
  §C (workspace-root file, outside the ever-jobs repo) with
  the four phase run-numbers. Refresh
  [`docs/SOURCE_ADOPTION_BACKLOG.md`](../../../docs/SOURCE_ADOPTION_BACKLOG.md)
  `(seed lists)` row to read "≥ 25 sampled per vendor
  (Greenhouse 53 / Lever 30 / Workable 27 / SmartRecruiters
  29 — refreshed Spec 017 runs #71..#74)" (FR-7 / FR-8). Flip
  Spec 017 spec.md Status to "All phases done".
  - **Files (planned):**
    - `competitor-watch.md` — §C `AC-8` row updated;
      Sync Log entry for run #75 prepended.
    - `docs/SOURCE_ADOPTION_BACKLOG.md` — `(seed lists)`
      row description refreshed.
    - `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
      Status flipped to "All phases done (T01..T05 runs
      #71..#75); spec complete".
    - `.specify/specs/017-seed-companies-refresh-batch-1/tasks.md` —
      T05 row flipped from `[ ]` to `[x]`.
    - `docs/index.md` — Spec 017 row Status updated.
    - `docs/log.md` — run #75 closeout entry prepended.
    - `CLAUDE.md` — run-tag bumped → #75.
  - **Acceptance:**
    - `npm run lint:docs` exit 0.
    - `competitor-watch.md` §C grep for `AC-8` returns the
      `agent ✅` marker with the run-number range.
    - SOURCE_ADOPTION_BACKLOG `(seed lists)` row reads "≥ 25
      sampled per vendor".
    - Spec 017 spec.md Status reads "All phases done
      (T01..T05 runs #71..#75); spec complete".
    - `docs/index.md` Spec 017 row Status matches the
      spec.md Status.
  - **Estimate:** 0.10 day.

## Notes for the next run (after T00 lands)

- **Default for run #76** = next backlog candidate. Spec 017
  is complete with run #75. The most natural next pickup is
  **AC-9** (Workable scraper logic diff against upstream
  commit `312c7b6` and absorb relevant behaviour into our
  plugin) — the only remaining unfinished `agent` item in
  `competitor-watch.md` §C. AC-9 is a code-touching task
  (`source-ats-workable` plugin), so a new spec authoring
  pass — `018-workable-upstream-parity` — is the right
  shape: scaffold spec.md / plan.md / tasks.md, open any
  required `Q-NNN` entries in `docs/questions.md`, append a
  Spec 018 row to `docs/index.md` § 7, and pin Phase 1
  (vendor-diff sweep against the upstream Python source) as
  the run #77 default. Alternative: a smaller "Batch 2 of
  the seed-companies refresh" spec for the under-seeded
  vendors not in this scope (Workday / iCIMS / Taleo /
  SuccessFactors / BambooHR / Recruitee / Manatal /
  Phenom) — out of Spec 017's scope per the closing
  reminder. Choose at run #76 pickup based on upstream
  signal at that point.

- **Default for run #75 (DONE — landed run #75)** = Spec 017 /
  Phase 5 / T05 — closeout. Flipped `AC-8` to `agent ✅` in
  `competitor-watch.md` §C with the four phase run-numbers
  `#71/#72/#73/#74`. Refreshed
  `docs/SOURCE_ADOPTION_BACKLOG.md` `(seed lists)` row from
  `proposed` to `shipped` with the four post-refresh row
  counts (Greenhouse 53 / Lever 30 / Workable 27 /
  SmartRecruiters 29 — refreshed Spec 017 runs #71..#74)
  (FR-7 / FR-8). Flipped Spec 017 spec.md Status to "All
  phases done (T01..T05 runs #71..#75); spec complete".
  Updated `docs/index.md` Spec 017 row Status to match.
  Q-038 / Q-039 / Q-040 (opened run #70) flipped from
  `_pending review_` to `**resolved** in Spec 017 (runs
  #70..#75)`. Spec 017 is **complete** — first refresh of
  the four high-volume Western-tier ATS slug tables since
  the Spec 001 / 003 era. Total directory delta: +100 rows
  (~+10.4 KB), well under NFR-4 ceiling of +12 KB. Test
  suite delta = 0 (NFR-2 — Spec 017 was docs-only
  end-to-end).

- **Default for run #74 (DONE — landed run #74)** = Spec 017 /
  Phase 4 / T04 — appended 25 deterministic-indexed
  SmartRecruiters slug rows. § 7.1 methodology produced
  L = 810 / step = 32; selection recorded verbatim as D-08
  in spec.md § 10. Two rows dropped from the 812 raw corpus:
  2 case-insensitive duplicates (`Visa`, `Equinox`) of the
  existing 4 SmartRecruiters rows; 0 pure-numeric names; 0
  empty-name cases. All 25 selected slugs landed lowercase
  (the upstream URL column is lowercased uniformly at the
  sampled indices, even though the `name` column carries
  PascalCase values like `10Minuteschool`). The Watch-out
  note for run #74 anticipated mixed-case URL slugs in the
  slice (existing rows are PascalCase, and `1Huddle` exists
  in the CSV); none were represented at the deterministic
  indices `[0, 32, 64, …, 768]`. Multi-word company names
  (`Renaud Bray`) carried hyphenated slugs (`renaud-bray`)
  per the upstream URL. Two trailing-digit tenant slugs
  (`elizabethglaserpediatricaidsfoundation3`,
  `ingramcontentgroup1`) passed the D-02 pure-numeric filter
  because their `name` fields carry an alphabetic prefix.
  SmartRecruiters table row count 29 = 4 preserved + 25
  appended.

- **Default for run #73 (DONE — landed run #73)** = Spec 017 /
  Phase 3 / T03 — appended 25 deterministic-indexed Workable
  slug rows. § 7.1 methodology produced L = 4 026 / step =
  161; selection recorded verbatim as D-07 in spec.md § 10.
  **One leading-dash slug surfaced** (`Our Home` →
  `-our-home`) at index 0 — exactly the Workable subdomain
  shape § 7.2 / D-07 anticipated; preserved literally in the
  Slug column. Workable table row count 27 = 2 preserved + 25
  appended.

- **Default for run #72 (DONE — landed run #72)** = Spec 017 /
  Phase 2 / T02 — appended 25 deterministic-indexed Lever
  slug rows. § 7.1 methodology produced L = 1 910 / step = 76;
  selection recorded verbatim as D-06 in spec.md § 10. Two
  rows dropped from the 1 912 raw corpus: 1 pure-numeric
  (`500`) per D-02, 1 case-insensitive duplicate (`Palantir`).
  All 25 selected slugs landed lowercase (no mixed-case
  PascalCase variants in the slice). Multi-word company
  names (`Asapp 2`, `Glass Health Inc`) carried hyphenated
  slugs (`asapp-2`, `glass-health-inc`) per the upstream URL.
  Lever table row count 30 = 5 preserved + 25 appended.

- **Default for run #71 (DONE — landed run #71)** = Spec 017 /
  Phase 1 / T01 — appended 25 deterministic-indexed
  Greenhouse slug rows. § 7.1 methodology produced
  L = 2 793 / step = 111; selection recorded verbatim as D-05
  in spec.md § 10. All 25 selected rows landed under the
  modern `job-boards.greenhouse.io/<slug>` URL shape (no
  legacy `boards.greenhouse.io/<slug>` rows in this slice;
  both extraction rules collapse to the same lowercase
  last-path-segment regardless). Greenhouse table row count
  53 = 28 preserved + 25 appended (verified via
  `awk '/^## Greenhouse$/,/^## Workday$/' docs/COMPANY_SLUG_DIRECTORY.md
  | grep -c '^|'` = 55 with 2 header rows).

- **Watch-out for run #71 (Greenhouse-specific):** the upstream
  CSV has BOTH modern (`job-boards.greenhouse.io/<slug>`) and
  legacy (`boards.greenhouse.io/<slug>`) URL shapes. The slug
  is the last path segment in either case (§ 7.2). Some rows
  include a `?gh_jid=…` query suffix — strip it before slug
  extraction. The deterministic-indexed sample naturally covers
  both URL forms (the corpus is alphabetical by name, not by
  URL pattern).

- **Watch-out for run #73 (Workable-specific):** ~2 % of the
  Workable CSV's `name` field starts with a single space (e.g.
  ` Our Home`) — the corresponding URL has a literal leading
  `-` in the slug (`<https://apply.workable.com/-our-home>`).
  Trim the `name` for the directory's `Company` column;
  preserve the leading `-` in the `Slug` column (it's a real
  Workable subdomain shape).

- **Watch-out for run #74 (SmartRecruiters-specific):** slug
  case is preserved from the upstream URL (existing rows
  `Visa`, `BoschGroup`, `Equinox`, `Skechers` all carry mixed
  or PascalCase). The deterministic-indexed sample may pick
  rows with all-lowercase URLs (e.g. `10minuteschool`) AND
  mixed-case URLs (e.g. `1Huddle`). Both are valid; preserve
  upstream case verbatim in the directory.

- **Watch-out for run #75 (closeout):** double-check that the
  `competitor-watch.md` `AC-8` flip preserves the existing
  table column alignment; the markdown table uses pipe-and-dash
  formatting that's strict about column widths. The
  SOURCE_ADOPTION_BACKLOG row is the third row in the
  "Logic-improvement candidates" table — line up the `(seed
  lists)` cell width with the existing column.

## Out-of-scope reminders (do NOT do these in Spec 017)

- Do NOT touch any `.ts` source file. Spec 017 is docs-only.
- Do NOT delete or edit the existing 39 rows in the four
  vendor sections (FR-5 + AGENTS.md §2 rule 9).
- Do NOT extend the refresh to vendors outside the four named
  in § 1 (Workday / iCIMS / Taleo / SuccessFactors / BambooHR /
  Recruitee / Manatal / Phenom). A future
  `seed-companies-refresh-batch-2` spec is the right place
  for those.
- Do NOT attempt live HTTP verification of sampled slugs.
- Do NOT regenerate `tool_manifest.json`. The manifest
  references `COMPANY_SLUG_DIRECTORY.md` by path only.
- Do NOT run the bench suite. The bench has zero coupling to
  this spec.
- Do NOT touch `package-lock.json`. Spec 017 adds zero deps.
- Do NOT split a single phase into multiple commits. Each
  phase = one commit.
- Do NOT inline more than 25 rows per vendor. The 25-row
  ceiling is a deliberate fast-path-vs-bloat trade-off
  (NFR-4: ≤ +12 KB total directory delta).
- Do NOT infer `Industry` for the new rows (D-03). Use the
  em-dash placeholder uniformly.
- Do NOT bypass the sampling methodology to "cherry-pick"
  recognisable brand names. Determinism (FR-6) outranks
  visible-brand-density.
