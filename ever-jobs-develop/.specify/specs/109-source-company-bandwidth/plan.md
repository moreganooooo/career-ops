# Plan: 109 — Source Company Plugin: Bandwidth

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Mirror Adyen (Spec 090) — same axes for D-04, D-08, D-09,
D-10, D-11. **Zero structural deviations** — sixteenth clean
re-spin. D-11-omission threshold (50 plugins) crossed at this
run.

## 2. Phases

Phase 1 — Scaffold + register + test (single PR).

## 3. Packages Touched

| Package                                                 | Change                                  |
| ------------------------------------------------------- | --------------------------------------- |
| `packages/plugins/source-company-bandwidth`             | **new package**.                        |
| `packages/models/src/enums/site.enum.ts`                | append `BANDWIDTH = 'bandwidth'` under Phase 119. |
| `packages/plugins/index.ts`                             | import + append `BandwidthModule` (alphabetical: between `BalsamiqModule` (if any) / `AttentiveModule` and `BenevityModule` — check actual placement). |
| `tsconfig.base.json`, `jest.config.js`                  | path-alias + moduleNameMapper.          |
| `docs/SOURCE_ADOPTION_BACKLOG.md`, `docs/index.md`, `docs/log.md` | doc updates.                  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01** — Bandwidth rebrand. Mitigation: byte-for-byte
  `companyName` assertion catches any wire change.
- **R-02** — Wire URL upgrade. Mitigation: fallback uses
  canonical variant 2.
