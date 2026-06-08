# Spec: 175 — Source Company Plugin: AccuWeather

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 175                                                                                                                                                                                            |
| Slug           | source-company-accuweather                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #385)                                                                                                                                                                              |
| Created        | 2026-05-15                                                                                                                                                                                     |
| Last updated   | 2026-05-15                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..174                                                                                                                                                                        |

## 1. Problem Statement

Run #384's Spec 174 closed end-to-end (Textio shipped — first
cohort observation of wire-shape variant 46 with the dual-id
query form; 22nd and final plugin in the tenth fresh probe
sweep). The tenth fresh probe sweep formally closed at run
#384. Run #385 **launches the eleventh fresh probe sweep**
with a freshly-sampled candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 004 verified Greenhouse tenants, post-PR-#34 cleanup).

The eleventh-sweep candidate seed list (alphabetical pull of
the first ~50 four-to-fifteen-character non-numeric slugs
not already represented in `packages/plugins/source-company-*`)
yielded a top-alphabetical live hit at **AccuWeather** (30
visible roles confirmed at run-385 start via direct curl
probe of `https://api.greenhouse.io/v1/boards/accuweather/jobs?content=true`).

AccuWeather, Inc. — operator of the **dominant
private-sector global weather-forecasting and severe-
weather-warning service** providing minute-by-minute
hyperlocal forecasts, AccuWeather MinuteCast®, RealFeel®
proprietary apparent-temperature index, and global storm-
warning telemetry (founded by Joel N. Myers in 1962 in
State College, Pennsylvania; privately held; serves over
half of the Fortune 500 companies plus thousands of
business and government clients across enterprise weather
solutions, broadcast media partnerships, digital ad
inventory, and consumer mobile / web properties; ships
AccuWeather for Business (enterprise-tier custom forecasts
+ severe-weather alerts), AccuWeather Network (24/7
weather television channel), AccuWeather.com (consumer web
+ mobile), and AccuWeather MinuteCast® / RealFeel®
proprietary forecast products across the global private-
sector weather-services segment — alongside competitors
The Weather Company / IBM Weather, Tomorrow.io, DTN, Météo-
France, Met Office, and StormGeo — with a hybrid
distributed workforce concentrated across State College,
PA (HQ), Wichita, KS (broadcast), Birmingham, AL (radar /
forecast operations), New York, NY (sales / media), and
Remote across the United States) — is published at the
bare `accuweather` Greenhouse slug.

**Wire-form D-09 observation:** the wire
`company_name === 'AccuWeather Careers'` is a **simultaneous
TWO-cap PascalCase + slug-truncation D-09 sub-pattern**:
- **TWO-cap PascalCase** in the first wire token: caps at
  byte indices 0 (`A` vs `a`) and 4 (`W` vs `w`) of
  `AccuWeather` (case-asymmetric vs the lowercase 11-byte
  slug `accuweather` at two byte indices — sixth byte index
  for the second capital, after SoFi caps-0/2, StockX caps-
  0/5, xAI caps-0/2-lowercase-first, LaunchDarkly /
  SimpliSafe / ComplyAdvantage caps-0/6, PagerDuty caps-
  0/5, GoCardless caps-0/2);
- **Slug-truncation**: wire drops 1 trailing token `Careers`
  (multi-token corp-suffix descriptive entity wire form;
  6 cohort observations of slug-truncation D-09 sub-axis
  after Oscar / BEAM / Founders / Fox / Symphony — Symphony
  was 2 tokens dropped, AccuWeather is **1 token dropped —
  the shortest non-zero token-truncation factor in the
  cohort to date**, displacing Symphony's prior-record).

The combined sub-pattern is **structurally novel** — first
cohort observation of TWO-cap PascalCase + slug-truncation
co-occurring in the same wire `company_name`. All prior
TWO-cap PascalCase D-09 plugins (SoFi, StockX, xAI,
LaunchDarkly, PagerDuty, ComplyAdvantage, GoCardless,
SimpliSafe) carried a clean **case-asymmetric** wire form
with no descriptive-suffix truncation; all prior slug-
truncation D-09 plugins (Oscar, BEAM, Founders, Fox,
Symphony) carried a **case-symmetric** wire form with no
PascalCase asymmetry inside the first token.

## 2. Goals

- Ship a `source-company-accuweather` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-tatari` plugin (Spec 173) — Tatari is the
  closest cohort cousin sharing **three** primary axes: D-04
  variant 2 + D-08 + D-10 applied (trailing-pad form).
- **Two structural deviations** —
  1. **D-09 sub-axis:** case-symmetric bare-brand `'Tatari'`
     (6 bytes) → **simultaneous TWO-cap PascalCase + slug-
     truncation** `'AccuWeather Careers'` (19 bytes; first
     wire token `AccuWeather` 11 bytes with caps at 0/4 —
     case-asymmetric vs lowercase 11-byte slug `accuweather`
     at two byte indices; wire drops 1 trailing token
     `Careers`). **First cohort observation of TWO-cap
     PascalCase + slug-truncation co-occurring in the same
     wire `company_name`.**
  2. **D-11 sub-axis:** clean department pass-through (0 of
     7 padded) → **APPLIED with trailing-pad form** (2 of 15
     unique wire departments padded — `'Facilities '`,
     `'Information Systems '`).
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated
  D-09 PascalCase + slug-truncation lock case + a D-11
  trailing-pad lock case beyond the standard 7-case cohort
  baseline).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical AccuWeather postings.
- AccuWeather Network broadcast schedule / weather data
  API integration (the plugin is careers-board-only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACCUWEATHER`**
> in the source registry, so that **a single `siteType:
> [Site.ACCUWEATHER]` request returns AccuWeather's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACCUWEATHER = 'accuweather'` to the `Site` enum.                                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-accuweather`.                                                                        | must     |
| FR-3  | `AccuWeatherService.scrape(input)` returns a `JobResponseDto`; never throws.                                                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `accuweather-`, `site === Site.ACCUWEATHER`.                                                   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                               | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis (7 of 30 padded ~23.3 %).                                          | must     |
| FR-14 | D-11 **applied** — department `.trim()` covers trailing-pad sub-axis (2 of 15 unique departments padded).                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACCUWEATHER, name: 'AccuWeather', category: 'company' })
@Injectable()
export class AccuWeatherService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 PascalCase + slug-truncation wire pin**
  (`'AccuWeather Careers'` 19 bytes; first wire token
  `AccuWeather` 11 bytes with caps at 0/4; slug-truncated
  to `accuweather`); D-10 trailing-pad title-trim lock
  (`'Account Executive '` → `'Account Executive'`); D-11
  trailing-pad dept-trim lock (`'Facilities '` →
  `'Facilities'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #385):** Wire-shape variant 2 (canonical
  Greenhouse host). **Seventy-fifth** plugin in the cohort
  to use variant 2.
- **D-08 (run #385):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-first** cohort plugin to apply D-08.
- **D-09 (run #385):** **Omitted at runtime** — wire
  `company_name === 'AccuWeather Careers'` flows through
  byte-for-byte. **First cohort observation of TWO-cap
  PascalCase + slug-truncation co-occurring in the same
  wire `company_name`.** Sub-pattern details:
  - TWO-cap PascalCase in first wire token (caps at 0/4 of
    `AccuWeather` 11 bytes); **9th cohort plugin with
    TWO-cap PascalCase D-09 sub-axis** after SoFi, StockX,
    xAI, LaunchDarkly, PagerDuty, ComplyAdvantage,
    GoCardless, SimpliSafe.
  - Slug-truncation (1 trailing token dropped: `Careers`);
    **6th cohort observation of slug-truncation D-09 sub-
    axis** after Oscar (1 token added), BEAM (acronym
    expansion), Founders (4 dropped), Fox (5 dropped),
    Symphony (2 dropped); **AccuWeather drops 1 trailing
    token — the new shortest non-zero token-truncation
    factor in the cohort**, displacing Symphony's prior
    record.
- **D-10 (run #385):** **APPLIED with trailing-pad form.**
  7 of 30 wire titles padded with single-trailing-ASCII-
  space form (~23.3 % pad rate, all trailing-only — the
  **highest per-plugin pad rate observed in any D-10-
  applied plugin since SimpliSafe (Spec 171, ~14.3 %)** —
  cohort-wide new high-watermark). **Eightieth cohort plugin
  to apply D-10**.
- **D-11 (run #385):** **APPLIED with trailing-pad form.**
  2 of 15 unique wire department names padded (`'Facilities '`,
  `'Information Systems '`); the plugin applies `.trim()`
  to the wire `departments[0].name` byte-for-byte before
  downstream emit. **Twenty-first cohort plugin to apply
  D-11**.
- **D-13 (run #385):** **Two structural deviations** from
  the Tatari (Spec 173) template — D-09 sub-axis (case-
  symmetric bare-brand → TWO-cap PascalCase + slug-
  truncation) AND D-11 sub-axis (clean pass-through →
  trailing-pad applied). The trim semantics shift at D-11
  (no-op → trailing-pad trim).

## 11. References

- `packages/plugins/source-company-tatari/src/tatari.service.ts` —
  closest cohort cousin (three primary axis matches; two
  structural deviations: D-09 + D-11).
- `packages/plugins/source-company-symphony/src/symphony.service.ts` —
  prior slug-truncation D-09 plugin (2 tokens dropped).
- `packages/plugins/source-company-simplisafe/src/simplisafe.service.ts` —
  prior TWO-cap PascalCase D-09 plugin (caps at 0/6).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
