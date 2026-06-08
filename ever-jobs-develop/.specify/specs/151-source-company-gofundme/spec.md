# Spec: 151 — Source Company Plugin: GoFundMe

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 151                                                                                                                                                                                            |
| Slug           | source-company-gofundme                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #361)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..150                                                                                                                                                                        |

## 1. Problem Statement

Run #360's Spec 150 closed end-to-end (GoCardless shipped —
39th clean re-spin off PagerDuty; 7th cohort plugin with
TWO-cap PascalCase D-09 sub-axis; 150-spec milestone). Run
#361 picks up the **seventeenth and last** live hit
alphabetically from the ninth-fresh-sweep candidate pool:
**GoFundMe** (47 visible roles confirmed at run-361 start —
ninth-sweep estimate ~36; ~1.31× ratio, near-1× match).

GoFundMe, Inc. — operator of the **dominant social-fundraising
platform pioneered around the personal-cause / community-
giving data model** (founded by Brad Damphousse and Andrew
Ballester in 2010 in San Diego, CA; private since the 2015
Accel + Technology Crossover Ventures growth round at ~$600M
valuation; ships GoFundMe (personal / community / nonprofit
fundraising), Classy (enterprise nonprofit-fundraising
platform, acquired 2022), and gofundme.org (charitable arm)
across the consumer-fundraising / nonprofit-tech / charitable-
giving vertical — alongside competitors Givebutter, Donorbox,
Fundly, and Mightycause — with a hybrid distributed workforce
concentrated across San Diego (HQ), Dublin, San Francisco,
and Remote across the United States, Europe, and APAC) — is
published at the bare `gofundme` Greenhouse slug (case-
asymmetric vs the wire `company_name === 'GoFundMe'`
PascalCase concat — same byte-count (8 bytes) but byte-
distinct via case at THREE indices: 0 (`G` vs `g`), 2 (`F`
vs `f`), and 6 (`M` vs `m`); caps at 0/2/6 mark the THREE
segment boundaries of `Go | Fund | Me`).

## 2. Goals

- Ship a `source-company-gofundme` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-assemblyai` plugin — AssemblyAI is the
  closest cohort cousin sharing four primary axes: D-04
  variant 2 + D-08 + D-10 applied + D-11 applied.
- **One structural deviation** from AssemblyAI: D-09 sub-axis
  (AssemblyAI THREE-cap PascalCase consecutive-at-tail caps
  0/8/9 forming embedded 2-letter acronym `AI` → GoFundMe
  THREE-cap PascalCase NON-consecutive segment-boundary caps
  0/2/6 marking the three segments of `Go | Fund | Me`;
  **first cohort observation of NON-consecutive segment-
  boundary THREE-cap PascalCase D-09 sub-axis** — distinct
  from prior AssemblyAI / BigID consecutive-at-tail acronym
  patterns).
- **Notable D-10 sub-axis observation**: 5th cohort observation
  of leading-pad sub-axis after Chainguard (Spec 122), Oscar
  (Spec 133), Celonis (Spec 140), and Formlabs (Spec 147).
  GoFundMe carries 2 leading-pad samples — most observed in
  any single plugin.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical GoFundMe postings.
- GoFundMe / Classy product-API integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.GOFUNDME`** in
> the source registry, so that **a single `siteType:
> [Site.GOFUNDME]` request returns GoFundMe's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.GOFUNDME = 'gofundme'` to the `Site` enum.                                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-gofundme`.                                                                 | must     |
| FR-3  | `GofundmeService.scrape(input)` returns a `JobResponseDto`; never throws.                                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `gofundme-`, `site === Site.GOFUNDME`, `companyName === 'GoFundMe'`.                  | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad + leading-pad sub-axes (5 of 47 padded ~10.6 %).                   | must     |
| FR-14 | D-11 **applied** — dept `.trim()` covers trailing-pad sub-axis (1 of 13 unique dept names padded — `'Technical Solutions & Partnerships '`). | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.GOFUNDME, name: 'GoFundMe', category: 'company' })
@Injectable()
export class GofundmeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 FIRST-COHORT NON-consecutive segment-
  boundary THREE-cap PascalCase wire pin** (`'GoFundMe'` 8
  bytes; caps at 0/2/6 — segment boundaries of `Go | Fund |
  Me`); D-10 trailing-pad + leading-pad title-trim lock;
  D-11 trailing-pad dept-trim lock (`'Technical Solutions &
  Partnerships '` → `'Technical Solutions & Partnerships'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #361):** Wire-shape variant 2 (canonical
  Greenhouse host). **Fifty-ninth** plugin in the cohort to
  use variant 2.
- **D-08 (run #361):** Decode-then-strip pipeline. **One-
  hundred-and-seventh** cohort plugin to apply D-08.
- **D-09 (run #361):** **Omitted with FIRST-COHORT
  NON-consecutive segment-boundary THREE-cap PascalCase case-
  asymmetric wire form.** Wire `company_name === 'GoFundMe'`
  byte-for-byte (8 bytes — fully clean; 0 of 47 padded).
  Slug `gofundme` is 8 bytes lowercase; case-asymmetric at
  THREE byte indices: 0 (`G` vs `g`), 2 (`F` vs `f`), and 6
  (`M` vs `m`). Caps at 0/2/6 mark the **THREE segment
  boundaries** of `Go | Fund | Me`. **First cohort
  observation of NON-consecutive segment-boundary THREE-cap
  PascalCase D-09 sub-axis** — distinct from prior THREE-cap
  forms (AssemblyAI Spec 108 caps 0/8/9 forming consecutive-
  at-tail acronym `AI`, BigID Spec 137 caps 0/3/4 forming
  consecutive-at-tail acronym `ID`). GoFundMe's caps mark
  segment boundaries rather than form a tail acronym. **3rd
  THREE-cap PascalCase plugin overall** in the cohort.
  **Ninety-eighth cohort plugin to omit D-09**.
- **D-10 (run #361):** **APPLIED with mixed pad form +
  fifth-cohort leading-pad observation.** 5 of 47 wire
  titles padded (~10.6 % pad rate) — 3 trailing-pad
  (`'Director, Community Fundraising '`, `'Senior Software
  Engineer - Data Platform '`, `'Staff Analytics Engineer '`)
  + **2 leading-pad** (`' Privacy Program Manager'`,
  `' Staff Software Engineer'`). **Fifth cohort observation
  of leading-pad sub-axis** after Chainguard (Spec 122),
  Oscar (Spec 133), Celonis (Spec 140), and Formlabs (Spec
  147). GoFundMe carries 2 leading-pad samples — **most
  leading-pad samples observed in any single cohort plugin
  to date** (vs Celonis's 3 in larger plugin and prior 1-
  sample observations elsewhere). `.trim()` is byte-count
  agnostic and handles all pad widths and positions
  transparently. **Sixty-sixth cohort plugin to apply D-10**.
- **D-11 (run #361):** **APPLIED with trailing-pad form.** 1
  of 13 unique wire department names padded (`'Technical
  Solutions & Partnerships '`); listing-level pad rate 1 of
  47 (~2.1 %). The plugin applies `.trim()` to the wire
  `departments[0].name` byte-for-byte before downstream emit.
  **Sixteenth cohort plugin to apply D-11**.
- **D-13 (run #361):** **One structural deviation** from the
  AssemblyAI (Spec 108) template — D-09 sub-axis (consecutive-
  at-tail acronym caps `AI` → first-cohort NON-consecutive
  segment-boundary caps `Go | Fund | Me`).

## 11. References

- `packages/plugins/source-company-assemblyai/src/assemblyai.service.ts` —
  closest cohort cousin (one-deviation D-09 sub-axis).
- `packages/plugins/source-company-bigid/src/bigid.service.ts` —
  prior THREE-cap PascalCase plugin (consecutive-at-tail
  acronym pattern).
- `packages/plugins/source-company-formlabs/src/formlabs.service.ts` —
  prior cohort observation of leading-pad D-10 sub-axis.
- `packages/plugins/source-company-gocardless/src/gocardless.service.ts` —
  immediate predecessor (run #360).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
