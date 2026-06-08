# Spec: 088 — Source Company Plugin: Squarespace

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 088                                                                                                                                                                                            |
| Slug           | source-company-squarespace                                                                                                                                                                     |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #298)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..087                                                                                                                                                                        |

## 1. Problem Statement

Run #297's Spec 087 closed end-to-end (Scopely shipped). Run
#298 picks up the **tenth** live hit alphabetically from the
fifth-fresh-sweep candidate pool: **Squarespace** (36 roles
confirmed at run-298 start — significantly lower than the run-289
probe-counter estimate of ~72 due to the same probe-counter
inflation pattern).

Squarespace, Inc. — operator of the **dominant all-in-one
website-builder + ecommerce / scheduling / domains platform
pioneered around the templated-CMS-and-domain-registrar data
model** (founded by Anthony Casalena in 2003 in New York City;
IPO'd on NYSE as `SQSP` in May 2021 via direct listing; ships a
unified subscription product spanning website-builder, ecommerce
storefront, Acuity-Scheduling appointment-booking, and domain-
registrar across the SMB-website segment — alongside competitors
Wix, Shopify, Weebly, GoDaddy, and WordPress.com — with a hybrid
distributed workforce concentrated across New York City, Dublin,
Portland OR, and Remote across the United States, Ireland, and
the United Kingdom) — is published at the bare `squarespace`
Greenhouse slug (the lowercase brand name; case-symmetric with
the wire `company_name === 'Squarespace'`) and was confirmed
live via run #298's HTTP 200 probe of
`https://api.greenhouse.io/v1/boards/squarespace/jobs?content=true`
(36 open roles confirmed at run-298 start). Squarespace publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 22** — the **HTTP-scheme** (not HTTPS) `www.`-prefixed
brand-domain `/about/careers` query-only-id shape
`http://www.squarespace.com/about/careers?gh_jid=<id>` — making
this the **first** plugin in the cohort to use variant 22 — the
**twenty-fifth distinct wire-shape variant** in the company-
direct cohort, AND the **first cohort observation of HTTP
scheme** in the wire URL (every prior cohort variant uses HTTPS).

## 2. Goals

- Ship a `source-company-squarespace` plugin returning live
  `JobPostDto` rows for the public Squarespace careers board
  with **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-marqeta` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.SQUARESPACE` enum value, `id`
  prefixed `squarespace-`) — Marqeta is the closest behavioural
  cousin because both share four primary axes: D-08 entity-
  decode-then-tag-strip, D-09 omitted with case-symmetric bare-
  brand wire form, D-10 applied, and D-11 omitted. Squarespace
  introduces **one structural deviation**: D-04 wire-shape
  variant 22 (the **first cohort plugin to use this previously-
  unobserved HTTP-scheme shape**).
- Bundle a unit-test suite (≥ 8 cases).
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.

**Cohort observation of note:** Squarespace's wire URL uses the
**HTTP scheme** rather than HTTPS — this is the first such
observation across all 87 prior company-direct cohort plugins.
The `http://` scheme is not a security incident — every modern
browser auto-upgrades the URL to HTTPS via HSTS preload — but
it is a noteworthy wire-side anomaly worth capturing as a
regression guard. The plugin emits the wire URL byte-for-byte
to preserve fidelity; consumers concerned about scheme can
upgrade after read.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support.
- Any locale / search-term / location filtering beyond what
  `source-company-marqeta` already supports.
- A dedicated salary parser pass.
- Backfilling historical Squarespace postings.
- Squarespace product-API / website-builder / ecommerce /
  domain-registrar integration.
- HTTP→HTTPS scheme upgrade in the plugin itself. Consumers
  needing HTTPS should apply the upgrade post-read; the plugin
  preserves the wire byte-for-byte.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.SQUARESPACE`** in
> the source registry, so that **a single `siteType:
> [Site.SQUARESPACE]` request returns Squarespace's open roles
> without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of
> HTTP-scheme wire URL in the cohort (variant 22)**, so that
> **the existing byte-for-byte URL pass-through pattern is
> validated against the HTTP scheme-axis without modification**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Squarespace**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.SQUARESPACE = 'squarespace'` to `packages/models/src/enums/site.enum.ts`.               | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-squarespace` under `packages/plugins/`.             | must     |
| FR-3  | `SquarespaceService.scrape(input)` returns a `JobResponseDto`; never throws.                      | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `squarespace-`, `site === Site.SQUARESPACE`, and `companyName === 'Squarespace'` (D-09 omitted; case-symmetric bare-brand). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/squarespace.service.spec.ts`, all using mocked HTTP.   | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags.                | must     |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving variant-22 shape `http://www.squarespace.com/about/careers?gh_jid=<id>` — note **HTTP scheme**, not HTTPS). The **fallback** `jobUrl` constructor uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/squarespace/jobs/<id>` (HTTPS — same fallback strategy as ClassPass / Epic Games / fuboTV / Lattice / Stitch Fix / Udemy / Bitwarden / Fivetran / Lookout / Peloton). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 9 of 36 wire titles in the run-298 probe carry trailing ASCII-space padding (~25 % pad rate). | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 36 wire department names padded. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 36-job page.                                         |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on a 36-job page.                                       |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only.                           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[SquarespaceModule]})` resolves. |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-squarespace/src/squarespace.service.ts
@SourcePlugin({ site: Site.SQUARESPACE, name: 'Squarespace', category: 'company' })
@Injectable()
export class SquarespaceService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. |

## 8. Test Plan

- ≥ 8 cases. Happy-path test asserts variant-22 URL byte-for-
  byte pass-through INCLUDING the **HTTP scheme** (must contain
  `http://` AND must NOT contain `https://www.squarespace.com/`),
  D-10 trim lock, D-11 omission lock.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01..D-03 (run #298):** Wrap Greenhouse public API; skip
  Harvest API; no salary parser hook.
- **D-04 (run #298):** **Wire-shape variant 22 — HTTP-scheme
  `www.`-prefixed brand-domain `/about/careers` query-only-id —
  first cohort observation of HTTP scheme.** Squarespace
  publishes `absolute_url` on a previously-unobserved shape
  `http://www.squarespace.com/about/careers?gh_jid=<id>` with
  three new sub-axes:
  1. **HTTP scheme** (not HTTPS) — distinct from every prior
     cohort variant which all use HTTPS. The `http://` scheme
     is not a security concern (HSTS preload auto-upgrades in
     all modern browsers) but is a wire-side anomaly worth
     capturing as a regression guard. **First cohort
     observation of HTTP scheme.**
  2. **`www.`-prefixed brand-domain** — same `www.` prefix as
     variants 16, 19, 20 (Stitch Fix, Fivetran, Lookout).
  3. **`/about/careers` path** — distinct from variant 19's
     singular `/careers/job` and variant 20's `/careers/job-
     post`; the `/about/` segment prefix is a marketing-page
     ancestor distinct from prior cohort variants.
  Single `gh_jid` query parameter. **First** plugin in the
  cohort to use **wire-shape variant 22** — the **twenty-fifth
  distinct wire-shape variant** in the company-direct cohort.

  The plugin emits `listing.absolute_url` byte-for-byte
  including the `http://` scheme. The **fallback** `jobUrl`
  constructor defaults to the canonical Greenhouse **variant-2**
  form `https://job-boards.greenhouse.io/squarespace/jobs/<id>`
  (HTTPS) — same fallback strategy as ClassPass / Epic Games /
  fuboTV / Lattice / Stitch Fix / Udemy / Bitwarden / Fivetran /
  Lookout / Peloton.
- **D-05 (run #298):** Use Greenhouse slug `squarespace`.
- **D-06 (run #298):** Class names are `SquarespaceService` /
  `SquarespaceModule`.
- **D-07 (run #298):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-tenth live-board hit
  (after Bitwarden #289, Calendly #290, DataCamp #291, Fivetran
  #292, Lookout #293, Marqeta #294, New Relic #295, Peloton
  #296, Scopely #297).
- **D-08 (run #298):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`. **Forty-
  fourth** company-direct plugin to apply D-08.
- **D-09 (run #298):** Brand-name trim **omitted** with case-
  symmetric bare-brand wire form. Wire `company_name ===
  'Squarespace'` byte-for-byte (11 bytes — fully clean, case-
  symmetric with the lowercase slug). **Thirty-seventh cohort
  plugin to omit D-09**.
- **D-10 (run #298):** Wire-title `.trim()` deviation is
  **applied**. 9 of 36 wire titles in the run-298 probe carry
  trailing ASCII-space padding (~25 % pad rate — high; e.g.
  `'Connections & Community Lead '`, `'Lead FP&A Analyst,
  Consolidations '`, `'Manager, Detection & Incident Response '`,
  `'Product Design Manager, Websites '`, `'Senior Product
  Designer, Domains & Email '`). Pad-form distribution: 0
  leading-only, 9 trailing-only, 0 dual. **Twenty-fourth cohort
  plugin to apply D-10**.
- **D-11 (run #298):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 36 wire department names
  padded (`'Engineering (Domains & Apps)'`, `'People'`,
  `'Finance'`, `'Domains & Applications'`, `'Legal &
  Communications'`, `'Engineering'`, `'Product'`, `'Customer
  Operations'` — clean multi-token forms with internal
  whitespace, ampersands, and parentheses). **Thirty-fourth
  cohort plugin** with fully-clean department pass-through.
- **D-12 (run #298):** Tenth plugin in the fifth-fresh-sweep
  pool processing.
- **D-13 (run #298):** **One structural deviation** from the
  Marqeta (Spec 084) template — D-04 wire-shape variant 22
  (first cohort plugin to use variant 22; first cohort
  observation of HTTP scheme). All other axes share with
  Marqeta: D-08 entity-decode-then-tag-strip, D-09 omitted with
  case-symmetric bare-brand wire, D-10 applied, D-11 omitted.

## 11. References

- `packages/plugins/source-company-marqeta/src/marqeta.service.ts` —
  closest behavioural cousin (one deviation: D-04 variant 22 vs
  variant 2).
- `packages/plugins/source-company-peloton/src/peloton.service.ts` —
  immediate predecessor in fifth-sweep pool.
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts` —
  full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
