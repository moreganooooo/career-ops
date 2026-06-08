# Plan: 061 — Source Company Plugin: Intercom

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Intercom's careers board is hosted on Greenhouse at the slug `intercom`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-elastic` (Spec 060 / run #270),
`source-company-attentive` (Spec 058 / run #268), and the thirty-nine
other Greenhouse-backed company-direct plugins already call. The plan is
to copy the Attentive plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-line
`tsconfig.json`) because Attentive is the closest structural cousin: both
emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), both apply
a wire-title `.trim()` deviation (D-10) on a subset of titles, both
publish `absolute_url` on variant 2 (`job-boards.greenhouse.io/<slug>/jobs/<id>`),
both omit the brand-name trim (D-09 not applied — wire `company_name` is
already the bare brand), and both emit flat single-token department names.
After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

The work introduces **zero structural deviations** from the Attentive
template — Intercom is a near-pure Attentive twin (same variant 2,
same D-08, same D-09 omission, same D-10 application). The only
behavioural difference is the pad-rate: Attentive's run-268 probe found
4 of 59 padded titles (6.8 %); Intercom's run-271 probe finds 25 of 174
padded titles (14.4 %, the **highest pad-rate of any cohort plugin to
date**). The shaving of risk comes entirely from leaning on a pattern the
codebase has used forty-nine times before (Amazon, Apple, Cursor, Google,
IBM, Meta, OpenAI, Stripe, Anthropic, Databricks, Discord, Coinbase,
DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft, Plaid, Asana,
Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog, Instacart,
Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto,
Mercury, Buildkite, CircleCI, Ramp Network, Netlify, Postman, Toast,
Webflow, ZoomInfo, Attentive, Chime, Elastic).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-intercom` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-intercom/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,intercom.module.ts,intercom.service.ts}`,
    `__tests__/intercom.service.spec.ts`,
    `__tests__/fixtures/intercom-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 061 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-intercom` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-intercom`             | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `INTERCOM = 'intercom'`.                              |
| `packages/plugins/index.ts`                            | import + append `IntercomModule` to `ALL_SOURCE_MODULES`.    |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Intercom shipped row.                                    |
| `docs/index.md`                                        | append Spec 061 to the specs table.                          |
| `docs/log.md`                                          | run #271 entry.                                              |

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
| Intercom moves off Greenhouse mid-maintenance.      | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-attentive`'s shape.      | L          | L      | Pattern frozen by FR-1..FR-13; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Intercom tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Intercom tenant migrates wire `absolute_url` away from variant 2. | M | L | The plugin reads `listing.absolute_url` first and only uses the variant-2 fallback when wire shape is missing — so a tenant flip flows through transparently. |
| Wire `company_name` flips from `'Intercom'` to a legal-entity suffix form (e.g. `'Intercom Inc.'`). | L | L | The plugin reads `listing.company_name` directly; if the shape changes, a follow-up patch can pin the brand `'Intercom'` (D-09 introduction). |
| Wire `departments[0].name` flat-format changes (e.g. compound `' - '`-separated form like Elastic). | L | L | The plugin emits the wire `departments[0].name` byte-for-byte; consumer-side splitting is the consumer's choice. The unit-test happy path pins the flat form so a flip would surface as a test diff. |
| Wire-title pad-byte rate drops to zero. | L | L | The plugin's `.trim()` on `listing.title` is a no-op for already-clean titles; pad-byte rate dropping to zero means the trim becomes inert without a code change. |
| Wire department `'Legal '` trailing-pad propagates to additional department names. | L | L | The plugin emits department names byte-for-byte; the case-insensitive `searchTerm` filter remains semantically correct against padded forms (since `'X '.toLowerCase().includes('x')` is true). |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.INTERCOM` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 061 § 10 Decisions for the eleven resolved points.)
