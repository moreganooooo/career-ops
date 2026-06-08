# Plan: 181 — Source Company Plugin: ACP

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-20 |
| Last updated | 2026-05-20 |

## 1. Approach

ACP's careers board is hosted on Greenhouse at the slug
`acp`. Mirror ACOG byte-for-byte across primary axes (D-04
variant 2 + D-08), with **two structural deviations**:

1. **D-10 sub-axis:** ACOG's "trailing-pad applied (1 of 6
   wire titles padded ~16.7 %)" → **omitted (clean pass-
   through)** (0 of 3 wire titles padded — defensive
   `.trim()` safe no-op).
2. **D-09 sub-axis (cardinality variant):** ACOG's "acronym-
   by-initials slug derivation from a multi-token PascalCase
   + lowercase-connector wire form" (`'American College of
   Obstetricians and Gynecologists'` 51 bytes — 6 wire-
   tokens, 4 PascalCase + 2 lowercase-connector) → **3
   PascalCase + 1 connector** (`'Academy with Community
   Partners'` 31 bytes — 4 wire-tokens, 3 PascalCase + 1
   lowercase-connector; slug `acp` formed by sampling first
   letter of each PascalCase wire-token with connector-skip).
   The **second cohort observation** of the acronym-by-
   initials D-09 sub-pattern with connector-skip.

**Notable cohort observations:**

- 80th variant-2 plugin in the cohort.
- 2nd cohort observation of acronym-by-initials D-09 slug
  derivation with connector-skip (after ACOG at Spec 179) —
  validates the ACOG sub-pattern at lower cardinality.
- 137th cohort plugin to apply D-08.
- 42nd cohort plugin to omit D-10.
- 108th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 7th plugin in the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acp`                   | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACP = 'acp'` (Phase 191).                                       |
| `packages/plugins/index.ts`                             | import + register `AcpModule` in `ALL_SOURCE_MODULES`.                   |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acp`.                              |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acp` row as shipped.                                               |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `ACP` row in Greenhouse company-direct section.                      |
| `docs/index.md` / `docs/log.md`                         | run-#391 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| ACP's small board (3 visible roles) limits fixture diversity. | The plugin is a thin wrapper that emits whatever the live board returns; the fixture pin is byte-for-byte against the run-391 probe sample. |
| The 3-character slug `acp` is shorter than most cohort slugs but matches prior 3-char observations (Fox, IBM, xAI). | No special handling required — the existing site-enum and module-discovery code is byte-agnostic. |
| Location field for every listing is `'Academy with Community Partners'` (i.e., wire `location.name` = wire `company_name`) — non-canonical for a Greenhouse board. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
