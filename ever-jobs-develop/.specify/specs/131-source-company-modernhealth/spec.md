# Spec: 131 — Source Company Plugin: Modern Health

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 131                                                                                                                                                                                            |
| Slug           | source-company-modernhealth                                                                                                                                                                    |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #341)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..130                                                                                                                                                                        |

## 1. Problem Statement

Run #340's Spec 130 closed end-to-end (Melio shipped — 50-
plugin D-10-application threshold). Run #341 picks up the
**twelfth** live hit alphabetically from the eighth-fresh-
sweep candidate pool: **Modern Health** (14 visible roles
confirmed at run-341 start; **sixth 1× match in eighth-sweep**
after Branch, Descope, Doximity, Dremio, Melio).

Modern Health, Inc. — operator of the **dominant employer-
sponsored mental-health benefits platform pioneered around
the precision-mental-healthcare-as-a-service data model**
(founded by Alyson Watson and Erica Johnson in 2017 in San
Francisco; raised ~$172M across rounds at peak ~$1.17B
valuation in February 2021 led by Founders Fund and 01
Advisors; ships Modern Health Care Platform (1:1 therapy +
coaching + group sessions + self-serve content), Modern
Health Care Coordination, Modern Health for SMB, Modern
Health Mid-Market, Modern Health Enterprise, and Modern
Health Provider Network across the employer-sponsored mental-
health / employee-assistance-program (EAP) / digital-mental-
healthcare segment — alongside competitors Lyra Health,
Spring Health, Headspace Health (Ginger + Headspace), Calm
Business, and Talkspace — with a hybrid distributed workforce
concentrated across San Francisco (HQ), London, Singapore,
and Remote across the United States, the United Kingdom, the
European Union, and the Asia-Pacific region) — is published
at the bare `modernhealth` Greenhouse slug (case-AND-length-
asymmetric vs the wire `company_name === 'Modern Health'` —
two-token brand name with internal ASCII space at byte index 6;
13-byte wire vs 12-byte concatenated slug).

## 2. Goals

- Ship a `source-company-modernhealth` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-constantcontact` plugin — Constant Contact
  is the closest cohort cousin sharing all five primary axes:
  D-04 variant 2 + D-08 + D-09 internal-whitespace asymmetric
  + D-10 applied + D-11 omitted.
- **Zero structural deviations** from Constant Contact.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Modern Health postings.
- Modern Health product-API / Care Platform / Care
  Coordination integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.MODERNHEALTH`**
> in the source registry, so that **a single `siteType:
> [Site.MODERNHEALTH]` request returns Modern Health's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.MODERNHEALTH = 'modernhealth'` to the `Site` enum.                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-modernhealth`.                                      | must     |
| FR-3  | `ModernHealthService.scrape(input)` returns a `JobResponseDto`; never throws.                     | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `modernhealth-`, `site === Site.MODERNHEALTH`, `companyName === 'Modern Health'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (1 of 14 padded ~7.1 %).      | must     |
| FR-14 | D-11 **omitted** — 0 of 14 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.MODERNHEALTH, name: 'Modern Health', category: 'company' })
@Injectable()
export class ModernHealthService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 internal-whitespace asymmetric `'Modern Health'`
  lock (13 bytes / 12-byte slug); D-10 trailing-pad title trim
  lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #341):** Wire-shape variant 2. **Forty-eighth**
  plugin in the cohort to use variant 2.
- **D-08 (run #341):** Decode-then-strip pipeline. **Eighty-
  seventh** cohort plugin to apply D-08.
- **D-09 (run #341):** **Omitted with internal-whitespace
  asymmetric wire form** — wire `'Modern Health'` byte-for-
  byte (13 bytes — two-token brand with internal ASCII space
  at byte index 6; case-AND-length-asymmetric vs the lowercase
  12-byte concatenated slug `modernhealth`). **Seventy-eighth
  cohort plugin to omit D-09**. **Eighth internal-whitespace
  asymmetry case** in the cohort after Scale AI / Maven Clinic
  / Stitch Fix / New Relic / Dollar Shave Club / Misfits
  Market / Constant Contact.
- **D-10 (run #341):** **APPLIED with trailing-pad form.** 1
  of 14 wire titles padded (~7.1 % pad rate, all trailing-
  only — `'Client Manager (Singapore) '`). **Fifty-first
  cohort plugin to apply D-10**.
- **D-11 (run #341):** **Omitted** — 0 of 14 wire department
  names padded across 8 unique department names (`'Customer
  Success'`, `'Engineering'`, `'Legal'`, `'Marketing'`,
  `'Operations'`, `'Partnerships'`, `'People'`, `'Sales'` —
  clean multi-token forms). **Sixty-ninth cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #341):** **Zero structural deviations** from the
  Constant Contact (Spec 111) template — making this the
  **thirty-first** Greenhouse-only company-direct plugin in
  run-history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-constantcontact/src/constantcontact.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin —
  shared internal-whitespace asymmetric D-09 sub-axis).
- `packages/plugins/source-company-melio/src/melio.service.ts` —
  immediate predecessor (run #340).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
