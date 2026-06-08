# Spec: 148 — Source Company Plugin: Founders

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 148                                                                                                                                                                                            |
| Slug           | source-company-founders                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #358)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..147                                                                                                                                                                        |

## 1. Problem Statement

Run #357's Spec 147 closed end-to-end (Formlabs shipped — first
cohort observation of D-04 variant 40 careers-subdomain action-
leaf form + first cohort observation of triple-trailing-space
D-10 pad). Run #358 picks up the **fourteenth** live hit
alphabetically from the ninth-fresh-sweep candidate pool:
**Founders** (3 visible roles confirmed at run-358 start —
ninth-sweep estimate ~6; ~0.5× ratio under-count).

Founders Green Animal Hospital — operator of a **veterinary-
specialty animal-hospital + emergency / referral practice
pioneered around the multi-disciplinary companion-animal
clinical-care data model** (an independent veterinary
hospital practice; ships small-animal medicine, surgery,
emergency / critical care, dentistry, and rehabilitation
services across the consumer-veterinary / companion-animal-
care vertical) — is published at the bare `founders`
Greenhouse slug. Note: the slug `founders` is a **four-token
truncation** of the full wire `'Founders Green Animal
Hospital'` (30 bytes; truncates to first word only). **Third
cohort observation of slug-truncation D-09 sub-axis** after
Oscar (Spec 133 — slug-extra-word, 1 token added) and BEAM
(Spec 136 — slug-acronym-expansion).

## 2. Goals

- Ship a `source-company-founders` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-beam` plugin — BEAM is the closest cohort
  cousin sharing four primary axes: D-08 + D-09 slug-
  truncation asymmetric + D-10 omitted + D-11 omitted.
- **One structural deviation** from BEAM: D-04 sub-axis
  (variant 2 canonical Greenhouse host → variant 10 legacy
  hosted-board apex `boards.greenhouse.io/founders/jobs/<id>?gh_jid=<id>`;
  seventh variant-10 plugin in the cohort).
- **Notable D-09 sub-axis observation**: third cohort
  observation of slug-truncation form. Wire `company_name`
  is `'Founders Green Animal Hospital'` (30 bytes — FOUR-
  token legal-entity name); slug `founders` (8 bytes —
  matches first token only). Distinct from Oscar's 2-word
  slug-extra-word (one extra token after the slug-matching
  prefix) and BEAM's slug-acronym-expansion form (slug is
  acronym, wire is full org name + acronym in parens).
  Founders has **largest slug-token-truncation factor in
  cohort to date** (4 tokens dropped vs Oscar's 1).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Founders Green Animal Hospital
  postings.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FOUNDERS`** in
> the source registry, so that **a single `siteType:
> [Site.FOUNDERS]` request returns Founders Green Animal
> Hospital's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.FOUNDERS = 'founders'` to the `Site` enum.                                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-founders`.                                                                 | must     |
| FR-3  | `FoundersService.scrape(input)` returns a `JobResponseDto`; never throws.                                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `founders-`, `site === Site.FOUNDERS`, `companyName === 'Founders Green Animal Hospital'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 10 `boards.greenhouse.io/founders/jobs/<id>?gh_jid=<id>`).         | must     |
| FR-13 | D-10 **omitted** — no title `.trim()` (0 of 3 padded).                                                                   | must     |
| FR-14 | D-11 **omitted** — 0 of 3 wire department names padded across 3 unique departments.                                      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FOUNDERS, name: 'Founders Green Animal Hospital', category: 'company' })
@Injectable()
export class FoundersService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-10 URL pass-
  through; **D-09 slug-truncation asymmetric wire pin**
  (`'Founders Green Animal Hospital'` 30 bytes vs slug
  `founders` 8 bytes — slug truncates to first token of
  4-token wire); D-10 omitted byte-for-byte title pass-
  through (no trim) lock; D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #358):** Wire-shape variant 10 (legacy hosted-
  board apex `boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`).
  **Seventh** plugin in the cohort to use variant 10 after
  Chime, Faire, Flexport, Braze, Descript, and Justworks.
- **D-08 (run #358):** Decode-then-strip pipeline. **One-
  hundred-and-fourth** cohort plugin to apply D-08.
- **D-09 (run #358):** **Omitted with THIRD-COHORT slug-
  truncation asymmetric wire form.** Wire `company_name ===
  'Founders Green Animal Hospital'` byte-for-byte (30 bytes
  — FOUR-token legal-entity name with internal whitespace).
  Slug `founders` (8 bytes — matches the first token only;
  truncates 3 trailing tokens `Green Animal Hospital`).
  **Third cohort observation of slug-truncation D-09 sub-
  axis** after Oscar (Spec 133 — slug-extra-word, 1 token
  added beyond slug — `'Oscar Health'`) and BEAM (Spec 136 —
  slug-acronym-expansion — slug `beam` is acronym only, wire
  `'Bridge to Enter Advanced Mathematics (BEAM)'` 43 bytes).
  Founders has **largest slug-token-truncation factor in
  cohort to date** (4 tokens dropped beyond slug vs Oscar's
  1 token added). **Ninety-fifth cohort plugin to omit D-09**.
- **D-10 (run #358):** **Omitted.** 0 of 3 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Twenty-ninth cohort plugin to omit
  D-10**.
- **D-11 (run #358):** **Omitted.** 0 of 3 wire department
  names padded across 3 unique department names
  (`'Assistants'`, `'Reception'`, `'Technicians'` — clean
  single-token forms). **Eighty-third cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #358):** **One structural deviation** from the
  BEAM (Spec 136) template — D-04 sub-axis (variant 2 →
  variant 10 legacy hosted-board apex). All other axes share
  with BEAM: D-08 + D-09 slug-truncation asymmetric + D-10
  omitted + D-11 omitted.

## 11. References

- `packages/plugins/source-company-beam/src/beam.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-oscar/src/oscar.service.ts` —
  prior cohort observation of slug-extra-word D-09 sub-axis.
- `packages/plugins/source-company-formlabs/src/formlabs.service.ts` —
  immediate predecessor (run #357).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
