# Plan: 058 — Source Company Plugin: Attentive

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Attentive's careers board is hosted on Greenhouse at the slug
`attentive`, so the implementation is a thin wrapper around the same
public Greenhouse endpoint that `source-company-webflow` (Spec 056 /
run #266), `source-company-zoominfo` (Spec 057 / run #267), and the
thirty-six other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Webflow plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Webflow is the
closest structural cousin: both publish their `absolute_url` on
wire-shape variant 2 (the US-region permalink subdomain
`https://job-boards.greenhouse.io/<slug>/jobs/<id>`) AND both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline AND both have a
wire `company_name` that matches the brand byte-for-byte (no D-09
trim needed). After the code lands, the plugin is wired into the
four registration points: `Site` enum, plugins barrel,
`tsconfig.base.json` paths, `jest.config.js` `moduleNameMapper`. Then
the unit-test fixture and eight Jest cases run under the existing
test config without further changes.

The work introduces **one structural deviation** from the Webflow
template: a `.trim()` on the wire `title` to handle a subset of
Attentive titles padded with trailing ASCII spaces (D-10 — fourth
cohort plugin to apply a wire-title trim, after Brex, Buildkite, and
ZoomInfo). The shaving of risk comes entirely from leaning on a
pattern the codebase has used forty-six times before (Amazon, Apple,
Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest,
Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare,
MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm,
Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp
Network, Netlify, Postman, Toast, Webflow, ZoomInfo).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-attentive` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-attentive/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,attentive.module.ts,attentive.service.ts}`,
    `__tests__/attentive.service.spec.ts`,
    `__tests__/fixtures/attentive-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 058 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-attentive` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-attentive`            | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `ATTENTIVE = 'attentive'`.                            |
| `packages/plugins/index.ts`                            | import + append `AttentiveModule` to `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Attentive shipped row.                                   |
| `docs/index.md`                                        | append Spec 058 to the specs table.                          |
| `docs/log.md`                                          | run #268 entry.                                              |

## 4. Dependencies

| Library                | Version     | Rationale                                                         |
| ---------------------- | ----------- | ----------------------------------------------------------------- |
| `@ever-jobs/common`    | (workspace) | shared `createHttpClient`, `stripHtmlTags`, `decodeHtmlEntities`. |
| `@ever-jobs/models`    | (workspace) | `Site`, `JobPostDto`, `LocationDto`, `JobResponseDto`, `IScraper`. |
| `@ever-jobs/plugin`    | (workspace) | `@SourcePlugin` decorator.                                        |
| `@nestjs/common`       | (existing)  | `@Injectable`, `@Module`, `Logger`.                               |

No new third-party dependencies (NFR-3).

## 5. Risks & Mitigations

| Risk                                                | Likelihood | Impact | Mitigation                                                       |
| --------------------------------------------------- | ---------- | ------ | ---------------------------------------------------------------- |
| Attentive moves off Greenhouse mid-maintenance.     | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-webflow`'s shape.        | L          | L      | Pattern frozen by FR-1..FR-13; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Attentive tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Wire-title trailing-pad bytes recur for new roles.  | M | L | The plugin applies `.trim()` to every wire title before the JobPostDto emit (D-10), so future padded titles flow through trimmed. |
| Wire `departments[0].name` flat-name format changes. | L | L | The plugin emits the wire `departments[0].name` byte-for-byte; consumer-side splitting is the consumer's choice. The unit-test happy path pins the flat-name form so a flip would surface as a test diff. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.ATTENTIVE` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 058 § 10 Decisions for the eleven resolved points.)
