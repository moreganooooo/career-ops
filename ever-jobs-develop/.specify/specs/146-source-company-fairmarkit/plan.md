# Plan: 146 — Source Company Plugin: Fairmarkit

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Fairmarkit's careers board is hosted on Greenhouse at the slug
`fairmarkit`. Mirror Melio (Spec 130) byte-for-byte — Melio is
the closest behavioural cousin sharing all five primary axes:
D-04 variant 2 + D-08 + D-09 case-symmetric + D-10 applied +
D-11 applied (trailing-pad form).

**Zero structural deviations** from Melio — making this the
**thirty-seventh** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Notable D-10 sub-axis observation:** 1 of 5 padded titles
carries leading mojibake-encoded Cyrillic Es character
(`c3 90 c2 a1` byte sequence). **First cohort observation of
leading mojibake-Cyrillic-Es residue** — distinct from prior
mojibake-NBSP trailing form (Bloomreach Spec 139, ExpressVPN
Spec 145).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-fairmarkit`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `FAIRMARKIT = 'fairmarkit'` (Phase 156).                         |
| `packages/plugins/index.ts`                             | import + register `FairmarkitModule` in `ALL_SOURCE_MODULES`.           |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-fairmarkit`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `fairmarkit` row as shipped.                                       |
| `docs/index.md` / `docs/log.md`                         | run-#356 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire-leading mojibake-Cyrillic-Es residue may surprise downstream consumers expecting clean ASCII titles. | Pass-through is wire-faithful; observability noted in test + docblock; downstream normalisation is out-of-scope (same posture as Bloomreach Spec 139). |
