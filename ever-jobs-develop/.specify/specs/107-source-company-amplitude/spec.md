# Spec: 107 — Source Company Plugin: Amplitude

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 107                                                                                                                                                                                            |
| Slug           | source-company-amplitude                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #317)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..106                                                                                                                                                                        |

## 1. Problem Statement

Run #316's Spec 106 closed end-to-end (Airtable shipped —
seventh-fresh-sweep launch with 9 live hits). Run #317 picks
up the **second** live hit alphabetically from the seventh-
fresh-sweep candidate pool: **Amplitude** (60 visible roles
confirmed at run-317 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/amplitude/jobs?content=true`).

Amplitude, Inc. — operator of the **dominant product-analytics
+ digital-experience-analytics platform pioneered around the
event-stream behavioral-analytics data model** (founded by
Spenser Skates, Curtis Liu, and Jeffrey Wang in 2012 in San
Francisco; raised ~$336M+ across rounds; went public via
direct listing on the NASDAQ in September 2021 at a $7B
initial valuation under ticker `AMPL`; market-cap settled in
the $1-3B band as of 2026; ships Amplitude Analytics, Session
Replay, Experiment, Audiences, Data Governance, and the Plot
behavioral-data-as-a-graph product across the product-analytics
/ digital-experience-analytics segment — alongside competitors
Mixpanel, Heap, FullStory, Pendo, Adobe Analytics, and Google
Analytics 4 — with a hybrid distributed workforce concentrated
across San Francisco (HQ), New York, Vancouver, London,
Singapore, Paris, and Remote across the United States, Canada,
the United Kingdom, and the European Union) — is published at
the bare `amplitude` Greenhouse slug (the lowercase 9-byte
brand-stem; the wire `company_name === 'Amplitude '` carries a
**single trailing ASCII-space pad byte** — same shape as
Fivetran's run-292 first-cohort trailing-whitespace D-09
application; the post-strip form `'Amplitude'` is byte-
symmetric with the slug after casefold) and was confirmed live
via run #317's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-amplitude` plugin returning live
  `JobPostDto` rows for the public Amplitude careers board.
- Match the structural and behavioural shape of the existing
  `source-company-fivetran` plugin — Fivetran is the closest
  cohort cousin via shared D-09 application axis (trailing-
  whitespace strip — same sub-axis). **Two structural
  deviations** from Fivetran:
  1. **D-04 variant 2** (Fivetran variant 19 `www.`-prefixed
     `/careers/job` query-only-id; Amplitude variant 2
     canonical Greenhouse host).
  2. **D-10 sub-axis** (Fivetran 0/173 padded — D-10 omitted;
     Amplitude 3/60 padded with mixed trailing + dual pad
     forms — D-10 applied — third cohort observation of
     dual-pad on the title axis after New Relic / Scopely /
     Airtable, lifting dual-pad to a recurring axis).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the D-09 trailing-whitespace
  strip sub-axis, and the D-10 trailing-pad sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Amplitude postings.
- Amplitude product-API / analytics-event / experiment
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.AMPLITUDE`** in
> the source registry, so that **a single `siteType:
> [Site.AMPLITUDE]` request returns Amplitude's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.AMPLITUDE = 'amplitude'` to the `Site` enum.                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-amplitude`.                                         | must     |
| FR-3  | `AmplitudeService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `amplitude-`, `site === Site.AMPLITUDE`, `companyName === 'Amplitude'` (D-09 applied — trailing-whitespace stripped). | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad and dual-pad sub-axes (3 of 60 padded).    | must     |
| FR-14 | D-09 **applied** — `company_name` `.trim()` strips trailing ASCII-space pad (100 % wire pad rate). | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.AMPLITUDE, name: 'Amplitude', category: 'company' })
@Injectable()
export class AmplitudeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/amplitude/jobs/`; does NOT
    contain `amplitude.com` (anti-substring lock).
  - **D-09 application lock with trailing-whitespace strip
    sub-axis**: input `company_name === 'Amplitude '`
    (10 bytes; 9-byte brand + 1 trailing space) → emitted
    `companyName === 'Amplitude'` (9 bytes — byte-distinct +
    1-byte-shorter; does NOT end with whitespace);
    `'Amplitude'.toLowerCase() === 'amplitude' === slug`
    (matches the slug under casefold post-strip).
  - **D-10 application lock with trailing-pad sub-axis**:
    input title `'Engineering: Staff Customer Forward
    Deployed Engineer '` (trailing space) → emitted
    `'Engineering: Staff Customer Forward Deployed Engineer'`
    (byte-distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Partnerships (Sales)'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #317):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/amplitude/jobs/<id>`.
  **Thirty-second** plugin in the cohort to use variant 2.
- **D-08 (run #317):** Decode-then-strip pipeline. **Sixty-
  third** cohort plugin to apply D-08.
- **D-09 (run #317):** **APPLIED with trailing-whitespace strip
  sub-axis.** Wire `company_name === 'Amplitude '` byte-for-
  byte (10 bytes; 9-byte brand-stem + 1 trailing ASCII-space
  pad); 100 % of run-317 listings carry the trailing-space
  wire form. The plugin applies `.trim()` to
  `listing.company_name` before emit so the emitted
  `companyName === 'Amplitude'` (9 bytes — byte-symmetric with
  the lowercase 9-byte slug `amplitude` after casefold).
  **Third cohort plugin to apply D-09** (after Fivetran's
  run-292 first-ever trailing-whitespace and sweetgreen's
  run-314 first-ever leading-whitespace); same sub-axis as
  Fivetran (trailing-whitespace strip). Amplitude lifts the
  trailing-whitespace D-09 sub-axis from a one-off to a
  recurring axis.
- **D-10 (run #317):** **APPLIED with mixed trailing + dual-
  pad form.** 3 of 60 wire titles in the run-317 probe carry
  pad bytes (~5.0 % pad rate): 2 trailing-only
  (`'Engineering: Staff Customer Forward Deployed Engineer '`,
  `'Senior Software Engineer,  Data Management '`) + 1 dual
  (`' Senior International Payroll Specialist '`). **Fourth
  cohort observation of dual-pad on the title axis** (after
  New Relic's run-295 first-ever, Scopely's run-297 second,
  and Airtable's run-316 third — Amplitude's dual-pad
  observation makes dual-pad a recurring axis with four
  observations across the cohort). Standard
  `String.prototype.trim()` strips all sub-axes. **Thirty-
  first cohort plugin to apply D-10**.
- **D-11 (run #317):** **Omitted** — 0 of 60 wire department
  names padded across 23 unique department names
  (`'Partnerships (Sales)'`, `'Sales Operations'`, `'CFO :
  Deal Desk and Sales Planning'`, `'Corporate Marketing'`,
  `'Account Executives'`, `'Engineering : FDE'`, `'Engineering
  : Blades'`, `'Growth & Digital Marketing'`, `'Solutions
  Consulting'`, `'CFO : Accounting'`, `'Product Marketing'`,
  `'Sales : Renewals'`, plus 11 others — clean multi-token
  forms with internal whitespace, parentheses, ampersands,
  colons, and CFO-ownership prefixes). **Forty-eighth cohort
  plugin** with fully-clean department pass-through.
- **D-13 (run #317):** **Two structural deviations** from the
  Fivetran (Spec 082) template:
  1. D-04 wire-shape variant 2 (Fivetran variant 19; Amplitude
     variant 2 — canonical Greenhouse host).
  2. D-10 sub-axis (Fivetran 0/173 padded — D-10 omitted;
     Amplitude 3/60 mixed trailing + dual — D-10 applied,
     fourth cohort dual-pad observation).

## 11. References

- `packages/plugins/source-company-fivetran/src/fivetran.service.ts` —
  closest cohort cousin (D-09 application reference).
- `packages/plugins/source-company-airtable/src/airtable.service.ts` —
  immediate predecessor in run-history (run #316).
- `packages/plugins/source-company-newrelic/src/newrelic.service.ts` —
  first-cohort dual-pad observation reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
