# Plan: 025 — Source Company Plugin: Airbnb

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-01 |
| Last updated | 2026-05-01 |

## 1. Approach

Airbnb's careers board is hosted on Greenhouse at the slug `airbnb`,
so the implementation is a thin wrapper around the same public
Greenhouse endpoint that `source-company-doordash` (Spec 024 /
run #234), `source-company-coinbase`, `source-company-discord`,
`source-company-databricks`, and `source-company-anthropic` already
call. The plan is to copy the DoorDash plugin's shape (single-file
`service.ts`, three-line `module.ts`, two-line `index.ts`,
four-line `package.json`, three-line `tsconfig.json`) and rename
references from DoorDash → Airbnb, then wire the new package into
the four registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
After the code lands, the unit-test fixture and eight Jest cases
run under the existing test config without further changes.

The work is small enough to ship in a single phase — no migration, no
breaking change, no rollback plan beyond `git revert`. The shaving of
risk comes entirely from leaning on a pattern the codebase has used
thirteen times before (Amazon, Apple, Cursor, Google, IBM, Meta,
OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase, DoorDash).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-airbnb` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-airbnb/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,airbnb.module.ts,airbnb.service.ts}`,
    `__tests__/airbnb.service.spec.ts`,
    `__tests__/fixtures/airbnb-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`,
    `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 025 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-airbnb` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                          | Change                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-airbnb`         | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`         | append `AIRBNB = 'airbnb'`.                                  |
| `packages/plugins/index.ts`                      | import + append `AirbnbModule` to `ALL_SOURCE_MODULES`.      |
| `tsconfig.base.json`                             | path-alias entry.                                            |
| `jest.config.js`                                 | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                | add Airbnb shipped row.                                      |
| `docs/index.md`                                  | append Spec 025 to the specs table.                          |
| `docs/log.md`                                    | run #235 entry.                                              |

## 4. Dependencies

| Library                | Version | Rationale                                                |
| ---------------------- | ------- | -------------------------------------------------------- |
| `@ever-jobs/common`    | (workspace) | shared `createHttpClient`, `stripHtmlTags`.          |
| `@ever-jobs/models`    | (workspace) | `Site`, `JobPostDto`, `LocationDto`, `JobResponseDto`, `IScraper`. |
| `@ever-jobs/plugin`    | (workspace) | `@SourcePlugin` decorator.                            |
| `@nestjs/common`       | (existing)  | `@Injectable`, `@Module`, `Logger`.                   |

No new third-party dependencies (NFR-3).

## 5. Risks & Mitigations

| Risk                                                | Likelihood | Impact | Mitigation                                                       |
| --------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Airbnb moves off Greenhouse mid-maintenance.        | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-doordash`'s shape.       | L          | L      | Pattern frozen by FR-1..FR-10; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module
  that nothing else imports.
- The four registration touch-points each have one new line — strip
  them.
- `Site.AIRBNB` is unused outside this plugin, so the enum revert
  is safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 025 § 10 Decisions for the four resolved points.)
