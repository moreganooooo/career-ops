# Plan: 185 — Source Company Plugin: Acumen

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-23 |
| Last updated | 2026-05-23 |

## 1. Approach

Acumen's careers board is hosted on Greenhouse at the slug
`acumen`. Mirror Tatari (Spec 173) byte-for-byte with
**zero structural deviations** — clean re-spin off the
canonical variant-2 + D-08 + D-09 omitted (case-symmetric
bare-brand single-token PascalCase) + D-10 applied
(trailing-pad form) + D-11 omitted template.

**Notable cohort observations:**

- 84th variant-2 plugin in the cohort.
- 132nd D-09 omission (case-symmetric bare-brand single-
  token PascalCase 6-byte sub-form, slug = byte-for-byte
  lowercase of wire).
- 85th D-10 application (trailing-pad form, 1/9 padded
  ~11.1%).
- 112th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 141st cohort plugin to apply D-08.
- 11th plugin in the eleventh fresh probe sweep.
- 174th Greenhouse-backed company-direct plugin.
- Clean re-spin (zero structural deviations off Tatari).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acumen`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACUMEN = 'acumen'` (Phase 195).                                  |
| `packages/plugins/index.ts`                             | import + register `AcumenModule` in `ALL_SOURCE_MODULES`.                |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acumen`.                           |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add `acumen` row above Acryl Data.                                       |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Acumen` row in Greenhouse company-direct section.                   |
| `docs/index.md` / `docs/log.md`                         | run-#395 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Clean re-spin profile off Tatari — no novel observations to capture. | Re-spins validate cohort thresholds and exercise the existing axis pipelines. Test spec mirrors the standard cohort baseline. |
| Alphabetical insertion order between `AcryldataModule` and `AdyenModule`. | `'acumen'` sorts after `'acryldata'` and before `'adyen'`; insert at that position in `ALL_SOURCE_MODULES`, `Site` enum, `tsconfig.base.json`, `jest.config.js`. |
