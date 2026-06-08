# Spec: 173 — Source Company Plugin: Tatari

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 173                                                                                                                                                                                            |
| Slug           | source-company-tatari                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #383)                                                                                                                                                                              |
| Created        | 2026-05-10                                                                                                                                                                                     |
| Last updated   | 2026-05-10                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..172                                                                                                                                                                        |

## 1. Problem Statement

Run #382's Spec 172 closed end-to-end (Symphony shipped —
first cohort observation of wire-shape variant 45 with the
bare brand-domain `.com` apply-page form; fifth cohort
observation of slug-truncation D-09 sub-axis with the
shortest non-zero token-truncation factor in cohort to date
(2 tokens dropped); 38th D-10 omission; 20th D-11
application). Run #383 picks up the **twenty-first** live
hit alphabetically from the tenth-fresh-sweep candidate
pool: **Tatari** (52 visible roles confirmed at run-383 start
— tenth-sweep estimate ~55; ~0.945× ratio, near-1× match).

Tatari, Inc. (Tatari.tv) — operator of the **dominant
streaming-and-linear-TV connected-attribution advertising-
analytics platform pioneered around the cross-channel
incremental-lift / unique-reach measurement data model**
(founded by Sarah Bichara, Philip Inghelbrecht, and Brad
Geving in 2016 in San Francisco, California; raised ~$45M
Series C in March 2022 led by Battery Ventures and Amplify
Partners at peak ~$215M valuation; ships Tatari for Linear
TV (national-and-spot-cable buying / planning / measurement),
Tatari for Streaming TV (CTV / OTT premium-supply
attribution), Tatari for Brand-Performance (TV-driven KPI
optimisation), and Tatari Audio (podcast-and-streaming-audio
incremental-lift attribution) across the streaming-TV /
connected-TV / linear-TV-as-a-service segment — alongside
competitors LiveRamp, iSpot.tv, VideoAmp, Innovid, Comscore,
and Nielsen — with a hybrid distributed workforce
concentrated across San Francisco (HQ), New York, and Remote
across the United States) — is published at the bare
`tatari` Greenhouse slug (case-symmetric with the wire
`company_name === 'Tatari'`).

## 2. Goals

- Ship a `source-company-tatari` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-simplisafe` plugin — SimpliSafe is the
  closest cohort cousin sharing four primary axes: D-04
  variant 2 + D-08 + D-10 applied (trailing-pad form) + D-11
  omitted.
- **One structural deviation** — D-09 sub-axis: TWO-cap
  PascalCase case-asymmetric `'SimpliSafe'` (caps at 0/6) →
  bare-brand case-symmetric `'Tatari'` (clean 6-byte case-
  symmetric brand wire). The trim semantics remain
  unchanged.
- **Fifty-first near-clean re-spin** in run history (one
  observability-only sub-axis shift; trim semantics
  unchanged).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Tatari postings.
- Tatari attribution / measurement / API-integration support
  (the plugin is careers-board-only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.TATARI`** in
> the source registry, so that **a single `siteType:
> [Site.TATARI]` request returns Tatari's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.TATARI = 'tatari'` to the `Site` enum.                                                                          | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-tatari`.                                                                    | must     |
| FR-3  | `TatariService.scrape(input)` returns a `JobResponseDto`; never throws.                                                   | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                         | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                              | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `tatari-`, `site === Site.TATARI`, `companyName === 'Tatari'`.                        | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                           | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                              | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                           | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                          | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                          | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                      | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (3 of 52 padded ~5.8 %).                                  | must     |
| FR-14 | D-11 **omitted** — 0 of 7 wire department names padded across 7 unique departments.                                       | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.TATARI, name: 'Tatari', category: 'company' })
@Injectable()
export class TatariService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 case-symmetric bare-brand wire pin**
  (`'Tatari'` 6 bytes; case-symmetric vs the lowercase 6-byte
  slug `tatari`); D-10 trailing-pad title-trim lock (`'Data
  Science Analyst '` → `'Data Science Analyst'`); D-11 clean
  dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #383):** Wire-shape variant 2 (canonical
  Greenhouse host). **Seventy-fourth** plugin in the cohort
  to use variant 2.
- **D-08 (run #383):** Decode-then-strip pipeline. **One-
  hundred-and-twenty-ninth** cohort plugin to apply D-08.
- **D-09 (run #383):** **Omitted** with case-symmetric bare-
  brand wire form. Wire `company_name === 'Tatari'` byte-for-
  byte (6 bytes; fully clean, case-symmetric with the
  lowercase 6-byte slug `tatari`). **One-hundred-and-
  twentieth cohort plugin to omit D-09**.
- **D-10 (run #383):** **APPLIED with trailing-pad form.** 3
  of 52 wire titles padded with single-trailing-ASCII-space
  form (~5.8 % pad rate, all trailing-only — `'Data Science
  Analyst '` repeated across three listings; same title-form
  trailing-padded three times). **Seventy-ninth cohort
  plugin to apply D-10**.
- **D-11 (run #383):** **Omitted.** 0 of 7 unique wire
  department names padded (`'Client Development'`, `'Client
  Services'`, `'Data Science'`, `'Engineering'`, `'Marketing'`,
  `'Media Buying'`, `'Product Management'` — clean multi-
  token forms with internal whitespace); **one-hundred-and-
  third cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #383):** **One structural deviation** from the
  SimpliSafe (Spec 171) template — D-09 sub-axis: TWO-cap
  PascalCase case-asymmetric (caps 0/6) → case-symmetric
  bare-brand. The trim semantics are unchanged. **Fifty-
  first near-clean re-spin** in run history.

## 11. References

- `packages/plugins/source-company-simplisafe/src/simplisafe.service.ts` —
  closest cohort cousin (one D-09 sub-axis deviation only).
- `packages/plugins/source-company-recharge/src/recharge.service.ts` —
  prior cohort plugin with case-symmetric bare-brand D-09.
- `packages/plugins/source-company-symphony/src/symphony.service.ts` —
  immediate predecessor (run #382).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
