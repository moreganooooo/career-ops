# Plan: 045 — Source Company Plugin: Klaviyo

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Klaviyo's careers board is hosted on Greenhouse at the slug `klaviyo`, so
the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-affirm` (Spec 044 / run #254),
`source-company-vercel` (Spec 043 / run #253), `source-company-block`
(Spec 042 / run #252), `source-company-roblox` (Spec 041 / run #251),
`source-company-dropbox` (Spec 040 / run #250), `source-company-instacart`
(Spec 039 / run #249), `source-company-datadog` (Spec 038 / run #248),
`source-company-mongodb` (Spec 037 / run #247), `source-company-cloudflare`
(Spec 036 / run #246), `source-company-twilio` (Spec 035 / run #245),
`source-company-twitch` (Spec 034 / run #244), `source-company-gitlab`
(Spec 033 / run #243), `source-company-figma` (Spec 032 / run #242),
`source-company-asana` (Spec 031), `source-company-plaid` (Spec 030),
`source-company-lyft` (Spec 029), `source-company-pinterest` (Spec 028),
`source-company-reddit` (Spec 027), `source-company-robinhood`,
`source-company-airbnb`, `source-company-doordash`,
`source-company-coinbase`, `source-company-discord`,
`source-company-databricks`, and `source-company-anthropic` already call.
The plan is to copy the Affirm plugin's shape (single-file `service.ts`,
three-line `module.ts`, two-line `index.ts`, four-line `package.json`,
three-line `tsconfig.json`) and rename references from Affirm → Klaviyo,
then wire the new package into the four registration points: `Site` enum,
plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. After the code lands, the unit-test fixture and eight
Jest cases run under the existing test config without further changes.

The work has two structural deviations from the Affirm/Vercel template:

1. **Fallback `jobUrl` shape** — Klaviyo's tenant proxies its
   `absolute_url` through `https://www.klaviyo.com/careers/jobs?gh_jid=
   <id>` (a marketing-site careers index that takes the Greenhouse job id
   as a query parameter), not through either `boards.greenhouse.io` or
   `job-boards.greenhouse.io`. The fallback URL template uses the
   marketing-site shape so a defence-in-depth caller still lands on a
   working detail page (Spec 045 § 10 D-04).
2. **Description cleanup** — Klaviyo's tenant emits HTML-entity-encoded
   content (`&lt;p&gt;...`) rather than raw HTML tags. The pipeline is
   `stripHtmlTags(decodeHtmlEntities(content))` — entity-decode first,
   tag-strip second — rather than the bare `stripHtmlTags(content)` form
   every prior company-direct plugin uses (Spec 045 § 10 D-08).

Both deviations are encapsulated inside `klaviyo.service.ts`; no shared
code changes. The shaving of risk comes entirely from leaning on a pattern
the codebase has used thirty-three times before (Amazon, Apple, Cursor,
Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord,
Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid,
Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-klaviyo` under `ALL_SOURCE_MODULES` with
  passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-klaviyo/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,klaviyo.module.ts,klaviyo.service.ts}`,
    `__tests__/klaviyo.service.spec.ts`,
    `__tests__/fixtures/klaviyo-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 045 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-klaviyo` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                              | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-klaviyo`            | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`             | append `KLAVIYO = 'klaviyo'`.                                |
| `packages/plugins/index.ts`                          | import + append `KlaviyoModule` to `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                 | path-alias entry.                                            |
| `jest.config.js`                                     | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | add Klaviyo shipped row.                                     |
| `docs/index.md`                                      | append Spec 045 to the specs table.                          |
| `docs/log.md`                                        | run #255 entry.                                              |

## 4. Dependencies

| Library                | Version     | Rationale                                                        |
| ---------------------- | ----------- | ---------------------------------------------------------------- |
| `@ever-jobs/common`    | (workspace) | shared `createHttpClient`, `stripHtmlTags`, `decodeHtmlEntities`. |
| `@ever-jobs/models`    | (workspace) | `Site`, `JobPostDto`, `LocationDto`, `JobResponseDto`, `IScraper`. |
| `@ever-jobs/plugin`    | (workspace) | `@SourcePlugin` decorator.                                       |
| `@nestjs/common`       | (existing)  | `@Injectable`, `@Module`, `Logger`.                              |

No new third-party dependencies (NFR-3).

## 5. Risks & Mitigations

| Risk                                                | Likelihood | Impact | Mitigation                                                       |
| --------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Klaviyo moves off Greenhouse mid-maintenance.       | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-affirm`'s shape.         | L          | L      | Pattern frozen by FR-1..FR-11; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Klaviyo tenant flips encoding mode (entities → raw HTML). | L      | L      | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Klaviyo migrates `absolute_url` to a Greenhouse permalink subdomain. | L | L | The fallback would still work — Greenhouse populates `absolute_url` on every listing in practice, so the fallback path is defence-in-depth. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.KLAVIYO` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 045 § 10 Decisions for the eight resolved points.)
