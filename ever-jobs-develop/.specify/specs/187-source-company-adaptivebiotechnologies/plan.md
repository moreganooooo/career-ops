# Plan: 187 — Source Company Plugin: Adaptive Biotechnologies

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-27 |
| Last updated | 2026-05-27 |

## 1. Approach

Adaptive Biotechnologies' careers board is hosted on
Greenhouse at the slug `adaptivebiotechnologies`. Mirror
Acurus Solutions (Spec 186) with **one structural
deviation**: D-04 sub-axis (variant 2 (canonical Greenhouse
host) → **NEW variant 47** (first cohort observation):
HTTPS + `www.`-prefixed truncated-bare-brand `.com` (drop
`nologies` from `biotechnologies` → 19-byte domain
`adaptivebiotech.com`) + 2-segment `/career-listings/listing`
apply-page path without trailing slash + single-id
`?gh_jid=<id>` query).

**Notable cohort observations:**

- **NEW wire-shape variant 47** (first cohort observation;
  50th distinct wire-shape variant overall).
- **First cohort observation of brand-domain-token-
  truncation** (slug retains full `biotechnologies` while
  domain drops `nologies`).
- **First cohort observation of no-trailing-slash 2-segment
  apply-page path within a NEW-variant D-04 observation**
  (Textio variant 46 at Spec 174 carried a *trailing-slash*
  `/careers/apply/` path).
- **First cohort observation of single-id `?gh_jid=`-only
  query within a NEW-variant D-04 observation** (Textio
  variant 46 carried dual-id `?job=<id>&gh_jid=<id>`).
- 134th D-09 omission (canonical case-symmetric 2-token
  PascalCase sub-form — third near-clean re-spin of the
  multi-token case-symmetric PascalCase sub-form after
  Acquia Spec 182 and Acumen Spec 185 single-token sub-
  forms).
- 87th D-10 application (trailing-pad form, 1/13 padded
  ~7.7 %).
- 114th cohort plugin with fully-clean department pass-
  through (D-11 omitted).
- 143rd cohort plugin to apply D-08.
- 13th plugin in the eleventh fresh probe sweep.
- 176th Greenhouse-backed company-direct plugin.
- One structural deviation off Acurus Solutions template.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 10-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 10 tests green; cross-regression sweep unchanged
  green; CI all green.

## 3. Packages Touched

| Package                                                         | Change                                                                  |
| --------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-adaptivebiotechnologies`       | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                        | append `ADAPTIVEBIOTECHNOLOGIES = 'adaptivebiotechnologies'` (Phase 197). |
| `packages/plugins/index.ts`                                     | import + register `AdaptiveBiotechnologiesModule` in `ALL_SOURCE_MODULES`. |
| `tsconfig.base.json`                                            | path alias `@ever-jobs/source-company-adaptivebiotechnologies`.          |
| `jest.config.js`                                                | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                               | add `adaptivebiotechnologies` row above Acurus Solutions.                |
| `docs/COMPANY_SLUG_DIRECTORY.md`                                | add `Adaptive Biotechnologies` row in Greenhouse company-direct section. |
| `docs/index.md` / `docs/log.md`                                 | run-#397 entry.                                                          |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| First cohort observation of D-04 NEW variant 47 — fields are byte-for-byte different from variant 2 (truncated-brand-domain, no-trailing-slash apply-page path, single-id query). | Spec § 1, § 10 D-04 capture the wire-form byte-for-byte. Test spec includes an explicit D-04 NEW variant-47 URL lock with regex match + negative pin against variant-2 and variant-46 sub-forms. |
| Alphabetical insertion order between `AcurussolutionsModule` and `AdyenModule`. | `'adaptivebiotechnologies'` sorts after `'acurussolutions'` and before `'adyen'`; insert at that position in `ALL_SOURCE_MODULES`, `Site` enum, `tsconfig.base.json`, `jest.config.js`. |
