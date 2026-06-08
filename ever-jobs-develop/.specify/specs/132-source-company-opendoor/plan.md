# Plan: 132 — Source Company Plugin: Opendoor

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Opendoor's careers board is hosted on Greenhouse at the slug
`opendoor`. Mirror Dremio (Spec 128) — Dremio is the closest
behavioural cousin sharing four axes: D-08 + D-09 case-
symmetric + D-10 applied + D-11 omitted, AND the closest
D-04 sister (HTTPS + www + query-only-id on `/careers/...`
path).

**One structural deviation** from Dremio:

1. **D-04 wire-shape variant 34** — HTTPS-scheme `www.`-
   prefixed brand-domain `/careers/open-positions` query-
   only-id (first cohort observation; sister to Dremio's
   variant 33 `/careers/job-postings/`). Different leaf
   segment.

**First-cohort D-10 sub-axis observation:** one title carries
internal double-whitespace (`'Customer Experience  Specialist '`
— two consecutive spaces between words). `.trim()` strips
trailing pad; internal anomaly preserved byte-for-byte.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-opendoor`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `OPENDOOR = 'opendoor'` (Phase 142).                     |
| `packages/plugins/index.ts`                             | import + register `OpendoorModule` in `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-opendoor`.                |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `opendoor` row as shipped.                                 |
| `docs/index.md` / `docs/log.md`                         | run-#342 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 34 leaf path (no trailing slash) is a new sub-axis. | Pinned in fixture + asserted byte-for-byte. |
| Internal-double-whitespace title is first-cohort observation. | `.trim()` is leading/trailing only; test asserts internal anomaly preserved. |
