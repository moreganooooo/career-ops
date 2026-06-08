# Plan: 088 — Source Company Plugin: Squarespace

| Field        | Value      |
| ------------ | ---------- |
| Spec         | spec.md    |
| Created      | 2026-05-03 |
| Last updated | 2026-05-03 |

## 1. Approach

Squarespace's careers board is hosted on Greenhouse at the slug
`squarespace`. Mirror Marqeta (Spec 084) byte-for-byte —
Marqeta is the closest behavioural cousin sharing four axes:
D-08 + D-09 case-symmetric + D-10 applied + D-11 omitted.

**One structural deviation** from Marqeta:

1. **D-04 wire-shape variant 22 — HTTP-scheme `www.`-prefixed
   brand-domain `/about/careers` query-only-id.** Squarespace's
   tenant publishes `absolute_url` on
   `http://www.squarespace.com/about/careers?gh_jid=<id>` —
   first cohort observation of HTTP scheme. The plugin emits
   `listing.absolute_url` byte-for-byte (preserving HTTP);
   fallback uses canonical Greenhouse variant-2 (HTTPS).

## 2. Phases

### Phase 1 — Scaffold + register + test (single PR)

- Deliverables: 5-file plugin scaffold + 8-case test spec +
  fixture; 4-file wirings; doc updates.
- Exit: 8 tests green; helpers + cross-regression sweep
  unchanged green; CI all green.

## 3. Packages Touched

| Package                                                 | Change                                                          |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `packages/plugins/source-company-squarespace`           | **new package**.                                                |
| `packages/models/src/enums/site.enum.ts`                | append `SQUARESPACE = 'squarespace'`.                           |
| `packages/plugins/index.ts`                             | import + append `SquarespaceModule`.                            |
| `tsconfig.base.json`                                    | path-alias entry.                                               |
| `jest.config.js`                                        | `moduleNameMapper` entry.                                       |
| `docs/SOURCE_ADOPTION_BACKLOG.md`                       | add Squarespace shipped row.                                    |
| `docs/index.md`                                         | append Spec 088 to the specs table.                             |
| `docs/log.md`                                           | run #298 entry at top.                                          |

## 4. Sequencing

T01 → T02 → T03 → T04 → T05.

## 5. Risks

- **R-01 — Squarespace upgrades wire URL to HTTPS.** Mitigation:
  byte-for-byte URL assertion catches the upgrade as a test diff.
  Follow-up patch updates fixture and assertion in isolation.
- **R-02 — Wire-title pad-rate drift.** 9/36 padded; D-10
  applied trims either way.
- **R-03 — Department pad-rate drift.** 0/36 padded.
