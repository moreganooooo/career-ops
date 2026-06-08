# Plan: 130 — Source Company Plugin: Melio

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Melio's careers board is hosted on Greenhouse at the slug
`melio`. Mirror Descope (Spec 125) — Descope is the closest
behavioural cousin sharing four axes: D-04 variant 2 + D-08 +
D-09 case-symmetric + D-11 applied.

**One structural deviation** from Descope:

1. **D-10 APPLIED with trailing-pad form** (Descope D-10
   omitted at 0/8 padded; Melio 2 of 20 wire titles padded
   ~10 %). The plugin applies `.trim()` to the wire `title`
   before downstream filters and emit. **Fiftieth cohort
   plugin to apply D-10 — crosses the 50-plugin D-10-
   application threshold at this run.**

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-melio`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `MELIO = 'melio'` (Phase 140).                           |
| `packages/plugins/index.ts`                             | import + register `MelioModule` in `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-melio`.                   |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `melio` row as shipped.                                    |
| `docs/index.md` / `docs/log.md`                         | run-#340 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Trailing-pad `'Design '` is the only padded dept; could disappear if Melio cleans up. | D-11 lock pinned via fixture; cross-regression covers cohort. |
