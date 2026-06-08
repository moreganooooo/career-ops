# Spec 002 — Documentation & Spec-Kit Bootstrap

| Field          | Value                                                |
| -------------- | ---------------------------------------------------- |
| Spec ID        | 002                                                  |
| Slug           | docs-and-spec-kit-bootstrap                          |
| Status         | in-progress                                          |
| Owner          | scheduled-task agent                                 |
| Created        | 2026-04-26                                           |
| Last updated   | 2026-04-26                                           |
| Supersedes     | (none)                                               |
| Related specs  | 001, 003, 004, 005                                   |

## 1. Problem Statement

The Ever Jobs monorepo has 160+ plugins, three apps (api, cli, mcp), and a rich set of
domain documentation, but no unified, machine-readable spec workflow. AI agents that
work on the repo (Claude Code, Codex, Cursor) need a deterministic process for
**Specify → Plan → Tasks → Implement** so each scheduled run picks up exactly where the
prior run stopped, and so humans can review proposed changes without reading code first.

The repository must adopt the **GitHub Spec Kit** layout (`.specify/`) and a sibling
`docs/` index whose authoritative `index.md`, `log.md`, and `questions.md` answer every
reasonable agent question encountered during autonomous runs.

## 2. Goals

- Establish `.specify/` (templates, memory/constitution, specs/) as the canonical
  spec location.
- Establish `docs/` as the authoritative human-readable doc directory with a maintained
  `index.md`, append-only `log.md`, and ledger `questions.md`.
- Define and codify the per-run agent workflow in `AGENTS.md` and `CLAUDE.md`.
- Lint the doc tree on every run (no broken links, every doc indexed, log appended).
- Provide reusable templates for `spec.md`, `plan.md`, and `tasks.md`.

## 3. Non-Goals

- Migrating the existing `README.md` to a multi-page docs site (deferred to v0.4).
- Generating docs from code (Typedoc) — deferred.
- Auto-translating specs to issues in GitHub Projects — deferred (see Spec 010 candidate).

## 4. User / Caller Stories

- *As an autonomous agent*, I want `docs/log.md` to tell me what the previous run did so
  I do not duplicate work.
- *As a reviewer (human)*, I want every doc indexed in `docs/index.md` so I never have
  to ls a directory to find a doc.
- *As a future plugin author*, I want a `spec.template.md` I can copy into a new spec.

## 5. Functional Requirements

| ID    | Requirement                                                                | Priority |
| ----- | -------------------------------------------------------------------------- | -------- |
| FR-1  | `.specify/templates/{spec,plan,tasks}.template.md` exist and are valid MD. | must     |
| FR-2  | `.specify/memory/constitution.md` lists ratified non-negotiable principles.| must     |
| FR-3  | Every spec lives under `.specify/specs/<NNN>-<slug>/` with `spec.md`.      | must     |
| FR-4  | A spec MAY have `plan.md`, `tasks.md`, `notes.md`.                         | should   |
| FR-5  | `docs/index.md` lists every file under `docs/` with a 1-line description.  | must     |
| FR-6  | `docs/log.md` is append-only; newest entry at top; format documented.      | must     |
| FR-7  | `docs/questions.md` records ambiguities with options + default.            | must     |
| FR-8  | `AGENTS.md` (root) is the single source of truth for AI rules.             | must     |
| FR-9  | `CLAUDE.md` (root) loads `AGENTS.md` by reference and adds Claude-only ops.| must     |
| FR-10 | Each scheduled run runs the doc-lint script (Spec 002 / Phase 3).          | should   |

## 6. Non-Functional Requirements

| ID     | Requirement                                       | Target            |
| ------ | ------------------------------------------------- | ----------------- |
| NFR-1  | Doc-lint runtime                                  | < 5 s             |
| NFR-2  | Spec template fill-out time (human estimate)      | ≤ 30 min          |
| NFR-3  | All docs under `docs/` reachable from `index.md`  | 100% coverage     |

## 7. Contracts

### 7.1 Doc-lint script

```ts
// scripts/docs-lint.ts
export interface DocLintResult {
  brokenLinks: { from: string; to: string }[];
  unindexedDocs: string[];
  duplicateLogEntries: string[];
  missingFrontmatter: string[];
  ok: boolean;
}

export function lintDocs(repoRoot: string): Promise<DocLintResult>;
```

### 7.2 Errors

| Code                       | Meaning                                                 |
| -------------------------- | ------------------------------------------------------- |
| `ERR_DOC_BROKEN_LINK`      | A link inside `docs/` resolves to a missing file.       |
| `ERR_DOC_UNINDEXED`        | A doc file is not listed in `docs/index.md`.            |
| `ERR_LOG_NEWEST_NOT_TOP`   | `docs/log.md` violates newest-at-top ordering.          |

## 8. Test Plan

- Unit: `docs-lint.spec.ts` against synthetic doc trees.
- Integration: run `docs-lint.ts` against the live repo; expect exit 0.
- E2E: not applicable (build-time tool).
- Performance: assert lint completes in < 5 s on full repo.

## 9. Open Questions

- Q-002 in `docs/questions.md` (canonical spec location).

## 10. Decisions

- 2026-04-26: Single canonical location is `.specify/specs/`. Mirror in `docs/specs/`
  is **not** required; `docs/index.md` links into `.specify/`.

## 11. References

- `AGENTS.md`, `CLAUDE.md`
- GitHub Spec Kit: <https://github.com/github/spec-kit>
- `.specify/templates/*.template.md`
