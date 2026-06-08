# Spec: 179 — Source Company Plugin: ACOG

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 179                                                                                                                                                                                            |
| Slug           | source-company-acog                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #389)                                                                                                                                                                              |
| Created        | 2026-05-19                                                                                                                                                                                     |
| Last updated   | 2026-05-19                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..178                                                                                                                                                                        |

## 1. Problem Statement

Run #388's Spec 178 closed end-to-end (ACLU shipped — fourth
plugin in the eleventh fresh probe sweep; first cohort
observation of (a) ASCII-hyphen wire-token drop in a slug-
truncation D-09 sub-form AND (b) all-caps acronym as the
first wire-token of a slug-truncation D-09 sub-form). Run
#389 is the **fifth** plugin in the eleventh fresh probe
sweep with a freshly-sampled candidate pulled from the
upstream `OTHERS/Ats-scrapers/ats-companies/greenhouse.csv`
corpus (5 004 verified Greenhouse tenants, unchanged on
`6dbb622` since run #385 — **4 consecutive zero-churn runs**).

The eleventh-sweep alphabetical continuation after ACLU
yielded the next viable live-board hit at **ACOG** (American
College of Obstetricians and Gynecologists — 6 visible roles
confirmed at run-389 start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acog/jobs?content=true`).

American College of Obstetricians and Gynecologists — operator
of the **dominant U.S. medical-specialty membership society
for obstetrics-and-gynecology clinical practice, evidence-
based clinical guidance, and women's-health professional
education** providing peer-reviewed clinical practice
bulletins, committee opinions, continuing medical education
(CME) curricula, board-certification preparation, member-
mobilization advocacy for women's reproductive-health policy,
and accredited residency-program oversight (founded as the
American Association of Obstetricians, Gynecologists, and
Abdominal Surgeons in 1888, incorporated as the American
College of Obstetricians and Gynecologists in 1951 in
Washington, DC; 501(c)(6) tax-exempt professional medical-
specialty membership society paired with the ACOG Foundation
501(c)(3) charitable arm; serves 63 000+ ob-gyn physicians,
ob-gyn residents-in-training, certified nurse-midwives,
women's-health nurse practitioners, and allied medical
professionals across all 50 U.S. states plus international
fellow chapters; ships *Obstetrics & Gynecology* (the Green
Journal) flagship peer-reviewed publication, ACOG Practice
Bulletins, ACOG Committee Opinions, ACOG Clinical Practice
Guidelines, ACOG CME / MOC II / MOC IV continuing-education
programs, ACOG Annual Clinical & Scientific Meeting, and
ACOG Patient Education materials across the U.S. medical-
specialty membership society / women's-health clinical
guidance segment — alongside peer specialty societies
American Medical Association, American Academy of Pediatrics,
American Academy of Family Physicians, Society for Maternal-
Fetal Medicine, American Society for Reproductive Medicine,
American Urogynecologic Society, and Society of Gynecologic
Oncology — with a hybrid distributed workforce concentrated
across Washington, DC (HQ — 409 12th Street SW), and Remote
across the United States) — publishes its consolidated
careers board through Greenhouse at the bare slug `acog`
(wire `company_name === 'American College of Obstetricians
and Gynecologists'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'American College of Obstetricians and
Gynecologists'` is a **first cohort observation of the
acronym-by-initials D-09 sub-pattern** — slug derived by
sampling the first letter of each PascalCase wire-token in
order, skipping all-lowercase connector tokens, and
lowercasing the result. Wire is 51 bytes split into **6
wire-tokens** by ASCII spaces:

- `American` (8-byte PascalCase, cap at byte 0 only)
- `College` (7-byte PascalCase, cap at byte 0 only)
- `of` (2-byte all-lowercase connector)
- `Obstetricians` (13-byte PascalCase, cap at byte 0 only)
- `and` (3-byte all-lowercase connector)
- `Gynecologists` (13-byte PascalCase, cap at byte 0 only)

Slug is 4-byte lowercase `acog` — formed by sampling the
first letter of each PascalCase wire-token (A from American,
C from College, O from Obstetricians, G from Gynecologists),
skipping the 2 lowercase-connector tokens (`of`, `and`), and
lowercasing the result. **6 wire-tokens reduced to 4
contributing first-letters; 2 lowercase-connector tokens
skipped.** **First cohort observation of (a) acronym-by-
initials slug derivation from a multi-token wire form (no
single wire-token contains the slug as a substring) AND (b)
all-lowercase connector-token skip in slug derivation**
(prior multi-token slug-truncation observations — AccuWeather,
Tatari, ACLU — preserved the full first wire-token byte-for-
byte and merely dropped trailing tokens; ACOG's slug requires
multi-token initial-letter sampling with explicit connector-
token skip, a fundamentally novel D-09 transformation).

**Wire-form D-10 observation:** **1 of 6 listings carries
trailing ASCII-space padding** in the wire `title` field
(`'Director, Clinical Guidance Methodology '` 40 bytes) — a
~16.7 % pad rate. The plugin's `.title.trim()` overlay
strips the padding byte-for-byte; emitted titles are pad-
free.

**Wire-form D-11 observation:** **0 of 6 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Clinical Guidance'`, `'Human Resources'`, `'Publishing and
Product Development'`, `'Education'`, `'Information
Technology'`). The plugin omits D-11 — wire `departments[0]
.name` flows through byte-for-byte without `.trim()` overlay.

## 2. Goals

- Ship a `source-company-acog` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-aclu` plugin (closest cohort cousin with
  the **variant-2 + D-08 + D-10 trailing-pad applied**
  profile) but with **two structural deviations**:
  1. **D-09 sub-axis:** ACLU's "all-caps acronym + space-
     hyphen-space separator + multi-token suffix → first-
     token-only-lowercase slug-truncation"
     (`'ACLU - National Office'` 22 bytes — 4 wire-tokens,
     first-token-only-lowercase, 3 trailing tokens dropped)
     → **acronym-by-initials slug derivation from a multi-
     token PascalCase + lowercase-connector wire form**
     (`'American College of Obstetricians and Gynecologists'`
     51 bytes — 6 wire-tokens, 4 PascalCase + 2 lowercase-
     connector; slug `acog` formed by sampling the first
     letter of each PascalCase wire-token in order, skipping
     the 2 lowercase-connector tokens, and lowercasing the
     result). **First cohort observation of (a) acronym-by-
     initials slug derivation from a multi-token wire form
     AND (b) all-lowercase connector-token skip in slug
     derivation.**
  2. **D-11 sub-axis:** ACLU's "trailing-pad applied (1 of
     14 unique departments padded)" → **clean pass-through**
     (0 of 6 unique departments padded; wire `departments[0]
     .name` flows through byte-for-byte).
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  acronym-by-initials lock case beyond the standard 7-case
  cohort baseline; reuses the D-10 trailing-pad title-trim
  lock case from ACLU; D-11 clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ACOG postings.
- *Obstetrics & Gynecology* (Green Journal) editorial /
  peer-review staffing (the plugin scrapes the consolidated
  careers board only).
- ACOG District / state-section regional chapters (the
  plugin scrapes the National HQ board only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACOG`** in the
> source registry, so that **a single `siteType: [Site.ACOG]`
> request returns ACOG's open National HQ roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACOG = 'acog'` to the `Site` enum.                                                                                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acog`.                                                                               | must     |
| FR-3  | `AcogService.scrape(input)` returns a `JobResponseDto`; never throws.                                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acog-`, `site === Site.ACOG`.                                                                  | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 1 of 6 wire titles padded in run-389 probe; `.title.trim()` overlay strips padding.         | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 6 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACOG, name: 'ACOG', category: 'company' })
@Injectable()
export class AcogService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acog/jobs/<id>`); **D-09 acronym-
  by-initials wire pin** (`'American College of Obstetricians
  and Gynecologists'` 51 bytes; 6 wire-tokens split by ASCII
  spaces; 4 PascalCase + 2 lowercase-connector; slug `acog`
  formed by sampling first letter of each PascalCase token,
  lowercased, with the 2 lowercase-connector tokens
  skipped); **D-10 trailing-pad title-trim lock** (wire
  `'Director, Clinical Guidance Methodology '` 40 bytes →
  emitted `'Director, Clinical Guidance Methodology'` 39
  bytes); **D-11 clean-pass-through dept lock** (every
  emitted `department` byte-equals wire `departments[0]
  .name`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #389):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Seventy-eighth** plugin in the cohort to use variant 2.
- **D-08 (run #389):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-fifth** cohort plugin to apply D-08.
- **D-09 (run #389):** **Omitted at runtime** — wire
  `company_name === 'American College of Obstetricians and
  Gynecologists'` flows through byte-for-byte. **Acronym-
  by-initials slug-derivation sub-pattern** (slug `acog`
  formed by sampling first letters of capitalized wire-
  tokens, skipping lowercase-connector tokens, all
  lowercased). Sub-pattern details:
  - Wire is 51 bytes split into 6 wire-tokens by ASCII
    spaces: `American` (8-byte PascalCase, cap at byte 0
    only), `College` (7-byte PascalCase, cap at byte 0
    only), `of` (2-byte all-lowercase connector),
    `Obstetricians` (13-byte PascalCase, cap at byte 0
    only), `and` (3-byte all-lowercase connector),
    `Gynecologists` (13-byte PascalCase, cap at byte 0
    only).
  - Slug is 4-byte lowercase `acog` — formed by sampling the
    first letter of each PascalCase wire-token in order
    (A from American, C from College, O from Obstetricians,
    G from Gynecologists), skipping the 2 all-lowercase
    connector tokens (`of`, `and`), and lowercasing the
    result.
  - **First cohort observation of (a) acronym-by-initials
    slug derivation from a multi-token wire form (no single
    wire-token contains the slug as a substring) AND (b)
    all-lowercase connector-token skip in slug derivation.**
  - **126th** cohort plugin to omit D-09 (125 → 126).
- **D-10 (run #389):** **Wire-title `.trim()` applied
  (trailing-pad form).** 1 of 6 wire titles in the run-389
  probe carries trailing ASCII-space padding (~16.7 % pad
  rate): `'Director, Clinical Guidance Methodology '` (40
  bytes). **Eighty-second cohort plugin to apply D-10**.
- **D-11 (run #389):** **Omitted (clean pass-through).** 0
  of 6 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte. **106th
  cohort plugin with fully-clean department pass-through
  (D-11 omitted).**
- **D-13 (run #389):** **Two structural deviations** from
  the ACLU template — D-09 sub-axis (all-caps acronym +
  hyphen-separator + slug-truncation → acronym-by-initials
  with connector-skip) AND D-11 sub-axis (trailing-pad
  applied → clean pass-through).

## 11. References

- `packages/plugins/source-company-aclu/src/aclu.service.ts` —
  closest variant-2 cousin (variant 2 + D-08 + D-10
  trailing-pad applied).
- `packages/plugins/source-company-acilearning/src/aci-learning.service.ts` —
  prior all-caps-acronym D-09 plugin (acronym + PascalCase +
  space-strip form, not acronym-by-initials).
- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  prior variant-2 + D-10 applied + D-11 applied template.
- `packages/plugins/source-company-ackermanngroup/src/ackermann-group.service.ts` —
  prior variant-10 + clean dept pass-through cousin.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
