# Plan: 140 — Source Company Plugin: Celonis

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Celonis's careers board is hosted on Greenhouse at the slug
`celonis`. Mirror Doximity (Spec 127) byte-for-byte —
Doximity is the closest behavioural cousin sharing all five
primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
D-10 applied + D-11 omitted.

**Zero structural deviations** from Doximity — making this
the **thirty-sixth** Greenhouse-only company-direct plugin
in run-history to ship as a clean re-spin.

**Third-cohort D-10 leading-pad observation:** 3 of 26 padded
titles carry a leading single-ASCII-space (`' Field CTO'`,
`' Principal Enterprise Architect (public sector)'`,
`' Salesforce Software Engineer '`); the rest (23) are
trailing-only. **First cohort observation of meaningful-
volume leading-pad sub-axis** — Chainguard (Spec 122) and
Oscar (Spec 133) saw 1 each; Celonis sees 3. `.trim()`
covers both directions; the third sample is dual-padded
(leading + trailing).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                              |
| ------------------------------------------------------- | ------------------------------------------------------------------- |
| `packages/plugins/source-company-celonis`               | **new package**.                                                    |
| `packages/models/src/enums/site.enum.ts`                | append `CELONIS = 'celonis'` (Phase 150).                           |
| `packages/plugins/index.ts`                             | import + register `CelonisModule` in `ALL_SOURCE_MODULES`.          |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-celonis`.                     |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                  |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `celonis` row as shipped.                                      |
| `docs/index.md` / `docs/log.md`                         | run-#350 entry.                                                     |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Leading-pad title forms (`' Field CTO'`) may surprise downstream consumers expecting trailing-only padding patterns. | `.trim()` is direction-agnostic — both leading and trailing single-ASCII-space pads strip cleanly; observability noted in test + docblock. |
