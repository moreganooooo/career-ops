# Plan: 020 — Source Company Plugin: Anthropic

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-01 |
| Last updated | 2026-05-01 |

## 1. Approach

Anthropic's careers board is hosted on Greenhouse at the slug `anthropic`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-stripe` already calls. The plan is to copy
the Stripe plugin's shape (single-file `service.ts`, three-line `module.ts`,
two-line `index.ts`, four-line `package.json`, three-line `tsconfig.json`)
and rename references from Stripe → Anthropic, then wire the new package
into the four registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`. After the
code lands, the unit-test fixture and seven Jest cases run under the
existing test config without further changes.

The work is small enough to ship in a single phase — no migration, no
breaking change, no rollback plan beyond `git revert`. The shaving of
risk comes entirely from leaning on a pattern the codebase has used eight
times before (Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-anthropic` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-anthropic/` (`package.json`,
    `tsconfig.json`, `src/{index.ts,anthropic.module.ts,anthropic.service.ts}`,
    `__tests__/anthropic.service.spec.ts`,
    `__tests__/fixtures/anthropic-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md`
    ("shipped" status), index-table addition for Spec 020 in
    `docs/index.md`, log entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-anthropic` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                          | Change                                                       |
| ------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-anthropic`      | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`         | append `ANTHROPIC = 'anthropic'`.                            |
| `packages/plugins/index.ts`                      | import + append `AnthropicModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                             | path-alias entry.                                            |
| `jest.config.js`                                 | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                | promote Anthropic from "(implicit) Greenhouse-backed" to a logged shipped row. |
| `docs/index.md`                                  | append Spec 020 to the specs table.                          |
| `docs/log.md`                                    | run #230 entry.                                              |

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
| Anthropic moves off Greenhouse mid-maintenance.     | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-stripe`'s shape.         | L          | L      | Pattern frozen by FR-1..FR-10; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module
  that nothing else imports.
- The four registration touch-points each have one new line — strip
  them.
- `Site.ANTHROPIC` is unused outside this plugin, so the enum revert
  is safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 020 § 10 Decisions for the three resolved points.)
