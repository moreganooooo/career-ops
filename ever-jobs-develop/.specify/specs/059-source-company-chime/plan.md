# Plan: 059 — Source Company Plugin: Chime

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Chime's careers board is hosted on Greenhouse at the slug `chime`, so
the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-attentive` (Spec 058 / run #268),
`source-company-zoominfo` (Spec 057 / run #267), and the thirty-seven
other Greenhouse-backed company-direct plugins already call. The plan
is to copy the Attentive plugin's shape (single-file `service.ts`,
four-line `module.ts`, two-line `index.ts`, six-line `package.json`,
three-line `tsconfig.json`) because Attentive is the closest structural
cousin: both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline AND both carry
the same flat single-token department-name format. After the code
lands, the plugin is wired into the four registration points: `Site`
enum, plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. Then the unit-test fixture and eight Jest cases
run under the existing test config without further changes.

The work introduces **two structural deviations** from the Attentive
template:

1. **D-04 — wire-shape variant 10 fallback URL.** Chime's tenant
   publishes its `absolute_url` on the legacy hosted-board apex
   `https://boards.greenhouse.io/chime/jobs/<id>?gh_jid=<id>` (no
   `job-` prefix on the host; trailing `?gh_jid=<id>` query suffix).
   The plugin's fallback `jobUrl` constructor mirrors this byte-for-
   byte. First plugin in the cohort to use variant 10.
2. **D-09 — brand-name trim string-literal pin.** Chime's wire
   `company_name` is `'Chime Financial, Inc'` (note no trailing `.`
   after `Inc`). The plugin pins `companyName === 'Chime'` as a string
   literal, byte-for-byte. Fourth plugin in the cohort to apply a
   brand-name trim D-09 (after Affirm, Gusto, ZoomInfo).

Chime does **not** apply the D-10 wire-title `.trim()` (no padded
titles in the run-269 probe). The shaving of risk comes entirely from
leaning on a pattern the codebase has used forty-seven times before
(Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-chime` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-chime/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,chime.module.ts,chime.service.ts}`,
    `__tests__/chime.service.spec.ts`,
    `__tests__/fixtures/chime-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 059 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-chime` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-chime`                | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `CHIME = 'chime'`.                                    |
| `packages/plugins/index.ts`                            | import + append `ChimeModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Chime shipped row.                                       |
| `docs/index.md`                                        | append Spec 059 to the specs table.                          |
| `docs/log.md`                                          | run #269 entry.                                              |

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
| Chime moves off Greenhouse mid-maintenance.         | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-attentive`'s shape.      | L          | L      | Pattern frozen by FR-1..FR-13; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Chime tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Chime tenant migrates wire `absolute_url` from variant 10 → variant 2. | M | L | The plugin reads `listing.absolute_url` first and only uses the variant-10 fallback when wire shape is missing — so a tenant flip flows through transparently. The fallback constructor would then be exercised for legacy entries until the next deploy. |
| Wire `company_name` legal-entity suffix changes. | L | L | The plugin pins the brand `'Chime'` as a string literal (D-09), so a wire-shape rename like `'Chime Bank Inc'` flows through to the same emit. |
| Wire `departments[0].name` flat-name format changes. | L | L | The plugin emits the wire `departments[0].name` byte-for-byte; consumer-side splitting is the consumer's choice. The unit-test happy path pins the flat-name form so a flip would surface as a test diff. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.CHIME` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 059 § 10 Decisions for the eleven resolved points.)
