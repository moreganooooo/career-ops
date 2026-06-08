# Plan: 060 — Source Company Plugin: Elastic

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Elastic's careers board is hosted on Greenhouse at the slug `elastic`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-chime` (Spec 059 / run #269),
`source-company-attentive` (Spec 058 / run #268), and the thirty-eight
other Greenhouse-backed company-direct plugins already call. The plan
is to copy the Attentive plugin's shape (single-file `service.ts`,
four-line `module.ts`, two-line `index.ts`, six-line `package.json`,
three-line `tsconfig.json`) because Attentive is the closest structural
cousin: both emit HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08) AND both
apply a wire-title `.trim()` deviation (D-10) on a subset of titles.
After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

The work introduces **one structural deviation** from the Attentive
template:

1. **D-04 — wire-shape variant 11 fallback URL.** Elastic's tenant
   publishes its `absolute_url` on a vanity-domain shape
   `https://jobs.elastic.co/jobs?gh_jid=<id>&gh_jid=<id>` (custom
   `jobs.elastic.co` host; duplicate `gh_jid=<id>&gh_jid=<id>` query
   parameter the second of which reflects the same listing id as the
   first). The plugin's fallback `jobUrl` constructor mirrors this
   byte-for-byte. First plugin in the cohort to use variant 11.

Elastic shares the D-08 entity-decode-then-tag-strip pipeline (16th
plugin in the cohort) and the D-10 wire-title `.trim()` (5th plugin in
the cohort, after Brex, Buildkite, ZoomInfo, Attentive). Elastic does
**not** apply the D-09 brand-name trim (wire `company_name === 'Elastic'`
byte-for-byte; no legal-entity suffix). The shaving of risk comes
entirely from leaning on a pattern the codebase has used forty-eight
times before (Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe,
Anthropic, Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood,
Reddit, Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio,
Cloudflare, MongoDB, Datadog, Instacart, Dropbox, Roblox, Block,
Vercel, Affirm, Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite,
CircleCI, Ramp Network, Netlify, Postman, Toast, Webflow, ZoomInfo,
Attentive, Chime).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-elastic` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-elastic/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,elastic.module.ts,elastic.service.ts}`,
    `__tests__/elastic.service.spec.ts`,
    `__tests__/fixtures/elastic-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 060 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-elastic` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-elastic`              | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `ELASTIC = 'elastic'`.                                |
| `packages/plugins/index.ts`                            | import + append `ElasticModule` to `ALL_SOURCE_MODULES`.     |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Elastic shipped row.                                     |
| `docs/index.md`                                        | append Spec 060 to the specs table.                          |
| `docs/log.md`                                          | run #270 entry.                                              |

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
| Elastic moves off Greenhouse mid-maintenance.       | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-attentive`'s shape.      | L          | L      | Pattern frozen by FR-1..FR-13; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Elastic tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Elastic tenant migrates wire `absolute_url` from variant 11 → variant 2. | M | L | The plugin reads `listing.absolute_url` first and only uses the variant-11 fallback when wire shape is missing — so a tenant flip flows through transparently. |
| Wire `company_name` flips from `'Elastic'` to a legal-entity suffix form (e.g. `'Elastic NV'`). | L | L | The plugin reads `listing.company_name` directly; if the shape changes, a follow-up patch can pin the brand `'Elastic'` (D-09 introduction). |
| Wire `departments[0].name` compound-format changes. | L | L | The plugin emits the wire `departments[0].name` byte-for-byte; consumer-side splitting is the consumer's choice. The unit-test happy path pins the compound-form so a flip would surface as a test diff. |
| Wire-title pad-byte rate drops to zero. | L | L | The plugin's `.trim()` on `listing.title` is a no-op for already-clean titles; pad-byte rate dropping to zero means the trim becomes inert without a code change. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.ELASTIC` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 060 § 10 Decisions for the eleven resolved points.)
