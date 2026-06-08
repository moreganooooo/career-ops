# Spec: 115 — Source Company Plugin: Okta

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 115                                                                                                                                                                                            |
| Slug           | source-company-okta                                                                                                                                                                            |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #325)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..114                                                                                                                                                                        |

## 1. Problem Statement

Run #324's Spec 114 closed end-to-end (LaunchDarkly shipped —
fourth TWO-cap PascalCase D-09; deepest second-cap observed).
Run #325 picks up the **tenth** live hit alphabetically from
the seventh-fresh-sweep candidate pool: **Okta** (358 visible
roles confirmed at run-325 start — the run-316 estimate of
~3222 keys was probe-counter-inflated by ~9× via dept/office
IDs, the **largest probe-counter-inflation factor** observed
in the seventh-sweep).

Okta, Inc. — operator of the **dominant identity-and-access-
management platform pioneered around the cloud-IDaaS / SSO /
MFA / lifecycle-management data model** (founded by Todd
McKinnon and Frederic Kerrest in 2009 in San Francisco; public
on the NASDAQ since April 2017 IPO under ticker `OKTA` at
~$6.7B initial valuation; market-cap settled in the $10-25B
band as of 2026; ships the Okta Identity Cloud (Workforce
Identity, Customer Identity Cloud — Auth0 platform acquired
March 2021 for $6.5B), Adaptive MFA, Lifecycle Management,
API Access Management, and Advanced Server Access across the
identity-and-access-management / IDaaS / zero-trust segment —
alongside competitors Microsoft Entra ID (formerly Azure AD),
Ping Identity, OneLogin, ForgeRock, and AWS IAM Identity
Center — with a hybrid distributed workforce concentrated
across San Francisco (HQ), Bellevue, Toronto, Krakow, Bangalore,
London, and Remote across the United States, Canada, the
United Kingdom, Poland, India, the European Union, and the
Asia-Pacific region) — is published at the bare `okta`
Greenhouse slug (case-symmetric with the wire `company_name
=== 'Okta'` after casefold).

## 2. Goals

- Ship a `source-company-okta` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-fastly` plugin — Fastly is the closest
  cohort cousin via shared D-08 + D-09 case-symmetric + D-10
  applied + D-11 omitted axes, AND the closest D-04 sister
  (both variants are HTTPS-scheme `www.`-prefixed brand-domain
  forms with `/<segment>/<segment>/<segment>` paths).
- **One structural deviation** from Fastly:
  1. **D-04 variant 31** (Fastly variant 30 HTTPS
     `/about/jobs/apply` query-only-id; Okta variant 31 HTTPS
     `/company/careers/opportunity/<id>` id-in-path + gh_jid
     query — first cohort observation of variant 31). Variant
     31 is the **id-in-path + gh_jid query** sister to Fastly's
     variant 30 (query-only id), with a different path
     (`/company/careers/opportunity/<id>` rather than
     `/about/jobs/apply`).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Okta postings.
- Okta product-API / Identity Cloud / Auth0 platform
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.OKTA`** in the
> source registry, so that **a single `siteType: [Site.OKTA]`
> request returns Okta's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.OKTA = 'okta'` to the `Site` enum.                                                      | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-okta`.                                              | must     |
| FR-3  | `OktaService.scrape(input)` returns a `JobResponseDto`; never throws.                             | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `okta-`, `site === Site.OKTA`, `companyName === 'Okta'`.      | must     |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 31). Fallback uses canonical Greenhouse variant-2. | must |
| FR-13 | D-10 **applied** — title `.trim()` covers the trailing-pad sub-axis (54 of 358 padded ~15.1 %).   | must     |
| FR-14 | D-11 **omitted** — 0 of 358 wire department names padded.                                         | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.OKTA, name: 'Okta', category: 'company' })
@Injectable()
export class OktaService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-31 URL byte-for-
  byte pass-through (`https://www.okta.com/company/careers/opportunity/<id>?gh_jid=<id>`);
  D-09 case-symmetric `'Okta'` lock; D-10 trailing-pad trim
  lock; D-11 clean dept pass-through with **first-cohort
  observation of suffix-numeric-ID dept naming convention
  (`<name>-<numeric ID>`)** — second cohort observation of
  numeric IDs in dept names after Constant Contact's prefix
  convention.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #325):** **Wire-shape variant 31 — HTTPS +
  `www.`-prefixed brand-domain + `/company/careers/opportunity/<id>` + `?gh_jid=<id>` —
  first cohort observation.** **Thirty-fourth distinct wire-
  shape variant** in the company-direct cohort. Sub-axes:
  (a) HTTPS scheme; (b) `www.`-prefixed brand-domain (same
  prefix as variants 16 / 19 / 20 / 22 / 30); (c) `/company/careers/opportunity/<id>`
  path with a `/company/` prefix-segment, `careers` mid-
  segment, and `opportunity/<id>` leaf — first cohort
  observation of `/company/` prefix-segment AND singular
  `opportunity/<id>` leaf form (ClassPass uses plural
  `careers/opportunities/<id>`); (d) **id-in-path + gh_jid
  query** (Fastly variant 30 has query-only id; Okta variant
  31 has id-in-path AND gh_jid query — the dual-id form).
- **D-08 (run #325):** Decode-then-strip pipeline. **Seventy-
  first** cohort plugin to apply D-08.
- **D-09 (run #325):** **Omitted** — case-symmetric bare-brand
  wire `'Okta'` (4 bytes). **Sixty-second cohort plugin to
  omit D-09**.
- **D-10 (run #325):** **APPLIED with trailing-pad form.** 54
  of 358 wire titles padded (~15.1 % pad rate, all trailing-
  only — `'AI Operations Lead '`, `'Area Sales Director,
  Enterprise '`, `'Communications Data and Insights Manager '`,
  plus 51 others). **Thirty-ninth cohort plugin to apply D-10**.
- **D-11 (run #325):** **Omitted with FIRST-COHORT suffix-
  numeric-ID dept naming sub-axis.** 0 of 358 wire department
  names padded across 76 unique department names — but most
  follow a `<name>-<numeric ID>` suffix-numeric-ID convention
  (`'Accounting Operations-121'`, `'Auth0 DevRel-494'`, `'BT
  Engineering Services-779'`, `'BT Go To Market Technology-173'`,
  `'BT Operations-165'`, `'Brand, Content & Creative-493'`,
  `'Business Operations-150'`, `'CAO Org-120'`, plus 68
  others). **Second cohort observation of numeric IDs in
  department names** after Constant Contact's prefix-numeric-
  ID convention (`'100 Engineering'`, `'126 Design'`, etc.) —
  Okta is the **first** cohort observation of the **suffix**
  form. Standard pass-through preserves the suffix bytes byte-
  for-byte. **Fifty-sixth cohort plugin** with fully-clean
  department pass-through.
- **D-13 (run #325):** **One structural deviation** from the
  Fastly (Spec 113) template: D-04 sub-axis (Fastly variant 30
  HTTPS `/about/jobs/apply` query-only-id; Okta variant 31
  HTTPS `/company/careers/opportunity/<id>` id-in-path + gh_jid
  query).

## 11. References

- `packages/plugins/source-company-fastly/src/fastly.service.ts` —
  closest cohort cousin (variant 30 — the HTTPS `www.`-
  prefixed brand-domain reference).
- `packages/plugins/source-company-launchdarkly/src/launchdarkly.service.ts` —
  immediate predecessor (run #324).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
