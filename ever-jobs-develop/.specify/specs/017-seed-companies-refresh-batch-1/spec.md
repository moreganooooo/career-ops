# Spec 017 — Seed-Companies Slug Directory Refresh (Batch 1 — Greenhouse / Lever / Workable / SmartRecruiters)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 017                                                                         |
| Slug           | seed-companies-refresh-batch-1                                              |
| Status         | All phases done (T01..T05 runs #71..#75); spec complete                     |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-28 (run #70)                                                        |
| Last updated   | 2026-04-28 (run #75)                                                        |
| Supersedes     | (none — first refresh of the four big-volume vendor slug tables in `docs/COMPANY_SLUG_DIRECTORY.md`) |
| Related specs  | 006 (ATS Batch 1 — Avature / Gem / Join.com slug seeding precedent), 013 (ATS Batch 2 — Oracle / Mercor / Tesla slug seeding precedent), 016 (immediately-prior single-byte warm-up; Spec 016 closeout's "Notes for the next run" pinned **AC-8** as the run #70 default) |

## 1. Problem Statement

`docs/COMPANY_SLUG_DIRECTORY.md` is the user-facing index of
verified company slugs grouped by ATS vendor. The four
**high-volume Western-tier ATS sections** (Greenhouse, Lever,
Workable, SmartRecruiters) carry only a tiny fraction of the
slugs available from public seed corpora:

| Vendor          | Current row count in directory | Upstream CSV row count (`OTHERS/Ats-scrapers/<vendor>/<vendor>_companies.csv`) | Coverage ratio |
| --------------- | ------------------------------ | ------------------------------------------------------------------------------ | -------------- |
| Greenhouse      | 28                             | 2 805 (CSV minus header)                                                       | ~1.0 %         |
| Lever           |  5                             | 1 912                                                                          | ~0.3 %         |
| Workable        |  2                             | 4 028                                                                          | ~0.05 %        |
| SmartRecruiters |  4                             |   812                                                                          | ~0.5 %         |

The Spec 006 (Batch 1) and Spec 013 (Batch 2) precedents
established a pattern of seeding ~15 verified slugs per
new ATS plugin from the upstream CSV — that delivered for
**niche / European / single-vendor** plugins (Avature,
Gem, Join.com, Oracle HCM Cloud, Mercor, Tesla). The four
**Western-tier mainline ATS** sections were left under-seeded
because their plugins shipped before the Spec 006 / Spec 013
slug-seeding convention crystallised (Greenhouse landed in
Spec 001 / 003 era; Lever / Workable / SmartRecruiters in the
same window).

The under-seeding has two operational costs:

- **Discovery cost:** users following the "Tips for Finding
  Company Slugs" section have to externally locate slugs that
  the upstream CSV already lists. The directory is meant to
  be a fast-path lookup; today it pushes 99 %+ of the
  Greenhouse / Lever / Workable / SmartRecruiters surface
  off-document.
- **Tool-manifest staleness:** `tool_manifest.json` references
  `docs/COMPANY_SLUG_DIRECTORY.md` as a machine-readable hint
  for AI agents; the under-seeded sections produce
  misleadingly-thin coverage signals.

The fix is **not** to embed all ~9 500 slugs into the markdown
table — that would bloat the file 25× without improving
fast-path lookup ergonomics. Instead, **bring each section to
parity with the Spec 006 / Spec 013 convention** (~25 sampled
slugs per vendor) by appending fresh entries from the
upstream CSV, **preserving every existing entry byte-for-byte**
(per the AGENTS.md "no deletion" rule).

This spec is `AC-8` from the `competitor-watch.md` backlog
table (run #69 default-pinned for run #70 in
`.specify/specs/016-bench-file-ts1127-fix/tasks.md` § "Notes
for the next run"). The `competitor-watch.md` file lives at
the workspace root **outside the repo** (in
`C:\Coding\Ever Gauzy AI\` on the scheduled-task host); it
is intentionally not part of the ever-jobs repo and is not
linked here so CI link-resolution stays clean.

## 2. Goals

1. Sample **25 fresh slugs per vendor** from the four Batch 1
   CSV corpora, append them under each vendor's section in
   `docs/COMPANY_SLUG_DIRECTORY.md` (FR-1..FR-4).
2. Preserve every existing slug row byte-for-byte — no
   removals, no edits to the existing 28 + 5 + 2 + 4 = 39
   rows in those four sections (FR-5).
3. Adopt a **deterministic, reproducible** sampling
   methodology so future spec authors can audit the choice of
   25 (FR-6).
4. Refresh the
   [`docs/SOURCE_ADOPTION_BACKLOG.md`](../../../docs/SOURCE_ADOPTION_BACKLOG.md)
   "Logic-improvement candidates" row that names the four
   vendors so its description tracks the new directory state
   (FR-7).
5. Close `AC-8` in `competitor-watch.md` §C (FR-8). The
   file lives outside the repo at the workspace root.

## 3. Non-Goals

- **No source-code edits.** This is a docs-only refresh.
  `extractSalary()`, the dispatcher, the four vendor plugins
  (`source-ats-greenhouse`, `source-ats-lever`,
  `source-ats-workable`, `source-ats-smartrecruiters`) — all
  byte-identical to the post-Spec-016 surface.
- **No new ATS plugin scaffolds.** AC-9 (Workable diff —
  upstream behaviour absorption into the existing plugin) is
  a separate spec candidate (Spec 018 slot).
- **No extension to Workday / iCIMS / Taleo / SuccessFactors /
  BambooHR / Recruitee / Manatal / Phenom / Avature / Gem /
  Join.com / Oracle / Mercor / Tesla sections.** This spec is
  scoped to the Batch 1 four explicitly. Other vendors are
  either already at convention parity (Avature / Gem /
  Join.com / Oracle / Mercor / Tesla shipped in Spec 006 or
  Spec 013) or a future-spec candidate (a "Batch 2"
  `seed-companies-refresh-batch-2` follow-up could pick up
  Workday, iCIMS, etc.).
- **No live HTTP verification of sampled slugs.** The
  scheduled-task agent has no `node_modules` and no network
  budget to actually scrape each candidate. The upstream CSVs
  are treated as the verified-active corpus (the
  competitor-watch project's own discovery scripts confirm
  the rows; we trust their staleness window).
- **No removal of the existing 39 rows.** Per AGENTS.md
  rule 9 ("No deletion"), fresh entries are **appended**.
- **No CSV embedding.** We sample 25 rows; the full 9 500
  are out of scope for the markdown table (they remain in
  the upstream CSVs).
- **No `Industry` column inference for the new entries** when
  the upstream CSV doesn't carry that column. The four CSVs'
  schema is `name,url` (verified at run #70 via header
  inspection); the `Industry` column for new rows uses the
  literal placeholder `—` (em-dash). A future spec can
  enrich this from a structured source (Crunchbase /
  LinkedIn dataset / etc.) — that is **out of scope** here.
- **No tool_manifest.json regeneration.** `tool_manifest.json`
  references `COMPANY_SLUG_DIRECTORY.md` as a path, not a
  copy of its body; the manifest stays untouched.
- **No fixture / test-side change.** Existing
  `packages/plugins/source-ats-{greenhouse,lever,workable,smartrecruiters}/__tests__/`
  fixtures stay byte-identical.

## 4. User / Caller Stories

> As a **plugin operator**, when I want to scrape Greenhouse
> jobs for a company outside the existing 28-row sample, I
> want the directory to point me at a verified slug fast,
> without me having to fetch the upstream CSV externally.

> As an **AI agent** consuming `tool_manifest.json`, when I
> need to suggest slugs to my own caller, I want a 25-row
> minimum per ATS vendor section so my recommendations span
> the corpus instead of bunching into the same handful of
> companies.

> As a **future spec author** working on AC-9 (Workable
> behavioural diff) or a Batch 2 refresh of the remaining
> sections, I want the Spec 017 sampling methodology
> documented so I can apply the same convention without
> re-debating it.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                                         | Priority |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Append **25 fresh slug rows** under the **Greenhouse** section in `docs/COMPANY_SLUG_DIRECTORY.md`, sourced from `OTHERS/Ats-scrapers/greenhouse/greenhouse_companies.csv`. | must     |
| FR-2  | Append **25 fresh slug rows** under the **Lever** section, sourced from `OTHERS/Ats-scrapers/lever/lever_companies.csv`.                              | must     |
| FR-3  | Append **25 fresh slug rows** under the **Workable** section, sourced from `OTHERS/Ats-scrapers/workable/workable_companies.csv`.                     | must     |
| FR-4  | Append **25 fresh slug rows** under the **SmartRecruiters** section, sourced from `OTHERS/Ats-scrapers/smartrecruiters/smartrecruiters_companies.csv`. | must     |
| FR-5  | Preserve every existing slug row in the four sections byte-for-byte — no edits to the 28 + 5 + 2 + 4 = 39 existing rows.                              | must     |
| FR-6  | The sampling methodology is **deterministic + reproducible** — a future spec author can re-run it and produce the same 25 slugs per vendor (modulo upstream CSV churn). | must     |
| FR-7  | `docs/SOURCE_ADOPTION_BACKLOG.md` "Logic-improvement candidates" `(seed lists)` row is updated to reflect the new "≥ 25 sampled" state across all four vendors. | must     |
| FR-8  | `AC-8` in `competitor-watch.md` § C is flipped from `agent` to `agent ✅` with the run-numbers for each phase.                                         | must     |
| FR-9  | Each new row uses the four-column shape `\| Company \| Slug \| Industry \|` (matching the existing rows). The `Company` column is the upstream CSV `name`; the `Slug` column is derived from the `url` (per § 7.2 below); the `Industry` column is `—` (em-dash placeholder, since the CSVs don't carry that column). | must     |
| FR-10 | Each phase (T01 / T02 / T03 / T04) lands its own commit so the CI pipeline can validate per-vendor correctness incrementally.                          | should   |
| FR-11 | The run-log entry in `docs/log.md` for each task records the **exact 25 slugs** sampled (or links to a deterministic hash of the row IDs) so the choice is auditable. | should   |

## 6. Non-Functional Requirements

| ID    | Requirement                                                                                                                                                          | Target                                |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| NFR-1 | `npm run lint:docs` stays clean after each phase commit — no broken links, no missing index entries, no out-of-order log entries.                                     | exit 0                                |
| NFR-2 | Test suite delta = 0 (this is a docs-only spec — no helpers.spec / source-plugin spec / e2e spec touched).                                                            | +0 tests                              |
| NFR-3 | Spec 017 lifecycle fits **6 runs** (Phase 0 scaffolding + 4 vendor phases + closeout) — comparable to Spec 014's 5-run cadence and shorter than Spec 013's 15-run multi-plugin cadence. | ≤ 6 runs                              |
| NFR-4 | `docs/COMPANY_SLUG_DIRECTORY.md` byte size delta after all phases land: ≤ +12 KB (4 vendors × 25 rows × ~120 bytes/row). The current file is ~22 KB; post-Spec-017 ceiling is ~34 KB — well under any markdown-renderer or diff-viewer pagination boundary. | ≤ +12 KB                              |
| NFR-5 | The bench p95 baseline from Spec 016 (0.0174 ms) stays **untouched** across this spec — no source-code edit means no regression-sweep is needed. The reference is recorded here to confirm zero-coupling between Spec 017 and the dispatcher hot path. | unchanged                             |

## 7. Contracts

### 7.1 Sampling methodology (FR-6)

The 25-slug sample per vendor is selected via a **deterministic
indexed sample**:

1. Open the upstream CSV (`<vendor>_companies.csv`); skip the
   header row; collect `name,url` pairs into an in-memory list,
   in CSV order.
2. Drop any row whose `name` already appears (case-insensitively
   normalised; trim leading/trailing whitespace) in the existing
   directory section — this guarantees FR-5 (no duplicates with
   the 39 preserved rows).
3. Drop any row whose `name` is empty / whitespace-only / a
   pure-numeric string (e.g. Greenhouse CSV row 1 `103644278` —
   a tenant ID, not a company brand). Pure-numeric names are
   typically test tenants or auto-provisioned IDs and have no
   discovery value.
4. Take indices `[0, ⌊L/25⌋, 2·⌊L/25⌋, …, 24·⌊L/25⌋]` where
   `L` is the post-filter list length — this gives **25 rows
   evenly spaced across the alphabetical CSV ordering**, which
   is more representative than the alphabetical-first-25 (all
   numeric / `1`-prefixed companies).
5. The chosen 25 rows are recorded verbatim in the run-log
   entry (FR-11) so the selection is auditable.

This is option D from `docs/questions.md` Q-038 (default —
proceeding).

### 7.2 Slug derivation (FR-1..FR-4 + FR-9)

The `Slug` column for each new row is derived from the
upstream CSV `url` per the per-vendor rule already documented
in `docs/COMPANY_SLUG_DIRECTORY.md`'s vendor-section preamble:

| Vendor          | URL pattern                                              | Slug derivation                                                  |
| --------------- | -------------------------------------------------------- | ---------------------------------------------------------------- |
| Greenhouse      | `https://job-boards.greenhouse.io/<slug>` (modern) **or** `https://boards.greenhouse.io/<slug>` (legacy) | last path segment; lowercase                                     |
| Lever           | `https://jobs.lever.co/<slug>`                           | last path segment; preserve case from the URL (Lever slugs are case-sensitive in upstream URLs but the Ever Jobs plugin lowercases them at request time) |
| Workable        | `https://apply.workable.com/<slug>`                      | last path segment; lowercase; strip leading `-` if present (Workable CSV row 1 is ` Our Home` → URL `https://apply.workable.com/-our-home` → slug `-our-home`; the leading dash is preserved as-is — it's a literal Workable subdomain) |
| SmartRecruiters | `https://jobs.smartrecruiters.com/<slug>`                | last path segment; preserve case (SmartRecruiters slugs are case-sensitive — `Visa`, `BoschGroup` are existing examples) |

### 7.3 New-row markdown shape

Each appended row matches the existing four-column shape:

```markdown
| <Company-name> | `<slug>` | — |
```

- `Company-name` is the upstream CSV `name` field, trimmed.
- `<slug>` is the derived slug per § 7.2, wrapped in
  backticks (matching the existing rows).
- `—` is the em-dash placeholder for `Industry` (since the
  upstream CSVs don't carry that column — verified at run
  #70 via `head -3` of each CSV).

### 7.4 Insertion point per vendor

For each vendor section, the new rows are appended **at the
end of the existing table**, before the closing `---`
separator. The existing rows stay in their current order (FR-5).

### 7.5 No source-code surface

This spec **does not** touch any `.ts` file. The four vendor
plugins (`packages/plugins/source-ats-{greenhouse,lever,workable,smartrecruiters}/`)
stay byte-identical. No fixtures change. No test counts
change. No `tsconfig.base.json` / `jest.config.js` /
`packages/plugins/index.ts` / `packages/models/src/enums/site.enum.ts`
edit (the four sites already exist and are registered).

## 8. Test Plan

| # | Case                                                                                         | Outcome                                                            | Phase |
| - | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ | ----- |
| 1 | `npm run lint:docs` after Phase 1 (T01 — Greenhouse 25 rows appended)                        | exit 0; new rows reachable from `docs/index.md` (already linked); no broken internal links. | T01   |
| 2 | `npm run lint:docs` after Phase 2 (T02 — Lever 25 rows appended)                             | exit 0.                                                            | T02   |
| 3 | `npm run lint:docs` after Phase 3 (T03 — Workable 25 rows appended)                          | exit 0.                                                            | T03   |
| 4 | `npm run lint:docs` after Phase 4 (T04 — SmartRecruiters 25 rows appended)                   | exit 0.                                                            | T04   |
| 5 | `npm run lint:docs` after Phase 5 (T05 — closeout: SOURCE_ADOPTION_BACKLOG row + AC-8 flip)  | exit 0.                                                            | T05   |
| 6 | Visual-grep: post-Phase-1 directory has Greenhouse row count = 28 + 25 = **53**.             | row count matches.                                                 | T01   |
| 7 | Visual-grep: post-Phase-2 directory has Lever row count = 5 + 25 = **30**.                   | row count matches.                                                 | T02   |
| 8 | Visual-grep: post-Phase-3 directory has Workable row count = 2 + 25 = **27**.                | row count matches.                                                 | T03   |
| 9 | Visual-grep: post-Phase-4 directory has SmartRecruiters row count = 4 + 25 = **29**.         | row count matches.                                                 | T04   |
| 10 | Regression-sweep: `npx jest --testPathPatterns 'packages/common/__tests__/helpers'` reports `Tests: 74 passed, 74 total` (NFR-2 / NFR-5 — confirms zero coupling between docs refresh and source). | 74 / 74 pass.                                                      | T01..T04 (any phase commit triggers CI) |

> No unit / integration / e2e source-side tests are added or
> modified. The lint:docs gate is the primary acceptance
> mechanism — it owns link-resolution, index-reachability,
> log-uniqueness, and log-ordering checks.

## 9. Open Questions

(Move resolved questions to a `## Decisions` section. Unresolved
go to `docs/questions.md` with a default choice marked
`(default — proceeding)`.)

The Phase 0 scaffolding pass opens three new questions in
`docs/questions.md`:

- [Q-038](../../../docs/questions.md#q-038) — sampling
  methodology (random / alphabetical / deterministic-indexed /
  preserve-and-append). **Default — proceeding** = D
  (deterministic-indexed sample of 25 rows evenly spaced
  across the post-filter CSV ordering, after dropping
  duplicates and pure-numeric names).
- [Q-039](../../../docs/questions.md#q-039) — sample size per
  vendor (25 / 50 / 100). **Default — proceeding** = 25 per
  vendor (matches the Spec 006 / Spec 013 ~15-row precedent
  with a slight expansion for the bigger CSV corpora).
- [Q-040](../../../docs/questions.md#q-040) — `Industry` column
  population for new rows (CSV-derived / inferred-from-name /
  em-dash placeholder). **Default — proceeding** = em-dash
  placeholder (`—`), since the four CSVs only carry `name,url`
  (verified run #70). Industry enrichment is a future-spec
  candidate (sourcing from Crunchbase / structured datasets is
  out of scope here).

## 10. Decisions

(Append-only log of decisions made during implementation.
Populated as each Phase lands.)

### Decision D-01 (run #70, Phase 0) — multi-phase shape over single combined task

**Context:** the four vendors could be batched into one task
(append 100 rows in a single commit). That would minimise the
spec's run-count (1 vendor phase + scaffolding + closeout = 3
runs vs. 6).

**Decision:** keep four separate phases. Reasons:

- Each per-vendor commit is independently auditable. A future
  spec author reviewing `git log -- docs/COMPANY_SLUG_DIRECTORY.md`
  sees a clean per-vendor diff.
- Per-phase `lint:docs` gates catch a vendor-specific
  formatting bug (e.g. Workable's leading-dash slug shape) at
  the right boundary instead of mixing four error sources.
- Each phase fits comfortably in a single scheduled-task run
  (~0.1 day each), preserving the Spec 014 / 015 / 016 cadence
  precedent of "one substantial deliverable per run".
- Run-log granularity: each run-log entry records its 25-slug
  selection (FR-11), making the audit trail per-vendor
  searchable.

**Implementation:** four phases T01..T04, each landing 25
rows for one vendor; T05 = closeout (SOURCE_ADOPTION_BACKLOG +
AC-8 flip). Phase 0 (this run #70) lands scaffolding only.

### Decision D-02 (run #70, Phase 0) — pure-numeric `name` filter

**Context:** Greenhouse CSV row 1 is `103644278,https://job-boards.greenhouse.io/103644278`
— the `name` is a numeric tenant ID, not a brand name.
Including it in the markdown table would render as a confusing
row (`| 103644278 | `103644278` | — |`).

**Decision:** filter out rows where the trimmed `name` is
empty, whitespace-only, or matches `/^\d+$/`. The same filter
applies to all four vendors uniformly (none of the four CSVs
encode meaningful information in the numeric form, on
inspection).

**Implementation:** the Phase 1..4 task acceptance text in
`tasks.md` includes the filter rule; the deterministic-indexed
sample (§ 7.1) operates on the post-filter list.

### Decision D-03 (run #70, Phase 0) — em-dash `Industry` placeholder over best-effort inference

**Context:** the existing 39 rows in the four sections all
carry meaningful `Industry` strings (`Travel / Tech`, `AI`,
`Streaming`, etc.). New rows could either (a) leave the column
literally blank, (b) carry `—` (em-dash placeholder), or (c)
attempt to infer industry from the company name.

**Decision:** option (b) — `—` placeholder. Reasons:

- Option (a) breaks the existing four-column shape and trips
  some markdown renderers that interpret blank cells as
  malformed.
- Option (c) introduces a hallucination risk — the agent
  would assign `Industry` from name alone (e.g. `10X
  Construction AI` → `Construction Tech`) without any
  ground-truth source. The competitor-watch CSVs don't carry
  industry; making one up would dilute the directory's
  trustworthiness.
- Option (b) is honest: it explicitly marks "unclassified" and
  invites a future-spec enrichment pass.

**Implementation:** all 100 new rows (4 vendors × 25 rows) use
the em-dash placeholder. The `docs/log.md` entry for each
phase notes the column is intentionally placeholder-only.

### Decision D-04 (run #70, Phase 0) — Phase 0 = pure-docs scaffolding (no row appends this run)

**Context:** the scheduled-task agent could land Phase 0 + T01
(Greenhouse 25 rows) in the same run #70 to maximise
throughput.

**Decision:** Phase 0 lands scaffolding only (spec.md /
plan.md / tasks.md / questions.md / index.md / log.md /
CLAUDE.md run-tag bump / competitor-watch.md sync entry). T01
is deferred to run #71. Reasons:

- Spec 014, Spec 015, and Spec 013 all followed the
  "scaffolding-first" cadence. Mixing scaffolding with the
  first phase produces a fat commit that fights human
  review.
- The lint:docs gate must pass on the scaffolding pass
  alone — proving the spec scheme is self-consistent before
  any data-bearing rows land. Phase 1's commit then has a
  single source of failure (the row-append) instead of a
  conjoint failure surface.
- Each scheduled run is cheap; preserving the cadence
  precedent is more valuable than shaving one run off the
  spec's lifecycle.

**Implementation:** run #70 does not touch
`docs/COMPANY_SLUG_DIRECTORY.md`. T01..T05 run in #71..#75
(modulo competitor-watch upstream churn that may interpose
an unrelated spec).

### Decision D-05 (run #71, T01) — Greenhouse 25-slug selection verbatim

**Context:** FR-11 requires the 25-slug selection per vendor to be
recorded verbatim in the spec for audit. The § 7.1 methodology run
against `OTHERS/Ats-scrapers/greenhouse/greenhouse_companies.csv`
(2 805 post-header rows) yielded a post-filter list length of
**L = 2 793** (12 rows dropped: 2 pure-numeric `name` values like
`103644278` and `123456789101010`; 0 duplicates with the existing 28
Greenhouse rows; the rest were rare empty-name cases). Step =
`⌊2793/25⌋ = 111`. The 25 deterministic indices `[0, 111, 222, …,
2664]` produced the following selection (CSV `name` → derived
`slug` per § 7.2):

| idx  | upstream `name`              | slug                            |
| ---- | ---------------------------- | ------------------------------- |
|    0 | 10Alabs                      | `10alabs`                       |
|  111 | Alixpartners                 | `alixpartners`                  |
|  222 | Arlosolutionsllc             | `arlosolutionsllc`              |
|  333 | Bigid                        | `bigid`                         |
|  444 | Cadencesolutions             | `cadencesolutions`              |
|  555 | Clevelandguardiansbops       | `clevelandguardiansbops`        |
|  666 | Danieloconnellssons          | `danieloconnellssons`           |
|  777 | Effectual                    | `effectual`                     |
|  888 | Fastly                       | `fastly`                        |
|  999 | Garnerhealth                 | `garnerhealth`                  |
| 1110 | Guild                        | `guild`                         |
| 1221 | Iherb                        | `iherb`                         |
| 1332 | Juvare                       | `juvare`                        |
| 1443 | Lightningai                  | `lightningai`                   |
| 1554 | Meridianpartners             | `meridianpartners`              |
| 1665 | Nationallifeinsurancecompany | `nationallifeinsurancecompany`  |
| 1776 | Olly                         | `olly`                          |
| 1887 | Penninteractive              | `penninteractive`               |
| 1998 | Qualia                       | `qualia`                        |
| 2109 | Royalvet                     | `royalvet`                      |
| 2220 | Simula                       | `simula`                        |
| 2331 | Stemhealthcare               | `stemhealthcare`                |
| 2442 | Thatlot                      | `thatlot`                       |
| 2553 | Twitch                       | `twitch`                        |
| 2664 | Vulcanelements               | `vulcanelements`                |

All 25 slugs land under the modern `job-boards.greenhouse.io/<slug>`
URL shape (the CSV's URL column uses `https://job-boards.greenhouse.io/<lowercase-name>`
exclusively — the legacy `boards.greenhouse.io/<slug>` form anticipated
in the Watch-out note for run #71 wasn't represented in this 25-row
slice; both extraction rules in § 7.2 collapse to the same lowercase
last-path-segment regardless). No `?gh_jid=…` query suffixes appeared
in the selected rows.

Greenhouse table row count after T01: **53** (28 preserved + 25
appended), verified via
`awk '/^## Greenhouse$/,/^## Workday$/' docs/COMPANY_SLUG_DIRECTORY.md
| grep -c '^|'` reporting 55 (53 data rows + 2 header rows).

Re-running the § 7.1 methodology against the same CSV produces the
same 25 slugs (FR-6 reproducibility verified locally; the
`existing` set, `L`, step, and indices are deterministic functions
of the input).

### Decision D-06 (run #72, T02) — Lever 25-slug selection verbatim

**Context:** FR-11 requires the 25-slug selection per vendor to be
recorded verbatim in the spec for audit. The § 7.1 methodology run
against `OTHERS/Ats-scrapers/lever/lever_companies.csv` (1 912
post-header rows) yielded a post-filter list length of **L = 1 910**
(2 rows dropped: 1 pure-numeric `name` value `500` per D-02; 1
case-insensitive duplicate of the existing 5 Lever rows — `Palantir`;
0 empty-name cases). Step = `⌊1910/25⌋ = 76`. The 25 deterministic
indices `[0, 76, 152, 228, 304, 380, 456, 532, 608, 684, 760, 836,
912, 988, 1064, 1140, 1216, 1292, 1368, 1444, 1520, 1596, 1672, 1748,
1824]` produced the following selection (CSV `name` → derived `slug`
per § 7.2):

| idx  | upstream `name`     | slug                  |
| ---- | ------------------- | --------------------- |
|    0 | 100Ms               | `100ms`               |
|   76 | Allegiantair        | `allegiantair`        |
|  152 | Asapp 2             | `asapp-2`             |
|  228 | Blablacar           | `blablacar`           |
|  304 | Cartrawler          | `cartrawler`          |
|  380 | Coinmarketcap       | `coinmarketcap`       |
|  456 | Deepsky             | `deepsky`             |
|  532 | Ekohealth           | `ekohealth`           |
|  608 | Findhelp            | `findhelp`            |
|  684 | Glass Health Inc    | `glass-health-inc`    |
|  760 | Hivemapper          | `hivemapper`          |
|  836 | Jamcity             | `jamcity`             |
|  912 | Lamudi              | `lamudi`              |
|  988 | Madhappy            | `madhappy`            |
| 1064 | Monkshillventures   | `monkshillventures`   |
| 1140 | Numeris             | `numeris`             |
| 1216 | Peoplegrove         | `peoplegrove`         |
| 1292 | Princesspolly       | `princesspolly`       |
| 1368 | Redwoodcu           | `redwoodcu`           |
| 1444 | Sandboxvr           | `sandboxvr`           |
| 1520 | Snappr              | `snappr`              |
| 1596 | Sure                | `sure`                |
| 1672 | Thrivecausemetics   | `thrivecausemetics`   |
| 1748 | Unusual             | `unusual`             |
| 1824 | Waveapps            | `waveapps`            |

**Lever case-preservation note (§ 7.2):** every URL in the upstream
CSV's `url` column is already lowercase (`https://jobs.lever.co/<slug>`
where the slug equals the lowercased / dasherised name). The
"preserve case" rule therefore yields 25 lowercase slugs — no
mixed-case PascalCase variants appeared in the 25-row slice.
The Watch-out note for run #72 anticipated mixed-case Lever slugs
upstream, but none were represented at the deterministic indices.

**Multi-word names (`Asapp 2`, `Glass Health Inc`):** the upstream
URL converts internal whitespace to a single `-` (e.g.
`https://jobs.lever.co/asapp-2`, `https://jobs.lever.co/glass-health-inc`).
The `Slug` column reflects the literal URL last-path-segment per
§ 7.2; the `Company` column carries the trimmed `name` field
verbatim (matching the FR-9 / § 7.3 contract).

Lever table row count after T02: **30** (5 preserved + 25
appended), verified via
`awk '/^## Lever$/,/^## Ashby$/' docs/COMPANY_SLUG_DIRECTORY.md
| grep -c '^|'` reporting 32 (30 data rows + 2 header rows).

Re-running the § 7.1 methodology against the same CSV produces the
same 25 slugs (FR-6 reproducibility verified locally).

### Decision D-07 (run #73, T03) — Workable 25-slug selection verbatim

**Context:** FR-11 requires the 25-slug selection per vendor to be
recorded verbatim. The § 7.1 methodology run against
`OTHERS/Ats-scrapers/workable/workable_companies.csv` (4 028
post-header rows) yielded **L = 4 026** post-filter (2 rows dropped:
0 duplicates with the existing 2 Workable rows; 0 pure-numeric
names; ~2 empty/whitespace edge rows). Step =
`⌊4026/25⌋ = 161`. The 25 deterministic indices `[0, 161, 322, …,
3864]` produced the following selection (CSV `name` trimmed →
derived `slug` per § 7.2):

| idx  | upstream `name` (trimmed)         | slug                                 |
| ---- | --------------------------------- | ------------------------------------ |
|    0 | Our Home                          | `-our-home`  *(leading-dash)*        |
|  161 | Alliedteam                        | `alliedteam`                         |
|  322 | Auprosports                       | `auprosports`                        |
|  483 | Blitzoo Games                     | `blitzoo-games`                      |
|  644 | Cdr Companies                     | `cdr-companies`                      |
|  805 | Constructor 1                     | `constructor-1`                      |
|  966 | Deep Science Ventures             | `deep-science-ventures`              |
| 1127 | Elevated Hiring                   | `elevated-hiring`                    |
| 1288 | Fergus                            | `fergus`                             |
| 1449 | Gamigo                            | `gamigo`                             |
| 1610 | Healthsnap                        | `healthsnap`                         |
| 1771 | Infini Capital Management Limited | `infini-capital-management-limited`  |
| 1932 | Karohealthcare                    | `karohealthcare`                     |
| 2093 | Lingoace                          | `lingoace`                           |
| 2254 | Mention Me Ltd                    | `mention-me-ltd`                     |
| 2415 | Nawy Real Estate                  | `nawy-real-estate`                   |
| 2576 | Optibpo                           | `optibpo`                            |
| 2737 | Pinnacle Middle East              | `pinnacle-middle-east`               |
| 2898 | Radley Yeldar                     | `radley-yeldar`                      |
| 3059 | Samsung Sds America               | `samsung-sds-america`                |
| 3220 | Snowed In Studios 3               | `snowed-in-studios-3`                |
| 3381 | Switchboard Hiring 1              | `switchboard-hiring-1`               |
| 3542 | Thetsuigroup                      | `thetsuigroup`                       |
| 3703 | University Of Mount Saint Vincent | `university-of-mount-saint-vincent`  |
| 3864 | Wearenoble                        | `wearenoble`                         |

**Workable quirk surfaced (1 leading-dash slug):** Index 0 captured
the documented edge case `Our Home` (CSV row 1: ` Our Home,https://apply.workable.com/-our-home`).
The leading space in `name` is trimmed for the `Company` column
(`Our Home`); the literal leading `-` in the URL slug is preserved
verbatim in the `Slug` column (`-our-home`) — it's a real Workable
subdomain shape per § 7.2. The deterministic-indexed sample
landed exactly the row the run #70 / D-04 pin anticipated.

Workable table row count after T03: **27** (2 preserved + 25
appended), verified via
`awk '/^## Workable$/,/^## BambooHR$/' docs/COMPANY_SLUG_DIRECTORY.md
| grep -c '^|'` reporting 29 (27 data rows + 2 header rows).

Re-running the § 7.1 methodology against the same CSV produces the
same 25 slugs (FR-6 reproducibility verified locally).

### Decision D-08 (run #74, T04) — SmartRecruiters 25-slug selection verbatim

**Context:** FR-11 requires the 25-slug selection per vendor to be
recorded verbatim. The § 7.1 methodology run against
`OTHERS/Ats-scrapers/smartrecruiters/smartrecruiters_companies.csv`
(812 post-header rows) yielded **L = 810** post-filter (2 rows
dropped: 2 case-insensitive duplicates with the existing 4
SmartRecruiters rows — `Visa` (CSV row matches existing `Visa`)
and `Equinox` (CSV row matches existing `Equinox`); 0
pure-numeric `name` values; 0 empty/whitespace edge rows). The
existing `Bosch` and `Skechers` directory rows do NOT appear by
exact case-insensitive `name` match in the upstream CSV
(`Bosch` is represented as `Bosch Homecomfort` and `Boschgroup`
in the CSV — neither lowercases to `bosch`; `Skechers` is not
present in the SmartRecruiters CSV at all — the existing
directory row was hand-curated). Per the § 7.1 strict
case-insensitive `name`-equality dedup rule (D-02 / D-06
precedent), only exact-match-after-lowercase rows are dropped;
substring matches like `Boschgroup ⊃ Bosch` are intentionally
not deduped. Step = `⌊810/25⌋ = 32`. The 25 deterministic
indices `[0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320,
352, 384, 416, 448, 480, 512, 544, 576, 608, 640, 672, 704,
736, 768]` produced the following selection (CSV `name`
trimmed → derived `slug` per § 7.2):

| idx  | upstream `name`                          | slug                                       |
| ---- | ---------------------------------------- | ------------------------------------------ |
|    0 | 10Minuteschool                           | `10minuteschool`                           |
|   32 | Ajua                                     | `ajua`                                     |
|   64 | Artelia                                  | `artelia`                                  |
|   96 | Blueally                                 | `blueally`                                 |
|  128 | Check24                                  | `check24`                                  |
|  160 | Continental                              | `continental`                              |
|  192 | Deloittenordic                           | `deloittenordic`                           |
|  224 | Elizabethglaserpediatricaidsfoundation3  | `elizabethglaserpediatricaidsfoundation3`  |
|  256 | Firstdrivelogisticsinc                   | `firstdrivelogisticsinc`                   |
|  288 | Ginastechjobs                            | `ginastechjobs`                            |
|  320 | Hexagroup                                | `hexagroup`                                |
|  352 | Ingramcontentgroup1                      | `ingramcontentgroup1`                      |
|  384 | Kanadeviainova                           | `kanadeviainova`                           |
|  416 | Liftedanupworkcompany                    | `liftedanupworkcompany`                    |
|  448 | Mcwaneinc                                | `mcwaneinc`                                |
|  480 | Mytime                                   | `mytime`                                   |
|  512 | Nxtkeycorporation                        | `nxtkeycorporation`                        |
|  544 | Primark                                  | `primark`                                  |
|  576 | Renaud Bray                              | `renaud-bray`                              |
|  608 | Samsungena                               | `samsungena`                               |
|  640 | Siloamcareers                            | `siloamcareers`                            |
|  672 | Sterlingenterprisellc                    | `sterlingenterprisellc`                    |
|  704 | Telefonicatech                           | `telefonicatech`                           |
|  736 | Trustonic                                | `trustonic`                                |
|  768 | Virtuaadvancedsolution                   | `virtuaadvancedsolution`                   |

**SmartRecruiters case-preservation note (§ 7.2):** every URL in
the upstream CSV's `url` column at the deterministic-indexed
sample positions is lowercase (`https://jobs.smartrecruiters.com/<lowercase-name>`).
The "preserve case from URL" rule therefore yields 25 lowercase
slugs in this slice — no mixed-case PascalCase slugs
(e.g. the existing `Visa` / `BoschGroup` / `Equinox` /
`Skechers` shape, or upstream-CSV examples like `1Huddle` whose
URL is `https://jobs.smartrecruiters.com/1huddle`) appeared at
the 25 sampled indices. The Watch-out note for run #74
anticipated mixed-case slugs in the slice, but the upstream
URL column is lowercased uniformly across the 25 sampled rows.
The four existing rows (Visa / BoschGroup / Equinox / Skechers)
are hand-curated PascalCase values and remain byte-identical
(FR-5).

**Multi-word names (`Renaud Bray`):** the upstream URL converts
internal whitespace to a single `-` (e.g.
`https://jobs.smartrecruiters.com/renaud-bray`). The `Slug`
column reflects the literal URL last-path-segment per § 7.2;
the `Company` column carries the trimmed `name` field verbatim
(matching the FR-9 / § 7.3 contract — same convention as
Lever's `Asapp 2` / `Glass Health Inc` precedent in D-06).

**Trailing-digit names (`Elizabethglaserpediatricaidsfoundation3`,
`Ingramcontentgroup1`):** these are real SmartRecruiters tenant
slugs where the upstream company has multiple branded tenants
on the same ATS (the `3` / `1` suffix disambiguates the tenant).
These pass the D-02 pure-numeric filter (the `name` is not
purely numeric — it carries an alphabetic prefix) and are
included in the sample.

SmartRecruiters table row count after T04: **29** (4 preserved
+ 25 appended), verified via
`awk '/^## SmartRecruiters$/,/^## SuccessFactors$/' docs/COMPANY_SLUG_DIRECTORY.md
| grep -c '^|'` reporting 31 (29 data rows + 2 header rows).

Re-running the § 7.1 methodology against the same CSV produces
the same 25 slugs (FR-6 reproducibility verified locally).

## 11. References

- [`docs/COMPANY_SLUG_DIRECTORY.md`](../../../docs/COMPANY_SLUG_DIRECTORY.md)
  — the directory file refreshed by Spec 017 / T01..T04.
- [`docs/SOURCE_ADOPTION_BACKLOG.md`](../../../docs/SOURCE_ADOPTION_BACKLOG.md)
  — the "Logic-improvement candidates" `(seed lists)` row is
  updated by T05.
- `competitor-watch.md` §C (workspace-root file, outside the
  ever-jobs repo) — `AC-8` row flips to `agent ✅` at T05
  closeout.
- `OTHERS/Ats-scrapers/greenhouse/greenhouse_companies.csv`
  (2 805 rows after header) — Greenhouse sampling source.
- `OTHERS/Ats-scrapers/lever/lever_companies.csv`
  (1 912 rows after header) — Lever sampling source.
- `OTHERS/Ats-scrapers/workable/workable_companies.csv`
  (4 028 rows after header) — Workable sampling source.
- `OTHERS/Ats-scrapers/smartrecruiters/smartrecruiters_companies.csv`
  (812 rows after header) — SmartRecruiters sampling source.
- `.specify/specs/006-ats-scrapers-parity-batch-1/spec.md` —
  ~15-row sampling precedent for Avature / Gem / Join.com.
- `.specify/specs/013-ats-scrapers-parity-batch-2/spec.md` —
  ~15-row sampling precedent for Oracle / Mercor / Tesla.
- `.specify/specs/016-bench-file-ts1127-fix/tasks.md` § "Notes
  for the next run" — pinned AC-8 as the run #70 default
  (the trigger for this scaffolding pass).
- [`AGENTS.md`](../../../AGENTS.md) §2 rule 9 — "No deletion."
  Every existing slug row is preserved (FR-5).
- [`AGENTS.md`](../../../AGENTS.md) §10 — pre-commit
  cross-check list (lint:docs / spec presence / index update /
  log append / questions update).
