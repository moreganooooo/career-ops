# Mode: batch — Batch Discovery + Processing

Use this mode for high-volume job collection and processing.

This mode is the batch companion to `scan.md`, not a separate discovery philosophy.
It should inherit the same collection rules, fallback order, dedup rules, and liveness checks from `scan.md`, then hand verified jobs off for deeper evaluation. 

## What this mode is for

`scan.md` explains how to discover jobs across configured portals.
`batch.md` applies that same logic at scale, then processes each verified job into a report and tracker update.

Use `batch.md` when:
- collecting many jobs from tracked portals in one run
- navigating logged-in job portals live in Chrome
- processing a previously collected list of URLs in bulk
- resuming a large run after interruption

Do not invent a different scan order here.
If `scan.md` says Level 0 → Level 1 → Level 2 → Level 3, `batch.md` must preserve that order.

## Relationship to other files

- `scan.md` owns discovery logic, fallback order, liveness checks, dedup policy, and history logging
- `batch.md` owns orchestration, resumability, worker execution, and mass processing
- `offer.md` owns deep single-job evaluation
- `offers.md` owns multi-job comparison
- `portals.yml` owns portal configuration, title filters, location filters, tracked companies, parsers, and search queries

## Architecture

```text
Batch conductor
  │
  ├─ Reads config: portals.yml
  ├─ Reads history: data/scan-history.tsv
  ├─ Reads dedup sources: data/pipeline.md + data/applications.md
  ├─ Executes discovery using scan.md level order
  │
  ├─ Level 0: local parser / scan.mjs
  ├─ Level 1: direct browser scan of tracked companies not covered by Level 0
  ├─ Level 2: ATS APIs / feeds for tracked companies not covered by Level 0
  ├─ Level 3: WebSearch for broader discovery + liveness verification
  │
  ├─ Verified candidates
  │    └─► worker process per job
  │          ├─ fetch / read JD
  │          ├─ run evaluation prompt
  │          ├─ write report
  │          └─ write tracker addition
  │
  └─ End: merge tracker additions + output summary
```

Each worker should be isolated so one job failure does not break the full run.
The conductor orchestrates discovery, dedup, retries, and state.

## Two operating modes

### Mode A: Conductor + Chrome

Use this when:
- a site requires login
- the user wants to watch navigation live
- the portal is easier to inspect in a headed browser
- the agent must read DOM content directly from a real session

Chrome is used for real-time navigation and extraction.
Workers still process jobs independently after extraction.

### Mode B: Standalone batch runner

Use this when:
- URLs have already been collected
- a prior scan produced a verified candidate list
- the run should execute unattended
- failed jobs need retry without repeating collection

This mode consumes `batch-input.tsv` and `batch-state.tsv` directly.

## Discovery rules inherited from scan.md

### Level 0 — Local parser / zero-token scan first

Run the cheapest structured collection first.
Prefer `scan.mjs` / `npm run scan` or the configured local parser commands from `portals.yml` before using browser automation. 

Rules:
- Build an in-memory `localparserok` set of companies whose local parser succeeded
- If Level 0 succeeds for a company, do not repeat that company in Level 1 Playwright/browser scanning
- If Level 0 succeeds for a company, do not repeat that company in Level 2 ATS API/feed scanning
- Level 3 general WebSearch may still run, but discard results for companies already covered successfully by Level 0

A Level 0 parser counts as successful only if:
- the parser executes without fatal error
- stdout returns valid JSON in the expected structure
- jobs can be normalized to title, URL, company, and location

### Level 1 — Direct browser scan for tracked companies

For tracked companies not covered by Level 0:
- navigate to the configured `careersurl`
- read all visible listings from the live page
- capture title, URL, company, and location where available
- paginate when necessary
- use this as the primary fallback when local parsers are unavailable or fail

This is the most reliable real-time collection method for tracked companies with dynamic pages.

### Level 2 — ATS APIs / feeds

For tracked companies not covered by Level 0, use structured ATS endpoints when available.
Supported feeds may include:
- Greenhouse
- Ashby
- Lever
- BambooHR
- Teamtailor
- Workday

Use ATS feeds as a fast structured complement to browser scanning, not as a contradiction to it.
Normalize all results into the same candidate shape before dedup.

### Level 3 — WebSearch for broad discovery

Use WebSearch only after Levels 0-2.
This level is for discovering new opportunities broadly, including companies not already covered in tracked parsing or browser scans.

Rules:
- Use only enabled search queries from `portals.yml`
- Do not create company-specific WebSearch queries for companies already handled successfully by a local parser
- Discard Level 3 results whose normalized company matches `localparserok`
- Deduplicate Level 3 results against Levels 0, 1, and 2 before adding them to candidates

### Level 3 liveness verification is mandatory

WebSearch results may be stale.
Every newly discovered Level 3 URL must be verified live before it enters the processing queue.

Verify by navigating to the URL and classifying it as:
- **Active**: job title visible, role description visible, and a live apply path or credible job content present
- **Expired**: explicit closed signals, broken page, redirect error, or no real JD content

If a Level 3 URL cannot be verified live, mark it `skippedexpired` and do not process it further.

## Filtering and dedup

Before a worker processes a job, the conductor must apply the same intake discipline described in `scan.md`.

Read before each run:
- `portals.yml`
- `data/scan-history.tsv`
- `data/pipeline.md`
- `data/applications.md`

Then:
- apply title filters and exclusion rules from `portals.yml`
- apply location and remote filters from `portals.yml`
- skip URLs already present in scan history, pipeline, or applications unless explicitly retrying
- log skipped reasons clearly (`skippedtitle`, `skippeddup`, `skippedexpired`, `failed`)

## Batch input files

```text
batch/
  batch-input.tsv               # verified or pending URLs for processing
  batch-state.tsv               # progress tracker for the current run
  batch-runner.sh               # standalone orchestrator
  batch-prompt.md               # prompt template for job workers
  logs/                         # per-job logs (gitignored)
  tracker-additions/            # tracker lines awaiting merge (gitignored)
```

Recommended supporting files outside `batch/`:

```text
data/
  scan-history.tsv
  pipeline.md
  applications.md
```

## batch-state.tsv format

```text
id  url company title source status started_at completed_at report_num score error retries
1 https://... Acme Lifecycle Marketing Manager level1 completed 2026-... 2026-... 002 4.18 - 0
2 https://... ExampleCo Content Strategist level3 failed 2026-... 2026-... - - timeout 1
3 https://... - - manual pending - - - - - 0
```

Recommended status values:
- `pending`
- `collecting`
- `verified`
- `processing`
- `completed`
- `failed`
- `skippedtitle`
- `skippeddup`
- `skippedexpired`

## Conductor workflow

### Step 1 — Initialize run
1. Read `portals.yml`
2. Read `data/scan-history.tsv`
3. Read `data/pipeline.md`
4. Read `data/applications.md`
5. Read existing `batch-state.tsv` if present
6. Initialize `localparserok`

### Step 2 — Discovery using scan order
1. Execute Level 0 local parser / `scan.mjs`
2. Execute Level 1 browser scans for tracked companies not in `localparserok`
3. Execute Level 2 ATS APIs / feeds for tracked companies not in `localparserok`
4. Execute Level 3 WebSearch queries for broad discovery
5. Verify liveness for all new Level 3 URLs before queueing

### Step 3 — Normalize and filter
For every discovered candidate:
- normalize title, URL, company, location, and source level
- apply title and location filters
- deduplicate against history, pipeline, applications, and current batch state
- append eligible jobs to `batch-input.tsv`
- write skipped outcomes to history with explicit reason

### Step 4 — Worker processing
For each eligible pending job:
1. Read or fetch the full JD
2. Save a local JD snapshot if useful for reproducibility
3. Assign the next sequential report number
4. Execute the worker using `batch-prompt.md`
5. Write report output
6. Write tracker addition
7. Update `batch-state.tsv`
8. Write a per-job log file

### Step 5 — Finalize
1. Merge `tracker-additions/` into the tracker destination
2. Append new processed URLs to `data/scan-history.tsv`
3. Produce a run summary
4. Preserve failed rows for retry

## Worker contract

Each worker should be self-contained.
It receives:
- job URL
- normalized title
- company
- source level (`level0`, `level1`, `level2`, `level3`, or `manual`)
- JD text or a local JD file path
- report number
- any needed output paths

Each worker produces:
1. `.md` report
2. optional PDF if supported
3. tracker line in `batch/tracker-additions/`
4. machine-readable result payload via stdout or a state file

Worker failures should never stop the entire batch.

## Standalone runner

```bash
batch/batch-runner.sh [OPTIONS]
```

Recommended options:
- `--dry-run` — list what would be processed
- `--retry-failed` — retry only failed jobs
- `--start-from N` — start from row or ID N
- `--parallel N` — run N workers in parallel
- `--max-retries N` — attempts per job
- `--skip-discovery` — process existing `batch-input.tsv` only
- `--collect-only` — run discovery and verification without worker evaluation

## Resumability

- Re-running should read `batch-state.tsv` and skip completed rows
- A lock file such as `batch-runner.pid` should prevent double execution
- Each worker should fail independently
- A crash in job #47 must not invalidate jobs #1-46
- Failed jobs should remain retryable without repeating the full run

## Error handling

| Error | Recovery |
|-------|----------|
| Local parser fails | Do not add company to `localparserok`; continue to Level 1 or Level 2 fallback |
| Careers page inaccessible | Mark failed for that source path; continue with other companies |
| ATS API errors | Log the error and continue; do not stop the batch |
| Level 3 URL is stale | Mark `skippedexpired`; do not send to worker |
| Worker crashes | Mark `failed`, preserve retryability, continue batch |
| PDF generation fails | Preserve `.md` report and mark PDF pending |
| Conductor crashes | Resume from `batch-state.tsv` on rerun |

## Output summary

At the end of a run, output:
- queries executed
- companies scanned
- offers discovered
- offers filtered by title/location
- duplicates skipped
- expired links discarded
- jobs sent to workers
- reports completed
- failures remaining

End with a clear next-step note, such as:
- new offers added to pipeline
- reports generated for review
- rerun with `--retry-failed` for remaining failures

## Quality bar

This mode should behave like `scan.md` at scale.
That means:
- same discovery order
- same filtering logic
- same dedup rules
- same liveness standard for WebSearch hits
- clearer orchestration, not a separate worldview