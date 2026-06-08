# Spec: 147 — Source Company Plugin: Formlabs

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 147                                                                                                                                                                                            |
| Slug           | source-company-formlabs                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #357)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..146                                                                                                                                                                        |

## 1. Problem Statement

Run #356's Spec 146 closed end-to-end (Fairmarkit shipped —
first cohort observation of mojibake-Cyrillic-Es leading-
residue D-10 sub-axis). Run #357 picks up the **thirteenth**
live hit alphabetically from the ninth-fresh-sweep candidate
pool: **Formlabs** (189 visible roles confirmed at run-357
start — ninth-sweep estimate ~95; ~1.99× ratio over-count).

Formlabs, Inc. — operator of the **dominant desktop-and-
benchtop SLA / SLS resin-and-powder 3D-printing platform
pioneered around the consumer-and-pro-grade additive-
manufacturing data model** (founded by Maxim Lobovsky, Natan
Linder, and David Cranor in 2011 as an MIT Media Lab spin-out;
private since the 2021 Series E round at ~$2B unicorn
valuation; ships Form 4 and Form 4L (SLA stereolithography
printers), Fuse 1+ 30W (SLS selective-laser-sintering
printer), Form Auto and Build Platform 2 (automation /
post-processing), and PreForm slicer software across the
desktop-3D-printing / additive-manufacturing / pro-prototyping
vertical — alongside competitors Stratasys, 3D Systems,
Markforged, Carbon, and Ultimaker — with a hybrid distributed
workforce concentrated across Somerville MA (HQ), Berlin,
Tokyo, and Remote across the United States, Europe, and
APAC) — is published at the bare `formlabs` Greenhouse slug
(case-symmetric with the wire `company_name === 'Formlabs'`
after casefold).

## 2. Goals

- Ship a `source-company-formlabs` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-doximity` plugin — Doximity is the closest
  cohort cousin sharing four primary axes: D-08 + D-09 case-
  symmetric + D-10 applied + D-11 omitted.
- **One structural deviation** from Doximity: D-04 sub-axis
  (variant 2 canonical Greenhouse host → variant 40
  `careers.formlabs.com/job/<id>/apply/?gh_jid=<id>` first
  cohort observation — careers-subdomain + `/job/<id>/apply/`
  action-leaf + dual-id; sister to variant 26 (HelloFresh)
  by careers-subdomain prefix and to variant 28 (SoFi) by
  dual-id form, distinct from both by the `/apply/` action-
  segment trailing the path-id).
- **Notable D-10 sub-axis observation**: 1 of the 13 padded
  titles carries a **TRIPLE-trailing-space pad** (`'Robotic
  Systems Integration Engineer (SLA & SLS)   '` — 3 spaces).
  **First cohort observation of triple-trailing-space pad
  form** — distinct from Justworks (Spec 129) double-trailing-
  space sub-axis. `.trim()` is byte-count agnostic and strips
  all three trailing spaces transparently. Plus 1 leading-
  pad title (`' 3D Print Optimization Engineer'`) — third
  cohort observation of leading-pad sub-axis after Chainguard
  (Spec 122), Oscar (Spec 133), and Celonis (Spec 140).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Formlabs postings.
- Formlabs product-API / PreForm / Form 4 / Fuse integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.FORMLABS`** in
> the source registry, so that **a single `siteType:
> [Site.FORMLABS]` request returns Formlabs's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.FORMLABS = 'formlabs'` to the `Site` enum.                                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-formlabs`.                                                                 | must     |
| FR-3  | `FormlabsService.scrape(input)` returns a `JobResponseDto`; never throws.                                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `formlabs-`, `site === Site.FORMLABS`, `companyName === 'Formlabs'`.                  | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 40 `careers.formlabs.com/job/<id>/apply/?gh_jid=<id>`).            | must     |
| FR-13 | D-10 **applied** — title `.trim()` covers trailing-pad sub-axis incl. **first-cohort triple-trailing-space pad** + leading-pad (13 of 189 padded ~6.9 %). | must |
| FR-14 | D-11 **omitted** — 0 of 189 wire department names padded across 16 unique departments.                                   | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.FORMLABS, name: 'Formlabs', category: 'company' })
@Injectable()
export class FormlabsService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **variant-40 URL byte-
  for-byte lock** (`careers.formlabs.com/job/<id>/apply/?gh_jid=<id>`
  careers-subdomain action-leaf form); D-09 case-symmetric
  `'Formlabs'` lock; **D-10 first-cohort triple-trailing-
  space pad lock** (`'Robotic Systems Integration Engineer
  (SLA & SLS)   '` → `'Robotic Systems Integration Engineer
  (SLA & SLS)'`); D-11 clean dept pass-through lock.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #357):** **Wire-shape variant 40 — first cohort
  observation.** `https://careers.formlabs.com/job/<id>/apply/?gh_jid=<id>`
  — HTTPS + careers-subdomain + `/job/<id>/apply/` (singular
  leaf with `/apply/` action segment trailing the path-id) +
  dual-id (path-id + query-id). **Sister to variant 26**
  (HelloFresh) by careers-subdomain prefix and **sister to
  variant 28** (SoFi) by dual-id form, distinct from both
  by the `/apply/` action-segment trailing the path-id. The
  **forty-third distinct wire-shape variant** in the
  company-direct cohort.
- **D-08 (run #357):** Decode-then-strip pipeline. **One-
  hundred-and-third** cohort plugin to apply D-08.
- **D-09 (run #357):** **Omitted** — case-symmetric bare-brand
  wire `'Formlabs'` (8 bytes; case-symmetric vs slug
  `formlabs` after casefold). 0 of 189 padded. **Ninety-
  fourth cohort plugin to omit D-09**.
- **D-10 (run #357):** **APPLIED with trailing-pad form +
  FIRST-COHORT triple-trailing-space pad observation +
  fourth-cohort leading-pad observation.** 13 of 189 wire
  titles padded (~6.9 % pad rate). 1 of the 13 carries
  **triple-trailing-space pad** (`'Robotic Systems
  Integration Engineer (SLA & SLS)   '` — 3 spaces; **first
  cohort observation of triple-pad form** — distinct from
  Justworks (Spec 129) double-pad sub-axis). Plus 1 leading-
  pad title (`' 3D Print Optimization Engineer'` — single
  leading space; **fourth cohort observation of leading-pad
  sub-axis** after Chainguard (Spec 122), Oscar (Spec 133),
  and Celonis (Spec 140)). `.trim()` is byte-count agnostic
  and handles all pad widths and positions transparently.
  **Sixty-fourth cohort plugin to apply D-10**.
- **D-11 (run #357):** **Omitted.** 0 of 189 wire department
  names padded across 16 unique department names (`'Customer
  Strategy & Operations'`, `'Finance'`, `'Form Now'`,
  `'Global Marketing'`, `'Global Sales'`, `'Global Services'`,
  `'Hardware Engineering'`, `'Legal'`, `'Manufacturing'`,
  `'Materials Engineering'`, `'Operations'`, `'People &
  Culture'`, `'Product'`, `'Software Engineering'`,
  `'Spectra'`, `'Systems'` — clean multi-token forms with
  internal whitespace and ampersands). **Eighty-second cohort
  plugin** with fully-clean department pass-through.
- **D-13 (run #357):** **One structural deviation** from the
  Doximity (Spec 127) template — D-04 sub-axis (variant 2
  canonical Greenhouse host → variant 40 careers-subdomain
  `/job/<id>/apply/` action-leaf dual-id). All other axes
  share with Doximity: D-08 + D-09 case-symmetric + D-10
  applied + D-11 omitted.

## 11. References

- `packages/plugins/source-company-doximity/src/doximity.service.ts` —
  closest cohort cousin (one-deviation D-04 sub-axis).
- `packages/plugins/source-company-justworks/src/justworks.service.ts` —
  prior cohort observation of double-trailing-space D-10 sub-axis.
- `packages/plugins/source-company-celonis/src/celonis.service.ts` —
  prior cohort observation of meaningful-volume leading-pad
  D-10 sub-axis.
- `packages/plugins/source-company-fairmarkit/src/fairmarkit.service.ts` —
  immediate predecessor (run #356).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
