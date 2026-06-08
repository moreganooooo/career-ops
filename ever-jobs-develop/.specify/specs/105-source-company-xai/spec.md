# Spec: 105 — Source Company Plugin: xAI

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 105                                                                                                                                                                                            |
| Slug           | source-company-xai                                                                                                                                                                             |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #315)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..104                                                                                                                                                                        |

## 1. Problem Statement

Run #314's Spec 104 closed end-to-end (sweetgreen shipped —
variant 29 inaugurated, first cohort observation of leading-
whitespace D-09 application). Run #315 picks up the
**sixteenth** live hit alphabetically from the sixth-fresh-
sweep candidate pool: **xAI** (249 visible roles confirmed at
run-315 start via direct HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/xai/jobs?content=true`;
the run-300 sixth-sweep estimate of ~498 keys was probe-
counter-inflated by ~2× via dept/office IDs).

X.AI Corp. (xAI) — operator of the **dominant frontier-AI-
research platform pioneered around the truth-seeking-AI / Grok
LLM / Colossus supercluster data model** (founded by Elon Musk
in March 2023 in Palo Alto, CA, with a founding research team
of ~12 ex-DeepMind / OpenAI / Google / Microsoft / Tesla AI
researchers including Igor Babuschkin and Tony Wu; raised
~$12B+ across rounds at peak ~$50B valuation in November 2024
led by Sequoia Capital, Andreessen Horowitz, and Valor Equity
Partners; ships the Grok family of LLMs (Grok-1, Grok-2,
Grok-3, Grok-4) integrated into the X (formerly Twitter)
platform under the X Premium subscription; operates the
Colossus supercluster — initially 100,000 H100 GPUs, scaled to
200,000+ as of 2026 — the largest known dedicated AI training
facility globally as of public reporting; ships frontier
foundation models, the Grok consumer chatbot, the Grok Code
Fast coding assistant, image generation (Aurora), and
specialized research lines across the frontier-AI-research
segment — alongside competitors OpenAI, Anthropic, Google
DeepMind, Meta AI, Mistral, and Cohere — with a hybrid
distributed workforce concentrated across Palo Alto (HQ),
Austin (Memphis Colossus supercluster), San Francisco, London,
and Remote across the United States and the United Kingdom)
— is published at the bare `xai` Greenhouse slug (the
lowercase 3-byte brand-stem; case-asymmetric with the wire
`company_name === 'xAI'` — slug 3 bytes lowercase / wire 3
bytes mixed-case with **lowercase first letter** + uppercase
`AI` suffix; **first cohort observation of LOWERCASE-FIRST
PascalCase wire form** under D-09 — distinct from prior case-
asymmetric same-byte-count peers DataCamp / HelloFresh / N26 /
PlanetScale / SoFi / StockX which all start with uppercase)
and was confirmed live via run #315's HTTP 200 probe.

## 2. Goals

- Ship a `source-company-xai` plugin returning live
  `JobPostDto` rows for the public xAI careers board.
- Match the structural and behavioural shape of the existing
  `source-company-cerebral` plugin — Cerebral is the closest
  cohort cousin via shared D-04 variant 2, D-08 entity-decode-
  then-tag-strip, D-10 trailing-pad applied, and D-11 fully-
  clean department pass-through. **One structural deviation**
  from Cerebral:
  1. **D-09 sub-axis** — xAI's wire `'xAI'` is case-asymmetric
     mixed-case 3-byte with **lowercase first letter** +
     uppercase `AI` suffix (first cohort observation of
     lowercase-first PascalCase wire form); Cerebral's wire
     `'Cerebral'` is case-symmetric (lowercased equals slug).
- Bundle a unit-test suite (≥ 8 cases) including locks for
  variant-2 URL pass-through, the lowercase-first case-
  asymmetric 3-byte wire `'xAI'`, and the D-10 trailing-pad
  sub-axis.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical xAI postings.
- xAI product-API / Grok / Colossus / X-platform integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.XAI`** in
> the source registry, so that **a single `siteType:
> [Site.XAI]` request returns xAI's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.XAI = 'xai'` to the `Site` enum.                                                        | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-xai`.                                               | must     |
| FR-3  | `XaiService.scrape(input)` returns a `JobResponseDto`; never throws.                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `xai-`, `site === Site.XAI`, `companyName === 'xAI'`.         | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2). Fallback uses canonical Greenhouse variant-2. | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (18 of 249 padded).           | must     |
| FR-14 | D-11 **omitted** — 0 of 249 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.XAI, name: 'xAI', category: 'company' })
@Injectable()
export class XaiService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts:
  - **D-04 variant-2 lock**: emitted `jobUrl` contains
    `job-boards.greenhouse.io/xai/jobs/`; does NOT contain
    `xai.com` or `x.ai` (anti-substring locks).
  - **D-09 omission lock with first-cohort lowercase-first
    PascalCase wire**: emitted `companyName === 'xAI'` byte-
    for-byte (3 bytes); starts with lowercase `x` at byte
    index 0; contains uppercase `AI` at byte indices 1-2;
    `'xAI'.toLowerCase() === 'xai'` (matches the slug under
    casefold).
  - **D-10 application lock with trailing-pad sub-axis**:
    input title `'Accounting Expert - Technical Accounting '`
    (trailing space) → emitted `'Accounting Expert -
    Technical Accounting'` (byte-distinct + 1-byte-shorter).
  - D-08 regression locks (entity-decode + tag-strip + brand
    substring presence).
  - D-11 pass-through behaviour: wire `departments[0].name`
    flows through byte-for-byte (e.g. `'Vision'`).
- Plus standard cohort cases: `resultsWanted=1` cap, searchTerm
  filter on title, searchTerm filter on department, HTTP 500 →
  empty, empty `data.jobs` → empty.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #315):** **Wire-shape variant 2 — canonical
  Greenhouse host** `https://job-boards.greenhouse.io/xai/jobs/<id>`.
  **Thirtieth** plugin in the cohort to use variant 2.
- **D-08 (run #315):** Decode-then-strip pipeline. **Sixty-
  first** cohort plugin to apply D-08.
- **D-09 (run #315):** **Omitted** — wire `company_name ===
  'xAI'` byte-for-byte (3 bytes; case-asymmetric with the
  lowercase 3-byte slug `xai` — same byte-count, **lowercase
  first letter** at byte index 0 + uppercase `AI` at byte
  indices 1-2). **First cohort observation of LOWERCASE-
  FIRST PascalCase wire form** under D-09 — distinct from
  prior case-asymmetric same-byte-count peers DataCamp /
  HelloFresh / N26 / PlanetScale / SoFi / StockX which all
  start with an uppercase letter. **Fifty-third cohort plugin
  to omit D-09**.
- **D-10 (run #315):** **APPLIED with trailing-pad form.** 18
  of 249 wire titles in the run-315 probe carry single-
  trailing-ASCII-space padding (`'Accounting Expert -
  Technical Accounting '`, `'AI Healthcare and Administration
  Tutor  '`, `'Construction Manager (Electrical) '`,
  `'Construction Manager (Mechanical) '`, `'Construction
  Manager (Structural) '`, plus 13 others; ~7.2 % pad rate,
  all trailing-only). **Twenty-ninth cohort plugin to apply
  D-10**.
- **D-11 (run #315):** **Omitted** — 0 of 249 wire department
  names padded across 24 unique department names (`'Vision'`,
  `'Financial'`, `'Human Data'`, `'Software Engineering'`,
  `'Information Security'`, `'STEM'`, `'Infrastructure'`,
  `'Engineering'`, `'Product'`, `'Sales'`, `'Legal'`, `'Data
  Center'`, plus 12 others — clean single-token / multi-token
  forms with internal whitespace). **Forty-sixth cohort
  plugin** with fully-clean department pass-through.
- **D-13 (run #315):** **One structural deviation** from the
  Cerebral (Spec 094) template: D-09 sub-axis (Cerebral case-
  symmetric `'Cerebral'`; xAI lowercase-first case-asymmetric
  `'xAI'` — first cohort observation of lowercase-first
  PascalCase wire form).

## 11. References

- `packages/plugins/source-company-cerebral/src/cerebral.service.ts` —
  closest cohort cousin (variant 2 + D-10 trailing-pad
  applied + D-11 clean).
- `packages/plugins/source-company-sweetgreen/src/sweetgreen.service.ts` —
  immediate predecessor in run-history (run #314).
- `packages/plugins/source-company-stockx/src/stockx.service.ts` —
  case-asymmetric same-byte-count D-09 reference.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
