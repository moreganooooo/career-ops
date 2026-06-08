# Spec: 111 — Source Company Plugin: Constant Contact

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 111                                                                                                                                                                                            |
| Slug           | source-company-constantcontact                                                                                                                                                                 |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #321)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..110                                                                                                                                                                        |

## 1. Problem Statement

Run #320's Spec 110 closed end-to-end (Braze shipped — fourth
variant-10 plugin; lowest D-10 pad rate observed in cohort).
Run #321 picks up the **sixth** live hit alphabetically from
the seventh-fresh-sweep candidate pool: **Constant Contact**
(28 visible roles confirmed at run-321 start).

Constant Contact, Inc. — operator of the **dominant SMB-
focused email-marketing platform pioneered around the campaign-
based / list-based / template-driven email-marketing data
model** (founded by Randy Parker in 1995 in Brookline, MA, as
"Roving Software"; rebranded to Constant Contact in 2004;
acquired by Endurance International Group in 2016 for $1.1B,
then spun out under private-equity ownership by Clearlake
Capital and Siris Capital in 2021; ships email marketing,
SMS marketing, social-media management, paid-ads, lead-
generation, and AI-content-generation tools across the SMB
marketing-automation segment — alongside competitors
Mailchimp, ActiveCampaign, GetResponse, and Brevo (formerly
Sendinblue) — with a hybrid distributed workforce concentrated
across Waltham, MA (HQ), Loveland, CO (Vertical Response
office), Waterloo (Canada), Gurgaon (India), and Remote across
the United States, Canada, India, and the European Union) —
is published at the bare `constantcontact` Greenhouse slug
(case-AND length-asymmetric with the wire `company_name ===
'Constant Contact'` — slug 15 bytes lowercase / wire 16 bytes
two-token with internal ASCII space at index 8) and was
confirmed live via run #321's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-constantcontact` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-misfitsmarket` plugin — Misfits Market is
  the closest cohort cousin via shared D-04 variant 2, D-08,
  D-09 omitted with two-token internal-whitespace asymmetry,
  D-10 trailing-pad applied, and D-11 fully-clean department
  pass-through.
- **Zero structural deviations** from Misfits Market —
  making this the **eighteenth** Greenhouse-only company-
  direct plugin in run-history to ship as a clean re-spin
  (after Coursera, Flexport, Glossier, Marqeta, New Relic,
  Scopely, Adyen, Bobbie, Cerebral, Misfits Market, Monzo,
  Airtable, Bandwidth, Braze, plus corrected counts).
- **Sub-axis observation:** Constant Contact's department
  names use a **numeric-prefix convention** (`'390 Strategy'`,
  `'221 Marketing Acquisition'`, `'100 Engineering'`, etc.)
  — first cohort observation of numeric-prefix-as-org-code
  department naming. Standard pass-through preserves the
  prefix bytes; downstream filters honour the wire form.
  **Seventh internal-whitespace asymmetry case** in the
  cohort (after Scale AI / Maven Clinic / Stitch Fix / New
  Relic / Dollar Shave Club / Misfits Market).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Constant Contact postings.
- Constant Contact product-API / email / SMS integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CONSTANTCONTACT`**
> in the source registry, so that **a single `siteType:
> [Site.CONSTANTCONTACT]` request returns Constant Contact's
> open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CONSTANTCONTACT = 'constantcontact'` to the `Site` enum.                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-constantcontact`.                                   | must     |
| FR-3  | `ConstantContactService.scrape(input)` returns a `JobResponseDto`; never throws.                  | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `constantcontact-`, `site === Site.CONSTANTCONTACT`, `companyName === 'Constant Contact'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (1 of 28 padded).             | must     |
| FR-14 | D-11 **omitted** — 0 of 28 wire department names padded; numeric-prefix convention preserved byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CONSTANTCONTACT, name: 'Constant Contact', category: 'company' })
@Injectable()
export class ConstantContactService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-through;
  D-09 two-token internal-whitespace wire `'Constant Contact'`
  (16 bytes) byte-for-byte lock with internal-space at index 8;
  D-10 trailing-pad trim lock; D-11 clean pass-through preserving
  numeric-prefix dept naming.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #321):** **Wire-shape variant 2.** **Thirty-fifth**
  plugin in the cohort to use variant 2.
- **D-08 (run #321):** Decode-then-strip pipeline. **Sixty-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #321):** **Omitted** — wire `company_name ===
  'Constant Contact'` byte-for-byte (16 bytes; two-token brand
  with internal ASCII space at index 8; case-AND length-
  asymmetric vs the lowercase 15-byte concatenated slug
  `constantcontact`). **Seventh internal-whitespace asymmetry
  case** in the cohort after Scale AI / Maven Clinic / Stitch
  Fix / New Relic / Dollar Shave Club / Misfits Market.
  **Fifty-eighth cohort plugin to omit D-09**.
- **D-10 (run #321):** **APPLIED with trailing-pad form.** 1
  of 28 wire titles padded (`'Principal Product Manager -
  Mobile-first and AI Strategy '`; ~3.6 % pad rate, all
  trailing-only). **Thirty-fifth cohort plugin to apply D-10**.
- **D-11 (run #321):** **Omitted with first-cohort numeric-
  prefix dept naming sub-axis.** 0 of 28 wire department names
  padded across 9 unique department names — but all 9 follow
  a **numeric-prefix-as-org-code naming convention**:
  `'390 Strategy'`, `'221 Marketing Acquisition'`, `'100
  Engineering'`, `'126 Design'`, `'135 Product'`, `'142 High
  Volume Product'`, `'252 Revenue Operations'`, `'250 Sales'`,
  `'227 Customer and Partner Marketing'`. **First cohort
  observation of numeric-prefix dept naming.** Standard pass-
  through preserves the prefix bytes byte-for-byte. **Fifty-
  second cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #321):** **Zero structural deviations** from the
  Misfits Market (Spec 098) template — making this the
  **eighteenth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-misfitsmarket/src/misfitsmarket.service.ts` —
  zero-deviation template (variant 2 + two-token internal-
  whitespace D-09 asymmetry + D-10 trailing-pad applied + D-11
  clean).
- `packages/plugins/source-company-braze/src/braze.service.ts` —
  immediate predecessor (run #320).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
