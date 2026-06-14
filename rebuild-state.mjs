#!/usr/bin/env node
/**
 * rebuild-state.mjs — Rebuild batch-state.tsv from merged tracker TSVs
 * Maps report numbers back to IDs/URLs via batch-input.tsv
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT      = dirname(fileURLToPath(import.meta.url));
const BATCH_DIR = join(ROOT, 'batch');
const MERGED    = join(BATCH_DIR, 'tracker-additions', 'merged');

// Load batch-input.tsv → map id → { url, source, notes }
const inputLines = readFileSync(join(BATCH_DIR, 'batch-input.tsv'), 'utf-8').trim().split('\n').slice(1);
const inputById  = new Map();
for (const line of inputLines) {
  const [id, url, source, notes] = line.split('\t');
  if (id) inputById.set(id, { url, source, notes });
}

// Read all merged TSVs
const files = readdirSync(MERGED)
  .filter(f => f.endsWith('.tsv'))
  .sort((a, b) => parseInt(a) - parseInt(b));

// batch-state columns: id url status started_at completed_at report_num score error retries
const rows = ['id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries'];
let matched = 0; let unmatched = 0;

for (const file of files) {
  const id = file.replace('.tsv', '');
  const content = readFileSync(join(MERGED, file), 'utf-8').trim();
  const parts = content.split('\t');
  if (parts.length < 7) { unmatched++; continue; }

  const reportNum = parts[0];
  const scoreRaw  = parts[5]; // e.g. "0.5/5"
  const score     = parseFloat(scoreRaw) || 0;
  const input     = inputById.get(id);

  if (!input) { unmatched++; continue; }

  rows.push([
    id,
    input.url,
    'completed',
    '2026-06-12T00:00:00.000Z',  // approximate
    '2026-06-12T00:00:00.000Z',
    reportNum,
    score,
    '-',
    '0'
  ].join('\t'));
  matched++;
}

writeFileSync(join(BATCH_DIR, 'batch-state.tsv'), rows.join('\n') + '\n', 'utf-8');
console.log(`✅ Rebuilt batch-state.tsv: ${matched} matched, ${unmatched} unmatched`);
console.log(`   Run: node promote-screened.mjs --min-score 3.5`);