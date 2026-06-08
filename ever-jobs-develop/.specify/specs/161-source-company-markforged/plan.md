# Plan: 161 — Source Company Plugin: Markforged

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Markforged's careers board is hosted on Greenhouse at the
slug `markforged`. Mirror Labelbox (Spec 160) byte-for-byte
— Labelbox is the closest behavioural cousin sharing all
five primary axes: D-04 variant 2 + D-08 + D-09 case-
symmetric + D-10 omitted + D-11 omitted.

**Zero structural deviations** from Labelbox — making this
the **forty-fourth** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-markforged`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `MARKFORGED = 'markforged'` (Phase 171).                         |
| `packages/plugins/index.ts`                             | import + register `MarkforgedModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-markforged`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `markforged` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#371 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Low-volume sample (6 listings) — D-10/D-11 verdicts provisional. | Defensive `.trim()` on title + dept emits — safe no-op on clean wire, robust to future pad introductions. |
