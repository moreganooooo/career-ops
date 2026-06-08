# Plan: 047 — Source Company Plugin: Brex

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-02 |
| Last updated | 2026-05-02 |

## 1. Approach

Brex's careers board is hosted on Greenhouse at the slug `brex`,
so the implementation is a thin wrapper around the same public Greenhouse
endpoint that `source-company-duolingo` (Spec 046 / run #256),
`source-company-klaviyo` (Spec 045 / run #255), `source-company-affirm`
(Spec 044 / run #254), `source-company-vercel` (Spec 043 / run #253),
`source-company-block` (Spec 042 / run #252), `source-company-roblox`
(Spec 041 / run #251), `source-company-dropbox` (Spec 040 / run #250),
`source-company-instacart` (Spec 039 / run #249), `source-company-datadog`
(Spec 038 / run #248), `source-company-mongodb` (Spec 037 / run #247),
`source-company-cloudflare` (Spec 036 / run #246), `source-company-twilio`
(Spec 035 / run #245), `source-company-twitch` (Spec 034 / run #244),
`source-company-gitlab` (Spec 033 / run #243), `source-company-figma`
(Spec 032 / run #242), `source-company-asana` (Spec 031), and the
twenty-three other Greenhouse-backed company-direct plugins already call.
The plan is to copy the Duolingo plugin's shape (single-file `service.ts`,
four-line `module.ts`, two-line `index.ts`, six-line `package.json`,
three-line `tsconfig.json`) and rename references from Duolingo → Brex,
then wire the new package into the four registration points: `Site`
enum, plugins barrel, `tsconfig.base.json` paths, `jest.config.js`
`moduleNameMapper`. After the code lands, the unit-test fixture and eight
Jest cases run under the existing test config without further changes.

The work has two structural deviations from the Duolingo template:

1. **Fallback `jobUrl` shape** — Brex's tenant proxies its `absolute_url`
   through `https://www.brex.com/careers/<id>?gh_jid=<id>` (the apex
   marketing-site `www.` domain, taking the Greenhouse job id BOTH as a
   path segment AND as a `?gh_jid=<id>` query parameter), not through
   Duolingo's `careers.` subdomain shape `https://careers.duolingo.com/
   jobs/<id>?gh_jid=<id>` and not through Klaviyo's apex-query-only shape
   `https://www.klaviyo.com/careers/jobs?gh_jid=<id>`. The fallback URL
   template uses the apex-www-careers-path-AND-query shape so a
   defence-in-depth caller still lands on a working detail page (Spec
   047 § 10 D-04).
2. **Title trim** — Brex's Greenhouse tenant pads some titles with
   surrounding ASCII spaces (e.g. ` Account Executive, E-Commerce `).
   The service trims the wire `title` before mapping to `JobPostDto`
   (Spec 047 § 10 D-09). The trim is a `String.prototype.trim()` call —
   no shared helper change.

The description-cleanup pipeline (`stripHtmlTags(decodeHtmlEntities(x))`)
is identical to Duolingo's because Brex uses the same HTML-entity-
encoded content shape — confirmed via run #257's live probe (Spec 047 §
10 D-08).

Both structural deviations are encapsulated inside `brex.service.ts`;
no shared code changes. The shaving of risk comes entirely from leaning
on a pattern the codebase has used thirty-five times before (Amazon,
Apple, Cursor, Google, IBM, Meta, OpenAI, Stripe, Anthropic, Databricks,
Discord, Coinbase, DoorDash, Airbnb, Robinhood, Reddit, Pinterest, Lyft,
Plaid, Asana, Figma, Gitlab, Twitch, Twilio, Cloudflare, MongoDB, Datadog,
Instacart, Dropbox, Roblox, Block, Vercel, Affirm, Klaviyo, Duolingo).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-brex` under `ALL_SOURCE_MODULES` with
  passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-brex/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,brex.module.ts,brex.service.ts}`,
    `__tests__/brex.service.spec.ts`,
    `__tests__/fixtures/brex-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 047 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-brex` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npm run lint:docs` → exit 0.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                              | Change                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-brex`               | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`             | append `BREX = 'brex'`.                                      |
| `packages/plugins/index.ts`                          | import + append `BrexModule` to `ALL_SOURCE_MODULES`.        |
| `tsconfig.base.json`                                 | path-alias entry.                                            |
| `jest.config.js`                                     | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                    | add Brex shipped row.                                        |
| `docs/index.md`                                      | append Spec 047 to the specs table.                          |
| `docs/log.md`                                        | run #257 entry.                                              |

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
| Brex moves off Greenhouse mid-maintenance.          | L          | M      | Plugin returns `{ jobs: [] }` on 404 (FR-9); Spec 005 circuit breaker isolates the failure; future spec re-targets the new ATS. |
| Greenhouse public-API rate-limits a polling caller. | M          | L      | The `Spec 005 / source-health` breaker already throttles per-source pulls; this plugin sits behind that. |
| Drift from `source-company-duolingo`'s shape.       | L          | L      | Pattern frozen by FR-1..FR-12; spec is reviewable side-by-side.  |
| Live Greenhouse fixture rot ages the unit tests.    | L          | L      | Fixtures are committed JSON; test suite mocks `createHttpClient`, so live drift cannot break unit tests. |
| Brex tenant flips encoding mode (entities → raw HTML). | L       | L      | The `stripHtmlTags(decodeHtmlEntities(x))` pipeline is idempotent for the raw-HTML case (entities pass through unchanged then tags strip), so a flip is graceful. |
| Brex tenant stops padding titles with whitespace.   | L          | L      | `.trim()` is idempotent on whitespace-clean strings, so the deviation is forward-compatible. |
| Brex migrates `absolute_url` to a Greenhouse permalink subdomain. | L | L | The fallback would still work — Greenhouse populates `absolute_url` on every listing in practice, so the fallback path is defence-in-depth. |

## 6. Rollback Plan

Revert the single PR. All edits are additive:

- Removing the new package directory deletes a stand-alone module that
  nothing else imports.
- The four registration touch-points each have one new line — strip them.
- `Site.BREX` is unused outside this plugin, so the enum revert is
  safe.

No data migration is involved (the plugin owns no persistent state).

## 7. Migration Plan (if applicable)

(None — net-new plugin, no consumers to migrate.)

## 8. Open Questions for Plan

(None — see Spec 047 § 10 Decisions for the nine resolved points.)
