# Spec: 133 — Source Company Plugin: Oscar

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 133                                                                                                                                                                                            |
| Slug           | source-company-oscar                                                                                                                                                                           |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #343)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..132                                                                                                                                                                        |

## 1. Problem Statement

Run #342's Spec 132 closed end-to-end (Opendoor shipped —
first cohort observation of variant 34; first-cohort internal-
double-whitespace D-10 sub-axis; crossed 70-plugin D-11-
omission threshold). Run #343 picks up the **fourteenth** live
hit alphabetically from the eighth-fresh-sweep candidate pool:
**Oscar** (247 visible roles confirmed at run-343 start —
**largest probe-counter UNDER-count** in eighth-sweep at
~0.33× ratio (estimate ~81 keys vs actual 247); also
**largest single-board sample** in eighth-sweep).

Oscar Insurance Corporation (Oscar Health, Inc., dba Hi
Oscar) — operator of the **dominant US-tech-first health-
insurance-as-a-platform pioneered around the
member-experience-as-software / +Oscar API-driven
underwriting / risk-bearing-tech-broker data model**
(founded by Mario Schlosser, Joshua Kushner, and Kevin
Nazemi in 2012 in New York City; public on the NYSE since
March 2021 IPO under ticker `OSCR` at ~$7.9B initial
valuation; market-cap settled in the $1.5-3.5B band as of
2026; ships Oscar Health (ACA Marketplace + Medicare
Advantage + Cigna+Oscar SMB partnership), +Oscar (the API-
based platform sold B2B to other insurers), Oscar Concierge
(member-experience hub), Oscar Provider Network, and Oscar
Virtual Care across the tech-first-health-insurance / risk-
bearing-payvider / Medicare-Advantage segment — alongside
competitors Bright Health (defunct 2023), Clover Health,
Devoted Health, Alignment Healthcare, Cigna, UnitedHealth,
Humana, and Anthem — with a hybrid distributed workforce
concentrated across New York City (HQ), Tempe, Los Angeles,
and Remote across the United States) — is published at the
bare `oscar` Greenhouse slug (case-AND-length-asymmetric
**with first-cohort slug-extra-word pattern** vs the wire
`company_name === 'Oscar Health'` — slug 5 bytes vs wire 12
bytes; wire adds the entire second token `' Health'` beyond
the slug).

## 2. Goals

- Ship a `source-company-oscar` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-squarespace` plugin — Squarespace is the
  closest cohort cousin via shared D-08 + HTTP-scheme D-04
  sub-axis + D-10 applied + D-11 omitted axes.
- **Two structural deviations** from Squarespace:
  1. **D-04 wire-shape variant 35 — HTTP-scheme `www.`-prefixed
     parent-domain `/careers/<id>` id-in-path + gh_jid query
     (first cohort observation; thirty-eighth distinct wire-
     shape variant).** Variant 35 is the **id-in-path + gh_jid
     query (dual-id) sister to Squarespace's variant 22**
     (HTTP `www.squarespace.com/about/careers?gh_jid=<id>` —
     query-only id), with a parent-domain `hioscar.com` (not
     slug-matching) and `/careers/<id>` path (vs Squarespace's
     `/about/careers`).
  2. **D-09 — first-cohort slug-extra-word asymmetric wire
     form** — slug `oscar` (5 bytes) vs wire `'Oscar Health'`
     (12 bytes — wire adds the entire second token `' Health'`
     beyond the slug). **Distinct from prior internal-
     whitespace asymmetry cases** (Scale AI / Maven Clinic /
     Stitch Fix / New Relic / Dollar Shave Club / Misfits
     Market / Constant Contact / Modern Health) which all had
     the same letters split by a space — Oscar's wire has an
     entire extra word the slug lacks.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Oscar postings.
- Oscar product-API / Health / +Oscar / Concierge integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.OSCAR`** in the
> source registry, so that **a single `siteType: [Site.OSCAR]`
> request returns Oscar's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.OSCAR = 'oscar'` to the `Site` enum.                                                    | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-oscar`.                                             | must     |
| FR-3  | `OscarService.scrape(input)` returns a `JobResponseDto`; never throws.                            | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `oscar-`, `site === Site.OSCAR`, `companyName === 'Oscar Health'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 35 — HTTP). Fallback uses canonical Greenhouse variant-2 (HTTPS). | must |
| FR-13 | D-10 **applied** with second cohort observation of leading-pad sub-axis (` Member & Provider Escalations Team Lead`). | must |
| FR-14 | D-11 **omitted** — 0 of 247 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OSCAR, name: 'Oscar Health', category: 'company' })
@Injectable()
export class OscarService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-35 URL byte-for-
  byte pass-through (HTTP); D-09 first-cohort slug-extra-word
  asymmetric `'Oscar Health'` lock; D-10 leading-pad title
  trim lock (second cohort observation after Chainguard);
  D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #343):** **Wire-shape variant 35 — HTTP-scheme
  `www.`-prefixed parent-domain `/careers/<id>` id-in-path +
  `?gh_jid=<id>` query (first cohort observation; thirty-
  eighth distinct wire-shape variant).** Sub-axes: (a) **HTTP
  scheme** (second cohort observation after Squarespace's
  variant 22); (b) **`www.`-prefixed parent-domain
  `hioscar.com`** — distinct from the `oscar.com` slug-
  matching expectation; (c) `/careers/<id>` path; (d) **id-
  in-path + gh_jid query (dual-id form)**. Sister to
  Squarespace's variant 22 (HTTP + www + query-only id +
  `/about/careers` path); the dual-id pattern matches
  Okta's variant 31 / ClassPass's variant 12.
- **D-08 (run #343):** Decode-then-strip pipeline. **Eighty-
  ninth** cohort plugin to apply D-08.
- **D-09 (run #343):** **Omitted with FIRST-COHORT slug-extra-
  word asymmetric wire form** — slug `oscar` (5 bytes) vs
  wire `'Oscar Health'` (12 bytes — wire adds the entire
  second token `' Health'` beyond the slug). **Distinct from
  prior internal-whitespace asymmetry cases** (Scale AI /
  Maven Clinic / Stitch Fix / New Relic / Dollar Shave Club /
  Misfits Market / Constant Contact / Modern Health) which
  all had the same letters split by a space — Oscar's wire
  has an entire extra word the slug lacks. **Eightieth cohort
  plugin to omit D-09 — crosses the 80-plugin D-09-omission
  threshold at this run.**
- **D-10 (run #343):** **APPLIED with second-cohort leading-
  pad observation.** 2 of 247 wire titles padded (~0.81 %
  pad rate — **lowest D-10 pad rate in cohort to date**) — 1
  trailing-pad (`'Senior Analyst, Data Analytics, SIU '`) +
  1 **leading-pad** (`' Member & Provider Escalations Team
  Lead'`). **Second cohort observation of leading-pad title
  form** after Chainguard (Spec 122). The plugin's `.trim()`
  operation handles both directions transparently. **Fifty-
  third cohort plugin to apply D-10**.
- **D-11 (run #343):** **Omitted** — 0 of 247 wire department
  names padded across 23 unique department names (`'Actuarial'`,
  `'Business Operations'`, `'Clinical'`, `'Compliance'`,
  `'Corporate Strategy'`, `'Data'`, `'Engineering'`,
  `'Finance'`, `'Insurance Operations'`, `'Insurance Product
  Strategy'`, `'Legal'`, `'Market P&L'`, plus 11 others —
  clean multi-token forms with internal whitespace and
  ampersands). **Seventy-first cohort plugin** with fully-
  clean department pass-through.
- **D-13 (run #343):** **Two structural deviations** from the
  Squarespace (Spec 088) template: D-04 sub-axis (variant 22
  query-only id → variant 35 id-in-path + gh_jid + parent-
  domain) AND D-09 sub-axis (Squarespace case-symmetric →
  Oscar first-cohort slug-extra-word asymmetric).

## 11. References

- `packages/plugins/source-company-squarespace/src/squarespace.service.ts` —
  closest cohort cousin (variant 22 HTTP scheme reference).
- `packages/plugins/source-company-chainguard/src/chainguard.service.ts` —
  prior leading-pad D-10 observation (run #332).
- `packages/plugins/source-company-opendoor/src/opendoor.service.ts` —
  immediate predecessor (run #342).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
