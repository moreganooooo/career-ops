#!/usr/bin/env node
/**
 * batch-runner-gemini.mjs — Gemini-powered batch screener for career-ops
 *
 * A free-tier alternative to batch-runner-custom.mjs (Haiku).
 * Identical logic, identical output format — only the AI provider changes.
 *
 * Usage:
 *   node batch-runner-gemini.mjs              # process all pending
 *   node batch-runner-gemini.mjs --limit 5   # test run, first 5 only
 *
 * Requires:
 *   GEMINI_API_KEY in .env (free key from https://aistudio.google.com/apikey)
 *
 * Model note (June 2026):
 *   gemini-2.5-flash       deprecates 2026-06-17 — bump to flash-lite after that
 *   gemini-2.5-flash-lite  deprecates 2026-07-22
 *   Override: GEMINI_MODEL=gemini-2.5-flash-lite node batch-runner-gemini.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { chromium } from 'playwright';
import dotenv from 'dotenv';
dotenv.config({ override: true });

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FILE  = path.join(ROOT, 'batch', 'batch-input.tsv');
const STATE_FILE  = path.join(ROOT, 'batch', 'batch-gemini-state.tsv'); // separate state so original is untouched
const PROMPT_FILE = path.join(ROOT, 'batch', 'screen-prompt.md');
const TRACKER_DIR = path.join(ROOT, 'batch', 'tracker-additions');
const REPORTS_DIR = path.join(ROOT, 'reports');

// ---------------------------------------------------------------------------
// Validate environment
// ---------------------------------------------------------------------------
const geminiKey = process.env.GEMINI_API_KEY;
if (!geminiKey) {
  console.error(`
❌  GEMINI_API_KEY not found.

   1. Get a free key at https://aistudio.google.com/apikey
   2. Add it to .env:   GEMINI_API_KEY=your_key_here
`);
  process.exit(1);
}

const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const genAI = new GoogleGenerativeAI(geminiKey);

// ---------------------------------------------------------------------------
// Helpers (identical to batch-runner-custom.mjs)
// ---------------------------------------------------------------------------
function getNextReportNumber() {
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    return '001';
  }
  const files = fs.readdirSync(REPORTS_DIR)
    .filter(f => /^\d{3}-/.test(f))
    .map(f => parseInt(f.slice(0, 3)))
    .filter(n => !isNaN(n));
  if (files.length === 0) return '001';
  return String(Math.max(...files) + 1).padStart(3, '0');
}

async function fetchJD(page, url) {
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2000);
    const bodyText = await page.evaluate(() => document.body?.innerText ?? '');
    return bodyText.trim();
  } catch (err) {
    throw new Error(`Navigation failed: ${err.message}`);
  }
}

function updateState(id, url, status, startedAt, completedAt, reportNum, score, error, retries) {
  const lines = fs.existsSync(STATE_FILE)
    ? fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n')
    : [];
  const newLines = [];
  let found = false;

  if (lines.length === 0) {
    newLines.push('id\turl\tstatus\tstarted_at\tcompleted_at\treport_num\tscore\terror\tretries');
  } else {
    newLines.push(lines[0]);
  }

  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts[0] === id) {
      newLines.push(`${id}\t${url}\t${status}\t${startedAt}\t${completedAt}\t${reportNum}\t${score}\t${error}\t${retries}`);
      found = true;
    } else {
      newLines.push(line);
    }
  }

  if (!found) {
    newLines.push(`${id}\t${url}\t${status}\t${startedAt}\t${completedAt}\t${reportNum}\t${score}\t${error}\t${retries}`);
  }

  fs.writeFileSync(STATE_FILE, newLines.join('\n') + '\n', 'utf-8');
}

function getRetries(id) {
  if (!fs.existsSync(STATE_FILE)) return 0;
  const lines = fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n');
  for (const line of lines.slice(1)) {
    const parts = line.split('\t');
    if (parts[0] === id) return parseInt(parts[8]) || 0;
  }
  return 0;
}

const COMPANY_HARD_STOPS = new Set([
  'openai',
  'notion',
]);

function isCompanyHardStop(offer) {
  const haystack = `${(offer.notes || '').toLowerCase()} ${(offer.url || '').toLowerCase()}`;
  for (const slug of COMPANY_HARD_STOPS) {
    if (haystack.includes(slug)) return slug;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(TRACKER_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌  batch/batch-input.tsv not found. Run scan.mjs first to populate it.`);
    process.exit(1);
  }

  const offers = fs.readFileSync(INPUT_FILE, 'utf-8').trim().split('\n').slice(1)
    .map(line => { const p = line.split('\t'); return { id: p[0], url: p[1], source: p[2], notes: p[3] }; })
    .filter(o => o.id && o.url);

  const completedIds = new Set();
  if (fs.existsSync(STATE_FILE)) {
    fs.readFileSync(STATE_FILE, 'utf-8').trim().split('\n').slice(1).forEach(line => {
      const parts = line.split('\t');
      if (parts[2] === 'completed') completedIds.add(parts[0]);
    });
  }

  const limitIdx = process.argv.indexOf('--limit');
  const limit = limitIdx !== -1 ? parseInt(process.argv[limitIdx + 1], 10) : null;

  let toProcess = offers.filter(o => !completedIds.has(o.id));
  if (limit) {
    console.log(`⚠️  Limit: processing first ${limit} pending offers`);
    toProcess = toProcess.slice(0, limit);
  }

  console.log(`\n📋 Total: ${offers.length} | Completed: ${completedIds.size} | To run: ${toProcess.length}`);
  console.log(`🤖 Model: ${modelName}`);
  if (toProcess.length === 0) { console.log('✅ Nothing to process!'); return; }

  const screenerContext = fs.readFileSync(path.join(ROOT, 'batch', 'screener-context.md'), 'utf-8');
  const screenPrompt    = fs.readFileSync(PROMPT_FILE, 'utf-8');

  const systemPrompt = `You are a screening worker for career-ops.
Your goal is speed and efficiency to process roles.

═══════════════════════════════════════════════════════
CANDIDATE CONTEXT (critical reframes + background)
═══════════════════════════════════════════════════════
${screenerContext}

═══════════════════════════════════════════════════════
SCREENING METHODOLOGY
═══════════════════════════════════════════════════════
${screenPrompt}

OUTPUT FORMAT — IMPORTANT OVERRIDE
Follow the output instructions from the screening methodology above EXACTLY.
Output ONLY the YAML block. No markdown report. No summary. No extra text.
The YAML must begin with the very first character of your response (no preamble).`;

  console.log('\n🌐 Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();

  for (let i = 0; i < toProcess.length; i++) {
    const offer     = toProcess[i];
    const startedAt = new Date().toISOString();
    const retries   = getRetries(offer.id);
    const reportNum = getNextReportNumber();
    const dateStr   = new Date().toISOString().split('T')[0];

    console.log(`\n──────────────────────────────────────────────────`);
    console.log(`[${i + 1}/${toProcess.length}] #${offer.id}: ${offer.notes || offer.url}`);

    try {
      // Zero-cost skip for known in-office companies
      const hardStopCompany = isCompanyHardStop(offer);
      if (hardStopCompany) {
        console.log(`⛔ Hard stop (${hardStopCompany}) — skipping without API call`);
        updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), '-', '0.0', '-', retries);
        console.log(`✅ Skipped (no credits used)`);
        continue;
      }

      console.log(`🌐 Fetching JD...`);
      const jdText = await fetchJD(page, offer.url);
      if (!jdText || jdText.length < 100) throw new Error('Page body empty or too short');

      console.log(`🤖 Screening with Gemini (${modelName})...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.3, maxOutputTokens: 1024 },
      });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `Evaluate this job.\nID: ${offer.id}\nURL: ${offer.url}\nREPORT_NUM: ${reportNum}\nDATE: ${dateStr}\n\nJOB DESCRIPTION:\n${jdText}` },
      ]);

      const responseText = result.response.text();

      // Strip markdown code fences that Gemini sometimes adds
      const yamlText = responseText
        .replace(/^```[^\n]*\n/gm, '')
        .replace(/^```$/gm, '')
        .trim();

      if (!yamlText || yamlText.length < 20) {
        console.warn('⚠️  Empty or too-short response:\n', responseText.slice(0, 200));
        throw new Error('Empty response from model');
      }

      // Parse key fields from YAML using regex (no YAML lib needed)
      const extract = (key) => {
        const m = yamlText.match(new RegExp(`${key}:\\s*["']?([^"'\n\\[]+)["']?`));
        return m ? m[1].trim() : '';
      };
      const extractList = (key) => {
        const m = yamlText.match(new RegExp(`${key}:\\s*\\[([^\\]]*)\\]`, 's'));
        if (!m) return [];
        return m[1].split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
      };
      
      const scoreReason = (() => {
      const m = yamlText.match(/score_reason:\s*["']?(.+?)["']?\s*$/m);
      return m ? m[1].trim().replace(/^["']|["']$/g, '') : '';
      })();
      
      const companyName  = extract('company')         || 'Unknown';
      const roleName     = extract('role')            || 'Unknown';
      const score        = extract('score')           || '3.0';
      const archetype    = extract('archetype')       || 'Unknown';
      const decision     = extract('final_decision')  || 'Consider';
      const legitimacy   = extract('legitimacy_tier') || 'High Confidence';
      const hardStops    = extractList('hard_stops');
      const softGaps     = extractList('soft_gaps');
      const topStrengths = extractList('top_strengths');

      const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const status = parseFloat(score) >= 4.0 ? 'Evaluated' : 'SKIP';

      const reportContent = `# Screener: ${companyName} — ${roleName}

**Date:** ${dateStr}
**Score:** ${score}/5
**Archetype:** ${archetype}
**Decision:** ${decision}
**Legitimacy:** ${legitimacy}
**URL:** ${offer.url}
**PDF:** ❌
**Verification:** unconfirmed (batch screener)
**Tool:** Gemini (${modelName})

---

## Hard Stops
${hardStops.length ? hardStops.map(s => `- ${s}`).join('\n') : '- None'}

## Soft Gaps
${softGaps.length ? softGaps.map(s => `- ${s}`).join('\n') : '- None'}

## Top Strengths
${topStrengths.length ? topStrengths.map(s => `- ${s}`).join('\n') : '- See CV for details'}

---

*Lightweight Gemini screen — run \`/career-ops oferta\` for full A–F evaluation.*

## Machine Summary
\`\`\`yaml
company: "${companyName}"
role: "${roleName}"
score: ${score}
archetype: "${archetype}"
decision: "${decision}"
legitimacy: "${legitimacy}"
\`\`\`
`;

      const tsvLine = [
        String(parseInt(reportNum, 10)),
        dateStr,
        companyName,
        roleName,
        status,
        `${score}/5`,
        '❌',
        `[${reportNum}](reports/${reportNum}-${companySlug}-${dateStr}.md)`,
        decision === 'Apply' ? `Score ${score} — apply` : `Score ${score} — ${decision.toLowerCase()}`,
      ].join('\t');

      const reportFilename = `${reportNum}-${companySlug}-${dateStr}.md`;
      fs.writeFileSync(path.join(REPORTS_DIR, reportFilename), reportContent, 'utf-8');
      console.log(`📝 Report: reports/${reportFilename}`);

      fs.writeFileSync(path.join(TRACKER_DIR, `${offer.id}.tsv`), tsvLine + '\n', 'utf-8');
      console.log(`📊 Tracker: batch/tracker-additions/${offer.id}.tsv`);

      updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), reportNum, score, '-', retries);
      console.log(`✅ Done — Score: ${score}/5 | ${roleName} @ ${companyName}`);
      if (scoreReason) console.log(`   💬 ${scoreReason}`);

      // Gemini free tier: be a little more generous with pauses than Haiku
      await new Promise(r => setTimeout(r, 3000));

    } catch (err) {
      const msg = (err.message || '').includes('quota') || (err.message || '').includes('rate')
        ? `Rate limit hit — waiting 60s before continuing...`
        : err.message;

      console.error(`❌ Failed #${offer.id}: ${msg}`);

      if (msg.includes('Rate limit')) {
        await new Promise(r => setTimeout(r, 60000));
      }

      updateState(offer.id, offer.url, 'failed', startedAt, new Date().toISOString(), reportNum, '-', err.message, retries + 1);
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  await browser.close();
  console.log('\n🏁 Done! Merging results...');

  try {
    const { execFileSync } = await import('child_process');
    execFileSync('node', ['merge-tracker.mjs'], { stdio: 'inherit' });
    execFileSync('node', ['verify-pipeline.mjs'], { stdio: 'inherit' });
  } catch (err) {
    console.error('⚠️  Merge/verify error:', err.message);
  }
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });