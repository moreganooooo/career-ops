# Spec: 184 — Source Company Plugin: Acryl Data

| Field          | Value                                                              |
| -------------- | ------------------------------------------------------------------ |
| Spec ID        | 184                                                                |
| Slug           | source-company-acryldata                                           |
| Status         | accepted                                                           |
| Owner          | claude (run #394)                                                  |
| Created        | 2026-05-22                                                         |
| Last updated   | 2026-05-22                                                         |
| Supersedes     | (none)                                                             |
| Related specs  | 001, 003, 005, 020..183                                            |

## 1. Problem Statement

Run #393's Spec 183 closed end-to-end (Acrisure Innovation
shipped — 9th plugin in the eleventh fresh probe sweep;
first cohort observation of leading-and-trailing-pad D-10
sub-form). Run #394 is the **tenth** plugin in the eleventh
fresh probe sweep with **Acryl Data** (metadata-platform
vendor / steward of the open-source DataHub project — 9
visible roles confirmed at run-394 start via direct curl
probe of
`https://api.greenhouse.io/v1/boards/acryldata/jobs?content=true`).

Acryl Data, Inc. — operator of the **dominant managed open-
source metadata-platform vendor**, the corporate steward of
the open-source `DataHub` end-to-end data-discovery,
observability, and governance platform — providing a hosted
SaaS edition (`Acryl DataHub`), enterprise data-catalog,
column-and-table-level data lineage, schema-and-quality
monitoring, role-based access governance, business-glossary
curation, and developer-tooling services for global
enterprise customers (founded in 2020 by Swaroop Jagadish,
Shirshanka Das, Mars Lan and Kerem Sahin in Palo Alto,
California; privately-held metadata-platform vendor backed
by 8VC, LinkedIn, Insight Partners, and DBC Venture Partners
across Seed / Series A / Series B funding rounds; serves
enterprise customers across financial services, retail,
technology, and media verticals; ships Acryl DataHub Cloud,
DataHub Open Source, Iceberg-and-Trino-aware ingestion,
MCP-style metadata streaming, observability assertions, and
column-level lineage across the enterprise data-catalog /
metadata-management segment — alongside peers Atlan,
Collibra, Alation, Castor, and data.world — with a hybrid
distributed workforce concentrated across Palo Alto (HQ),
Europe Remote, US Remote, West Coast Remote, Bengaluru, and
Remote Global) — publishes its consolidated careers board
through Greenhouse at the bare slug `acryldata` (wire
`company_name === 'DataHub'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'DataHub'` is a 7-byte **TWO-cap
PascalCase single-token** wire form (caps at byte 0 and byte
4) — but slug `acryldata` is **NOT byte-for-byte lowercase
of wire**. The slug derives from the **corporate name**
`'Acryl Data'` (10-byte case-symmetric two-token PascalCase
+ ASCII-space: first token `'Acryl'` 5 bytes + ASCII space
+ second token `'Data'` 4 bytes → space-strip → 9-byte
lowercase slug `acryldata`), while the wire `company_name`
emits the **product-line brand name** `'DataHub'`. **First
cohort observation of a slug-not-derived-from-wire-
company_name sub-form** — the slug is sourced from the
corporate name and the wire `company_name` flows through as
the product brand.

**Wire-form D-10 observation:** **0 of 9 listings carry
trailing ASCII-space padding** in the wire `title` field —
all titles flow through byte-for-byte clean. The plugin omits
D-10 — emits wire `title` byte-for-byte without `.trim()`
overlay.

**Wire-form D-11 observation:** **0 of 3 unique department
names carry trailing or leading ASCII-space padding** in the
wire — all department names flow through byte-for-byte clean
(`'Marketing & Sales'`, `'Engineering'`, `'Customer
Success'`). The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay.

## 2. Goals

- Ship a `source-company-acryldata` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-acquia` plugin (closest cohort cousin with
  the **variant-2 + D-08 + D-09 omitted + D-10 omitted +
  D-11 omitted** profile) with **one structural deviation**
  — the D-09 sub-axis (slug-from-corporate-name + wire-as-
  product-brand mismatch sub-form, first cohort observation).
- Bundle a unit-test suite (≥ 11 cases — standard cohort
  baseline; D-09 byte-for-byte wire pin + slug-vs-wire
  mismatch lock; D-10 clean-pass-through title lock; D-11
  clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Acryl Data postings.
- Other metadata-platform vendor boards (Atlan, Collibra,
  Alation, Castor, data.world — separate adoption candidates
  if needed).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACRYLDATA`** in
> the source registry, so that **a single `siteType:
> [Site.ACRYLDATA]` request returns Acryl Data's open
> metadata-platform / DataHub engineering and go-to-market
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACRYLDATA = 'acryldata'` to the `Site` enum.                                                                            | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acryldata`.                                                                          | must     |
| FR-3  | `AcryldataService.scrape(input)` returns a `JobResponseDto`; never throws.                                                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acryldata-`, `site === Site.ACRYLDATA`.                                                       | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 11 unit tests with mocked HTTP.                                                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **omitted (clean pass-through)** — 0 of 9 wire titles padded; wire `title` flows through byte-for-byte.                       | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 3 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must   |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACRYLDATA, name: 'Acryl Data', category: 'company' })
@Injectable()
export class AcryldataService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 11 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acryldata/jobs/<id>`); **D-09
  byte-for-byte wire pin** (`'DataHub'` 7 bytes, single-
  token PascalCase with caps at byte 0 and byte 4) +
  **slug-vs-wire mismatch lock** (slug `acryldata` is NOT
  lowercase-of-wire; it derives from the corporate name
  `'Acryl Data'` via space-strip + lowercase); **D-10 clean-
  pass-through title lock** (emit byte-equal to wire `title`
  with no `.trim()` overlay); **D-11 clean-pass-through
  dept lock** (emit byte-equal to wire `departments[0].name`
  with no `.trim()` overlay).
- Plus standard cohort cases (resultsWanted cap, searchTerm
  filter on title and department, HTTP-500 error handling,
  empty-payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #394):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eighty-third** plugin in the cohort to use variant 2.
- **D-08 (run #394):** Decode-then-strip pipeline. **One-
  hundred-and-fortieth** cohort plugin to apply D-08.
- **D-09 (run #394):** **Omitted at runtime** — wire
  `company_name === 'DataHub'` flows through byte-for-byte.
  **TWO-cap PascalCase single-token** form (7 bytes; caps at
  byte 0 and byte 4). **131st cohort plugin to omit D-09.**
  **First cohort observation of slug-not-derived-from-wire-
  company_name sub-form** — slug `acryldata` derives from
  the corporate name `'Acryl Data'` (10 bytes, two-token
  PascalCase + space-strip + lowercase → 9-byte slug); the
  wire emits the product-line brand `'DataHub'`.
- **D-10 (run #394):** **Omitted (clean pass-through).** 0
  of 9 wire titles carry ASCII-space padding; emit wire
  `title` byte-for-byte without `.trim()` overlay. **44th
  cohort plugin to omit D-10.**
- **D-11 (run #394):** **Omitted (clean pass-through).** 0
  of 3 unique wire department names padded (`'Marketing &
  Sales'`, `'Engineering'`, `'Customer Success'`); wire
  `departments[0].name` flows through byte-for-byte. **111th
  cohort plugin with fully-clean department pass-through
  (D-11 omitted).**
- **D-13 (run #394):** **One structural deviation** from the
  Acquia (Spec 182) template — D-09 sub-axis: case-symmetric
  bare-brand single-token PascalCase with **slug = lowercase-
  of-wire** (`'Acquia'` → `acquia`) → **slug-not-derived-
  from-wire-company_name sub-form** with TWO-cap PascalCase
  wire + corporate-name-derived slug (`'DataHub'` wire,
  `acryldata` slug from `'Acryl Data'` corporate name).

## 11. References

- `packages/plugins/source-company-acquia/src/acquia.service.ts` —
  closest cohort cousin (variant-2 + D-08 + D-09 omitted +
  D-10 omitted + D-11 omitted; one-deviation template).
- `packages/plugins/source-company-acrisureinnovation/src/acrisure-innovation.service.ts` —
  prior-run sibling (run #393).
- `packages/plugins/source-company-beam/src/beam.service.ts` —
  prior precedent for slug-differs-from-wire-company_name
  cases (slug `beam`, wire `'Bridge to Enter Advanced
  Mathematics (BEAM)'`).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
