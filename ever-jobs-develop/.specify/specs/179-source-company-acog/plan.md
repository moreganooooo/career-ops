# Plan: 179 — Source Company Plugin: ACOG

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-19 |
| Last updated | 2026-05-19 |

## 1. Approach

ACOG's careers board is hosted on Greenhouse at the slug
`acog`. Mirror ACLU byte-for-byte across three primary
axes (D-04 variant 2 + D-08 + D-10 trailing-pad applied),
with **two structural deviations**:

1. **D-09 sub-axis:** ACLU's "all-caps acronym + space-
   hyphen-space separator + multi-token suffix → first-
   token-only-lowercase slug-truncation" (`'ACLU - National
   Office'` 22 bytes — 4 wire-tokens, first-token-only-
   lowercase, 3 trailing tokens dropped) → **acronym-by-
   initials slug derivation from a multi-token PascalCase +
   lowercase-connector wire form** (`'American College of
   Obstetricians and Gynecologists'` 51 bytes — 6 wire-
   tokens split by ASCII spaces: `American` (8-byte
   PascalCase, cap at byte 0 only), `College` (7-byte
   PascalCase, cap at byte 0 only), `of` (2-byte all-
   lowercase connector), `Obstetricians` (13-byte
   PascalCase, cap at byte 0 only), `and` (3-byte all-
   lowercase connector), `Gynecologists` (13-byte
   PascalCase, cap at byte 0 only); slug `acog` formed by
   sampling the first letter of each PascalCase wire-token
   (A from American, C from College, O from Obstetricians,
   G from Gynecologists), skipping the 2 lowercase-connector
   tokens, all lowercased). The wire `company_name` flows
   through byte-for-byte (no `.trim()` no-op overlay needed
   since the wire is already pad-free). **First cohort
   observation of (a) acronym-by-initials slug derivation
   from a multi-token wire form (no single wire-token
   contains the slug as a substring) AND (b) all-lowercase
   connector-token skip in slug derivation.**
2. **D-11 sub-axis:** ACLU's "trailing-pad applied (1 of 14
   unique departments padded)" → **clean pass-through** (0
   of 6 unique departments padded; wire `departments[0]
   .name` flows through byte-for-byte).

**Notable cohort observations:**

- 78th variant-2 plugin in the cohort.
- 1st cohort plugin with acronym-by-initials D-09 slug
  derivation (no single wire-token contains the slug as a
  substring).
- 1st cohort plugin with all-lowercase connector-token skip
  in slug derivation.
- 135th cohort plugin to apply D-08.
- 82nd cohort plugin to apply D-10 (trailing-pad form, 1/6
  ≈ 16.7 % pad rate).
- 106th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 5th plugin in the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acog`                  | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACOG = 'acog'` (Phase 189).                                      |
| `packages/plugins/index.ts`                             | import + register `AcogModule` in `ALL_SOURCE_MODULES`.                  |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acog`.                             |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acog` row as shipped.                                              |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `ACOG` row in Greenhouse company-direct section.                     |
| `docs/index.md` / `docs/log.md`                         | run-#389 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| ACOG's small board (~6 visible roles) may rotate slowly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-389 probe sample. |
| The acronym-by-initials + connector-skip D-09 form is structurally novel (first cohort observation of two sub-pattern threads). | The plugin emits `listing.company_name` byte-for-byte without interpretation — the D-09 form is metadata for the cohort observation log and does not change the emitted DTO shape. The test spec adds an explicit D-09 acronym-by-initials lock case asserting the byte-for-byte wire form, the 6-wire-token split, the 4 PascalCase + 2 lowercase-connector token classification, and the first-letter-sampling-with-connector-skip slug derivation. |
| Single location string (`'Washington, DC'`) across all listings may yield uniform location shape. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
