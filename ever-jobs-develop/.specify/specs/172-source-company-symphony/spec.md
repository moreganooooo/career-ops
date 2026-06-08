# Spec: 172 — Source Company Plugin: Symphony

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 172                                                                                                                                                                                            |
| Slug           | source-company-symphony                                                                                                                                                                        |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #382)                                                                                                                                                                              |
| Created        | 2026-05-09                                                                                                                                                                                     |
| Last updated   | 2026-05-09                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..171                                                                                                                                                                        |

## 1. Problem Statement

Run #381's Spec 171 closed end-to-end (SimpliSafe shipped —
50th near-clean re-spin off GoCardless; 8th cohort plugin
with TWO-cap PascalCase D-09 sub-axis; third caps-at-0/6 sub-
pattern after LaunchDarkly + ComplyAdvantage). Run #382 picks
up the **twentieth** live hit alphabetically from the tenth-
fresh-sweep candidate pool: **Symphony** (16 visible roles
confirmed at run-382 start — tenth-sweep estimate ~18; ~0.89×
ratio, 2-key under-count).

Symphony Communication Services LLC — operator of the
**dominant institutional-grade encrypted-collaboration-as-a-
service platform pioneered around the financial-services
secure-messaging data model** (founded by Goldman Sachs,
JPMorgan, Bank of America, BlackRock, BNY Mellon, Citadel,
Citi, Credit Suisse, Deutsche Bank, HSBC, Jefferies, Maverick
Capital, Morgan Stanley, Nomura, and Wells Fargo as the
"Symphony Communication Services Holdings LLC" consortium in
2014 in Palo Alto, CA after the 2014 acquisition of the
Perzo encrypted-messaging platform; private since the 2019
Standard Industries / Lakestar Series E round at $1.4B
unicorn valuation; ships Symphony Messaging, Voice
Collaboration, Symphony Markets (Cloud9 voice trading), and
Symphony Manage across the institutional-finance / front-
office-trading / encrypted-collaboration vertical — alongside
competitors Bloomberg Chat / Bloomberg IB, Microsoft Teams,
Refinitiv Eikon Messenger, Slack, ICE Chat, and FactSet
Connect — with a hybrid distributed workforce concentrated
across Palo Alto (HQ), New York City, London, Singapore,
Sophia Antipolis (France), Belfast, and Remote across the
United States, EMEA, and APAC) — is published at the bare
`symphony` Greenhouse slug (case-asymmetric vs the wire
`company_name === 'Symphony Communication Services'` —
**fifth cohort observation of slug-truncation D-09 sub-axis**;
slug truncates the wire to the first token only).

## 2. Goals

- Ship a `source-company-symphony` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-descope` plugin — Descope is the closest
  cohort cousin sharing **D-10 omitted + D-11 applied**.
- **Two structural deviations** off Descope:
  - **D-04 sub-axis** — variant 2 → **NEW variant 45 (first
    cohort observation)**: HTTPS + bare brand-domain `.com`
    (no `www.`) + 2-segment `/company/apply` apply-page path
    + query-only `?gh_jid=<id>` form. The **forty-eighth
    distinct wire-shape variant** in the company-direct
    cohort (after Samsara's variant 44 at Spec 168). Distinct
    from variant 13 (ComplyAdvantage) by absence of path-id
    leaf and absence of duplicating query-id; distinct from
    variant 32 (Betterment) by absence of `www.` prefix and
    absence of duplicating query-id; distinct from variant 43
    (Netskope) by absence of `www.` prefix and the apply-page
    path leaf; distinct from variant 44 (Samsara) by absence
    of `www.` prefix and absence of path-id leaf.
  - **D-09 sub-axis** — case-symmetric bare brand → **fifth
    cohort observation of slug-truncation D-09 sub-axis**
    (after Oscar / BEAM / Founders / Fox). Wire `company_name
    === 'Symphony Communication Services'` (31 bytes — three-
    token corp-suffix descriptive entity name with two
    internal whitespace bytes); slug `symphony` is 8 bytes
    lowercase — matches the first wire token only; truncates
    2 trailing tokens (`Communication Services`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Symphony postings.
- Symphony Messaging / Voice Collaboration / Markets API
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SYMPHONY`** in
> the source registry, so that **a single `siteType:
> [Site.SYMPHONY]` request returns Symphony's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                                              | Priority |
| ----- | ------------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-1  | Add `Site.SYMPHONY = 'symphony'` to the `Site` enum.                                                                     | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-symphony`.                                                                 | must     |
| FR-3  | `SymphonyService.scrape(input)` returns a `JobResponseDto`; never throws.                                                | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                                        | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.                             | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `symphony-`, `site === Site.SYMPHONY`, `companyName === 'Symphony Communication Services'`. | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                                          | must     |
| FR-8  | `input.searchTerm` honoured.                                                                                             | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                                          | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                                         | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                                         | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 45 vanity-domain pass-through; variant-2 fallback when wire absent). | must     |
| FR-13 | D-10 **omitted** — title pass-through (0 of 16 padded).                                                                  | must     |
| FR-14 | D-11 **applied** — `departments[0].name` `.trim()` covers trailing-pad sub-axis (1 of 6 unique padded).                  | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.SYMPHONY, name: 'Symphony Communication Services', category: 'company' })
@Injectable()
export class SymphonyService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts **NEW variant-45 vanity-
  domain URL byte-for-byte lock** (`https://symphony.com/company/apply?gh_jid=<id>`
  HTTPS + bare brand-domain on `.com` + 2-segment `/company/apply`
  apply-page path + query-only `?gh_jid=<id>` form); variant-2
  fallback test (when wire absent); **D-09 slug-truncation
  multi-token corp-suffix wire pin** (`'Symphony Communication
  Services'` 31 bytes; slug `symphony` 8 bytes — 5th cohort
  observation of slug-truncation D-09 sub-axis); **D-10
  OMITTED title byte-for-byte pass-through lock** (no `.trim()`
  operation); **D-11 trailing-pad dept-trim lock** (`'Customer
  Experience '` → `'Customer Experience'`).
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #382):** **NEW variant 45 (first cohort
  observation)** — HTTPS + bare brand-domain `.com` (no
  `www.`) + 2-segment `/company/apply` apply-page path +
  query-only `?gh_jid=<id>` form. The **forty-eighth distinct
  wire-shape variant** in the company-direct cohort. The
  plugin emits `listing.absolute_url` byte-for-byte; the
  fallback constructor (when the wire omits `absolute_url`)
  defaults to the canonical Greenhouse variant-2 form
  `https://job-boards.greenhouse.io/symphony/jobs/<id>`
  rather than reconstructing the variant-45 vanity-domain
  shape (same fallback strategy as Samsara / Klaviyo / Bird /
  Collective Health / Netskope — only the canonical
  Greenhouse host is guaranteed-resolvable for all listing
  IDs).
- **D-08 (run #382):** Decode-then-strip pipeline. **One-
  hundred-and-twenty-eighth** cohort plugin to apply D-08.
- **D-09 (run #382):** **Omitted** with **fifth-cohort slug-
  truncation asymmetric wire form** (after Oscar Spec 133 /
  BEAM Spec 136 / Founders Spec 148 / Fox Spec 149). Wire
  `company_name === 'Symphony Communication Services'` byte-
  for-byte (31 bytes — three-token corp-suffix descriptive
  entity name with two internal ASCII whitespace bytes). Slug
  `symphony` is 8 bytes lowercase — matches the first wire
  token only; truncates 2 trailing tokens (`Communication
  Services`). Distinct from the four prior slug-truncation
  observations: Oscar dropped 0 tokens (slug-extra-word
  added); BEAM was acronym-expansion (slug = wire acronym);
  Founders dropped 4 tokens (legal-entity name); Fox dropped
  5 tokens. **Symphony drops 2 trailing tokens** — the
  shortest non-zero token-truncation factor in the cohort to
  date. **One-hundred-and-nineteenth cohort plugin to omit
  D-09**.
- **D-10 (run #382):** **OMITTED.** 0 of 16 wire titles in
  the run-382 probe carry pad bytes. The plugin emits
  `listing.title` byte-for-byte without a `.trim()`. **Thirty-
  eighth cohort plugin to omit D-10**.
- **D-11 (run #382):** **APPLIED with trailing-pad form.** 1
  of 6 unique wire department names padded (`'Customer
  Experience '`); the plugin applies `.trim()` to the wire
  `departments[0].name` byte-for-byte before downstream emit.
  **Twentieth cohort plugin to apply D-11**. The remaining 5
  unique department names are clean (`'Business Operations'`,
  `'Engineering'`, `'Human Resources'`, `'Product
  Management'`, `'Sales and Account Management'`).
- **D-13 (run #382):** **Two structural deviations** from the
  Descope (Spec 125) template — D-04 sub-axis (variant 2 →
  NEW variant 45) AND D-09 sub-axis (case-symmetric bare
  brand → fifth-cohort slug-truncation multi-token corp-
  suffix descriptive entity wire form). The trim semantics
  remain unchanged at the `.trim()` boundary.

## 11. References

- `packages/plugins/source-company-descope/src/descope.service.ts` —
  closest cohort cousin (D-10 omitted + D-11 applied).
- `packages/plugins/source-company-fox/src/fox.service.ts` —
  prior cohort plugin with slug-truncation D-09 sub-axis.
- `packages/plugins/source-company-samsara/src/samsara.service.ts` —
  prior cohort plugin with vanity-domain wire URL + variant-2
  fallback strategy.
- `packages/plugins/source-company-simplisafe/src/simplisafe.service.ts` —
  immediate predecessor (run #381).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
