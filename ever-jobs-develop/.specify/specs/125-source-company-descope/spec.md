# Spec: 125 — Source Company Plugin: Descope

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 125                                                                                                                                                                                            |
| Slug           | source-company-descope                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #335)                                                                                                                                                                              |
| Created        | 2026-05-04                                                                                                                                                                                     |
| Last updated   | 2026-05-04                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..124                                                                                                                                                                        |

## 1. Problem Statement

Run #334's Spec 124 closed end-to-end (Contentful shipped —
27th clean re-spin off Checkr; crossed 80-plugin D-08-
application threshold). Run #335 picks up the **sixth** live
hit alphabetically from the eighth-fresh-sweep candidate pool:
**Descope** (8 visible roles confirmed at run-335 start —
matches the eighth-sweep estimate of ~8 keys exactly, 1×
inflation; the **second eighth-sweep candidate with 1×
inflation** after Branch).

Descope, Inc. — operator of the **dominant developer-first
authentication-as-a-service platform pioneered around the
no-code-CIAM / passwordless-auth / drag-drop-flows data
model** (founded by Slavik Markovich, Rishi Bhargava, Hila
Stern, Hadas Cassorla, Limor Bergman Gross, Meir Wahnon, and
Gilad Shriki in 2022 in Los Altos, California; raised ~$53M
across rounds at peak ~$200M valuation in February 2022 led
by Lightspeed Venture Partners and GGV Capital; ships Descope
Authentication (passwordless / SSO / MFA / passkeys / social
login), Flows (drag-drop auth-flow builder), Token Exchange,
and Identity Federation across the customer-identity-and-
access-management (CIAM) / authentication-as-a-service /
passwordless segment — alongside competitors Auth0 (Okta),
Clerk, Stytch, FrontEgg, WorkOS, and SuperTokens — with a
hybrid distributed workforce concentrated across Los Altos
(HQ), Tel Aviv, and Remote across the United States and
Israel) — is published at the bare `descope` Greenhouse slug
(case-symmetric with the wire `company_name === 'Descope'`
after casefold).

## 2. Goals

- Ship a `source-company-descope` plugin returning live
  `JobPostDto` rows.
- Match the structural and behavioural shape of the existing
  `source-company-branch` plugin — Branch is the closest
  cohort cousin via shared D-04 variant 2 + D-08 + D-09 case-
  symmetric + D-10 omitted axes.
- **One structural deviation** from Branch:
  1. **D-11 APPLIED with trailing-pad form** (Branch 0/N
     omitted; Descope 2 of 3 unique dept names padded —
     `'Customer Success '` and `'Engineering '`; listing-
     level pad rate 6 of 8 ~75 % — the **highest D-11
     listing-level pad rate observed in the cohort to date**,
     surpassing AssemblyAI's ~43 %).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Backfilling historical Descope postings.
- Descope product-API / Authentication / Flows /
  Token Exchange integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.DESCOPE`** in the
> source registry, so that **a single `siteType: [Site.DESCOPE]`
> request returns Descope's open roles**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.DESCOPE = 'descope'` to the `Site` enum.                                                | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-descope`.                                           | must     |
| FR-3  | `DescopeService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `ALL_SOURCE_MODULES`.                                                 | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each `JobPostDto` has `id` prefixed `descope-`, `site === Site.DESCOPE`, `companyName === 'Descope'`. | must |
| FR-7  | `input.resultsWanted` honoured.                                                                   | must     |
| FR-8  | `input.searchTerm` honoured.                                                                      | should   |
| FR-9  | Network errors caught — returns `{ jobs: [] }`.                                                   | must     |
| FR-10 | ≥ 8 unit tests with mocked HTTP.                                                                  | must     |
| FR-11 | D-08 decode-then-strip pipeline.                                                                  | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` (variant 2).                                        | must     |
| FR-13 | D-10 **omitted** — title emitted byte-for-byte (0 of 8 wire titles padded).                       | must     |
| FR-14 | D-11 **applied** — `.trim()` strips trailing-pad on `'Customer Success '` and `'Engineering '`.    | must     |

## 6. Non-Functional Requirements

NFR-1..NFR-4 — same as cohort baseline.

## 7. Contracts

### 7.1 API / Interface

```ts
@SourcePlugin({ site: Site.DESCOPE, name: 'Descope', category: 'company' })
@Injectable()
export class DescopeService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

All transport errors swallowed; caller sees `{ jobs: [] }`.

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-2 URL pass-
  through; D-09 case-symmetric `'Descope'` lock; D-10 byte-
  for-byte title pass-through (no trim); **D-11 APPLIED lock**
  with `'Customer Success '` padded → `'Customer Success'`
  trimmed.
- Plus standard cohort cases.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-04 (run #335):** Wire-shape variant 2. **Forty-fourth**
  plugin in the cohort to use variant 2.
- **D-08 (run #335):** Decode-then-strip pipeline. **Eighty-
  first** cohort plugin to apply D-08.
- **D-09 (run #335):** **Omitted** — case-symmetric bare-brand
  wire `'Descope'` (7 bytes). **Seventy-second cohort plugin
  to omit D-09**.
- **D-10 (run #335):** **Omitted** — 0 of 8 wire titles
  padded; the plugin emits `listing.title` byte-for-byte
  without a `.trim()`. **Twenty-fourth cohort plugin to omit
  D-10**.
- **D-11 (run #335):** **APPLIED with trailing-pad form.** 2
  of 3 unique wire department names padded (`'Customer
  Success '`, `'Engineering '`); listing-level pad rate 6 of
  8 (~75 %) — the **highest D-11 listing-level pad rate
  observed in the cohort to date**, surpassing AssemblyAI's
  ~43 %. The plugin applies `.trim()` to the wire
  `departments[0].name` byte-for-byte before downstream emit.
  **Eleventh cohort plugin to apply D-11**.
- **D-13 (run #335):** **One structural deviation** from the
  Branch (Spec 121) template: D-11 applied (Branch D-11
  omitted at 0/11 padded; Descope D-11 applied at 6/8 padded
  ~75 % listing-level rate).

## 11. References

- `packages/plugins/source-company-branch/src/branch.service.ts` —
  closest cohort cousin (variant 2 + D-09 case-symmetric +
  D-10 omitted reference).
- `packages/plugins/source-company-betterment/src/betterment.service.ts` —
  most recent D-11-applying cousin (run #330).
- `packages/plugins/source-company-contentful/src/contentful.service.ts` —
  immediate predecessor (run #334).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
- `packages/common/src/utils/html-utils.ts`
- `docs/SOURCE_ADOPTION_BACKLOG.md`
- `docs/PLUGIN_ARCHITECTURE.md`
