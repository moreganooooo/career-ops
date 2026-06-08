# Spec: 083 — Source Company Plugin: Lookout

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 083                                                                                                                                                                                            |
| Slug           | source-company-lookout                                                                                                                                                                         |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #293)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..082                                                                                                                                                                        |

## 1. Problem Statement

Run #292's Spec 082 closed end-to-end (Fivetran shipped — first
cohort observation of D-09 application; first cohort plugin to use
wire-shape variant 19 — `www.`-prefixed brand-domain singular
`/careers/job` query-only-id shape). Run #293 picks up the
**fifth** live hit alphabetically from the fifth-fresh-sweep
candidate pool: **Lookout** (6 roles confirmed at run-293 start —
the run-289 probe-counter estimate of ~12 was inflated by counting
all `"id":` JSON keys including department/office IDs).

Lookout, Inc. — operator of the **mobile-endpoint security
pipeline pioneered around the cloud-delivered phishing-and-
content-protection (PCP) longitudinal-telemetry data model**
(founded by John Hering, Kevin Mahaffey, and James Burgess in
2007 in San Francisco, CA; raised $400M+ across rounds led by
Andreessen Horowitz, Khosla Ventures, Greylock Partners, Index
Ventures, and Accel Partners; ships a unified mobile-endpoint
detection-and-response (Mobile EDR) + zero-trust secure-access
(ZTNA / SSE) platform across the cybersecurity segment —
alongside competitors Zimperium, Wandera, MobileIron, Proofpoint,
and Cisco Umbrella — with a hybrid distributed workforce
concentrated across San Francisco, Boston, Reston VA, Toronto,
and Remote across the United States, Canada, and Europe) — is
published at the bare `lookout` Greenhouse slug (the lowercase
brand name; case-symmetric with the wire `company_name ===
'Lookout'`) and was confirmed live via run #293's HTTP 200 probe
of `https://api.greenhouse.io/v1/boards/lookout/jobs?content=true`
(6 open roles confirmed at run-293 start). Lookout publishes its
`absolute_url` on a **previously-unobserved wire-shape variant
20** — the `www.`-prefixed brand-domain singular `/careers/job-
post` query-only-id shape
`https://www.lookout.com/careers/job-post?gh_jid=<id>` — making
this the **first** plugin in the cohort to use variant 20 — the
**twenty-third distinct wire-shape variant** in the company-
direct cohort.

Aggregator-callers asking for "all jobs at major mobile-endpoint
security / Mobile EDR / ZTNA vendors" must currently either
(a) deduce the Greenhouse slug `lookout` and call
`source-ats-greenhouse` by hand, or (b) post-filter the firehose
of every Greenhouse-hosted role for a company-name match — both
paths bypass the per-source health and circuit-breaker plumbing
that the company-direct plugins sit behind (Spec 005).

The gap closes when we add a thin company-direct plugin pinning
the `lookout` Greenhouse slug behind its own `Site` enum value,
in the identical shape the codebase already uses seventy-one
times.

## 2. Goals

- Ship a `source-company-lookout` plugin returning live
  `JobPostDto` rows for the public Lookout careers board with
  **no caller config required**.
- Match the structural and behavioural shape of the existing
  `source-company-fivetran` plugin (Greenhouse-backed,
  `category: 'company'`, `Site.LOOKOUT` enum value, `id`
  prefixed `lookout-`) — Fivetran is the closest structural
  cousin because both use a **`www.`-prefixed brand-domain
  singular-`/careers/job*` non-Greenhouse-host wire shape with
  a Greenhouse variant-2 fallback** (Fivetran variant 19 with
  `/careers/job`; Lookout variant 20 with `/careers/job-post`),
  both have the case-symmetric clean slug/wire base form
  (Fivetran case-symmetric-after-trim `'Fivetran '`→`'Fivetran'`/
  `fivetran`; Lookout fully clean `'Lookout'`/`lookout`), both
  emit HTML-entity-encoded content requiring D-08, both omit D-10
  (titles fully clean), and both omit D-11 (departments fully
  clean). Lookout has **one structural deviation** from the
  Fivetran template — D-04 wire-shape variant 20 (first cohort
  plugin to use variant 20; distinct from Fivetran's variant 19)
  AND **D-09 omitted** (the wire `'Lookout'` is fully clean, no
  trailing pad; Lookout returns to the cohort-default D-09-
  omitted posture after Fivetran's first-cohort D-09 application).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES`.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Lookout.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient.
- Any locale / search-term / location filtering beyond what
  `source-company-fivetran` already supports.
- A dedicated salary parser pass — Spec 015 covers USD / CAD
  ranges Lookout posts.
- Backfilling historical Lookout postings.
- Lookout Mobile EDR / ZTNA / Lookout Cloud Security product
  integration.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.LOOKOUT`** in the
> source registry, so that **a single `siteType: [Site.LOOKOUT]`
> request returns Lookout's open roles without my code knowing
> the underlying ATS slug**.

> As a **plugin author**, I want **a second proof-point of
> wire-shape variant 20 (`www.`-prefixed brand-domain singular
> `/careers/job-post` query-only-id) within the cohort's URL-
> shape catalogue**, so that **the first-cohort variant-19 case
> (Fivetran, run #292) gains a sibling sub-axis distinguished by
> the suffix `-post` on the path component**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Lookout**.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.LOOKOUT = 'lookout'` to `packages/models/src/enums/site.enum.ts`.                       | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-lookout` under `packages/plugins/`.                 | must     |
| FR-3  | `LookoutService.scrape(input)` returns a `JobResponseDto`; never throws.                          | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `lookout-`, `site === Site.LOOKOUT`, and `companyName === 'Lookout'` (7 bytes — wire-clean form; D-09 omitted — the plugin reads `listing.company_name` directly with `'Lookout'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/lookout.service.spec.ts`, all using mocked HTTP.       | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-20 shape `https://www.lookout.com/careers/job-post?gh_jid=<id>`); the **fallback** `jobUrl` constructor uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/lookout/jobs/<id>` rather than reconstructing the bare-domain shape (same fallback strategy as ClassPass, Epic Games, fuboTV, Lattice, Stitch Fix, Udemy, Bitwarden, and Fivetran). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **omitted** — 0 of 6 wire titles in the run-293 probe carry pad bytes; the plugin emits `listing.title` byte-for-byte without a `.trim()`. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 6 populated wire department names in the run-293 probe carry pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |
| FR-15 | **D-09 omitted — wire `company_name` is NOT trimmed** — 6 of 6 wire `company_name` values in the run-293 probe are the clean 7-byte `'Lookout'` form (no leading or trailing pad bytes); the plugin reads `listing.company_name` directly with `'Lookout'` as a defensive fallback. **Returns to cohort-default D-09-omitted posture** after Fivetran's first-cohort D-09 application at run #292. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for a 6-job page.                                          |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 2 MB resident on a 6-job page.                                        |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[LookoutModule]})` resolves.    |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-lookout/src/lookout.service.ts
@SourcePlugin({ site: Site.LOOKOUT, name: 'Lookout', category: 'company' })
@Injectable()
export class LookoutService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/lookout/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `lookout-${listing.id}`,
  site:         Site.LOOKOUT,
  title:        listing.title ?? '',                                  // D-10 omitted (clean wire)
  companyName:  listing.company_name ?? 'Lookout',                    // D-09 omitted (clean wire)
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/lookout/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,               // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/lookout.service.spec.ts`):**
  1. NestJS DI resolves `LookoutService` through `LookoutModule`.
  2. `Site.LOOKOUT === 'lookout'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-20
     `www.lookout.com/careers/job-post?gh_jid=<id>` shape pass-
     through lock — `www.`-prefixed singular `/careers/job-post`
     + single `gh_jid` query preserved byte-for-byte; AND
     fallback URL using the canonical Greenhouse variant-2 form
     `job-boards.greenhouse.io/lookout/jobs/<id>`; the decode-
     then-strip pipeline cleanliness; the D-09 omission lock
     — emitted `companyName === 'Lookout'` (7 bytes) AND byte-
     equal to the wire `company_name === 'Lookout'` (7 bytes —
     fully clean wire); the D-10 omission lock — wire-clean
     title pass-through; the D-11 fully-clean department pass-
     through).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #293):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Lookout's
  `https://www.lookout.com/careers` careers landing page
  redirects buyers to a Greenhouse-hosted board.
- **D-02 (run #293):** Skip the Harvest API code path.
  Company-direct plugins stay thin (Spec 001 / FR-2).
- **D-03 (run #293):** No salary parser hook beyond helpers
  defaults — Spec 014 / 015 covers USD / CAD.
- **D-04 (run #293):** **Wire-shape variant 20 — `www.`-prefixed
  brand-domain singular `/careers/job-post` query-only-id shape
  — first cohort observation.** Lookout's tenant publishes its
  `absolute_url` on a **previously-unobserved**
  `https://www.lookout.com/careers/job-post?gh_jid=<id>` shape
  (`www.lookout.com` — `www.`-prefixed brand-domain, same `www.`
  prefix as variant 19 and variant 16; `/careers/job-post`
  SINGULAR path with `-post` suffix — distinct from variant 13's
  `careers/jobs/<id>?gh_jid=<id>` plural-with-id-in-path,
  variant 16's `www.stitchfix.com/careers/jobs?gh_jid=<id>&gh_jid=<id>`
  plural-with-duplicate-query, variant 18's
  `bitwarden.com/careers/<id>/?gh_jid=<id>` `<id>`-in-path-with-
  trailing-slash-and-query, AND variant 19's
  `www.fivetran.com/careers/job?gh_jid=<id>` singular-`/job`
  without `-post` suffix; single `gh_jid` query parameter — same
  single-query shape as variants 10, 12, 13, 14, 15, 17, 18, 19).
  This is the **first** plugin in the cohort to use **wire-shape
  variant 20** — the **twenty-third distinct wire-shape variant**
  in the company-direct cohort.

  The plugin emits `listing.absolute_url` byte-for-byte. The
  **fallback** `jobUrl` constructor defaults to the canonical
  Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/lookout/jobs/<id>` rather
  than reconstructing the `www.`-prefixed bare-domain shape
  (same fallback strategy as ClassPass / Epic Games / fuboTV /
  Lattice / Stitch Fix / Udemy / Bitwarden / Fivetran).
- **D-05 (run #293):** Use Greenhouse slug `lookout`. Confirmed
  via run #293's HTTP 200 probe (6 open roles).
- **D-06 (run #293):** Class names are `LookoutService` /
  `LookoutModule` (PascalCase from the lowercase slug). Same
  convention as `BitwardenService` / `LatticeService` /
  `FivetranService`.
- **D-07 (run #293):** Selected from the **fifth fresh probe
  sweep** live-board pool, alphabetically-fifth live-board hit
  (after `bitwarden` shipped at run #289, `calendly` at run #290,
  `datacamp` at run #291, and `fivetran` at run #292). The
  remaining six live hits queue for runs #294+ in alphabetical
  order: `marqeta` (~330), `newrelic` (~370), `peloton` (~104),
  `scopely` (~1190), `squarespace` (~72), `typeform` (~132).
- **D-08 (run #293):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))`.
  Lookout's `content` is HTML-entity-encoded (Greenhouse-
  default), so the plugin decodes entities BEFORE stripping
  tags. **Thirty-ninth** company-direct plugin in the cohort to
  use the entity-decode-then-tag-strip pipeline.
- **D-09 (run #293):** **Omitted with case-symmetric clean-wire
  form.** Rationale: Lookout's wire `company_name === 'Lookout'`
  byte-for-byte (the single-token bare brand name with neither
  leading nor trailing pad bytes; 7 bytes total, identical to
  the lowercase slug `lookout` after lowercasing). All 6 of 6
  wire `company_name` values in the run-293 probe are the clean
  7-byte form (0 % pad rate). The plugin reads
  `listing.company_name` directly with `'Lookout'` as a
  defensive fallback; the emitted `companyName` is
  byte-for-byte equal to the wire form.

  **Returns to cohort-default D-09-omitted posture** after
  Fivetran's first-cohort D-09 application at run #292
  (Fivetran's wire was `'Fivetran '` with a trailing pad; the
  plugin trimmed). Lookout's wire is fully clean — no trim
  required, no trim applied. **Thirty-second cohort plugin to
  omit D-09**.
- **D-10 (run #293):** Wire-title `.trim()` deviation is
  **omitted**. 0 of 6 wire titles in the run-293 probe carry
  whitespace padding. **Fifteenth cohort plugin to omit D-10**.
- **D-11 (run #293):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. 0 of 6 populated wire department
  names in the run-293 probe carry pad bytes. Departments carry
  `'Engineering'` / `'Sales'` (no `' Department'` suffix —
  distinct from Fivetran's `'Engineering Department'` /
  `'Sales Department'` structural-suffix data shape) — pass-
  through preserves the wire byte-for-byte. **Twenty-ninth
  cohort plugin** with fully-clean department pass-through.
- **D-12 (run #293):** This plugin is the **fifth** in the
  fifth-fresh-sweep live-board pool processing.
- **D-13 (run #293):** **One structural deviation** from the
  Fivetran (Spec 082) template — D-04 wire-shape variant 20
  (first cohort plugin to use variant 20; distinct from
  Fivetran's variant 19; same `www.`-prefixed brand-domain
  cohort but the `-post` suffix on the singular path component
  is a new sub-axis). All other axes share with Fivetran:
  D-08 entity-decode-then-tag-strip, D-09 omitted (Lookout 0/6
  padded — fully clean; Fivetran 173/173 padded — first-cohort
  D-09 application; Lookout returns to cohort-default), D-10
  omitted (Lookout 0/6 padded; Fivetran 0/173 padded — both
  clean), D-11 fully-clean department pass-through.

## 11. References

- `packages/plugins/source-company-fivetran/src/fivetran.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 082 / run #292; same D-08 + D-10 omitted + D-11
  omitted axes; deviates on D-04 variant 19 vs Lookout's variant
  20, and D-09 applied vs Lookout's omitted).
- `packages/plugins/source-company-bitwarden/src/bitwarden.service.ts` —
  prior-cousin variant cohort plugin (Spec 079; variant 18; same
  D-08 + D-10 omitted + D-11 omitted axes).
- `packages/plugins/source-company-datacamp/src/datacamp.service.ts` —
  predecessor in fifth-sweep pool (Spec 081; first cohort plugin
  to apply D-11 with leading-pad).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
  — full Greenhouse adapter for the authenticated path.
- `packages/common/src/utils/html-utils.ts` —
  `decodeHtmlEntities` + `stripHtmlTags` helpers (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog amended in this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — four-file registration contract.
