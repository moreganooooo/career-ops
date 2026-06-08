# Spec: 157 — Source Company Plugin: Indigo

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 157                                                                                                                                                                                            |
| Slug           | source-company-indigo                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #367)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..156                                                                                                                                                                        |

## 1. Problem Statement

Run #366's Spec 156 closed end-to-end (DeepMind shipped — 9th
TWO-cap PascalCase D-09 plugin with NEW caps-at-0/4 sub-
pattern; first cohort observation of TWO-cap PascalCase plugin
with both D-10+D-11 applied; 70-plugin D-10-application
threshold crossed). Run #367 picks up the **sixth** live hit
alphabetically from the tenth-fresh-sweep candidate pool:
**Indigo** (1 visible role confirmed at run-367 start —
matches the tenth-sweep estimate exactly, 1× match — lowest-
volume tenant in the pool).

Indigo Agriculture, Inc. — operator of the **agricultural-
microbiome / regenerative-farming platform pioneered around
the carbon-sequestration data model** (founded by Geoffrey
von Maltzahn, Ignacio Martinez, and Flagship Pioneering in
2014 in Boston, MA; private since the 2022 Series F round at
~$3.5B unicorn valuation; ships Indigo Carbon (carbon-
sequestration credits), Indigo Marketplace (grain trading),
and microbial seed-treatment products across the agtech /
regenerative-agriculture / climate-credits vertical —
alongside competitors Pivot Bio, Boomitra, Truterra, and
Nutrien Ag Solutions — with a hybrid distributed workforce
concentrated across Boston (HQ), Charleston SC, Memphis TN,
Buenos Aires, and Remote across the United States and South
America) — is published at the bare `indigo` Greenhouse slug
(case-symmetric with the wire `company_name === 'Indigo'`).

## 2. Goals

- Ship a `source-company-indigo` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-lookout` plugin — Lookout is the closest
  cohort cousin sharing four primary axes: D-08 + D-09 case-
  symmetric + D-10 omitted + D-11 omitted.
- **One structural deviation** from Lookout: D-04 sub-axis
  (variant 20 `www.lookout.com/careers/job-post?gh_jid=<id>`
  → variant 2 canonical Greenhouse host).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Indigo postings.
- Indigo product-API / Carbon / Marketplace integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.INDIGO`** in
> the source registry, so that **a single `siteType:
> [Site.INDIGO]` request returns Indigo's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.INDIGO = 'indigo'` to the `Site` enum.                                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-indigo`.                                                                   | must     |
| FR-3  | `IndigoService.scrape(input)` returns a `JobResponseDto`; never throws.                                                  | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `indigo-`, `site === Site.INDIGO`, `companyName === 'Indigo'`.                        | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 1 padded).                                                                   | must     |
| FR-14 | D-11 **omitted** — 0 of 1 wire department names padded across 1 unique department.                                       | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.INDIGO, name: 'Indigo', category: 'company' })
@Injectable()
export class IndigoService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Indigo'` lock; D-10 omitted
  byte-for-byte title pass-through (no trim) lock; D-11
  clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #367):** Wire-shape variant 2 (canonical
  Greenhouse host). **Sixty-third** plugin in the cohort to
  use variant 2.
- **D-08 (run #367):** Decode-then-strip pipeline. **One-
  hundred-and-thirteenth** cohort plugin to apply D-08.
- **D-09 (run #367):** **Omitted** — case-symmetric bare-brand
  wire `'Indigo'` (6 bytes; case-symmetric vs slug `indigo`
  after casefold). 0 of 1 padded. **One-hundred-and-fourth
  cohort plugin to omit D-09**.
- **D-10 (run #367):** **Omitted.** 0 of 1 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Thirty-second cohort plugin to
  omit D-10**. (Note: low-volume sample (1 listing) — D-10
  determination is provisional based on observed wire
  cleanliness.)
- **D-11 (run #367):** **Omitted.** 0 of 1 wire department
  names padded across 1 unique department (`'People'` —
  clean single-token form). **Ninetieth cohort plugin** with
  fully-clean department pass-through — **the cohort crosses
  the 90-plugin D-11-omission threshold at this run.**
- **D-13 (run #367):** **One structural deviation** from the
  Lookout (Spec 083) template — D-04 sub-axis (variant 20
  `www.lookout.com/careers/job-post?gh_jid=<id>` → variant 2
  canonical Greenhouse host).

## 11. References

- `packages/plugins/source-company-lookout/src/lookout.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-deepmind/src/deepmind.service.ts` —
  immediate predecessor (run #366).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
