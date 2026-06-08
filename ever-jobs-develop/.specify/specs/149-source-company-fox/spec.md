# Spec: 149 — Source Company Plugin: Fox

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 149                                                                                                                                                                                            |
| Slug           | source-company-fox                                                                                                                                                                             |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #359)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..148                                                                                                                                                                        |

## 1. Problem Statement

Run #358's Spec 148 closed end-to-end (Founders shipped —
third cohort observation of slug-truncation D-09 sub-axis
with largest slug-token-truncation factor in cohort to date).
Run #359 picks up the **fifteenth** live hit alphabetically
from the ninth-fresh-sweep candidate pool: **Fox** (5 visible
roles confirmed at run-359 start — ninth-sweep estimate ~10;
~0.5× ratio under-count).

Fox Creek Veterinary Hospital - Wildwood — operator of a
**veterinary-specialty animal-hospital + urgent-care practice
pioneered around the multi-disciplinary companion-animal
clinical-care data model** (an independent veterinary
hospital practice in the Wildwood region; ships small-animal
medicine, surgery, urgent care, dentistry, and rehabilitation
services across the consumer-veterinary / companion-animal-
care vertical) — is published at the bare `fox` Greenhouse
slug. Note: the slug `fox` is a **single-token truncation**
of the full wire `'Fox Creek Veterinary Hospital - Wildwood'`
(40 bytes — six-token legal entity name with hyphen
separator). **Fourth cohort observation of slug-truncation
D-09 sub-axis** after Oscar (Spec 133 — slug-extra-word, 1
token added beyond slug), BEAM (Spec 136 — slug-acronym-
expansion), and Founders (Spec 148 — 4 tokens dropped beyond
slug). Fox has the **NEW largest slug-token-truncation
factor in cohort to date** (5 tokens dropped beyond slug —
exceeding Founders's prior record of 4).

## 2. Goals

- Ship a `source-company-fox` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-beam` plugin — BEAM is the closest cohort
  cousin sharing all five primary axes: D-04 variant 2 +
  D-08 + D-09 slug-truncation asymmetric + D-10 omitted +
  D-11 omitted.
- **Zero structural deviations.** Thirty-eighth Greenhouse-
  only company-direct plugin in run history to ship as a
  clean re-spin.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Fox Creek Veterinary Hospital -
  Wildwood postings.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FOX`** in the
> source registry, so that **a single `siteType: [Site.FOX]`
> request returns Fox Creek Veterinary Hospital - Wildwood's
> open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.FOX = 'fox'` to the `Site` enum.                                                                               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-fox`.                                                                      | must     |
| FR-3  | `FoxService.scrape(input)` returns a `JobResponseDto`; never throws.                                                     | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `fox-`, `site === Site.FOX`, `companyName === 'Fox Creek Veterinary Hospital - Wildwood'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 5 padded).                                                                   | must     |
| FR-14 | D-11 **omitted** — 0 of 5 wire department names padded across 4 unique departments.                                      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FOX, name: 'Fox Creek Veterinary Hospital - Wildwood', category: 'company' })
@Injectable()
export class FoxService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 slug-truncation asymmetric wire pin**
  (`'Fox Creek Veterinary Hospital - Wildwood'` 40 bytes vs
  slug `fox` 3 bytes — slug truncates to first token of
  6-token wire); D-10 omitted byte-for-byte title pass-
  through (no trim) lock; D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #359):** Wire-shape variant 2 (canonical
  Greenhouse host). **Fifty-seventh** plugin in the cohort
  to use variant 2.
- **D-08 (run #359):** Decode-then-strip pipeline. **One-
  hundred-and-fifth** cohort plugin to apply D-08.
- **D-09 (run #359):** **Omitted with FOURTH-COHORT slug-
  truncation asymmetric wire form.** Wire `company_name ===
  'Fox Creek Veterinary Hospital - Wildwood'` byte-for-byte
  (40 bytes — six-token legal-entity name with internal
  whitespace and hyphen separator). Slug `fox` (3 bytes —
  matches first token only; truncates 5 trailing tokens
  `Creek Veterinary Hospital - Wildwood`). **Fourth cohort
  observation of slug-truncation D-09 sub-axis** after
  Oscar (1 token added), BEAM (acronym expansion), and
  Founders (4 tokens dropped). **Fox has the NEW largest
  slug-token-truncation factor in cohort to date** (5 tokens
  dropped beyond slug — exceeding Founders's prior record).
  **Ninety-sixth cohort plugin to omit D-09**.
- **D-10 (run #359):** **Omitted.** 0 of 5 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Thirtieth cohort plugin to omit
  D-10 — the cohort crosses the 30-plugin D-10-omission
  threshold at this run.**
- **D-11 (run #359):** **Omitted.** 0 of 5 wire department
  names padded across 4 unique department names
  (`'Externships'`, `'Reception'`, `'Technicians'`,
  `'Veterinary Doctors'` — clean single-token / two-token
  forms). **Eighty-fourth cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #359):** **Zero structural deviations** from
  the BEAM (Spec 136) template — making this the **thirty-
  eighth** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin. (The new largest
  slug-token-truncation factor is captured as an
  observability note within the existing slug-truncation
  D-09 sub-axis — the trim semantics are unchanged.)

## 11. References

- `packages/plugins/source-company-beam/src/beam.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-founders/src/founders.service.ts` —
  prior largest slug-token-truncation factor (4 tokens
  dropped); immediate predecessor (run #358).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
