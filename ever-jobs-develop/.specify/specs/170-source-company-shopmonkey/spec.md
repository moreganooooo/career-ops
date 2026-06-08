# Spec: 170 — Source Company Plugin: Shopmonkey

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 170                                                                                                                                                                                            |
| Slug           | source-company-shopmonkey                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #380)                                                                                                                                                                              |
| Created        | 2026-05-08                                                                                                                                                                                     |
| Last updated   | 2026-05-08                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..169                                                                                                                                                                        |

## 1. Problem Statement

Run #379's Spec 169 closed end-to-end (Sezzle shipped — one
D-11 sub-axis deviation off Instabase: NEW MIXED form with
three first-cohort sub-observations of D-11 both-end pad,
D-11 leading-only pad, and multi-character 2-char leading
whitespace pad on a wire department name). Run #380 picks
up the **eighteenth** live hit alphabetically from the
tenth-fresh-sweep candidate pool: **Shopmonkey** (9 visible
roles confirmed at run-380 start — closely matches the
tenth-sweep estimate of ~12 keys, 3-key under-count).

Shopmonkey, Inc. (Shopmonkey.io) — operator of the
**vertical-SaaS shop-management + point-of-sale platform
pioneered around the all-in-one auto-repair-shop /
independent-mechanic / collision-shop operations data
model** (founded by Ashot Iskandarian in 2016 in Morgan
Hill, California; raised ~$285M across rounds at peak
~$1.5B valuation in June 2022 led by Bessemer Venture
Partners, Index Ventures, and Headline; ships Shopmonkey
Cloud (cloud-native shop-management — repair orders,
inventory, parts ordering, customer communications),
Shopmonkey Pay (integrated card-present / card-not-present
payments), Shopmonkey Marketing (lead-capture +
appointment scheduling), and Shopmonkey Reporting
(operational analytics) across the auto-repair-shop /
collision-shop / vertical-SaaS POS segment — alongside
competitors Tekmetric, Mitchell 1, ALLDATA, NAPA TRACS,
RepairShopr, and AutoLeap — with a hybrid distributed
workforce concentrated across Morgan Hill (HQ), Las Vegas,
and Remote across the United States) — publishes its
consolidated careers board through Greenhouse at the bare
slug `shopmonkey` (case-symmetric with the wire
`company_name === 'Shopmonkey'`; see § 10 D-05).

## 2. Goals

- Ship a `source-company-shopmonkey` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-justworks` (Spec 129) plugin — Justworks is
  the closest cohort cousin sharing four primary axes: D-04
  variant 10 (legacy hosted-board apex
  `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`) + D-08
  + D-09 case-symmetric + D-11 omitted. **One D-10 sub-axis
  deviation** off Justworks: Justworks D-10 was applied with
  a first-cohort double-trailing-space pad form (5 of 82
  padded), whereas Shopmonkey D-10 is **omitted** (0 of 9
  wire titles padded — fully clean title pass-through).
- **One structural deviation** from the Justworks template
  (D-10 sub-axis: applied → omitted). The wire-implementation
  drops the `.trim()` operation on `listing.title` because
  there are zero observed pads in the run-380 probe.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Shopmonkey postings.
- Shopmonkey-merchant API / payments-API integration.
- Shopmonkey Pay / Shopmonkey Marketing / Shopmonkey
  Reporting cross-system schemas.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SHOPMONKEY`** in
> the source registry, so that **a single `siteType:
> [Site.SHOPMONKEY]` request returns Shopmonkey's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.SHOPMONKEY = 'shopmonkey'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-shopmonkey`.                                                               | must     |
| FR-3  | `ShopmonkeyService.scrape(input)` returns a `JobResponseDto`; never throws.                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `shopmonkey-`, `site === Site.SHOPMONKEY`, `companyName === 'Shopmonkey'`.           | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10 legacy hosted-board apex `boards.greenhouse.io/shopmonkey/jobs/<id>?gh_jid=<id>`). | must     |
| FR-13 | D-10 **omitted** — title `byte-for-byte` pass-through (0 of 9 padded). No `.trim()` applied to `listing.title`.          | must     |
| FR-14 | D-11 **omitted** — dept `byte-for-byte` pass-through (0 of 6 unique dept names padded).                                  | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SHOPMONKEY, name: 'Shopmonkey', category: 'company' })
@Injectable()
export class ShopmonkeyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-10 URL pass-
  through (legacy hosted-board apex
  `boards.greenhouse.io/shopmonkey/jobs/<id>?gh_jid=<id>`);
  D-09 case-symmetric `'Shopmonkey'` lock; **D-10 omitted —
  byte-for-byte title pass-through lock** (no `.trim()` on
  `listing.title`); D-11 clean dept pass-through lock.
- Plus standard cohort cases (resultsWanted cap, searchTerm
  filter on title + dept, 500 error → empty, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #380):** Wire-shape variant 10 (legacy hosted-
  board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`).
  **Eighth** plugin in the cohort to use variant 10 (after
  Chime, Faire, Flexport, Braze, Descript, Justworks, Founders).
- **D-05 (run #380):** Bare slug `shopmonkey` — case-symmetric
  with the wire `company_name === 'Shopmonkey'`.
- **D-08 (run #380):** Decode-then-strip pipeline. **One-
  hundred-and-twenty-sixth** cohort plugin to apply D-08.
- **D-09 (run #380):** **Omitted** — case-symmetric bare-brand
  wire `'Shopmonkey'` (10 bytes; case-symmetric vs slug
  `shopmonkey` after casefold). 0 of 9 padded. **One-hundred-
  and-seventeenth cohort plugin to omit D-09**.
- **D-10 (run #380):** **OMITTED** — 0 of 9 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Thirty-seventh cohort plugin to
  omit D-10**. Distinct from Justworks (D-10 applied with first-
  cohort double-trailing-space pad form) by sub-axis only —
  the wire surface here observes a fully-clean title set.
- **D-11 (run #380):** **Omitted** — 0 of 6 unique wire
  department names padded across `'Business Development'`,
  `'Engineering'`, `'General- DNU'`, `'Implementation'`,
  `'Product Management'`, `'Sales Development'` (clean
  multi-token forms with internal whitespace, internal
  hyphenation, and a `'General- DNU'` archive marker). The
  plugin emits `listing.departments[0].name` byte-for-byte
  without a `.trim()`. **One-hundred-and-first cohort plugin**
  with fully-clean department pass-through.
- **D-13 (run #380):** **One structural deviation** from
  the Justworks (Spec 129) template — D-10 sub-axis: applied
  with first-cohort double-trailing-space pad form → omitted
  (0 of 9 padded; fully-clean title set on the wire). **Forty-
  ninth near-clean re-spin** in run-history.

## 11. References

- `packages/plugins/source-company-justworks/src/justworks.service.ts` —
  closest cohort cousin (variant 10 D-09-omitted D-11-omitted template).
- `packages/plugins/source-company-founders/src/founders.service.ts` —
  prior variant-10 D-10-omitted template (Spec 148).
- `packages/plugins/source-company-sezzle/src/sezzle.service.ts` —
  immediate predecessor (run #379 — D-11 NEW mixed form first cohort observations).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
