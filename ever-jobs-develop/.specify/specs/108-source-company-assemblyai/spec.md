# Spec: 108 — Source Company Plugin: AssemblyAI

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 108                                                                                                                                                                                            |
| Slug           | source-company-assemblyai                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #318)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..107                                                                                                                                                                        |

## 1. Problem Statement

Run #317's Spec 107 closed end-to-end (Amplitude shipped). Run
#318 picks up the **third** live hit alphabetically from the
seventh-fresh-sweep candidate pool: **AssemblyAI** (7 roles
confirmed at run-318 start).

AssemblyAI, Inc. — operator of the **dominant developer-API
speech-to-text + speech-AI platform pioneered around the
Universal-2 / Universal Streaming low-latency transcription
data model** (founded by Dylan Fox in 2017 in San Francisco;
raised ~$165M across rounds at peak ~$700M valuation in October
2024 led by Insight Partners; ships speech-to-text, audio
intelligence, and the Lemur LLM-on-audio framework) — is
published at the bare `assemblyai` Greenhouse slug.

## 2. Goals

- Ship a `source-company-assemblyai` plugin returning live
  `JobPostDto` rows.
- Match `source-company-stockx` template (single deviation:
  D-10 application).

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ASSEMBLYAI`** in
> the source registry.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ASSEMBLYAI = 'assemblyai'` to the `Site` enum.                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-assemblyai`.                                        | must     |
| FR-3  | `AssemblyAIService.scrape(input)` returns a `JobResponseDto`; never throws.                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and `jest.config.js` mapper entry.                 | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `assemblyai-`, `site === Site.ASSEMBLYAI`, `companyName === 'AssemblyAI'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — 1 of 7 wire titles padded.                                                    | must     |
| FR-14 | D-11 **applied** — 3 of 7 wire department names padded.                                           | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ASSEMBLYAI, name: 'AssemblyAI', category: 'company' })
@Injectable()
export class AssemblyAIService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

## 8. Test Plan

≥ 8 cases. Happy-path test asserts variant-2 URL + D-09 THREE-
cap PascalCase wire pin (`'AssemblyAI'`, caps at 0/8/9) + D-10
trailing-pad title trim + D-11 trailing-pad dept trim.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #318):** Wire-shape variant 2. **Thirty-third**
  plugin to use variant 2.
- **D-08 (run #318):** Decode-then-strip pipeline. **Sixty-
  fourth** cohort plugin.
- **D-09 (run #318):** **Omitted with FIRST-COHORT PascalCase
  THREE-cap same-byte-count case-asymmetry** — wire
  `'AssemblyAI'` (10 bytes; caps at indices 0, 8, 9). Distinct
  from prior TWO-cap forms (SoFi 0/2, StockX 0/5, xAI 1/2).
  **Fifty-fifth cohort plugin to omit D-09**.
- **D-10 (run #318):** **Applied** — 1 of 7 wire titles padded
  (~14 % pad rate). **Thirty-second cohort plugin to apply D-10**.
- **D-11 (run #318):** **Applied with high-pad-rate trailing-
  pad form** — 3 of 7 listings carry `departments[0].name`
  records padded with single-trailing-ASCII-space form
  (`'Customer Experience '`, `'Product Marketing '`, `'Research '`).
  **~43 % listing-level pad rate — the highest D-11 pad-rate
  observed** in the cohort to date (BILL was prior high at
  ~39.1 %). **Eighth cohort plugin to apply D-11**. **First
  cohort variant-2 plugin to apply BOTH D-10 and D-11
  simultaneously**.
- **D-13 (run #318):** **One structural deviation** from the
  StockX (Spec 103) template — D-10 application (StockX
  omitted; AssemblyAI applies).

## 11. References

- `packages/plugins/source-company-stockx/src/stockx.service.ts` —
  closest cousin (D-09 + D-11 axes shared).
- `packages/plugins/source-company-amplitude/src/amplitude.service.ts` —
  immediate predecessor in run-history (run #317).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
