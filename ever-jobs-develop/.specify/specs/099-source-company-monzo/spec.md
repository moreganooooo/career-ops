# Spec: 099 — Source Company Plugin: Monzo

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 099                                                                                                                                                                                            |
| Slug           | source-company-monzo                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #309)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..098                                                                                                                                                                        |

## 1. Problem Statement

Run #308's Spec 098 closed end-to-end (Misfits Market shipped —
eleventh zero-deviation clean re-spin off New Relic). Run #309
picks up the **tenth** live hit alphabetically from the sixth-
fresh-sweep candidate pool: **Monzo** (65 visible roles
confirmed at run-309 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/monzo/jobs?content=true`;
the run-300 sixth-sweep estimate of ~65 keys matched the actual
job count exactly — minimal probe-counter inflation, similar
to Adyen / BILL / Bobbie / Cerebral).

Monzo Bank Ltd. — operator of the **dominant UK-domestic
challenger-bank platform pioneered around the mobile-first /
real-time-spending-notification / current-account-and-credit
data model** (founded by Tom Blomfield, Jonas Huckestein, Jason
Bates, Paul Rippon, and Gary Dolman in February 2015 in London;
raised ~$1.4B+ across rounds at peak ~$5.9B valuation in March
2024 led by Alphabet's CapitalG, GIC, and HongShan Capital
Group; obtained UK retail-banking licence from the FCA / PRA in
April 2017; expanded to the US under a partnership-bank model
in 2019; ships current accounts, business banking, lending
products under the Flex brand, and a stock-investing product
across the UK / EU / US retail-banking segment — alongside
competitors Revolut, Starling Bank, N26, Wise, and Chime — with
a hybrid distributed workforce concentrated across London (HQ),
Cardiff, Dublin, Barcelona, and Remote across the United
Kingdom, Ireland, Spain, and the Asia-Pacific region) — is
published at the bare `monzo` Greenhouse slug (the lowercase
brand name; case-symmetric with the wire `company_name ===
'Monzo'`) and was confirmed live via run #309's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-monzo` plugin returning live
  `JobPostDto` rows for the public Monzo careers board.
- Match the structural and behavioural shape of the existing
  `source-company-adyen` plugin — Adyen is the closest cohort
  cousin via shared D-04 variant 2, D-09 case-symmetric bare-
  brand wire (both 5 bytes), D-10 trailing-pad application,
  and D-11 clean pass-through. Monzo carries **zero structural
  deviations** from Adyen — making this the **twelfth**
  Greenhouse-only company-direct plugin in run-history to
  ship as a clean re-spin (after Coursera off Chime, Flexport
  off Faire, Glossier off Flexport, Marqeta off Calendly, New
  Relic off Maven Clinic, Scopely off Marqeta, Adyen off
  Marqeta, Bobbie off Coursera, Cerebral off Adyen, Misfits
  Market off New Relic, plus a corrected count).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the case-symmetric bare-brand
  wire `'Monzo'`, and the D-10 trailing-pad sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Monzo postings.
- Monzo product-API / banking / credit / payments integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MONZO`** in
> the source registry, so that **a single `siteType:
> [Site.MONZO]` request returns Monzo's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MONZO = 'monzo'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-monzo`.                                             | must     |
| FR-3  | `MonzoService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `monzo-`, `site === Site.MONZO`, `companyName === 'Monzo'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (6 of 65 padded).             | must     |
| FR-14 | D-11 **omitted** — 0 of 65 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MONZO, name: 'Monzo', category: 'company' })
@Injectable()
export class MonzoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/monzo/jobs/`; does NOT contain
    `monzo.com` (anti-substring lock).
  - **D-09 omission lock with case-symmetric bare-brand wire**:
    emitted `companyName === 'Monzo'` byte-for-byte (5 bytes);
    `'Monzo'.toLowerCase() === 'monzo'` (matches the slug).
  - **D-10 application lock with trailing-pad sub-axis**:
    input title `'Backend Engineer III '` → emitted `'Backend
    Engineer III'` (byte-distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Engineering'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #309):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/monzo/jobs/<id>`.
  **Twenty-seventh** plugin in the cohort to use variant 2.
- **D-08 (run #309):** Decode-then-strip pipeline. **Fifty-
  fifth** cohort plugin to apply D-08.
- **D-09 (run #309):** **Omitted** — wire `company_name ===
  'Monzo'` byte-for-byte (5 bytes — fully clean; case-
  symmetric with the lowercase 5-byte slug `monzo`). Same byte-
  count and case-symmetry shape as Adyen `'Adyen'` (5 bytes).
  **Forty-eighth cohort plugin to omit D-09**.
- **D-10 (run #309):** **APPLIED with trailing-pad form.** 6
  of 65 wire titles in the run-309 probe carry single-trailing-
  ASCII-space padding (~9.2 % pad rate, all trailing-only —
  e.g. `'Backend Engineer III '`, `'Head of Workforce
  Management, Data '`, `'Platform Engineer '`, `'Product
  Director, Flex (Borrowing) '`, `'Senior Product Manager,
  EU '`). **Twenty-fifth cohort plugin to apply D-10**.
- **D-11 (run #309):** **Omitted** — 0 of 65 wire department
  names padded (`'Engineering'`, `'Borrowing'`, `'Information
  Security'`, `'Company Operations'`, `'Finance'`, `'Risk &
  Compliance'`, `'Data'`, `'Design'`, `'Operations'`,
  `'Customer Operations'`, `'Special Projects'`, `'Product'`,
  `'Marketing'`, `'People'`, `'Strategy'` — clean single-token
  / multi-token forms with internal whitespace and ampersands).
  **Forty-first cohort plugin** with fully-clean department
  pass-through.
- **D-13 (run #309):** **Zero structural deviations** from the
  Adyen (Spec 090) template — making this the **twelfth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin of a prior cohort plugin with no per-axis
  deviations.

## 11. References

- `packages/plugins/source-company-adyen/src/adyen.service.ts` —
  zero-deviation template.
- `packages/plugins/source-company-misfitsmarket/src/misfitsmarket.service.ts` —
  immediate predecessor in run-history (run #308).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
