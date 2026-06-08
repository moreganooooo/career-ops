# Spec: 096 — Source Company Plugin: Dollar Shave Club

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 096                                                                                                                                                                                            |
| Slug           | source-company-dollarshaveclub                                                                                                                                                                 |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #306)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..095                                                                                                                                                                        |

## 1. Problem Statement

Run #305's Spec 095 closed end-to-end (Coalition shipped — sixth
plugin in the sixth fresh probe sweep, first cohort observation
of variant 25 + first legal-entity-suffix wire form + first
multi-byte leading pad sub-axis). Run #306 picks up the
**seventh** live hit alphabetically from the sixth-fresh-sweep
candidate pool: **Dollar Shave Club** (5 roles confirmed at
run-306 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/dollarshaveclub/jobs?content=true`;
the run-300 sixth-sweep estimate of ~5 keys matched the actual
job count exactly — minimal probe-counter inflation, similar to
BILL/Adyen/Bobbie/Cerebral).

Dollar Shave Club, Inc. — operator of the **dominant direct-to-
consumer men's grooming subscription platform pioneered around
the monthly-blade-shipment-and-personal-care data model**
(founded by Michael Dubin and Mark Levine in 2011 in Venice,
California; raised ~$163M across rounds led by Venrock,
Forerunner Ventures, and TCV; acquired by Unilever in July 2016
for $1B; spun back out as an independent company in October 2023
with Nexus Capital Management as the new majority owner; now
headquartered in Durham, North Carolina under the Marc Pritchard
era; ships razors, shave products, and personal care under the
DSC brand across the men's grooming / D2C-personal-care segment
— alongside competitors Harry's, Gillette / Procter & Gamble,
Manscaped, and Bevel — with a hybrid distributed workforce
concentrated across Durham, NC and Remote across the United
States) — is published at the bare `dollarshaveclub` Greenhouse
slug (the lowercase concatenated three-word brand-name; case-
asymmetric AND length-asymmetric with the wire `company_name
=== 'Dollar Shave Club'`) and was confirmed live via run #306's
HTTP 200 probe.

The run-306 probe revealed **two cohort observations**:

1. **D-09 OMITTED with internal-whitespace wire asymmetry —
   THREE-token bare-brand wire form (first cohort observation of
   THREE-token internal-whitespace asymmetry).** Wire
   `company_name === 'Dollar Shave Club'` byte-for-byte (17
   bytes — three brand-tokens separated by two internal ASCII
   spaces); slug `dollarshaveclub` is 15 bytes lowercase
   concatenated, no spaces — slug/wire-asymmetric, wire LONGER
   than slug by 2 bytes via the two internal ASCII spaces (at
   indices 6 and 12 between `Dollar`/`Shave`/`Club`). This is
   the **first cohort observation of a THREE-token internal-
   whitespace-asymmetry wire** — all four prior internal-
   whitespace-asymmetry cases (Maven Clinic `'Maven Clinic'` 12
   bytes / 11 slug, Stitch Fix `'Stitch Fix'` 10 bytes / 9 slug,
   Scale AI `'Scale AI'` 8 bytes / 7 slug, New Relic `'New
   Relic'` 9 bytes / 8 slug) carried two-token wires with a
   single internal space byte. Dollar Shave Club is the first
   to carry **two** internal space bytes in the wire form. The
   plugin emits the wire byte-for-byte; downstream cross-source
   dedup (if used) is responsible for canonicalising the
   whitespace-vs-concatenated axis.

2. **D-11 APPLIED with single-trailing-space form — first cohort
   plugin to combine D-11 application with internal-whitespace
   D-09 omission.** 1 of 5 wire department names in the run-306
   probe carries a trailing ASCII-space pad byte (`'Legal '` —
   the third listing's department; the other four — `'Brand
   Strategy & Marketing'` × 2, `'eCommerce - Digital'`,
   `'Engineering'` — are clean); ~20 % listing-level pad rate.
   The plugin applies `.trim()` to the wire `departments[0].name`
   before the search-term guard and emit. **Fifth cohort plugin
   to apply D-11** (after Lattice's run-284 first-ever trailing-
   pad, DataCamp's run-291 first-ever leading-pad, Typeform's
   run-299 second trailing-pad, and BILL's run-302 high-pad-rate
   trailing-pad). Dollar Shave Club is the **first cohort plugin
   to ship D-11 application combined with D-09 internal-
   whitespace asymmetry** — all four prior D-11 applicants
   carried single-token bare-brand wires that did not exercise
   the slug-vs-wire whitespace-asymmetry axis.

## 2. Goals

- Ship a `source-company-dollarshaveclub` plugin returning live
  `JobPostDto` rows for the public Dollar Shave Club careers
  board.
- Match the structural and behavioural shape of the existing
  `source-company-newrelic` plugin — New Relic is the closest
  cohort cousin via shared variant-2 wire-shape AND shared D-09
  omission with internal-whitespace asymmetry. **Two structural
  deviations** from New Relic:
  1. **D-10 omitted** (New Relic applied with 16/74 ~21.6 % pad
     rate; Dollar Shave Club 0/5 wire titles padded — fully
     clean).
  2. **D-11 applied** with single-trailing-space form (New Relic
     omitted with 0/74 padded; Dollar Shave Club 1/5 padded
     `'Legal '` — first cohort plugin to combine D-11
     application with D-09 internal-whitespace asymmetry).
- Bundle a unit-test suite (≥ 8 cases) including locks for the
  variant-2 URL pass-through, the THREE-token internal-
  whitespace-asymmetry D-09 sub-axis, the D-10 omission, and
  the D-11 application with `'Legal '` → `'Legal'` trim form.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Dollar Shave Club postings.
- Dollar Shave Club product-API / D2C / subscription-management
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DOLLARSHAVECLUB`**
> in the source registry, so that **a single `siteType:
> [Site.DOLLARSHAVECLUB]` request returns Dollar Shave Club's
> open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DOLLARSHAVECLUB = 'dollarshaveclub'` to the `Site` enum.                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-dollarshaveclub`.                                   | must     |
| FR-3  | `DollarShaveClubService.scrape(input)` returns a `JobResponseDto`; never throws.                  | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `dollarshaveclub-`, `site === Site.DOLLARSHAVECLUB`, `companyName === 'Dollar Shave Club'` (wire pass-through; D-09 omitted). | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **omitted** — title pass-through (0/5 wire titles padded).                                   | must     |
| FR-14 | D-09 **omitted** — wire `'Dollar Shave Club'` flows through byte-for-byte (THREE-token internal-whitespace asymmetry; first cohort observation). | must     |
| FR-15 | D-11 **APPLIED** — department `.trim()` covers the single-trailing-space sub-axis (`'Legal '` → `'Legal'`); first cohort plugin to combine D-11 application with D-09 internal-whitespace asymmetry. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DOLLARSHAVECLUB, name: 'Dollar Shave Club', category: 'company' })
@Injectable()
export class DollarShaveClubService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` matches wire byte-
    for-byte; contains `job-boards.greenhouse.io/dollarshaveclub/jobs/`
    (locks the canonical Greenhouse host shape).
  - **D-09 omission lock with THREE-token internal-whitespace
    asymmetry wire form**: input `company_name === 'Dollar Shave
    Club'` (17 bytes, two internal ASCII spaces) → emitted
    `companyName === 'Dollar Shave Club'` byte-for-byte; matches
    the wire byte-for-byte; contains the two single-space substrings
    `'Dollar Shave'` and `'Shave Club'` (locks the THREE-token
    form against accidental concatenation); does NOT equal the
    concatenated slug `'dollarshaveclub'` or the title-cased
    concatenated form `'DollarShaveClub'` (anti-substring locks
    against accidental D-09 application).
  - **D-10 omission lock**: input title `'Brand Marketing
    Intern'` (clean, no pad bytes) → emitted title byte-for-byte
    identical to wire (sanity-check that the plugin does NOT
    apply `.trim()` aggressively when wire is clean); for the
    omission lock, also assert that none of the 5 wire titles in
    the run-306 fixture carry whitespace pad bytes.
  - **D-11 application lock with single-trailing-space form**:
    input `departments[0].name === 'Legal '` (6 bytes; one
    trailing ASCII space) → emitted `department === 'Legal'`
    (5 bytes; byte-distinct + 1-byte-shorter; does NOT end in
    whitespace).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department (against the
  trimmed `'Legal'` form, locking that the search hits the post-
  trim department), HTTP 500 → empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #306):** Wire-shape variant 2 — canonical
  Greenhouse host. The `absolute_url` shape
  `https://job-boards.greenhouse.io/dollarshaveclub/jobs/<id>`
  matches the canonical Greenhouse subdomain shape used by 24
  prior cohort plugins (Adyen, Cerebral, Bobbie, Coursera,
  Flexport, Glossier, Marqeta, New Relic, Scopely, Typeform,
  plus 14 others). **Twenty-fifth** plugin in the cohort to use
  variant 2.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/dollarshaveclub/jobs/<id>`.

- **D-08 (run #306):** Decode-then-strip pipeline. **Fifty-
  second** cohort plugin to apply D-08.

- **D-09 (run #306):** **OMITTED with THREE-token internal-
  whitespace-asymmetry wire form.** Wire `company_name ===
  'Dollar Shave Club'` byte-for-byte (17 bytes — three brand-
  tokens separated by two internal ASCII spaces); slug
  `dollarshaveclub` is 15 bytes lowercase concatenated, no
  spaces. Slug/wire-asymmetric — wire LONGER than slug by 2
  bytes via the two internal ASCII spaces.

  This is the **first cohort observation of a THREE-token
  internal-whitespace-asymmetry wire** — all four prior
  internal-whitespace-asymmetry cases were two-token forms with
  a single internal space:
    - Maven Clinic (run #270 / Spec 076) — `'Maven Clinic'` (12 bytes / 11-byte slug `mavenclinic`)
    - Stitch Fix (later run) — `'Stitch Fix'` (10 bytes / 9-byte slug `stitchfix`)
    - Scale AI (run #274 / Spec 064) — `'Scale AI'` (8 bytes / 7-byte slug `scaleai`)
    - New Relic (run #295 / Spec 085) — `'New Relic'` (9 bytes / 8-byte slug `newrelic`)
  Dollar Shave Club is the first to carry **two** internal
  space bytes in the wire form.

  The plugin emits the wire byte-for-byte (preserving `'Dollar
  Shave Club'`) with a defensive `'Dollar Shave Club'` fallback:

  ```ts
  companyName: listing.company_name ?? 'Dollar Shave Club',
  ```

  Downstream cross-source dedup (if used) is responsible for
  canonicalising the whitespace-vs-concatenated axis.
  **Forty-fifth cohort plugin to omit D-09**, tenth slug/wire
  asymmetry case overall, fifth internal-whitespace asymmetry
  case, **first three-token internal-whitespace asymmetry**.

- **D-10 (run #306):** **OMITTED.** 0 of 5 wire titles in the
  run-306 probe carry pad bytes (`'Brand Marketing Intern'`,
  `'Ecommerce Intern'`, `'Legal Intern'`, `'Senior Manager,
  Engineering'`, `'Social Media Growth Intern'` — all clean
  byte-for-byte forms). The plugin emits `listing.title`
  directly without a `.trim()`. **Nineteenth cohort plugin to
  omit D-10**.

- **D-11 (run #306):** **APPLIED with single-trailing-space
  form.** 1 of 5 wire department names in the run-306 probe
  carries a trailing ASCII-space pad byte (`'Legal '` — the
  third listing's department; the other four — `'Brand Strategy
  & Marketing'` × 2, `'eCommerce - Digital'`, `'Engineering'`
  — are clean); ~20 % listing-level pad rate. The plugin
  applies `.trim()` to the wire `departments[0].name` before
  the search-term guard and emit, locking the trimmed form for
  search-term match consistency.

  **Fifth cohort plugin to apply D-11** (after Lattice's
  run-284 first-ever trailing-pad, DataCamp's run-291 first-
  ever leading-pad, Typeform's run-299 second trailing-pad, and
  BILL's run-302 high-pad-rate trailing-pad). Dollar Shave Club
  is the **first cohort plugin to ship D-11 application
  combined with D-09 internal-whitespace asymmetry** — all four
  prior D-11 applicants (Lattice `'Lattice'`, DataCamp
  `'DataCamp'`, Typeform `'Typeform'`, BILL `'BILL'`) carried
  single-token bare-brand wires that did not exercise the slug-
  vs-wire whitespace-asymmetry axis. This combination opens a
  new cross-axis sub-observation: Dollar Shave Club's scaffold
  must apply `.trim()` on the department even though the wire
  `company_name` carries internal whitespace pad bytes that the
  plugin emits intact (the trim applies only to the
  `departments[0].name` axis, not the `company_name` axis).

- **D-13 (run #306):** **Two structural deviations** from the
  New Relic (Spec 085) template:
  1. D-10 omitted (New Relic applied with 16/74 ~21.6 % pad
     rate; Dollar Shave Club 0/5 fully clean).
  2. D-11 applied with single-trailing-space form (New Relic
     omitted with 0/74 padded; Dollar Shave Club 1/5 padded
     `'Legal '` — first cohort plugin to combine D-11 with
     D-09 internal-whitespace asymmetry).

## 11. References

- `packages/plugins/source-company-newrelic/src/newrelic.service.ts` —
  closest cohort cousin (D-09 internal-whitespace-asymmetry reference;
  also variant-2 reference).
- `packages/plugins/source-company-billcom/src/billcom.service.ts` —
  D-11 application reference (high-pad-rate trailing-pad form).
- `packages/plugins/source-company-coalition/src/coalition.service.ts` —
  immediate predecessor in run-history (run #305).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
