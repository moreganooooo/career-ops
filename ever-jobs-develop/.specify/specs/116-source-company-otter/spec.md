# Spec: 116 — Source Company Plugin: Otter

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 116                                                                                                                                                                                            |
| Slug           | source-company-otter                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #326)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..115                                                                                                                                                                        |

## 1. Problem Statement

Run #325's Spec 115 closed end-to-end (Okta shipped — first
cohort observation of variant 31 dual-id form; first-cohort
suffix-numeric-ID dept naming). Run #326 picks up the
**eleventh** live hit alphabetically from the seventh-fresh-
sweep candidate pool: **Otter** (39 visible roles confirmed at
run-326 start).

Otter, Inc. (Otter.ai) — operator of the **dominant AI-powered
meeting-transcription / live-captioning / collaborative-notes
platform pioneered around the speech-to-text-as-a-service data
model** (founded by Sam Liang and Yun Fu in 2016 in Mountain
View, California; raised ~$63M across rounds at peak ~$300M
valuation in 2020 led by NTT DOCOMO Ventures and Tiger Global
Management; ships Otter.ai voice-meeting transcription,
OtterPilot meeting assistant, AI Channels collaborative-notes,
and Otter for Education / Enterprise across the meeting-
transcription / AI-notes / live-captioning segment — alongside
competitors Fireflies.ai, Rev.com, Microsoft Teams Premium /
Recap, Zoom AI Companion, and Read.ai — with a hybrid
distributed workforce concentrated across Mountain View (HQ),
Los Angeles, and Remote across the United States) — publishes
its consolidated careers board through Greenhouse at the bare
slug `otter` (case-symmetric with the wire `company_name ===
'Otter'` after casefold).

> **Note on slug-vs-brand asymmetry:** the Greenhouse slug
> `otter` matches both Otter.ai (AI-transcription) and Otter
> Brick-and-Mortar / Otter Central Ops (food-delivery
> infrastructure) — the wire's department names (`'Otter -
> ENT'`, `'Otter - SMB'`, `'Otter Central Ops'`, `'ENG Brick &
> Mortar'`, `'PD Brick & Mortar'`) suggest the published board
> covers the **Otter food-delivery infrastructure** brand
> (formerly TryOtter / Ordermark), not Otter.ai. The slug-vs-
> brand-disambiguation is recorded as a regression note but
> does not change wire shape.

## 2. Goals

- Ship a `source-company-otter` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-airtable` plugin — Airtable is the closest
  cohort cousin via shared D-04 variant 2 + D-08 + D-09 case-
  symmetric + D-10 applied + D-11 omitted axes.
- **Zero structural deviations** from Airtable.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Otter postings.
- Otter food-delivery infrastructure / Otter.ai
  speech-to-text product-API integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.OTTER`** in the
> source registry, so that **a single `siteType: [Site.OTTER]`
> request returns Otter's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.OTTER = 'otter'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-otter`.                                             | must     |
| FR-3  | `OtterService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `otter-`, `site === Site.OTTER`, `companyName === 'Otter'`.   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (5 of 39 padded ~12.8 %).     | must     |
| FR-14 | D-11 **omitted** — 0 of 39 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OTTER, name: 'Otter', category: 'company' })
@Injectable()
export class OtterService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Otter'` lock; D-10 trailing-
  pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #326):** Wire-shape variant 2 — canonical
  Greenhouse host (`https://job-boards.greenhouse.io/otter/jobs/<id>`).
  **Thirty-sixth** plugin in the cohort to use variant 2.
- **D-08 (run #326):** Decode-then-strip pipeline. **Seventy-
  second** cohort plugin to apply D-08.
- **D-09 (run #326):** **Omitted** — case-symmetric bare-brand
  wire `'Otter'` (5 bytes). **Sixty-third cohort plugin to
  omit D-09**.
- **D-10 (run #326):** **APPLIED with trailing-pad form.** 5
  of 39 wire titles padded (~12.8 % pad rate, all trailing-
  only). **Fortieth cohort plugin to apply D-10 — the cohort
  crosses the 40-plugin D-10-application threshold at this
  run.**
- **D-11 (run #326):** **Omitted** — 0 of 39 wire department
  names padded across 16 unique department names (`'ENG
  Beam'`, `'ENG Brick & Mortar'`, `'ENG Facility'`, `'ENG
  System of Record'`, `'Engineering Talent Network'`,
  `'Finance'`, `'Hardware Engineering'`, `'Otter - ENT'`,
  `'Otter - SMB'`, `'Otter Central Ops'`, `'PD Brick & Mortar'`,
  `'PM Brick & Mortar'`, plus 4 others — clean multi-token
  forms with internal whitespace, ampersands, and acronym
  prefixes). **Fifty-seventh cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #326):** **Zero structural deviations** from the
  Airtable (Spec 106) template — making this the **twentieth**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin.

## 11. References

- `packages/plugins/source-company-airtable/src/airtable.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-okta/src/okta.service.ts` —
  immediate predecessor (run #325).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
