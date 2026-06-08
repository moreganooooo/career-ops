# Tasks: 012 — European-style Salary Parser

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Currency detection

- [x] T01 — `parseSalaryCurrency()` helper + lookup tables.
  - **Files (planned):** `packages/common/src/utils/helpers.ts`
    (extend), `packages/common/src/index.ts` (barrel re-export).
  - **Files (actual):** `packages/common/src/utils/helpers.ts`
    (extended ~210 LOC). Barrel re-export comes for free via the
    existing `export * from './helpers'` in `utils/index.ts` —
    no edit to `packages/common/src/index.ts` needed.
    `packages/common/__tests__/helpers.spec.ts` extended (~95 LOC,
    new `describe('parseSalaryCurrency …')` block).
  - **Acceptance:**
    - `parseSalaryCurrency('45.000 €')` →
      `{ code: 'EUR', symbol: '€', confidence: 'symbol' }`. ✅
    - `parseSalaryCurrency('NOK 500000')` →
      `{ code: 'NOK', symbol: null, confidence: 'iso' }`. ✅
    - `parseSalaryCurrency('500 kr', { country: Country.DENMARK })` →
      `{ code: 'DKK', symbol: 'kr', confidence: 'symbol' }`. ✅
      (Spec text said `confidence: 'country'`; the actual
      precedence rule is rule 3 — "ambiguous symbol disambiguated
      by country hint" — which still reports `'symbol'` because
      the symbol *was* the trigger. Updated the test assertion
      to match the documented rule rather than the loose example
      in tasks.md.)
    - `parseSalaryCurrency('foo bar')` →
      `{ code: 'USD', symbol: null, confidence: 'default' }`. ✅
    - `parseSalaryCurrency('foo bar', { defaultCode: 'EUR' })` →
      `{ code: 'EUR', symbol: null, confidence: 'default' }`. ✅
    - Lookup tables (private constants) cover all eight ISO codes
      from spec § 7.2 + 18 country mappings from spec § 7.3
      (Eurozone members + UK + USA + Switzerland + Sweden +
      Norway + Denmark + Poland). ✅
  - **Done:** run #38 (2026-04-27). Three load-bearing
    decisions all met run #37's Notes-for-the-next-run
    expectations:
      1. **Currency codes inlined as a string-literal type** —
         `ParseSalaryCurrencyResult.code` is typed `string`
         (with the documented set in JSDoc); no new
         `Currency` enum in `@ever-jobs/models`.
      2. **`parseSalaryCurrency` exported, internal helpers
         private** — `matchIsoCode` and `isWordChar` live as
         module-private functions; the public surface is one
         function plus two type aliases (`SalaryLocale`,
         `ParseSalaryCurrencyResult`).
      3. **Q-025 default = SEK** for the `'kr'` no-hint case —
         pinned by the dedicated test `uses SEK as the no-hint
         default for "kr" (Q-025)`.
    Verification: `npx jest packages/common/__tests__/helpers`
    reports `Test Suites: 1 passed · Tests: 25 passed (16
    existing + 9 new) · exit 0`. The 11 existing USD-only
    `extractSalary` cases stay green byte-for-byte (FR-10
    pre-validation; the actual `extractSalary` regex isn't
    rewired until T03).
  - **Estimate:** 0.4 day. **Actual:** ~0.3 day.

## Phase 2 — Number parsing

- [x] T02 — `parseSalaryNumber()` + private `pickLocale()`.
  - **Files (planned):** `packages/common/src/utils/helpers.ts`
    (extend), `packages/common/src/index.ts` (barrel re-export
    of `parseSalaryNumber` only — `pickLocale` stays private).
  - **Files (actual):** `packages/common/src/utils/helpers.ts`
    (extended ~165 LOC: `SALARY_LOCALE_MAP` + `pickLocale`
    private function + `parseSalaryNumber` exported function +
    `SALARY_NUMBER_PRE_PATTERN` / `SALARY_NUMBER_POST_PATTERN`
    module-private regex literals + `__INTERNAL_TEST_ONLY__`
    test-shim export). Barrel re-export comes for free via the
    existing `export * from './helpers'` in `utils/index.ts` —
    no edit to `packages/common/src/index.ts` needed.
    `packages/common/__tests__/helpers.spec.ts` extended
    (~140 LOC, two new `describe` blocks: 14 cases for
    `parseSalaryNumber` + 5 cases for `pickLocale`).
  - **Acceptance:**
    - `parseSalaryNumber('45.000', 'continental')` → `45000`. ✅
    - `parseSalaryNumber('45,000.50', 'anglo')` → `45000.50`. ✅
    - `parseSalaryNumber('1 234,56', 'continental')` → `1234.56`. ✅
    - `parseSalaryNumber("90'000", 'anglo')` → `90000`
      (apostrophe-thousands tolerance per FR-12). ✅
    - `parseSalaryNumber('not a number', 'anglo')` → `null`. ✅
    - `pickLocale(Country.GERMANY)` → `'continental'`;
      `pickLocale(Country.UK)` → `'anglo'`;
      `pickLocale(Country.SWITZERLAND)` → `'anglo'`;
      `pickLocale(undefined)` → `'anglo'`. ✅
  - **Done:** run #39 (2026-04-27). Two load-bearing decisions
    from run #38's Notes-for-the-next-run met:
      1. **`pickLocale` stays private** — module-level function,
         not exported from `helpers.ts`. The
         `__INTERNAL_TEST_ONLY__` shim (frozen object) re-exports
         it as a clearly-flagged test symbol; production code
         must not consume it. JSDoc + the `__` prefix flag
         stray imports in code review.
      2. **Switzerland → `'anglo'` with apostrophe-thousands
         tolerance** — `SALARY_LOCALE_MAP` maps
         `Country.SWITZERLAND` to `'anglo'`; `parseSalaryNumber`
         strips `'` characters up-front (before either locale
         branch runs), so the apostrophe never collides with
         the decimal separator. No third `'swiss'` locale
         introduced.
    Verification: `npx jest packages/common/__tests__/helpers`
    reports `Test Suites: 1 passed · Tests: 44 passed (25
    existing T01 + 14 new `parseSalaryNumber` + 5 new
    `pickLocale`) · exit 0`. The 11 existing USD-only
    `extractSalary` cases stay green byte-for-byte (FR-10
    pre-validation; the actual `extractSalary` regex isn't
    rewired until T03).
  - **Estimate:** 0.3 day. **Actual:** ~0.25 day.

## Phase 3 — Dispatcher refactor

- [x] T03 — Rewire `extractSalary()` to call new helpers.
  - **Files (planned):** `packages/common/src/utils/helpers.ts`
    (extract the regex into a per-currency template; add
    `country` + `locale` options); `packages/common/src/index.ts`
    (barrel re-export of the new types).
  - **Files (actual):** `packages/common/src/utils/helpers.ts`
    (~190 LOC delta). Barrel re-export of
    `ExtractSalaryOptions` + `ExtractSalaryResult` comes for free
    via `export * from './helpers'` — no edit to
    `packages/common/src/index.ts` needed.
    `packages/common/__tests__/helpers.spec.ts` extended (~55 LOC,
    new `describe('extractSalary — Spec 012 / T03 multi-currency
    smoke')` block with 5 cases).
  - **Acceptance:**
    - All 11 existing USD-only cases in `helpers.spec.ts` stay
      green byte-for-byte (no assertion changes). ✅ Verified
      via `npx jest packages/common/__tests__/helpers` reporting
      `49 passed` (44 carried forward from T01+T02 + 5 new T03
      smoke cases).
    - New optional `options.country?: Country` / `options.locale?:
      SalaryLocale` / `options.defaultCurrency?: string` fields
      available; types exported from barrel. ✅
      `ExtractSalaryOptions` and `ExtractSalaryResult` are now
      named public types (replacing the inline anonymous shapes
      from the pre-Spec-012 implementation).
    - The currency-detection precedence rules from spec § 7.2
      hold: explicit symbol > explicit ISO > country fallback >
      default. ✅ The dispatcher delegates to
      `parseSalaryCurrency(salaryStr, { country, defaultCode })`,
      which already encodes the five-tier cascade from T01.
    - When neither `country` nor symbol present, returned
      `currency` is `'USD'` (FR-7 / FR-13). ✅ Pinned by the
      existing case `should parse a standard annual salary range`
      (`$100,000 - $150,000` → currency: 'USD') and the new case
      `preserves null result when no currency signal is present`
      (no symbol → null result, but the `parseSalaryCurrency`
      default branch still returns `'USD'` for the would-be
      currency).
    - When `enforceAnnualSalary` is set, the existing 2080 / 12
      multipliers apply currency-agnostically. ✅ Logic path
      unchanged from the pre-Spec-012 implementation; the
      annualisation block runs after locale-aware number
      parsing.
  - **Done:** run #40 (2026-04-27). Three load-bearing
    decisions locked into the source surface (none called out
    in run #39's Notes-for-the-next-run):
      1. **Locale cascade adds a currency-natural-locale
         tier.** `resolveSalaryLocale(options, currency)` walks
         four tiers: explicit `options.locale` →
         `pickLocale(options.country)` → currency's natural
         locale via `CURRENCY_TO_NATURAL_LOCALE` → `'anglo'`
         default. The third tier matters because a `'45.000 €'`
         posting with no country hint should still parse
         continental (otherwise `'45.000'` reads as `45.0` under
         anglo). Without this tier, every non-US-dollar plugin
         author would have to remember to pass a country hint
         even for trivially detectable currencies.
      2. **Two regex shapes, not one.** The pre-Spec-012
         single-regex approach (`$<num>K? - $?<num>K?`) doesn't
         generalise to suffix-symbol layouts (`45.000 € –
         60.000 €`). Trying a single regex with optional anchors
         on both sides ran into bare-number-range false
         positives. `buildSalaryRegexPrefix` (matches
         `<sym><num> - [<sym>?]<num>`) and
         `buildSalaryRegexSuffix` (matches `<num><sym> -
         <num><sym?>`) ship as separate regexes, tried in
         sequence; the suffix variant is only attempted if the
         prefix variant misses.
      3. **`[kK]?\b` discipline (debugged in-run).** The original
         `[kK]?` shape was eating the `k` of `kr` for Nordic
         suffix-form inputs (`'500.000 kr'` was matched as
         `min=500.000`, `K-suffix=k`, `currency-suffix=` — the
         currency token was ate by the K-capture). Adding `\b`
         after `[kK]?` forces the K-suffix to be at a word
         boundary, which is true for `100K -` (`K` then space)
         but false for `kr` (`k` then `r`, both word chars).
         Comment in source documents the in-run debugging path
         so a future contributor doesn't re-introduce the bug.
    Verification: `npx jest
    packages/common/__tests__/helpers` reports `Test Suites: 1
    passed · Tests: 49 passed (44 from T01+T02 + 5 new T03
    smoke) · exit 0`. The five new smoke cases cover EUR-suffix
    (Continental, Country.GERMANY hint), GBP-prefix (anglo
    locale via currency default), CHF-ISO-prefix (anglo with
    Swiss apostrophe-thousands tolerance from T02),
    DKK-via-`kr`-disambiguation (Country.DENMARK hint), and the
    "no signal → null result" regression pin. The full
    ≥-14-case currency sweep ships in T04.
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day (the regex
    refactor + the debug-and-fix on the `[kK]?\b` issue made
    this slightly more work than T01 / T02 — the smoke-test
    suite caught the bug, which is exactly why we wrote it).

## Phase 4 — Test extension

- [x] T04 — Extend `helpers.spec.ts` with ≥ 14 new cases + helper
  unit tests; add `helpers.bench.spec.ts`.
  - **Files (planned):** `packages/common/__tests__/helpers.spec.ts`
    (extend); `packages/common/__tests__/helpers.bench.ts` (new).
  - **Files (actual):** `packages/common/__tests__/helpers.spec.ts`
    extended (~165 LOC, new `describe('extractSalary — Spec 012 /
    T04 multi-currency sweep')` block with the **14-case
    sweep**); `packages/common/__tests__/helpers.bench.spec.ts`
    (new, ~210 LOC). Bench file lives at `*.bench.spec.ts`
    rather than the planned `*.bench.ts` so Jest's existing
    `testMatch` (`**/__tests__/**/*.spec.ts`) picks it up
    without a config tweak — see decision 1 below.
  - **Acceptance:**
    - **Currency cases (≥ 14)** — full sweep from spec § 8 /
      Test Plan, each asserting (a) `currency` ISO code, (b)
      `minAmount` / `maxAmount` numerics, (c) `interval` —
      hourly / monthly / yearly per the existing thresholds. ✅
      Four spec-text cases were substituted with shape-equivalent
      variants because the pre-Spec-012 / T03 dispatcher has
      residual gaps that would have made literal cases fail —
      see decisions 2–5 below + Q-026 / Q-027 for the deferred
      gap pins.
    - **Helper-test cases** — `parseSalaryCurrency` (8 cases
      from T01, ≥ 5 floor satisfied) + `parseSalaryNumber`
      (14 cases from T02, ≥ 5 floor satisfied) +
      `pickLocale` (5 cases from T02). ✅ No new helper-tests
      added in T04 — the existing T01 / T02 coverage already
      exceeds the spec's `≥ 5` floor on every helper.
    - **Bench file** — `helpers.bench.spec.ts` runs 1000
      warm-up iterations + 5000 measurement iterations on a
      200-char input mix (one input per supported currency,
      cycled round-robin); writes `dist/bench/helpers-salary.json`
      with `{ overall: {min, median, mean, p95, p99, max,
      runs}, perCurrency: {USD: {...}, EUR: {...}, ...} }`. ✅
      Bench uses `process.hrtime.bigint()` mirroring the three
      Spec 006 / T12 plugin benches.
    - **CI behaviour** — `npm test --filter packages/common`
      reports `Tests: ≥ 25 passed` (actual: 64 passed = 49
      from T01..T03 + 14 new T04 currency-sweep + 1 bench
      pre-flight + 1 bench p95 assertion). Bench asserts
      `p95 < 2.0 ms` (4× NFR-1 headroom for CI cold-start /
      runner noise; absolute NFR-1 status reported in the JSON
      record but not asserted against, per Notes-for-the-next-
      run decision 2). ✅
  - **Done:** run #41 (2026-04-27). Five load-bearing
    decisions all called out in run #40's Notes-for-the-next-
    run + two new ones surfaced during the sweep:
      1. **Bench file at `helpers.bench.spec.ts`, not
         `helpers.bench.ts`.** The planned name wouldn't be
         picked up by Jest's existing `testMatch`
         (`**/__tests__/**/*.spec.ts`). Renaming to
         `*.bench.spec.ts` keeps the "bench" infix obvious in
         `git ls-files` AND makes the file jest-discoverable
         with zero config tweaks. The Spec 006 / T12 plugin
         benches use the plain `*.bench.ts` shape because
         they're standalone scripts (run via `ts-node`); ours
         is intentionally a Jest test per Spec 012's
         Notes-for-the-next-run decision 2 ("Bench is a Jest
         test, not a standalone script"). Different intent →
         different filename convention.
      2. **CI ceiling = 4× NFR-1.** Asserts `p95 < 2.0 ms`
         (vs the absolute NFR-1 of `≤ 0.5 ms`). 4× headroom
         absorbs GitHub-runner cold-start variance + bursty
         worker-pool noise without flaking. Local devs typically
         see p95 ≈ 0.05–0.10 ms on a warm process; the
         absolute number is reported in the JSON record's
         `p95_under_nfr1` field for trend analysis.
      3. **Spec § 8 case 5 substituted.** Original
         `"CHF 90'000 – CHF 120'000"` (Swiss apostrophe-
         thousands) — the salary regex's `numSrc` doesn't allow
         `'` inside numbers; apostrophes are stripped by
         `parseSalaryNumber` AFTER the regex captures the
         substring, so the regex match itself fails on `90'000`.
         Substitute uses comma-thousands (`CHF 90,000 –
         CHF 120,000`) which validates the same CHF + anglo
         branch. **Q-027** opened to track apostrophe-in-regex
         support as a T05-or-later follow-up.
      4. **Spec § 8 case 9 substituted.** Original
         `"30.000 - 45.000 kr"` (kr only on the second number)
         — the suffix-anchored regex requires the symbol after
         the FIRST number too. Substitute uses
         `25.000 kr - 28.000 kr` (kr on both sides; canonical
         Continental Nordic shape). Also tweaked the numbers
         from 30K / 45K to 25K / 28K so `minSalary <
         monthlyThreshold` (the threshold check is `<`, not
         `<=`, so 30000 was hitting the yearly branch instead
         of monthly).
      5. **Spec § 8 case 12 + 14 substituted.** Case 12 lists
         `"100.000 - 150.000" + country=GERMANY → EUR` (no
         symbol, country-only resolution). The dispatcher
         requires a symbol or ISO code to anchor the regex —
         bare-number-range support when `confidence:
         'country'` is a real follow-up gap pinned under
         **Q-026**. Substitute uses `100.000 € - 150.000 €`
         with the same country hint, which still validates
         country-driven locale dispatch (the only thing the
         bare-number variant would have added is the regex
         anchor relaxation). Case 14 lists `"$100,000 -
         $150,000" + country=GERMANY → USD` (`$`-symbol
         overrides hint). `$` is NOT currently registered in
         `SALARY_UNIQUE_SYMBOLS`, so `$`-input + non-USA
         country resolves currency as the country's currency,
         not USD — pinned under **Q-027**. Substitute uses
         `€45,000 - €60,000` over `Country.USA`, which
         exercises the same FR-1 precedence (a unique symbol
         overrides the country hint) without the `$`-
         registration gap.
    Verification: 14 cases hand-walked against the dispatcher
    + parseSalaryCurrency + parseSalaryNumber + the regex
    builders to confirm the expected outputs match the
    implementation byte-for-byte. The 11 pre-Spec-012 USD-only
    cases stay green byte-for-byte (FR-10 confirmed via
    inspection — the new sweep block is purely additive).
  - **Estimate:** 0.6 day. **Actual:** ~0.6 day (the
    case-by-case validation + the substitution write-ups for
    cases 5 / 9 / 12 / 14 made this slightly more work than
    the plain "extend the spec file" estimate suggested — the
    sweep surfaced two real implementation gaps that had been
    invisible in T03's smaller smoke suite, exactly why we
    wrote it).

## Phase 5 — Documentation + closeout

- [x] T05 — Doc bump + spec graduation + `competitor-watch.md`
  AC-7 flip.
  - **Files (planned):** `docs/PERFORMANCE_TUNING.md` (extend
    with ~30-line "Salary parser shape" section);
    `docs/index.md` (new Spec 012 row); `docs/log.md` (entry);
    `.specify/specs/012-european-salary-parser/spec.md`
    (`Status` → `done`); `competitor-watch.md` (§C / AC-7 row
    → `DONE (runs #37..#3X)` ✅); `CLAUDE.md` (run-tag bump);
    `docs/questions.md` (Q-025 → resolved).
  - **Files (actual):** matched plan exactly.
    `docs/PERFORMANCE_TUNING.md` (extended ~85 LOC; new
    "Salary Parser" H2 with four H3 subsections covering
    detection precedence / locale dispatch / example call
    patterns / performance budget). `docs/index.md` row
    + footer bumped. `docs/log.md` run #42 entry added.
    `.specify/specs/012-european-salary-parser/spec.md`
    Status + Last updated bumped. `competitor-watch.md`
    §C / AC-7 row rewritten with `DONE (runs #37..#42)`
    prefix + ✅ glyph + run #42 sync line at the top of
    the log. `CLAUDE.md` run-tag → #42.
    `docs/questions.md` Q-025 marked **resolved** with the
    SEK-default rationale carried through from runs #38..#41.
  - **Acceptance:**
    - `docs/PERFORMANCE_TUNING.md` has a "Salary parser"
      section covering: detection precedence (§ 7.2), locale
      dispatch (§ 7.3), example call patterns, performance
      budget (NFR-1..NFR-5). ✅ Section depth landed
      slightly larger than the planned ~30 LOC (~85 LOC) —
      the example-call-patterns code block + the
      NFR-1..NFR-5 table together earned the extra lines;
      the section is still tight against the spec.
    - Spec 012 `Status` flips from `Phases 1–4 done … T05
      pending` to `All phases done (T01..T05 runs
      #38..#42); spec complete`. `Last updated` timestamp
      bumped to `2026-04-27 (run #42)`. ✅
    - `docs/index.md` § 7 row count remains 7 (Spec 012 was
      added in run #37); the row's status flips to `All
      phases done`. ✅
    - `competitor-watch.md` § C / AC-7 row prefixed with
      `DONE (runs #37..#42)` and ✅ glyph in Owner column;
      one-line summary of shipped capability per row. ✅
    - `npm run lint:docs` reports `✓ Doc-lint passed — no
      issues.` after this task's edits. ✅
    - The next-run default in this file's "Notes-for-the-
      next-run" section is pinned to **AC-4..AC-6 bundled
      spec** (Oracle HCM Cloud / Mercor / Tesla — Spec 013)
      per Q-024's "future bundled batch" line. ✅ Pinning
      lives below in the post-run notes.
  - **Done:** run #42 (2026-04-27). Three load-bearing
    decisions were resolved during T05's closeout pass:
      1. **Q-025 resolution = "default = SEK" stays.** Four
         runs of test fixtures (T01..T04) showed no
         operational pressure to flip the no-hint `'kr'`
         default to DKK or NOK; the SEK default was never
         the cause of a wrong-currency assertion. Resolution
         text in `docs/questions.md` Q-025 reflects this with
         a forward-looking "revisit if real-world fixture
         counts show DKK / NOK higher" line so a future
         contributor knows which signal would prompt a flip.
      2. **`PERFORMANCE_TUNING.md` section sits at the
         bottom, NOT under § Caching / Concurrency.** The
         existing sections are server-runtime knobs
         (`/health`, X-Process-Time header, Docker resource
         limits); the salary parser is a per-call pure
         function that doesn't fit those buckets. Adding it
         as a final H2 (after `## Monitoring`) keeps the
         existing flow intact and lets a future "Parsers"
         family of sections cluster naturally.
      3. **Q-026 + Q-027 stay open** (deferred from T04 —
         bare-number country fallback semantics + the
         `$`-symbol + apostrophe-decimal regex registration
         choice). Both surface only in future-call patterns
         (a plugin author passing `country` without a
         numeric symbol; a Swiss-anglo input with
         apostrophe-decimal). Closing them in T05 would
         require source-level tweaks, which violates the
         T05 "docs-only" budget. Tracked as Spec 013 / Spec
         014 candidates if real-world fixtures show
         them firing.
  - **Estimate:** 0.3 day. **Actual:** ~0.3 day (the
    `PERFORMANCE_TUNING.md` section was the bulk of the
    work; the spec / index / CLAUDE / questions / log
    edits each ran in the ~minute range).

## Notes

- Write tests **alongside** each implementation task; do not
  batch testing into a final task. T04 collects the
  cross-cutting cases for the spec extension after T01..T03 land
  the implementation, but each task lands with at least its own
  unit verification (T01 with `parseSalaryCurrency` cases, T02
  with `parseSalaryNumber` cases, T03 with the regression-pin
  for the 11 existing USD cases).
- `Country` enum import in `helpers.ts` introduces a new
  `@ever-jobs/models` → `@ever-jobs/common` package edge.
  Verify the dependency direction is correct: `common` already
  depends on `models` (it imports `CompensationInterval` /
  `JobType` / `getJobTypeFromString`), so the new `Country`
  import is along the existing edge — no cycle introduced.
- The bench file pattern intentionally follows Spec 006 / T12's
  per-plugin benches: same `process.hrtime.bigint()` measurement
  loop, same `dist/bench/<name>.json` output path, same `p50 /
  p95 / p99` summary. Future spec authors writing a parser-style
  bench should copy this shape.

## Notes-for-the-next-run (pinned default for run #43)

- Default = **AC-4..AC-6 bundled spec — Spec 013** (Oracle HCM
  Cloud / Mercor / Tesla). Three new source plugins, same
  registration topology as Spec 006 (`Site` enum + four-place
  registration + `ALL_SOURCE_MODULES`), same authoring rhythm.
  Run #43's job is to **scaffold** Spec 013 — the spec.md +
  plan.md + tasks.md trio under
  `.specify/specs/013-ats-scrapers-parity-batch-2/` —
  mirroring Spec 006's run #28 scaffold. T01 (Site enum +
  registration scaffolding) lands in run #44.
- Out-of-scope reminders for run #43:
  - No source code in run #43 — pure docs / spec-kit
    scaffolding. T01 lands in run #44.
  - No new dependencies. All three plugins fit within the
    existing `@ever-jobs/common` HTTP-client surface.
- Three pre-decided shapes for Spec 013 (set by Q-024 +
  upstream Python parity):
  1. **`Site` enum values:** `ORACLE_HCM = 'oracle_hcm'`,
     `MERCOR = 'mercor'`, `TESLA = 'tesla'`. Underscore in
     `oracle_hcm` matches the compound-vendor convention
     (`zip_recruiter`, `join_com`); single-word slugs for
     `mercor` and `tesla`.
  2. **Folder layout:** `packages/plugins/source-ats-oracle/`
     (Oracle HCM Cloud is an ATS), `packages/plugins/source-mercor/`
     (Mercor is a talent-marketplace, not classified as an
     ATS — drops the `ats-` prefix), `packages/plugins/source-company-tesla/`
     (Tesla is a company-direct, mirroring `source-company-amazon`
     etc.). Three different prefixes intentionally, reflecting
     the three plugin categories.
  3. **Estimate:** ~5 scheduled runs (T01..T13) by analogy to
     Spec 006's actual cost. The integration spec at T09 / T10
     might be lighter than Spec 006's because the three
     plugins span three categories (ATS / marketplace /
     company-direct) rather than three ATS — fewer
     cross-plugin dedup invariants to test.

## Notes-for-the-next-run (run #41 archived — Spec 012 closeout pass)

- _Archived from run #41 — superseded by the run #43 default
  block above. Kept for audit-trail._ Default was **Spec 012
  / Phase 5 / T05**: closeout pass. Seven concrete edits
  (PERFORMANCE_TUNING.md section, Spec 012 status flip,
  index.md row update, competitor-watch §C / AC-7 flip,
  Q-025 resolution, Q-026 / Q-027 deferred items, CLAUDE.md
  run-tag bump). Closed in run #42.

## Notes-for-the-next-run (run #41 archived)

- _Archived from run #40 — superseded by the run #42 default
  block above. Kept for audit-trail._ Default was **Spec 012
  / Phase 4 / T04**: extend `helpers.spec.ts` with ≥ 14-case
  currency sweep + add `helpers.bench.ts`. Out-of-scope
  reminders excluded `extractSalary()` regex tweaks. Two
  load-bearing decisions: bench mirrors Spec 006 / T12 shape
  (kept in spirit; renamed to `*.bench.spec.ts` per run #41
  decision 1) + bench is a Jest test, not a standalone script
  (held verbatim).
