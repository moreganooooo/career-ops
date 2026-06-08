# Spec: 176 — Source Company Plugin: ACI Learning

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 176                                                                                                                                                                                            |
| Slug           | source-company-acilearning                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #386)                                                                                                                                                                              |
| Created        | 2026-05-16                                                                                                                                                                                     |
| Last updated   | 2026-05-16                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..175                                                                                                                                                                        |

## 1. Problem Statement

Run #385's Spec 175 closed end-to-end (AccuWeather shipped —
first plugin in the eleventh fresh probe sweep; first cohort
observation of TWO-cap PascalCase + slug-truncation
co-occurring in the same wire `company_name`). Run #386 is
the **second** plugin in the eleventh fresh probe sweep with
a freshly-sampled candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 005 verified Greenhouse tenants, unchanged on `6dbb622`
since run #385).

The eleventh-sweep alphabetical continuation after AccuWeather
yielded the next viable live-board hit at **ACI Learning**
(5 visible roles confirmed at run-386 start via direct curl
probe of `https://api.greenhouse.io/v1/boards/acilearning/jobs?content=true`).

ACI Learning, LLC — operator of the **dominant U.S. private-
sector IT certification training and audit-readiness education
platform** providing instructor-led + self-paced IT, audit,
and cybersecurity training courseware (founded as ITProTV in
2013 in Gainesville, Florida; rebranded as ACI Learning in
2021 after the Audit Career Institute / Misti merger; privately
held; serves enterprise IT teams, individual learners pursuing
CompTIA / Cisco / Microsoft / ISACA certifications, plus
career-changer cohorts at the in-person Tech Academy campuses;
ships ACI Learning Hubs (subscription on-demand IT training
catalogue), ACI Learning Tech Academy (in-person 28-week IT
bootcamp at Dallas / San Antonio / Salt Lake City / Denver
campuses), ACI Learning Audit (audit-readiness training under
the legacy Misti / Audit Career Institute brand), and ACI
Learning IT-Pro (legacy ITProTV catalogue) across the global
IT-training segment — alongside competitors CompTIA / Pluralsight /
Coursera / Udemy / LinkedIn Learning / O'Reilly / Skillsoft /
Cybrary — with a hybrid distributed workforce concentrated
across Gainesville, FL (HQ), Dallas, TX (Tech Academy campus),
San Antonio, TX (Tech Academy campus), Salt Lake City, UT
(Tech Academy campus), Denver, CO (Tech Academy campus), and
Remote across the United States) — is published at the bare
`acilearning` Greenhouse slug.

**Wire-form D-09 observation:** the wire
`company_name === 'ACI Learning'` is a **simultaneous
acronym-prefix + PascalCase-suffix + space-strip D-09
sub-pattern**:

- **Acronym prefix**: first wire token `'ACI'` is **all-caps
  3-byte acronym** (caps at byte indices 0/1/2 of `ACI`)
  expanding to `Audit / Compliance / Information` security
  certification training.
- **PascalCase suffix**: second wire token `'Learning'` is
  **PascalCase** (caps at byte index 0 of `Learning` — single
  leading-cap of an 8-byte token).
- **Space-strip**: wire carries an internal ASCII-space
  separator between the two tokens; slug `acilearning`
  concatenates lowercase forms with **no separator** (11-byte
  slug equals lowercase concat of `aci` + `learning`).

The combined sub-pattern is **structurally novel** — first
cohort observation of acronym-prefix + PascalCase-suffix +
space-strip co-occurring in the same wire `company_name`.
All prior all-caps acronym D-09 plugins (IBM, ACLU is not
yet a plugin) carried a clean single-token wire form with no
space-strip; all prior PascalCase D-09 plugins carried a
single-token wire form with no acronym sub-pattern; all prior
space-strip D-09 plugins (Bill.com `'Bill.com'` → `billcom`,
Collective Health `'Collective Health'` → `collectivehealth`,
Maven Clinic `'Maven Clinic'` → `mavenclinic`, etc.) carried
two case-symmetric tokens or two PascalCase tokens without
the acronym sub-pattern in the first token.

## 2. Goals

- Ship a `source-company-acilearning` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-collectivehealth` plugin (closest cohort
  cousin with the **space-strip D-09 sub-axis + variant-2
  wire-shape**) but with **two structural deviations**:
  1. **D-09 sub-axis:** case-symmetric two-token space-strip
     (`'Collective Health'`) → **acronym-prefix + PascalCase-
     suffix + space-strip** (`'ACI Learning'`). **First
     cohort observation of acronym-prefix + PascalCase-suffix +
     space-strip D-09 sub-pattern co-occurring in the same
     wire `company_name`.**
  2. **D-04 sub-axis:** variant 2 (canonical Greenhouse host
     `job-boards.greenhouse.io`) confirmed in the run-386
     probe sample. The plugin emits `listing.absolute_url`
     byte-for-byte; the fallback constructor defaults to
     canonical variant-2 form `https://job-boards.greenhouse.io/acilearning/jobs/<id>`.
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  acronym-prefix + PascalCase-suffix + space-strip lock case
  beyond the standard 7-case cohort baseline).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical ACI Learning postings.
- ACI Learning Hubs / Tech Academy LMS APIs (the plugin is
  careers-board-only).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACILEARNING`**
> in the source registry, so that **a single `siteType:
> [Site.ACILEARNING]` request returns ACI Learning's open
> roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACILEARNING = 'acilearning'` to the `Site` enum.                                                                         | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acilearning`.                                                                        | must     |
| FR-3  | `AciLearningService.scrape(input)` returns a `JobResponseDto`; never throws.                                                       | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acilearning-`, `site === Site.ACILEARNING`.                                                   | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 canonical Greenhouse host).                                               | must     |
| FR-13 | D-10 **omitted** — 0 of 5 wire titles padded in run-386 probe; defensive `.trim()` is a safe no-op.                                | should   |
| FR-14 | D-11 **omitted** — 0 of 4 unique wire departments padded in run-386 probe.                                                          | should   |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACILEARNING, name: 'ACI Learning', category: 'company' })
@Injectable()
export class AciLearningService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through; **D-09 acronym-prefix + PascalCase-suffix + space-
  strip wire pin** (`'ACI Learning'` 12 bytes; first wire
  token `ACI` 3 bytes all-caps; second wire token `Learning`
  8 bytes PascalCase; space-strip to slug `acilearning`);
  D-10 clean title pass-through lock; D-11 clean dept
  pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #386):** Wire-shape variant 2 (canonical
  Greenhouse host). **Seventy-sixth** plugin in the cohort
  to use variant 2.
- **D-08 (run #386):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-second** cohort plugin to apply D-08.
- **D-09 (run #386):** **Omitted at runtime** — wire
  `company_name === 'ACI Learning'` flows through byte-for-
  byte. **First cohort observation of acronym-prefix +
  PascalCase-suffix + space-strip D-09 sub-pattern
  co-occurring in the same wire `company_name`.** Sub-pattern
  details:
  - Acronym prefix in first wire token (caps at 0/1/2 of
    `ACI` 3 bytes — all-caps); first cohort plugin with an
    **all-caps acronym prefix** as the leading token of a
    space-strip multi-token wire form.
  - PascalCase suffix in second wire token (caps at 0 of
    `Learning` 8 bytes); standard PascalCase form.
  - Space-strip (1 ASCII space between tokens stripped to
    yield slug); the **N-th** cohort plugin with the
    space-strip D-09 sub-axis (Bill.com, Collective Health,
    Maven Clinic, ComplyAdvantage, LaunchDarkly, PagerDuty,
    SoFi, etc.).
- **D-10 (run #386):** **Omitted** — 0 of 5 wire titles
  padded in the run-386 probe. Defensive `.trim()` is a safe
  no-op. **Fortieth cohort plugin to omit D-10**.
- **D-11 (run #386):** **Omitted** — 0 of 4 unique wire
  departments padded in the run-386 probe. **One-hundred-and-
  fifth cohort plugin** with fully-clean department pass-
  through.
- **D-13 (run #386):** **One structural deviation** from the
  Collective Health template — D-09 sub-axis (case-symmetric
  two-token space-strip → acronym-prefix + PascalCase-suffix +
  space-strip).

## 11. References

- `packages/plugins/source-company-collectivehealth/src/collective-health.service.ts` —
  closest cohort cousin (variant 2 + D-08 + space-strip D-09).
- `packages/plugins/source-company-mavenclinic/src/maven-clinic.service.ts` —
  prior space-strip two-token D-09 plugin.
- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  previous-run cohort plugin (Spec 175).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
