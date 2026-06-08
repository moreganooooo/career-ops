# Spec: 126 — Source Company Plugin: Dialpad

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 126                                                                                                                                                                                            |
| Slug           | source-company-dialpad                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #336)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..125                                                                                                                                                                        |

## 1. Problem Statement

Run #335's Spec 125 closed end-to-end (Descope shipped — D-11
applied with new cohort high-water mark for listing-level pad
rate at 75%). Run #336 picks up the **seventh** live hit
alphabetically from the eighth-fresh-sweep candidate pool:
**Dialpad** (86 visible roles confirmed at run-336 start —
**third eighth-sweep candidate where probe-counter UNDER-
counted** the actual job total; estimate ~35 keys vs actual
86; ~0.4× ratio — even tighter under-count than Checkr at
~0.5×).

Dialpad, Inc. — operator of the **dominant AI-native business-
communications platform pioneered around the unified-AI-
voice-meetings-messaging-contact-center data model** (founded
by Craig Walker (founder of GrandCentral, sold to Google as
Google Voice) in 2011 in San Francisco; raised ~$415M across
rounds at peak ~$2.2B valuation in December 2021 led by ICONIQ
Capital and OMERS Growth Equity; ships Dialpad Ai Voice
(business phone), Ai Meetings, Ai Sales (Highspot-acquired
Ai Sales Center July 2024 for ~$50M), Ai Contact Center,
TalkIQ-derived real-time-transcription / sentiment, and
Dialpad Ai Recap across the AI-business-communications /
UCaaS / CCaaS / contact-center segment — alongside competitors
RingCentral, 8x8, Cisco Webex, Zoom Phone, Microsoft Teams
Phone, Vonage, and Twilio Flex — with a hybrid distributed
workforce concentrated across San Francisco (HQ), Vancouver
BC, Tokyo, London, Bangalore, Tel Aviv, and Remote across
the United States, Canada, the United Kingdom, the European
Union, Japan, Israel, and the Asia-Pacific region) — is
published at the bare `dialpad` Greenhouse slug (case-
symmetric with the wire `company_name === 'Dialpad'` after
casefold).

## 2. Goals

- Ship a `source-company-dialpad` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-branch` plugin — Branch is the closest
  cohort cousin sharing all five primary axes: D-04 variant 2
  + D-08 + D-09 case-symmetric + D-10 omitted + D-11 omitted.
- **Zero structural deviations** from Branch, with **first-
  cohort D-11 sub-axis observation**: numeric-prefix-with-
  hyphen-separator dept naming convention (`'120 - Product
  Operations'`, `'130 - Customer Support'`, etc. — all 33
  unique dept names follow this format). Distinct from
  Constant Contact's prefix-numeric-with-space-only-
  separator (`'100 Engineering'`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Dialpad postings.
- Dialpad product-API / Ai Voice / Ai Meetings / Ai Contact
  Center integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DIALPAD`** in
> the source registry, so that **a single `siteType:
> [Site.DIALPAD]` request returns Dialpad's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DIALPAD = 'dialpad'` to the `Site` enum.                                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-dialpad`.                                           | must     |
| FR-3  | `DialpadService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `dialpad-`, `site === Site.DIALPAD`, `companyName === 'Dialpad'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **omitted** — title emitted byte-for-byte (0 of 86 wire titles padded).                      | must     |
| FR-14 | D-11 **omitted** — 0 of 86 wire department names padded; numeric-prefix-with-hyphen-separator preserved byte-for-byte. | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DIALPAD, name: 'Dialpad', category: 'company' })
@Injectable()
export class DialpadService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Dialpad'` lock; D-10 byte-
  for-byte title pass-through (no trim) lock; **D-11 numeric-
  prefix-with-hyphen-separator dept naming pass-through lock**
  (`'120 - Product Operations'` byte-for-byte).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #336):** Wire-shape variant 2. **Forty-fifth**
  plugin in the cohort to use variant 2.
- **D-08 (run #336):** Decode-then-strip pipeline. **Eighty-
  second** cohort plugin to apply D-08.
- **D-09 (run #336):** **Omitted** — case-symmetric bare-brand
  wire `'Dialpad'` (7 bytes). **Seventy-third cohort plugin
  to omit D-09**.
- **D-10 (run #336):** **Omitted** — 0 of 86 wire titles
  padded. **Twenty-fifth cohort plugin to omit D-10**.
- **D-11 (run #336):** **Omitted with FIRST-COHORT numeric-
  prefix-with-hyphen-separator dept naming sub-axis.** 0 of
  86 wire department names padded across 33 unique department
  names — but **all 33 follow a `<numeric_code> - <name>`
  convention with hyphen separator** (`'120 - Product
  Operations'`, `'130 - Customer Support'`, `'140 - Customer
  Success'`, `'150 - Professional Services'`, `'152 -
  Customer Onboarding'`, `'153 - TAM Services'`, `'211 -
  Product Engineering'`, `'212 - Platform Engineering'`,
  `'213 - Telephony Engineering'`, `'214 - AI Engineering'`,
  `'216 - Infrastructure Engineering'`, `'220 - Design'`,
  `'230 - Quality Assurance'`, `'240 - Product Management'`,
  plus 19 others). **Distinct from Constant Contact's
  numeric-prefix-with-space-only-separator** (`'100
  Engineering'` — no hyphen). **First cohort observation of
  the hyphen-separator variant** of numeric-prefix dept
  naming. Standard pass-through preserves the bytes byte-
  for-byte. **Sixty-fifth cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #336):** **Zero structural deviations** from the
  Branch (Spec 121) template — making this the **twenty-
  eighth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin. (The first-cohort
  numeric-prefix-with-hyphen-separator dept naming sub-axis
  is captured as an observability note — pass-through is
  byte-for-byte, so no axis change is required.)

## 11. References

- `packages/plugins/source-company-branch/src/branch.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-constantcontact/src/constantcontact.service.ts` —
  prior cohort plugin with numeric-prefix dept naming
  (space-only separator sub-axis).
- `packages/plugins/source-company-descope/src/descope.service.ts` —
  immediate predecessor (run #335).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
