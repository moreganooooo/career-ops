# Plan: 048 — Source Company Plugin: Gusto

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Gusto's careers board is hosted on Greenhouse at the slug `gusto`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-brex` (Spec 047 / run #257),
`source-company-duolingo` (Spec 046 / run #256), `source-company-klaviyo`
(Spec 045 / run #255), `source-company-affirm` (Spec 044 / run #254),
`source-company-vercel` (Spec 043 / run #253), `source-company-block`
(Spec 042 / run #252), `source-company-roblox` (Spec 041 / run #251),
`source-company-dropbox` (Spec 040 / run #250), `source-company-instacart`
(Spec 039 / run #249), `source-company-datadog` (Spec 038 / run #248),
`source-company-mongodb` (Spec 037 / run #247), `source-company-cloudflare`
(Spec 036 / run #246), `source-company-twilio` (Spec 035 / run #245),
`source-company-twitch` (Spec 034 / run #244), `source-company-gitlab`
(Spec 033 / run #243), `source-company-figma` (Spec 032 / run #242),
`source-company-asana` (Spec 031), and the twenty-four other Greenhouse-
backed company-direct plugins already call. The plan is to copy the
Affirm plugin's shape (single-file `service.ts`, four-line `module.ts`,
two-line `index.ts`, six-line `package.json`, three-line `tsconfig.json`)
because Affirm shares the new `job-boards.greenhouse.io` permalink-
subdomain wire-shape variant Gusto uses, then rename references from
Affirm → Gusto and add the Brex-style description-cleanup pipeline
(`stripHtmlTags(decodeHtmlEntities(content))`) because Gusto's tenant
emits HTML-entity-encoded content like Brex / Duolingo / Klaviyo. After
the code lands, the plugin is wired into the four registration points:
`Site` enum, plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. Then the unit-test fixture and eight Jest cases run
under the existing test config without further changes.

The work has one composite structural deviation from any single prior
template — the **combination** of (a) the new
`job-boards.greenhouse.io` permalink-subdomain fallback `jobUrl`
(inherited from Affirm / Vercel) and (b) the entity-decode-then-tag-strip
description pipeline (inherited from Brex / Duolingo / Klaviyo). Neither
deviation is novel on its own; only their combination is — Gusto is the
**first** plugin in the cohort to combine the new permalink subdomain
with the entity-decode pipeline (Vercel and Affirm use variant 2 with
raw HTML; Klaviyo / Duolingo / Brex use the entity-decode pipeline with
marketing-site shapes — variants 3 / 4 / 5).

A second small deviation is the brand-name pin: Gusto's wire
`company_name` is `Gusto, Inc.` (legal entity), but the plugin emits
`'Gusto'` (cleaned brand) as a string literal in the `JobPostDto`
mapping — same approach Affirm uses for its `Affirm Holdings, Inc.`
wire `company_name` (Spec 044 § 10 D-06).

Both structural deviations are encapsulated inside `gusto.service.ts`;
no shared code changes. The shaving of risk comes entirely from leaning
on a pattern the codebase has used thirty-six times before (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo,
Brex).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-gusto` under `ALL_SOURCE_MODULES` with
  passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-gusto/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,gusto.module.ts,gusto.service.ts}`,
    `__tests__/gusto.service.spec.ts`,
    `__tests__/fixtures/gusto-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 048 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-gusto` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                              | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-gusto`              | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`             | append `GUSTO = 'gusto'`.                                    |
| `packages/plugins/index.ts`                          | import + append `GustoModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                 | path-alias entry.                                            |
| `jest.config.js`                                     | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | add Gusto shipped row.                                       |
| `docs/index.md`                                      | append Spec 048 to the specs table.                          |
| `docs/log.md`                                        | run #258 entry.                                              |

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
| Gusto moves off Greenhouse mid-maintenance.         | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-affirm`'s shape.         | L          | L      | Pattern frozen by FR-1..FR-11; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Gusto tenant flips encoding mode (entities → raw HTML). | L      | L      | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Gusto migrates `absolute_url` to a marketing-site shape. | L     | L      | The fallback would still work — Greenhouse populates `absolute_url` on every listing in practice, so the fallback path is defence-in-depth. |
| Gusto wire `company_name` changes form (e.g. `Gusto LLC`). | L  | L      | Plugin pins `companyName === 'Gusto'` as a string literal, so wire shape changes don't propagate. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.GUSTO` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 048 § 10 Decisions for the nine resolved points.)
