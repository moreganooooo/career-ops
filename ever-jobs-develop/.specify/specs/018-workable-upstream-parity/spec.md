# Spec 018 — Workable Upstream Parity (`OTHERS/Ats-scrapers/workable/main.py` @ commit `312c7b6` diff against `source-ats-workable` plugin)

| Field          | Value                                                                       |
| -------------- | --------------------------------------------------------------------------- |
| Spec ID        | 018                                                                         |
| Slug           | workable-upstream-parity                                                    |
| Status         | All phases done (T01 run #77); spec complete                                |
| Owner          | scheduled-task agent (`ever-jobs`)                                          |
| Created        | 2026-04-28 (run #76)                                                        |
| Last updated   | 2026-04-28 (run #77)                                                        |
| Supersedes     | (none — first absorption pass against `OTHERS/Ats-scrapers/workable/`)      |
| Related specs  | 006 (ATS-Scrapers Parity Batch 1 — established the absorption pattern), 013 (ATS-Scrapers Parity Batch 2 — most recent precedent), 017 (Seed-Companies Refresh Batch 1 — owned the Workable directory rows that this spec's plugin scrapes against) |

## 1. Problem Statement

`competitor-watch.md` § C row **AC-9** ("Diff Workable scraper logic
(commit `312c7b6`) and absorb relevant behaviour into our plugin")
has been the queued upstream-driven backlog item since run #75 closed
out Spec 017. The upstream Workable scraper sits at
`OTHERS/Ats-scrapers/workable/main.py` (the file lives at the
workspace root outside the ever-jobs repo, so referenced as a
plain backticked path)
on commit `3bacd6e` (HEAD); the most recent meaningful upstream
edit on that file was commit `312c7b6` ("Improve workable scraper",
2025-12-24, +6 / −2 lines). AC-9 names that commit explicitly as the
target diff anchor.

Our plugin sits at
[`packages/plugins/source-ats-workable/`](../../../packages/plugins/source-ats-workable/)
and has carried the public widget-API path
(`https://apply.workable.com/api/v1/widget/accounts/<slug>`) +
authenticated SPI v3 path (`https://<subdomain>.workable.com/spi/v3/jobs`)
since the Spec 001-era plugin scaffold. The widget-API endpoint
between the two implementations is byte-identical
(`workable.constants.ts:2` ↔ `workable/main.py:113`); the divergence
is in surrounding orchestration concerns (caching, retry policy,
bulk-loop scheduling) — none of which the `312c7b6` commit changes.

Without a formal absorption pass, AC-9 stays open in
`competitor-watch.md` § C indefinitely; future agents would have to
re-establish that the upstream commit is a no-op against our
architecture, duplicating the diff work. Spec 018's job is to
**record the diff, the architectural mismatch, and the verdict**
once, so the AC-9 row can flip to `agent ✅` and stay flipped.

## 2. Goals

1. **Anchor the diff.** Capture the full `312c7b6` upstream patch
   verbatim in spec § 7.1 so future runs can re-verify against the
   same byte-pattern (FR-1).
2. **Record the architectural mismatch.** Document why the upstream
   commit's three new `print()` branches do not map onto the
   `WorkableService` plugin shape (FR-2 / D-01).
3. **Record the broader audit.** Catalogue every behaviour in the
   upstream `workable/main.py` (slug extraction, retry policy,
   404 handling, bulk-loop scheduling, last-scraped checkpoint,
   force flag) and classify each as `mirrored` /
   `mirrored-elsewhere` / `out-of-scope-for-plugin` /
   `gap-acknowledged` (FR-3).
4. **Flip AC-9.** Update `competitor-watch.md` § C row AC-9 from
   `agent` to `agent ✅` with the run number that lands T01 (FR-4).
5. **Close the spec.** Spec 018 is single-phase / single-T01-task /
   absorption-only; no source-code edit, no test fixture, no
   plugin extension (NFR-2 / NFR-3).

## 3. Non-Goals

- **No new Workable plugin features.** The 312c7b6 diff is
  diagnostic-logging-only at the upstream Python layer; it does
  not introduce new fields, new endpoints, or new behaviour. Our
  plugin already carries the public + authenticated paths and
  the relevant retry/timeout knobs through `createHttpClient`.
- **No `WorkableService` source edit.**
  [`workable.service.ts`](../../../packages/plugins/source-ats-workable/src/workable.service.ts)
  stays byte-identical to the post-Spec-013 surface.
- **No test fixture extension.** The existing
  [`__tests__/`](../../../packages/plugins/source-ats-workable/__tests__/)
  suite stays exact. Test count delta = 0 (NFR-2).
- **No `workable.constants.ts` edit.** The widget-API base URL
  matches the upstream byte-for-byte; no header rotation, no UA
  refresh.
- **No checkpoint / cache implementation.** The upstream
  `last_scraped` JSON cache is an orchestration concern (Bull /
  Redis / Postgres in our world) — explicitly out-of-scope here.
  If a future spec wants per-tenant checkpoint tracking, that's
  a fresh spec slot under the `persistence-postgres` plugin, not
  the `source-ats-workable` plugin.
- **No `force` flag in the plugin contract.** Our scraper plugins
  are stateless by design (`IScraper.scrape(ScraperInputDto)`
  returns `JobResponseDto` with no skip-reason channel). A
  caller that wants forced re-scrape simply invokes `.scrape()`
  again; there is no cache to bypass at the plugin layer.
- **No directory-row delta.** Spec 017 already refreshed the
  Workable section of
  [`docs/COMPANY_SLUG_DIRECTORY.md`](../../../docs/COMPANY_SLUG_DIRECTORY.md)
  to 27 rows; Spec 018 does not touch that table.
- **No docs/runbook delta beyond the absorption record.** The
  running plugin documentation in
  [`docs/ATS_INTEGRATIONS.md`](../../../docs/ATS_INTEGRATIONS.md)
  already covers Workable; Spec 018's evidence trail lives in
  this folder + `docs/log.md`.

## 4. User / Caller Stories

> As the **scheduled-task agent**, when I tick down `competitor-watch.md`
> § C AC-9 in a future run and find a non-trivial new commit on
> `OTHERS/Ats-scrapers/workable/main.py`, I want a recorded diff
> verdict for the prior anchor commit (`312c7b6`) so I can scope my
> new diff against the most-recent absorbed state — not against the
> Spec 001-era plugin scaffold.

> As a **future spec author** (Spec 020+), when I'm asked to refresh
> the Workable plugin's resilience policy (retries, jitter, 404
> handling), I want to know exactly which orchestration concerns
> the plugin layer DOES own vs. the Bull queue layer DOES own, so
> I scope my spec correctly.

## 5. Functional Requirements

| ID    | Requirement                                                                                                                                  | Priority |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| FR-1  | Spec 018 § 7.1 records the upstream `312c7b6` diff verbatim — both the `+` and `−` lines — for byte-level reproducibility from any future run. | must     |
| FR-2  | Spec 018 § 7.2 records the architectural-mismatch verdict: the upstream `print()` branches refine a Python-script checkpoint (`should_scrape_company`) that has **no analog in `WorkableService`** — therefore the absorption is a documented no-op. | must     |
| FR-3  | Spec 018 § 7.3 catalogues every upstream `workable/main.py` behaviour against the plugin's coverage matrix (Section 7.3 lists 8 rows: slug-extraction / public-widget-API / retry / 404-handling / SSL / bulk-loop / last-scraped / force-flag).      | must     |
| FR-4  | At T01 closeout, `competitor-watch.md` § C row AC-9 flips from `agent` to `agent ✅` with the run-number range matching T01's landed run.       | must     |
| FR-5  | The verdict is **idempotent**: re-running the FR-1 diff against the same upstream commit hash (`312c7b6`) on a future run reproduces the byte-for-byte same patch text recorded here. | must     |
| FR-6  | No `.ts` source file is modified across Spec 018's full lifecycle (NFR-2 / NFR-3 / Non-Goal §3.2).                                            | must     |

## 6. Non-Functional Requirements

| ID     | Requirement                                                                          | Target                |
| ------ | ------------------------------------------------------------------------------------ | --------------------- |
| NFR-1  | Documentation-only spec — no runtime code path, no perf budget.                     | n/a                   |
| NFR-2  | Test-suite delta across the whole spec.                                             | 0 cases               |
| NFR-3  | Source-code byte delta across the whole spec.                                       | 0 bytes (`.ts`)       |
| NFR-4  | Spec 018 lifecycle fits a lean cadence (Spec 016-style: 1 phase / 1 task / ≤ 2 runs total counting this scaffold pass). | ≤ 2 runs              |
| NFR-5  | `npm run lint:docs` clean across all Spec 018 doc edits.                            | exit code 0           |

## 7. Contracts

### 7.1 Upstream diff anchor — commit `312c7b6` (verbatim)

The single upstream commit named in `competitor-watch.md` § C
AC-9. Captured verbatim from `git show 312c7b6 --
workable/main.py` in `OTHERS/Ats-scrapers/`:

```diff
commit 312c7b6767ff88fd50393698014ad189ff9e0622
Author: kalil0321 <kalil.bouzigues@gmail.com>
Date:   Wed Dec 24 20:38:45 2025 +0100

    Improve workable scraper

diff --git a/workable/main.py b/workable/main.py
index fc61a24..2576522 100644
--- a/workable/main.py
+++ b/workable/main.py
@@ -97,14 +97,18 @@ async def scrape_workable_jobs(
         return company_data, num_jobs, False  # False = not scraped (skipped)

     # Log decision to scrape
-    if hours_elapsed is not None:
+    if force:
+        print(f"Forcing scrape for '{company_slug}' (force=True).")
+    elif hours_elapsed is not None:
         print(
             f"Scraped {company_slug} {hours_elapsed:.1f} hours ago. I will scrape again."
         )
     elif company_data is None:
         print(f"Company '{company_slug}' data file does not exist. I will scrape.")
-    else:
+    elif not company_data.get("last_scraped"):
         print(f"Company '{company_slug}' has no last_scraped field. I will scrape.")
+    else:
+        print(f"Company '{company_slug}' last_scraped field is invalid. I will scrape.")

     url = f"https://apply.workable.com/api/v1/widget/accounts/{company_slug}"
     print(f"Fetching {url}...")
```

Patch shape: 6 lines added, 2 lines removed, 1 hunk in
`workable/main.py` only. The diff exclusively refines the
`# Log decision to scrape` block — three new conditional `print()`
calls are added that name the *reason* for invoking the scrape:

1. `force=True` branch (new) — emits `Forcing scrape for '<slug>' (force=True).`
2. `elif not company_data.get("last_scraped")` branch (new) —
   distinguishes "field absent" from the prior catch-all else.
3. final `else` branch (new) — surfaces the previously-silent
   "field present but ISO-parse-failed" path under the
   `should_scrape_company` `(ValueError, TypeError)` catch.

The post-commit logical surface of `should_scrape_company` and
`scrape_workable_jobs` is otherwise byte-identical to the
pre-commit surface; no new return values, no new function
parameters, no new HTTP behaviour, no new retry semantics, no
new file-cache layout. The commit is a **diagnostic-logging
refinement only**.

### 7.2 Architectural-mismatch verdict (D-01 — recorded at T01)

Our [`WorkableService`](../../../packages/plugins/source-ats-workable/src/workable.service.ts)
implements `IScraper` from `@ever-jobs/models` — a **stateless,
per-request scraper** contract. The contract:

```ts
interface IScraper {
  scrape(input: ScraperInputDto): Promise<JobResponseDto>;
}
```

has no `force?: boolean` flag, no last-scraped checkpoint, no
per-company JSON cache file, no skip-reason emission channel,
and no bulk-loop scheduler — by design. Each of those concerns
maps to a different layer in the Ever Jobs architecture:

| Upstream concern                                           | Ever Jobs layer that owns it                                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `should_scrape_company` 12-hour cooldown                   | BullMQ queue scheduling (jobs requeued at the cron / aggregator level, not per-scraper).       |
| `last_scraped` JSON cache file (`companies/<slug>.json`)   | `persistence-postgres` plugin (per-tenant scrape-record table; opt-in via `EVER_JOBS_STORE`). |
| `force=True` re-scrape flag                                | API caller invokes `.scrape()` again with the same `ScraperInputDto`; no cache to bypass.      |
| Diagnostic `print()` of skip / scrape reason               | NestJS `Logger` from `@nestjs/common` — already wired in `WorkableService` constructor.         |
| Bulk-loop iteration over CSV slug → name mapping           | `JobsAggregator` fan-out + `Promise.allSettled` across registered sources.                     |
| Per-iteration `random.uniform(MIN_SCRAPE_DELAY, MAX_SCRAPE_DELAY)` jitter | `p-limit` bounded concurrency at the aggregator layer (orchestration concern).        |

The three new `print()` branches in `312c7b6` therefore have **no
analog in `WorkableService`**. Absorbing them at the plugin
layer would require first introducing the entire orchestration
mechanism (`should_scrape_company` checkpoint + `companies/`
JSON cache + `force` flag) — work that explicitly lives in the
persistence layer per the Spec 004 / Spec 005 architectural
boundaries.

**Verdict:** the `312c7b6` diff is a **documented no-op
absorption** at the `source-ats-workable` plugin level. The
upstream improvement applies entirely within the upstream
script's own checkpoint subsystem; the Ever Jobs equivalent of
that subsystem (BullMQ + `persistence-postgres`) lives outside
this plugin's surface area.

### 7.3 Coverage matrix — full upstream `workable/main.py` audit

Audit of every upstream behaviour against the
`source-ats-workable` plugin (T01 will append D-02 with any
further notes the implementation discovers; this scaffold pass
records the matrix as-of run #76 inspection):

| # | Upstream behaviour (line range in `workable/main.py`)                               | Plugin coverage                                                                                                                                  | Status                |
| - | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------- |
| 1 | `extract_company_slug(url)` — strip leading slash from URL path (lines 20..25)      | Plugin receives `companySlug` directly from `ScraperInputDto.companySlug`; slug-from-URL extraction is a CLI-side concern, not plugin-side.       | `out-of-scope-for-plugin` |
| 2 | Public widget API: `https://apply.workable.com/api/v1/widget/accounts/<slug>` (line 113) | `WORKABLE_API_URL` (`workable.constants.ts:2`) is byte-identical to the upstream URL.                                                          | `mirrored`            |
| 3 | `MAX_RETRIES = 3, BASE_RETRY_DELAY = 2 * attempt + jitter` (lines 14..15, 140..155) | `createHttpClient` in `@ever-jobs/common` exposes `retryDelay` / `retryBackoff` / `retryMaxDelay` (linear or exponential); the plugin uses the default. The numeric profile differs slightly (linear default vs. linear + jitter) but the resilience contract is met. | `mirrored-elsewhere`  |
| 4 | 404 → `print + return None, 0, False` (lines 122..125)                              | Plugin catches all errors via `try { ... } catch (err: any)` → `logger.error` + returns empty `JobResponseDto`. Slightly broader than upstream's specific 404 path but functionally equivalent. | `mirrored`            |
| 5 | `aiohttp.TCPConnector(ssl=False)` (line 116)                                        | Plugin uses `createHttpClient` defaults (TLS verification on; SSL pinning available via `caCert` input). The upstream `ssl=False` is intentionally not absorbed — Ever Jobs prefers TLS verification by default. | `gap-acknowledged` (intentional security upgrade) |
| 6 | Bulk-loop: iterate `companies = list(slug_to_name.keys())`, call `scrape_workable_jobs` per slug, sleep `random.uniform(MIN_SCRAPE_DELAY, MAX_SCRAPE_DELAY)` between (lines 158..205) | `JobsAggregator` fan-out across `PluginRegistry`-discovered sources; `p-limit` bounded concurrency.                                              | `mirrored-elsewhere`  |
| 7 | `last_scraped` checkpoint via JSON file in `companies/<slug>.json` (lines 28..73, 88..98) | `persistence-postgres` plugin (Spec 004); per-tenant scrape-record persistence is a fleet-aware concern, not a per-scraper one.                  | `out-of-scope-for-plugin` |
| 8 | `--force` CLI flag → `force=True` argument propagated through `should_scrape_company` and the `print()` block (lines 39..47, 88..111, 209..225) | Plugin contract `IScraper.scrape(ScraperInputDto)` carries no `force` knob; callers re-invoke `.scrape()` to retry.                              | `out-of-scope-for-plugin` |

Coverage tally (8 upstream behaviours):

- `mirrored` (2): widget API URL + 404/non-200 graceful-empty.
- `mirrored-elsewhere` (2): retry policy (`createHttpClient`) +
  bulk-loop scheduling (`JobsAggregator` + `p-limit`).
- `out-of-scope-for-plugin` (3): slug-from-URL, last-scraped
  checkpoint, force flag.
- `gap-acknowledged` (1): `ssl=False` — intentionally not
  absorbed; Ever Jobs prefers TLS verification by default.

No `gap-acknowledged` row will be promoted to a follow-on spec
candidate at T01 closeout. The `ssl=False` divergence is a
**security upgrade** in Ever Jobs's favour, not a regression.

### 7.4 Errors / sentinels

No new error codes. No new sentinels. The plugin's existing
`logger.error` + empty `JobResponseDto([])` pathway covers the
unreachable / 404 / 5xx scenarios.

## 8. Test Plan

| # | Case                                                                                  | Outcome                                                                                          | Phase |
| - | ------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | ----- |
| 1 | `npm run lint:docs` (FR-4 plus general doc hygiene) — Phase 0 closeout                | Clean (exit 0).                                                                                  | T00 (this scaffold pass) |
| 2 | `npm run lint:docs` after T01 closeout                                                | Clean (exit 0).                                                                                  | T01   |
| 3 | `npx jest --testPathPatterns 'packages/plugins/source-ats-workable'` (sanity sweep — FR-6 / NFR-2) | Existing test count unchanged; all green.                                                       | T01   |
| 4 | Re-run `git show 312c7b6 -- workable/main.py` in `OTHERS/Ats-scrapers/` after T01     | Patch text matches § 7.1 byte-for-byte (FR-5 idempotence).                                       | T01   |
| 5 | `competitor-watch.md` § C row AC-9 grep                                               | Reads `agent ✅` with the T01 landed-run number after T01 lands (FR-4).                            | T01   |
| 6 | Spec 018 spec.md Status grep                                                          | Reads `All phases done (T01 run #NN); spec complete` after T01 lands; reads `draft (scaffolded run #76); Phase 0 only — Phase 1 (T01) pending` between this run and T01. | T01   |

## 9. Open Questions

(None opened during scaffolding. The 312c7b6 diff is small and
unambiguous; the architectural-mismatch verdict is well-supported
by the existing Spec 004 / Spec 005 boundaries. No new
`Q-NNN` entries opened in `docs/questions.md` for run #76.)

## 10. Decisions

(Append-only log of decisions made during implementation.)

### D-01 — `312c7b6` is a documented no-op absorption at the `source-ats-workable` plugin layer (run #77, T01 closeout)

**Date:** 2026-04-28 (run #77, Spec 018 / Phase 1 / T01).

**Context.** `competitor-watch.md` § C row AC-9 named upstream
commit `312c7b6` ("Improve workable scraper", 2025-12-24,
+6 / −2 lines, 1 hunk in `OTHERS/Ats-scrapers/workable/main.py`)
as the diff anchor for absorption into the
[`source-ats-workable`](../../../packages/plugins/source-ats-workable/)
plugin. The diff adds three new conditional `print()` calls
inside the `# Log decision to scrape` block of
`scrape_workable_jobs`:

1. `if force:` → `Forcing scrape for '<slug>' (force=True).`
2. `elif not company_data.get("last_scraped"):` → distinguishes
   "field absent" from the prior catch-all else.
3. final `else:` → surfaces the previously-silent
   "field present but ISO-parse-failed" path under the
   `should_scrape_company` `(ValueError, TypeError)` catch.

The diff is a **diagnostic-logging refinement only** — no new
return values, no new function parameters, no new HTTP
behaviour, no new retry semantics, no new file-cache layout
(§ 7.1). FR-5 idempotence re-verified at T01 closeout:
`git show 312c7b6 -- workable/main.py` in
`OTHERS/Ats-scrapers/` reproduces the patch text in § 7.1
byte-for-byte.

**Decision.** The absorption is a **documented no-op** at the
`source-ats-workable` plugin level. No source-code edit is
landed against
[`workable.service.ts`](../../../packages/plugins/source-ats-workable/src/workable.service.ts),
[`workable.constants.ts`](../../../packages/plugins/source-ats-workable/src/workable.constants.ts),
[`workable.module.ts`](../../../packages/plugins/source-ats-workable/src/workable.module.ts),
[`workable.types.ts`](../../../packages/plugins/source-ats-workable/src/workable.types.ts),
or
[`__tests__/workable.e2e-spec.ts`](../../../packages/plugins/source-ats-workable/__tests__/workable.e2e-spec.ts)
across Spec 018's full lifecycle (FR-6 / NFR-3 — `.ts` byte
delta = 0; NFR-2 — test count delta = 0; the existing 3-case
e2e suite stays exact).

**Rationale.** The three new `print()` branches refine the
upstream's `should_scrape_company` checkpoint subsystem — a
Python-script-level concern rooted in the `companies/<slug>.json`
JSON cache file plus the `--force` CLI flag plus the
`hours_elapsed` 12-hour cooldown. None of those concerns map
onto our `WorkableService` contract:

| Upstream concern                                           | Ever Jobs layer that owns it                                                             |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `should_scrape_company` 12-hour cooldown                   | BullMQ queue scheduling (cron / aggregator level, not per-scraper).                      |
| `last_scraped` JSON cache (`companies/<slug>.json`)        | `persistence-postgres` plugin (Spec 004 boundary; opt-in via `EVER_JOBS_STORE`).         |
| `force=True` re-scrape flag                                | API caller invokes `.scrape()` again with the same `ScraperInputDto`; no cache to bypass. |
| Diagnostic `print()` of skip / scrape reason               | NestJS `Logger` from `@nestjs/common` — already wired in `WorkableService` constructor.   |
| Bulk-loop iteration over CSV slug → name mapping           | `JobsAggregator` fan-out + `Promise.allSettled` across registered sources.                |
| Per-iteration `random.uniform()` jitter                    | `p-limit` bounded concurrency at the aggregator layer (orchestration concern).            |

The `IScraper` contract from `@ever-jobs/models`
(`packages/models/src/interfaces/scraper.interface.ts`) is
**stateless by design** — `IScraper.scrape(input: ScraperInputDto): Promise<JobResponseDto>`
carries no `force?: boolean` flag, no last-scraped checkpoint,
no per-company JSON cache, no skip-reason emission channel,
no bulk-loop scheduler. Absorbing the upstream `print()`
branches at the plugin layer would first require
introducing the entire checkpoint subsystem at the plugin
layer — work that explicitly lives in `persistence-postgres`
(Spec 004 boundary) and `JobsAggregator` (Spec 005 boundary),
not in `source-ats-workable`.

**Re-read of `WorkableService`** (per § 7.3 row coverage matrix
and the T01 acceptance criteria): the plugin already absorbs
every upstream behaviour where the architectural shape
permits. Specifically:

- **Widget API URL parity (`mirrored`):** `WORKABLE_API_URL`
  in `workable.constants.ts:2` (`https://apply.workable.com/api/v1/widget/accounts/`)
  is byte-identical to the upstream URL constructed at
  `workable/main.py:113`.
- **404 / non-200 graceful empty (`mirrored`):** the plugin
  catches all errors via `try { ... } catch (err: any)` →
  `logger.error` + returns empty `JobResponseDto`. Slightly
  broader than upstream's specific 404 path but functionally
  equivalent.
- **Retry policy (`mirrored-elsewhere`):** `createHttpClient`
  in
  [`packages/common/src/http/http-client.ts`](../../../packages/common/src/http/http-client.ts)
  exposes `retryDelay` / `retryBackoff` / `retryMaxDelay`
  knobs. The numeric profile differs slightly (linear default
  vs. linear + jitter) but the resilience contract is met.
- **Bulk-loop scheduling (`mirrored-elsewhere`):** Ever Jobs
  ships this at the `JobsAggregator` layer + `p-limit`
  bounded concurrency, not at the plugin layer.
- **Slug-from-URL extraction (`out-of-scope-for-plugin`):** the
  plugin receives `companySlug` directly from
  `ScraperInputDto.companySlug`; URL-to-slug parsing is a
  CLI-side / caller-side concern.
- **`last_scraped` checkpoint (`out-of-scope-for-plugin`):**
  the per-tenant scrape-record persistence is a fleet-aware
  concern (`persistence-postgres` plugin, Spec 004 boundary),
  not a per-scraper one.
- **`--force` flag (`out-of-scope-for-plugin`):** the plugin
  contract carries no `force` knob; callers re-invoke
  `.scrape()` to retry.

No `D-02..D-NN` discovery notes opened at T01 closeout — the
re-read of `workable.service.ts` against the § 7.3 coverage
matrix surfaced no additional ambiguity. The `gap-acknowledged`
§ 7.3 row 5 (`aiohttp.TCPConnector(ssl=False)`) **stays
unpromoted** as a follow-on spec candidate — the divergence is
a **security upgrade** in Ever Jobs's favour (TLS verification
on by default), not a regression.

**Consequences.**

- `competitor-watch.md` § C row AC-9 flips from `agent` to
  `agent ✅` with the run-number stamp `(run #77)` (FR-4).
- Spec 018 spec.md Status flips from `draft (scaffolded run #76); Phase 0 only — Phase 1 (T01) pending`
  to `All phases done (T01 run #77); spec complete`
  (Test Plan #6).
- Spec 018's tasks.md T01 row flips from `[ ]` to `[x]`
  with the run-number stamp.
- The `source-ats-workable` plugin's surface is **byte-frozen**
  against the post-Spec-013 shape until either (a) a future
  `competitor-watch.md` § C row adds a fresh diff anchor, or
  (b) a Spec 020+ deliberately scopes a Workable-plugin
  feature (e.g. authenticated SPI v3 sweep, custom-domain
  resolution).
- Future absorption passes against `OTHERS/Ats-scrapers/workable/`
  start their own diff cursor at upstream commit `312c7b6 +1`
  (i.e. anything after the diff anchor), not against the
  Spec 001-era plugin scaffold.
- AC-9 is the **last agent-owned § C row** in
  `competitor-watch.md` for the current upstream snapshot
  (AC-3..AC-7 closed in earlier passes, AC-8 closed by Spec 017).
  Run #78 picks the next backlog candidate per the tasks.md
  "Default for run #78" guidance — recommended pick is
  **(a) salary-parser-residuals-batch-2** (Q-026 / Q-027 /
  Q-035 / Q-036) on the warm-internal-correctness rationale.

## 11. References

- `OTHERS/Ats-scrapers/workable/main.py` — upstream source
  under audit; commit `3bacd6e` HEAD, anchor diff at `312c7b6`
  (the file lives at the workspace root outside the ever-jobs
  repo, so referenced as a plain backticked path).
- [`packages/plugins/source-ats-workable/`](../../../packages/plugins/source-ats-workable/) —
  Ever Jobs plugin; absorbs upstream behaviour where applicable.
  - [`src/workable.service.ts`](../../../packages/plugins/source-ats-workable/src/workable.service.ts) —
    main scraper class (`WorkableService implements IScraper`).
  - [`src/workable.constants.ts`](../../../packages/plugins/source-ats-workable/src/workable.constants.ts) —
    widget API URL byte-aligned with upstream line 113.
- [`packages/common/src/http/http-client.ts`](../../../packages/common/src/http/http-client.ts) —
  `createHttpClient` retry / backoff implementation (Coverage Matrix § 7.3 row 3).
- [`packages/models/src/interfaces/scraper.interface.ts`](../../../packages/models/src/interfaces/scraper.interface.ts) —
  `IScraper` contract; § 7.2 quoted shape.
- `competitor-watch.md` §C — AC-9 row (the file lives at the
  workspace root outside the ever-jobs repo, so referenced as a
  plain backticked path; flipped to `agent ✅ (run #77)` at T01
  closeout).
- `.specify/specs/006-ats-scrapers-parity-batch-1/spec.md` —
  established the absorption pattern; closed run #36.
- `.specify/specs/013-ats-scrapers-parity-batch-2/spec.md` —
  most recent ATS-parity precedent; closed run #58.
- `.specify/specs/017-seed-companies-refresh-batch-1/spec.md` —
  refreshed Workable directory rows (27 rows post-Spec-017);
  closed run #75.
