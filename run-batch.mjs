#!/usr/bin/env node
/**
 * run-batch.mjs — Interactive conductor for the full batch Gemini pipeline
 *
 * Walks through all 8 steps with human checkpoints, saves progress so you
 * can resume from any step if something goes wrong or you need to stop.
 *
 * Usage:
 *   node run-batch.mjs                  # start fresh or resume from last checkpoint
 *   node run-batch.mjs --from-step 6    # jump to a specific step
 *   node run-batch.mjs --reset          # clear saved state and start over
 *   node run-batch.mjs --yes            # auto-confirm all Y/n prompts (non-interactive)
 *
 * Steps:
 *   1  doctor.mjs             — environment validation
 *   2  scan.mjs               — job discovery
 *   3  dedup-tracker.mjs      — remove duplicates
 *   4  merge-tracker.mjs      — merge pending tracker additions (silent)
 *   5  filter-batch.sh        — hard-filter mismatches
 *   6  batch-runner-gemini    — Phase 1 cheap screening
 *   7  promote-screened.mjs   — select jobs for Phase 2
 *   8  batch-phase2-gemini    — full deep evaluation
 */

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync, spawnSync } from 'child_process';
import * as readline from 'readline';

const ROOT       = dirname(fileURLToPath(import.meta.url));
const STATE_FILE = join(ROOT, '.run-batch-state.json');
const BATCH_DIR  = join(ROOT, 'batch');

// ── Args ──────────────────────────────────────────────────────────────────

const args    = process.argv.slice(2);
const autoYes = args.includes('--yes');
const doReset = args.includes('--reset');

function argValue(flag) {
  const idx = args.indexOf(flag);
  return idx !== -1 && args[idx + 1] ? args[idx + 1] : null;
}

// ── State ─────────────────────────────────────────────────────────────────

const DEFAULT_STATE = {
  startedAt:    null,
  completedAt:  null,
  lastStep:     0,       // last fully completed step (0 = none)
  phase2Threshold: null, // chosen at step 7
  includeConsider: false,
  retryNa:      false,
};

function loadState() {
  if (existsSync(STATE_FILE)) {
    try { return { ...DEFAULT_STATE, ...JSON.parse(readFileSync(STATE_FILE, 'utf-8')) }; }
    catch { /* corrupt state — reset */ }
  }
  return { ...DEFAULT_STATE };
}

function saveState(state) {
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

function clearState() {
  if (existsSync(STATE_FILE)) {
    writeFileSync(STATE_FILE, JSON.stringify({ ...DEFAULT_STATE }, null, 2), 'utf-8');
  }
}

// ── Prompt helpers ──────────────────────────────────────────────────────────

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise(resolve => rl.question(question, resolve));
}

async function confirm(message, defaultYes = true) {
  if (autoYes) { console.log(`${message} [auto-yes]`); return true; }
  const hint = defaultYes ? '[Y/n]' : '[y/N]';
  const answer = (await ask(`${message} ${hint} `)).trim().toLowerCase();
  return answer === '' ? defaultYes : answer === 'y' || answer === 'yes';
}

async function choose(message, defaultValue, validate) {
  if (autoYes) { console.log(`${message} [auto: ${defaultValue}]`); return defaultValue; }
  while (true) {
    const raw = (await ask(`${message} [${defaultValue}] `)).trim();
    const value = raw === '' ? String(defaultValue) : raw;
    if (!validate || validate(value)) return value;
    console.log('  ⚠️  Invalid input, try again.');
  }
}

// ── Script runner ────────────────────────────────────────────────────────────

function run(script, extraArgs = [], opts = {}) {
  const isShell = script.endsWith('.sh');
  const cmd     = isShell ? script : process.execPath;
  const cmdArgs = isShell ? extraArgs : [join(ROOT, script), ...extraArgs];

  const result = spawnSync(cmd, cmdArgs, {
    cwd: ROOT,
    stdio: 'inherit',
    encoding: 'utf-8',
    ...opts,
  });

  if (result.status !== 0 && !opts.allowFail) {
    throw new Error(`${script} exited with code ${result.status}`);
  }
  return result;
}

// ── Stat helpers (for summaries after each step) ────────────────────────────

function countTrackerRows() {
  const f = join(ROOT, 'data', 'applications.md');
  if (!existsSync(f)) return 0;
  return readFileSync(f, 'utf-8').split('\n').filter(l => /^\|\s*\d+/.test(l)).length;
}

function countBatchInput(file) {
  if (!existsSync(file)) return 0;
  return readFileSync(file, 'utf-8').trim().split('\n').slice(1).filter(Boolean).length;
}

function scoreDistribution() {
  const f = join(BATCH_DIR, 'batch-state.tsv');
  if (!existsSync(f)) return null;
  const lines = readFileSync(f, 'utf-8').trim().split('\n').slice(1);
  let above4 = 0, consider = 0, below3 = 0, na = 0;
  for (const line of lines) {
    const [, , status, , , , scoreRaw] = line.split('\t');
    if (status !== 'completed') continue;
    const s = parseFloat(scoreRaw);
    if (isNaN(s))        na++;
    else if (s >= 4.0)   above4++;
    else if (s >= 3.0)   consider++;
    else                 below3++;
  }
  return { above4, consider, below3, na, total: above4 + consider + below3 + na };
}

function naRetryCount() {
  const f = join(ROOT, 'data', 'applications.md');
  if (!existsSync(f)) return 0;
  return readFileSync(f, 'utf-8').split('\n')
    .filter(l => l.includes('[retry-eligible]')).length;
}

// ── Main ─────────────────────────────────────────────────────────────────────

if (doReset) {
  clearState();
  console.log('♻️  State cleared. Run node run-batch.mjs to start fresh.\n');
  process.exit(0);
}

let state = loadState();

// --from-step overrides saved checkpoint
const fromStepArg = argValue('--from-step');
if (fromStepArg) {
  const n = parseInt(fromStepArg, 10);
  if (isNaN(n) || n < 1 || n > 8) {
    console.error('ERROR: --from-step must be 1–8');
    process.exit(1);
  }
  state.lastStep = n - 1; // will resume at step n
  saveState(state);
}

const startStep = state.lastStep + 1;

console.log('\n╔══════════════════════════════════════════════════════════════════╗');
console.log('║          career-ops — Batch Pipeline Conductor          ║');
console.log('╚══════════════════════════════════════════════════════════════════╝\n');

if (startStep > 1) {
  console.log(`⏭️  Resuming from step ${startStep} (last completed: step ${state.lastStep})`);
  console.log('   Run with --reset to start over, or --from-step N to jump to a different step.\n');
} else {
  state.startedAt = new Date().toISOString();
  saveState(state);
}

try {

// ─────────────────────────────────────────────────────────────────
// STEP 1 — Doctor
// ─────────────────────────────────────────────────────────────────
if (startStep <= 1) {
  console.log('─'.repeat(66));
  console.log('STEP 1 — 🔍  Doctor check');
  console.log('─'.repeat(66));

  run('doctor.mjs', [], { allowFail: true });

  const ok = await confirm('\nContinue to Step 2 (Scan)?');
  if (!ok) { console.log('\n⏸️  Paused after Step 1. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 1;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 2 — Scan
// ─────────────────────────────────────────────────────────────────
if (startStep <= 2) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 2 — 📡  Scan');
  console.log('─'.repeat(66));

  run('scan.mjs');

  const ok = await confirm('\nContinue to Step 3 (Dedup)?');
  if (!ok) { console.log('\n⏸️  Paused after Step 2. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 2;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 3 — Dedup
// ─────────────────────────────────────────────────────────────────
if (startStep <= 3) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 3 — 🧹  Dedup');
  console.log('─'.repeat(66));

  const beforeDedup = countTrackerRows();
  run('dedup-tracker.mjs');
  const afterDedup = countTrackerRows();
  const removed = Math.max(0, beforeDedup - afterDedup);
  if (removed > 0) console.log(`\n  ℹ️  Removed ${removed} duplicate entries from applications.md`);

  const ok = await confirm('\nContinue to Step 4 (Merge tracker)?');
  if (!ok) { console.log('\n⏸️  Paused after Step 3. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 3;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 4 — Merge tracker (silent, no confirm needed)
// ─────────────────────────────────────────────────────────────────
if (startStep <= 4) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 4 — 🔀  Merge tracker');
  console.log('─'.repeat(66));

  run('merge-tracker.mjs');
  console.log('  ✅  Done.');

  state.lastStep = 4;
  saveState(state);
  // No confirm — auto-continues to Step 5
}

// ─────────────────────────────────────────────────────────────────
// STEP 5 — Filter
// ─────────────────────────────────────────────────────────────────
if (startStep <= 5) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 5 — 🚫  Filter');
  console.log('─'.repeat(66));

  run(join(ROOT, 'filter-batch.sh'));  // lives in root, not batch/

  const remaining = countBatchInput(join(BATCH_DIR, 'batch-input.tsv'));
  console.log(`\n  ℹ️  ${remaining} jobs remaining after filter`);

  const ok = await confirm('\nContinue to Step 6 (Phase 1 screening)?');
  if (!ok) { console.log('\n⏸️  Paused after Step 5. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 5;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 6 — Phase 1 screening
// ─────────────────────────────────────────────────────────────────
if (startStep <= 6) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 6 — ⚡  Phase 1 screening (Gemini)');
  console.log('─'.repeat(66));

  run('batch-runner-gemini.mjs');  // lives in root, not batch/

  const dist = scoreDistribution();
  if (dist) {
    console.log('\n  Score distribution:');
    console.log(`    ✅  4.0+      →  ${dist.above4} jobs  (auto-promote candidates)`);
    console.log(`    🤔  3.0–3.9    →  ${dist.consider} jobs  (consider pass)`);
    console.log(`    ❎  below 3.0 →  ${dist.below3} jobs  (skip)`);
    if (dist.na > 0)
    console.log(`    ⚠️  NA score  →  ${dist.na} jobs  (extraction failed)`);
  }

  const ok = await confirm('\nContinue to Step 7 (Promote to Phase 2)?');
  if (!ok) { console.log('\n⏸️  Paused after Step 6. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 6;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 7 — Promote to Phase 2
// ─────────────────────────────────────────────────────────────────
if (startStep <= 7) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 7 — 🔼  Promote to Phase 2');
  console.log('─'.repeat(66));

  // Ask for threshold (restore saved value if resuming mid-step)
  const savedThreshold = state.phase2Threshold ?? '4.0';
  const threshold = await choose(
    '\n  Promote threshold (jobs scoring at or above this go to Phase 2):',
    savedThreshold,
    v => !isNaN(parseFloat(v)) && parseFloat(v) >= 0 && parseFloat(v) <= 5
  );

  const dist = scoreDistribution();
  const considerCount = dist?.consider ?? 0;
  let includeConsider = state.includeConsider ?? false;

  if (considerCount > 0) {
    includeConsider = await confirm(
      `  Also include ${considerCount} "Consider" (3.0–3.9) entries for manual review?`,
      false
    );
  }

  state.phase2Threshold = threshold;
  state.includeConsider = includeConsider;
  saveState(state);

  const promoteArgs = ['--min-score', threshold];
  run('promote-screened.mjs', promoteArgs);

  if (includeConsider) {
    console.log('\n  📝 Writing consider list...');
    run('promote-screened.mjs', ['--min-score', '3.0', '--output', join(BATCH_DIR, 'batch-input-consider.tsv')]);
    console.log(`  Saved to batch/batch-input-consider.tsv — review manually before applying.`);
  }

  const promoted = countBatchInput(join(BATCH_DIR, 'batch-input-promoted.tsv'));
  console.log(`\n  ℹ️  ${promoted} jobs promoted to Phase 2`);

  const ok = await confirm(`\nRun Phase 2 deep evaluation on these ${promoted} jobs?`);
  if (!ok) { console.log('\n⏸️  Paused after Step 7. Run again to resume.'); rl.close(); process.exit(0); }

  state.lastStep = 7;
  saveState(state);
}

// ─────────────────────────────────────────────────────────────────
// STEP 8 — Phase 2 deep evaluation
// ─────────────────────────────────────────────────────────────────
if (startStep <= 8) {
  console.log('\n' + '─'.repeat(66));
  console.log('STEP 8 — 🧠  Phase 2 — Full Gemini evaluation');
  console.log('─'.repeat(66) + '\n');

  // Phase 2 is self-resumable via its own state file — just run it
  run('batch-phase2-gemini.mjs');

  // Check for NA retry entries
  const naCount = naRetryCount();
  let retryNa = state.retryNa ?? false;
  if (naCount > 0) {
    console.log(`\n  ⚠️  ${naCount} entries landed with NA scores (score extraction failed).`);
    retryNa = await confirm(`  Retry these ${naCount} entries now?`, false);
  }

  if (retryNa) {
    console.log('\n  🔄  Building NA retry batch...');
    run('promote-screened.mjs', ['--retry-na']);
    const retryCount = countBatchInput(join(BATCH_DIR, 'batch-input-retry-na.tsv'));
    if (retryCount > 0) {
      const goRetry = await confirm(`  Run Phase 2 again on ${retryCount} retry entries?`);
      if (goRetry) {
        run('batch-phase2-gemini.mjs', [
          '--input', join(BATCH_DIR, 'batch-input-retry-na.tsv'),
        ]);
      }
    }
  }

  state.lastStep = 8;
  state.completedAt = new Date().toISOString();
  state.retryNa = retryNa;
  saveState(state);
}

// ── Done ───────────────────────────────────────────────────────────────────

console.log('\n' + '═'.repeat(66));
console.log('  🎉  Batch pipeline complete!');
console.log('═'.repeat(66));
console.log('');
console.log('  Next steps:');
console.log('    node analyze-patterns.mjs       ← patterns + conversion insights');
console.log('    Review batch/batch-input-consider.tsv  ← if you included Consider entries');
console.log('');
console.log('  To run another batch:');
console.log('    node run-batch.mjs --reset      ← clear state and start fresh');
console.log('');

} catch (err) {
  console.error(`\n❌  Pipeline stopped at step ${state.lastStep + 1}: ${err.message}`);
  console.error(`   Fix the issue, then run: node run-batch.mjs`);
  console.error(`   (will resume from step ${state.lastStep + 1})`);
  rl.close();
  process.exit(1);
}

rl.close();
