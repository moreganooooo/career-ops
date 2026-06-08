# Plan: 172 — Source Company Plugin: Symphony

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-09 |
| Last updated | 2026-05-09 |

## 1. Approach

Symphony's careers board is hosted on Greenhouse at the slug
`symphony` but with a custom vanity-domain wire URL form
`https://symphony.com/company/apply?gh_jid=<id>`. Mirror
Descope (Spec 125) for the trim-axis profile (D-10 omitted +
D-11 applied) and Samsara (Spec 168) for the vanity-domain
wire URL pass-through pattern.

**Two structural deviations** from Descope:

1. **D-04 sub-axis** — variant 2 → **NEW variant 45 (first
   cohort observation)**: HTTPS + bare brand-domain `.com`
   (no `www.`) + 2-segment `/company/apply` apply-page path
   + query-only `?gh_jid=<id>` form. **Forty-eighth distinct
   wire-shape variant** in the company-direct cohort.
2. **D-09 sub-axis** — case-symmetric bare brand → **fifth-
   cohort slug-truncation multi-token corp-suffix descriptive
   entity wire form** (after Oscar / BEAM / Founders / Fox).

The trim semantics remain unchanged at the `.trim()`
boundary.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-symphony`              | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `SYMPHONY = 'symphony'` (Phase 182).                             |
| `packages/plugins/index.ts`                             | import + register `SymphonyModule` in `ALL_SOURCE_MODULES`.             |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-symphony`.                        |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `symphony` row as shipped.                                         |
| `docs/index.md` / `docs/log.md`                         | run-#382 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Symphony's variant-45 vanity-domain URL is a first cohort observation; downstream consumers may not recognise the host. | The wire `absolute_url` is preserved byte-for-byte (canonical destination); a variant-2 fallback is supplied for guaranteed-resolvable downstream behaviour when the wire omits the field. |
| Symphony's wire `company_name` is a multi-token descriptive corp-suffix entity name; downstream consumers expecting bare brand may surface "Symphony Communication Services" rather than "Symphony". | Pass-through is wire-faithful; cohort convention is to preserve `company_name` byte-for-byte. Downstream normalisation is out-of-scope. |
