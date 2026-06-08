# Spec: 138 — Source Company Plugin: Blend

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 138                                                                                                                                                                                            |
| Slug           | source-company-blend                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #348)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..137                                                                                                                                                                        |

## 1. Problem Statement

Run #347's Spec 137 closed end-to-end (BigID shipped — first
cohort observation of variant 36). Run #348 picks up the
**fourth** live hit alphabetically from the ninth-fresh-sweep
candidate pool: **Blend** (7 visible roles confirmed at
run-348 start — eighth-sweep estimate ~14, ~0.5× ratio).

Blend Labs, Inc. — operator of the **dominant US-mortgage-
origination + consumer-banking digital-platform pioneered
around the cloud-native-loan-origination data model**
(founded by Nima Ghamsari, Erin Collard, and Eugene Marinelli
in 2012 in San Francisco; public on the NYSE since July 2021
IPO under ticker `BLND` at ~$3.6B initial valuation; market-
cap settled in the $0.4-1.5B band as of 2026; ships Blend
Mortgage (loan origination for ~285+ banks/credit unions
including Wells Fargo and US Bank), Blend Consumer Banking
(deposit / HELOC / personal-loan origination), Blend Title
365 (title insurance / closing services), and Blend Builder
(no-code workflow builder for financial-services teams)
across the mortgage-tech / consumer-banking-software / digital-
lending segment — alongside competitors ICE Mortgage
Technology (Encompass), Rocket Pro, MeridianLink, Black
Knight, Roostify, and Built — with a hybrid distributed
workforce concentrated across San Francisco (HQ), Austin,
and Remote across the United States) — is published at the
bare `blend` Greenhouse slug (case-symmetric with the wire
`company_name === 'Blend'` after casefold).

## 2. Goals

- Ship a `source-company-blend` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  omitted.
- **Zero structural deviations** from Doximity, with **D-11
  observation: company-suffix dept naming convention** — all
  4 unique depts follow `<dept-name>- Blend Labs` form
  (e.g. `'Customer Success- Blend Labs'`, `'Sales
  Engineering- Blend Labs'`). Pass-through is byte-for-byte.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Blend postings.
- Blend product-API / Mortgage / Consumer Banking / Title
  365 integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BLEND`** in the
> source registry, so that **a single `siteType: [Site.BLEND]`
> request returns Blend's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BLEND = 'blend'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-blend`.                                             | must     |
| FR-3  | `BlendService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `blend-`, `site === Site.BLEND`, `companyName === 'Blend'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (1 of 7 padded ~14.3 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 7 wire department names padded; company-suffix dept naming preserved byte-for-byte. | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BLEND, name: 'Blend', category: 'company' })
@Injectable()
export class BlendService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Blend'` lock; D-10 trailing-
  pad title trim lock; **D-11 first-cohort company-suffix
  dept naming pass-through lock** (`'Customer Success- Blend
  Labs'` byte-for-byte).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #348):** Wire-shape variant 2. **Fifty-second**
  plugin in the cohort to use variant 2.
- **D-08 (run #348):** Decode-then-strip pipeline. **Ninety-
  fourth** cohort plugin to apply D-08.
- **D-09 (run #348):** **Omitted** — case-symmetric bare-brand
  wire `'Blend'` (5 bytes). **Eighty-fifth cohort plugin to
  omit D-09**.
- **D-10 (run #348):** **APPLIED with trailing-pad form.** 1
  of 7 wire titles padded (~14.3 % pad rate, all trailing-
  only — `'Customer Success Manager '`). **Fifty-seventh
  cohort plugin to apply D-10**.
- **D-11 (run #348):** **Omitted with FIRST-COHORT company-
  suffix dept naming sub-axis.** 0 of 7 wire department
  names padded across 4 unique department names — but **all
  4 follow a `<dept-name>- Blend Labs` company-suffix
  convention** (`'Customer Success- Blend Labs'`, `'Growth
  Team- Blend Labs'`, `'Relationship Management - Blend
  Labs'`, `'Sales Engineering- Blend Labs'`). **First cohort
  observation of company-suffix dept naming convention** —
  the trailing `- Blend Labs` token brands every department
  with the legal-entity name. Standard pass-through preserves
  byte-for-byte. **Seventy-fifth cohort plugin** with fully-
  clean department pass-through.
- **D-13 (run #348):** **Zero structural deviations** from the
  Doximity (Spec 127) template — making this the **thirty-
  fourth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin. (The first-cohort
  company-suffix dept naming sub-axis is captured as an
  observability note — pass-through is byte-for-byte, so no
  axis change is required.)

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-bigid/src/bigid.service.ts` —
  immediate predecessor (run #347).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
