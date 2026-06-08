# Plan: 180 — Source Company Plugin: aCommerce

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-20 |
| Last updated | 2026-05-20 |

## 1. Approach

aCommerce's careers board is hosted on Greenhouse at the slug
`acommerce`. Mirror ACOG byte-for-byte across three primary
axes (D-04 variant 2 + D-08 + D-10 trailing-pad applied +
D-11 omitted), with **one structural deviation**:

1. **D-09 sub-axis:** ACOG's "acronym-by-initials slug
   derivation from a multi-token PascalCase + lowercase-
   connector wire form" (`'American College of Obstetricians
   and Gynecologists'` 51 bytes — 6 wire-tokens, 4
   PascalCase + 2 lowercase-connector; slug `acog` formed by
   sampling first letter of each PascalCase wire-token with
   connector-skip) → **single-token camelCase ONE-cap-at-
   byte-1 wire form** (`'aCommerce'` 9 bytes — single wire-
   token; byte 0 `'a'` lowercase, byte 1 `'C'` UPPERCASE
   (sole cap), bytes 2-8 `'ommerce'` all lowercase; slug
   `acommerce` is byte-for-byte lowercase of wire — formed
   by lowercasing byte 1 (`'C'` → `'c'`) and leaving the
   other 8 bytes unchanged). The wire `company_name` flows
   through byte-for-byte (no `.trim()` no-op overlay needed
   since the wire is already pad-free). **First cohort
   observation of (a) single-token camelCase classical wire
   form (lowercase-prefix + single-cap + lowercase-tail)
   AND (b) cap-at-byte-1-only D-09 sub-pattern.** Prior
   ONE-cap observations all carried the cap at byte 0
   (PascalCase classical). Prior lowercase-first observation
   at xAI (Spec 103) carried TWO caps at bytes 1 and 2
   (`'xAI'`), not a single cap with lowercase tail.

**Notable cohort observations:**

- 79th variant-2 plugin in the cohort.
- 1st cohort plugin with single-token camelCase classical
  ONE-cap-at-byte-1 D-09 sub-pattern (lowercase-prefix +
  single-cap + lowercase-tail).
- 136th cohort plugin to apply D-08.
- 83rd cohort plugin to apply D-10 (trailing-pad form, 9/60
  ≈ 15.0 % pad rate).
- 107th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 6th plugin in the eleventh fresh probe sweep.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 9-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 9 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-acommerce`             | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `ACOMMERCE = 'acommerce'` (Phase 190).                            |
| `packages/plugins/index.ts`                             | import + register `AcommerceModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-acommerce`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `acommerce` row as shipped.                                         |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `aCommerce` row in Greenhouse company-direct section.                |
| `docs/index.md` / `docs/log.md`                         | run-#390 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| The single-token camelCase ONE-cap-at-byte-1 D-09 form is structurally novel (first cohort observation of two sub-pattern threads). | The plugin emits `listing.company_name` byte-for-byte without interpretation — the D-09 form is metadata for the cohort observation log and does not change the emitted DTO shape. The test spec adds an explicit D-09 camelCase ONE-cap-at-byte-1 lock case asserting the byte-for-byte wire form, the 9-byte length, the cap-at-byte-1-only invariant, and the lowercase-tail invariant. |
| Multi-country locations (Bangkok, Jakarta, Manila / Taguig, Singapore, KL; some listings carry compound locations like `'All Location; Bangkok, Thailand; Jakarta, Indonesia; Taguig, Philippines'`) may yield diverse location strings. | `JobPostDto.location.city` is the raw `location.name` field — downstream consumers normalise via `LocationDto`; the plugin does not interpret. |
| Several titles use `' - '` ASCII-hyphen-space-around separator (`'Manager - Accounting'`, `'Senior Specialist - Co-Producer'`) — could conflict with future slug-derivation passes. | The plugin emits `listing.title` byte-for-byte (after `.trim()` overlay) without splitting on hyphens. |
