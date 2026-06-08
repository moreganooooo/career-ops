# Spec: 119 — Source Company Plugin: Vonage

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 119                                                                                                                                                                                            |
| Slug           | source-company-vonage                                                                                                                                                                          |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #329)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..118                                                                                                                                                                        |

## 1. Problem Statement

Run #328's Spec 118 closed end-to-end (Pendo shipped — 22nd
clean re-spin off Coursera; lowest seventh-sweep probe-counter-
inflation factor (1×)). Run #329 picks up the **fourteenth
and last** live hit alphabetically from the seventh-fresh-
sweep candidate pool: **Vonage** (81 visible roles confirmed
at run-329 start).

Vonage Holdings Corp. (a wholly-owned subsidiary of Ericsson
since 2022) — operator of the **dominant communications-
platform-as-a-service (CPaaS) and unified-communications-as-a-
service (UCaaS) platforms pioneered around the
SIP-trunking / programmable-voice / programmable-messaging /
programmable-video data model** (founded by Jeff Pulver and
Daniel Borislow in 2001 in Holmdel, New Jersey; public on the
NYSE from May 2006 IPO at $16/share until July 2022 acquisition
by Ericsson for $6.2B / $21/share; ships Vonage Business
Communications (UCaaS), Vonage Communications APIs (Voice /
Messages / Video / Verify / Number Insight / In-app Messaging /
SIP Trunking — Nexmo platform acquired June 2016 for $230M),
Vonage Contact Center (NewVoiceMedia acquired October 2018 for
$350M), and Vonage AI Studio across the CPaaS / UCaaS / contact-
center segment — alongside competitors Twilio, Bandwidth,
RingCentral, 8x8, Cisco Webex, Zoom Phone, and Microsoft Teams
Phone — with a hybrid distributed workforce concentrated across
Holmdel NJ (HQ), San Francisco, London, Aveiro (Portugal),
Wrocław (Poland), Tel Aviv, Bangalore, and Remote across the
United States, Portugal, Poland, the United Kingdom, the
European Union, Israel, India, and the Asia-Pacific region) —
is published at the bare `vonage` Greenhouse slug (case-
symmetric with the wire `company_name === 'Vonage'` after
casefold).

> **Run #329 closes out the seventh fresh probe sweep** —
> Vonage is the fourteenth and last live-board hit from the
> run-316 candidate pool. The eighth fresh probe sweep launches
> at run #330+.

## 2. Goals

- Ship a `source-company-vonage` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-otter` plugin — Otter is the closest cohort
  cousin (immediate predecessor with identical axes) and
  Airtable is the upstream template both inherit from.
- **Zero structural deviations** from Otter.
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Vonage postings.
- Vonage CPaaS / UCaaS / Nexmo / NewVoiceMedia product-API
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.VONAGE`** in the
> source registry, so that **a single `siteType: [Site.VONAGE]`
> request returns Vonage's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.VONAGE = 'vonage'` to the `Site` enum.                                                  | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-vonage`.                                            | must     |
| FR-3  | `VonageService.scrape(input)` returns a `JobResponseDto`; never throws.                           | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `vonage-`, `site === Site.VONAGE`, `companyName === 'Vonage'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (11 of 81 padded ~13.6 %).    | must     |
| FR-14 | D-11 **omitted** — 0 of 81 wire department names padded.                                          | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.VONAGE, name: 'Vonage', category: 'company' })
@Injectable()
export class VonageService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Vonage'` lock; D-10 trailing-
  pad title trim lock; D-11 clean dept pass-through.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #329):** Wire-shape variant 2. **Thirty-ninth**
  plugin in the cohort to use variant 2.
- **D-08 (run #329):** Decode-then-strip pipeline. **Seventy-
  fifth** cohort plugin to apply D-08.
- **D-09 (run #329):** **Omitted** — case-symmetric bare-brand
  wire `'Vonage'` (6 bytes). **Sixty-sixth cohort plugin to
  omit D-09**.
- **D-10 (run #329):** **APPLIED with trailing-pad form.** 11
  of 81 wire titles padded (~13.6 % pad rate, all trailing-
  only). **Forty-second cohort plugin to apply D-10**.
- **D-11 (run #329):** **Omitted** — 0 of 81 wire department
  names padded across 19 unique department names (`'API BU
  Engineering'`, `'API BU Product'`, `'API Customer Care'`,
  `'API In-BU Operations'`, `'API Sales Development'`,
  `'Alliances and Channel Sales'`, `'Americas MME Sales'`,
  `'Apps BU Engineering'`, `'Apps Operations'`, `'BI'`, `'COO
  - R&D'`, `'Carrier Management'`, plus 7 others — clean
  multi-token forms with internal whitespace, hyphens,
  ampersands, and acronym prefixes / suffixes). **Sixtieth
  cohort plugin** with fully-clean department pass-through.
- **D-13 (run #329):** **Zero structural deviations** from the
  Otter (Spec 116) template — making this the **twenty-third**
  Greenhouse-only company-direct plugin in run-history to ship
  as a clean re-spin.
- **D-14 (run #329 — sweep close-out):** **Seventh fresh probe
  sweep fully exhausted at this run** — all 14 live-board hits
  from the run-316 candidate pool have shipped (Airtable,
  Amplitude, AssemblyAI, Bandwidth, Braze, Constant Contact,
  Descript, Fastly, LaunchDarkly, Okta, Otter, PagerDuty,
  Pendo, and now Vonage). The **eighth fresh probe sweep**
  launches at run #330+.

## 11. References

- `packages/plugins/source-company-otter/src/otter.service.ts` —
  closest cohort cousin (zero-deviation clean re-spin, immediate
  predecessor pattern match).
- `packages/plugins/source-company-pendo/src/pendo.service.ts` —
  immediate predecessor (run #328).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
