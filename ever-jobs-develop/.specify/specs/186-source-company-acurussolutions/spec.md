# Spec: 186 — Source Company Plugin: Acurus Solutions

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 186                                                                                                                                                                                            |
| Slug           | source-company-acurussolutions                                                                                                                                                                 |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #396)                                                                                                                                                                              |
| Created        | 2026-05-27                                                                                                                                                                                     |
| Last updated   | 2026-05-27                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..185                                                                                                                                                                        |

## 1. Problem Statement

Run #395's Spec 185 closed end-to-end (Acumen shipped — 11th
plugin in the eleventh fresh probe sweep; third near-clean
re-spin on the case-symmetric bare-brand single-token
PascalCase 6-byte D-09 sub-form). Run #396 is the **twelfth**
plugin in the eleventh fresh probe sweep with **Acurus
Solutions** (Bengaluru-HQ healthcare-revenue-cycle-management
(RCM) outsourcing vendor — 12 visible roles confirmed at
run-396 start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acurussolutions/jobs?content=true`).

Acurus Solutions Private Limited — Bengaluru-HQ (Karnataka,
India) full-service healthcare revenue-cycle-management (RCM)
outsourcing vendor serving U.S. hospital and physician-group
clients across the AR-analysis / charge-posting / coding /
denial-management / payment-posting / pre-authorization /
scribe-services verticals; operates the **Central Billing
Office**, **Health Information Management**, **People**,
**Revenue Cycle Management**, and **Scribe** delivery
divisions; corporate legal entity name `Acurus Solutions
Private Limited` (Indian private-limited-company suffix
form); publishes its consolidated careers board through
Greenhouse at the bare slug `acurussolutions` (15 bytes; wire
`company_name === 'Acurus Solutions Private Limited'` 32
bytes; see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'Acurus Solutions Private Limited'` is a
**4-token PascalCase + 3 ASCII spaces** 32-byte wire form
(every wire token PascalCase cap-at-byte-0-only:
`'Acurus'` 6 bytes + `'Solutions'` 9 bytes + `'Private'` 7
bytes + `'Limited'` 7 bytes), while the slug
`acurussolutions` is the **first-2-tokens-only** lowercase
space-strip form (drop last 2 tokens `'Private Limited'`
which is the Indian private-limited-company legal-entity
suffix, then concatenate first 2 tokens `'Acurus'` +
`'Solutions'` → space-strip → lowercase → 15-byte slug). This
is the **first cohort observation of a 2-token-prefix
PascalCase slug-truncation D-09 sub-form** (drop-2-tokens
truncation factor — between AccuWeather Spec 175's drop-1
factor and ACLU Spec 178's drop-3 factor); the **first
cohort observation of corporate-legal-suffix-drop slug-
truncation** (drop `'Private Limited'` legal-entity suffix);
the **first cohort observation of a 4-token all-PascalCase
wire form with slug-truncation D-09 sub-form** (prior
slug-truncation observations all carried either acronym-
prefix-with-separator or 2-token PascalCase wire forms).
**Fourth cohort observation of slug-truncation D-09 sub-
form** (after AccuWeather, ACLU, ACOG initials-derivation
which is a distinct sub-axis).

**Wire-form D-10 observation:** **1 of 12 listings carries
trailing ASCII-space padding** in the wire `title` field —
`'RCM Process Expert (Process Improvement & Quality) – Manager '`
(63-byte payload + 1 trailing ASCII space → 64-byte padded
form). The plugin applies D-10 — emits
`(listing.title ?? '').trim()`. Pad rate ~8.3 % (1/12),
trailing-only sub-form. **86th cohort plugin to apply D-10.**

**Wire-form D-11 observation:** **0 of 5 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Central Billing Office'`, `'Health Information Management'`,
`'People'`, `'Revenue Cycle Management'`, `'Scribe'`). The
plugin omits D-11 — wire `departments[0].name` flows through
byte-for-byte without `.trim()` overlay. **113th cohort
plugin with fully-clean department pass-through.**

## 2. Goals

- Ship a `source-company-acurussolutions` plugin returning
  live `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-acumen` plugin (closest cohort cousin
  with the **variant-2 + D-08 + D-09 omitted + D-10 applied
  + D-11 omitted** profile) with **one structural deviation**:
  D-09 sub-axis — case-symmetric bare-brand single-token
  PascalCase 6-byte → **first cohort observation of 2-token-
  prefix slug-truncation from 4-token all-PascalCase wire
  form with corporate-legal-suffix-drop** (drop `'Private
  Limited'` → keep `'Acurus Solutions'` → space-strip +
  lowercase → 15-byte slug).
- Bundle a unit-test suite (≥ 9 cases — standard cohort
  baseline; D-09 byte-for-byte 4-token PascalCase wire lock
  + slug-truncation derivation lock; D-10 trailing-pad title-
  trim lock; D-11 clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Acurus Solutions postings.
- Other healthcare RCM vendors (R1 RCM, Optum, Cognizant,
  Conifer Health Solutions, etc. — separate adoption
  candidates if needed).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACURUSSOLUTIONS`**
> in the source registry, so that **a single `siteType:
> [Site.ACURUSSOLUTIONS]` request returns Acurus Solutions'
> open healthcare-RCM roles across the Bengaluru delivery
> centre**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACURUSSOLUTIONS = 'acurussolutions'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acurussolutions`.                                                                    | must     |
| FR-3  | `AcurussolutionsService.scrape(input)` returns a `JobResponseDto`; never throws.                                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acurussolutions-`, `site === Site.ACURUSSOLUTIONS`.                                           | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 1 of 12 wire titles padded in run-396 probe; emit `(listing.title ?? '').trim()`.           | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 5 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACURUSSOLUTIONS, name: 'Acurus Solutions', category: 'company' })
@Injectable()
export class AcurussolutionsService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acurussolutions/jobs/<id>`); **D-09
  4-token PascalCase byte-for-byte wire pin**
  (`'Acurus Solutions Private Limited'` 32 bytes, 4 wire
  tokens all PascalCase cap-at-byte-0-only, 3 ASCII spaces);
  **D-09 slug-truncation derivation lock** (slug
  `acurussolutions` 15 bytes derives from first-2-tokens
  `'Acurus Solutions'` 16 bytes → space-strip + lowercase →
  15-byte slug; drop last 2 tokens `'Private Limited'`
  corporate-legal-entity suffix); **D-10 trailing-pad title-
  trim lock** (asserts a padded form gets trimmed and no
  emitted title ends in whitespace); **D-11 clean-pass-
  through dept lock**.
- Plus standard cohort cases (resultsWanted, searchTerm by
  title and department, error handling, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #396):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eighty-fifth** plugin in the cohort to use variant 2.
- **D-08 (run #396):** Decode-then-strip pipeline. **One-
  hundred-and-forty-second** cohort plugin to apply D-08.
- **D-09 (run #396):** **Omitted at runtime** — wire
  `company_name === 'Acurus Solutions Private Limited'`
  flows through byte-for-byte. 4-token PascalCase wire form
  with 2-token-prefix slug-truncation: drop last 2 tokens
  (`'Private Limited'` corporate legal-entity suffix), keep
  first 2 tokens (`'Acurus Solutions'`), space-strip +
  lowercase → 15-byte slug `acurussolutions`. **First
  cohort observation of 2-token-prefix PascalCase slug-
  truncation D-09 sub-form**; **first cohort observation of
  corporate-legal-suffix-drop slug-truncation**; **first
  cohort observation of 4-token all-PascalCase wire form
  with slug-truncation D-09 sub-form**. **133rd cohort
  plugin to omit D-09.**
- **D-10 (run #396):** **Applied (trailing-pad form).** 1
  of 12 wire titles in the run-396 probe carries trailing
  ASCII-space padding. **86th cohort plugin to apply D-10.**
- **D-11 (run #396):** **Omitted (clean pass-through).** 0
  of 5 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte.
  **113th cohort plugin with fully-clean department pass-
  through (D-11 omitted).**
- **D-13 (run #396):** **One structural deviation** from the
  Acumen template — D-09 sub-axis (case-symmetric bare-brand
  single-token PascalCase 6-byte → first cohort observation
  of 2-token-prefix slug-truncation from 4-token all-
  PascalCase wire form with corporate-legal-suffix-drop).

## 11. References

- `packages/plugins/source-company-acumen/src/acumen.service.ts` —
  closest cohort cousin (variant-2 + D-08 + D-09 omitted +
  D-10 applied + D-11 omitted template; differs only on
  D-09 sub-axis).
- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  prior slug-truncation D-09 sub-form (drop-1 factor; 2-token
  TWO-cap PascalCase wire).
- `packages/plugins/source-company-aclu/src/aclu.service.ts` —
  prior slug-truncation D-09 sub-form (drop-3 factor; 4-token
  acronym+separator+suffix wire).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
