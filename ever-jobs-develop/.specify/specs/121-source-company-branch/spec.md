# Spec: 121 — Source Company Plugin: Branch

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 121                                                                                                                                                                                            |
| Slug           | source-company-branch                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #331)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..120                                                                                                                                                                        |

## 1. Problem Statement

Run #330's Spec 120 closed end-to-end (Betterment shipped —
launched eighth fresh probe sweep with 15 fresh hits; first
cohort observation of variant 32). Run #331 picks up the
**second** live hit alphabetically from the eighth-fresh-sweep
candidate pool: **Branch** (11 visible roles confirmed at
run-331 start).

Branch Metrics, Inc. (Branch.io) — operator of the **dominant
mobile deep-linking + cross-platform attribution platform
pioneered around the universal-deferred-deep-link-as-a-
service data model** (founded by Alex Austin, Mike Molinet,
Mada Seghete, and Dmitri Gaskin in 2014 in Palo Alto,
California; raised ~$130M across rounds at peak ~$4B
valuation in February 2022 led by Founders Fund; ships
Branch Universal Links + Universal Email + Universal Ads,
Branch Attribution, Mobile Linking Platform (MLP), Journeys
(in-app banners), Quick Links, and Predictive Modeling +
SafeTrack across the mobile-deep-linking / cross-platform-
attribution / mobile-marketing-analytics segment — alongside
competitors AppsFlyer, Adjust, Kochava, Singular, and Apple's
own SKAdNetwork — with a hybrid distributed workforce
concentrated across Palo Alto (HQ), San Francisco, and Remote
across the United States) — is published at the bare `branch`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Branch'` after casefold).

> **Note on slug-vs-brand asymmetry:** the slug `branch`
> matches multiple companies (Branch.io mobile deep-linking,
> Branch International digital insurance, Branch Insurance,
> Branch Furniture, etc.); the wire department names
> (`'Customer Integration'`, `'Support Operations'`) suggest
> the published board covers the **Branch.io mobile deep-
> linking** brand. Recorded as observability note.

## 2. Goals

- Ship a `source-company-branch` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-pendo` plugin — Pendo is the closest cohort
  cousin (immediate-prior matching template) sharing all five
  primary axes: D-04 variant 2 + D-08 + D-09 case-symmetric +
  D-10 omitted + D-11 omitted.
- **Zero structural deviations** from Pendo.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Branch postings.
- Branch product-API / Universal Links / Attribution
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BRANCH`** in the
> source registry, so that **a single `siteType: [Site.BRANCH]`
> request returns Branch's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BRANCH = 'branch'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-branch`.                                            | must     |
| FR-3  | `BranchService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `branch-`, `site === Site.BRANCH`, `companyName === 'Branch'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **omitted** — title emitted byte-for-byte (0 of 11 wire titles padded).                      | must     |
| FR-14 | D-11 **omitted** — 0 of 11 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.BRANCH, name: 'Branch', category: 'company' })
@Injectable()
export class BranchService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Branch'` lock; D-10 byte-
  for-byte title pass-through (no trim); D-11 clean dept
  pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #331):** Wire-shape variant 2. **Fortieth**
  plugin in the cohort to use variant 2 — the cohort crosses
  the 40-plugin variant-2 threshold at this run.
- **D-08 (run #331):** Decode-then-strip pipeline. **Seventy-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #331):** **Omitted** — case-symmetric bare-brand
  wire `'Branch'` (6 bytes). **Sixty-eighth cohort plugin to
  omit D-09**.
- **D-10 (run #331):** **Omitted** — 0 of 11 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Twenty-third cohort plugin to omit
  D-10**.
- **D-11 (run #331):** **Omitted** — 0 of 11 wire department
  names padded across 7 unique department names (`'Customer
  Integration'`, `'Engineering'`, `'Finance'`, `'Marketing'`,
  `'Sales'`, `'Security'`, `'Support Operations'` — clean
  multi-token forms). **Sixty-first cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #331):** **Zero structural deviations** from the
  Pendo (Spec 118) template — making this the **twenty-fourth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin.

## 11. References

- `packages/plugins/source-company-pendo/src/pendo.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-betterment/src/betterment.service.ts` —
  immediate predecessor (run #330).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
