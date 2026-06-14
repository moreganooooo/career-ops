#!/usr/bin/env node
/**
 * fix-evaluated-statuses.mjs
 *
 * Fixes two issues in applications.md:
 * 1. Rows with score >= MIN_SCORE that still have status SKIP → set to Evaluated
 * 2. Garbled score values (e.g. "NA5", "Calculated at end5") → cleaned up
 *
 * Run: node fix-evaluated-statuses.mjs [--dry-run] [--min-score 4.0]
 */

import { readFileSync, writeFileSync, copyFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const APPS_FILE = existsSync(join(ROOT, 'data/applications.md'))
  ? join(ROOT, 'data/applications.md')
  : join(ROOT, 'applications.md');

const DRY_RUN = process.argv.includes('--dry-run');
const args = process.argv.slice(2);
const minScoreIdx = args.indexOf('--min-score');
const MIN_SCORE = parseFloat(minScoreIdx !== -1 ? args[minScoreIdx + 1] : '4.0');

if (isNaN(MIN_SCORE) || MIN_SCORE < 0 || MIN_SCORE > 5) {
  console.error('ERROR: --min-score must be a number between 0 and 5.');
  process.exit(1);
}

if (!existsSync(APPS_FILE)) {
  console.error('ERROR: applications.md not found.');
  process.exit(1);
}

console.log(`\n🔍 Scanning applications.md (threshold: score >= ${MIN_SCORE})...\n`);

const content = readFileSync(APPS_FILE, 'utf-8');
const lines = content.split('\n');

let statusFixes = 0;
let scoreFixes = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.startsWith('|')) continue;

  const parts = line.split('|').map(s => s.trim());
  // Expected format: ['', '#', 'date', 'company', 'role', 'score', 'status', 'pdf', 'notes', '']
  if (parts.length < 9) continue;
  if (parts[1] === '#' || parts[1] === '---' || parts[1] === '') continue;
  if (isNaN(parseInt(parts[1]))) continue;

  const num = parts[1];
  let scoreRaw = parts[5];
  let status = parts[6];
  let changed = false;

  // Fix 1: Garbled scores — anything that isn't a valid number, "NA", or "unknown"
  const knownNonNumeric = ['na', 'unknown', ''];
  const isKnownNonNumeric = knownNonNumeric.includes(scoreRaw.toLowerCase());
  const isValidNumber = !isNaN(parseFloat(scoreRaw)) && isFinite(parseFloat(scoreRaw));

  if (!isKnownNonNumeric && !isValidNumber) {
    // Try to extract a clean number from the garbled string
    const extracted = scoreRaw.match(/\d+(\.\d+)?/)?.[0] ?? 'NA';
    const fixed = extracted !== '' ? extracted : 'NA';
    console.log(`  #${num}: garbled score "${scoreRaw}" → "${fixed}"`);
    parts[5] = fixed;
    scoreRaw = fixed;
    scoreFixes++;
    changed = true;
  }

  // Fix 2: Valid score >= MIN_SCORE but status is still SKIP → flip to Evaluated
  const score = parseFloat(parts[5]);
  if (!isNaN(score) && score >= MIN_SCORE && status === 'SKIP') {
    console.log(`  #${num}: score ${score} with status SKIP → Evaluated`);
    parts[6] = 'Evaluated';
    statusFixes++;
    changed = true;
  }

  if (changed) {
    lines[i] = '| ' + parts.slice(1, -1).join(' | ') + ' |';
  }
}

console.log(`\n📊 ${statusFixes} status fix(es)  (SKIP → Evaluated where score >= ${MIN_SCORE})`);
console.log(`📊 ${scoreFixes} score fix(es)   (garbled values cleaned)`);

if (DRY_RUN) {
  console.log('\n(dry-run — no changes written)');
} else if (statusFixes + scoreFixes > 0) {
  copyFileSync(APPS_FILE, APPS_FILE + '.bak');
  writeFileSync(APPS_FILE, lines.join('\n'), 'utf-8');
  console.log('\n✅ Written to applications.md (backup saved as applications.md.bak)');
} else {
  console.log('\n✅ No changes needed');
}
