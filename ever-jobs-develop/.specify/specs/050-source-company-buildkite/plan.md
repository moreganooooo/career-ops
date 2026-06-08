# Plan: 050 — Source Company Plugin: Buildkite

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Buildkite's careers board is hosted on Greenhouse at the slug `buildkite`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-mercury` (Spec 049 / run #259),
`source-company-gusto` (Spec 048 / run #258), `source-company-brex` (Spec
047 / run #257), `source-company-duolingo` (Spec 046 / run #256),
`source-company-klaviyo` (Spec 045 / run #255), `source-company-affirm`
(Spec 044 / run #254), `source-company-vercel` (Spec 043 / run #253), and
the twenty-six other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Mercury plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Mercury is the closest
structural cousin: both publish through the new
`job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain, both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline, AND both emit a wire
`company_name` that is the bare brand name (no legal-entity suffix to
clean). After the code lands, the plugin is wired into the four
registration points: `Site` enum, plugins barrel, `tsconfig.base.json`
paths, `jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

The work has one minor structural deviation from the Mercury template:
the wire `title` is `.trim()`ed before mapping, because a subset of
Buildkite's tenant publishes role titles padded with surrounding ASCII
spaces (e.g. `'Staff Engineer - Compute & Agents '`, `'Staff GTM Engineer '`,
`'Technical Account Manager '`). This deviation is the same one Brex
(Spec 047) introduced for its tenant; Buildkite is the second plugin in
the cohort to apply it. The deviation is encapsulated inside
`buildkite.service.ts`; no shared code changes. The shaving of risk comes
entirely from leaning on a pattern the codebase has used thirty-eight
times before (Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe,
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-buildkite` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-buildkite/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,buildkite.module.ts,buildkite.service.ts}`,
    `__tests__/buildkite.service.spec.ts`,
    `__tests__/fixtures/buildkite-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 050 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-buildkite` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-buildkite`            | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `BUILDKITE = 'buildkite'`.                            |
| `packages/plugins/index.ts`                            | import + append `BuildkiteModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Buildkite shipped row.                                   |
| `docs/index.md`                                        | append Spec 050 to the specs table.                          |
| `docs/log.md`                                          | run #260 entry.                                              |

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
| Buildkite moves off Greenhouse mid-maintenance.     | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-mercury`'s shape.        | L          | L      | Pattern frozen by FR-1..FR-12; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Buildkite tenant flips encoding mode (entities → raw HTML). | L  | L      | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Buildkite migrates `absolute_url` to a marketing-site shape. | L | L     | The fallback would still work — Greenhouse populates `absolute_url` on every listing in practice, so the fallback path is defence-in-depth. |
| Buildkite wire `company_name` changes form (e.g. `Buildkite Pty Ltd`). | L | L | Plugin pins `companyName === 'Buildkite'` as a string literal, so wire shape changes don't propagate. |
| Buildkite tenant stops padding wire titles with trailing ASCII spaces. | L | L | The `.trim()` is idempotent — already-trimmed strings pass through unchanged. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.BUILDKITE` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 050 § 10 Decisions for the ten resolved points.)
