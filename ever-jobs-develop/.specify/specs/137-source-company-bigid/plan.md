# Plan: 137 — Source Company Plugin: BigID

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

BigID's careers board is hosted on Greenhouse at the slug
`bigid`. Mirror AssemblyAI (Spec 108) — AssemblyAI is the
closest behavioural cousin sharing four axes: D-08 + D-09
THREE-cap PascalCase + D-10 applied + D-11 applied.

**One structural deviation** from AssemblyAI:

1. **D-04 wire-shape variant 36 — HTTPS bare brand-domain
   `bigid.com` `/company/careers/job-details/<id>` id-in-path
   + gh_jid query (first cohort observation; thirty-ninth
   distinct wire-shape variant).** Sister to Okta's variant
   31 (www-prefixed sister with `opportunity/<id>` leaf).
   Second cohort observation of `/company/careers/<leaf>/<id>`
   path-prefix.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-bigid`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `BIGID = 'bigid'` (Phase 147).                           |
| `packages/plugins/index.ts`                             | import + register `BigIdModule` in `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-bigid`.                   |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `bigid` row as shipped.                                    |
| `docs/index.md` / `docs/log.md`                         | run-#347 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 36 with bare-brand-domain (no www) is novel sub-axis. | Pinned in fixture + asserted byte-for-byte. |
| THREE-cap PascalCase wire `'BigID'` may surprise downstream consumers expecting `'BigId'` or lowercase. | Wire pinned byte-for-byte; test asserts caps at 0/3/4. |
