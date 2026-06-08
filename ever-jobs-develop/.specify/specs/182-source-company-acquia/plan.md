# Plan: 182 — Source Company Plugin: Acquia

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-20 |
| Last updated | 2026-05-20 |

## 1. Approach

Acquia's careers board is hosted on Greenhouse at the slug
`acquia`. Mirror Coursera (Spec 068) byte-for-byte with
**zero structural deviations** — clean re-spin off the
canonical variant-2 + D-08 + D-09/D-10/D-11 all-omitted
template.

**Notable cohort observations:**

- 81st variant-2 plugin in the cohort.
- 129th D-09 omission.
- 43rd D-10 omission.
- 109th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 138th cohort plugin to apply D-08.
- 8th plugin in the eleventh fresh probe sweep.
- Clean re-spin (zero structural deviations).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acquia`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACQUIA = 'acquia'` (Phase 192).                                  |
| `packages/plugins/index.ts`                             | import + register `AcquiaModule` in `ALL_SOURCE_MODULES`.                |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acquia`.                           |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acquia` row as shipped.                                            |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Acquia` row in Greenhouse company-direct section.                   |
| `docs/index.md` / `docs/log.md`                         | run-#392 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Clean re-spin profile — no novel observations to capture. | Re-spins validate cohort thresholds and exercise the existing axis pipelines. Test spec mirrors the standard cohort baseline. |
