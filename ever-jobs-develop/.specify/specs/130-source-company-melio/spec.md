# Spec: 130 — Source Company Plugin: Melio

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 130                                                                                                                                                                                            |
| Slug           | source-company-melio                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #340)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..129                                                                                                                                                                        |

## 1. Problem Statement

Run #339's Spec 129 closed end-to-end (Justworks shipped — 30th
clean re-spin off Descript; first-cohort double-trailing-space
D-10 sub-axis). Run #340 picks up the **eleventh** live hit
alphabetically from the eighth-fresh-sweep candidate pool:
**Melio** (20 visible roles confirmed at run-340 start —
matches eighth-sweep estimate exactly, **fifth 1× match in
eighth-sweep** after Branch, Descope, Doximity, Dremio).

Melio Payments, Inc. (Melio.com) — operator of the **dominant
SMB B2B-payments platform pioneered around the
accounts-payable-bill-pay-as-a-service data model** (founded
by Matan Bar, Ilan Atias, and Ziv Paz in 2018 in New York
City; raised ~$507M across rounds at peak ~$4B valuation in
September 2021 led by Coatue Management and Tiger Global
Management; ships Melio AP (vendor bill payments), Melio AR
(invoice collection), Melio Pay-by-Card, Melio for QuickBooks /
Xero / Sage / Zoho integrations, and Melio Marketing Partners
(white-labeled embedded-payments) across the SMB-B2B-payments
/ accounts-payable-automation segment — alongside competitors
Bill (BILL Holdings, NYSE: BILL), Tipalti, Plastiq, Coupa,
Stampli, AvidXchange, Routable, and Stripe Bill Pay — with a
hybrid distributed workforce concentrated across New York
City (HQ), Tel Aviv, Denver, and Remote across the United
States and Israel) — is published at the bare `melio`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Melio'` after casefold).

## 2. Goals

- Ship a `source-company-melio` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-descope` plugin — Descope is the closest
  cohort cousin via shared D-04 variant 2 + D-08 + D-09 case-
  symmetric + D-11 applied axes.
- **One structural deviation** from Descope:
  1. **D-10 APPLIED** (Descope D-10 omitted at 0/8 padded;
     Melio 2 of 20 wire titles padded ~10 %; the plugin
     applies `.trim()` to the wire `title`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Melio postings.
- Melio product-API / Pay / AR / Pay-by-Card integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MELIO`** in the
> source registry, so that **a single `siteType: [Site.MELIO]`
> request returns Melio's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MELIO = 'melio'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-melio`.                                             | must     |
| FR-3  | `MelioService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `melio-`, `site === Site.MELIO`, `companyName === 'Melio'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 20 padded ~10 %).       | must     |
| FR-14 | D-11 **applied** — `.trim()` strips trailing-pad on `'Design '`.                                  | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MELIO, name: 'Melio', category: 'company' })
@Injectable()
export class MelioService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Melio'` lock; D-10 trailing-
  pad title trim lock; **D-11 APPLIED** lock with `'Design '`
  padded → `'Design'` trimmed.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #340):** Wire-shape variant 2. **Forty-seventh**
  plugin in the cohort to use variant 2.
- **D-08 (run #340):** Decode-then-strip pipeline. **Eighty-
  sixth** cohort plugin to apply D-08.
- **D-09 (run #340):** **Omitted** — case-symmetric bare-brand
  wire `'Melio'` (5 bytes). **Seventy-seventh cohort plugin
  to omit D-09**.
- **D-10 (run #340):** **APPLIED with trailing-pad form.** 2
  of 20 wire titles padded (~10 % pad rate, all trailing-
  only — `'Director of FP&A '`, `'Staff Full Stack Engineer '`).
  **Fiftieth cohort plugin to apply D-10 — the cohort crosses
  the 50-plugin D-10-application threshold at this run.**
- **D-11 (run #340):** **APPLIED with trailing-pad form.** 1
  of 8 unique wire department names padded (`'Design '`).
  Listing-level pad rate determined by how many listings
  carry the padded `'Design '` department. The plugin applies
  `.trim()` to the wire `departments[0].name` byte-for-byte
  before downstream emit. **Twelfth cohort plugin to apply
  D-11**.
- **D-13 (run #340):** **One structural deviation** from the
  Descope (Spec 125) template: D-10 applied (Descope D-10
  omitted at 0/8 padded; Melio D-10 applied at 2/20 padded
  ~10 %).

## 11. References

- `packages/plugins/source-company-descope/src/descope.service.ts` —
  closest cohort cousin (variant 2 + D-09 case-symmetric +
  D-11 applied reference).
- `packages/plugins/source-company-justworks/src/justworks.service.ts` —
  immediate predecessor (run #339).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
