# Plan: 141 — Source Company Plugin: ComplyAdvantage

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-04 |
| Last updated | 2026-05-04 |

## 1. Approach

ComplyAdvantage's careers board is hosted on Greenhouse at the
slug `complyadvantage`. Mirror Epic Games (Spec 069) byte-for-
byte — Epic Games is the closest behavioural cousin sharing
variant 13 (`<brand-domain>.com/careers/jobs/<id>?gh_jid=<id>`),
D-08, D-10 applied, D-11 omitted.

**One structural deviation** from Epic Games — D-09 sub-axis:
Epic Games has multi-token bare-brand `'Epic Games'` with
internal whitespace (single-cap-only); ComplyAdvantage has
TWO-cap PascalCase concatenated `'ComplyAdvantage'` (caps at
0 and 6). **Sixth cohort observation of TWO-cap PascalCase
D-09 sub-axis** after SoFi, StockX, xAI, LaunchDarkly, and
PagerDuty. Caps-at-0/6 matches LaunchDarkly's caps-position
pattern exactly.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                       | Change                                                               |
| ------------------------------------------------------------- | -------------------------------------------------------------------- |
| `packages/plugins/source-company-complyadvantage`             | **new package**.                                                     |
| `packages/models/src/enums/site.enum.ts`                      | append `COMPLYADVANTAGE = 'complyadvantage'` (Phase 151).            |
| `packages/plugins/index.ts`                                   | import + register `ComplyAdvantageModule` in `ALL_SOURCE_MODULES`.   |
| `tsconfig.base.json`                                          | path alias `@ever-jobs/source-company-complyadvantage`.              |
| `jest.config.js`                                              | matching `moduleNameMapper` entry.                                   |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                             | mark `complyadvantage` row as shipped.                               |
| `docs/index.md` / `docs/log.md`                               | run-#351 entry.                                                      |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Wire `absolute_url` may flip from variant-13 vanity-domain to canonical Greenhouse subdomain mid-quarter without notice. | Plugin emits `listing.absolute_url` byte-for-byte; the **fallback** `jobUrl` constructor defaults to the canonical Greenhouse variant-2 form rather than reconstructing the vanity-domain shape, ensuring fallback URLs are always resolvable even if Greenhouse degrades the vanity-domain proxy (same defence-in-depth strategy as Epic Games / Bitwarden / Stitch Fix). |
