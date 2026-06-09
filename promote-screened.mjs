#!/usr/bin/env node
/**
 * promote-screened.mjs
 *
 * Phase 2 bridge for the mega-batch workflow:
 *   Phase 1: screen everything cheaply  → batch-state.tsv has scores
 *   Phase 2: full eval only the best    → this script builds that input
 *
 * Usage:
 *   node promote-screened.mjs                     # default: score >= 4.0
 *   node promote-screened.mjs --min-score 3.5     # lower threshold
 *   node promote-screened.mjs --min-score 4.5     # higher threshold
 *   node promote-screened.mjs --include-failed    # also promote failed entries for retry
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT      = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(ROOT, 'batch');

// ── Args ─────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);

function argValue(flag) {
  const eq = args.find(a => a.startsWith(flag + '='));
  if (eq) return eq.split('=').slice(1).join('=');
  const idx = args.indexOf(flag);
  if (idx !== -1 && args[idx + 1]) return args[idx + 1];
  return null;
}

const minScore      = parseFloat(argValue('--min-score') ?? '4.0');
const includeFailed = args.includes('--include-failed');
const outputFile    = argValue('--output') ?? join(BATCH_DIR, 'batch-input-promoted.tsv');
const stateOutFile  = join(BATCH_DIR, 'batch-state-phase2.tsv');

if (isNaN(minScore) || minScore < 0 || minScore > 5) {
  console.error('ERROR: --min-score must be a number between 0 and 5.');
  process.exit(1);
}

// ── Read Phase 1 state ────────────────────────────────────────────────────────

const stateFile = join(BATCH_DIR, 'batch-state.tsv');
if (!existsSync(stateFile)) {
  console.error('ERROR: batch/batch-state.tsv not found.');
  console.error('Run Phase 1 first: ./batch/batch-runner.sh --cli gemini --prompt batch/screen-prompt.md');
  process.exit(1);
}

// columns: id  url  status  started_at  completed_at  report_num  score  error  retries
const stateLines = readFileSync(stateFile, 'utf-8').trim().split('\n');
const promoted = [];

for (const line of stateLines.slice(1)) {
  const [id, url, status, , , reportNum, scoreRaw] = line.split('\t');
  if (!id || !url) continue;

  const isCompleted = status === 'completed';
  const isFailed    = status === 'failed';

  if (!isCompleted && !(includeFailed && isFailed)) continue;

  const score = parseFloat(scoreRaw);

  // Failed entries without a score are included at threshold 0 when --include-failed
  if (isCompleted && (isNaN(score) || score < minScore)) continue;

  promoted.push({ id, url, score: isNaN(score) ? null : score, reportNum, status });
}

// ── Read batch-input.tsv for source/notes metadata ───────────────────────────

const inputFile = join(BATCH_DIR, 'batch-input.tsv');
const inputMeta = new Map(); // id → { source, notes }

if (existsSync(inputFile)) {
  for (const line of readFileSync(inputFile, 'utf-8').trim().split('\n').slice(1)) {
    const [id, , source, notes] = line.split('\t');
    if (id) inputMeta.set(id, { source: source || 'screened', notes: notes || '' });
  }
}

// ── Sort by score descending, failed entries last ────────────────────────────

promoted.sort((a, b) => {
  if (a.score === null && b.score === null) return 0;
  if (a.score === null) return 1;
  if (b.score === null) return -1;
  return b.score - a.score;
});

if (promoted.length === 0) {
  console.log(`\nNo entries found with score >= ${minScore} in batch-state.tsv.`);
  if (!includeFailed) {
    const failedCount = stateLines.slice(1).filter(l => l.split('\t')[2] === 'failed').length;
    if (failedCount > 0) {
      console.log(`  (${failedCount} failed entries exist — re-run with --include-failed to promote them)`);
    }
  }
  console.log('\nRun Phase 1 first:');
  console.log('  ./batch/batch-runner.sh --cli gemini --prompt batch/screen-prompt.md');
  process.exit(0);
}

// ── Write promoted batch-input ────────────────────────────────────────────────

const inputLines = ['id\turl\tsource\tnotes'];
for (const entry of promoted) {
  const meta  = inputMeta.get(entry.id) ?? { source: 'screened', notes: '' };
  const notes = meta.notes || (entry.score ? `screen score ${entry.score}/5` : 'retry');
  inputLines.push(`${entry.id}\t${entry.url}\t${meta.source}\t${notes}`);
}
writeFileSync(outputFile, inputLines.join('\n') + '\n', 'utf-8');

// ── Write fresh Phase 2 state file ───────────────────────────────────────────

writeFileSync(stateOutFile,
  'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n',
  'utf-8'
);

// ── Print summary ─────────────────────────────────────────────────────────────

const completed = promoted.filter(e => e.status === 'completed');
const failed    = promoted.filter(e => e.status === 'failed');

console.log('\n╔══════════════════════════════════════════════╗');
console.log('║       promote-screened — Phase 2 ready       ║');
console.log('╚══════════════════════════════════════════════╝\n');
console.log(`  Threshold : score >= ${minScore}`);
console.log(`  Promoted  : ${promoted.length} roles (${completed.length} scored, ${failed.length} failed/retry)`);
console.log('');

if (completed.length > 0) {
  console.log('  Top candidates:');
  for (const e of completed.slice(0, 15)) {
    const meta  = inputMeta.get(e.id);
    const label = meta?.notes?.split(' - ')[0] || meta?.notes || e.url.split('/').slice(-3, -1).join('/');
    console.log(`    ${String(e.score.toFixed(1)).padStart(3)}/5  #${e.id.padEnd(4)}  ${label.slice(0, 60)}`);
  }
  if (completed.length > 15) console.log(`    ... and ${completed.length - 15} more`);
}

console.log('');
console.log('  Output files:');
console.log(`    ${outputFile}`);
console.log(`    ${stateOutFile}  (fresh state for Phase 2)`);
console.log('');
console.log('  Run Phase 2 full evaluation:');
console.log('');
console.log('    # With Gemini (free):');
console.log(`    ./batch/batch-runner.sh --cli gemini --input batch/batch-input-promoted.tsv --state batch/batch-state-phase2.tsv`);
console.log('');
console.log('    # With Claude:');
console.log(`    ./batch/batch-runner.sh --input batch/batch-input-promoted.tsv --state batch/batch-state-phase2.tsv`);
console.log('');
