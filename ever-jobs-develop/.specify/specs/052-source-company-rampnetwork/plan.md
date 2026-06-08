# Plan: 052 — Source Company Plugin: Ramp Network

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Ramp Network's careers board is hosted on Greenhouse at the slug
`rampnetwork`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-circleci` (Spec 051 / run
#261), `source-company-buildkite` (Spec 050 / run #260),
`source-company-mercury` (Spec 049 / run #259), `source-company-gusto`
(Spec 048 / run #258), `source-company-brex` (Spec 047 / run #257), and the
twenty-eight other Greenhouse-backed company-direct plugins already call.
The plan is to copy the Buildkite plugin's shape (single-file `service.ts`,
four-line `module.ts`, two-line `index.ts`, six-line `package.json`,
three-line `tsconfig.json`) because Buildkite is the closest structural
cousin: both publish through the new `job-boards.greenhouse.io` permalink
subdomain family, both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline, AND both emit a
wire `company_name` that the JobPostDto pins as a string literal
byte-for-byte (no legal-entity suffix to clean). After the code lands, the
plugin is wired into the four registration points: `Site` enum, plugins
barrel, `tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`.
Then the unit-test fixture and eight Jest cases run under the existing test
config without further changes.

The work has one structural deviation from the Buildkite template: the
fallback `jobUrl` shape mirrors the wire `absolute_url`
`https://job-boards.eu.greenhouse.io/rampnetwork/jobs/<id>` byte-for-byte
— the **EU-region** permalink subdomain `job-boards.eu.greenhouse.io`
rather than the US-region `job-boards.greenhouse.io`. This is the
**sixth** distinct wire-shape variant in the cohort and the first plugin
to use the EU-region subdomain. The deviation is encapsulated inside
`rampnetwork.service.ts`; no shared code changes. The shaving of risk
comes entirely from leaning on a pattern the codebase has used forty
times before (Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe,
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel,
Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-rampnetwork` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-rampnetwork/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,rampnetwork.module.ts,rampnetwork.service.ts}`,
    `__tests__/rampnetwork.service.spec.ts`,
    `__tests__/fixtures/rampnetwork-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 052 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-rampnetwork` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-rampnetwork`          | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `RAMPNETWORK = 'rampnetwork'`.                        |
| `packages/plugins/index.ts`                            | import + append `RampNetworkModule` to `ALL_SOURCE_MODULES`. |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Ramp Network shipped row.                                |
| `docs/index.md`                                        | append Spec 052 to the specs table.                          |
| `docs/log.md`                                          | run #262 entry.                                              |

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
| Ramp Network moves off Greenhouse mid-maintenance.  | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-buildkite`'s shape.      | L          | L      | Pattern frozen by FR-1..FR-12; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Ramp Network tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Greenhouse re-routes EU-region tenants to the US-region subdomain. | L | L | Wire `absolute_url` is preferred; fallback only kicks in on a missing wire URL. If `job-boards.greenhouse.io` becomes the wire form, the plugin will return that automatically. The fallback's EU-region scheme can be US-region-normalised in a future spec without breaking change. |
| Ramp Network wire `company_name` changes form (e.g. `Ramp Swaps Ltd.`). | L | L | Plugin pins `companyName === 'Ramp Network'` as a string literal, so wire shape changes don't propagate. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.RAMPNETWORK` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 052 § 10 Decisions for the ten resolved points.)
