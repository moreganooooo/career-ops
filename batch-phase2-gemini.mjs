#!/usr/bin/env node
/**
 * batch-phase2-gemini.mjs — Full evaluation batch runner for Phase 2
 * Wraps gemini-eval.mjs in a loop over batch-input-promoted.tsv
 * Fetches JD content via URL, saves to temp file, passes to gemini-eval.mjs
 */

import { readFileSync, existsSync, writeFileSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { tmpdir } from 'os';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { chromium } from 'playwright';

const ROOT = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);

function getArgValue(flag, fallback) {
  const index = args.indexOf(flag);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
}

const DEFAULT_RPM = 15;
const DEFAULT_DELAY_MS = Math.ceil(60000 / DEFAULT_RPM) + 1000;

const inputFile = getArgValue('--input', join(ROOT, 'batch', 'batch-input-promoted.tsv'));
const stateFile = getArgValue('--state', join(ROOT, 'batch', 'batch-state-phase2.tsv'));
const delayMs = parseInt(getArgValue('--delay', String(DEFAULT_DELAY_MS)), 10);
const startFrom = parseInt(getArgValue('--start-from', '0'), 10);

if (!existsSync(inputFile)) {
  console.error(`❌ Input file not found: ${inputFile}`);
  process.exit(1);
}

const completedIds = new Set();
if (existsSync(stateFile)) {
  const stateText = readFileSync(stateFile, 'utf-8').trim();
  if (stateText) {
    for (const line of stateText.split('\n').slice(1)) {
      const [id, , status] = line.split('\t');
      if (status === 'completed') completedIds.add(id);
    }
  }
}

const rows = readFileSync(inputFile, 'utf-8').trim().split('\n').slice(1)
  .map(line => {
    const [id, url, source, notes] = line.split('\t');
    return { id, url, source, notes };
  })
  .filter(row => row.id && row.url && parseInt(row.id, 10) >= startFrom && !completedIds.has(row.id));

console.log(`\n🚀 Phase 2 — Full Gemini evaluation`);
console.log(`   ${rows.length} roles to evaluate (${completedIds.size} already done)`);
console.log(`   Default spacing: ${delayMs} ms (~${Math.round(60000 / delayMs)} RPM)\n`);

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Ensure state file has a header if it doesn't exist yet
if (!existsSync(stateFile)) {
  writeFileSync(stateFile, 'id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries\n', 'utf-8');
}

console.log('🌐 Launching Playwright browser...');
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

for (let i = 0; i < rows.length; i++) {
  const { id, url, source, notes } = rows[i];
  const fallbackCompany = notes?.trim() || source?.trim() || '';

  console.log(`\n[${i + 1}/${rows.length}] #${id} — ${fallbackCompany || url}`);

  let jdText = '';
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    jdText = bodyText
      .replace(/\r/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[-–—_=]{20,}/g, '')
      .trim()
      .slice(0, 12000);
  } catch (err) {
    console.error(`❌ Could not fetch #${id}: ${err.message}`);
    continue;
  }

  if (!jdText || jdText.length < 200) {
    console.error(`❌ Empty/too short content for #${id} — skipping`);
    continue;
  }

  const tmpFile = join(tmpdir(), `career-ops-jd-${id}.txt`);
  writeFileSync(tmpFile, jdText, 'utf-8');

  const evalArgs = [
    join(ROOT, 'gemini-eval.mjs'),
    '--file', tmpFile,
    '--quiet',
    '--company', fallbackCompany,
  ];

  let success = false;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const output = execFileSync(process.execPath, evalArgs, {
        cwd: ROOT,
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'pipe'],
        timeout: 120000,
      });

      if (output?.trim()) process.stdout.write(output);
      success = true;
      break;
    } catch (err) {
      const msg = [
        err.stdout?.toString?.() || '',
        err.stderr?.toString?.() || '',
        String(err.message || ''),
      ].join('\n');

      const lower = msg.toLowerCase();
      const isRateLimit =
        msg.includes('429') ||
        lower.includes('rate') ||
        lower.includes('quota') ||
        lower.includes('retry in') ||
        lower.includes('too many requests');

      if (isRateLimit && attempt < 3) {
        const waitMs = 60000;
        console.log(`⏳ Rate limit hit on #${id} — waiting ${waitMs / 1000}s before retry ${attempt + 1}/3...`);
        await sleep(waitMs);
      } else {
        if (msg.trim()) process.stderr.write(msg + '\n');
        console.error(`❌ Failed #${id}`);
        break;
      }
    }
  }

  if (!success) {
    continue;
  }

  // Mark this ID as completed in the state file so restarts skip it
  const now = new Date().toISOString();
  appendFileSync(stateFile, `${id}\t${url}\tcompleted\t${now}\t${now}\t-\t-\t-\t0\n`, 'utf-8');

  if (i < rows.length - 1) {
    await sleep(delayMs);
  }
}

await browser.close();
console.log('\n✅ Phase 2 complete! Run: node merge-tracker.mjs');
