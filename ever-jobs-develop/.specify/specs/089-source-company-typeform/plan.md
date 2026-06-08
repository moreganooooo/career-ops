# Plan: 089 — Source Company Plugin: Typeform

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Mirror Lattice (Spec 074) byte-for-byte except for D-04 — Lattice
is variant 15 (bare brand-domain), Typeform is variant 2
(canonical Greenhouse host). The implementation difference is
just dropping the variant-2-fallback wrapper around
`listing.absolute_url ?? <constructor>` since Typeform's wire
shape IS variant 2.

Shared with Lattice: D-08 entity-decode-then-tag-strip, D-09
omitted with case-symmetric bare-brand wire form, D-10 omitted,
**D-11 applied with trailing-pad form**. Typeform is the third
cohort plugin to apply D-11.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 plugin tests green; helpers + cross-regression sweep
  unchanged green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-typeform`              | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `TYPEFORM = 'typeform'`.                                 |
| `packages/plugins/index.ts`                             | import + append `TypeformModule`.                               |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Typeform shipped row.                                       |
| `docs/index.md`                                         | append Spec 089 to the specs table.                             |
| `docs/log.md`                                           | run #299 entry at top — also documents fifth-sweep exhaustion.  |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01 — Wire `company_name` rename.** Mitigation: byte-for-byte
  assertion catches `'Typeform'` → `'Typeform, Inc.'` rename as
  test diff.
- **R-02 — Department pad-rate drift.** 3/22 padded; D-11 trim
  handles both directions.
