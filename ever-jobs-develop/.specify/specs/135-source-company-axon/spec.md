# Spec: 135 — Source Company Plugin: Axon

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 135                                                                                                                                                                                            |
| Slug           | source-company-axon                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #345)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..134                                                                                                                                                                        |

## 1. Problem Statement

Run #344's Spec 134 closed end-to-end (Starburst shipped —
32nd clean re-spin off Doximity; closed eighth fresh probe
sweep). Run #345 picks up the **first** live hit alphabetically
from the new ninth-fresh-sweep candidate pool: **Axon** (539
visible roles confirmed at run-345 start — **NEW LARGEST
probe-counter UNDER-count factor across all sweeps** at
~6.8× (estimate ~79 keys vs actual 539); also **largest
single-board sample observed in run-history**).

Axon Enterprise, Inc. — operator of the **dominant US-public-
safety + connected-policing platform pioneered around the
TASER-conducted-energy-weapon-as-platform / body-worn-camera-
as-cloud-service / Evidence-com-as-DEMS data model** (founded
by Rick Smith and Tom Smith in 1993 as TASER International in
Scottsdale; rebranded to Axon in April 2017; public on the
NASDAQ since May 2001 IPO under ticker `TASR`, renamed to
`AXON` in April 2017; market-cap settled in the $20-50B band
as of 2026; ships TASER 7 / TASER 10 (CEW conducted energy
weapons), Axon Body 4 (body-worn cameras), Axon Fleet 3
(in-car video), Axon Records, Axon Evidence (Evidence.com
DEMS — Digital Evidence Management System), Axon Justice
(prosecution case-management), Axon Air (drone), and Axon
Skybridge (cloud-based command center) — alongside competitors
WatchGuard (now Motorola), Digital Ally, Reveal Media, and
Verint — with a hybrid distributed workforce concentrated
across Scottsdale (HQ), Seattle, San Francisco, Boston,
London, Sydney, and Remote across the United States, the
United Kingdom, the European Union, Canada, Australia, and
the Asia-Pacific region) — is published at the bare `axon`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Axon'` after casefold).

> **Run #345 launches the ninth fresh probe sweep** —
> probed 95 candidate slugs and found **17 fresh non-empty
> live hits** (excluding Asana and Calendly which are
> already shipped) forming the new candidate pool: `axon`
> (539, this row), `beam` (~14), `bigid` (~30), `blend`
> (~14), `bloomreach` (~62), `celonis` (~154),
> `complyadvantage` (~33), `conviva` (~9), `cribl` (~33),
> `earnest` (~33), `expressvpn` (~32), `fairmarkit` (~12),
> `formlabs` (~95), `founders` (~6), `fox` (~10),
> `gocardless` (~36), `gofundme` (~36). The remaining 16
> live hits queue for runs #346+ in alphabetical order
> (`beam` next at run #346 with ~14 keys).

## 2. Goals

- Ship a `source-company-axon` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  omitted.
- **Zero structural deviations** from Doximity, with **first-
  cohort D-11 sub-axis observation: internal-double-
  whitespace dept name** (`'1105 SCM - Distribution &
  Warehousing - Skybridge'` carries 2 consecutive spaces
  between `&` and `Warehousing`). Pass-through is byte-for-
  byte. Plus second-cohort-observation of numeric-prefix-
  with-space dept naming (after Constant Contact).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Axon postings.
- Axon product-API / TASER / Evidence.com / Skybridge
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.AXON`** in the
> source registry, so that **a single `siteType: [Site.AXON]`
> request returns Axon's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.AXON = 'axon'` to the `Site` enum.                                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-axon`.                                              | must     |
| FR-3  | `AxonService.scrape(input)` returns a `JobResponseDto`; never throws.                             | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `axon-`, `site === Site.AXON`, `companyName === 'Axon'`.      | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (90 of 539 padded ~16.7 %).   | must     |
| FR-14 | D-11 **omitted** — 0 of 539 wire department names padded; numeric-prefix-with-space + internal-double-whitespace observability preserved byte-for-byte. | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.AXON, name: 'Axon', category: 'company' })
@Injectable()
export class AxonService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Axon'` lock; D-10 trailing-
  pad title trim lock; **D-11 second-cohort numeric-prefix-
  with-space dept naming pass-through lock + first-cohort
  internal-double-whitespace dept observation lock**
  (`'1105 SCM - Distribution &  Warehousing - Skybridge'`
  preserved byte-for-byte).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #345):** Wire-shape variant 2. **Fiftieth**
  plugin in the cohort to use variant 2 — **the cohort
  crosses the 50-plugin variant-2 threshold at this run**.
- **D-08 (run #345):** Decode-then-strip pipeline. **Ninety-
  first** cohort plugin to apply D-08.
- **D-09 (run #345):** **Omitted** — case-symmetric bare-brand
  wire `'Axon'` (4 bytes). **Eighty-second cohort plugin to
  omit D-09**.
- **D-10 (run #345):** **APPLIED with trailing-pad form.** 90
  of 539 wire titles padded (~16.7 % pad rate, all trailing-
  only — `'Account Executive, Air (T1200 - Northeast) '`,
  plus 89 others). **Fifty-fifth cohort plugin to apply
  D-10**.
- **D-11 (run #345):** **Omitted with second-cohort numeric-
  prefix-with-space dept naming + first-cohort internal-
  double-whitespace dept observation.** 0 of 539 wire
  department names padded across 85 unique department names
  — but **all 85 follow a `<numeric_code> <name>` numeric-
  prefix-with-space convention** (`'1001 Manufacturing
  Engineering'`, `'1002 Equipment Maintenance'`, etc.).
  **Second cohort observation of numeric-prefix-with-space
  dept naming** after Constant Contact (Spec 111 — same
  convention but Constant Contact had 9 unique depts; Axon
  has 85). **Distinct from Dialpad's numeric-prefix-with-
  hyphen-separator** (Spec 126 — `'120 - Product Operations'`).
  Plus **first-cohort observation of internal-double-
  whitespace anomaly in dept-name field** (`'1105 SCM -
  Distribution &  Warehousing - Skybridge'` — 2 consecutive
  spaces between `&` and `Warehousing`). The plugin
  preserves byte-for-byte. **Seventy-third cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #345):** **Zero structural deviations** from the
  Doximity (Spec 127) template — making this the **thirty-
  third** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.
- **D-14 (run #345 — sweep launch):** **Run #345 launches
  the ninth fresh probe sweep** — probed 95 candidate slugs
  and found **17 fresh non-empty live hits** (excluding
  Asana and Calendly which are already shipped): `axon` (539,
  this row), `beam` (~14), `bigid` (~30), `blend` (~14),
  `bloomreach` (~62), `celonis` (~154), `complyadvantage`
  (~33), `conviva` (~9), `cribl` (~33), `earnest` (~33),
  `expressvpn` (~32), `fairmarkit` (~12), `formlabs` (~95),
  `founders` (~6), `fox` (~10), `gocardless` (~36),
  `gofundme` (~36). The remaining 16 live hits queue for
  runs #346+ in alphabetical order.

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-constantcontact/src/constantcontact.service.ts` —
  prior cohort plugin with numeric-prefix-with-space dept
  naming.
- `packages/plugins/source-company-starburst/src/starburst.service.ts` —
  immediate predecessor (run #344).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
