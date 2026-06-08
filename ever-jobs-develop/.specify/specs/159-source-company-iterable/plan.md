# Plan: 159 — Source Company Plugin: Iterable

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Iterable's careers board is hosted on Greenhouse at the slug
`iterable`. Mirror Alma (Spec 152) byte-for-byte except for
the D-10 sub-axis bump — Alma trailing-only → Iterable
mixed-pad including **8th cohort leading-pad observation**
after Chainguard / Oscar / Celonis / Formlabs / GoFundMe /
BitGo / Instabase.

**One structural deviation** from Alma — D-10 sub-axis
(trailing-only → mixed-pad with leading-pad).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-iterable`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ITERABLE = 'iterable'` (Phase 169).                             |
| `packages/plugins/index.ts`                             | import + register `IterableModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-iterable`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `iterable` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#369 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| `' FP&A Manager'` carries leading-pad — 8th cohort observation. | Plugin emits `listing.title.trim()` byte-for-byte to handle trailing + leading uniformly. |
