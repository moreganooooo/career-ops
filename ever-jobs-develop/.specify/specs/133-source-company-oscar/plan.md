# Plan: 133 — Source Company Plugin: Oscar

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

Oscar's careers board is hosted on Greenhouse at the slug
`oscar`. Mirror Squarespace (Spec 088) — Squarespace is the
closest behavioural cousin sharing the rare HTTP-scheme D-04
sub-axis plus D-08 + D-10 applied + D-11 omitted axes.

**Two structural deviations** from Squarespace:

1. **D-04 wire-shape variant 35** — HTTP + www + parent-
   domain `hioscar.com` + `/careers/<id>` id-in-path + gh_jid
   query (first cohort observation; sister to Squarespace's
   variant 22 HTTP + query-only id + `/about/careers`).
2. **D-09 first-cohort slug-extra-word asymmetric wire form** —
   slug `oscar` (5 bytes) vs wire `'Oscar Health'` (12 bytes —
   adds entire second token `' Health'` beyond the slug).
   Distinct from prior internal-whitespace cases.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-oscar`                 | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `OSCAR = 'oscar'` (Phase 143).                           |
| `packages/plugins/index.ts`                             | import + register `OscarModule` in `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-oscar`.                   |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                              |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `oscar` row as shipped.                                    |
| `docs/index.md` / `docs/log.md`                         | run-#343 entry.                                                 |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Variant 35 has HTTP scheme + parent-domain mismatch — multiple new sub-axes. | Pinned in fixture + asserted byte-for-byte. |
| Slug-extra-word D-09 asymmetry is first-cohort observation — downstream consumers may expect slug-matching wire. | Wire `'Oscar Health'` pinned; pass-through is byte-for-byte. |
