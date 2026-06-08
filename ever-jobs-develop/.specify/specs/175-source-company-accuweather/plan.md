# Plan: 175 — Source Company Plugin: AccuWeather

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-15 |
| Last updated | 2026-05-15 |

## 1. Approach

AccuWeather's careers board is hosted on Greenhouse at the
slug `accuweather`. Mirror Tatari (Spec 173) byte-for-byte
across three primary axes (D-04 variant 2 + D-08 + D-10
applied with trailing-pad form), with **two structural
deviations**:

1. **D-09 sub-axis:** case-symmetric bare-brand `'Tatari'`
   → **simultaneous TWO-cap PascalCase + slug-truncation**
   `'AccuWeather Careers'`. The wire `company_name` carries
   PascalCase asymmetry at byte indices 0/4 of `AccuWeather`
   (matches `accuweather` slug at the lowercase byte level)
   AND drops 1 trailing token `Careers`. **First cohort
   observation of TWO-cap PascalCase + slug-truncation co-
   occurring in the same wire `company_name`.**
2. **D-11 sub-axis:** clean pass-through → trailing-pad
   applied (2 of 15 unique departments padded —
   `'Facilities '`, `'Information Systems '`).

The plugin emits `listing.company_name` byte-for-byte (no
`.trim()` no-op overlay needed since the wire is already
pad-free); the only behavioural shift vs Tatari is the
addition of a `.trim()` on `listing.departments[0].name`.

**Notable cohort observations:**

- 75th variant-2 plugin in the cohort.
- 9th cohort plugin with TWO-cap PascalCase D-09 sub-axis.
- 6th cohort observation of slug-truncation D-09 sub-axis
  (1 trailing token dropped — new shortest non-zero
  truncation factor).
- 80th cohort plugin to apply D-10 (trailing-pad form,
  ~23.3 % pad rate — cohort-wide new high-watermark since
  SimpliSafe).
- 21st cohort plugin to apply D-11.
- 1st cohort observation of the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-accuweather`           | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACCUWEATHER = 'accuweather'` (Phase 185).                       |
| `packages/plugins/index.ts`                             | import + register `AccuWeatherModule` in `ALL_SOURCE_MODULES`.          |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-accuweather`.                     |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `accuweather` row as shipped.                                      |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `AccuWeather` row in Greenhouse company-direct section.             |
| `docs/index.md` / `docs/log.md`                         | run-#385 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| AccuWeather's small board (~30 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-385 probe sample. |
| Simultaneous TWO-cap PascalCase + slug-truncation D-09 form is structurally novel (first cohort observation). | The plugin treats `company_name` as a faithful pass-through (no normalisation); downstream `JobPostDto.companyName` reflects the wire byte-for-byte. The test spec adds an explicit D-09 lock case asserting the 19-byte wire form. |
| ~23.3 % D-10 pad rate is the highest in cohort history since SimpliSafe (~14.3 %). | Behaviour is wire-faithful; `.trim()` flattens both trailing-pad and clean forms symmetrically. Recorded as a high-watermark sub-observation under D-10. |
