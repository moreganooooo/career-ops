# Spec: 182 — Source Company Plugin: Acquia

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 182                                                                                                                                                                                            |
| Slug           | source-company-acquia                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #392)                                                                                                                                                                              |
| Created        | 2026-05-20                                                                                                                                                                                     |
| Last updated   | 2026-05-20                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..181                                                                                                                                                                        |

## 1. Problem Statement

Run #391's Spec 181 closed end-to-end (ACP shipped — seventh
plugin in the eleventh fresh probe sweep; second cohort
observation of acronym-by-initials slug derivation with
connector-skip). Run #392 is the **eighth** plugin in the
eleventh fresh probe sweep with **Acquia** (Drupal-based
digital-experience platform vendor — 17 visible roles
confirmed at run-392 start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acquia/jobs?content=true`).

Acquia, Inc. — operator of the **dominant Drupal-based open-
source-cloud digital-experience-platform (DXP) vendor**
providing managed Drupal hosting, content-management,
personalization, customer-data-platform (CDP), digital-asset-
management (DAM), site-builder, and developer-tooling
services for global enterprise customers (founded in 2007 by
Dries Buytaert (creator of Drupal) and Jay Batson in Boston,
Massachusetts; privately-held Drupal-cloud DXP vendor backed
by Vista Equity Partners since 2019; serves enterprise
customers across financial-services, government, retail,
higher-education, healthcare, and media verticals; ships
Acquia Cloud Platform, Acquia CDP, Acquia DAM, Acquia
Personalization, Acquia Campaign Studio, and Acquia Site
Studio across the enterprise DXP / Drupal-as-a-service
segment) — publishes its consolidated careers board through
Greenhouse at the bare slug `acquia` (wire
`company_name === 'Acquia'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'Acquia'` is a case-symmetric bare-brand
6-byte single-token PascalCase wire form (cap at byte 0
only). Slug `acquia` is byte-for-byte lowercase of wire. No
structural deviation from the cohort norm.

**Wire-form D-10 observation:** **0 of 17 listings carry
trailing ASCII-space padding** in the wire `title` field —
all titles flow through byte-for-byte clean. The plugin omits
D-10 — emits wire `title` byte-for-byte without `.trim()`
overlay.

**Wire-form D-11 observation:** **0 of 5 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Customer Success'`, `'Engineering'`, `'Marketing'`,
`'Products'`, `'Sales'`). The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay.

## 2. Goals

- Ship a `source-company-acquia` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-coursera` plugin (closest cohort cousin
  with the **variant-2 + D-08 + D-09 omitted + D-10 omitted
  + D-11 omitted** profile) with **zero structural
  deviations** — a clean re-spin.
- Bundle a unit-test suite (≥ 9 cases — standard cohort
  baseline; D-09 byte-for-byte bare-brand lock; D-10 clean-
  pass-through title lock; D-11 clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Acquia postings.
- Other Drupal-ecosystem vendor boards (Pantheon, Platform.sh,
  WP Engine, etc. — separate adoption candidates if needed).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACQUIA`** in
> the source registry, so that **a single `siteType:
> [Site.ACQUIA]` request returns Acquia's open enterprise-
> DXP roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACQUIA = 'acquia'` to the `Site` enum.                                                                                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acquia`.                                                                             | must     |
| FR-3  | `AcquiaService.scrape(input)` returns a `JobResponseDto`; never throws.                                                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acquia-`, `site === Site.ACQUIA`.                                                             | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **omitted (clean pass-through)** — 0 of 17 wire titles padded in run-392 probe; emit byte-for-byte without `.trim()`.         | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 5 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACQUIA, name: 'Acquia', category: 'company' })
@Injectable()
export class AcquiaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acquia/jobs/<id>`); **D-09 bare-
  brand byte-for-byte wire pin** (`'Acquia'` 6 bytes,
  case-symmetric PascalCase single-token; slug `acquia` is
  byte-for-byte lowercase of wire); **D-10 clean-pass-
  through title lock**; **D-11 clean-pass-through dept lock**.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #392):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eighty-first** plugin in the cohort to use variant 2.
- **D-08 (run #392):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-eighth** cohort plugin to apply D-08.
- **D-09 (run #392):** **Omitted at runtime** — wire
  `company_name === 'Acquia'` flows through byte-for-byte.
  Case-symmetric bare-brand 6-byte PascalCase single-token
  form (cap at byte 0 only). **129th cohort plugin to omit
  D-09.**
- **D-10 (run #392):** **Omitted (clean pass-through).** 0
  of 17 wire titles in the run-392 probe carry trailing
  ASCII-space padding. **43rd cohort plugin to omit D-10**.
- **D-11 (run #392):** **Omitted (clean pass-through).** 0
  of 5 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte.
  **109th cohort plugin with fully-clean department pass-
  through (D-11 omitted).**
- **D-13 (run #392):** **Zero structural deviations** from
  the Coursera template — clean re-spin of the canonical
  variant-2 + D-08 + D-09/D-10/D-11 all-omitted profile.

## 11. References

- `packages/plugins/source-company-coursera/src/coursera.service.ts` —
  closest cohort cousin (zero-deviation re-spin template).
- `packages/plugins/source-company-acp/src/acp.service.ts` —
  prior run sibling.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
