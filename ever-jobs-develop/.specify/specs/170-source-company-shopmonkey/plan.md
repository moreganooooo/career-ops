# Plan: 170 — Source Company Plugin: Shopmonkey

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-08 |
| Last updated | 2026-05-08 |

## 1. Approach

Shopmonkey's careers board is hosted on Greenhouse at the
slug `shopmonkey`. Mirror Justworks (Spec 129) byte-for-byte —
Justworks is the closest behavioural cousin sharing four
primary axes: D-04 variant 10 (legacy hosted-board apex
`boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`) + D-08 +
D-09 case-symmetric + D-11 omitted. The fifth axis (D-10)
deviates by sub-axis only: Justworks applied D-10 (5 of 82
padded — first-cohort double-trailing-space pad form),
whereas Shopmonkey **omits** D-10 (0 of 9 wire titles padded
— fully-clean title set; no `.trim()` operation).

**One structural deviation** from Justworks — making this
the **forty-ninth near-clean re-spin** in run-history. The
wire-implementation drops the `.trim()` operation on
`listing.title` because there are zero observed pads in the
run-380 probe.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-shopmonkey`            | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `SHOPMONKEY = 'shopmonkey'` (Phase 180).                         |
| `packages/plugins/index.ts`                             | import + register `ShopmonkeyModule` between `SezzleModule` and `SoFiModule`. |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-shopmonkey`.                      |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `shopmonkey` row as shipped.                                       |
| `docs/COMPANY_SLUG_DIRECTORY.md`                        | add `Shopmonkey / shopmonkey / Vertical-SaaS Auto-Repair-Shop POS / Vertical SaaS` row. |
| `docs/index.md` / `docs/log.md`                         | run-#380 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Run-380 probe sampled only **9 visible roles** vs the tenth-sweep estimate of **~12 keys** (3-key under-count). | The cohort pipeline is N-invariant; the sub-axis observations (D-10 omitted, D-11 omitted) hold independently of N. If a future run observes a pad on a single title, a follow-up spec can flip D-10 to applied without altering the public contract. |
| `'General- DNU'` department name is an archive marker (likely "Do Not Use"), not a public department label — internal collision risk in downstream consumers parsing dept-as-vertical. | Plugin emits wire `name` byte-for-byte without filtering; downstream rendering / parsing semantics out-of-scope. The cohort has prior-art for archive markers (e.g. Justworks's `'Operations, Benefits'`/`'Operations, Payments & Tax'` comma-segmented forms) so this is within the established envelope. |
| Variant-10 fallback URL resolution (`boards.greenhouse.io/<slug>/jobs/<id>?gh_jid=<id>`) differs from the canonical variant-2 fallback (`job-boards.greenhouse.io/<slug>/jobs/<id>`). | Plugin emits `listing.absolute_url` byte-for-byte (always populated by Greenhouse); fallback uses canonical variant-2 form when wire `absolute_url` is missing — same convention as all 7 prior variant-10 plugins. |
