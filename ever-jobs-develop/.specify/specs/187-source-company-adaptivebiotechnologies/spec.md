# Spec: 187 — Source Company Plugin: Adaptive Biotechnologies

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 187                                                                                                                                                                                            |
| Slug           | source-company-adaptivebiotechnologies                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #397)                                                                                                                                                                              |
| Created        | 2026-05-27                                                                                                                                                                                     |
| Last updated   | 2026-05-27                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..186                                                                                                                                                                        |

## 1. Problem Statement

Run #396's Spec 186 closed end-to-end (Acurus Solutions
shipped — 12th plugin in the eleventh fresh probe sweep;
first cohort observation of 2-token-prefix PascalCase slug-
truncation D-09 sub-form with corporate-legal-suffix-drop).
Run #397 is the **thirteenth** plugin in the eleventh fresh
probe sweep with **Adaptive Biotechnologies** (Seattle-HQ
commercial immunosequencing platform — 13 visible roles
confirmed at run-397 start via direct curl probe of
`https://api.greenhouse.io/v1/boards/adaptivebiotechnologies/jobs?content=true`).

Adaptive Biotechnologies Corporation — Seattle, Washington
HQ commercial immunosequencing platform built around the
immunoSEQ T-cell / B-cell receptor repertoire assay and the
FDA-cleared clonoSEQ minimal-residual-disease blood test for
lymphoid malignancies (NASDAQ: ADPT; founded by Harlan & Chad
Robins in 2009; ships the immunoSEQ research platform, the
clonoSEQ assay across the blood-cancer MRD segment, and the
T-Detect COVID/Lyme/CMV antigen-mapping diagnostic line);
corporate legal entity name `Adaptive Biotechnologies` (case-
symmetric 2-token PascalCase); publishes its consolidated
careers board through Greenhouse at the bare slug
`adaptivebiotechnologies` (23 bytes; wire `company_name ===
'Adaptive Biotechnologies'` 24 bytes; see § 10 D-09).

**Wire-form D-04 observation:** wire `absolute_url` carries
the **NEW variant 47** form — `https://www.adaptivebiotech.com/career-listings/listing?gh_jid=<id>`.
HTTPS + `www.`-prefixed truncated-bare-brand `.com` (drop
`nologies` from `biotechnologies` → 19-byte domain
`adaptivebiotech.com`) + 2-segment `/career-listings/listing`
apply-page path **without a trailing slash** + **single-id
query** `?gh_jid=<id>`. The **brand-domain-token-truncation**
is the novel sub-feature — the slug retains the full
`biotechnologies` token (23-byte slug) while the public-
facing domain truncates to `biotech` (drop the 9-byte
`nologies` suffix). **First cohort observation of variant 47**;
**first cohort observation of brand-domain-token-truncation**;
**first cohort observation of no-trailing-slash 2-segment
apply-page path within a NEW-variant D-04 observation**
(Textio variant 46 at Spec 174 carried a *trailing-slash*
`/careers/apply/` path); **first cohort observation of
single-id `?gh_jid=`-only query within a NEW-variant D-04
observation** (Textio variant 46 carried dual-id
`?job=<id>&gh_jid=<id>`). **50th distinct wire-shape variant**
in the company-direct cohort.

**Wire-form D-09 observation:** the wire
`company_name === 'Adaptive Biotechnologies'` is a **case-
symmetric 2-token PascalCase** 24-byte wire form (every wire
token PascalCase cap-at-byte-0-only: `'Adaptive'` 8 bytes +
`'Biotechnologies'` 15 bytes + 1 ASCII space). Slug
`adaptivebiotechnologies` 23 bytes is byte-for-byte the
space-strip + lowercase of the wire (canonical case-symmetric
2-token PascalCase sub-form). **134th cohort plugin to omit
D-09.**

**Wire-form D-10 observation:** **1 of 13 listings carries
trailing ASCII-space padding** in the wire `title` field —
`'Clinical Lab Technologist II '` (28-byte payload + 1
trailing ASCII space → 29-byte padded form). The plugin
applies D-10 — emits `(listing.title ?? '').trim()`. Pad rate
~7.7 % (1/13), trailing-only sub-form. **87th cohort plugin
to apply D-10.**

**Wire-form D-11 observation:** **0 of 10 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Commercial Operations'`, `'Diagnostics Clinical Services'`,
`'Diagnostics Sales'`, `'Digital Health'`, `'Executive'`,
`'IT Systems & Infrastructure'`, `'Laboratory Operations'`,
`'Legal'`, `'Research and Innovation'`, `'Sales & Business
Development'`). The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay. **114th cohort plugin with fully-clean
department pass-through.**

## 2. Goals

- Ship a `source-company-adaptivebiotechnologies` plugin
  returning live `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-acurussolutions` plugin (closest cohort
  cousin with the **D-08 + D-09 omitted + D-10 applied +
  D-11 omitted** profile) with **one structural deviation**:
  D-04 sub-axis — variant 2 (canonical Greenhouse host) →
  **NEW variant 47** (first cohort observation): HTTPS +
  `www.`-prefixed truncated-bare-brand `.com` (drop
  `nologies` from `biotechnologies` → `adaptivebiotech.com`)
  + 2-segment `/career-listings/listing` apply-page path
  without trailing slash + single-id `?gh_jid=<id>` query.
- Bundle a unit-test suite (≥ 9 cases — standard cohort
  baseline; D-09 byte-for-byte 2-token PascalCase wire lock
  + case-symmetric slug derivation lock; D-04 NEW variant-47
  URL lock; D-10 trailing-pad title-trim lock; D-11 clean-
  pass-through dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Adaptive Biotechnologies postings.
- Other immunosequencing / liquid-biopsy vendors (Natera,
  Guardant Health, Exact Sciences, Veracyte, etc. — separate
  adoption candidates if needed).

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ADAPTIVEBIOTECHNOLOGIES`**
> in the source registry, so that **a single `siteType:
> [Site.ADAPTIVEBIOTECHNOLOGIES]` request returns Adaptive
> Biotechnologies' open immunosequencing-platform roles
> across Seattle / Minneapolis / Remote (WFH)**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ADAPTIVEBIOTECHNOLOGIES = 'adaptivebiotechnologies'` to the `Site` enum.                                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-adaptivebiotechnologies`.                                                            | must     |
| FR-3  | `AdaptiveBiotechnologiesService.scrape(input)` returns a `JobResponseDto`; never throws.                                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `adaptivebiotechnologies-`, `site === Site.ADAPTIVEBIOTECHNOLOGIES`.                            | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (NEW variant 47 — first cohort observation; canonical variant-2 fallback retained).  | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 1 of 13 wire titles padded in run-397 probe; emit `(listing.title ?? '').trim()`.           | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 10 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ADAPTIVEBIOTECHNOLOGIES, name: 'Adaptive Biotechnologies', category: 'company' })
@Injectable()
export class AdaptiveBiotechnologiesService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts **D-04 NEW variant-47
  URL pass-through** (`https://www.adaptivebiotech.com/career-listings/listing?gh_jid=<id>`);
  **D-09 2-token PascalCase byte-for-byte wire pin**
  (`'Adaptive Biotechnologies'` 24 bytes, 2 wire tokens
  PascalCase cap-at-byte-0-only, 1 ASCII space); **D-09 case-
  symmetric slug derivation lock** (slug
  `adaptivebiotechnologies` 23 bytes is byte-for-byte the
  space-strip + lowercase of the wire); **D-04 explicit NEW
  variant-47 URL lock** (truncated-brand-domain
  `adaptivebiotech.com`, 2-segment `/career-listings/listing`
  apply-page path without trailing slash, single-id
  `?gh_jid=<id>` query); **D-10 trailing-pad title-trim lock**
  (asserts a padded form gets trimmed and no emitted title
  ends in whitespace); **D-11 clean-pass-through dept lock**.
- Plus standard cohort cases (resultsWanted, searchTerm by
  title and department, error handling, empty payload).

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #397):** **NEW wire-shape variant 47** (first
  cohort observation). HTTPS + `www.`-prefixed truncated-
  bare-brand `.com` (drop `nologies` from `biotechnologies`
  → 19-byte domain `adaptivebiotech.com`) + 2-segment
  `/career-listings/listing` apply-page path **without a
  trailing slash** + **single-id query** `?gh_jid=<id>`. The
  **fiftieth distinct wire-shape variant** in the company-
  direct cohort. **First cohort observation of brand-domain-
  token-truncation** (slug retains full `biotechnologies`
  while domain drops `nologies`). **First cohort observation
  of no-trailing-slash 2-segment apply-page path within a
  NEW-variant D-04 observation** (Textio variant 46 at Spec
  174 carried a *trailing-slash* `/careers/apply/` path).
  **First cohort observation of single-id `?gh_jid=`-only
  query within a NEW-variant D-04 observation** (Textio
  variant 46 carried dual-id `?job=<id>&gh_jid=<id>`).
- **D-08 (run #397):** Decode-then-strip pipeline. **One-
  hundred-and-forty-third** cohort plugin to apply D-08.
- **D-09 (run #397):** **Omitted at runtime** — wire
  `company_name === 'Adaptive Biotechnologies'` flows
  through byte-for-byte. Case-symmetric 2-token PascalCase
  wire form: `'Adaptive'` 8 bytes + `'Biotechnologies'` 15
  bytes + 1 ASCII space → 24-byte wire. Slug
  `adaptivebiotechnologies` 23 bytes is byte-for-byte the
  space-strip + lowercase of the wire. **134th cohort
  plugin to omit D-09.**
- **D-10 (run #397):** **Applied (trailing-pad form).** 1
  of 13 wire titles in the run-397 probe carries trailing
  ASCII-space padding (`'Clinical Lab Technologist II '`).
  **87th cohort plugin to apply D-10.**
- **D-11 (run #397):** **Omitted (clean pass-through).** 0
  of 10 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte. **114th
  cohort plugin with fully-clean department pass-through
  (D-11 omitted).**
- **D-13 (run #397):** **One structural deviation** from the
  Acurus Solutions template — D-04 sub-axis (variant 2 →
  NEW variant 47 first cohort observation: truncated-brand-
  domain + no-trailing-slash 2-segment apply-page path +
  single-id `?gh_jid=`-only query).

## 11. References

- `packages/plugins/source-company-acurussolutions/src/acurussolutions.service.ts` —
  closest cohort cousin (D-08 + D-09 omitted + D-10 applied
  + D-11 omitted template; differs only on D-04 sub-axis).
- `packages/plugins/source-company-textio/src/textio.service.ts` —
  prior NEW-variant D-04 observation (variant 46 at Spec 174;
  dual-id query + trailing-slash 2-segment apply-page path
  sub-form).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
