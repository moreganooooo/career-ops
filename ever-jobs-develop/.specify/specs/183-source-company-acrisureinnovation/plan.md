# Plan: 183 — Source Company Plugin: Acrisure Innovation

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-21 |
| Last updated | 2026-05-21 |

## 1. Approach

Acrisure Innovation's careers board is hosted on Greenhouse at
the slug `acrisureinnovation`. Mirror AccuWeather (Spec 175)
with **one structural deviation**:

- **D-11 sub-axis:** AccuWeather applied D-11 (`.trim()` on
  department name, 2/15 unique departments padded) →
  **omitted** (clean pass-through, 0/4 unique departments
  padded).

The **D-10 sub-axis** differs in **pad-position sub-form**:
AccuWeather's was trailing-only; Acrisure Innovation's is
the new **leading-and-trailing-mixed** sub-form (1 leading-
only-pad listing + 1 leading-and-trailing-pad listing on the
same fixture). This is a **first cohort observation** of the
leading-AND-trailing pad sub-form on a single listing.

**Notable cohort observations:**

- 82nd variant-2 plugin in the cohort.
- 130th D-09 omission.
- 84th D-10 application (with first cohort observation of
  leading-AND-trailing-pad sub-form).
- 110th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 139th cohort plugin to apply D-08.
- 9th plugin in the eleventh fresh probe sweep.
- 172nd Greenhouse-backed company-direct plugin.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep (Acrisure +
  Acquia + ACP + aCommerce + ACOG) unchanged green; CI all
  green.

## 3. Packages Touched

| Package                                                          | Change                                                                              |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/plugins/source-company-acrisureinnovation`             | **new package**.                                                                    |
| `packages/models/src/enums/site.enum.ts`                         | append `ACRISUREINNOVATION = 'acrisureinnovation'` (Phase 193).                     |
| `packages/plugins/index.ts`                                      | import + register `AcrisureInnovationModule` in `ALL_SOURCE_MODULES` (alphabetical insertion between `AcquiaModule` and `AdyenModule`). |
| `tsconfig.base.json`                                             | path alias `@ever-jobs/source-company-acrisureinnovation`.                          |
| `jest.config.js`                                                 | matching `moduleNameMapper` entry.                                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                                | mark `acrisureinnovation` row as shipped.                                           |
| `docs/COMPANY_SLUG_DIRECTORY.md`                                 | add `Acrisure Innovation` row in Greenhouse company-direct section.                 |
| `docs/index.md` / `docs/log.md`                                  | run-#393 entry.                                                                     |

## 4. Risks / Mitigations

| Risk                                                                                  | Mitigation                                                                                                          |
| ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| First-cohort observation of the leading-and-trailing-pad sub-form may regress later. | `.trim()` strips both leading and trailing whitespace uniformly — no special handling required; fixture pins both sub-forms. |
| Board may carry zero listings on subsequent runs (transient hiring freeze).           | The probe at run-393 start confirmed 15 live roles; plugin's empty-payload path returns `{ jobs: [] }` gracefully. |
