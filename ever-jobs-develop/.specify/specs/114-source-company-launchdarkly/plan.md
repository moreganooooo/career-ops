# Plan: 114 — Source Company Plugin: LaunchDarkly

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

LaunchDarkly's careers board is hosted on Greenhouse at the
slug `launchdarkly`. Mirror PlanetScale (Spec 100) byte-for-
byte — PlanetScale is the closest behavioural cousin sharing
four axes: D-04 variant 2 + D-08 + D-09 case-asymmetric
PascalCase + D-11 omitted.

**One structural deviation** from PlanetScale:

1. **D-10 APPLIED with trailing-pad form.** PlanetScale is
   D-10 omitted (0/6 padded); LaunchDarkly's wire shows 3 of
   45 titles padded with single-trailing-ASCII-space form
   (~6.7 % pad rate). The plugin applies `.trim()` to the
   wire `title` before downstream filters and emit. **Thirty-
   eighth cohort plugin to apply D-10**.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-launchdarkly`          | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `LAUNCHDARKLY = 'launchdarkly'` (Phase 124).              |
| `packages/plugins/index.ts`                             | import + register `LaunchdarklyModule` in `ALL_SOURCE_MODULES`. |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-launchdarkly`.            |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `launchdarkly` row as shipped.                             |
| `docs/index.md` / `docs/log.md`                         | run-#324 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| TWO-cap PascalCase wire form may surprise downstream consumers (slug `launchdarkly` vs wire `'LaunchDarkly'`). | Pinned in fixture + asserted byte-for-byte. |
| Trailing-pad title may rotate off the wire.         | D-10 lock pinned via fixture; cross-regression covers cohort. |
