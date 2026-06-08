# Spec: 127 — Source Company Plugin: Doximity

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 127                                                                                                                                                                                            |
| Slug           | source-company-doximity                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #337)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..126                                                                                                                                                                        |

## 1. Problem Statement

Run #336's Spec 126 closed end-to-end (Dialpad shipped — 28th
clean re-spin off Branch; first-cohort numeric-prefix-with-
hyphen-separator dept naming). Run #337 picks up the **eighth**
live hit alphabetically from the eighth-fresh-sweep candidate
pool: **Doximity** (15 visible roles confirmed at run-337
start — matches eighth-sweep estimate exactly, 1× inflation;
**third 1× match in eighth-sweep** after Branch and Descope).

Doximity, Inc. — operator of the **dominant US-physician
professional-network + telehealth-tooling platform pioneered
around the verified-clinician-credentialing-as-a-service data
model** (founded by Jeff Tangney, Shari Buck, and Nate Gross
in 2010 in San Francisco; public on the NYSE since June 2021
IPO under ticker `DOCS` at ~$10B initial valuation; market-
cap settled in the $5-12B band as of 2026; ships Doximity
Profile (~80 % of US physicians have a profile), Doximity
Dialer (HIPAA-compliant secure-call masking), Doximity Mailbox
(secure HIPAA messaging), Doximity News (medical-news feed),
Doximity Op-Ed (continuing-medical-education content), and
Doximity Career Center across the physician-network /
telehealth-tooling / pharma-marketing-ops segment — alongside
competitors Sermo, Figure 1, Health Care Provider Solutions,
and Epocrates — with a hybrid distributed workforce
concentrated across San Francisco (HQ) and Remote across the
United States) — is published at the bare `doximity`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Doximity'` after casefold).

## 2. Goals

- Ship a `source-company-doximity` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-contentful` plugin — Contentful is the
  closest cohort cousin sharing all five primary axes: D-04
  variant 2 + D-08 + D-09 case-symmetric + D-10 applied +
  D-11 omitted.
- **Zero structural deviations** from Contentful.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Doximity postings.
- Doximity product-API / Profile / Dialer / Mailbox /
  Career Center integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DOXIMITY`** in
> the source registry, so that **a single `siteType:
> [Site.DOXIMITY]` request returns Doximity's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DOXIMITY = 'doximity'` to the `Site` enum.                                              | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-doximity`.                                          | must     |
| FR-3  | `DoximityService.scrape(input)` returns a `JobResponseDto`; never throws.                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `doximity-`, `site === Site.DOXIMITY`, `companyName === 'Doximity'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (2 of 15 padded ~13.3 %).     | must     |
| FR-14 | D-11 **omitted** — 0 of 15 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DOXIMITY, name: 'Doximity', category: 'company' })
@Injectable()
export class DoximityService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Doximity'` lock; D-10
  trailing-pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #337):** Wire-shape variant 2. **Forty-sixth**
  plugin in the cohort to use variant 2.
- **D-08 (run #337):** Decode-then-strip pipeline. **Eighty-
  third** cohort plugin to apply D-08.
- **D-09 (run #337):** **Omitted** — case-symmetric bare-brand
  wire `'Doximity'` (8 bytes). **Seventy-fourth cohort plugin
  to omit D-09**.
- **D-10 (run #337):** **APPLIED with trailing-pad form.** 2
  of 15 wire titles padded (~13.3 % pad rate, all trailing-
  only — `'Data Analyst '`, `'Product Marketing Manager '`).
  **Forty-seventh cohort plugin to apply D-10**.
- **D-11 (run #337):** **Omitted** — 0 of 15 wire department
  names padded across 7 unique department names (`'Data'`,
  `'Engineering'`, `'Finance & Accounting'`, `'Marketing'`,
  `'Mobile Engineering'`, `'Sales & Client Success'`, `'Summer
  Internships'` — clean multi-token forms). **Sixty-sixth
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #337):** **Zero structural deviations** from the
  Contentful (Spec 124) template — making this the **twenty-
  ninth** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-contentful/src/contentful.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-dialpad/src/dialpad.service.ts` —
  immediate predecessor (run #336).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
