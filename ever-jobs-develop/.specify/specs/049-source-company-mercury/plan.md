# Plan: 049 — Source Company Plugin: Mercury

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Mercury's careers board is hosted on Greenhouse at the slug `mercury`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-gusto` (Spec 048 / run #258),
`source-company-brex` (Spec 047 / run #257), `source-company-duolingo`
(Spec 046 / run #256), `source-company-klaviyo` (Spec 045 / run #255),
`source-company-affirm` (Spec 044 / run #254), `source-company-vercel`
(Spec 043 / run #253), and the twenty-six other Greenhouse-backed
company-direct plugins already call. The plan is to copy the Gusto
plugin's shape (single-file `service.ts`, four-line `module.ts`,
two-line `index.ts`, six-line `package.json`, three-line `tsconfig.json`)
because Gusto is the closest structural cousin: both publish through
the new `job-boards.greenhouse.io/<slug>/jobs/<id>` permalink subdomain
AND both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline. After the code
lands, the plugin is wired into the four registration points: `Site`
enum, plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. Then the unit-test fixture and eight Jest cases run
under the existing test config without further changes.

The work has one minor structural deviation from the Gusto template:
the wire `company_name` is the bare brand name `Mercury` (no
legal-entity suffix), so the brand-name pin in the `JobPostDto` mapping
emits `'Mercury'` as a string literal that matches the wire `company_name`
byte-for-byte. This is functionally identical to Gusto's pin, except
the regression guard in the unit test is simpler — it asserts
`companyName === 'Mercury'` AND `companyName === wire.company_name`
(no inequality assertion needed because there is no legal-entity suffix
to clean). This is the sole structural deviation and is encapsulated
inside `mercury.service.ts`; no shared code changes. The shaving of
risk comes entirely from leaning on a pattern the codebase has used
thirty-seven times before (Amazon, Apple, Cursor, Google, IBM, Meta,
OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase, DoorDash,
Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab,
Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox,
Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-mercury` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-mercury/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,mercury.module.ts,mercury.service.ts}`,
    `__tests__/mercury.service.spec.ts`,
    `__tests__/fixtures/mercury-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 049 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-mercury` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                              | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-mercury`            | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`             | append `MERCURY = 'mercury'`.                                |
| `packages/plugins/index.ts`                          | import + append `MercuryModule` to `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                 | path-alias entry.                                            |
| `jest.config.js`                                     | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | add Mercury shipped row.                                     |
| `docs/index.md`                                      | append Spec 049 to the specs table.                          |
| `docs/log.md`                                        | run #259 entry.                                              |

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
| Mercury moves off Greenhouse mid-maintenance.       | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-gusto`'s shape.          | L          | L      | Pattern frozen by FR-1..FR-11; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Mercury tenant flips encoding mode (entities → raw HTML). | L    | L      | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Mercury migrates `absolute_url` to a marketing-site shape. | L   | L      | The fallback would still work — Greenhouse populates `absolute_url` on every listing in practice, so the fallback path is defence-in-depth. |
| Mercury wire `company_name` changes form (e.g. `Mercury Technologies, Inc.`). | L | L | Plugin pins `companyName === 'Mercury'` as a string literal, so wire shape changes don't propagate. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.MERCURY` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 049 § 10 Decisions for the nine resolved points.)
