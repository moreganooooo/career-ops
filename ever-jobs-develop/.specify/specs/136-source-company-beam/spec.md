# Spec: 136 — Source Company Plugin: BEAM (Bridge to Enter Advanced Mathematics)

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 136                                                                                                                                                                                            |
| Slug           | source-company-beam                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #346)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..135                                                                                                                                                                        |

## 1. Problem Statement

Run #345's Spec 135 closed end-to-end (Axon shipped — 33rd
clean re-spin off Doximity; 6.8× under-count factor; 50-
plugin variant-2 threshold). Run #346 picks up the **second**
live hit alphabetically from the ninth-fresh-sweep candidate
pool: **BEAM** (14 visible roles confirmed at run-346 start —
matches eighth-sweep estimate exactly, **first 1× match in
ninth-sweep**).

Bridge to Enter Advanced Mathematics, Inc. (BEAM) — operator
of the **dominant US 501(c)(3)-nonprofit math-enrichment
program pioneered around the rigorous-math-via-summer-program
+ year-round-pathway data model** (founded by Daniel
Zaharopol in 2011 in New York City; ships BEAM Discovery
(rising-7th-grade summer day-camp), BEAM Summer Away
(residential summer program for rising 8th graders), BEAM
Pathway (year-round 8th-12th-grade pathway through STEM
schools and college support), and BEAM Year-Round (Saturday
academic enrichment in NYC + LA) across the gifted-and-
talented / math-enrichment / STEM-pathway-for-underserved-
students segment — alongside competitors AwesomeMath, Math
Olympiad Summer Program (MOP), Stanford Math Camp (SUMaC),
PROMYS at Boston University, Hampshire College Summer
Studies in Mathematics (HCSSiM), and the Ross Mathematics
Program — with a hybrid distributed workforce concentrated
across New York City (HQ), Los Angeles, and seasonal program
sites across the United States) — is published at the bare
`beam` Greenhouse slug — **first-cohort slug-acronym-
expansion D-09 asymmetry** vs the wire `company_name ===
'Bridge to Enter Advanced Mathematics (BEAM)'` — slug 4
bytes (the acronym only) vs wire 43 bytes (full org name +
acronym in parens).

## 2. Goals

- Ship a `source-company-beam` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-branch` plugin — Branch is the closest
  cohort cousin sharing four axes: D-04 variant 2 + D-08 +
  D-10 omitted + D-11 omitted.
- **One structural deviation** from Branch:
  1. **D-09 first-cohort slug-acronym-expansion asymmetric
     wire form** — slug `beam` (4 bytes — acronym only) vs
     wire `'Bridge to Enter Advanced Mathematics (BEAM)'`
     (43 bytes — full org name with acronym in parens).
     Distinct from Oscar's slug-extra-word asymmetry (Spec
     133 — slug `oscar` (5b) vs wire `'Oscar Health'` (12b)
     where wire just appended one extra word). BEAM's wire
     fully expands the acronym AND retains it in parens —
     **second cohort observation of slug-truncation D-09
     sub-axis**.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical BEAM postings.
- BEAM program admissions / curriculum integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BEAM`** in the
> source registry, so that **a single `siteType: [Site.BEAM]`
> request returns BEAM's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BEAM = 'beam'` to the `Site` enum.                                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-beam`.                                              | must     |
| FR-3  | `BeamService.scrape(input)` returns a `JobResponseDto`; never throws.                             | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `beam-`, `site === Site.BEAM`, `companyName === 'Bridge to Enter Advanced Mathematics (BEAM)'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **omitted** — title emitted byte-for-byte (0 of 14 wire titles padded).                      | must     |
| FR-14 | D-11 **omitted** — 0 of 14 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BEAM, name: 'BEAM', category: 'company' })
@Injectable()
export class BeamService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 first-cohort slug-acronym-expansion
  asymmetric wire** lock (slug `beam` 4b vs wire `'Bridge
  to Enter Advanced Mathematics (BEAM)'` 43b); D-10 byte-
  for-byte title pass-through (no trim); D-11 clean dept
  pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #346):** Wire-shape variant 2. **Fifty-first**
  plugin in the cohort to use variant 2.
- **D-08 (run #346):** Decode-then-strip pipeline. **Ninety-
  second** cohort plugin to apply D-08.
- **D-09 (run #346):** **Omitted with FIRST-COHORT slug-
  acronym-expansion asymmetric wire form** — slug `beam` (4
  bytes — the acronym only) vs wire `'Bridge to Enter
  Advanced Mathematics (BEAM)'` (43 bytes — full org name +
  acronym in parens). **Distinct from Oscar's slug-extra-word
  asymmetry** (Spec 133) — Oscar appended ONE word; BEAM
  fully expands the acronym. **Second cohort observation of
  slug-truncation D-09 sub-axis** (after Oscar). **Eighty-
  third cohort plugin to omit D-09**.
- **D-10 (run #346):** **Omitted** — 0 of 14 wire titles
  padded. **Twenty-sixth cohort plugin to omit D-10**.
- **D-11 (run #346):** **Omitted** — 0 of 14 wire department
  names padded across 4 unique department names (`'HQ Central
  Programs'`, `'HQ Fundraising'`, `'Summer Programs'`,
  `'Yearround LA'` — clean multi-token forms). **Seventy-
  fourth cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #346):** **One structural deviation** from the
  Branch (Spec 121) template: D-09 sub-axis (Branch case-
  symmetric → BEAM first-cohort slug-acronym-expansion
  asymmetric).

## 11. References

- `packages/plugins/source-company-branch/src/branch.service.ts` —
  closest cohort cousin (variant 2 + D-10 omitted + D-11
  omitted reference).
- `packages/plugins/source-company-oscar/src/oscar.service.ts` —
  prior cohort plugin with slug-truncation D-09 asymmetry
  (different sub-axis — extra word vs acronym expansion).
- `packages/plugins/source-company-axon/src/axon.service.ts` —
  immediate predecessor (run #345).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
