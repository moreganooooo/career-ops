# Plan: 066 — Source Company Plugin: Carta

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Carta's careers board is hosted on Greenhouse at the slug `carta`,
so the implementation is a thin wrapper around the same public
Greenhouse endpoint that `source-company-cameo` (Spec 065 / run
#275), `source-company-mixpanel` (Spec 062 / run #272), and the
fifty-three other Greenhouse-backed company-direct plugins already
call. The plan is to copy the Cameo plugin's shape (single-file
`service.ts`, four-line `module.ts`, two-line `index.ts`, six-line
`package.json`, three-line `tsconfig.json`) because Cameo is the
closest structural cousin: both publish `absolute_url` on
**wire-shape variant 2** (the modern US-region permalink subdomain
`job-boards.greenhouse.io/<slug>/jobs/<id>` shape), both emit
HTML-entity-encoded content requiring the
`stripHtmlTags(decodeHtmlEntities(content))` pipeline (D-08), and
both omit the brand-name trim D-09 against a bare-brand wire
`company_name`.

The work introduces **two structural deviations** from the Cameo
template:

1. **D-10 applied.** Cameo's wire titles are 0 of 3 padded (zero pad
   rate). Carta carries at least 1 of 10 wire titles with a trailing
   ASCII-space pad byte (`'Business Development Manager, Private
   Equity '` — confirmed via the run-276 WebFetch probe; the other 9
   are clean — ~10 % pad rate). The plugin applies `.trim()` to the
   wire `title` before downstream filters and emit. The unit-test
   happy path includes a regression guard asserting the emitted
   `title` matches the trimmed form byte-for-byte AND is byte-
   distinct from the wire-padded form.

2. **D-11 fully-clean.** Cameo's wire department names carry 1 of 3
   with a trailing pad byte (~33.3 %). Carta's wire department names
   are 0 of 10 padded (0 %). The plugin still emits the wire
   `departments[0].name` byte-for-byte without a `.trim()` (the
   pass-through preserves byte-fidelity to the wire shape and is a
   no-op on the clean wire data; if Carta adds padding upstream in
   the future, the pass-through observability lock catches the
   diff in the unit tests).

The brand-name handling reverts to a **single-token bare-brand**
wire form (`'Carta'`), byte-distinct from Cameo's `'Cameo'` and Scale
AI's multi-token `'Scale AI'` (with internal whitespace) but identical
in pipeline shape — the plugin reads `listing.company_name` directly
and the unit-test asserts `companyName === 'Carta'` byte-for-byte.

After the code lands, the plugin is wired into the four registration
points: `Site` enum, plugins barrel, `tsconfig.base.json` paths,
`jest.config.js` `moduleNameMapper`. Then the unit-test fixture and
eight Jest cases run under the existing test config without further
changes.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- **Goal:** Land `source-company-carta` under `ALL_SOURCE_MODULES`
  with passing unit tests and a green doc-lint pass.
- **Deliverables:**
  - `packages/plugins/source-company-carta/` (`package.json`,
    `tsconfig.json`,
    `src/{index.ts,carta.module.ts,carta.service.ts}`,
    `__tests__/carta.service.spec.ts`,
    `__tests__/fixtures/carta-jobs.json`).
  - One-line edits to: `packages/models/src/enums/site.enum.ts`,
    `packages/plugins/index.ts`, `tsconfig.base.json`, `jest.config.js`.
  - One-row update to `docs/SOURCE_ADOPTION_BACKLOG.md` ("shipped"
    status), index-table addition for Spec 066 in `docs/index.md`, log
    entry in `docs/log.md`.
- **Exit criteria:**
  - `npx jest packages/plugins/source-company-carta` → all green.
  - `npx jest packages/common/__tests__/helpers.spec` → 77/77 still green.
  - `npx jest packages/plugins/source-company-cameo packages/plugins/source-company-mixpanel` → unchanged green.
  - GitHub Actions on the resulting commit → all green.

## 3. Packages Touched

| Package                                                 | Change                                                       |
| ------------------------------------------------------- | ------------------------------------------------------------ |
| `packages/plugins/source-company-carta`                 | **new package**.                                             |
| `packages/models/src/enums/site.enum.ts`                | append `CARTA = 'carta'`.                                    |
| `packages/plugins/index.ts`                             | import + append `CartaModule` to `ALL_SOURCE_MODULES`.       |
| `tsconfig.base.json`                                    | path-alias entry.                                            |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                    |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Carta shipped row.                                       |
| `docs/index.md`                                         | append Spec 066 to the specs table.                          |
| `docs/log.md`                                           | run #276 entry at top.                                       |

## 4. Sequencing

T01 (enum) → T02 (scaffold) → T03 (registration) → T04 (tests) → T05 (docs).
Each task has explicit acceptance criteria in `tasks.md`. Run jest after
T04 and before T05. Do not commit until all suites are green.

## 5. Risks

- **R-01 — Tenant rename to add a legal-entity suffix to wire
  `company_name`.** Mitigation: the unit-test happy path asserts
  `companyName === 'Carta'` byte-for-byte, so a rename surfaces as a
  test diff. If Carta updates the wire payload to include the legal-
  entity suffix `'Carta, Inc.'`, a follow-up patch re-introduces D-09
  as a one-line string-literal pin.
- **R-02 — Wire-title pad rate drifts upward over time.** Mitigation:
  the plugin already applies `.trim()` (D-10), so an increase in pad
  rate is fully covered. If the pad rate ever drops to 0 % (Carta
  cleans titles upstream), the trim becomes a no-op without
  observable downstream diff — the regression guards remain green.
- **R-03 — Fallback `jobUrl` shape diverges from upstream.** Mitigation:
  the unit-test happy path asserts the wire `absolute_url` flows through
  to `jobUrl` byte-for-byte AND that the emitted `jobUrl` contains the
  literal `job-boards.greenhouse.io` substring AND the literal
  `/carta/jobs/` substring AND must NOT contain `?gh_jid=` (locking
  the variant-2 shape against future refactors that might naively
  normalise to a variant-10 or variant-11 template).
- **R-04 — Department-name pad-rate drifts in either direction.**
  The wire department names are currently fully clean (0 of 10
  padded). The plugin emits byte-for-byte; if Carta introduces
  padding upstream, the unit-test happy path's byte-for-byte assertion
  surfaces the diff. Mitigation: a follow-up patch then either updates
  the fixture to match (preserving the pass-through) or adds a
  `.trim()` on the department side. The pass-through approach is
  intentionally observable rather than silently sanitising.
- **R-05 — Multi-region currency posture.** Carta posts roles in
  Sydney (AUD), New York (USD), and Seattle (USD). The helpers
  bench (Spec 015) covers AUD and USD without modification, so no
  currency-specific code is needed in this plugin.
