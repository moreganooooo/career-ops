# Spec: 178 — Source Company Plugin: ACLU

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 178                                                                                                                                                                                            |
| Slug           | source-company-aclu                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #388)                                                                                                                                                                              |
| Created        | 2026-05-18                                                                                                                                                                                     |
| Last updated   | 2026-05-18                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..177                                                                                                                                                                        |

## 1. Problem Statement

Run #387's Spec 177 closed end-to-end (Ackermann Group shipped —
third plugin in the eleventh fresh probe sweep; first cohort
observation of the completely-absent-departments D-11 sub-axis).
Run #388 is the **fourth** plugin in the eleventh fresh probe
sweep with a freshly-sampled candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 004 verified Greenhouse tenants, unchanged on `6dbb622`
since run #385 — **3 consecutive zero-churn runs**).

The eleventh-sweep alphabetical continuation after Ackermann
Group yielded the next viable live-board hit at **ACLU**
(40 visible roles confirmed at run-388 start via direct curl
probe of `https://api.greenhouse.io/v1/boards/aclu/jobs?content=true`).

American Civil Liberties Union, Inc. — operator of the
**dominant U.S. nonprofit civil-liberties advocacy,
constitutional-litigation, and grassroots-mobilization
platform** providing pro-bono impact litigation, federal /
state legislative-advocacy campaigns, state-affiliate
coalition organizing, and rapid-response constitutional-
rights defense across First-Amendment, voting-rights,
reproductive-freedom, criminal-justice-reform, capital-
punishment, immigrants'-rights, racial-justice, and LGBTQ+-
rights litigation portfolios (founded by Roger Baldwin,
Crystal Eastman, Albert DeSilver, Norman Thomas, and Helen
Keller in New York City on 1920-01-19 as a successor to the
Civil Liberties Bureau; 501(c)(4) tax-exempt advocacy
organization paired with the ACLU Foundation 501(c)(3)
litigation arm; serves dues-paying members, pro-bono
cooperating attorneys, and affiliated state-chapter
litigation teams across all 50 U.S. states plus Puerto Rico
and Washington, DC; ships nationwide impact-litigation
docket, state-affiliate-coordinated legislative-advocacy
campaigns, federal-court amicus briefs, public-education /
member-mobilization programs, and rapid-response
constitutional-defense alerts across the U.S. nonprofit
civil-liberties advocacy segment — alongside competitors
NAACP Legal Defense Fund, Southern Poverty Law Center,
Electronic Frontier Foundation, Center for Constitutional
Rights, Lambda Legal, Knight First Amendment Institute,
American Bar Association Center for Human Rights, and
Brennan Center for Justice — with a hybrid distributed
workforce concentrated across New York, NY (HQ / National
Office), Washington, DC (Washington Legislative Office),
San Francisco, CA, Durham, NC, and Remote across the United
States) — publishes its consolidated National Office careers
board through Greenhouse at the bare slug `aclu` (wire
`company_name === 'ACLU - National Office'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'ACLU - National Office'` is a **first
cohort observation of an all-caps acronym + space-hyphen-
space separator + multi-token suffix D-09 sub-pattern**.
Wire is 22 bytes split into **4 wire-tokens** by ASCII spaces:
`ACLU` (4 bytes, all-caps acronym), `-` (1-byte ASCII hyphen),
`National` (8-byte PascalCase), `Office` (6-byte PascalCase).
Slug is 4-byte lowercase `aclu` — derived by taking the
first wire-token only and lowercasing all 4 bytes. **3 wire-
tokens dropped (`-`, `National`, `Office`), 1 of which is the
ASCII hyphen separator.** **First cohort observation of an
ASCII-hyphen wire-token being dropped in a slug-truncation
D-09 sub-form** (prior slug-truncation observations —
AccuWeather, Tatari — dropped pure PascalCase suffix tokens
only). **First cohort observation of an all-caps acronym as
the first wire-token of a slug-truncation D-09 sub-form**
(prior all-caps-acronym D-09 observation at ACI Learning —
Spec 176 — was a space-strip form, not slug-truncation; the
ACI prefix was preserved into the slug, not dropped).

**Wire-form D-10 observation:** **2 of 40 listings carry
trailing ASCII-space padding** in the wire `title` field
(`'DevOps Engineering Manager '` 27 bytes, `'Technical
Project Manager (Term-Limited) '` 33 bytes) — a ~5.0 % pad
rate. The plugin's `.title.trim()` overlay strips the padding
byte-for-byte; emitted titles are pad-free.

**Wire-form D-11 observation:** **1 of 14 unique department
names carries trailing ASCII-space padding** in the wire
(`'National Political & Advocacy '` 30 bytes, appearing on 3
of 40 listings). The plugin's `.departments?.[0]?.name?.trim()`
overlay strips the padding byte-for-byte; emitted department
names are pad-free.

## 2. Goals

- Ship a `source-company-aclu` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-accuweather` plugin (closest cohort cousin
  with the **variant-2 + D-08 + D-10 trailing-pad applied +
  D-11 trailing-pad applied** profile) but with **one
  structural deviation**:
  1. **D-09 sub-axis:** AccuWeather's "TWO-cap PascalCase
     + slug-truncation" (`'AccuWeather Careers'` 19 bytes —
     2 tokens, caps at 0/4 of first token, 1 trailing token
     dropped) → **all-caps acronym + space-hyphen-space
     separator + multi-token suffix → first-token-only-
     lowercase slug-truncation** (`'ACLU - National Office'`
     22 bytes — 4 wire-tokens, first token `ACLU` 4-byte all-
     caps with caps at every byte index 0/1/2/3, 3 wire-tokens
     dropped including the ASCII-hyphen separator, yielding
     4-byte lowercase slug `aclu`). **First cohort
     observation of (a) ASCII-hyphen wire-token drop in a
     slug-truncation D-09 sub-form AND (b) all-caps acronym
     as the first wire-token of a slug-truncation D-09 sub-
     form.**
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  acronym + hyphen-separator + slug-truncation lock case
  beyond the standard 7-case cohort baseline; reuses the
  D-10 trailing-pad title-trim lock and D-11 trailing-pad
  dept-trim lock cases from AccuWeather).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ACLU postings.
- State-affiliate / regional ACLU boards (the plugin scrapes
  the consolidated `aclu` National Office board only).
- Donor / member-mobilization endpoints — the plugin is
  careers-board-only.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACLU`** in the
> source registry, so that **a single `siteType: [Site.ACLU]`
> request returns ACLU's open National Office roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACLU = 'aclu'` to the `Site` enum.                                                                                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-aclu`.                                                                               | must     |
| FR-3  | `AcluService.scrape(input)` returns a `JobResponseDto`; never throws.                                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `aclu-`, `site === Site.ACLU`.                                                                  | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 2 of 40 wire titles padded in run-388 probe; `.title.trim()` overlay strips padding.        | must     |
| FR-14 | D-11 **applied (trailing-pad form)** — 1 of 14 unique wire department names padded; `.departments?.[0]?.name?.trim()` overlay strips padding. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACLU, name: 'ACLU', category: 'company' })
@Injectable()
export class AcluService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/aclu/jobs/<id>`); **D-09 acronym
  + hyphen-separator + slug-truncation wire pin** (`'ACLU - National Office'`
  22 bytes; first token `ACLU` 4-byte all-caps, caps at every
  byte 0/1/2/3; ASCII-hyphen separator at wire-token index 1;
  3 wire-tokens dropped to slug `aclu`); **D-10 trailing-pad
  title-trim lock** (wire `'DevOps Engineering Manager '` 27
  bytes → emitted `'DevOps Engineering Manager'` 26 bytes);
  **D-11 trailing-pad dept-trim lock** (wire `'National
  Political & Advocacy '` 30 bytes → emitted `'National
  Political & Advocacy'` 29 bytes).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #388):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Seventy-seventh** plugin in the cohort to use variant 2.
- **D-08 (run #388):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-fourth** cohort plugin to apply D-08.
- **D-09 (run #388):** **Omitted at runtime** — wire
  `company_name === 'ACLU - National Office'` flows through
  byte-for-byte. **All-caps acronym + space-hyphen-space
  separator + multi-token suffix → first-token-only-
  lowercase slug-truncation sub-pattern.** Sub-pattern
  details:
  - Wire is 22 bytes split into 4 wire-tokens by ASCII
    spaces: `ACLU` (4-byte all-caps acronym, caps at every
    byte 0/1/2/3), `-` (1-byte ASCII hyphen separator),
    `National` (8-byte PascalCase, cap at byte 0 only),
    `Office` (6-byte PascalCase, cap at byte 0 only).
  - Slug is 4-byte lowercase `aclu` — first wire-token only,
    lowercased; 3 wire-tokens dropped including the ASCII-
    hyphen separator.
  - **First cohort observation of (a) an ASCII-hyphen wire-
    token being dropped in a slug-truncation D-09 sub-form
    AND (b) an all-caps acronym as the first wire-token of a
    slug-truncation D-09 sub-form.**
  - **125th** cohort plugin to omit D-09 (124 → 125).
- **D-10 (run #388):** **Wire-title `.trim()` applied
  (trailing-pad form).** 2 of 40 wire titles in the run-388
  probe carry trailing ASCII-space padding (~5.0 % pad rate):
  `'DevOps Engineering Manager '` (27 bytes), `'Technical
  Project Manager (Term-Limited) '` (33 bytes). **Eighty-
  first cohort plugin to apply D-10**.
- **D-11 (run #388):** **Wire-department `.trim()` applied
  (trailing-pad form).** 1 of 14 unique wire department names
  padded — `'National Political & Advocacy '` (30 bytes,
  appearing on 3 of 40 listings). **Twenty-second cohort
  plugin to apply D-11**.
- **D-13 (run #388):** **One structural deviation** from the
  AccuWeather template — D-09 sub-axis (TWO-cap PascalCase +
  slug-truncation → all-caps acronym + hyphen-separator +
  multi-token-drop slug-truncation).

## 11. References

- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  closest variant-2 cousin (variant 2 + D-08 + D-10 trailing-pad
  applied + D-11 trailing-pad applied).
- `packages/plugins/source-company-acilearning/src/aci-learning.service.ts` —
  prior all-caps-acronym D-09 plugin (acronym + PascalCase +
  space-strip form, not slug-truncation).
- `packages/plugins/source-company-ackermanngroup/src/ackermann-group.service.ts` —
  previous-run cohort plugin (Spec 177).
- `packages/plugins/source-company-tatari/src/tatari.service.ts` —
  prior slug-truncation D-09 plugin (1 trailing PascalCase
  token dropped, no hyphen).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
