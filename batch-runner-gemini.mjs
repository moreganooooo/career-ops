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

const modelName = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
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
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  fs.mkdirSync(TRACKER_DIR, { recursive: true });
  fs.mkdirSync(REPORTS_DIR, { recursive: true });

  if (!fs.existsSync(INPUT_FILE)) {
    console.error(`❌ batch/batch-input.tsv not found. Run scan.mjs first.`);
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

  const screenerContext = fs.readFileSync(path.join(ROOT, 'batch', 'screener-context.md'), 'utf-8');
  const screenPrompt    = fs.readFileSync(PROMPT_FILE, 'utf-8');

  // Ensure score_reason is requested early to avoid cutoff
  const systemPrompt = `You are a screening worker.
GOAL: Speed and efficiency.

CONTEXT:
${screenerContext}

METHODOLOGY:
${screenPrompt}

OUTPUT FORMAT:
Output ONLY the YAML block. No markdown. No preamble.
`;

  console.log('\n🌐 Launching Playwright browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
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
      const hardStopCompany = isCompanyHardStop(offer);
      if (hardStopCompany) {
        console.log(`⛔ Hard stop (${hardStopCompany}) — skipping`);
        updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), '-', '0.0', '-', retries);
        continue;
      }

      console.log(`🌐 Fetching JD...`);
      let jdText = await fetchJD(page, offer.url);
      if (!jdText || jdText.length < 100) throw new Error('Page body empty');

      // TRUNCATE to save tokens
      const MAX_JD_CHARS = 10000;
      if (jdText.length > MAX_JD_CHARS) {
        console.log(`✂️  Truncating JD from ${jdText.length} to ${MAX_JD_CHARS} chars`);
        jdText = jdText.slice(0, MAX_JD_CHARS) + '\n\n[...TRUNCATED...]';
      }

      console.log(`🤖 Screening with Gemini...`);
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: { temperature: 0.3, maxOutputTokens: 2048 }, // Increased tokens
      });

      const result = await model.generateContent([
        { text: systemPrompt },
        { text: `Evaluate this job.\nID: ${offer.id}\nURL: ${offer.url}\n\nJOB TEXT:\n${jdText}` },
      ]);

      const responseText = result.response.text();
      const yamlText = responseText.replace(/^```[^\n]*\n/gm, '').replace(/^```$/gm, '').trim();

      if (!yamlText || yamlText.length < 20) throw new Error('Empty response');

      // --- FIXED EXTRACTION ENGINE ---
      const extract = (key) => {
        // Capture everything until the next newline that starts a key (e.g., "\nkey:")
        const regex = new RegExp(`(?:^|\\n)\\s*${key}:\\s*["']?(.*?)(?=(?:\\n\\s*[a-z_0-9]+:\\s)|$)`, 'is');
        const m = yamlText.match(regex);
        // FIX: Extract group [1] safely, then clean trailing quotes
        return m && m[1] ? m[1].replace(/^["']|["']$/g, '').trim() : '';
      };

      const extractList = (key) => {
        const lines = yamlText.split('\n');
        let inTargetList = false;
        const results = [];

        for (const rawLine of lines) {
          const line = rawLine.trim();
          
          // 1. Did we find our target key?
          if (line.startsWith(`${key}:`)) {
            inTargetList = true;
            
            // Check for inline arrays (e.g., hard_stops: ['a', 'b'])
            const inlineMatch = line.match(/\[(.*?)\]/);
            if (inlineMatch) {
              return inlineMatch[1].split(',').map(s => s.replace(/['"]/g, '').trim()).filter(Boolean);
            }
            continue;
          }

          if (inTargetList) {
            // 2. Stop parsing if we hit the next YAML key (e.g., "soft_gaps:")
            if (/^[a-zA-Z0-9_]+:/.test(line)) break;

            // 3. Grab the list items (handles both "- item" and "1. item")
            if (line.startsWith('-') || /^\d+\./.test(line)) {
              const itemText = line.replace(/^(?:-|\d+\.)\s*/, '').replace(/['"]/g, '').trim();
              if (itemText) results.push(itemText);
            }
          }
        }
        return results;
      };

// 1. Updated extraction (using standard extract instead of extractList)
      const companyName  = extract('company')         || 'Unknown';
      const roleName     = extract('role')            || 'Unknown';
      const score        = extract('score')           || '3.0';
      const scoreReason  = extract('score_reason')    || extract('reason') || extract('risk_level') || '';
      const decision     = extract('final_decision')  || 'Consider';
      const hardStops    = extract('hard_stops');
      const softGaps     = extract('soft_gaps');
      const topStrengths = extract('top_strengths');

      const companySlug = companyName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      const reportFilename = `${reportNum}-${companySlug}-${dateStr}.md`;

      // 2. Updated reportContent (removed the array mapping)
      const reportContent = `# Screener: ${companyName} — ${roleName}
Date: ${dateStr}
Score: ${score}/5
Decision: ${decision}

Reasoning: ${scoreReason || 'None'}

Hard Stops: ${hardStops || 'None'}
Soft Gaps: ${softGaps || 'None'}
Strengths: ${topStrengths || 'None'}`;
      // Write Files
      fs.writeFileSync(path.join(REPORTS_DIR, reportFilename), reportContent, 'utf-8');
      
      const tsvLine = [String(parseInt(reportNum)), dateStr, companyName, roleName, (parseFloat(score)>=4?'Evaluated':'SKIP'), `${score}/5`, '❌', `[${reportNum}](reports/${reportFilename})`, decision].join('\t');
      fs.writeFileSync(path.join(TRACKER_DIR, `${offer.id}.tsv`), tsvLine + '\n', 'utf-8');

      updateState(offer.id, offer.url, 'completed', startedAt, new Date().toISOString(), reportNum, score, '-', retries);
      
      // 3. Your preferred terminal output!
      console.log(`✅ Done — Score: ${score} | ${roleName}`);
      console.log(`\n${reportContent}\n`);
      
      // Only sleep if this isn't the very last item in the queue
      if (i < toProcess.length - 1) {
        console.log(`⏳ Sleeping for 20 seconds before the next request...`);
        await new Promise(r => setTimeout(r, 20000));
      }

    } catch (err) {
      const errMsg = (err.message || '').toLowerCase();
      
      // DEBUG: Print the real error to help us see if it's "Daily" or "Minute"
      console.log(`\n🔍 API ERROR DETAIL: "${errMsg}"`);

      const isDaily = errMsg.includes('day') || errMsg.includes('daily');
      const isQuota = errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429');

      if (isDaily) {
        console.error(`\n⛔ DAILY QUOTA EXCEEDED. Stopping script to prevent infinite loop.`);
        process.exit(1); // Exit completely
      } 
      else if (isQuota) {
        console.warn(`\n⚠️  [Minute Rate Limit] Cooling down 70s...`);
        await new Promise(r => setTimeout(r, 90000));
        i--; // Retry
      } 
      else {
        console.error(`\n❌ Error #${offer.id}: ${err.message}`);
        updateState(offer.id, offer.url, 'failed', startedAt, new Date().toISOString(), reportNum, '-', err.message, retries + 1);
      }
    }
  }

  await browser.close();
  console.log('\n🏁 Batch finished.');
  
  // Merge step
  try {
    const { execFileSync } = await import('child_process');
    if (fs.existsSync('merge-tracker.mjs')) execFileSync('node', ['merge-tracker.mjs'], { stdio: 'inherit' });
  } catch (e) {}
}

main().catch(console.error);
