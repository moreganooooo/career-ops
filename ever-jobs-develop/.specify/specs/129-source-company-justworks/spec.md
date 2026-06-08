# Spec: 129 — Source Company Plugin: Justworks

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 129                                                                                                                                                                                            |
| Slug           | source-company-justworks                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #339)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..128                                                                                                                                                                        |

## 1. Problem Statement

Run #338's Spec 128 closed end-to-end (Dremio shipped — first
cohort observation of variant 33; first-cohort sentence-style
catchall dept). Run #339 picks up the **tenth** live hit
alphabetically from the eighth-fresh-sweep candidate pool:
**Justworks** (82 visible roles confirmed at run-339 start —
**fourth eighth-sweep candidate where probe-counter UNDER-
counted** — estimate ~60 keys vs actual 82, ~0.73× ratio).

Justworks, Inc. — operator of the **dominant SMB-PEO +
all-in-one HR platform pioneered around the certified-
professional-employer-organization-as-a-service data model**
(founded by Isaac Oates in 2012 in New York City; raised
~$143M across rounds at peak ~$2B valuation in February 2022
led by Tiger Global Management; ships Justworks PEO Plus
(payroll + benefits + HR + compliance + workers' comp under
co-employer model), Justworks Payroll (standalone payroll for
non-PEO customers), Justworks Time Tracking, Justworks Hours,
and Justworks International Contractor Payments + EOR
(Employer of Record) services across the SMB-PEO / payroll-
HR / employer-of-record segment — alongside competitors Gusto,
TriNet, Insperity, Rippling, ADP TotalSource, Paychex,
Deel, Remote, Velocity Global, and Sequoia One — with a
hybrid distributed workforce concentrated across New York
City (HQ), Tampa, Aveiro (Portugal), London, and Remote
across the United States, Portugal, the United Kingdom, and
the European Union) — is published at the bare `justworks`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Justworks'` after casefold).

## 2. Goals

- Ship a `source-company-justworks` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-descript` plugin — Descript is the closest
  cohort cousin sharing all five primary axes: D-04 variant 10
  (legacy hosted-board apex) + D-08 + D-09 case-symmetric +
  D-10 applied + D-11 omitted.
- **Zero structural deviations** from Descript, with **first-
  cohort D-10 sub-axis observation**: double-trailing-space
  pad form (`'Overnight Customer Support Advocate (Remote)  '`
  — 2 trailing spaces). `.trim()` handles transparently.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Justworks postings.
- Justworks product-API / PEO / Payroll / EOR integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.JUSTWORKS`** in
> the source registry, so that **a single `siteType:
> [Site.JUSTWORKS]` request returns Justworks's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.JUSTWORKS = 'justworks'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-justworks`.                                         | must     |
| FR-3  | `JustworksService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `justworks-`, `site === Site.JUSTWORKS`, `companyName === 'Justworks'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10 — legacy hosted-board apex).            | must     |
| FR-13 | D-10 **applied** with first-cohort double-trailing-space sub-axis — `.trim()` handles 1- and 2-space pads. | must |
| FR-14 | D-11 **omitted** — 0 of 82 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.JUSTWORKS, name: 'Justworks', category: 'company' })
@Injectable()
export class JustworksService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-10 URL pass-
  through (`boards.greenhouse.io/justworks/jobs/<id>?gh_jid=<id>`);
  D-09 case-symmetric `'Justworks'` lock; D-10 trailing-pad
  trim lock with **first-cohort double-space sub-axis**
  (`'... (Remote)  '` — 2 spaces — trims to clean); D-11
  clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #339):** **Wire-shape variant 10 (legacy hosted-
  board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`).**
  **Sixth** plugin in the cohort to use variant 10 after
  Chime, Faire, Flexport, Braze, and Descript.
- **D-08 (run #339):** Decode-then-strip pipeline. **Eighty-
  fifth** cohort plugin to apply D-08.
- **D-09 (run #339):** **Omitted** — case-symmetric bare-brand
  wire `'Justworks'` (9 bytes). **Seventy-sixth cohort plugin
  to omit D-09**.
- **D-10 (run #339):** **APPLIED with FIRST-COHORT double-
  trailing-space pad form.** 5 of 82 wire titles padded
  (~6.1 % pad rate, all trailing-only) — but **one carries
  DOUBLE trailing space** (`'Overnight Customer Support
  Advocate (Remote)  '` — 2 spaces). **First cohort
  observation of multi-byte trailing-pad form** in D-10. The
  plugin's `.trim()` operation strips both 1-space and 2-
  space pads transparently. **Forty-ninth cohort plugin to
  apply D-10**.
- **D-11 (run #339):** **Omitted** — 0 of 82 wire department
  names padded across 17 unique department names (`'Corporate
  & Finance'`, `'Customer Success'`, `'Customer Success,
  International Products'`, `'Engineering'`, `'IT'`, `'Legal
  & Compliance'`, `'Marketing'`, `'Operations, Benefits'`,
  `'Operations, Payments & Tax'`, `'People'`, `'Product'`,
  `'Product Design'`, plus 5 others — clean multi-token forms
  with internal whitespace, ampersands, and commas). **Sixty-
  eighth cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #339):** **Zero structural deviations** from the
  Descript (Spec 112) template — making this the **thirtieth**
  Greenhouse-only company-direct plugin in run-history to
  ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-descript/src/descript.service.ts` —
  closest cohort cousin (variant 10 zero-deviation match).
- `packages/plugins/source-company-dremio/src/dremio.service.ts` —
  immediate predecessor (run #338).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
