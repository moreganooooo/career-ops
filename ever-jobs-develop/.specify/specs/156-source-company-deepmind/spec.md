# Spec: 156 — Source Company Plugin: DeepMind

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 156                                                                                                                                                                                            |
| Slug           | source-company-deepmind                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #366)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..155                                                                                                                                                                        |

## 1. Problem Statement

Run #365's Spec 155 closed end-to-end (Collective Health
shipped — first cohort observation of variant 42 `jobs.`
subdomain prefix; 9th internal-whitespace D-09 case). Run
#366 picks up the **fifth** live hit alphabetically from the
tenth-fresh-sweep candidate pool: **DeepMind** (73 visible
roles confirmed at run-366 start — matches the tenth-sweep
estimate exactly, 1× match).

Google DeepMind — operator of the **leading frontier-AI
research lab pioneered around the deep-reinforcement-learning
+ LLM-research data model** (founded by Demis Hassabis,
Shane Legg, and Mustafa Suleyman in 2010 in London, UK;
acquired by Google in 2014 for ~$500M; merged with Google
Brain in 2023 to form the consolidated Google DeepMind
research org; ships Gemini (frontier multimodal LLM family),
AlphaFold (protein-folding), AlphaGo (board-game RL),
AlphaCode (code-generation), and Gemini Robotics across the
frontier-AI / foundation-model / AI-research vertical —
alongside competitors Anthropic, OpenAI, and Meta AI — with
a hybrid distributed workforce concentrated across London
(HQ), Mountain View, Zürich, Paris, and Remote across the
United Kingdom, the United States, and Europe) — is published
at the bare `deepmind` Greenhouse slug (case-asymmetric vs
the wire `company_name === 'DeepMind'` PascalCase concat —
same byte-count (8 bytes) but byte-distinct via case at TWO
indices: 0 (`D` vs `d`) and 4 (`M` vs `m`)).

## 2. Goals

- Ship a `source-company-deepmind` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-assemblyai` plugin — AssemblyAI is the
  closest cohort cousin sharing four primary axes: D-04
  variant 2 + D-08 + D-10 applied + D-11 applied.
- **One structural deviation** from AssemblyAI: D-09 sub-axis
  (AssemblyAI THREE-cap PascalCase consecutive-at-tail caps
  0/8/9 forming embedded acronym `AI` → DeepMind TWO-cap
  PascalCase non-consecutive caps 0/4 marking the segment
  boundary of `Deep | Mind`).
- **Notable D-09 sub-axis observation**: 9th cohort plugin
  with TWO-cap PascalCase D-09 sub-axis. Caps positions
  (0/4) are **NEW caps-at-0/4 sub-pattern** — distinct from
  prior caps-at-0/2 (SoFi/xAI/GoCardless), 0/3 (BitGo), 0/5
  (StockX/PagerDuty), and 0/6 (LaunchDarkly/ComplyAdvantage)
  sub-patterns.
- **First cohort observation** of TWO-cap PascalCase plugin
  with **both D-10 and D-11 applied** — all prior TWO-cap
  PascalCase plugins applied at most one of D-10 / D-11.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical DeepMind postings.
- DeepMind product-API / Gemini / AlphaFold / AlphaCode
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DEEPMIND`** in
> the source registry, so that **a single `siteType:
> [Site.DEEPMIND]` request returns DeepMind's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.DEEPMIND = 'deepmind'` to the `Site` enum.                                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-deepmind`.                                                                 | must     |
| FR-3  | `DeepmindService.scrape(input)` returns a `JobResponseDto`; never throws.                                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `deepmind-`, `site === Site.DEEPMIND`, `companyName === 'DeepMind'`.                  | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (9 of 73 padded ~12.3 %).                                 | must     |
| FR-14 | D-11 **applied** — dept `.trim()` covers trailing-pad sub-axis (1 of 5 unique dept names padded — `'Frontier AI '`).      | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DEEPMIND, name: 'DeepMind', category: 'company' })
@Injectable()
export class DeepmindService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 TWO-cap PascalCase case-asymmetric wire
  pin** (`'DeepMind'` 8 bytes; caps at 0/4 — NEW caps-at-0/4
  sub-pattern); D-10 trailing-pad title-trim lock; **D-11
  trailing-pad dept-trim lock** (`'Frontier AI '` →
  `'Frontier AI'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #366):** Wire-shape variant 2 (canonical
  Greenhouse host). **Sixty-second** plugin in the cohort to
  use variant 2.
- **D-08 (run #366):** Decode-then-strip pipeline. **One-
  hundred-and-twelfth** cohort plugin to apply D-08.
- **D-09 (run #366):** **Omitted** with TWO-cap PascalCase
  case-asymmetric wire form. Wire `company_name ===
  'DeepMind'` byte-for-byte (8 bytes; case-asymmetric vs slug
  `deepmind` at TWO byte indices: 0 (`D` vs `d`) and 4 (`M`
  vs `m`)). **9th cohort plugin with TWO-cap PascalCase
  D-09 sub-axis** after SoFi (caps 0/2), StockX (caps 0/5),
  xAI (caps 0/2 lowercase first), LaunchDarkly (caps 0/6),
  PagerDuty (caps 0/5), ComplyAdvantage (caps 0/6),
  GoCardless (caps 0/2), and BitGo (caps 0/3). **NEW caps-
  at-0/4 sub-pattern** — caps mark the segment boundary of
  `Deep | Mind`. **One-hundred-and-third cohort plugin to
  omit D-09**.
- **D-10 (run #366):** **APPLIED with trailing-pad form.** 9
  of 73 wire titles padded with single-trailing-ASCII-space
  form (~12.3 % pad rate, all trailing-only — `'Program
  Manager, AI Infrastructure Operations, 12 Months FTC '`,
  `'Research Engineer, Applied AI '`, `'Security Lead,
  Agentic Red Team '`, plus 6 others). **Seventieth cohort
  plugin to apply D-10 — the cohort crosses the 70-plugin
  D-10-application threshold at this run.**
- **D-11 (run #366):** **APPLIED with trailing-pad form.** 1
  of 5 unique wire department names padded (`'Frontier AI '`);
  listing-level pad rate 14 of 73 (~19.2 %). The plugin
  applies `.trim()` to the wire `departments[0].name` byte-
  for-byte before downstream emit. **Seventeenth cohort
  plugin to apply D-11**.
- **D-13 (run #366):** **One structural deviation** from the
  AssemblyAI (Spec 108) template — D-09 sub-axis (consecutive-
  at-tail acronym caps `AI` → non-consecutive segment-boundary
  caps `Deep | Mind`). **First cohort observation** of TWO-
  cap PascalCase plugin with **both D-10 and D-11 applied**
  — all prior TWO-cap PascalCase plugins applied at most one
  of D-10 / D-11.

## 11. References

- `packages/plugins/source-company-assemblyai/src/assemblyai.service.ts` —
  closest cohort cousin (one-deviation D-09 sub-axis).
- `packages/plugins/source-company-bitgo/src/bitgo.service.ts` —
  prior TWO-cap PascalCase plugin with NEW caps-position
  observation.
- `packages/plugins/source-company-collectivehealth/src/collectivehealth.service.ts` —
  immediate predecessor (run #365).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
