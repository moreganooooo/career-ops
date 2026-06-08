# Plan: 111 — Source Company Plugin: Constant Contact

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Mirror Misfits Market (Spec 098) — same axes for D-04, D-08,
D-09 omitted with two-token internal-whitespace asymmetry,
D-10 trailing-pad, and D-11 fully-clean. **Zero structural
deviations** — eighteenth clean re-spin in run-history.

Sub-axis observation: D-11 dept names use numeric-prefix
naming (`'100 Engineering'`, `'135 Product'`, etc.) — first
cohort observation of numeric-prefix-as-org-code department
naming convention.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-constantcontact`       | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `CONSTANTCONTACT = 'constantcontact'` under Phase 121. |
| `packages/plugins/index.ts`                             | import + append `ConstantContactModule`. |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Constant Contact rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade. Mitigation: fallback uses
  canonical variant 2.
