# Spec: 140 — Source Company Plugin: Celonis

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 140                                                                                                                                                                                            |
| Slug           | source-company-celonis                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #350)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..139                                                                                                                                                                        |

## 1. Problem Statement

Run #349's Spec 139 closed end-to-end (Bloomreach shipped — first
cohort observation of mojibake-NBSP D-10 trailing-pad sub-axis).
Run #350 picks up the **sixth** live hit alphabetically from
the ninth-fresh-sweep candidate pool: **Celonis** (188
visible roles confirmed at run-350 start — ninth-sweep estimate
~154, ~1.22× ratio — over-count).

Celonis SE — operator of the **dominant Process Intelligence /
Process Mining cloud platform** (founded by Bastian Nominacher,
Alexander Rinke, and Martin Klenk in 2011 in Munich, Germany;
private since the 2022 Series D round at ~$13B valuation; ships
the Celonis Process Intelligence Platform with Process Mining,
Object-Centric Process Mining (OCPM), Process Sphere, the
Celonis Studio low-code action engine, and Celonis Apps for
ERP / SCM / O2C / P2P / RTR — alongside competitors UiPath,
Microsoft Power Automate Process Mining, Software AG ARIS,
QPR, Signavio (now SAP), and Apromore — with a hybrid
distributed workforce concentrated across Munich (HQ),
New York City (US HQ), Amsterdam, London, Madrid, Paris,
Tokyo, Singapore, and Remote across the Americas / EMEA /
APAC) — is published at the bare `celonis` Greenhouse slug
(case-symmetric with the wire `company_name === 'Celonis'`
after casefold).

## 2. Goals

- Ship a `source-company-celonis` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  omitted.
- **Zero structural deviations** from Doximity, with **D-10
  observation: third-cohort leading-pad title sub-axis +
  first-cohort mixed-leading-and-trailing-pad ratio
  observation** — 26 of 188 wire titles padded (~13.8 %),
  comprising 23 trailing-pad and **3 leading-pad** forms in
  the same plugin. Distinct from Chainguard (Spec 122 —
  leading-pad only, first observation) and Oscar (Spec 133 —
  1 leading + 1 trailing, ~0.81 % rate). `.trim()` covers
  both directions.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Celonis postings.
- Celonis Process Intelligence platform-API / OCPM integration.
- Downstream normalisation of leading/trailing whitespace beyond
  `.trim()` — scrape-layer contract is wire-faithful pass-through
  modulo `.trim()`.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.CELONIS`** in
> the source registry, so that **a single `siteType:
> [Site.CELONIS]` request returns Celonis's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                | Priority |
| ----- | ---------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.CELONIS = 'celonis'` to the `Site` enum.                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-celonis`.                                                    | must     |
| FR-3  | `CelonisService.scrape(input)` returns a `JobResponseDto`; never throws.                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                          | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.               | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `celonis-`, `site === Site.CELONIS`, `companyName === 'Celonis'`.      | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                            | must     |
| FR-8  | `input.searchTerm` honoured.                                                                               | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                            | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                           | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                           | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                                 | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers leading-pad AND trailing-pad sub-axes (26 of 188 padded ~13.8 %; 23 trailing + 3 leading). | must |
| FR-14 | D-11 **omitted** — 0 of 188 wire department names padded across 12 unique departments.                     | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.CELONIS, name: 'Celonis', category: 'company' })
@Injectable()
export class CelonisService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Celonis'` lock; **D-10
  third-cohort leading-pad observation + trailing-pad lock**
  (`' Field CTO'` → `'Field CTO'` and `'Business Development
  Manager '` → `'Business Development Manager'`); D-11 clean
  dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #350):** Wire-shape variant 2. **Fifty-fourth**
  plugin in the cohort to use variant 2.
- **D-08 (run #350):** Decode-then-strip pipeline. **Ninety-
  sixth** cohort plugin to apply D-08.
- **D-09 (run #350):** **Omitted** — case-symmetric bare-brand
  wire `'Celonis'` (7 bytes). **Eighty-seventh cohort plugin
  to omit D-09**.
- **D-10 (run #350):** **APPLIED with mixed leading-pad +
  trailing-pad form + THIRD-COHORT leading-pad observation +
  FIRST-COHORT mixed-leading-trailing ratio observation.**
  26 of 188 wire titles padded (~13.8 % pad rate) — 23
  trailing-pad + 3 leading-pad in same plugin. **Third
  cohort observation of leading-pad sub-axis** after
  Chainguard (Spec 122 — leading-pad only) and Oscar (Spec
  133 — 1 leading + 1 trailing at ~0.81 % rate). Celonis is
  the **first cohort plugin to observe leading-pad at
  meaningful volume** (3 leading samples). `.trim()` covers
  both directions transparently. **Fifty-ninth cohort plugin
  to apply D-10**.
- **D-11 (run #350):** **Omitted.** 0 of 188 wire department
  names padded across 12 unique department names (`'Sales'`,
  `'Sales & Partner Mgmt'`, `'Value Engineering'`, `'Business
  Development'`, `'Services'`, `'Engineering'`, `'Corporate'`,
  `'IT & Systems'`, `'Product'`, `'Ecosystem'`, `'Product
  Business Apps'`, `'Legal'` — clean multi-token forms with
  internal whitespace and ampersands). **Seventy-seventh
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #350):** **Zero structural deviations** from the
  Doximity (Spec 127) template — making this the **thirty-
  sixth** Greenhouse-only company-direct plugin in run-history
  to ship as a clean re-spin. (The third-cohort leading-pad
  D-10 sub-axis observation is captured as an observability
  note — `.trim()` is direction-agnostic, so no axis change
  is required.)

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-bloomreach/src/bloomreach.service.ts` —
  immediate predecessor (run #349).
- `packages/plugins/source-company-chainguard/src/chainguard.service.ts` —
  first leading-pad D-10 observation (Spec 122).
- `packages/plugins/source-company-oscar/src/oscar.service.ts` —
  second mixed leading+trailing D-10 observation (Spec 133).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
