#!/usr/bin/env node
/**
 * populate-batch.mjs — reads new entries from data/pipeline.md
 * and appends any not already in batch/batch-input.tsv
 */
import fs from 'fs';

const PIPELINE  = 'data/pipeline.md';
const BATCH_IN  = 'batch/batch-input.tsv';

const pipeline  = fs.readFileSync(PIPELINE, 'utf-8');
const batchText = fs.readFileSync(BATCH_IN, 'utf-8');

// Get highest existing ID
const existingIds = batchText.trim().split('\n').slice(1)
  .map(l => parseInt(l.split('\t')[0]))
  .filter(n => !isNaN(n));
let nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;

// Get existing URLs to avoid dupes
const existingUrls = new Set(
  batchText.trim().split('\n').slice(1).map(l => l.split('\t')[1])
);

// Parse pipeline.md checkbox lines: - [ ] URL | Company | Title
const newRows = [];
for (const match of pipeline.matchAll(/- \[ \] (https?:\/\/\S+) \| ([^|]+) \| (.+)/g)) {
  const [, url, company, title] = match;
  if (existingUrls.has(url.trim())) continue;
  newRows.push(`${nextId++}\t${url.trim()}\tPipeline\t${company.trim()} - ${title.trim()}`);
}

if (newRows.length === 0) {
  console.log('✅ No new jobs to add — batch-input.tsv is up to date.');
} else {
  fs.appendFileSync(BATCH_IN, newRows.join('\n') + '\n', 'utf-8');
  console.log(`✅ Added ${newRows.length} new job(s) to batch/batch-input.tsv`);
}