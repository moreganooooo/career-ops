# Spec: 146 — Source Company Plugin: Fairmarkit

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 146                                                                                                                                                                                            |
| Slug           | source-company-fairmarkit                                                                                                                                                                      |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #356)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..145                                                                                                                                                                        |

## 1. Problem Statement

Run #355's Spec 145 closed end-to-end (ExpressVPN shipped —
first cohort observation of FOUR-cap PascalCase D-09 sub-axis
+ second cohort observation of mojibake-NBSP D-10 sub-axis).
Run #356 picks up the **twelfth** live hit alphabetically
from the ninth-fresh-sweep candidate pool: **Fairmarkit** (12
visible roles confirmed at run-356 start — ninth-sweep
estimate ~12, **1× exact match** — fifth 1× match in the
ninth-sweep after BEAM, BigID, ComplyAdvantage, and Conviva).

Fairmarkit, Inc. — operator of the **AI-driven autonomous
sourcing / tail-spend procurement platform pioneered around
the long-tail-spend e-procurement data model** (founded by
Kevin Frechette and Tarek Alaruri in 2017 in Boston, MA;
private since the 2022 Series C round at ~$700M valuation;
ships Fairmarkit KOJO (autonomous sourcing), RFx Studio (RFP
/ RFQ orchestration), and Tail Spend Engine across the
e-procurement / strategic-sourcing / tail-spend-management
vertical — alongside competitors Coupa, GEP SMART, Ivalua,
and Workday Strategic Sourcing — with a hybrid distributed
workforce concentrated across Boston (HQ), London, and
Remote across the United States, Europe, and APAC) — is
published at the bare `fairmarkit` Greenhouse slug (case-
symmetric with the wire `company_name === 'Fairmarkit'`
after casefold).

## 2. Goals

- Ship a `source-company-fairmarkit` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-melio` plugin — Melio is the closest cohort
  cousin sharing all five primary axes: D-04 variant 2 +
  D-08 + D-09 case-symmetric + D-10 applied + D-11 applied
  (trailing-pad form).
- **Zero structural deviations.** Thirty-seventh Greenhouse-
  only company-direct plugin in run history to ship as a
  clean re-spin.
- **Notable D-10 sub-axis observation**: 1 of the 5 padded
  titles carries a **leading mojibake-encoded Cyrillic Es
  character** (`c3 90 c2 a1` byte sequence — wire-side
  double-UTF-8-encoded U+0421 Cyrillic Capital Es `С`,
  homograph of Latin `C`). **First cohort observation of
  mojibake-Cyrillic-Es pad form** — distinct from prior
  mojibake-NBSP form (Bloomreach Spec 139, ExpressVPN Spec
  145) which targets U+00A0 NBSP. JavaScript `.trim()` does
  NOT consider U+00D0 (`Ð`) or U+00A1 (`¡`) as whitespace,
  so the leading mojibake pair is preserved by-design;
  trim only strips the trailing ASCII-space pad. Wire-
  faithful pass-through.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Fairmarkit postings.
- Fairmarkit product-API / KOJO / RFx Studio integration.
- Downstream normalisation of Cyrillic homograph residual
  bytes.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FAIRMARKIT`** in
> the source registry, so that **a single `siteType:
> [Site.FAIRMARKIT]` request returns Fairmarkit's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.FAIRMARKIT = 'fairmarkit'` to the `Site` enum.                                                                 | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-fairmarkit`.                                                               | must     |
| FR-3  | `FairmarkitService.scrape(input)` returns a `JobResponseDto`; never throws.                                              | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `fairmarkit-`, `site === Site.FAIRMARKIT`, `companyName === 'Fairmarkit'`.            | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis incl. wire-leading-mojibake-Cyrillic-Es residue (5 of 12 padded ~41.7 %). | must |
| FR-14 | D-11 **applied** — dept `.trim()` covers trailing-pad sub-axis (2 of 7 unique dept names padded — `'Customer Success - Services '`, `'International Operations '`). | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FAIRMARKIT, name: 'Fairmarkit', category: 'company' })
@Injectable()
export class FairmarkitService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Fairmarkit'` lock; D-10
  trailing-pad title-trim lock incl. **first-cohort mojibake-
  Cyrillic-Es leading-residue observation** (`'Ð¡ore Software
  Architect '` → `'Ð¡ore Software Architect'` — `.trim()`
  strips trailing ASCII space, leading mojibake pair `c3 90
  c2 a1` preserved by-design); D-11 trailing-pad dept-trim
  lock (`'International Operations '` → `'International
  Operations'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #356):** Wire-shape variant 2 (canonical
  Greenhouse host). **Fifty-sixth** plugin in the cohort to
  use variant 2.
- **D-08 (run #356):** Decode-then-strip pipeline. **One-
  hundred-and-second** cohort plugin to apply D-08.
- **D-09 (run #356):** **Omitted** — case-symmetric bare-brand
  wire `'Fairmarkit'` (10 bytes; case-symmetric vs slug
  `fairmarkit` after casefold). 0 of 12 padded. **Ninety-third
  cohort plugin to omit D-09**.
- **D-10 (run #356):** **APPLIED with trailing-pad form +
  FIRST-COHORT mojibake-Cyrillic-Es leading-residue
  observation.** 5 of 12 wire titles padded (~41.7 % pad
  rate, all trailing-only — `'Senior Field Marketing Manager '`,
  `'Senior Frontend Engineer '`, `'Senior Software Engineer '`,
  `'Technical Architect '`, `'Сore Software Architect '`).
  **First cohort observation of leading mojibake-Cyrillic-Es
  residue** — the title `'Сore Software Architect '` carries
  the byte sequence `c3 90 c2 a1` at the head (wire-side
  double-UTF-8-encoded U+0421 Cyrillic Capital Es `С`,
  visual homograph of Latin `C`). Distinct from prior
  mojibake-NBSP form (Bloomreach Spec 139, ExpressVPN Spec
  145) which targets the trailing position. JavaScript
  `.trim()` does NOT consider U+00D0 (`Ð`) or U+00A1 (`¡`)
  as whitespace, so the leading mojibake pair is preserved
  by-design; trim only strips the trailing ASCII-space pad.
  Wire-faithful pass-through. **Sixty-third cohort plugin to
  apply D-10**.
- **D-11 (run #356):** **APPLIED with trailing-pad form.** 2
  of 7 unique wire department names padded (`'Customer
  Success - Services '`, `'International Operations '`);
  listing-level pad rate 2 of 12 (~16.7 %). The plugin
  applies `.trim()` to the wire `departments[0].name` byte-
  for-byte before downstream emit. **Fifteenth cohort plugin
  to apply D-11**.
- **D-13 (run #356):** **Zero structural deviations** from the
  Melio (Spec 130) template — making this the **thirty-
  seventh** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin. (The first-cohort
  mojibake-Cyrillic-Es leading-residue sub-axis is captured
  as an observability note — `.trim()` is byte-count agnostic
  and doesn't strip non-whitespace bytes, so no axis change
  is required.)

## 11. References

- `packages/plugins/source-company-melio/src/melio.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-bloomreach/src/bloomreach.service.ts` —
  prior cohort observation of mojibake-NBSP D-10 sub-axis.
- `packages/plugins/source-company-expressvpn/src/expressvpn.service.ts` —
  immediate predecessor (run #355).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
