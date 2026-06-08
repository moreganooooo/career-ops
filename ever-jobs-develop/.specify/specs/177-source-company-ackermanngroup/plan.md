# Plan: 177 — Source Company Plugin: Ackermann Group

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-17 |
| Last updated | 2026-05-17 |

## 1. Approach

Ackermann Group's careers board is hosted on Greenhouse at the
slug `ackermanngroup`. Mirror Shopmonkey byte-for-byte across
three primary axes (D-04 variant 10 + D-08 + D-10 omitted),
with **two structural deviations**:

1. **D-09 sub-axis:** case-symmetric bare-brand
   (`'Shopmonkey'` 10 bytes — 1 token) → **two-token
   PascalCase + space-strip** (`'Ackermann Group'` 15 bytes —
   2 tokens, both PascalCase with caps at byte index 0 of
   each token, single internal ASCII space stripped to yield
   14-byte slug `ackermanngroup`). The wire `company_name`
   flows through byte-for-byte (no `.trim()` no-op overlay
   needed since the wire is already pad-free).

2. **D-11 sub-axis:** clean pass-through-with-depts (Shopmonkey
   carries 6 unique populated depts clean) → **completely-
   absent-departments form** (0 of 12 Ackermann listings carry
   a department; wire `departments[]` array is empty for every
   listing). **First cohort observation of the completely-
   absent-departments sub-axis.** The plugin's
   `.departments?.[0]?.name ?? null` chain handles this
   transparently — every emitted JobPostDto carries
   `department === null`.

**Notable cohort observations:**

- 9th variant-10 plugin in the cohort (after Chime, Faire,
  Flexport, Braze, Descript, Justworks, Founders, Shopmonkey).
- 1st cohort plugin with the completely-absent-departments
  D-11 sub-axis.
- 133rd cohort plugin to apply D-08.
- 41st cohort plugin to omit D-10.
- 3rd cohort observation of the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-ackermanngroup`        | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACKERMANNGROUP = 'ackermanngroup'` (Phase 187).                  |
| `packages/plugins/index.ts`                             | import + register `AckermannGroupModule` in `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-ackermanngroup`.                  |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `ackermanngroup` row as shipped.                                   |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Ackermann Group` row in Greenhouse company-direct section.         |
| `docs/index.md` / `docs/log.md`                         | run-#387 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Ackermann Group's mid-sized board (~12 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-387 probe sample. |
| Completely-absent-departments D-11 form is structurally novel (first cohort observation). | The plugin's `.departments?.[0]?.name ?? null` chain is byte-count agnostic — `null` is returned for any listing whose `departments` array is empty, undefined, or missing entirely. The test spec adds an explicit D-11 absent-departments lock case asserting `department === null` for every emitted JobPostDto. |
| Multiple Ohio metro locations may yield inconsistent location strings. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
