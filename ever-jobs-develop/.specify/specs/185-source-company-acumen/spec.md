# Spec: 185 — Source Company Plugin: Acumen

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 185                                                                                                                                                                                            |
| Slug           | source-company-acumen                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #395)                                                                                                                                                                              |
| Created        | 2026-05-23                                                                                                                                                                                     |
| Last updated   | 2026-05-23                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..184                                                                                                                                                                        |

## 1. Problem Statement

Run #394's Spec 184 closed end-to-end (Acryl Data shipped —
tenth plugin in the eleventh fresh probe sweep; first cohort
observation of slug-not-derived-from-wire-company_name D-09
sub-form). Run #395 is the **eleventh** plugin in the
eleventh fresh probe sweep with **Acumen** (global impact-
investing nonprofit — 9 visible roles confirmed at run-395
start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acumen/jobs?content=true`).

Acumen, Inc. — operator of the **dominant patient-capital
impact-investing nonprofit pioneered around the Acumen Fund
data model** for catalytic equity-and-debt investments in
early-stage social enterprises across emerging markets
(founded by Jacqueline Novogratz in 2001 in New York City;
NYC-HQ 501(c)(3) nonprofit with a global footprint across
the United States, Latin America (Bogotá / Mumbai-adjacent
Investing teams in Kenya, Nigeria, India, Pakistan,
Colombia); operates the **Acumen Fund** (patient-capital
investment vehicle), **Acumen Academy** (leadership-
development and Foundry incubator arm), and **Acumen East
Africa / West Africa / Latin America / South Asia** regional
investment teams across the impact-investing /
philanthropic-capital segment — alongside peers Omidyar
Network, Echoing Green, and Skoll Foundation — with the bulk
of FY2024 deployed capital concentrated in agriculture,
clean-energy, education, financial-inclusion, healthcare,
and workforce-development verticals across emerging markets)
— publishes its consolidated careers board through Greenhouse
at the bare slug `acumen` (wire `company_name === 'Acumen'`
— see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'Acumen'` is a case-symmetric bare-brand
6-byte single-token PascalCase wire form (cap at byte 0
only). Slug `acumen` is byte-for-byte lowercase of wire. No
structural deviation from the cohort norm. **Identical
single-token-PascalCase 6-byte D-09 sub-form to Tatari
(Spec 173) and Acquia (Spec 182)** — third near-clean
re-spin on this D-09 sub-form across the cohort.

**Wire-form D-10 observation:** **1 of 9 listings carries
trailing ASCII-space padding** in the wire `title` field —
`'Compensation Consultant '` (`'Compensation Consultant'`
22 bytes + 1 trailing ASCII space → 23-byte padded form).
The plugin applies D-10 — emits `(listing.title ?? '').trim()`.
Pad rate ~11.1 % (1/9), trailing-only sub-form. **85th
cohort plugin to apply D-10.**

**Wire-form D-11 observation:** **0 of 4 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Acumen Academy'`, `'Executive Office'`, `'Investing'`,
`'Talent'`). The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay. **112th cohort plugin with fully-clean
department pass-through.**

## 2. Goals

- Ship a `source-company-acumen` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-tatari` plugin (closest cohort cousin
  with the **variant-2 + D-08 + D-09 omitted + D-10 applied
  + D-11 omitted** profile, **case-symmetric bare-brand
  single-token PascalCase 6-byte D-09 sub-form**) with **zero
  structural deviations** — a clean re-spin.
- Bundle a unit-test suite (≥ 9 cases — standard cohort
  baseline; D-09 byte-for-byte case-symmetric bare-brand
  lock; D-10 trailing-pad title-trim lock; D-11 clean-pass-
  through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Acumen postings.
- Other impact-investing nonprofits (Omidyar Network, Skoll
  Foundation, Echoing Green, etc. — separate adoption
  candidates if needed).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACUMEN`** in
> the source registry, so that **a single `siteType:
> [Site.ACUMEN]` request returns Acumen's open impact-
> investing and Acumen Academy roles across emerging
> markets**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACUMEN = 'acumen'` to the `Site` enum.                                                                                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acumen`.                                                                             | must     |
| FR-3  | `AcumenService.scrape(input)` returns a `JobResponseDto`; never throws.                                                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acumen-`, `site === Site.ACUMEN`.                                                             | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 1 of 9 wire titles padded in run-395 probe; emit `(listing.title ?? '').trim()`.            | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 4 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACUMEN, name: 'Acumen', category: 'company' })
@Injectable()
export class AcumenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acumen/jobs/<id>`); **D-09 case-
  symmetric bare-brand byte-for-byte wire pin** (`'Acumen'`
  6 bytes, case-symmetric PascalCase single-token; slug
  `acumen` is byte-for-byte lowercase of wire); **D-10
  trailing-pad title-trim lock** (asserts the padded form
  `'Compensation Consultant '` gets trimmed to
  `'Compensation Consultant'` and no emitted title ends in
  whitespace); **D-11 clean-pass-through dept lock**.
- Plus standard cohort cases (resultsWanted, searchTerm by
  title and department, error handling, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #395):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eighty-fourth** plugin in the cohort to use variant 2.
- **D-08 (run #395):** Decode-then-strip pipeline. **One-
  hundred-and-forty-first** cohort plugin to apply D-08.
- **D-09 (run #395):** **Omitted at runtime** — wire
  `company_name === 'Acumen'` flows through byte-for-byte.
  Case-symmetric bare-brand 6-byte PascalCase single-token
  form (cap at byte 0 only). Slug `acumen` is byte-for-byte
  lowercase of wire. **132nd cohort plugin to omit D-09.**
- **D-10 (run #395):** **Applied (trailing-pad form).** 1
  of 9 wire titles in the run-395 probe carries trailing
  ASCII-space padding (`'Compensation Consultant '`).
  **85th cohort plugin to apply D-10.**
- **D-11 (run #395):** **Omitted (clean pass-through).** 0
  of 4 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte.
  **112th cohort plugin with fully-clean department pass-
  through (D-11 omitted).**
- **D-13 (run #395):** **Zero structural deviations** from
  the Tatari template — clean re-spin of the canonical
  variant-2 + D-08 + D-09 omitted (case-symmetric bare-
  brand single-token PascalCase) + D-10 applied (trailing-
  pad) + D-11 omitted profile.

## 11. References

- `packages/plugins/source-company-tatari/src/tatari.service.ts` —
  closest cohort cousin (zero-deviation re-spin template:
  case-symmetric bare-brand single-token PascalCase 6-byte
  D-09 sub-form + D-10 trailing-pad applied + D-11 omitted).
- `packages/plugins/source-company-acquia/src/acquia.service.ts` —
  D-09 single-token PascalCase 6-byte sibling (D-10 omitted).
- `packages/plugins/source-company-acryldata/src/acryldata.service.ts` —
  prior run sibling.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
