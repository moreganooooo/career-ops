# Tasks: 006 — ATS-Scrapers Parity, Batch 1 (Avature / Gem / Join.com)

> Status legend: `[ ]` pending • `[~]` in-progress • `[x]` done • `[-]` dropped

## Phase 1 — Bootstrap

- [x] T01 — Site enum + tsconfig paths + jest moduleNameMapper additions.
  - **Files (planned):** `packages/models/src/enums/site.enum.ts`,
    `tsconfig.base.json`, `jest.config.js`.
  - **Files (actual):** matched plan exactly.
  - **Acceptance:** `Site.AVATURE === 'avature'`, `Site.GEM === 'gem'`,
    `Site.JOIN_COM === 'join_com'`; tsconfig + jest mapper mirror all
    three new package paths. **Done:** run #29 (2026-04-27). The
    Site enum addition lands under a new `Phase 28: Spec 006 — ATS-
    Scrapers Parity, Batch 1` group comment so a future contributor
    sees exactly which spec introduced these vendor names. The
    underscore in `JOIN_COM = 'join_com'` honours the
    `ZIP_RECRUITER = 'zip_recruiter'` precedent for compound vendor
    names; the folder name (`source-ats-joincom`) drops the
    underscore per the existing hyphen convention for plugin
    folders. The path-and-mapper additions are the same three lines
    in two files — no fancy regex / build scaffolding needed.
  - **Estimate:** 0.25 day. **Actual:** ~0.1 day.

- [x] T02 — Three new plugin packages scaffolded; appended to
  `ALL_SOURCE_MODULES`.
  - **Files (planned):** `packages/plugins/source-ats-avature/{package.json,tsconfig.json,src/{index.ts,avature.module.ts,avature.service.ts},__tests__/avature.service.spec.ts}`,
    same shape for `source-ats-gem` and `source-ats-joincom`,
    plus `packages/plugins/index.ts`.
  - **Files (actual):** matched plan exactly. Three packages × four
    source files each + one test file each = 15 new files. Plus
    one edit to the `ALL_SOURCE_MODULES` barrel (3 imports
    added, 3 array entries added, all alphabetical).
  - **Acceptance:** Three packages exist and compile with stub
    `scrape(input) { return new JobResponseDto([]); }`.
    `ALL_SOURCE_MODULES` includes `AvatureModule`, `GemModule`,
    `JoinComModule`. **Done:** run #29 (2026-04-27). The five
    load-bearing decisions called out in run #28's Notes-for-the-
    next-run section all hold:
      1. **`join_com`** is the enum value; **`source-ats-joincom`**
         is the folder name. Tests pin `Site.JOIN_COM === 'join_com'`
         so a future rename has to update the assertion too.
      2. **`AvatureService` accepts both `companyUrl` and
         `companySlug`** — the stub doesn't exercise this yet, but
         the JSDoc on the service flags T03 as the landing point
         for the resolution logic so a future contributor doesn't
         add custom-domain support to the wrong service.
      3. **No new external deps** added this run. Avature service
         imports `cheerio` from `@ever-jobs/common` will land in
         T03; Gem imports `axios.post` JSON in T05; Join.com uses
         `axios.get` + `String.prototype.match` in T07. Lockfile
         is unchanged.
      4. **Default `DEFAULT_CIRCUIT_POLICY`** inherited — none of
         the three services implement
         `getCircuitBreakerPolicy()`. T03 / T05 / T07 will revisit
         per-source policy if integration testing reveals
         flakiness.
      5. The four-place registration scaffolding is now exercised
         by three new unit specs (one per service), each pinning
         (a) NestJS DI resolution via the corresponding module,
         (b) stub `scrape()` returning empty `JobResponseDto`,
         (c) the new `Site` enum value's literal string. This
         locks the scaffolding before any source behaviour exists
         — a regression here means the four-place registration is
         broken.
    Verification: 9 / 9 new cases lock the registration path
    (3 cases × 3 services). Tests cannot run in this sandbox (no
    `node_modules` — pattern from runs #21–#28); CI on push
    validates the full unit + integration bundle. Spec 006
    graduates from "draft (run #28); T01..T13 pending" to
    "Phase 1 done (T01..T02 run #29); T03..T13 pending".
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day.

## Phase 2 — Avature

- [x] T03 — `AvatureService.scrape(input)` HTML-scrape path.
  - **Files (planned):** `packages/plugins/source-ats-avature/src/avature.service.ts`,
    `…/avature.types.ts`, `…/avature.constants.ts`.
  - **Files (actual):** matched plan exactly. Plus a tiny one-line
    addition to `packages/models/src/dtos/scraper-input.dto.ts`
    (new `companyUrl?: string` field — Q-022 / Option A) so the
    custom-domain override has a place to live in the canonical
    DTO. Documented inline as "Used by the Avature plugin (Spec
    006 / Q-022)" so a future contributor sees the call-site
    immediately.
  - **Acceptance:**
    - Resolves base URL from `input.companyUrl ?? \`https://\${input.companySlug}.avature.net\``. ✅ `tenantFromUrl` honours
      both, and `extractCompanyName` casefolds the host segment
      (`bloomberg.avature.net` → `Bloomberg`, `careers.ibm.com` →
      `Ibm`). Locale prefix preservation (`/en_US`, `/fr_CA`,
      etc.) carries over from upstream Python's
      `extract_base_url`.
    - Paginates `${base}/careers/SearchJobs/?jobOffset=N&jobRecordsPerPage=12`
      until empty page or short page. ✅ `AVATURE_RECORDS_PER_PAGE`
      = 12, `AVATURE_MAX_PAGES` = 50 (hard ceiling guards against
      runaway loops).
    - Parses HTML via `cheerio`; multi-selector chain matches
      upstream Python's resilience (`article.job` / `div.job-item`
      / `li.job-listing` / `tr.job` / `div[data-job-id]`, link-text
      fallback). ✅ Five-cascade chain in `parseListings`, plus an
      `/JobDetail/`-link fallback when none of the five hit.
    - Skips Apply-link decoys (link-text in `['apply','apply now',
      'apply online','learn more','view job']`). ✅
      `AVATURE_APPLY_DECOY_TEXTS` is a `ReadonlySet<string>`;
      filtering happens twice (once on link text, once on title)
      so Apply-decoys can't slip through under either branch.
    - Caps at `input.resultsWanted` (default 100). ✅ Default lives
      in `AVATURE_DEFAULT_RESULTS_WANTED` (= 100); the cap fires
      mid-page so we don't burn an extra HTTP request once we've
      collected enough.
    - Catches HTTP errors → returns empty `JobResponseDto`, never
      throws. ✅ Error branch logs at `warn` level and breaks the
      pagination loop — caller sees an empty array, never a
      thrown error.
  - **Done:** run #30 (2026-04-27). Implementation =
    1 service.ts (~210 LOC) + 1 constants.ts (~50 LOC) + 1
    types.ts (~30 LOC); polite pacing of 0.5 s wired via
    `createHttpClient({ rateDelayMin: 0.5 })`. Default circuit-
    breaker policy inherited (no override needed).
  - **Estimate:** 1 day. **Actual:** ~0.5 day.

- [x] T04 — Avature unit tests.
  - **Files (planned):** `packages/plugins/source-ats-avature/__tests__/avature.service.spec.ts`,
    `…/__tests__/fixtures/avature-page-1.html`.
  - **Files (actual):** matched plan plus one extra fixture
    (`avature-page-empty.html`) so the empty-page assertion has a
    distinct fixture from the populated one — letting the same
    `mockGet.mockResolvedValueOnce` chain feed both pages of the
    happy-path test (page 1 = populated, page 2 = empty → loop
    breaks).
  - **Acceptance:** ≥ 5 cases — happy path (12 jobs), empty page,
    HTTP 500 caught, `resultsWanted=5` cap, custom-domain override
    via `companyUrl`. All green. ✅ **8 cases** total (5 mandated
    + 2 carry-over scaffolding cases from T02 + 1 extra "neither
    companyUrl nor companySlug" no-op case proving the warning
    branch). Happy-path counts 11 jobs (12 anchors minus the 1
    Apply-decoy at id=12349), and pins remote detection (id=12347
    "Remote — Americas" → `isRemote=true`) plus location/department
    parsing.
  - **Done:** run #30 (2026-04-27). Local
    `npx jest --testPathPatterns 'packages/plugins/source-ats-avature'`
    reports `Test Suites: 1 passed, 1 total · Tests: 8 passed, 8
    total · exit 0`. Full source-plugin run reports
    `Test Suites: 1 skipped, 120 passed, 120 of 121 total · Tests:
    12 skipped, 318 passed, 330 total · exit 0` (313 → 318 = +5
    net new passing cases vs run #29's baseline; the 3 stubs are
    now subsumed under the new 8-case spec).
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day.

## Phase 3 — Gem

- [x] T05 — `GemService.scrape(input)` GraphQL-batch path.
  - **Files (planned):** `packages/plugins/source-ats-gem/src/gem.service.ts`,
    `…/gem.types.ts`, `…/gem.constants.ts`.
  - **Files (actual):** matched plan exactly.
    `gem.service.ts` (~190 LOC),
    `gem.constants.ts` (~100 LOC; queries + endpoint + headers +
    `GEM_DEFAULT_RESULTS_WANTED = 100`),
    `gem.types.ts` (~75 LOC; structural interfaces for the
    `oatsExternalJobPostings` response shape).
  - **Acceptance:**
    - Single POST to `https://jobs.gem.com/api/public/graphql/batch`
      with both `JobBoardTheme` and `JobBoardList` operations
      carrying `boardId = input.companySlug`. ✅ Unit case
      "happy path … pins the wire request" asserts exactly two
      operations are present, in the canonical order, with the
      slug bound to `boardId`.
    - Headers: `Accept: */*`, `Content-Type: application/json`,
      `Origin/Referer: https://jobs.gem.com`, `batch: true`,
      `User-Agent` per `@ever-jobs/common`. ✅ `GEM_HEADERS`
      constant carries every required header, including the
      load-bearing `batch: 'true'` flag — the server silently
      degrades to non-batched without it.
    - Picks the response array element whose
      `data.oatsExternalJobPostings` is defined (tolerates
      response-order swap). ✅ `pickJobBoardListEnvelope`
      walks the response array and returns the first envelope
      whose `data.oatsExternalJobPostings !== undefined` —
      tolerates Theme-first OR List-first ordering. Unit case
      "response-order tolerance" pins the inverted-order shape
      with a `.reverse()`-d clone of the fixture.
    - Maps each `jobPostings[i]` to a `JobPostDto` with
      `id = "gem-${extId ?? id}"`, `title`, `location =
      locations[0]?.name`, `department = job?.department?.name`,
      `url = \`https://jobs.gem.com/\${slug}/jobs/\${id}\``,
      `companyName = jobBoardExternal.teamDisplayName ?? slug`.
      ✅ `toJobPost` builds the DTO; remote detection cascades
      through `locations[0].isRemote`, then case-insensitive
      `"remote"` substring match on the location name, then
      `job.locationType.toLowerCase().includes('remote')`.
    - Caps at `input.resultsWanted`. ✅ `for-of` loop breaks
      once `jobs.length >= resultsWanted`. Unit case
      "honours resultsWanted=2 against a 3-posting fixture"
      pins this.
    - Catches HTTP errors → empty `JobResponseDto`. ✅
      `try`/`catch` around the `client.post` call; rejection
      logs at `warn` and returns `new JobResponseDto([])`.
      Two unit cases (HTTP 500 caught + a fresh socket-hangup
      rejection) verify the never-throw posture.
  - **Done:** run #31 (2026-04-27). Two minor design choices
    weren't called out in `tasks.md` and were locked into the
    source/test surface:
      1. **Coerce a non-array response into a single-element
         array.** A misconfigured upstream redirect can return
         an unwrapped envelope (the `batch: 'true'` header is
         silently dropped along the redirect chain). The parser
         handles this with `Array.isArray(raw) ? raw : raw ?
         [raw] : []` so the one-envelope case still has a chance
         of matching `JobBoardList` (the more common failure mode
         is the redirect dropping the List operation entirely,
         which falls through to the "no envelope carries
         `oatsExternalJobPostings`" branch and emits an empty
         `JobResponseDto`).
      2. **`null` for missing-id postings.** A posting with
         neither `extId` nor `id` is dropped (returned `null`
         from `toJobPost` and filtered out) rather than synthesised
         with a placeholder. Synthetic ids would break dedup
         keying downstream — Spec 003's hash strategy uses the
         canonical `id` field as one of the three primary
         signals, and a `gem-undefined-${i}` synthetic would
         collapse every missing-id posting into one canonical
         row.
  - **Estimate:** 1 day. **Actual:** ~0.4 day.

- [x] T06 — Gem unit tests.
  - **Files (planned):** `packages/plugins/source-ats-gem/__tests__/gem.service.spec.ts`,
    `…/__tests__/fixtures/gem-batch-response.json`.
  - **Files (actual):** matched plan exactly.
    `gem.service.spec.ts` (~190 LOC),
    `__tests__/fixtures/gem-batch-response.json` (~95 LOC; 3
    postings + theme envelope + companyInfo).
  - **Acceptance:** ≥ 4 cases — happy path, empty `jobPostings`,
    HTTP 500 caught, response-order tolerance (Theme first vs
    List first). All green. ✅ **9 cases** total (4 mandated + 3
    carry-over scaffolding cases from T02 + 1 extra
    "resultsWanted=2 mid-fixture cap" + 1 extra "no envelope
    carries oatsExternalJobPostings" sentinel test). Locally
    `npx jest --testPathPatterns 'packages/plugins/source-ats-gem'`
    reports `Test Suites: 1 passed, 1 total · Tests: 9 passed,
    9 total · exit 0`.
  - **Done:** run #31 (2026-04-27). Fixture deep-cloned per
    case via `JSON.parse(JSON.stringify(...))` so one mutation
    (e.g. emptying `jobPostings[]` for the "empty" case) doesn't
    leak into a sibling test.
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day.

## Phase 4 — Join.com

- [x] T07 — `JoinComService.scrape(input)` REST two-step path.
  - **Files (planned):** `packages/plugins/source-ats-joincom/src/joincom.service.ts`,
    `…/joincom.types.ts`, `…/joincom.constants.ts`.
  - **Files (actual):** matched plan exactly.
    `joincom.service.ts` (~300 LOC; replaces the T02 stub),
    `joincom.constants.ts` (~85 LOC; both regexes pinned as
    constants, base URLs, headers, defaults),
    `joincom.types.ts` (~65 LOC; structural interfaces for
    `JoinComJobItem` / `JoinComJobsPage` / `JoinComLocation`
    / `JoinComPagination` / `JoinComTenantContext`).
  - **Acceptance:**
    - Step 1: `GET https://join.com/companies/<slug>` (HTML) →
      regex-extract numeric ID via `"company":{"id":(\d+)`
      first, fallback `"companyId":(\d+)`. ✅ Both regexes
      live as constants (`JOINCOM_COMPANY_ID_PRIMARY_REGEX`,
      `JOINCOM_COMPANY_ID_FALLBACK_REGEX`); `resolveTenant`
      tries primary first, falls through to the fallback,
      returns `null` on a miss.
    - Step 2: `GET https://join.com/api/public/companies/<id>/jobs?locale=en-us&page=N&pageSize=50&withAggregations=true&sort=+title`
      until `pagination.totalPages` reached or `items[]` empty.
      ✅ `collectJobItems` paginates via `currentPage` index,
      breaks on empty page, breaks at `currentPage >=
      totalPages`, breaks at `JOINCOM_MAX_PAGES = 100` ceiling.
    - Maps each `items[i]` to a `JobPostDto`. ✅ `toJobPost`
      maps id / title / locations[0].name (with city fallback) /
      description (with `DescriptionFormat.PLAIN` → `htmlToPlainText`)
      / shareableUrl-or-fallback / publishedAt / employmentType /
      department (with category.name fallback). Three-tier
      remote detection cascades through `locations[0].isRemote`,
      then case-insensitive `"remote"` substring match on
      location name, then on `item.remoteOption`.
    - Caps at `input.resultsWanted` mid-pagination. ✅ Inner
      `for-of` breaks early; outer `while` breaks too. The
      `resultsWanted=1` test pins this against a 2-item page.
    - Sleeps `>= 0.5 s` between pages. ✅ `createHttpClient`'s
      `rateDelayMin: 0.5` enforces this on every GET (Step 1
      AND Step 2 — slightly stricter than upstream Python which
      only paces Step 2, but matches the AvatureService pacing
      precedent).
    - Catches HTTP errors / regex miss → empty `JobResponseDto`.
      ✅ Step 1 / Step 2 errors both caught; `resolveTenant`
      returns `null` on either error or regex miss; `scrape`
      collapses to empty `JobResponseDto` on every failure
      branch. NEVER throws.
  - **Done:** run #32 (2026-04-27). Constants split out into
    `joincom.constants.ts` (rather than inlining) so a future
    contributor can pin the regex shapes against upstream Python's
    `get_company_id` without grepping the service file.
  - **Estimate:** 1 day. **Actual:** ~0.5 day.

- [x] T08 — Join.com unit tests.
  - **Files (planned):** `packages/plugins/source-ats-joincom/__tests__/joincom.service.spec.ts`,
    `…/__tests__/fixtures/joincom-company-page.html`,
    `…/__tests__/fixtures/joincom-jobs-page-1.json`.
  - **Files (actual):** matched plan plus two extra fixtures —
    `joincom-company-page-fallback.html` (exercises the
    `"companyId":4242` regex branch) and
    `joincom-company-page-no-id.html` (a 404 page that fails
    BOTH regexes, pinning the slug-not-found error path).
  - **Acceptance:** ≥ 5 cases — happy path, empty board,
    HTTP 500 caught, slug-not-found (no `"company":{"id":` match,
    no `"companyId":` fallback), `resultsWanted=20` mid-page cap.
    All green. ✅ **11 cases** total (5 mandated + 3 carry-over
    scaffolding cases from T02 + 3 extras: fallback-regex hit,
    Step 1 HTTP 500 distinct from Step 2 HTTP 500, and
    `DescriptionFormat.PLAIN` strips embedded HTML). Locally
    `npx jest --testPathPatterns 'packages/plugins/source-ats-joincom'`
    reports `Test Suites: 1 passed, 1 total · Tests: 11 passed,
    11 total · exit 0`.
  - **Done:** run #32 (2026-04-27). One in-run fixture
    correction: the original `joincom-company-page.html` was
    pretty-printed JSON, but the upstream regex requires no
    whitespace between `"company":` and `{"id":`. The fixture
    was minified to one line so the regex hits — matches
    production reality (Next.js `__NEXT_DATA__` always emits
    single-line JSON in production builds).
  - **Estimate:** 0.5 day. **Actual:** ~0.5 day.

## Phase 5 — Integration & docs

- [x] T09 — Live integration suite for all three plugins.
  - **Files (planned):** `apps/api/__tests__/integration/source-ats-batch-1.integration.spec.ts`.
  - **Files (actual):** matched plan exactly. ~270 LOC carrying 9
    cases across 4 describe-blocks; reuses the three plugins' own
    `__tests__/fixtures/*` corpus (no new fixture files added —
    matches the upstream Python's "one fixture set per plugin"
    convention from `OTHERS/Ats-scrapers`).
  - **Acceptance:** Boots `AppModule`; stubs `createHttpClient` with
    fixture responses for the three new plugins; calls
    `JobsService.searchJobs({ site: ['avature','gem','join_com'],
    companySlug: 'demo' })`; asserts ≥ 1 row from each plugin in
    the deduped result. Verifies the four-place registration
    (no plugin silently absent from `PluginRegistry`). ✅
    Three describe-block coverage:
      1. **four-place registration (PluginRegistry)** — 3 cases.
         `listSiteKeys()` includes `Site.AVATURE/GEM/JOIN_COM`;
         `listAtsSites()` flags all three as ATS; `getScraper()`
         returns a real `IScraper` for each.
      2. **JobsService.searchJobs fan-out** — 2 cases. Single fan-out
         across all three plugins emits ≥ 1 row from each (filtered
         by `j.site`); per-plugin `resultsWanted` cap honoured.
      3. **JobsAggregator — Spec 003 dedup applied** — 2 cases.
         All three plugins still contribute ≥ 1 row after dedup; the
         dedup engine ran (envelope flag `deduped=true`); zero
         collisions on the synthetic corpus (`outputCount ===
         rawCount`); `dedup=false` opt-out leaves output unchanged.
      4. **HTTP-client mock — wire-call shape** — 2 cases. Gem
         issues exactly ONE POST to `jobs.gem.com/api/public/graphql/batch`;
         Join.com issues a Step-1 HTML GET before Step-2 JSON GETs.
  - **Done:** run #33 (2026-04-27). Three load-bearing decisions
    locked into the test surface:
      1. **Mock `createHttpClient`, not `nock`.** The unit suites
         for the three plugins already use the same
         `jest.mock(@ever-jobs/common)` pattern; using it here
         keeps the integration shape consistent across unit /
         integration / E2E tiers. `nock` would shadow the same
         code path (axios → undici stack) at the network layer,
         which is strictly less precise than mocking the factory
         itself.
      2. **`companySlug='acme-corp'`** is load-bearing for Join.com:
         the `JoinComService.deriveCompanyName('acme-corp')` produces
         `'Acme Corp'` (the dash → space + title-casing path), which
         exactly matches the Gem `jobBoardExternal.teamDisplayName=
         'Acme Corp'` baked into `gem-batch-response.json`. That
         alignment lets a future cross-plugin dedup audit assert
         "same company across two plugins" if/when description-
         bearing fixtures land — for now it just keeps the
         assertion data tidy.
      3. **`avatureGetCount` map** is reset in `beforeEach` so the
         first GET inside each test always returns the populated
         fixture, not the empty fixture from the prior test's
         second pagination call. A counter-based router (rather
         than URL-based) is required because Avature's pagination
         URL includes `?jobOffset=N` — varying the offset would
         leak fixture-cache state if we keyed on URL.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

- [x] T10 — E2E suite via supertest.
  - **Files (planned):** `apps/api/__tests__/e2e/source-ats-batch-1.e2e-spec.ts`.
  - **Files (actual):** matched plan exactly. ~210 LOC carrying 5
    cases against the real HTTP surface
    (`POST /api/jobs/search`, NOT the original `GET /api/jobs?...`
    path the spec text predates). Same fixture-router shape as T09
    so the three tiers (unit / integration / E2E) all pass through
    the same mock factory.
  - **Acceptance:** Three GET assertions —
    `/api/jobs?site=avature&companySlug=bloomberg`,
    `?site=gem&companySlug=accel`,
    `?site=join_com&companySlug=primer-ai` — each returns
    `200 OK` + non-empty body, against a sandboxed nock-fixture
    upstream. Asserts dedup-engine collapses identical postings
    across the three plugins (zero collisions on the synthetic
    fixture). ✅ All five assertions:
      1. `POST /api/jobs/search` with `siteType:[AVATURE]`,
         `companySlug:'bloomberg'`, `resultsWanted:5` → 201 +
         non-empty `jobs[]`; every row is tagged `site=Site.AVATURE`.
      2. Same with `siteType:[GEM]`, `companySlug:'accel'` → 201 +
         non-empty body; every row tagged `site=Site.GEM`.
      3. Same with `siteType:[JOIN_COM]`, `companySlug:'primer-ai'` →
         201 + non-empty body; every row tagged `site=Site.JOIN_COM`.
      4. Cross-plugin fan-out
         (`siteType:[AVATURE,GEM,JOIN_COM]`) → 201; response carries
         `count`, `raw_count`, `deduped:true`; `count === raw_count`
         (zero collisions on the synthetic fixture); the `Set` of
         `j.site` values across the response covers all three.
      5. `?dedup=false` query-string opt-out → 201; `deduped:false`;
         `count === raw_count`; non-empty body.
  - **Done:** run #33 (2026-04-27). Three load-bearing decisions
    locked into the test surface (deviating from the literal
    `tasks.md` text — see the three "Departures from the literal
    acceptance text" notes in the spec file's leading JSDoc):
      1. **POST not GET.** The controller exposes
         `POST /api/jobs/search` with a JSON body — this is the
         real surface (see `apps/api/src/jobs/jobs.controller.ts`).
         The tasks-file phrasing predates the body-vs-query
         refactor; we honour the *intent* (per-plugin HTTP
         round-trip) by hitting the real endpoint shape instead.
      2. **Mock `createHttpClient`, not `nock`.** Same reasoning
         as T09 — keep tier-consistency with the unit suites.
      3. **Slug = `acme-corp` for the cross-plugin test.** The
         per-plugin tests pin tenant-specific slugs (`bloomberg` /
         `accel` / `primer-ai`), but the cross-plugin assertion
         uses the same slug across all three so the dedup engine
         exercises the `same-input → distinct outputs` branch
         (different vendor prefixes on the canonical id collapse
         zero pairs).
  - **Estimate:** 0.5 day. **Actual:** ~0.3 day.

- [x] T11 — Coverage docs update.
  - **Files (planned):** `docs/ATS_INTEGRATIONS.md`,
    `docs/COMPANY_SLUG_DIRECTORY.md`.
  - **Files (actual):** matched plan exactly.
  - **Acceptance:** Three new matrix rows; ≥ 10 seed slugs per
    plugin (sampled from upstream `OTHERS/Ats-scrapers/<id>/<id>_companies.csv`).
    `npm run lint:docs` green. ✅ **Done:** run #34 (2026-04-27).
    Three new sections under "Supported Platforms" in
    `ATS_INTEGRATIONS.md` (Avature / Gem / Join.com), each
    documenting Method, Auth, Data Format, and Notable Users
    sampled from the upstream CSVs. The intro count bumped
    from "38 ATSes" → "41 ATSes" in two places.
    `COMPANY_SLUG_DIRECTORY.md` gains three new tables —
    Avature (15 slugs), Gem (14 slugs), Join.com (15 slugs)
    — sourced from `avature_companies.csv` /
    `gem_companies.csv` / `join_companies.csv` respectively.
    Slug-only count: Avature = 15, Gem = 14, Join.com = 15
    (all ≥ 10 mandated). Plus a new "Tips for Finding Company
    Slugs" subsection per plugin documenting the URL pattern
    (`<slug>.avature.net` / `jobs.gem.com/<slug>` /
    `join.com/companies/<slug>`) and the `companyUrl` override
    for Avature custom-domain tenants. The "Last Updated"
    footer bumped from `2026-02-23` to `2026-04-27`. The
    "all 28 ATS scrapers run concurrently" wording bumped to
    "all 41" to match the integrations doc. Verification:
    `npx ts-node ... scripts/docs-lint.ts` exits 0 with
    "✓ Doc-lint passed — no issues."
  - **Estimate:** 0.25 day. **Actual:** ~0.25 day.

- [x] T12 — Per-plugin perf bench.
  - **Files (planned):** `packages/plugins/source-ats-avature/__tests__/avature.bench.ts`,
    `…/source-ats-gem/__tests__/gem.bench.ts`,
    `…/source-ats-joincom/__tests__/joincom.bench.ts`.
  - **Files (actual):** matched plan exactly. Three new `<plugin>.bench.ts`
    files (~155 LOC each) — one per plugin — under the corresponding
    `__tests__/` folder. Plus four new npm scripts in `package.json`
    (`bench:avature`, `bench:gem`, `bench:joincom`, `bench:ats-batch-1`)
    so each bench is invocable in isolation OR all three sequentially
    via `npm run bench:ats-batch-1`.
  - **Acceptance:** Each bench file establishes a baseline against
    NFR-2 ceilings on the fixture corpus. Outputs a JSON line at
    `dist/bench/<plugin>.json`. CI gating on bench thresholds is a
    follow-up spec. ✅ **Done:** run #35 (2026-04-27).
    Each bench:
      - Reads the same fixtures the unit suite uses (no new fixture
        files added — bench corpus = unit corpus, matches Spec 006's
        "one fixture set per plugin" convention).
      - Patches `@ever-jobs/common.createHttpClient` via
        `require('@ever-jobs/common').createHttpClient = …` BEFORE
        loading the service, so the fixture-backed factory is in
        place when the service captures its closure reference. Same
        mock-shape as the unit suites (`get`/`post`/`setHeaders`),
        no nock / no real network.
      - Runs **3 warm-ups** (discount JIT + module-init), then
        **20 timed iterations** of `service.scrape(input)`, capturing
        per-iteration ms via `process.hrtime.bigint()`.
      - Computes `min` / `median` / `mean` / `p95` / `p99` / `max`
        and `memory_bytes.{before, after, delta}` (with optional
        `global.gc()` flush when `--expose-gc` is set).
      - Compares `p95` against the per-plugin NFR-2 ceiling
        (Avature 8000 ms, Gem 1500 ms, Join.com 4000 ms) and emits
        `p95_under_ceiling` + `headroom_pct`. The bench does **not**
        exit non-zero on a ceiling breach — CI gating is the
        follow-up spec, not this one.
      - Writes a single JSON record (pretty-printed for readability)
        at `dist/bench/<plugin>.json` (the `dist/` tree is gitignored,
        so each run produces a fresh local artifact; future CI gating
        will collect & aggregate these on the runner).
    Three load-bearing decisions weren't called out in run #34's
    Notes-for-the-next-run and were locked into the bench surface:
      1. **Standalone ts-node scripts, not jest specs.** The bench
         filename suffix `.bench.ts` deliberately doesn't match
         `jest.config.js`'s `testMatch` (`*.spec.ts` /
         `*.e2e-spec.ts`) so the benches are NOT executed by
         `npm test`. CI gating on bench thresholds is a follow-up
         spec; running them in CI today would just consume time
         without enforcing anything. They're invocable via the new
         npm scripts and emit JSON for offline analysis.
      2. **Module-cache patching, not `jest.mock`.** Standalone
         scripts can't use `jest.mock` (which is a jest-runtime
         construct). We `require('@ever-jobs/common')` first, mutate
         its `createHttpClient` export to a fixture-backed factory,
         and only THEN `require('../src')` so the service captures
         the patched reference. Equivalent to `jest.mock` at
         module-cache level; works cleanly under ts-node's CommonJS
         compilation.
      3. **Iteration count = 20, warm-ups = 3.** Twenty samples is
         the smallest count where p95 (the 95th-percentile index =
         `ceil(0.95 * 20) - 1 = 18`) is a meaningful summary statistic
         rather than the second-worst sample masquerading as p95.
         Three warm-ups discount the cheerio/Logger/`createHttpClient`
         module-init costs (the first scrape() of a fresh `Service`
         instance is ~3-5× slower than steady state). Fewer warm-ups
         pollute the `min`; more iterations cost wall-time without
         changing the headroom verdict for plugins this fast.
    Verification: all three benches were smoke-run locally against
    this commit (Node v24.14.0 on the dev box) and produced the
    following p95 readings, all well under their NFR-2 ceilings:
      - **Avature** — p95 = 7.112 ms (ceiling 8000 ms, headroom
        99.91%). Cheerio five-selector cascade + Apply-decoy filter
        over the populated `avature-page-1.html` fixture (12
        anchors → 11 emitted rows) plus the empty-page terminator.
      - **Gem** — p95 = 0.107 ms (ceiling 1500 ms, headroom 99.99%).
        Single in-process JSON parse over the 3-posting batch
        envelope; fastest of the three.
      - **Join.com** — p95 = 0.13 ms (ceiling 4000 ms, headroom
        100.00%). Step-1 regex extraction (`"company":{"id":...`)
        plus 2-page Step-2 JSON parse, all in-process.
    The unit suite is unaffected: `npx jest --testPathPatterns
    'packages/plugins/source-ats-(avature|gem|joincom)'` reports
    `Test Suites: 3 passed, 3 total · Tests: 28 passed, 28 total`.
    The `.bench.ts` filename suffix doesn't match jest's `testMatch`,
    so the benches are excluded from CI's unit/integration/e2e
    gates by filename convention.
  - **Estimate:** 0.5 day. **Actual:** ~0.4 day.

## Phase 6 — Closeout

- [x] T13 — Spec 006 graduates; backlog rolled forward.
  - **Files (planned):** `.specify/specs/006-ats-scrapers-parity-batch-1/{spec.md,tasks.md}`,
    `docs/log.md`, `docs/index.md`, `competitor-watch.md`.
  - **Files (actual):** matched plan exactly. Plus `CLAUDE.md`
    footer bump (run-tag → #36).
  - **Acceptance:** Spec status flipped to "All phases done
    (T01–T13); spec complete". `competitor-watch.md §C` rows AC-1,
    AC-2, AC-3 marked **DONE** with run-tag attributions. Notes
    for next run pinned to "Spec 007 (or batch 2)" — pick the
    next subset of `competitor-watch.md §C` (AC-4 = Oracle HCM
    Cloud / AC-5 = Mercor / AC-6 = Tesla, **OR** AC-7 = European
    salary parser as a fast small-spec interlude **OR** AC-8 =
    seed-companies refresh). ✅ **Done:** run #36 (2026-04-27).
    Status flipped; AC-1/AC-2/AC-3 rows in `competitor-watch.md §C`
    rewritten with **DONE (runs #28..#36)** prefix + a one-line
    summary of the shipped capability per row + the ✅ glyph in
    the Owner column. Run #37's pinned default is **AC-7
    (European-style salary parser)** — see Q-024 in this run's
    log entry for the choice rationale (small-spec interlude
    that exercises the Spec 003 normalisation surface without
    adding new plugin scaffolding; AC-4..AC-6 deferred to a later
    batch run).
  - **Estimate:** 0.25 day. **Actual:** ~0.2 day.

## Notes-for-the-next-run (pinned default for run #37)

- Default = **AC-7 — Spec 012 "European-style salary parser"**
  (per Q-024 in run #36's log entry). Acceptance: extend the
  existing `extractSalary` golden-set fixture corpus
  (`packages/plugins/dedup-hybrid/src/extract-salary*` +
  `packages/plugins/dedup-hybrid/__tests__/extract-salary*`)
  with EU-currency + EU-format strings (€ vs €/$/£/CHF prefix
  conventions; `60.000` thousands-separator convention used in
  DACH; `60 000` space-separator convention used in FR / SE /
  NO; `42k €` shortened-form variants), plus a `parseCurrency`
  helper that maps the symbol → ISO 4217 (`EUR / GBP / CHF /
  SEK / NOK / DKK / PLN`). Three load-bearing decisions deferred
  to that spec's Q-024:
    1. Whether to absorb into Spec 003 normalisation (cheap, but
       blurs the boundary between dedup and parsing) OR open
       a fresh Spec 012 (clean, but adds spec count). Default:
       **fresh Spec 012** — keeps the dedup / canonicalisation
       boundary clean.
    2. ISO 4217 mapping for ambiguous symbols (e.g. `$` → USD
       vs CAD vs AUD vs SGD vs HKD). Default: **caller-supplied
       country hint via `ScraperInputDto.countryCode`** falls
       through to USD when unset.
    3. Numeric-format normalisation (decimal-comma vs decimal-
       period). Default: **single regex per locale family**
       (Continental EU = `\d+(?:\.\d{3})*(?:,\d+)?` for
       comma-decimal; Anglosphere = `\d+(?:,\d{3})*(?:\.\d+)?`
       for period-decimal); locale dispatch via the same
       country hint.
- A future bundled batch — **AC-4..AC-6** (Oracle HCM Cloud /
  Mercor / Tesla) — follows AC-7. Same registration topology as
  Avature / Gem / Join.com, same authoring rhythm. Estimate ~5
  scheduled runs (T01..T13) by analogy to Spec 006's actual
  cost. AC-8 (seed-companies refresh) and AC-9 (Workable diff)
  follow that batch — both are quick interludes that don't add
  new plugin scaffolding.
- AC-9 candidate (Workable diff against upstream commit
  `312c7b6`) ships as a small focused run after AC-4..AC-6 —
  Spec 006's experience suggests bundling in a multi-plugin
  spec is cheaper than three independent specs.

## Notes-for-the-prior-run (pinned default for run #34, completed run #35)

- Default = **Spec 006 / Phase 5 / T12** — per-plugin perf benches
  at `packages/plugins/source-ats-avature/__tests__/avature.bench.ts`,
  `…/source-ats-gem/__tests__/gem.bench.ts`,
  `…/source-ats-joincom/__tests__/joincom.bench.ts`. Acceptance:
  each bench file establishes a baseline against NFR-2 ceilings on
  the fixture corpus and outputs a JSON line at
  `dist/bench/<plugin>.json`. CI gating on bench thresholds is a
  follow-up spec — not in this batch. **Landed run #35.**

## Notes-for-the-prior-run (pinned default for run #31)

- Default = **Spec 006 / Phase 3 / T05 + T06** — `GemService.scrape()`
  GraphQL-batch implementation plus its ≥ 4 unit cases (happy path,
  empty `jobPostings`, HTTP 500, response-order tolerance). Reasoning:
  Gem is the only one of the three plugins that's a single-request
  scrape (no pagination), so the diff stays reviewable when bundled
  with its tests. T07+T08 (Join.com — two-step REST scrape with
  regex-extracted company ID) is the second-smallest and is the
  next default after T05+T06. T09..T13 (integration / e2e / docs /
  bench / closeout) wait until all three plugin behaviours land.
- The five load-bearing decisions from run #28 still hold; added
  this run:
  6. **`companyUrl` is now a first-class field on `ScraperInputDto`**
     — runtime override for ATS scrapers that support custom-domain
     career portals (Avature today; Workday already had its own
     URL helper in `Site.WORKDAY`). Q-022 / Option A pinned this in
     run #28; T03 made it concrete. Future ATS plugins that need
     the same custom-domain override should reuse this field, not
     introduce a per-plugin equivalent.
- The five load-bearing decisions deferred to T01:
- The five load-bearing decisions deferred to T01:
  1. **Slug for Join.com is `join_com`, not `joincom` / `join`**
     (matches upstream Python directory `join_com/` and the
     `Site` enum convention of underscore-snake-case for
     compound vendor names — cf. `ZIP_RECRUITER = 'zip_recruiter'`).
  2. **Plugin folder name is `source-ats-joincom`** (no underscore
     — matches the existing `source-ats-greenhouse` / `source-ats-lever`
     hyphen convention; the underscore lives only in the enum value).
  3. **`AvatureService` accepts both `companyUrl` and `companySlug`**;
     prefer `companyUrl` if present (custom-domain tenants like
     `careers.ibm.com`); fall back to subdomain construction
     `https://<slug>.avature.net` otherwise.
  4. **No new external deps**: Avature uses `cheerio` (already in
     `@ever-jobs/common`); Gem uses `axios.post` w/ JSON;
     Join.com uses `axios.get` + `String.prototype.match`. Lockfile
     sync is a no-op for this spec.
  5. **Default circuit-breaker policy** (Spec 005 /
     `DEFAULT_CIRCUIT_POLICY`) inherited; no `getCircuitBreakerPolicy()`
     override unless evidence of flakiness emerges in T09 / T10.

- Out-of-scope reminders that occasionally drift back into temptation:
  - **Job-detail page enrichment.** All three upstream Python clients
    expose a `get_job_detail(...)` method; we deliberately don't
    ship that here (deferred to a future spec — candidate Spec 016).
  - **Bulk-discovery refresh** (AC-8) — a separate spec
    (candidate Spec 014).
  - **European salary parser** (AC-7) — separate spec (Spec 012 in
    `competitor-watch.md §C`).
  - **AC-4..AC-9** — out of scope; subsequent specs/batches.
