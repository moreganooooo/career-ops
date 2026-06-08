# Plan: 176 — Source Company Plugin: ACI Learning

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-16 |
| Last updated | 2026-05-16 |

## 1. Approach

ACI Learning's careers board is hosted on Greenhouse at the
slug `acilearning`. Mirror Collective Health byte-for-byte
across three primary axes (D-04 variant 2 + D-08 + D-10
omitted), with **one structural deviation**:

1. **D-09 sub-axis:** case-symmetric two-token space-strip
   (`'Collective Health'` 17 bytes) → **acronym-prefix +
   PascalCase-suffix + space-strip** (`'ACI Learning'` 12
   bytes). The wire `company_name` carries an all-caps 3-byte
   acronym in the first token (caps at 0/1/2 of `ACI`) AND a
   PascalCase 8-byte word in the second token (caps at 0 of
   `Learning`) AND a single internal ASCII space stripped to
   yield the lowercase 11-byte slug `acilearning`. **First
   cohort observation of acronym-prefix + PascalCase-suffix +
   space-strip D-09 sub-pattern co-occurring in the same
   wire `company_name`.**

The plugin emits `listing.company_name` byte-for-byte (no
`.trim()` no-op overlay needed since the wire is already
pad-free); the only behavioural shift vs Collective Health is
the addition of awareness around the acronym-prefix sub-
pattern in the brand wire.

**Notable cohort observations:**

- 76th variant-2 plugin in the cohort.
- 1st cohort plugin with an all-caps acronym prefix as the
  leading token of a space-strip multi-token wire form.
- 132nd cohort plugin to apply D-08.
- 40th cohort plugin to omit D-10.
- 105th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 2nd cohort observation of the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acilearning`           | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACILEARNING = 'acilearning'` (Phase 186).                       |
| `packages/plugins/index.ts`                             | import + register `AciLearningModule` in `ALL_SOURCE_MODULES`.          |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acilearning`.                     |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acilearning` row as shipped.                                      |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `ACI Learning` row in Greenhouse company-direct section.            |
| `docs/index.md` / `docs/log.md`                         | run-#386 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| ACI Learning's small board (~5 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-386 probe sample. |
| Acronym-prefix + PascalCase-suffix + space-strip D-09 form is structurally novel (first cohort observation). | The plugin treats `company_name` as a faithful pass-through (no normalisation); downstream `JobPostDto.companyName` reflects the wire byte-for-byte. The test spec adds an explicit D-09 lock case asserting the 12-byte wire form. |
| Multiple Tech Academy campus locations may yield inconsistent location strings. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
