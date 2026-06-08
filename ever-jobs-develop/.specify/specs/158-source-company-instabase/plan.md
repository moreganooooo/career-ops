# Plan: 158 — Source Company Plugin: Instabase

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Instabase's careers board is hosted on Greenhouse at the slug
`instabase`. Mirror Melio (Spec 130) byte-for-byte — Melio
is the closest behavioural cousin sharing all five primary
axes: D-04 variant 2 + D-08 + D-09 case-symmetric + D-10
applied + D-11 applied (trailing-pad form).

**Zero structural deviations** from Melio — making this the
**forty-second** Greenhouse-only company-direct plugin in
run-history to ship as a clean re-spin.

**Notable D-10 sub-axis observation:** 7th cohort observation
of leading-pad sub-axis after Chainguard / Oscar / Celonis /
Formlabs / GoFundMe / BitGo.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-instabase`             | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `INSTABASE = 'instabase'` (Phase 168).                           |
| `packages/plugins/index.ts`                             | import + register `InstabaseModule` in `ALL_SOURCE_MODULES`.            |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-instabase`.                       |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `instabase` row as shipped.                                        |
| `docs/index.md` / `docs/log.md`                         | run-#368 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| `'Finance/Accounting '` wire dept name contains `/` separator — downstream consumers may parse as path. | Plugin emits `listing.departments[0].name.trim()` byte-for-byte; downstream rendering / parsing is out-of-scope. |
