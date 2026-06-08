# Plan: 174 — Source Company Plugin: Textio

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-11 |
| Last updated | 2026-05-11 |

## 1. Approach

Textio's careers board is hosted on Greenhouse at the slug
`textio`. Mirror Recharge (Spec 167) byte-for-byte — Recharge
is the closest cohort cousin sharing **four** of the five
primary axes: D-08 + D-09 case-symmetric bare brand + D-10
omitted + D-11 omitted.

**One structural deviation** — D-04 sub-axis: variant 2
(canonical Greenhouse host) → **NEW variant 46** (first
cohort observation): HTTPS + `www.`-prefixed bare brand-
domain `.com` + 2-segment `/careers/apply/` apply-page path
**with a trailing slash** + **dual-id query**
`?job=<id>&gh_jid=<id>`. The dual-id query is the novel sub-
feature — the listing id appears under two keys (vendor-side
hand-off shim — Textio's careers front-end reads `job` while
Greenhouse forwards `gh_jid`).

The plugin emits `listing.absolute_url` byte-for-byte; the
fallback constructor (when the wire omits `absolute_url`)
defaults to canonical variant-2 Greenhouse form
`https://job-boards.greenhouse.io/textio/jobs/<id>` (same
fallback strategy as Symphony / Samsara / Klaviyo / Bird /
Collective Health / Netskope) because the variant-46 vanity-
domain shape is not guaranteed-resolvable for every listing
id.

**Notable cohort observations:**

- 49th distinct wire-shape variant in the company-direct
  cohort (variant 46 is NEW, first observation).
- 121st cohort plugin to omit D-09.
- 39th cohort plugin to omit D-10.
- 104th cohort plugin with fully-clean department pass-
  through.
- 130th cohort plugin to apply D-08.

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; cross-regression sweep unchanged green;
  CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------- |
| `packages/plugins/source-company-textio`                | **new package**.                                                        |
| `packages/models/src/enums/site.enum.ts`                | append `TEXTIO = 'textio'` (Phase 184).                                 |
| `packages/plugins/index.ts`                             | import + register `TextioModule` in `ALL_SOURCE_MODULES`.               |
| `tsconfig.base.json`                                    | path alias `@ever-jobs/source-company-textio`.                          |
| `jest.config.js`                                        | matching `moduleNameMapper` entry.                                      |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | mark `textio` row as shipped.                                           |
| `docs/index.md` / `docs/log.md`                         | run-#384 entry.                                                         |

## 4. Risks / Mitigations

| Risk                                                | Mitigation                                                |
| --------------------------------------------------- | --------------------------------------------------------- |
| Textio's very small board (~2 visible roles) may rotate quickly. | Probe is point-in-time; per-run probe pulls the live wire — variance is expected. The fixture pin is byte-for-byte against the run-384 probe sample. |
| Variant-46 dual-id-query form is novel and untested by other plugins. | Plugin emits wire `absolute_url` byte-for-byte (no URL synthesis on the happy path); fallback to variant-2 canonical form when wire omits `absolute_url`. Both forms covered by happy-path + fallback unit tests. |
