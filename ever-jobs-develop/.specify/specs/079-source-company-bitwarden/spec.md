# Spec: 079 — Source Company Plugin: Bitwarden

| Field          | Value                                                                                                                                                                                          |
| -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Spec ID        | 079                                                                                                                                                                                            |
| Slug           | source-company-bitwarden                                                                                                                                                                       |
| Status         | accepted                                                                                                                                                                                       |
| Owner          | claude (run #289)                                                                                                                                                                              |
| Created        | 2026-05-03                                                                                                                                                                                     |
| Last updated   | 2026-05-03                                                                                                                                                                                     |
| Supersedes     | (none)                                                                                                                                                                                         |
| Related specs  | 001, 003, 005, 020..078                                                                                                                                                                        |

## 1. Problem Statement

Run #288's Spec 078 closed end-to-end (Udemy shipped — 8 unit
tests green; the **fourteenth and last** live hit alphabetically
from the run-275 fourth-fresh-sweep candidate pool) and exhausted
the pool. Run #289 is the **first run of the fifth fresh probe
sweep** — a new probe sweep across yet-untested large-employer
candidate slugs. The run-289 probe sampled forty-one candidate
slugs across known greenhouse-using employer brands and found
**eleven** fresh non-empty live hits: `bitwarden` (11 jobs),
`calendly` (40), `datacamp` (41), `fivetran` (346), `lookout`
(12), `marqeta` (330), `newrelic` (370), `peloton` (104),
`scopely` (1190), `squarespace` (72), `typeform` (132). Two
additional slugs returned HTTP 200 with zero jobs and remain
deferred (`hubspot` — twenty-second consecutive empty re-probe
across runs #262–#289; `allbirds` — first observation, may be a
seasonal-hiring slowdown). The remaining twenty-eight candidate
slugs returned HTTP 404.

Bitwarden — operator of the **dominant open-source-friendly
identity-security and password-management platform pioneered
around the cross-platform end-to-end-encrypted credential vault
data model** (founded by Kyle Spearrin in 2015 in Santa Barbara;
raised $112M+ across rounds led by PSG and Battery Ventures at
a peak $1.5B valuation in 2024; ships a freemium B2C password-
manager + B2B Bitwarden-for-Business enterprise-credential-
platform product across the identity-security segment —
alongside competitors 1Password, Dashlane, LastPass, NordPass,
and Keeper Security — with a fully-distributed remote-first
workforce concentrated across the United States and Europe) —
is published at the bare `bitwarden` Greenhouse slug (the
lowercase brand name; case-symmetric with the wire `company_name
=== 'Bitwarden'`) and was confirmed live via run #289's HTTP
200 probe of
`https://api.greenhouse.io/v1/boards/bitwarden/jobs?content=true`
(11 open roles confirmed at run-289 start). Bitwarden publishes
its `absolute_url` on a **previously-unobserved wire-shape
variant 18** — the bare brand-domain `/careers/<id>/`-trailing-
slash query-with-id shape
`https://bitwarden.com/careers/<id>/?gh_jid=<id>` — making this
the **first** plugin in the cohort to use variant 18 — the
**twenty-first distinct wire-shape variant** in the company-
direct cohort.

Aggregator-callers asking for "all jobs at major identity-
security / password-manager / credential-platform vendors" must
currently either (a) deduce the Greenhouse slug `bitwarden` and
call `source-ats-greenhouse` by hand, or (b) post-filter the
firehose of every Greenhouse-hosted role for a company-name
match — both paths bypass the per-source health and circuit-
breaker plumbing that the company-direct plugins sit behind
(Spec 005), and both lose the `Site.<KEY>` enum entry that
aggregator-side code branches on for analytics, dedup affinity,
and breaker scoping.

The gap closes when we add a thin company-direct plugin pinning
the `bitwarden` Greenhouse slug behind its own `Site` enum
value, in the identical shape the codebase already uses sixty-
seven times.

## 2. Goals

- Ship a `source-company-bitwarden` plugin returning live
  `JobPostDto` rows for the public Bitwarden careers board with
  **no caller config required** (no slug, no auth, no override
  URL).
- Match the structural and behavioural shape of the existing
  `source-company-udemy` plugin (Greenhouse-backed, `category:
  'company'`, `Site.BITWARDEN` enum value, `id` prefixed
  `bitwarden-`) — Udemy is the closest structural cousin because
  both use a non-Greenhouse-host wire shape with a Greenhouse
  variant-2 fallback, both use the case-symmetric bare-brand
  wire `company_name` against a lowercase slug (D-09 omitted),
  both emit HTML-entity-encoded content requiring the entity-
  decode-then-tag-strip description pipeline (D-08), both apply
  D-10 wire-title `.trim()` (Udemy 2/17 padded, Bitwarden 1/11
  padded — near-identical pad rate ~11.8 % vs ~9.1 %), and both
  omit D-11 fully-clean department pass-through. Bitwarden
  carries **one structural deviation** from the Udemy template
  — D-04 wire-shape variant 18 (first cohort plugin to use
  variant 18; distinct from Udemy's variant 17 third-party-
  SaaS-host shape).
- Bundle a unit-test suite (≥ 8 cases) that exercises happy path
  + at least five failure / boundary modes against deterministic
  fixtures — **never** the live Greenhouse endpoint.
- Publish the plugin's `Module` in `ALL_SOURCE_MODULES` so the
  `JobsModule` picks it up at boot without extra wiring.
- Keep the surface area inside one package; do **not** edit
  `source-ats-greenhouse` to special-case Bitwarden.

## 3. Non-Goals

- Authenticated Greenhouse Harvest API support — the public
  board is sufficient; if a customer later supplies an API key
  through `input.auth.greenhouse.apiKey`, they can call
  `source-ats-greenhouse` with `companySlug: 'bitwarden'` and
  get the richer payload.
- Any locale / search-term / location filtering beyond what
  `source-company-udemy` already supports — the company plugins
  are thin wrappers and stay that way (FR-2 of Spec 001).
- A dedicated salary parser pass — Spec 015's locale-and-prose-
  immunity helpers already cover Bitwarden's USD ranges.
- Backfilling historical Bitwarden postings — only the open-
  roles slice the Greenhouse public API returns.
- Bitwarden product-API / vault-sync / SCIM / SSO integration
  — Bitwarden's credential-vault, sync, and identity-management
  product surfaces are separate product surfaces from the
  careers board; product API data is out of scope for this
  plugin.

## 4. User / Caller Stories

> As an **aggregator caller**, I want **`Site.BITWARDEN`** in
> the source registry, so that **a single `siteType:
> [Site.BITWARDEN]` request returns Bitwarden's open roles
> without my code knowing the underlying ATS slug**.

> As a **plugin author**, I want **the first proof-point of the
> bare brand-domain `/careers/<id>/`-trailing-slash Greenhouse
> wire shape (variant 18)**, so that **adding the next
> Greenhouse-only employer publishing on the same trailing-slash
> shape costs ≤ 1 spec and ≤ 1 PR**.

> As a **circuit-breaker operator** (Spec 005), I want **per-
> source failure isolation for Bitwarden**, so that **a
> Greenhouse outage on the Bitwarden board does not trip the
> breaker for every other Greenhouse tenant** the platform
> tracks.

## 5. Functional Requirements

| ID    | Requirement                                                                                       | Priority |
| ----- | ------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Add `Site.BITWARDEN = 'bitwarden'` to `packages/models/src/enums/site.enum.ts`.                   | must     |
| FR-2  | New plugin package `@ever-jobs/source-company-bitwarden` under `packages/plugins/`.               | must     |
| FR-3  | `BitwardenService.scrape(input)` returns a `JobResponseDto`; never throws.                        | must     |
| FR-4  | The plugin is registered in `packages/plugins/index.ts → ALL_SOURCE_MODULES`.                     | must     |
| FR-5  | The plugin has `tsconfig.base.json` path-alias and a matching `jest.config.js` mapper entry.      | must     |
| FR-6  | Each emitted `JobPostDto` has `id` prefixed `bitwarden-`, `site === Site.BITWARDEN`, and `companyName === 'Bitwarden'` (wire `company_name === 'Bitwarden'` byte-for-byte; case-symmetric with the lowercase slug; D-09 omitted — the plugin reads `listing.company_name` directly with `'Bitwarden'` as a defensive fallback). | must |
| FR-7  | The plugin honours `input.resultsWanted` (default 50) and short-circuits when reached.            | must     |
| FR-8  | The plugin honours `input.searchTerm` against `title` ∪ `departments[0].name` (case-insensitive). | should   |
| FR-9  | Network errors (HTTP 4xx / 5xx, timeouts) are caught — `scrape` returns `{ jobs: [] }`.           | must     |
| FR-10 | Unit-test suite ≥ 8 cases under `__tests__/bitwarden.service.spec.ts`, all using mocked HTTP.     | must     |
| FR-11 | The description-cleanup pass decodes HTML entities **before** stripping HTML tags (see § 10 D-08). | must    |
| FR-12 | Wire `absolute_url` flows through to `jobUrl` byte-for-byte (preserving the variant-18 shape `https://bitwarden.com/careers/<id>/?gh_jid=<id>`); the **fallback** `jobUrl` constructor (when Greenhouse omits `absolute_url`) uses the canonical Greenhouse **variant-2** form `https://job-boards.greenhouse.io/bitwarden/jobs/<id>` rather than reconstructing the bare-domain shape (same fallback strategy as ClassPass, Epic Games, fuboTV, Lattice, Stitch Fix, and Udemy). | must     |
| FR-13 | Wire-title `.trim()` deviation (D-10) is **applied** — 1 of 11 wire titles in the run-289 probe carries trailing ASCII-space padding (`'Senior Full Stack Software Engineer '`); the plugin applies `.trim()` to `listing.title` before downstream filters and emit. | must     |
| FR-14 | Wire `departments[0].name` is **NOT** trimmed (D-11 omitted) — 0 of 11 wire department names in the run-289 probe carry trailing pad bytes; the plugin emits `listing.departments[0].name` byte-for-byte. | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                | Target                                                                  |
| ------ | ------------------------------------------ | ----------------------------------------------------------------------- |
| NFR-1  | `scrape()` overhead vs. raw `client.get()` | < 5 ms / job for an 11-job page.                                        |
| NFR-2  | Memory: no buffering of >1 page at a time. | ≤ 5 MB resident on an 11-job page.                                      |
| NFR-3  | Zero new third-party deps.                 | `package.json` is `name + main + types` only, like its peers.           |
| NFR-4  | Plugin loads via NestJS DI without extra providers. | `Test.createTestingModule({imports:[BitwardenModule]})` resolves.   |

## 7. Contracts

### 7.1 API / Interface

```ts
// packages/plugins/source-company-bitwarden/src/bitwarden.service.ts
@SourcePlugin({ site: Site.BITWARDEN, name: 'Bitwarden', category: 'company' })
@Injectable()
export class BitwardenService implements IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

The service hits `https://api.greenhouse.io/v1/boards/bitwarden/jobs?content=true`
exactly once per call. Each item maps to `JobPostDto` with:

```ts
{
  id:           `bitwarden-${listing.id}`,
  site:         Site.BITWARDEN,
  title:        (listing.title ?? '').trim(),                          // D-10 applied (1/11 padded)
  companyName:  listing.company_name ?? 'Bitwarden',                   // D-09 omitted; case-symmetric
  jobUrl:       listing.absolute_url ?? `https://job-boards.greenhouse.io/bitwarden/jobs/${listing.id}`,
  location:     locationStr ? new LocationDto({ city: locationStr }) : null,
  description:  listing.content ? stripHtmlTags(decodeHtmlEntities(listing.content)) : null,
  datePosted:   listing.updated_at ?? null,
  isRemote:     locationStr?.toLowerCase().includes('remote') ?? false,
  department:   listing.departments?.[0]?.name ?? null,                // D-11 omitted (clean wire)
}
```

### 7.2 Errors

| Code              | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| _(none surfaced)_ | All transport errors are swallowed and logged at `error` level. The caller sees `{ jobs: [] }` (FR-9). |

## 8. Test Plan

- **Unit (`__tests__/bitwarden.service.spec.ts`):**
  1. NestJS DI resolves `BitwardenService` through `BitwardenModule`.
  2. `Site.BITWARDEN === 'bitwarden'` literal pin.
  3. Happy path — fixture with two listings → two `JobPostDto`s,
     mapped fields verified (including the variant-18
     `bitwarden.com/careers/<id>/?gh_jid=<id>` shape pass-through
     lock — bare brand-domain with trailing slash preserved
     byte-for-byte; AND fallback URL using the canonical
     Greenhouse variant-2 form
     `job-boards.greenhouse.io/bitwarden/jobs/<id>` — same
     fallback strategy as ClassPass / Epic Games / fuboTV /
     Lattice / Stitch Fix / Udemy; the decode-then-strip
     pipeline cleanliness; the case-symmetric wire `companyName
     === 'Bitwarden'` byte-for-byte AND `companyName ===
     fixture.jobs[0].company_name` byte-for-byte AND case-
     insensitively-equal to the slug `bitwarden`; the D-10
     application lock — emitted `title` for the SECOND listing
     equals trimmed form `'Senior Full Stack Software Engineer'`
     byte-distinct from wire-padded form `'Senior Full Stack
     Software Engineer '` AND exactly 1 byte shorter (locking
     the single-trailing-pad form); and the D-11 fully-clean
     department pass-through).
  4. `resultsWanted = 1` against a two-listing fixture caps the response to one.
  5. `searchTerm` filters listings by title (case-insensitive,
     against the trimmed form — D-10 search guard).
  6. `searchTerm` filters listings by department name (case-
     insensitive).
  7. HTTP 500 → `scrape` resolves to `{ jobs: [] }`, never throws.
  8. Empty `data.jobs` → `{ jobs: [] }`.
- **Integration / E2E:** none. Per Spec 005 the live-network E2E
  lives in `source-ats-greenhouse` and exercises the same wire
  shape.
- **Performance:** none beyond NFR-1's narrative budget — the
  helpers bench under
  `packages/common/__tests__/helpers.bench.spec.ts` is the
  ground truth for parser-level perf, and that path is unchanged
  here.

## 9. Open Questions

(none open — see § 10 Decisions.)

## 10. Decisions

- **D-01 (run #289):** Wrap Greenhouse public API rather than
  build a bespoke HTML scraper. Rationale: Bitwarden's
  `https://bitwarden.com/careers/` careers landing page renders
  jobs from a Greenhouse-hosted board — the canonical machine-
  readable feed for this tenant is the
  `api.greenhouse.io/v1/boards/bitwarden/jobs` public endpoint.
  We already exercise the broader Greenhouse public-API pattern
  from sixty-seven prior company-direct plugins.
- **D-02 (run #289):** Skip the Harvest API code path in this
  plugin. Rationale: company-direct plugins stay thin (Spec 001
  / FR-2); callers needing Harvest can use
  `source-ats-greenhouse` with `companySlug: 'bitwarden'`.
- **D-03 (run #289):** No salary parser hook beyond the helpers
  defaults — Bitwarden posts USD ranges from US remote roles;
  Spec 014 / 015's parser already covers USD without
  modification.
- **D-04 (run #289):** **Wire-shape variant 18 — bare brand-
  domain `/careers/<id>/`-trailing-slash query-with-id shape —
  first cohort observation.** Bitwarden's tenant publishes its
  `absolute_url` on a **previously-unobserved bare brand-domain
  shape** `https://bitwarden.com/careers/<id>/?gh_jid=<id>`
  (`bitwarden.com` — bare brand-domain, no `www.` prefix, like
  variant 13's `epicgames.com` and variant 15's `lattice.com`;
  `/careers/` path with the listing ID embedded — distinct from
  variant 13's `careers/jobs/<id>?gh_jid=<id>` `/jobs/` segment;
  **trailing slash on the path** before the query — distinct
  from every prior cohort variant which all omit the trailing
  slash before `?gh_jid=`; single `gh_jid` query parameter —
  same single-query-parameter shape as variants 10, 12, 13, 14,
  15, 17). This is the **first** plugin in the cohort to use
  **wire-shape variant 18** — the **twenty-first distinct wire-
  shape variant** in the company-direct cohort.

  The plugin emits `listing.absolute_url` byte-for-byte to
  preserve the canonical destination (including the trailing
  slash before `?gh_jid=`). The **fallback** `jobUrl`
  constructor (when Greenhouse omits `absolute_url`) defaults
  to the canonical Greenhouse **variant-2** form
  `https://job-boards.greenhouse.io/bitwarden/jobs/<id>` rather
  than reconstructing the bare-domain trailing-slash shape,
  because the bare-domain shape requires `bitwarden.com`-side
  proxying that may not be guaranteed for all listing IDs (same
  fallback strategy as ClassPass — Spec 067 § 10 D-04 — Epic
  Games — Spec 069 § 10 D-04 — fuboTV — Spec 071 § 10 D-04 —
  Lattice — Spec 074 § 10 D-04 — Stitch Fix — Spec 077 § 10
  D-04 — and Udemy — Spec 078 § 10 D-04).
- **D-05 (run #289):** Use Greenhouse slug `bitwarden` (the
  lowercase brand name; case-symmetric with the wire
  `company_name === 'Bitwarden'`). Rationale: Bitwarden's
  Greenhouse tenant is published at the bare lowercase slug.
  Confirmed via run #289's HTTP 200 probe of
  `https://api.greenhouse.io/v1/boards/bitwarden/jobs?content=true`
  (11 open roles confirmed at run-289 start).
- **D-06 (run #289):** Class names are `BitwardenService` /
  `BitwardenModule` (PascalCase from the lowercase slug).
  Rationale: matches the convention `UdemyService` /
  `LatticeService` / `StitchfixService` use for slug-derived
  class names.
- **D-07 (run #289):** Selected from the **fifth fresh probe
  sweep** live-board pool processing, alphabetically-first live-
  board hit — the **first run** of the new sweep. Run #289's
  probe sampled forty-one candidate slugs and found **eleven**
  fresh non-empty live hits: `bitwarden` (11 jobs, run #289 next
  bite — this spec), `calendly` (40), `datacamp` (41), `fivetran`
  (346), `lookout` (12), `marqeta` (330), `newrelic` (370),
  `peloton` (104), `scopely` (1190), `squarespace` (72),
  `typeform` (132). Two additional slugs returned HTTP 200 with
  zero jobs and remain deferred (`hubspot` — twenty-second
  consecutive empty re-probe across runs #262–#289; `allbirds`
  — first observation, may be a seasonal-hiring slowdown). The
  remaining twenty-eight candidate slugs returned HTTP 404.
  `bitwarden` is alphabetically first so this run takes
  Bitwarden. The remaining ten live hits queue for runs #290+
  in alphabetical order (`calendly` next at run #290 with 40
  roles).
- **D-08 (run #289):** Description-cleanup pipeline is
  `stripHtmlTags(decodeHtmlEntities(listing.content))` rather
  than the bare `stripHtmlTags(listing.content)` form. Rationale:
  like Udemy (Spec 078 § 10 D-08), Stitch Fix (Spec 077 § 10
  D-08), and the rest of the post-Klaviyo cohort, Bitwarden's
  tenant emits HTML-entity-encoded content (`&lt;p&gt;Bitwarden
  is the trusted identity security leader for millions of users
  worldwide, empowering enterprises, developers, and individuals
  to securely manage and share sensitive information anywhere...`)
  rather than raw HTML tags — confirmed via run #289's HTTP
  probe of the live API (every wire job carries HTML entities
  including `&lt;`, `&gt;`, `&amp;`, `&quot;`; none carry raw
  tags). Applying `stripHtmlTags()` alone to that wire payload
  would leave the literal entities in place. Decoding entities
  **first** and then stripping tags yields clean readable text.
  The pipeline is order-sensitive — `decodeHtmlEntities()` must
  run before `stripHtmlTags()`. The unit-test happy path asserts
  the cleaned description does not contain `&lt;` (entities
  decoded), `&amp;`, `<p>`, `<div>`, or `<strong>` (tags
  stripped after the decode pass). This is the **thirty-fifth**
  company-direct plugin in the cohort to use the entity-decode-
  then-tag-strip pipeline.
- **D-09 (run #289):** Brand-name trim D-09 is **omitted** with
  case-symmetric bare-brand wire form. Rationale: Bitwarden's
  wire `company_name === 'Bitwarden'` byte-for-byte (the single-
  token bare brand name; case-symmetric with the lowercase slug
  `bitwarden`); no legal-entity suffix on the wire — distinct
  from the legal-entity name "Bitwarden, Inc." that may appear
  in corporate filings. The plugin reads `listing.company_name`
  directly with `'Bitwarden'` as a defensive fallback. **Twenty-
  ninth cohort plugin to omit D-09**, returning to the case-
  symmetric bare-brand wire form (after the seven slug/wire
  asymmetry cases — Ramp Network, Scale AI, fuboTV, Honeycomb,
  MasterClass, Maven Clinic, and Stitch Fix).
- **D-10 (run #289):** Wire-title `.trim()` deviation is
  **applied**. Rationale: 1 of 11 wire titles in the run-289
  probe carries trailing ASCII-space padding (`'Senior Full
  Stack Software Engineer '` — single-trailing-space-padded;
  ~9.1 % pad rate). The plugin applies `.trim()` to
  `listing.title` before downstream filters and emit.
  **Eighteenth cohort plugin to apply D-10** (after Brex,
  Buildkite, ZoomInfo, Attentive, Elastic, Intercom, Mixpanel,
  Faire, Carta, ClassPass, Epic Games, Flexport, fuboTV,
  Glossier, Honeycomb, Maven Clinic, Stitch Fix, and Udemy).
  The unit-test happy path asserts the emitted `title` for the
  second listing equals the trimmed form `'Senior Full Stack
  Software Engineer'` AND is byte-distinct from the wire form
  `'Senior Full Stack Software Engineer '` (with one trailing
  pad byte) AND is exactly 1 byte shorter — locking the single-
  trailing-pad form.
- **D-11 (run #289):** Wire `departments[0].name` `.trim()`
  deviation is **omitted**. Rationale: 0 of 11 wire department
  names in the run-289 probe carry trailing ASCII-space padding
  (`'Engineering'`, `'Sales'`, `'Customer Success'`, `'Product'`
  — clean single-token and multi-token forms; ~0 % pad rate).
  The plugin emits `listing.departments[0].name` byte-for-byte
  without a `.trim()` (the pass-through is a no-op on the clean
  wire data; if Bitwarden adds padding upstream in the future,
  the pass-through observability lock catches the diff in the
  unit tests). **Twenty-seventh cohort plugin** with fully-clean
  department pass-through (D-11 omitted; distinct from Lattice
  which applied D-11 — the only cohort plugin so far to apply
  it).
- **D-12 (run #289):** This plugin is the **first** in the
  fifth-fresh-sweep live-board pool processing. Run #289's
  probe sweep across forty-one candidate slugs found exactly
  **eleven** fresh non-empty live boards on Greenhouse:
  `bitwarden` (11 jobs, run #289 next bite — this spec),
  `calendly` (40, queued for run #290), `datacamp` (41), `fivetran`
  (346), `lookout` (12), `marqeta` (330), `newrelic` (370),
  `peloton` (104), `scopely` (1190), `squarespace` (72),
  `typeform` (132). Plus two HTTP-200-with-zero-jobs deferred
  slugs (`hubspot`, `allbirds`). The remaining ten live hits
  queue for runs #290+ in alphabetical order (`calendly` next
  at run #290 with 40 roles). Subsequent runs after this pool
  is exhausted (#300+ by current arithmetic) will pivot to a
  **sixth fresh probe sweep**.
- **D-13 (run #289):** **One structural deviation** from the
  Udemy (Spec 078) template — D-04 wire-shape variant 18 (first
  cohort plugin to use variant 18; distinct from Udemy's variant
  17 third-party-SaaS-host shape — Bitwarden uses a brand-owned
  domain rather than a third-party SaaS host). All other axes
  share with Udemy: D-08 entity-decode-then-tag-strip, D-09
  omitted with case-symmetric bare-brand wire (Bitwarden
  `'Bitwarden'` / Udemy `'Udemy'`), D-10 applied (Bitwarden 1/11
  padded; Udemy 2/17 padded — near-identical pad rate ~9.1 %
  vs ~11.8 %), D-11 fully-clean department pass-through.

## 11. References

- `packages/plugins/source-company-udemy/src/udemy.service.ts` —
  closest structural cousin (Greenhouse-backed company-direct,
  shipped Spec 078 / run #288; same D-08 + D-09 case-symmetric
  + D-10 applied + D-11 omitted axes as Bitwarden; Bitwarden
  deviates on D-04 variant 18 vs Udemy's variant 17).
- `packages/plugins/source-company-stitchfix/src/stitchfix.service.ts` —
  prior new-variant cohort plugin (Spec 077; first cohort plugin
  to use variant 16; same fallback strategy as Bitwarden —
  variant-2 fallback for a non-variant-2 wire shape).
- `packages/plugins/source-company-lattice/src/lattice.service.ts` —
  prior new-variant cohort plugin (Spec 074; first cohort plugin
  to use variant 15 bare brand-domain; same fallback strategy
  as Bitwarden — variant-2 fallback for a non-variant-2 wire
  shape).
- `packages/plugins/source-ats-greenhouse/src/greenhouse.service.ts`
  — full Greenhouse adapter for the authenticated path (out of
  scope here, see D-02).
- `packages/common/src/utils/html-utils.ts` — the
  `decodeHtmlEntities` + `stripHtmlTags` helpers this spec
  composes (D-08).
- `docs/SOURCE_ADOPTION_BACKLOG.md` — backlog being amended in
  this spec.
- `docs/PLUGIN_ARCHITECTURE.md` — the four-file registration
  contract this spec satisfies.
