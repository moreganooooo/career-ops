# Plan: 125 — Source Company Plugin: Descope

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Descope's careers board is hosted on Greenhouse at the slug
`descope`. Mirror Branch (Spec 121) — Branch is the closest
behavioural cousin sharing four axes: D-04 variant 2 + D-08 +
D-09 case-symmetric + D-10 omitted.

**One structural deviation** from Branch:

1. **D-11 APPLIED with trailing-pad form.** Branch is D-11
   omitted (0/11 padded); Descope's wire shows 6 of 8 listings
   carry padded `departments[0].name` (~75 % listing-level pad
   rate — **highest D-11 listing-level pad rate observed in
   the cohort to date**). 2 of 3 unique dept names padded:
   `'Customer Success '`, `'Engineering '`. The plugin applies
   `.trim()` to the wire `departments[0].name` before
   downstream emit. **Eleventh cohort plugin to apply D-11**.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-descope`               | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `DESCOPE = 'descope'` (Phase 135).                       |
| `packages/plugins/index.ts`                             | import + register `DescopeModule` in `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-descope`.                 |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `descope` row as shipped.                                  |
| `docs/index.md` / `docs/log.md`                         | run-#335 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| 75% D-11 listing-level pad rate is unusually high; if Descope cleans up upstream the trim becomes a no-op. | D-11 lock pinned via fixture; cross-regression covers cohort. |
