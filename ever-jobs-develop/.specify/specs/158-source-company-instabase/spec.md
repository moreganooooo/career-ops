# Spec: 158 — Source Company Plugin: Instabase

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 158                                                                                                                                                                                            |
| Slug           | source-company-instabase                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #368)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..157                                                                                                                                                                        |

## 1. Problem Statement

Run #367's Spec 157 closed end-to-end (Indigo shipped — one
deviation off Lookout; 90-plugin D-11-omission threshold
crossed). Run #368 picks up the **seventh** live hit
alphabetically from the tenth-fresh-sweep candidate pool:
**Instabase** (12 visible roles confirmed at run-368 start —
matches the tenth-sweep estimate exactly, 1× match).

Instabase, Inc. — operator of the **AI-powered intelligent-
document-processing (IDP) and unstructured-data-automation
platform** (founded by Anant Bhardwaj in 2015 in San
Francisco, CA; private since the 2023 Series D round at
~$2B unicorn valuation; ships Instabase AI Hub (LLM-powered
document understanding), Document Pro (extraction +
classification), and Workflow Orchestrator across the
intelligent-document-processing / generative-AI-document /
banking-back-office vertical — alongside competitors UiPath
Document Understanding, ABBYY, Hyperscience, and Microsoft
Syntex — with a hybrid distributed workforce concentrated
across San Francisco (HQ), New York, Bangalore, and Remote
across the United States, Europe, and APAC) — is published
at the bare `instabase` Greenhouse slug (case-symmetric with
the wire `company_name === 'Instabase'`).

## 2. Goals

- Ship a `source-company-instabase` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-melio` plugin — Melio is the closest
  cohort cousin sharing all five primary axes: D-04 variant
  2 + D-08 + D-09 case-symmetric + D-10 applied + D-11
  applied (trailing-pad form).
- **Zero structural deviations.** Forty-second Greenhouse-
  only company-direct plugin in run history to ship as a
  clean re-spin.
- **Notable D-10 sub-axis observation**: 7th cohort observation
  of leading-pad sub-axis after Chainguard / Oscar / Celonis
  / Formlabs / GoFundMe / BitGo — `' Account Executive, NYC'`
  carries leading single-space pad.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Instabase postings.
- Instabase product-API / AI Hub / Document Pro integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.INSTABASE`** in
> the source registry, so that **a single `siteType:
> [Site.INSTABASE]` request returns Instabase's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.INSTABASE = 'instabase'` to the `Site` enum.                                                                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-instabase`.                                                                | must     |
| FR-3  | `InstabaseService.scrape(input)` returns a `JobResponseDto`; never throws.                                               | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `instabase-`, `site === Site.INSTABASE`, `companyName === 'Instabase'`.               | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                     | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers mixed pad form (2 of 12 padded ~16.7 % — 1 leading + 1 trailing).               | must     |
| FR-14 | D-11 **applied** — dept `.trim()` covers trailing-pad sub-axis (2 of 8 unique dept names padded — `'Finance/Accounting '`, `'Recruiting '`). | must |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.INSTABASE, name: 'Instabase', category: 'company' })
@Injectable()
export class InstabaseService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Instabase'` lock; D-10
  trailing-pad title-trim lock + leading-pad title-trim lock;
  D-11 trailing-pad dept-trim lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #368):** Wire-shape variant 2 (canonical
  Greenhouse host). **Sixty-fourth** plugin in the cohort to
  use variant 2.
- **D-08 (run #368):** Decode-then-strip pipeline. **One-
  hundred-and-fourteenth** cohort plugin to apply D-08.
- **D-09 (run #368):** **Omitted** — case-symmetric bare-brand
  wire `'Instabase'` (9 bytes; case-symmetric vs slug
  `instabase` after casefold). 0 of 12 padded. **One-hundred-
  and-fifth cohort plugin to omit D-09**.
- **D-10 (run #368):** **APPLIED with mixed pad form +
  seventh-cohort leading-pad observation.** 2 of 12 wire
  titles padded (~16.7 % pad rate) — 1 trailing-pad
  (`'Senior Technical Recruiter '`) + **1 leading-pad**
  (`' Account Executive, NYC'`; **7th cohort observation of
  leading-pad sub-axis** after Chainguard / Oscar / Celonis
  / Formlabs / GoFundMe / BitGo). **Seventy-first cohort
  plugin to apply D-10**.
- **D-11 (run #368):** **APPLIED with trailing-pad form.** 2
  of 8 unique wire department names padded
  (`'Finance/Accounting '`, `'Recruiting '`); listing-level
  pad rate 2 of 12 (~16.7 %). The plugin applies `.trim()`
  to the wire `departments[0].name` byte-for-byte before
  downstream emit. **Eighteenth cohort plugin to apply D-11**.
- **D-13 (run #368):** **Zero structural deviations** from
  the Melio (Spec 130) template — making this the **forty-
  second** Greenhouse-only company-direct plugin in run-
  history to ship as a clean re-spin.

## 11. References

- `packages/plugins/source-company-melio/src/melio.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin).
- `packages/plugins/source-company-bitgo/src/bitgo.service.ts` —
  prior leading-pad D-10 sub-axis observation.
- `packages/plugins/source-company-indigo/src/indigo.service.ts` —
  immediate predecessor (run #367).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
