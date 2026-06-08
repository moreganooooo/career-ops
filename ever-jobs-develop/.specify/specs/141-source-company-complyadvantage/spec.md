# Spec: 141 — Source Company Plugin: ComplyAdvantage

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 141                                                                                                                                                                                            |
| Slug           | source-company-complyadvantage                                                                                                                                                                 |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #351)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..140                                                                                                                                                                        |

## 1. Problem Statement

Run #350's Spec 140 closed end-to-end (Celonis shipped — first
cohort observation of meaningful-volume D-10 leading-pad sub-
axis). Run #351 picks up the **seventh** live hit alphabetically
from the ninth-fresh-sweep candidate pool: **ComplyAdvantage**
(33 visible roles confirmed at run-351 start — ninth-sweep
estimate ~33, **1× exact match** — second 1× match in the
ninth-sweep after BEAM and BigID).

ComplyAdvantage Ltd. — operator of the **dominant AI-driven
financial-crime risk intelligence and AML/CFT compliance
platform** (founded by Charles Delingpole in 2014 in London,
UK; private since the 2022 Series D round at ~$3B valuation;
ships ComplyAdvantage Customer Screening, Transaction
Monitoring, Adverse Media Screening, and Mesh AI agentic
workflow automation across the financial-crime-prevention /
AML-compliance / fintech-regtech vertical — alongside
competitors Refinitiv World-Check (LSEG), Dow Jones Risk &
Compliance, NameScan, Sanction Scanner, and ComplyCube — with
a hybrid distributed workforce concentrated across London (HQ),
New York City (US HQ), Singapore, Bucharest, and Remote across
the United Kingdom, the United States, EMEA, and APAC) — is
published at the bare `complyadvantage` Greenhouse slug
(case-asymmetric vs the wire `company_name === 'ComplyAdvantage'`
— TWO-cap PascalCase form with caps at byte indices 0 and 6).

## 2. Goals

- Ship a `source-company-complyadvantage` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-epicgames` plugin — Epic Games is the
  closest cohort cousin sharing variant 13 (`<brand-domain>.com/careers/jobs/<id>?gh_jid=<id>`
  bare-domain dual-id form), D-08, D-10 applied, D-11 omitted.
- **One structural deviation** from Epic Games: **D-09 omitted
  with TWO-cap PascalCase case-asymmetric wire form**
  (`'ComplyAdvantage'` 15 bytes; case-asymmetric vs slug
  `complyadvantage` at byte indices 0 and 6 — caps form
  embedded `Advantage` word boundary). Epic Games has multi-
  token bare-brand `'Epic Games'` with internal whitespace —
  ComplyAdvantage has CamelCase concatenation. **Sixth cohort
  observation of TWO-cap PascalCase D-09 sub-axis** after SoFi
  (caps 0/2), StockX (caps 0/5), xAI (caps 0/2 lowercase
  first), LaunchDarkly (caps 0/6), and PagerDuty (caps 0/5).
  ComplyAdvantage's caps-position pattern (0/6) **matches
  LaunchDarkly exactly** — second cohort observation of caps-
  at-0/6 sub-pattern within TWO-cap PascalCase.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ComplyAdvantage postings.
- ComplyAdvantage product-API / Customer Screening /
  Transaction Monitoring / Mesh AI integration.
- Downstream normalisation of CamelCase company-name —
  scrape-layer contract is wire-faithful pass-through.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.COMPLYADVANTAGE`**
> in the source registry, so that **a single `siteType:
> [Site.COMPLYADVANTAGE]` request returns ComplyAdvantage's
> open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.COMPLYADVANTAGE = 'complyadvantage'` to the `Site` enum.                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-complyadvantage`.                                            | must     |
| FR-3  | `ComplyAdvantageService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                          | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.               | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `complyadvantage-`, `site === Site.COMPLYADVANTAGE`, `companyName === 'ComplyAdvantage'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                            | must     |
| FR-8  | `input.searchTerm` honoured.                                                                               | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                            | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                           | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                           | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 13 `complyadvantage.com/careers/jobs/<id>?gh_jid=<id>`); fallback uses canonical Greenhouse variant-2 form. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (8 of 33 padded ~24.2 %, all trailing-only). | must  |
| FR-14 | D-11 **omitted** — 0 of 33 wire department names padded across 5 unique departments.                       | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.COMPLYADVANTAGE, name: 'ComplyAdvantage', category: 'company' })
@Injectable()
export class ComplyAdvantageService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-13 URL pass-
  through; D-09 TWO-cap PascalCase `'ComplyAdvantage'` lock;
  D-10 trailing-pad title-trim lock; D-11 clean dept pass-
  through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #351):** Wire-shape variant 13 (bare brand-
  domain dual-id form `complyadvantage.com/careers/jobs/<id>?gh_jid=<id>`).
  **Sixth** plugin in the cohort to use variant 13 (after
  Epic Games, Bitwarden's predecessor lineage, Fivetran's
  related sub-form, Lattice, Stitch Fix). **Same shape as
  Epic Games (Spec 069 § 10 D-04)** — second-direct cohort
  re-use of variant 13.
- **D-08 (run #351):** Decode-then-strip pipeline. **Ninety-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #351):** **Omitted with TWO-cap PascalCase case-
  asymmetric wire form.** Wire `'ComplyAdvantage'` byte-for-
  byte (15 bytes; case-asymmetric vs slug `complyadvantage`
  at byte indices 0 and 6 — caps form embedded `Advantage`
  word boundary). **Sixth cohort observation of TWO-cap
  PascalCase D-09 sub-axis** after SoFi (caps 0/2), StockX
  (caps 0/5), xAI (caps 0/2 lowercase first), LaunchDarkly
  (caps 0/6), PagerDuty (caps 0/5). **Caps-at-0/6 matches
  LaunchDarkly exactly** — second cohort plugin with this
  caps-position sub-pattern. **Eighty-eighth cohort plugin
  to omit D-09**.
- **D-10 (run #351):** **APPLIED with trailing-pad form.**
  8 of 33 wire titles padded (~24.2 % pad rate, all trailing-
  only — `'Data Scientist '`, `'Digital Customer Success
  Associate '`, `'Partnerships Account Manager '`, `'Principal
  Product Manager - Transaction Monitoring '`, `'Senior
  Director, Revenue Operations '` (twice across two listings),
  `'Senior Product Manager - Transaction Services '`,
  `'Technical Account Manager '`). **Sixtieth cohort plugin
  to apply D-10**.
- **D-11 (run #351):** **Omitted.** 0 of 33 wire department
  names padded across 5 unique department names (`'Commercial'`,
  `'Technology'`, `'Finance'`, `'Marketing'`, `'Product'` —
  clean single-token forms). **Seventy-eighth cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #351):** **One structural deviation** from Epic
  Games (Spec 069) — D-09 sub-axis (Epic Games multi-token
  bare-brand `'Epic Games'` with internal whitespace →
  ComplyAdvantage TWO-cap PascalCase concatenated `'ComplyAdvantage'`).

## 11. References

- `packages/plugins/source-company-epicgames/src/epicgames.service.ts` —
  closest cohort cousin (variant 13 + D-08 + D-10 applied).
- `packages/plugins/source-company-launchdarkly/src/launchdarkly.service.ts` —
  D-09 TWO-cap PascalCase caps-at-0/6 sister (Spec 102).
- `packages/plugins/source-company-celonis/src/celonis.service.ts` —
  immediate predecessor (run #350).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
