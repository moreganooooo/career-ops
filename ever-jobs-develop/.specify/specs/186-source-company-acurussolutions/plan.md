# Plan: 186 — Source Company Plugin: Acurus Solutions

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-27 |
| Last updated | 2026-05-27 |

## 1. Approach

Acurus Solutions' careers board is hosted on Greenhouse at
the slug `acurussolutions`. Mirror Acumen (Spec 185) with
**one structural deviation**: D-09 sub-axis (case-symmetric
bare-brand single-token PascalCase 6-byte → first cohort
observation of 2-token-prefix PascalCase slug-truncation from
4-token all-PascalCase wire form with corporate-legal-
suffix-drop — drop `'Private Limited'` legal-entity suffix
from `'Acurus Solutions Private Limited'` 32-byte wire →
keep first-2-tokens `'Acurus Solutions'` 16 bytes → space-
strip + lowercase → 15-byte slug `acurussolutions`).

**Notable cohort observations:**

- 85th variant-2 plugin in the cohort.
- 133rd D-09 omission. **First cohort observation of 2-
  token-prefix PascalCase slug-truncation D-09 sub-form**.
  **First cohort observation of corporate-legal-suffix-drop
  slug-truncation** (drop `'Private Limited'`). **First
  cohort observation of 4-token all-PascalCase wire form
  with slug-truncation D-09 sub-form**. **Fourth cohort
  observation of slug-truncation D-09 sub-form overall**
  (after AccuWeather drop-1, ACLU drop-3, ACOG initials-
  derivation).
- 86th D-10 application (trailing-pad form, 1/12 padded
  ~8.3 %).
- 113th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 142nd cohort plugin to apply D-08.
- 12th plugin in the eleventh fresh probe sweep.
- 175th Greenhouse-backed company-direct plugin.
- One structural deviation off Acumen template.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                         | Change                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acurussolutions`               | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                        | append `ACURUSSOLUTIONS = 'acurussolutions'` (Phase 196).                |
| `packages/plugins/index.ts`                                     | import + register `AcurussolutionsModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                            | path alias `@ever-jobs/source-company-acurussolutions`.                  |
| `jest.config.js`                                                | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                               | add `acurussolutions` row above Acumen.                                  |
| `docs/COMPANY_SLUG_DIRECTORY.md`                                | add `Acurus Solutions` row in Greenhouse company-direct section.         |
| `docs/index.md` / `docs/log.md`                                 | run-#396 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| First cohort observation of corporate-legal-suffix-drop slug-truncation D-09 sub-form. | Spec § 1 & § 10 D-09 capture the wire-form and slug-derivation byte-for-byte. Test spec includes an explicit D-09 lock for the 4-token PascalCase wire and the drop-2 slug-truncation derivation. |
| Alphabetical insertion order between `AcumenModule` and `AdyenModule`. | `'acurussolutions'` sorts after `'acumen'` and before `'adyen'`; insert at that position in `ALL_SOURCE_MODULES`, `Site` enum, `tsconfig.base.json`, `jest.config.js`. |
