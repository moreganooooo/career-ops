# Plan: 044 — Source Company Plugin: Affirm

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Affirm's careers board is hosted on Greenhouse at the slug `affirm`, so the
implementation is a thin wrapper around the same public Greenhouse endpoint
that `source-company-vercel` (Spec 043 / run #253), `source-company-block`
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
The plan is to copy the Vercel plugin's shape (single-file `service.ts`,
three-line `module.ts`, two-line `index.ts`, four-line `package.json`,
three-line `tsconfig.json`) and rename references from Vercel → Affirm, then
wire the new package into the four registration points: `Site` enum,
plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. After the code lands, the unit-test fixture and eight
Jest cases run under the existing test config without further changes.

The work is small enough to ship in a single phase — no migration, no
breaking change, no rollback plan beyond `git revert`. The shaving of risk
comes entirely from leaning on a pattern the codebase has used thirty-two
times before (Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe,
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-affirm` under `ALL_SOURCE_MODULES` with
  passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-affirm/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,affirm.module.ts,affirm.service.ts}`,
    `__tests__/affirm.service.spec.ts`,
    `__tests__/fixtures/affirm-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped" status),
    index-table addition for Spec 044 in `docs/index.md`, log entry in
    `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-affirm` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                              | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-affirm`             | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`             | append `AFFIRM = 'affirm'`.                                  |
| `packages/plugins/index.ts`                          | import + append `AffirmModule` to `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                                 | path-alias entry.                                            |
| `jest.config.js`                                     | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | add Affirm shipped row.                                      |
| `docs/index.md`                                      | append Spec 044 to the specs table.                          |
| `docs/log.md`                                        | run #254 entry.                                              |

## 4. Dependencies

| Library                | Version     | Rationale                                                        |
| ---------------------- | ----------- | ---------------------------------------------------------------- |
| `@ever-jobs/common`    | (workspace) | shared `createHttpClient`, `stripHtmlTags`.                      |
| `@ever-jobs/models`    | (workspace) | `Site`, `JobPostDto`, `LocationDto`, `JobResponseDto`, `IScraper`. |
| `@ever-jobs/plugin`    | (workspace) | `@SourcePlugin` decorator.                                       |
| `@nestjs/common`       | (existing)  | `@Injectable`, `@Module`, `Logger`.                              |

No new third-party dependencies (NFR-3).

## 5. Risks & Mitigations

| Risk                                                | Likelihood | Impact | Mitigation                                                       |
| --------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Affirm moves off Greenhouse mid-maintenance.        | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-vercel`'s shape.         | L          | L      | Pattern frozen by FR-1..FR-10; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Greenhouse `job-boards` permalink-host migration.   | L          | L      | Fallback uses the new `job-boards.greenhouse.io` host (D-04); legacy `boards.greenhouse.io/affirm/jobs/<id>` issues a 301 to the new host, so any caller following either form lands at the same canonical URL. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.AFFIRM` is unused outside this plugin, so the enum revert is safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 044 § 10 Decisions for the seven resolved points.)
