# Spec: 181 — Source Company Plugin: ACP

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 181                                                                                                                                                                                            |
| Slug           | source-company-acp                                                                                                                                                                             |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #391)                                                                                                                                                                              |
| Created        | 2026-05-20                                                                                                                                                                                     |
| Last updated   | 2026-05-20                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..180                                                                                                                                                                        |

## 1. Problem Statement

Run #390's Spec 180 closed end-to-end (aCommerce shipped —
sixth plugin in the eleventh fresh probe sweep; first cohort
observation of (a) single-token camelCase classical wire form
AND (b) cap-at-byte-1-only D-09 sub-pattern). Run #391 is the
**seventh** plugin in the eleventh fresh probe sweep with a
freshly-sampled candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 004 verified Greenhouse tenants on `71d9a56`).

The eleventh-sweep alphabetical continuation after aCommerce
yielded the next viable live-board hit at **ACP** (Academy
with Community Partners — 3 visible roles confirmed at run-391
start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acp/jobs?content=true`).

Academy with Community Partners — operator of an Arizona-based
charter-school network serving at-risk and homeless youth
through alternative-curriculum high-school and special-
education programs (founded in 2004 by educators serving the
greater Phoenix metropolitan area; Arizona Online Instruction
charter-school network; serves 9th–12th-grade students across
multiple greater-Phoenix campuses with a hybrid in-person /
distance-learning curriculum centred on small-cohort
instruction, special-education accommodations, and alternative-
schedule diploma pathways) — publishes its consolidated
careers board through Greenhouse at the bare slug `acp` (wire
`company_name === 'Academy with Community Partners'` — see
§ 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'Academy with Community Partners'` is the
**second cohort observation of the acronym-by-initials D-09
sub-pattern** (first observation at ACOG, Spec 179, run #389)
— slug derived by sampling the first letter of each
PascalCase wire-token in order, skipping all-lowercase
connector tokens, and lowercasing the result. Wire is 31
bytes split into **4 wire-tokens** by ASCII spaces:

- `Academy` (7-byte PascalCase, cap at byte 0 only)
- `with` (4-byte all-lowercase connector)
- `Community` (9-byte PascalCase, cap at byte 0 only)
- `Partners` (8-byte PascalCase, cap at byte 0 only)

Slug is 3-byte lowercase `acp` — formed by sampling the
first letter of each PascalCase wire-token (A from Academy,
C from Community, P from Partners), skipping the 1 lowercase-
connector token (`with`), and lowercasing the result. **4
wire-tokens reduced to 3 contributing first-letters; 1
lowercase-connector token skipped.** **Second cohort
observation of acronym-by-initials slug derivation with
connector-skip** — validates the ACOG sub-pattern at a lower-
cardinality wire-form (3 PascalCase + 1 connector vs ACOG's
4 PascalCase + 2 connectors). Confirms the sub-pattern is
**not a one-off** observation but a recurring D-09
transformation pattern.

**Wire-form D-10 observation:** **0 of 3 listings carry
trailing ASCII-space padding** in the wire `title` field —
all titles flow through byte-for-byte clean (`'9-12th Grade
Science Teacher'`, `'Special Education Teacher'`, `'Special
Education Teacher (Part-time)'`). The plugin omits D-10 —
emits wire `title` byte-for-byte without `.trim()` overlay.

**Wire-form D-11 observation:** **0 of 2 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean (`'High
School Teaching'`, `'Special Education'`). The plugin omits
D-11 — wire `departments[0].name` flows through byte-for-byte
without `.trim()` overlay.

## 2. Goals

- Ship a `source-company-acp` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-acog` plugin (closest cohort cousin with
  the **variant-2 + D-08 + acronym-by-initials D-09** profile)
  but with **two structural deviations**:
  1. **D-10 sub-axis:** ACOG's "trailing-pad applied (1 of 6
     wire titles padded ~16.7 %)" → **omitted (clean pass-
     through)** (0 of 3 wire titles padded — defensive
     `.trim()` safe no-op).
  2. **D-09 sub-axis (cardinality variant):** ACOG's 4
     PascalCase + 2 connectors (`'American College of
     Obstetricians and Gynecologists'` 51 bytes → 4-byte
     slug `acog`) → **3 PascalCase + 1 connector**
     (`'Academy with Community Partners'` 31 bytes → 3-byte
     slug `acp`). The **second cohort observation** of the
     acronym-by-initials D-09 sub-pattern with connector-skip.
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  acronym-by-initials lock case beyond the standard 7-case
  cohort baseline; D-10 clean-pass-through title lock; D-11
  clean-pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ACP postings.
- Other Arizona Online Instruction (AOI) charter-school
  network operators (Academy with Community Partners scrapes
  the consolidated `acp` board only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACP`** in the
> source registry, so that **a single `siteType: [Site.ACP]`
> request returns ACP's open Arizona charter-school roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACP = 'acp'` to the `Site` enum.                                                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acp`.                                                                                | must     |
| FR-3  | `AcpService.scrape(input)` returns a `JobResponseDto`; never throws.                                                               | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acp-`, `site === Site.ACP`.                                                                   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **omitted (clean pass-through)** — 0 of 3 wire titles padded in run-391 probe; emit byte-for-byte without `.trim()`.          | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 2 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACP, name: 'ACP', category: 'company' })
@Injectable()
export class AcpService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acp/jobs/<id>`); **D-09 acronym-
  by-initials wire pin** (`'Academy with Community Partners'`
  31 bytes; 4 wire-tokens split by ASCII spaces; 3 PascalCase
  + 1 lowercase-connector; slug `acp` formed by sampling
  first letter of each PascalCase token, lowercased, with the
  1 lowercase-connector token skipped); **D-10 clean-pass-
  through title lock** (every emitted `title` byte-equals
  wire `title`); **D-11 clean-pass-through dept lock** (every
  emitted `department` byte-equals wire `departments[0].name`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #391):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Eightieth** plugin in the cohort to use variant 2.
- **D-08 (run #391):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-seventh** cohort plugin to apply D-08.
- **D-09 (run #391):** **Omitted at runtime** — wire
  `company_name === 'Academy with Community Partners'` flows
  through byte-for-byte. **Acronym-by-initials slug-
  derivation sub-pattern (second cohort observation)** —
  slug `acp` formed by sampling first letter of each
  PascalCase wire-token in order, skipping the lowercase-
  connector token, all lowercased.
  - Wire is 31 bytes split into 4 wire-tokens by ASCII
    spaces: `Academy` (7-byte PascalCase, cap at byte 0
    only), `with` (4-byte all-lowercase connector),
    `Community` (9-byte PascalCase, cap at byte 0 only),
    `Partners` (8-byte PascalCase, cap at byte 0 only).
  - Slug is 3-byte lowercase `acp` — formed by sampling the
    first letter of each PascalCase wire-token (A from
    Academy, C from Community, P from Partners), skipping
    the 1 all-lowercase connector token (`with`), and
    lowercasing the result.
  - **Second cohort observation of acronym-by-initials slug
    derivation with connector-skip** — validates the ACOG
    sub-pattern at a lower-cardinality wire-form (3
    PascalCase + 1 connector vs ACOG's 4 PascalCase + 2
    connectors).
  - **128th** cohort plugin to omit D-09 (127 → 128).
- **D-10 (run #391):** **Omitted (clean pass-through).** 0
  of 3 wire titles in the run-391 probe carry trailing
  ASCII-space padding. **42nd cohort plugin to omit D-10**.
- **D-11 (run #391):** **Omitted (clean pass-through).** 0
  of 2 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte.
  **108th cohort plugin with fully-clean department pass-
  through (D-11 omitted).**
- **D-13 (run #391):** **Two structural deviations** from
  the ACOG template — D-10 sub-axis (trailing-pad applied →
  omitted) AND D-09 sub-axis cardinality variant (4
  PascalCase + 2 connectors → 3 PascalCase + 1 connector;
  second cohort observation).

## 11. References

- `packages/plugins/source-company-acog/src/acog.service.ts` —
  first cohort observation of acronym-by-initials D-09 sub-
  pattern with connector-skip (closest D-09 cousin).
- `packages/plugins/source-company-acilearning/src/acilearning.service.ts` —
  prior variant-2 + D-08 + D-10-omitted + D-11-omitted cousin
  with a short slug.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
