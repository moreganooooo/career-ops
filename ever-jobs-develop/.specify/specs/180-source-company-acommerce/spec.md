# Spec: 180 — Source Company Plugin: aCommerce

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 180                                                                                                                                                                                            |
| Slug           | source-company-acommerce                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #390)                                                                                                                                                                              |
| Created        | 2026-05-20                                                                                                                                                                                     |
| Last updated   | 2026-05-20                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..179                                                                                                                                                                        |

## 1. Problem Statement

Run #389's Spec 179 closed end-to-end (ACOG shipped — fifth
plugin in the eleventh fresh probe sweep; first cohort
observation of (a) acronym-by-initials slug derivation from a
multi-token wire form AND (b) all-lowercase connector-token
skip in slug derivation). Run #390 is the **sixth** plugin in
the eleventh fresh probe sweep with a freshly-sampled
candidate pulled from the upstream
`OTHERS/Ats-scrapers/ats-companies/greenhouse.csv` corpus
(5 004 verified Greenhouse tenants, unchanged on `71d9a56`
after a 2-commit churn-pulse since run #389 confined to
EURES / Workday scrapers + pipeline guards — **zero corpus
churn** on the `ats-companies/` directory).

The eleventh-sweep alphabetical continuation after ACOG
yielded the next viable live-board hit at **aCommerce**
(aCommerce — Southeast-Asian e-commerce enablement and
fulfilment operator — 60 visible roles confirmed at run-390
start via direct curl probe of
`https://api.greenhouse.io/v1/boards/acommerce/jobs?content=true`).

aCommerce — operator of the **dominant Southeast-Asian end-
to-end e-commerce enablement and brand-fulfilment platform**
providing brand-strategy / channel-management, store
operations, performance marketing, creative content
production, demand and supply planning, regional
warehousing-and-fulfilment, last-mile distribution, customer
service, and data-analytics services for global consumer
brands and retailers expanding across Southeast-Asia (founded
in 2013 by Paul Srivorakul and Tom Srivorakul in Bangkok,
Thailand; privately-held SEA-headquartered direct-to-consumer
enablement operator; serves consumer-packaged-goods brands,
fashion-and-beauty brands, electronics brands, and
multinational retailers in Thailand, Indonesia, Singapore,
Malaysia, and the Philippines; ships brand-operations
playbooks, regional warehousing infrastructure, last-mile
fulfilment networks, performance-marketing engines, creative
content studios, and proprietary brand-management technology
across the Southeast-Asia e-commerce enablement / brand-
fulfilment segment — alongside peers Synagie, Luxasia, GHL
Systems, aCommerce parent partners, and regional logistics
operators — with a hybrid distributed workforce concentrated
across Bangkok (HQ), Jakarta, Manila / Taguig, Singapore, and
Kuala Lumpur) — publishes its consolidated careers board
through Greenhouse at the bare slug `acommerce` (wire
`company_name === 'aCommerce'` — see § 10 D-09).

**Wire-form D-09 observation:** the wire
`company_name === 'aCommerce'` is a **first cohort
observation of the single-token camelCase ONE-cap-at-byte-1
D-09 sub-pattern** — single 9-byte wire-token with byte 0
all-lowercase + byte 1 capitalized + bytes 2-8 all-lowercase;
slug `acommerce` is the byte-for-byte lowercase of the wire.
Cap positions: cap at byte 1 ONLY (`'C'`), with lowercase at
bytes 0/2/3/4/5/6/7/8 (`'a'`, `'o'`, `'m'`, `'m'`, `'e'`,
`'r'`, `'c'`, `'e'`).

Byte-by-byte:

- byte 0: `'a'` (lowercase)
- byte 1: `'C'` (UPPERCASE — sole cap)
- byte 2: `'o'` (lowercase)
- byte 3: `'m'` (lowercase)
- byte 4: `'m'` (lowercase)
- byte 5: `'e'` (lowercase)
- byte 6: `'r'` (lowercase)
- byte 7: `'c'` (lowercase)
- byte 8: `'e'` (lowercase)

**First cohort observation of (a) single-token camelCase
classical wire form (lowercase-prefix + single-cap + lowercase-
tail) AND (b) cap-at-byte-1-only D-09 sub-pattern** — prior
ONE-cap observations (Postscript, Recharge, Symphony, etc.)
all carried the cap at byte 0 (PascalCase classical). The
prior lowercase-first observation at xAI (Spec 103) carried
TWO caps at bytes 1 and 2 (`'xAI'`), not a single cap with
lowercase tail. aCommerce is structurally distinct from both
templates and constitutes a fundamentally novel D-09
single-token form.

**Wire-form D-10 observation:** **9 of 60 listings carry
trailing ASCII-space padding** in the wire `title` field
(e.g., `'Intern - Live Streaming (Content & Creative) '`,
`'Key Account Manager '` ×2, `'Manager - Accounting '`,
`'Manager - Key Account Management '`, `'Media Planner -
Senior Specialist '`, `'Media Planner - Specialist '`,
`'Senior Specialist - Co-Producer '`, `'Video Production
Coordinator (Freelancer 6 months) '`) — a ~15.0 % pad rate.
The plugin's `.title.trim()` overlay strips the padding
byte-for-byte; emitted titles are pad-free.

**Wire-form D-11 observation:** **0 of 13 unique department
names carry trailing ASCII-space padding** in the wire — all
department names flow through byte-for-byte clean
(`'Account & Finance'`, `'Business Development'`,
`'Commercial Finance'`, `'Communication Planning &
Strategy'`, `'Creative Services'`, `'Financial Planning &
Analysis'`, `'Internship Program'`, `'Key Account
Management'`, `'Marketing Services'`, `'Operations-SCM'`,
`'Operations-Store Ops'`, `'Product Development'`,
`'Professional Services'`). The plugin omits D-11 — wire
`departments[0].name` flows through byte-for-byte without
`.trim()` overlay.

## 2. Goals

- Ship a `source-company-acommerce` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-acog` plugin (closest cohort cousin with
  the **variant-2 + D-08 + D-10 trailing-pad applied + D-11
  omitted** profile) but with **one structural deviation**:
  1. **D-09 sub-axis:** ACOG's "acronym-by-initials slug
     derivation from a multi-token PascalCase + lowercase-
     connector wire form" (6 wire-tokens, 4 PascalCase + 2
     lowercase-connector; slug formed by sampling first
     letter of each PascalCase token with connector-skip) →
     **single-token camelCase ONE-cap-at-byte-1 wire form**
     (`'aCommerce'` 9 bytes — single wire-token; byte 0
     lowercase, byte 1 cap, bytes 2-8 lowercase; slug
     byte-for-byte lowercase of wire). **First cohort
     observation of (a) single-token camelCase classical
     wire form AND (b) cap-at-byte-1-only D-09 sub-pattern.**
- Bundle a unit-test suite (≥ 9 cases — adds a dedicated D-09
  camelCase ONE-cap-at-byte-1 lock case beyond the standard
  7-case cohort baseline; reuses the D-10 trailing-pad
  title-trim lock case from ACOG; D-11 clean-pass-through
  dept lock).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical aCommerce postings.
- aCommerce's brand-client list (the plugin scrapes the
  consolidated careers board only).
- Regional country-specific subsidiaries (aCommerce
  Thailand / Indonesia / Singapore / Malaysia / Philippines)
  separately — they all publish through the consolidated
  `acommerce` Greenhouse board.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.ACOMMERCE`** in
> the source registry, so that **a single `siteType:
> [Site.ACOMMERCE]` request returns aCommerce's open
> Southeast-Asia roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                       | Priority |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.ACOMMERCE = 'acommerce'` to the `Site` enum.                                                                             | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-acommerce`.                                                                          | must     |
| FR-3  | `AcommerceService.scrape(input)` returns a `JobResponseDto`; never throws.                                                         | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                                  | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                                       | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `acommerce-`, `site === Site.ACOMMERCE`.                                                       | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                                    | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                                       | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                                    | must     |
| FR-10 | ≥ 9 unit tests with mocked HTTP.                                                                                                   | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                                   | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2 modern hosted-board).                                                     | must     |
| FR-13 | D-10 **applied (trailing-pad form)** — 9 of 60 wire titles padded in run-390 probe; `.title.trim()` overlay strips padding.        | must     |
| FR-14 | D-11 **omitted (clean pass-through)** — 0 of 13 wire department names padded; wire `departments[0].name` flows through byte-for-byte. | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.ACOMMERCE, name: 'aCommerce', category: 'company' })
@Injectable()
export class AcommerceService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 9 cases. Happy-path test asserts variant-2 URL pass-
  through (modern hosted-board apex
  `job-boards.greenhouse.io/acommerce/jobs/<id>`); **D-09
  camelCase ONE-cap-at-byte-1 wire pin** (`'aCommerce'` 9
  bytes; single wire-token; byte 0 lowercase, byte 1 cap
  (`'C'`), bytes 2-8 lowercase; slug `acommerce` is byte-
  for-byte lowercase of wire); **D-10 trailing-pad title-
  trim lock** (wire `'Key Account Manager '` 20 bytes →
  emitted `'Key Account Manager'` 19 bytes); **D-11
  clean-pass-through dept lock** (every emitted `department`
  byte-equals wire `departments[0].name`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #390):** Wire-shape variant 2 (modern hosted-
  board canonical Greenhouse host
  `job-boards.greenhouse.io/<slug>/jobs/<id>`).
  **Seventy-ninth** plugin in the cohort to use variant 2.
- **D-08 (run #390):** Decode-then-strip pipeline. **One-
  hundred-and-thirty-sixth** cohort plugin to apply D-08.
- **D-09 (run #390):** **Omitted at runtime** — wire
  `company_name === 'aCommerce'` flows through byte-for-byte.
  **Single-token camelCase ONE-cap-at-byte-1 sub-pattern**
  (slug `acommerce` is byte-for-byte lowercase of wire).
  Sub-pattern details:
  - Wire is 9 bytes single token: byte 0 `'a'` lowercase,
    byte 1 `'C'` UPPERCASE (sole cap), bytes 2-8 `'ommerce'`
    all lowercase.
  - Slug is 9-byte lowercase `acommerce` — formed by
    lowercasing byte 1 (`'C'` → `'c'`) and leaving the other
    8 bytes unchanged.
  - **First cohort observation of (a) single-token camelCase
    classical wire form (lowercase-prefix + single-cap +
    lowercase-tail) AND (b) cap-at-byte-1-only D-09 sub-
    pattern.** Prior ONE-cap observations all carried the cap
    at byte 0 (PascalCase classical). Prior lowercase-first
    observation at xAI (Spec 103) carried TWO caps at bytes
    1 and 2 (`'xAI'`), not a single cap with lowercase tail.
  - **127th** cohort plugin to omit D-09 (126 → 127).
- **D-10 (run #390):** **Wire-title `.trim()` applied
  (trailing-pad form).** 9 of 60 wire titles in the run-390
  probe carry trailing ASCII-space padding (~15.0 % pad
  rate). **Eighty-third cohort plugin to apply D-10**.
- **D-11 (run #390):** **Omitted (clean pass-through).** 0
  of 13 unique wire department names padded; wire
  `departments[0].name` flows through byte-for-byte.
  **107th cohort plugin with fully-clean department pass-
  through (D-11 omitted).**
- **D-13 (run #390):** **One structural deviation** from
  the ACOG template — D-09 sub-axis (acronym-by-initials
  with connector-skip multi-token form → single-token
  camelCase ONE-cap-at-byte-1 form).

## 11. References

- `packages/plugins/source-company-acog/src/acog.service.ts` —
  closest variant-2 cousin (variant 2 + D-08 + D-10 trailing-
  pad applied + D-11 omitted).
- `packages/plugins/source-company-xai/src/xai.service.ts` —
  prior lowercase-first single-token D-09 plugin (3-byte
  TWO-cap-at-1/2 form, structurally distinct from
  aCommerce's 9-byte ONE-cap-at-1 form).
- `packages/plugins/source-company-aclu/src/aclu.service.ts` —
  prior variant-2 + D-10 applied + D-11 applied cousin.
- `packages/plugins/source-company-accuweather/src/accuweather.service.ts` —
  prior variant-2 + D-10 applied + D-11 applied template.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
