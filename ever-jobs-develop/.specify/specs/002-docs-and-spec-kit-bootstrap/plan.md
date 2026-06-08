# Plan: 002 — Documentation & Spec-Kit Bootstrap

| Field        | Value                              |
| ------------ | ---------------------------------- |
| Spec         | spec.md                            |
| Created      | 2026-04-26                         |
| Last updated | 2026-04-26                         |

## 1. Approach

Bootstrap is **documentation-only** in its first phase. We accept the existing source
tree as the baseline (Spec 001 retroactively documents the plugin runtime), then layer
on the Spec-Kit and AGENTS scaffolding without changing runtime behaviour.

Phase 1 (this scheduled run) creates the foundation files: `AGENTS.md`, `CLAUDE.md`,
`.specify/memory/constitution.md`, `.specify/templates/*`, and `docs/{index,log,questions}.md`.

Phase 2 (next scheduled runs) backfills the missing companion specs (002–005) with
full plan.md and tasks.md, and starts producing first-class **plan-driven** code work.

Phase 3 (subsequent runs) ships the doc-lint script and wires it into CI so that PRs
that break the doc index are auto-rejected.

## 2. Phases

### Phase 1 — Foundation files

- Goal: introduce `.specify/`, `docs/index.md`, `docs/log.md`, `docs/questions.md`,
  `AGENTS.md`, `CLAUDE.md`.
- Deliverables: foundation files committed.
- Exit criteria: every file referenced by `docs/index.md` exists.

### Phase 2 — Backfill specs 002–005 plan.md / tasks.md

- Goal: every spec in `docs/index.md`'s spec table has spec.md + plan.md + tasks.md.
- Deliverables: 4 new files per spec (002 plan/tasks; 003, 004, 005 spec/plan/tasks).
- Exit criteria: `docs/index.md` table accurate.

### Phase 3 — Doc-lint script + CI hook

- Goal: `scripts/docs-lint.ts` automated by CI and per-run.
- Deliverables: TS script, jest tests, GitHub Actions step.
- Exit criteria: CI fails on broken doc-link.

## 3. Packages Touched

| Package                        | Change                                |
| ------------------------------ | ------------------------------------- |
| (root)                         | new files: AGENTS.md, CLAUDE.md       |
| `.specify/`                    | new dir tree                          |
| `docs/`                        | new files: index/log/questions.md     |
| `scripts/`                     | new docs-lint.ts (Phase 3)            |

## 4. Dependencies

| Library                | Version  | Rationale                            |
| ---------------------- | -------- | ------------------------------------ |
| (none new)             | -        | Phase 1/2 are docs-only.             |
| `remark-parse`         | latest   | Phase 3: parse markdown for lint.    |
| `unified`              | latest   | Phase 3: pipeline for remark.        |

## 5. Risks & Mitigations

| Risk                                | Likelihood | Impact | Mitigation                          |
| ----------------------------------- | ---------- | ------ | ----------------------------------- |
| Doc drift between agents            | H          | M      | Doc-lint in CI (Phase 3)            |
| Spec sprawl (too many small specs)  | M          | M      | Group small ideas into one spec.    |
| Outdated `docs/index.md` table      | M          | L      | Auto-regenerate in Phase 3.         |

## 6. Rollback Plan

Docs-only changes are reversible by `git revert` per commit. No data implications.

## 7. Migration Plan

N/A — additive only.

## 8. Open Questions

- See `docs/questions.md` Q-002.
