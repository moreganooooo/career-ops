# Tasks: 002 — Documentation & Spec-Kit Bootstrap

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Foundation files (DONE)

- [x] T01 — Create `AGENTS.md` with rule set, layout, plugin contract.
  - **Files:** `AGENTS.md`
  - **Acceptance:** §0 North Star, §2 Hard Rules, §3 Layout, §5 Plugin Contract, §10 Cross-Check.
  - **Estimate:** 0.5 day.

- [x] T02 — Create `CLAUDE.md` Claude-specific operating notes.
  - **Files:** `CLAUDE.md`
  - **Acceptance:** Loads AGENTS.md by reference; documents per-run checklist.
  - **Estimate:** 0.25 day.

- [x] T03 — Create `.specify/{memory,templates}/` skeleton.
  - **Files:** `.specify/README.md`, `.specify/memory/constitution.md`, `.specify/templates/{spec,plan,tasks}.template.md`.
  - **Acceptance:** Templates produce a valid spec/plan/tasks file when copied.
  - **Estimate:** 0.5 day.

- [x] T04 — Create `docs/index.md`, `docs/log.md`, `docs/questions.md`.
  - **Files:** as listed.
  - **Acceptance:** index.md links resolve; log.md template appended; 5 open questions logged.
  - **Estimate:** 0.5 day.

## Phase 2 — Backfill specs 002–005 (in-progress)

- [x] T05 — Add `.specify/specs/002-docs-and-spec-kit-bootstrap/{spec,plan,tasks}.md`.
  - **Files:** under `.specify/specs/002-…/`.
  - **Acceptance:** All three files present.

- [x] T06 — Add `.specify/specs/003-deduplication-engine/{spec,plan,tasks}.md`.
  - **Files:** under `.specify/specs/003-…/`.

- [x] T07 — Add `.specify/specs/004-persistence-storage-plugins/{spec,plan,tasks}.md`.
  - **Files:** under `.specify/specs/004-…/`.

- [x] T08 — Add `.specify/specs/005-source-health-circuit-breaker/{spec,plan,tasks}.md`.
  - **Files:** under `.specify/specs/005-…/`.

- [x] T09 — Update `docs/index.md` to reflect spec status truthfully (not "draft" for missing files).
  - **Acceptance:** No file referenced by index.md is missing.

## Phase 3 — Doc-lint script + CI hook (DONE)

- [x] T11 — Implement `scripts/docs-lint.ts` per Spec 002 §7.1 contract.
  - **Files:** `scripts/docs-lint.ts`, `scripts/__tests__/docs-lint.spec.ts`.
  - **Acceptance:** Detects broken links, unindexed docs, mis-ordered log entries.
  - **Estimate:** 1 day.
  - **Done (run #9, 2026-04-26):** zero-dep regex parser (no remark/unified —
    see Q-011 for the trade-off). Five checks: broken internal links,
    unindexed docs, duplicate log entries (`date#run`), newest-at-top
    ordering, spec/plan/tasks H1+metadata-table presence. Public surface:
    `lintDocs(repoRoot)`, `formatResult(res)`, plus pure helpers
    `extractLinks` / `parseLogHeaders` / `checkFrontmatter`. Honours code
    fences (` ``` ` and `~~~`) and inline-code spans, so docstring
    examples don't trip the link checker. Skips external schemes
    (`http(s)`, `mailto`, `ftp`, `tel`, `data`, `ssh`), pure anchors,
    `:line` suffixes, and `#fragment` / `?query` parts. Index exemption
    list: `docs/{index,log,questions}.md`, `.specify/README.md`,
    `.specify/memory/constitution.md`, plus everything under
    `.specify/templates/`. CLI mode: `ts-node scripts/docs-lint.ts
    [repoRoot]` exits 0 on clean, 1 on issues, 2 on internal error.
  - **Tests:** `scripts/__tests__/docs-lint.spec.ts` — 20+ cases
    across helper-level pure functions and full-tree e2e fixtures
    (broken/external/anchor links, fragment/query/`:line` suffixes,
    duplicate log entries, out-of-order log entries, newest-at-top
    happy path, exempt-list coverage, code-fence ignore, inline-code
    ignore, `/`-rooted vs `../`-rooted resolution, frontmatter-pass /
    frontmatter-fail, 100-doc tree NFR-1 < 5 s perf gate, formatter
    output sections). Includes a fix to `docs/DEPLOYMENT.md` (a stale
    `.env.example` link that resolved to `docs/.env.example` instead of
    `../.env.example`) so the lint passes on the live repo.

- [x] T12 — Wire doc-lint into `npm run lint:docs` and CI workflow.
  - **Files:** `package.json`, `jest.config.js`, `.github/workflows/ci.yml`.
  - **Acceptance:** PR with broken link fails CI.
  - **Estimate:** 0.5 day.
  - **Done (run #9, 2026-04-26):** added two npm scripts —
    `lint:docs` runs the linter via `ts-node`; `test:scripts` runs the
    accompanying jest suite. `jest.config.js` `roots` extended to include
    `<rootDir>/scripts/` so the existing `npm test` picks the lint
    spec up. New `docs-lint` GitHub Actions job runs ahead of `build`
    on every push/PR; it exits non-zero on any of the five lint checks
    and on any failing unit test.

## Notes

- Phase 1 was completed on 2026-04-26 by scheduled run #1.
- Phase 2 was completed on 2026-04-26 by scheduled run #2.
- Phase 3 was completed on 2026-04-26 by scheduled run #9. Q-011
  resolved (zero-dep regex parser adopted; `remark-parse`/`unified`
  reserved for follow-ups if the parser hits an actual blocker).
