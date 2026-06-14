#!/usr/bin/env node
/**
 * batch-phase2-gemini.mjs — Full evaluation batch runner for Phase 2
 * Wraps gemini-eval.mjs in a loop over batch-input-promoted.tsv
 * Fetches JD content via URL, saves to temp file, passes to gemini-eval.mjs
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { chromium } from 'playwright'; // 👈 Added Playwright

const ROOT      = dirname(fileURLToPath(import.meta.url));
const args      = process.argv.slice(2);
const inputFile = args[args.indexOf('--input')     + 1] ?? join(ROOT, 'batch', 'batch-input-promoted.tsv');
const stateFile = args[args.indexOf('--state')     + 1] ?? join(ROOT, 'batch', 'batch-state-phase2.tsv');
const delayMs   = parseInt(args[args.indexOf('--delay')      + 1] ?? '8000');
const startFrom = parseInt(args[args.indexOf('--start-from') + 1] ?? '0');

if (!existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

// Load state to skip already-completed IDs
const completedIds = new Set();
if (existsSync(stateFile)) {
  for (const line of readFileSync(stateFile, 'utf-8').trim().split('\n').slice(1)) {
    const [id, , status] = line.split('\t');
    if (status === 'completed') completedIds.add(id);
  }
}

const rows = readFileSync(inputFile, 'utf-8').trim().split('\n').slice(1)
  .map(l => { const [id, url, , notes] = l.split('\t'); return { id, url, notes }; })
  .filter(r => r.id && r.url && parseInt(r.id) >= startFrom && !completedIds.has(r.id));

console.log(`\n🚀 Phase 2 — Full Gemini evaluation`);
console.log(`   ${rows.length} roles to evaluate (${completedIds.size} already done)\n`);

const sleep = ms => new Promise(r => setTimeout(r, ms));

// 👈 Start Playwright BEFORE the loop starts
console.log('🌐 Launching Playwright browser...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

for (let i = 0; i < rows.length; i++) {
  const { id, url, notes } = rows[i];
  console.log(`\n[${i + 1}/${rows.length}] #${id} — ${notes?.slice(0, 60) ?? url}`);

  // 👈 Fetch the JD text using Playwright
  let jdText = '';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000); // Give JS time to load the JD
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    jdText = bodyText.trim().slice(0, 12000);
  } catch (err) {
    console.error(`❌ Could not fetch #${id}: ${err.message}`);
    continue;
  }

  if (!jdText || jdText.length < 200) {
    console.error(`❌ Empty/too short content for #${id} — skipping`);
    continue;
  }

  // Write to temp file and pass via --file flag
  const tmpFile = join(tmpdir(), `career-ops-jd-${id}.txt`);
  writeFileSync(tmpFile, jdText, 'utf-8');

  try {
    execFileSync(process.execPath, [join(ROOT, 'gemini-eval.mjs'), '--file', tmpFile], {
      cwd: ROOT,
      stdio: 'inherit',
      timeout: 120000,
    });
  } catch (err) {
    if (err.message?.includes('rate') || err.message?.includes('429')) {
      console.log('⏳ Rate limit hit — waiting 60s...');
      await sleep(60000);
    } else {
      console.error(`❌ Failed #${id}: ${err.message}`);
    }
    continue;
  }

  if (i < rows.length - 1) await sleep(delayMs);
}

// 👈 Close the browser when the loop finishes
await browser.close();
console.log('\n✅ Phase 2 complete! Run: node merge-tracker.mjs');