#!/usr/bin/env node
/**
 * list-scores.mjs — Print all jobs above a score threshold from applications.md
 *
 * Usage:
 *   node list-scores.mjs            # 3.5+ (default)
 *   node list-scores.mjs 4.0        # 4.0+
 *   node list-scores.mjs 4.5        # 4.5+
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const threshold = parseFloat(process.argv[2] ?? '3.5');

if (isNaN(threshold)) {
  console.error('Usage: node list-scores.mjs [min-score]');
  process.exit(1);
}

const file = join(ROOT, 'data', 'applications.md');
if (!existsSync(file)) {
  console.error('ERROR: data/applications.md not found.');
  process.exit(1);
}

const lines = readFileSync(file, 'utf-8').split('\n');
const results = [];

for (const line of lines) {
  if (!/^\|\s*\d+/.test(line)) continue;
  const cols = line.split('|').map(c => c.trim());
  if (cols.length < 7) continue;

  const num     = cols[1];
  const company = cols[3];
  const role    = cols[4];
  const raw     = cols[5].replace('/5', '').trim();
  const score   = parseFloat(raw);

  if (!isNaN(score) && score >= threshold) {
    results.push({ score, num: parseInt(num), company, role });
  }
}

results.sort((a, b) => b.score - a.score || a.num - b.num);

if (results.length === 0) {
  console.log(`No jobs found with score >= ${threshold}`);
  process.exit(0);
}

const pad = (str, len) => String(str).slice(0, len).padEnd(len);

console.log(`\nJobs scoring >= ${threshold} — ${results.length} total\n`);
console.log(`${'Score'.padEnd(7)} ${'#'.padEnd(6)} ${'Company'.padEnd(42)} Role`);
console.log('─'.repeat(110));

for (const { score, num, company, role } of results) {
  console.log(`${String(score).padEnd(7)} #${String(num).padEnd(5)} ${pad(company, 42)} ${role}`);
}

console.log('');
