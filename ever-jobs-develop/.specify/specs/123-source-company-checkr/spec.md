# Spec: 123 — Source Company Plugin: Checkr

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 123                                                                                                                                                                                            |
| Slug           | source-company-checkr                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #333)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..122                                                                                                                                                                        |

## 1. Problem Statement

Run #332's Spec 122 closed end-to-end (Chainguard shipped —
25th clean re-spin off Otter; first-cohort D-10 leading-pad
sub-axis). Run #333 picks up the **fourth** live hit
alphabetically from the eighth-fresh-sweep candidate pool:
**Checkr** (65 visible roles confirmed at run-333 start —
**probe estimate of ~33 keys was UNDER-counting** by ~2×;
first observed eighth-sweep candidate where probe-counter
under-counts rather than over-counts the actual job total).

Checkr, Inc. — operator of the **dominant API-driven
background-screening + identity-verification platform
pioneered around the people-trust-as-a-service data model**
(founded by Daniel Yanisse and Jonathan Perichon in 2014 in
San Francisco; raised ~$679M across rounds at peak ~$5B
valuation in September 2021 led by Tiger Global Management
and T. Rowe Price; ships Checkr Background Checks (criminal /
MVR / drug / employment / education verifications), CheckrPay,
Continuous Crime Monitoring, Adverse Action workflows, Truework
income / employment verification (acquired November 2024 for
~$200M), and CheckrX (FCRA-compliant tenant-facing screening)
across the background-screening / identity-verification /
HR-tech segment — alongside competitors Sterling, HireRight,
Accurate Background, GoodHire, and First Advantage — with a
hybrid distributed workforce concentrated across San Francisco
(HQ) and Remote across the United States) — is published at
the bare `checkr` Greenhouse slug (case-symmetric with the
wire `company_name === 'Checkr'` after casefold).

## 2. Goals

- Ship a `source-company-checkr` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-otter` plugin — Otter is the closest cohort
  cousin sharing all five primary axes: D-04 variant 2 + D-08
  + D-09 case-symmetric + D-10 applied + D-11 omitted.
- **Zero structural deviations** from Otter.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Checkr postings.
- Checkr product-API / Background Checks / Truework
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CHECKR`** in the
> source registry, so that **a single `siteType: [Site.CHECKR]`
> request returns Checkr's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CHECKR = 'checkr'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-checkr`.                                            | must     |
| FR-3  | `CheckrService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `checkr-`, `site === Site.CHECKR`, `companyName === 'Checkr'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 65 padded ~3.1 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 65 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CHECKR, name: 'Checkr', category: 'company' })
@Injectable()
export class CheckrService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Checkr'` lock; D-10 trailing-
  pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #333):** Wire-shape variant 2. **Forty-second**
  plugin in the cohort to use variant 2.
- **D-08 (run #333):** Decode-then-strip pipeline. **Seventy-
  ninth** cohort plugin to apply D-08.
- **D-09 (run #333):** **Omitted** — case-symmetric bare-brand
  wire `'Checkr'` (6 bytes). **Seventieth cohort plugin to
  omit D-09 — crosses the 70-plugin D-09-omission threshold
  at this run.**
- **D-10 (run #333):** **APPLIED with trailing-pad form.** 2
  of 65 wire titles padded (~3.1 % pad rate, all trailing-
  only — `'Implementation Manager, Customer Success '`,
  `'Senior Python Engineer, Truework '` — the second carries
  acquisition-brand-suffix alongside trailing pad). **Forty-
  fifth cohort plugin to apply D-10**.
- **D-11 (run #333):** **Omitted** — 0 of 65 wire department
  names padded across 13 unique department names (`'CheckrX'`,
  `'Customer Success'`, `'Engineering'`, `'Finance'`,
  `'Implementations'`, `'Information Technology'`, `'Legal &
  Compliance'`, `'Marketing'`, `'Operations'`, `'People'`,
  `'Product'`, `'Revenue Operations'`, `'Sales'` — clean
  multi-token forms with internal whitespace and ampersands;
  `'CheckrX'` carries the **embedded brand-name dept naming
  convention** as a sub-axis observation). **Sixty-third
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #333):** **Zero structural deviations** from the
  Otter (Spec 116) template — making this the **twenty-sixth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin.
- **D-14 (probe-counter under-count observation):** Run #333
  marks the **first eighth-sweep candidate where the probe-
  counter UNDER-counted** the actual job total — estimate ~33
  keys vs actual 65 jobs (~0.5× ratio). Prior 13 eighth-sweep
  candidates over-counted (1× to ~9× inflation). This
  asymmetry is benign at the catalogue level but useful as a
  forward-pointer for run-#334+ probe-counter calibration.

## 11. References

- `packages/plugins/source-company-otter/src/otter.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-chainguard/src/chainguard.service.ts` —
  immediate predecessor (run #332).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
