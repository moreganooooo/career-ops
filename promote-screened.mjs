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
 *   node promote-screened.mjs --retry-na          # re-queue NA-score entries from applications.md
 *   node promote-screened.mjs --retry-na --max-age-days 14  # only retry entries scanned within N days
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
const retryNa       = args.includes('--retry-na');
const maxAgeDays    = parseInt(argValue('--max-age-days') ?? '0', 10);
const outputFile    = argValue('--output') ?? join(BATCH_DIR, retryNa ? 'batch-input-retry-na.tsv' : 'batch-input-promoted.tsv');
const stateOutFile  = join(BATCH_DIR, 'batch-state-phase2.tsv');

if (isNaN(minScore) || minScore < 0 || minScore > 5) {
  console.error('ERROR: --min-score must be a number between 0 and 5.');
  process.exit(1);
}

// ── --retry-na mode: read applications.md directly ───────────────────────────

if (retryNa) {
  const trackerFile = join(ROOT, 'data', 'applications.md');
  const pipelineFile = join(ROOT, 'pipeline.md');

  if (!existsSync(trackerFile)) {
    console.error('ERROR: data/applications.md not found.');
    process.exit(1);
  }

  const cutoffDate = maxAgeDays > 0
    ? new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000)
    : null;

  // Read pipeline.md to resolve URLs for each entry ID
  const urlMap = new Map(); // id → url
  if (existsSync(pipelineFile)) {
    for (const line of readFileSync(pipelineFile, 'utf-8').split('\n')) {
      // pipeline.md rows: `- [ ] #NNN | https://... | Company | Role`
      // or x-marked:      `- [x] #NNN | https://... | Company | Role`
      const m = line.match(/^-\s*\[.\]\s*#(\d+)\s*\|\s*(https?:\/\/\S+)/);
      if (m) urlMap.set(m[1], m[2]);
    }
  }

  const retryEntries = [];
  const skippedStale = [];

  for (const line of readFileSync(trackerFile, 'utf-8').split('\n')) {
    if (!line.startsWith('|')) continue;
    const parts = line.split('|').map(p => p.trim()).filter(Boolean);
    if (parts.length < 6) continue;
    const [numStr, date, company, role, status, scoreRaw, , , notes] = parts;
    const num = parseInt(numStr, 10);
    if (isNaN(num)) continue;

    // Only target entries where score is NA and notes flag them as retry-eligible
    const scoreIsNA = scoreRaw?.trim().toUpperCase() === 'NA';
    const isRetryFlagged = notes?.includes('[retry-eligible]');
    if (!scoreIsNA || !isRetryFlagged) continue;

    // Age gate: skip entries older than --max-age-days
    if (cutoffDate && date) {
      const entryDate = new Date(date);
      if (!isNaN(entryDate) && entryDate < cutoffDate) {
        skippedStale.push({ num, date, company, role });
        continue;
      }
    }

    const url = urlMap.get(String(num)) || '';
    retryEntries.push({ id: String(num), url, company, role, date });
  }

  // ── Write retry batch input ───────────────────────────────────────────────

  if (retryEntries.length === 0) {
    console.log('\n✅  No retry-eligible NA entries found in applications.md.');
    if (skippedStale.length > 0) {
      console.log(`   (${skippedStale.length} stale entries skipped — older than ${maxAgeDays} days)`);
      console.log('   Re-run without --max-age-days to include them.');
    }
    process.exit(0);
  }

  const inputLines = ['id\turl\tsource\tnotes'];
  for (const e of retryEntries) {
    const label = e.company !== 'unknown' ? `${e.company} — ${e.role}` : e.url;
    inputLines.push(`${e.id}\t${e.url}\tretry-na\tNA score retry: ${label}`);
  }
  writeFileSync(outputFile, inputLines.join('\n') + '\n', 'utf-8');

  // Reset phase 2 state for these entries
  writeFileSync(stateOutFile,
    'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n',
    'utf-8'
  );

  console.log('\n╔══════════════════════════════════════════════╗');
  console.log('║     promote-screened — NA Retry Mode         ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`  Found     : ${retryEntries.length} retry-eligible NA entries`);
  if (skippedStale.length > 0) console.log(`  Skipped   : ${skippedStale.length} stale (older than ${maxAgeDays} days)`);
  console.log('');
  console.log('  Entries queued for retry:');
  for (const e of retryEntries) {
    console.log(`    #${String(e.id).padEnd(5)}  ${e.date}  ${e.company} — ${e.role}`.slice(0, 80));
  }
  console.log('');
  console.log('  Output files:');
  console.log(`    ${outputFile}`);
  console.log(`    ${stateOutFile}  (fresh state for Phase 2)`);
  console.log('');
  console.log('  Run Phase 2 to re-evaluate:');
  console.log('');
  console.log('    node batch-phase2-gemini.mjs');
  console.log('');
  console.log('  ⚠️  After a successful retry, the old NA row in applications.md');
  console.log('      will be overwritten by merge-tracker.mjs automatically.');
  console.log('');
  process.exit(0);
}

// ── Standard mode: read Phase 1 state ────────────────────────────────────────

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
