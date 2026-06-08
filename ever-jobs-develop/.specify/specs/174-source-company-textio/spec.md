# Spec: 174 — Source Company Plugin: Textio

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 174                                                                                                                                                                                            |
| Slug           | source-company-textio                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #384)                                                                                                                                                                              |
| Created        | 2026-05-11                                                                                                                                                                                     |
| Last updated   | 2026-05-11                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..173                                                                                                                                                                        |

## 1. Problem Statement

Run #383's Spec 173 closed end-to-end (Tatari shipped — 74th
variant-2 plugin in the cohort; 120th D-09 omission; 79th
D-10 application with a rare repeated-title trailing-pad
pattern; 103rd cohort plugin with fully-clean department
pass-through; fifty-first near-clean re-spin in run history).
Run #384 picks up the **final remaining live hit**
alphabetically from the tenth-fresh-sweep candidate pool:
**Textio** (2 visible roles confirmed at run-384 start —
tenth-sweep estimate ~3; ~0.667× ratio, near-1× match. Tiny
board — short-cycle hiring posture).

Textio, Inc. (textio.com) — operator of the **dominant
augmented-writing-as-a-service platform pioneered around the
inclusive-language / job-posting-quality / performance-
feedback-tone scoring data model** (founded by Kieran Snyder,
Jensen Harris, and Kate Matsudaira in 2014 in Seattle,
Washington; raised a $20M Series C in February 2018 led by
Scale Venture Partners and Bloomberg Beta at peak ~$77M
post-money valuation; rebooted post the 2024 strategic-
restructure with an HR-language-AI focus; ships Textio Hire
(job-posting language scoring), Textio Flow (performance-
feedback bias-and-tone scoring), Textio Loop (employee-
communications language scoring), and the Textio Hire
Library (industry-tuned phrase reference corpus) across the
augmented-writing / HR-language-AI / inclusive-language
analytics segment — alongside competitors Grammarly, Writer,
Datapeople, Develop Diverse, and Ongig — with a fully-
distributed remote workforce concentrated across Seattle, WA
(HQ) and Remote across the United States, with hub presence
in NY / MA / IL / HI / TX / CO / CA / OR / WA / MD per the
General Application location) — publishes its consolidated
careers board through Greenhouse at the bare slug `textio`
(case-symmetric with the wire `company_name === 'Textio'`).

The wire `absolute_url` carries a previously-unobserved
shape: `https://www.textio.com/careers/apply/?job=<id>&gh_jid=<id>`
— HTTPS + `www.`-prefixed bare brand-domain `.com` + 2-
segment `/careers/apply/` apply-page path **with a trailing
slash** + **dual-id query** `?job=<id>&gh_jid=<id>` (the
listing id is repeated under two query keys — vendor-side
hand-off shim for the Textio careers-page front-end which
reads `job` while Greenhouse forwards `gh_jid`). **This is
the first cohort observation of a dual-id-query wire-shape**
and the **forty-ninth distinct wire-shape variant** in the
company-direct cohort (after Symphony variant 45 at Spec
172).

## 2. Goals

- Ship a `source-company-textio` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-recharge` plugin (Spec 167) — Recharge is
  the closest cohort cousin sharing **four** of the five
  primary axes (D-08 + D-09 case-symmetric + D-10 omitted +
  D-11 omitted).
- **One structural deviation** — D-04 sub-axis: variant 2
  (canonical Greenhouse host) → **NEW variant 46** (HTTPS +
  `www.`-prefixed bare brand-domain `.com` + 2-segment
  `/careers/apply/` apply-page path **with a trailing
  slash** + **dual-id query** `?job=<id>&gh_jid=<id>` —
  first cohort observation of a dual-id-query wire-shape;
  forty-ninth distinct wire-shape variant in the cohort).
  The plugin emits `listing.absolute_url` byte-for-byte; the
  fallback constructor (when the wire omits `absolute_url`)
  defaults to the canonical variant-2 Greenhouse form
  `https://job-boards.greenhouse.io/textio/jobs/<id>` (same
  fallback strategy as Symphony / Samsara / Klaviyo / Bird /
  Collective Health / Netskope).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Textio postings.
- Textio inclusive-language / augmented-writing API
  integration (the plugin is careers-board-only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.TEXTIO`** in
> the source registry, so that **a single `siteType:
> [Site.TEXTIO]` request returns Textio's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.TEXTIO = 'textio'` to the `Site` enum.                                                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-textio`.                                                                    | must     |
| FR-3  | `TextioService.scrape(input)` returns a `JobResponseDto`; never throws.                                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                         | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                              | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `textio-`, `site === Site.TEXTIO`, `companyName === 'Textio'`.                        | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                           | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                              | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                           | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                          | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                          | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (NEW variant 46 dual-id-query); fallback defaults to canonical variant-2 Greenhouse form when wire omits `absolute_url`. | must     |
| FR-13 | D-10 **omitted** — 0 of 2 wire titles padded; defensive `.trim()` applied as a safe no-op.                                | must     |
| FR-14 | D-11 **omitted** — 0 of 2 wire department names padded across 2 unique departments.                                       | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TEXTIO, name: 'Textio', category: 'company' })
@Injectable()
export class TextioService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **NEW variant-46 dual-
  id-query URL byte-for-byte lock**
  (`https://www.textio.com/careers/apply/?job=<id>&gh_jid=<id>`),
  **D-09 case-symmetric bare-brand wire pin** (`'Textio'` 6
  bytes; case-symmetric vs the lowercase 6-byte slug
  `textio`), D-10 clean title pass-through, D-11 clean dept
  pass-through; plus a variant-2 fallback case asserting the
  `https://job-boards.greenhouse.io/textio/jobs/<id>` form
  is produced when the wire omits `absolute_url`.
- Plus standard cohort cases (resultsWanted cap, searchTerm
  filters by title and by department, HTTP-500 error
  swallowed, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #384):** **NEW wire-shape variant 46 (first
  cohort observation).** `https://www.textio.com/careers/apply/?job=<id>&gh_jid=<id>`
  — HTTPS + `www.`-prefixed bare brand-domain `.com` + 2-
  segment `/careers/apply/` apply-page path **with a
  trailing slash** + **dual-id query** `?job=<id>&gh_jid=<id>`
  (vendor-side hand-off shim — the Textio careers-page front-
  end reads `job` while Greenhouse forwards `gh_jid`). The
  **forty-ninth distinct wire-shape variant** in the company-
  direct cohort (after Symphony variant 45 at Spec 172). The
  plugin emits `listing.absolute_url` byte-for-byte; the
  fallback constructor defaults to canonical Greenhouse
  variant-2 form `https://job-boards.greenhouse.io/textio/jobs/<id>`
  (same fallback strategy as Symphony / Samsara / Klaviyo /
  Bird / Collective Health / Netskope).
- **D-08 (run #384):** Decode-then-strip pipeline. **One-
  hundred-and-thirtieth** cohort plugin to apply D-08.
- **D-09 (run #384):** **Omitted** with case-symmetric bare-
  brand wire form. Wire `company_name === 'Textio'` byte-
  for-byte (6 bytes; fully clean, case-symmetric with the
  lowercase 6-byte slug `textio`). **One-hundred-and-twenty-
  first cohort plugin to omit D-09**.
- **D-10 (run #384):** **Omitted.** 0 of 2 wire titles
  padded (`'Growth Marketing Manager'`, `'Textio\'s General
  Application'`); plugin applies `.trim()` defensively as a
  safe no-op. **Thirty-ninth cohort plugin to omit D-10**.
- **D-11 (run #384):** **Omitted.** 0 of 2 unique wire
  department names padded (`'Marketing'`, `'General
  Application'`); plugin applies `.trim()` defensively as a
  safe no-op. **One-hundred-and-fourth cohort plugin** with
  fully-clean department pass-through.
- **D-13 (run #384):** **One structural deviation** from the
  Recharge (Spec 167) template — D-04 sub-axis: variant 2 →
  NEW variant 46. The trim semantics are unchanged. **Not a
  re-spin** (structural NEW variant, not a sub-axis shift).

## 11. References

- `packages/plugins/source-company-recharge/src/recharge.service.ts` —
  closest cohort cousin (one D-04 sub-axis deviation only).
- `packages/plugins/source-company-symphony/src/symphony.service.ts` —
  prior plugin with NEW wire-shape variant (variant 45;
  same fallback strategy).
- `packages/plugins/source-company-tatari/src/tatari.service.ts` —
  immediate predecessor (run #383).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
