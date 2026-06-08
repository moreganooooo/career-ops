# Plan: 178 — Source Company Plugin: ACLU

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-18 |
| Last updated | 2026-05-18 |

## 1. Approach

ACLU's National Office careers board is hosted on Greenhouse
at the slug `aclu`. Mirror AccuWeather byte-for-byte across
four primary axes (D-04 variant 2 + D-08 + D-10 trailing-pad
applied + D-11 trailing-pad applied), with **one structural
deviation**:

1. **D-09 sub-axis:** AccuWeather's "TWO-cap PascalCase +
   slug-truncation" (`'AccuWeather Careers'` 19 bytes — 2
   tokens, caps at indices 0/4 of the first token, 1
   trailing PascalCase token dropped) → **all-caps acronym +
   space-hyphen-space separator + multi-token suffix → first-
   token-only-lowercase slug-truncation** (`'ACLU - National
   Office'` 22 bytes — 4 wire-tokens split by ASCII spaces:
   `ACLU` (4-byte all-caps acronym, caps at every byte
   0/1/2/3), `-` (1-byte ASCII hyphen separator), `National`
   (8-byte PascalCase), `Office` (6-byte PascalCase); 3 wire-
   tokens dropped including the ASCII-hyphen separator;
   yielding the 4-byte lowercase slug `aclu`). The wire
   `company_name` flows through byte-for-byte (no `.trim()`
   no-op overlay needed since the wire is already pad-free).
   **First cohort observation of (a) an ASCII-hyphen wire-
   token being dropped in a slug-truncation D-09 sub-form
   AND (b) an all-caps acronym as the first wire-token of a
   slug-truncation D-09 sub-form.**

**Notable cohort observations:**

- 77th variant-2 plugin in the cohort.
- 1st cohort plugin with an ASCII-hyphen wire-token drop in
  a slug-truncation D-09 sub-form.
- 1st cohort plugin with an all-caps acronym as the first
  wire-token of a slug-truncation D-09 sub-form.
- 134th cohort plugin to apply D-08.
- 81st cohort plugin to apply D-10 (trailing-pad form, 2/40
  ≈ 5.0 % pad rate).
- 22nd cohort plugin to apply D-11 (trailing-pad form, 1/14
  unique padded depts).
- 4th plugin in the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-aclu`                  | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACLU = 'aclu'` (Phase 188).                                      |
| `packages/plugins/index.ts`                             | import + register `AcluModule` in `ALL_SOURCE_MODULES`.                  |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-aclu`.                             |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `aclu` row as shipped.                                              |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `ACLU` row in Greenhouse company-direct section.                     |
| `docs/index.md` / `docs/log.md`                         | run-#388 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| ACLU's large board (~40 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-388 probe sample. |
| The all-caps-acronym + hyphen-separator + slug-truncation D-09 form is structurally novel (first cohort observation of two sub-pattern threads). | The plugin emits `listing.company_name` byte-for-byte without interpretation — the D-09 form is metadata for the cohort observation log and does not change the emitted DTO shape. The test spec adds an explicit D-09 acronym + hyphen-separator + slug-truncation lock case asserting the byte-for-byte wire form, the 4-wire-token split, the all-caps caps pattern, the hyphen separator at wire-token index 1, the 3 dropped wire-tokens, and the first-token-only-lowercase slug derivation. |
| 8 distinct location strings (including multi-location compound strings separated by `; `) may yield inconsistent location shapes. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
