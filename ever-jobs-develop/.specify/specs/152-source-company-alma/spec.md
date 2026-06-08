# Spec: 152 — Source Company Plugin: Alma

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 152                                                                                                                                                                                            |
| Slug           | source-company-alma                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #362)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..151                                                                                                                                                                        |

## 1. Problem Statement

Run #361's Spec 151 closed end-to-end (GoFundMe shipped — first
cohort observation of NON-consecutive segment-boundary THREE-
cap PascalCase D-09 sub-axis; closes ninth fresh probe sweep).
**Run #362 launches the tenth fresh probe sweep** — probed
~150 candidate slugs across H–Z and lowercase A-band remainders
and found **22 fresh non-empty live hits**: `alma` (9, run #362
shipped — this row), `bird` (~39), `bitgo` (~47),
`collectivehealth` (~14), `deepmind` (~73), `indigo` (~1),
`instabase` (~12), `iterable` (~40), `labelbox` (~10),
`markforged` (~6), `maven` (~5), `netskope` (~129),
`postscript` (~9), `quanata` (~10), `recharge` (~4),
`samsara` (~367), `sezzle` (~180), `shopmonkey` (~12),
`simplisafe` (~38), `symphony` (~18), `tatari` (~55),
`textio` (~3). Run #362 picks up the **first** live hit
alphabetically: **Alma** (9 visible roles confirmed at run-
362 start; **1× exact match with the ninth-sweep estimate of
~9 keys**).

Alma — operator of the **dominant US-domestic mental-health
provider-network and tele-therapy infrastructure platform**
(founded by Harry Ritter in 2018 in New York, NY; private
since the 2022 Series D round at ~$800M valuation; ships the
Alma provider network for therapists, billing-and-insurance
infrastructure, and the Alma Mental Health Lab + Care Hub
across the consumer-mental-health / tele-therapy / behavioral-
health-tech vertical — alongside competitors Headway,
Cerebral, Talkspace, Lyra Health, and Spring Health — with a
hybrid distributed workforce concentrated across New York
(HQ), San Francisco, and Remote across the United States) —
is published at the bare `alma` Greenhouse slug (case-
symmetric with the wire `company_name === 'Alma'` after
casefold).

## 2. Goals

- Ship a `source-company-alma` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  omitted.
- **Zero structural deviations.** Fortieth Greenhouse-only
  company-direct plugin in run history to ship as a clean
  re-spin.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Alma postings.
- Alma provider-API / billing-infrastructure integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ALMA`** in the
> source registry, so that **a single `siteType: [Site.ALMA]`
> request returns Alma's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.ALMA = 'alma'` to the `Site` enum.                                                                             | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-alma`.                                                                     | must     |
| FR-3  | `AlmaService.scrape(input)` returns a `JobResponseDto`; never throws.                                                    | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `alma-`, `site === Site.ALMA`, `companyName === 'Alma'`.                              | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (1 of 9 padded ~11.1 %).                                 | must     |
| FR-14 | D-11 **omitted** — 0 of 9 wire department names padded across 6 unique departments.                                      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ALMA, name: 'Alma', category: 'company' })
@Injectable()
export class AlmaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Alma'` lock; D-10 trailing-
  pad title-trim lock (`'Senior Data Scientist '` →
  `'Senior Data Scientist'`); D-11 clean dept pass-through
  lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #362):** Wire-shape variant 2 (canonical
  Greenhouse host). **Sixtieth** plugin in the cohort to use
  variant 2 — **the cohort crosses the 60-plugin variant-2
  threshold at this run.**
- **D-08 (run #362):** Decode-then-strip pipeline. **One-
  hundred-and-eighth** cohort plugin to apply D-08.
- **D-09 (run #362):** **Omitted** — case-symmetric bare-brand
  wire `'Alma'` (4 bytes; case-symmetric vs slug `alma` after
  casefold). 0 of 9 padded. **Ninety-ninth cohort plugin to
  omit D-09**.
- **D-10 (run #362):** **APPLIED with trailing-pad form.** 1
  of 9 wire titles padded with single-trailing-ASCII-space
  form (~11.1 % pad rate, all trailing-only — `'Senior Data
  Scientist '`). **Sixty-seventh cohort plugin to apply D-10**.
- **D-11 (run #362):** **Omitted.** 0 of 9 wire department
  names padded across 6 unique department names (`'Business
  Intelligence'`, `'Clinical Operations'`, `'Core Ops'`,
  `'Customer Experience'`, `'Data Science'`, `'Engineering'`
  — clean multi-token forms with internal whitespace).
  **Eighty-sixth cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #362):** **Zero structural deviations** from
  the Doximity (Spec 127) template — making this the
  **fortieth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-gofundme/src/gofundme.service.ts` —
  immediate predecessor (run #361); closed the ninth fresh
  probe sweep.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
