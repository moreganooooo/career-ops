# Spec: 169 — Source Company Plugin: Sezzle

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 169                                                                                                                                                                                            |
| Slug           | source-company-sezzle                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #379)                                                                                                                                                                              |
| Created        | 2026-05-05                                                                                                                                                                                     |
| Last updated   | 2026-05-05                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..168                                                                                                                                                                        |

## 1. Problem Statement

Run #378's Spec 168 closed end-to-end (Samsara shipped — two
structural deviations off Netskope: D-04 wire-shape variant
44 first cohort observation AND D-10 NEW same-title both-pad
sub-axis first cohort observation; 100-plugin D-11-omission
threshold crossed). Run #379 picks up the **seventeenth**
live hit alphabetically from the tenth-fresh-sweep candidate
pool: **Sezzle** (181 visible roles confirmed at run-379
start — closely matches the tenth-sweep estimate of ~180,
1-key inflation).

Sezzle, Inc. — operator of the **Buy-Now-Pay-Later (BNPL)
short-term-instalment payments platform pioneered around
the four-instalment-over-six-weeks consumer-credit data
model** (founded by Charlie Youakim, Paul Paradis, and
Killian Brackey in 2016 in Minneapolis, Minnesota; listed
publicly on Nasdaq under the ticker `SEZL` after a
secondary offering in August 2023; ships Sezzle Pay-in-4
(short-term BNPL), Sezzle Anywhere (cardless wallet),
Sezzle Up (credit-builder), and Sezzle Premium
(subscription-bundled merchant access) across the BNPL /
deferred-payments / consumer-credit segment — alongside
competitors Affirm, Klarna, Afterpay, Zip, PayPal Pay-in-4,
Apple Pay Later, and Splitit — with a hybrid distributed
workforce concentrated across Minneapolis (HQ), Toronto,
Sydney, Bangalore, Bogota, and Remote across the United
States, Canada, Australia, and Latin America) — publishes
its consolidated careers board through Greenhouse at the
bare slug `sezzle` (case-symmetric with the wire
`company_name === 'Sezzle'`; see § 10 D-05).

## 2. Goals

- Ship a `source-company-sezzle` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-instabase` (Spec 158) plugin — Instabase is
  the closest cohort cousin sharing four primary axes: D-04
  variant 2 + D-08 + D-09 case-symmetric + D-10 applied
  (mixed-pad form) + D-11 applied. **One D-11 sub-axis
  deviation** off Instabase: Sezzle expands D-11 from the
  trailing-pad-only sub-axis to a **mixed sub-axis** spanning
  three forms simultaneously (3 both-end + 1 leading-only +
  1 trailing-only of 11 unique departments) — the **first
  cohort observation of D-11 both-end pad sub-axis**, the
  **first cohort observation of D-11 leading-only pad
  sub-axis**, and the **first cohort observation of multi-
  character (2-character) leading whitespace pad on a wire
  department name**.
- **One structural deviation** from the Instabase template
  (D-11 sub-axis: trailing-pad-only → MIXED form with three
  NEW first-cohort sub-observations). The wire-implementation
  is byte-for-byte identical to Instabase because `.trim()`
  is symmetric over both ends and over multi-character
  whitespace runs, so the trimmed output collapses
  identically across all D-11 sub-axes.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Sezzle postings.
- Sezzle merchant-API / payments-API integration.
- Modeling 2-character vs 1-character leading whitespace as
  separate sub-axes downstream — the trimmed output collapses
  identically.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SEZZLE`** in
> the source registry, so that **a single `siteType:
> [Site.SEZZLE]` request returns Sezzle's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.SEZZLE = 'sezzle'` to the `Site` enum.                                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-sezzle`.                                                                   | must     |
| FR-3  | `SezzleService.scrape(input)` returns a `JobResponseDto`; never throws.                                                  | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `sezzle-`, `site === Site.SEZZLE`, `companyName === 'Sezzle'`.                       | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers mixed pad form (38 of 181 padded ~21.0 % — 6 leading-only + 32 trailing-only). | must     |
| FR-14 | D-11 **applied** — dept `.trim()` covers **NEW MIXED form** (5 of 11 unique dept names padded — 3 both-end with 2-char leading whitespace + 1 leading-only + 1 trailing-only). | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SEZZLE, name: 'Sezzle', category: 'company' })
@Injectable()
export class SezzleService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Sezzle'` lock; D-10 mixed-
  pad title-trim lock (trailing + leading); **D-11 NEW
  both-end pad dept-trim lock** (`'  EX-Executive '` →
  `'EX-Executive'`) plus clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #379):** Wire-shape variant 2 (canonical
  Greenhouse host). **Seventy-second** plugin in the cohort
  to use variant 2.
- **D-05 (run #379):** Bare slug `sezzle` — case-symmetric
  with the wire `company_name === 'Sezzle'`.
- **D-08 (run #379):** Decode-then-strip pipeline. **One-
  hundred-and-twenty-fifth** cohort plugin to apply D-08.
- **D-09 (run #379):** **Omitted** — case-symmetric bare-brand
  wire `'Sezzle'` (6 bytes; case-symmetric vs slug `sezzle`
  after casefold). 0 of 181 padded. **One-hundred-and-
  sixteenth cohort plugin to omit D-09**.
- **D-10 (run #379):** **APPLIED with mixed pad form
  (leading + trailing).** 38 of 181 wire titles padded
  (~21.0 % pad rate) split as **6 leading-only-pad** (e.g.
  `' AI Engineer I (Remote)'` x6 — observed across multiple
  Bogota roles) and **32 trailing-only-pad** (e.g.
  `'Chief Risk Officer '`, `'Customer Service Agent ( English/ French) '`,
  `'Director of Compliance - Product '`). No same-title
  both-pad observations. **Tenth cohort observation of
  leading-pad sub-axis** after Chainguard / Oscar / Celonis
  / Formlabs / GoFundMe / BitGo / Instabase / Iterable /
  Quanata. **Seventy-eighth cohort plugin to apply D-10**.
- **D-11 (run #379):** **APPLIED with NEW MIXED form +
  three first-cohort sub-observations.** 5 of 11 unique
  wire department names padded (~45 % unique-dept pad rate)
  split as: **3 both-end pad** (`'  CS-Customer Support '`,
  `'  EX-Executive '`, `'  PR-Product '` — each carrying
  **2-character leading whitespace** AND 1-character
  trailing whitespace simultaneously — **first cohort
  observation of D-11 both-end pad sub-axis** AND **first
  cohort observation of multi-character (2-character)
  leading whitespace pad on a wire department name**), **1
  leading-only pad** (`'  PO-People Ops'` — also 2-character
  leading whitespace; **first cohort observation of D-11
  leading-only pad sub-axis**), and **1 trailing-only pad**
  (`'STR-Corporate Development '`). The remaining 6 unique
  department names are clean (`'DS-Data Science'`,
  `'DS-Risk & Fraud'`, `'DV-Development'`, `'Internships'`,
  `'LG-Legal'`, `'MK-Marketing'`). The plugin applies
  `.trim()` to the wire `departments[0].name` byte-for-byte
  before downstream emit. `.trim()` is symmetric over both
  ends and over multi-character whitespace runs, so the
  wire-implementation is byte-for-byte identical to all
  prior trim-based templates. **Nineteenth cohort plugin to
  apply D-11**.
- **D-13 (run #379):** **One structural deviation** from
  the Instabase (Spec 158) template — D-11 sub-axis
  expansion (trailing-pad-only → MIXED form with three NEW
  first-cohort sub-observations). The wire-implementation
  is byte-for-byte identical at the `.trim()` boundary
  because `.trim()` is symmetric over both ends and over
  multi-character whitespace runs. **Forty-eighth near-clean
  re-spin** in run-history (cohort tracks "near-clean" re-
  spins separately from zero-deviation clean re-spins; this
  one is "near-clean" because of the D-11 sub-axis expansion
  with three NEW first-cohort sub-observations, with the
  implementation byte-for-byte identical to Instabase
  because `.trim()` is symmetric).

## 11. References

- `packages/plugins/source-company-instabase/src/instabase.service.ts` —
  closest cohort cousin (D-11 trailing-pad-only template).
- `packages/plugins/source-company-melio/src/melio.service.ts` —
  prior D-11-applied template (Spec 130).
- `packages/plugins/source-company-samsara/src/samsara.service.ts` —
  immediate predecessor (run #378 — D-04 variant 44 first cohort observation).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
