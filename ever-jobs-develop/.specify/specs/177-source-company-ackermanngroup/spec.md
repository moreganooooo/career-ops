# Spec: 177 — Source Company Plugin: Ackermann Group

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 177                                                                                                                                                                                            |
| Slug           | source-company-ackermanngroup                                                                                                                                                                  |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #387)                                                                                                                                                                              |
| Created        | 2026-05-17                                                                                                                                                                                     |
| Last updated   | 2026-05-17                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..176                                                                                                                                                                        |

## 1. Problem Statement

Run #386's Spec 176 closed end-to-end (ACI Learning shipped —
second plugin in the eleventh fresh probe sweep; first cohort
observation of acronym-prefix + PascalCase-suffix + space-strip
co-occurring in the same wire `company_name`). Run #387 is
the **third** plugin in the eleventh fresh probe sweep with
a freshly-sampled candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 004 verified Greenhouse tenants, unchanged on `6dbb622`
since run #385).

The eleventh-sweep alphabetical continuation after ACI Learning
yielded the next viable live-board hit at **Ackermann Group**
(12 visible roles confirmed at run-387 start via direct curl
probe of `https://api.greenhouse.io/v1/boards/ackermanngroup/jobs?content=true`).

Ackermann Group, LLC — operator of the **dominant Midwest U.S.
private-sector mixed-use real-estate development and multi-
family / commercial property-management platform** providing
in-house leasing, on-site maintenance, asset-management, and
investor reporting across a portfolio of Class-A apartment
communities and ground-up multi-family / commercial developments
(founded by Marvin Ackermann in Cincinnati, Ohio, in 1938 as
a single-asset real-estate developer; privately held; family-
operated through three generations; serves long-term-hold
multi-family investors, commercial-asset partners, and on-
site residents at owned-and-managed Class-A apartment
communities across the Greater Cincinnati / Columbus / Dayton
metropolitan footprint; ships in-house leasing, on-site
maintenance, centralized leasing-support, asset-management,
and investor-reporting services across the Ohio multi-family /
commercial real-estate-services segment — alongside
competitors The Connor Group, Drucker + Falk, NorthPoint
Realty, Towne Properties, and Crawford Hoying — with an
office-resident workforce concentrated across Cincinnati,
OH (HQ), Columbus, OH, Dublin, OH, Westerville, OH, Canal
Winchester, OH, and Miamisburg, OH) — publishes its
consolidated careers board through Greenhouse at the bare
slug `ackermanngroup` (wire `company_name === 'Ackermann
Group'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'Ackermann Group'` is a **two-token
PascalCase + space-strip D-09 sub-pattern** — case-symmetric
within each token but with a 1-byte capital at the leading
byte of each of the two tokens. Wire is 15 bytes (2 tokens
separated by a single internal ASCII space); slug is 14
bytes (lowercase concat of both tokens with the internal
space stripped).

**Wire-form D-11 observation:** **zero of 12 listings carry
a department** in the run-387 probe — the wire
`departments` array is empty for every listing. This is a
**first cohort observation of the completely-absent
departments sub-axis** (distinct from the prior fully-clean
department pass-through observations where the wire carries
a populated `departments[]` array byte-for-byte clean —
e.g., Shopmonkey 6 unique depts clean, Founders 3 unique
depts clean). The plugin's `.departments?.[0]?.name ?? null`
chain handles this transparently — every emitted JobPostDto
carries `department === null`.

## 2. Goals

- Ship a `source-company-ackermanngroup` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-shopmonkey` plugin (closest cohort cousin
  with the **variant-10 wire-shape + D-10 omitted + D-11
  omitted** profile) but with **two structural deviations**:
  1. **D-09 sub-axis:** case-symmetric bare-brand
     (`'Shopmonkey'` 10 bytes — 1 token) → **two-token
     PascalCase + space-strip** (`'Ackermann Group'` 15
     bytes — 2 tokens, both PascalCase with caps at byte
     index 0 of each token, single internal ASCII space
     stripped to yield 14-byte slug `ackermanngroup`).
  2. **D-11 sub-axis:** clean pass-through-with-depts (0 of 6
     unique populated depts padded) → **completely-absent
     departments form** (0 of 12 listings carry a department;
     wire `departments[]` array is empty for every listing).
     **First cohort observation of the completely-absent
     departments sub-axis.**
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  two-token PascalCase + space-strip lock case AND a dedicated
  D-11 absent-departments lock case beyond the standard 7-case
  cohort baseline).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Ackermann Group postings.
- Property-management / leasing-platform APIs (the plugin is
  careers-board-only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACKERMANNGROUP`**
> in the source registry, so that **a single `siteType:
> [Site.ACKERMANNGROUP]` request returns Ackermann Group's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACKERMANNGROUP = 'ackermanngroup'` to the `Site` enum.                                                                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-ackermanngroup`.                                                                     | must     |
| FR-3  | `AckermannGroupService.scrape(input)` returns a `JobResponseDto`; never throws.                                                    | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `ackermanngroup-`, `site === Site.ACKERMANNGROUP`.                                             | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10 legacy hosted-board apex).                                               | must     |
| FR-13 | D-10 **omitted** — 0 of 12 wire titles padded in run-387 probe.                                                                    | should   |
| FR-14 | D-11 **completely-absent-departments form** — 0 of 12 listings carry a department in run-387 probe; emitted `department === null`. | should   |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACKERMANNGROUP, name: 'Ackermann Group', category: 'company' })
@Injectable()
export class AckermannGroupService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-10 URL pass-
  through (legacy hosted-board apex
  `boards.greenhouse.io/ackermanngroup/jobs/<id>?gh_jid=<id>`);
  **D-09 two-token PascalCase + space-strip wire pin**
  (`'Ackermann Group'` 15 bytes; first token `Ackermann` 9
  bytes PascalCase cap at index 0; second token `Group` 5
  bytes PascalCase cap at index 0; single internal ASCII
  space stripped to slug `ackermanngroup`); D-10 clean title
  pass-through lock; **D-11 completely-absent-departments
  lock** (all emitted `department === null`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #387):** Wire-shape variant 10 (legacy
  hosted-board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`).
  **Ninth** plugin in the cohort to use variant 10 (after
  Chime, Faire, Flexport, Braze, Descript, Justworks,
  Founders, Shopmonkey).
- **D-08 (run #387):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-third** cohort plugin to apply D-08.
- **D-09 (run #387):** **Omitted at runtime** — wire
  `company_name === 'Ackermann Group'` flows through byte-
  for-byte. **Two-token PascalCase + space-strip sub-pattern.**
  Sub-pattern details:
  - First wire token `Ackermann` 9 bytes carries PascalCase
    cap at index 0 (caps at 0 only); lowercase 9-byte slug-
    prefix `ackermann`.
  - Second wire token `Group` 5 bytes carries PascalCase
    cap at index 0 (caps at 0 only); lowercase 5-byte
    slug-suffix `group`.
  - Single internal ASCII space stripped between the two
    tokens to yield the lowercase 14-byte slug
    `ackermanngroup`.
- **D-10 (run #387):** **Omitted** — 0 of 12 wire titles
  padded in the run-387 probe. The plugin emits
  `listing.title` byte-for-byte without a `.trim()`.
  **Forty-first cohort plugin to omit D-10**.
- **D-11 (run #387):** **Completely-absent-departments
  form** — 0 of 12 listings carry a department; wire
  `departments[]` array is empty across every listing.
  Emitted `department === null`. **First cohort observation
  of the completely-absent-departments sub-axis** —
  structurally distinct from the prior fully-clean
  department-pass-through observations (which all carried a
  populated `departments[]` array byte-for-byte clean).
- **D-13 (run #387):** **Two structural deviations** from
  the Shopmonkey template — D-09 sub-axis (case-symmetric
  bare-brand → two-token PascalCase + space-strip) AND D-11
  sub-axis (clean pass-through-with-depts → completely-absent
  departments form).

## 11. References

- `packages/plugins/source-company-shopmonkey/src/shopmonkey.service.ts` —
  closest variant-10 cousin (variant 10 + D-08 + D-10
  omitted + D-11 omitted with depts).
- `packages/plugins/source-company-collectivehealth/src/collective-health.service.ts` —
  prior two-token PascalCase + space-strip D-09 plugin
  (variant 2).
- `packages/plugins/source-company-acilearning/src/aci-learning.service.ts` —
  previous-run cohort plugin (Spec 176).
- `packages/plugins/source-company-founders/src/founders.service.ts` —
  prior variant-10 plugin with D-09 asymmetric sub-pattern.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
