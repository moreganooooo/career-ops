# Plan: 055 — Source Company Plugin: Toast

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Toast's careers board is hosted on Greenhouse at the slug `toast`, so
the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-postman` (Spec 054 / run #264),
`source-company-netlify` (Spec 053 / run #263),
`source-company-rampnetwork` (Spec 052 / run #262),
`source-company-circleci` (Spec 051 / run #261),
`source-company-buildkite` (Spec 050 / run #260),
`source-company-mercury` (Spec 049 / run #259), and the thirty other
Greenhouse-backed company-direct plugins already call. The plan is to copy
the Postman plugin's shape (single-file `service.ts`, four-line
`module.ts`, two-line `index.ts`, six-line `package.json`, three-line
`tsconfig.json`) because Postman is the closest structural cousin in
description-pipeline shape: both emit HTML-entity-encoded content
requiring the `stripHtmlTags(decodeHtmlEntities(content))` pipeline AND
both emit a wire `company_name` that the JobPostDto pins as a string
literal byte-for-byte (no legal-entity suffix to clean). The one
structural deviation from Postman is the fallback `jobUrl` shape:
Postman uses variant 2 (`https://job-boards.greenhouse.io/postman/jobs/<id>`)
while Toast uses variant 8 (`https://careers.toasttab.com/jobs?gh_jid=<id>`
— careers-subdomain on a sub-brand product domain). After the code lands,
the plugin is wired into the four registration points: `Site` enum,
plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. Then the unit-test fixture and eight Jest cases run
under the existing test config without further changes.

The work has **one new structural deviation** from the Postman template
— Toast is the **eighth** wire-shape variant in the cohort (variant 8 —
careers-subdomain on a sub-brand product domain), the **first plugin in
the cohort to use a sub-brand product domain** (`toasttab.com`) rather
than a slug-name brand domain (`toast.com`), and the **eleventh** plugin
to use the entity-decode-then-tag-strip description pipeline. The other
new cohort-first observation (encoded as a regression guard but not a
structural deviation) is the **colon-separated nested-path department
names with spaced ampersands** (`'Sales : International : Horizon 2'`,
`'R & D : Engineering : Retail'`) that the unit-test fixture exercises
and the happy-path test pins (D-11). The shaving of risk comes entirely
from leaning on a pattern the codebase has used forty-three times before
(Amazon, Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic,
Databricks, Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit,
Pinterest, Lyft, Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare,
MongoDB, Datadog, Instacart, Dropbox, Roblox, Block, Vercel, Affirm,
Klaviyo, Duolingo, Brex, Gusto, Mercury, Buildkite, CircleCI, Ramp Network,
Netlify, Postman).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-toast` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-toast/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,toast.module.ts,toast.service.ts}`,
    `__tests__/toast.service.spec.ts`,
    `__tests__/fixtures/toast-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 055 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-toast` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                | Change                                                       |
| ------------------------------------------------------ | ------------------------------------------------------------ |
| `packages/plugins/source-company-toast`                | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`               | append `TOAST = 'toast'`.                                    |
| `packages/plugins/index.ts`                            | import + append `ToastModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                   | path-alias entry.                                            |
| `jest.config.js`                                       | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                      | add Toast shipped row.                                       |
| `docs/index.md`                                        | append Spec 055 to the specs table.                          |
| `docs/log.md`                                          | run #265 entry.                                              |

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
| Toast moves off Greenhouse mid-maintenance.         | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-postman`'s shape.        | L          | L      | Pattern frozen by FR-1..FR-12; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Toast tenant flips encoding mode (entities → raw HTML). | L | L | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Toast wire `company_name` changes form (e.g. `Toast, Inc.`). | L | L | Plugin pins `companyName === 'Toast'` as a string literal, so wire shape changes don't propagate. |
| Toast moves the careers permalink off `toasttab.com` to `toast.com`. | L | L | The plugin emits the wire `absolute_url` byte-for-byte (the fallback is defence-in-depth; Greenhouse populates `absolute_url` on every observed listing). A domain swap would surface in `absolute_url` and flow through transparently; the variant-8 fallback would only matter if the fallback path triggered AND the canonical domain swap happened simultaneously. |
| Wire `departments[0].name` colon-path format flips to flat. | L | L | The plugin emits the wire `name` byte-for-byte; consumer-side splitting on `' : '` is the consumer's choice. The unit-test happy path pins both colon-path forms so a flip would surface as a test diff. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.TOAST` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 055 § 10 Decisions for the eleven resolved points.)
