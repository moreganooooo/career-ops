#!/usr/bin/env node
/**
 * merge-tracker.mjs — Merge batch tracker additions into applications.md
 *
 * Handles multiple TSV formats:
 * - 9-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport\tnotes
 * - 8-col: num\tdate\tcompany\trole\tstatus\tscore\tpdf\treport (no notes)
 * - Pipe-delimited (markdown table row): | col | col | ... |
 *
 * Dedup: company normalized + role fuzzy match + report number match
 * If duplicate with higher score → update in-place, update report link
 * Validates status against states.yml (rejects non-canonical, logs warning)
 *
 * Run: node career-ops/merge-tracker.mjs [--dry-run] [--verify]
 */

import {
  readFileSync,
  writeFileSync,
  readdirSync,
  mkdirSync,
  renameSync,
  existsSync,
} from 'fs';
import { join, basename, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execFileSync } from 'child_process';
import { normalizeReportLink as normalizeLink } from './tracker-links.mjs';

const CAREER_OPS = dirname(fileURLToPath(import.meta.url));

// Support both layouts: data/applications.md (boilerplate) and applications.md (original).
// CAREER_OPS_TRACKER overrides the path (used by tests and non-standard layouts).
const APPS_FILE = process.env.CAREER_OPS_TRACKER
  ? process.env.CAREER_OPS_TRACKER
  : existsSync(join(CAREER_OPS, 'data/applications.md'))
    ? join(CAREER_OPS, 'data/applications.md')
    : join(CAREER_OPS, 'applications.md');

const TRACKER_DIR = dirname(APPS_FILE);

// CAREER_OPS_ADDITIONS overrides the additions dir (used by tests, mirrors CAREER_OPS_TRACKER).
const ADDITIONS_DIR = process.env.CAREER_OPS_ADDITIONS
  ? process.env.CAREER_OPS_ADDITIONS
  : join(CAREER_OPS, 'batch/tracker-additions');

const MERGED_DIR = join(ADDITIONS_DIR, 'merged');
const DRY_RUN = process.argv.includes('--dry-run');
const VERIFY = process.argv.includes('--verify');
const MIGRATE = process.argv.includes('--migrate');

// The reports/ dir sits at the repo root, which is the tracker's parent in the
// data/ layout (data/applications.md) and the tracker's own dir at root layout.
const REPORTS_ROOT = basename(TRACKER_DIR) === 'data' ? dirname(TRACKER_DIR) : TRACKER_DIR;

// Normalize a report link relative to the tracker file's own directory (#760).
const normalizeReportLink = (reportField) =>
  normalizeLink(reportField, TRACKER_DIR, REPORTS_ROOT);

// Ensure required directories exist (fresh setup)
mkdirSync(join(CAREER_OPS, 'data'), { recursive: true });
mkdirSync(ADDITIONS_DIR, { recursive: true });

// Canonical states and aliases
const CANONICAL_STATES = [
  'Evaluated',
  'Applied',
  'Responded',
  'Interview',
  'Offer',
  'Rejected',
  'Discarded',
  'SKIP',
];

function validateStatus(status) {
  const clean = String(status ?? '')
    .replace(/\*\*/g, '')
    .replace(/\s+\d{4}-\d{2}-\d{2}.*$/, '')
    .trim();

  const lower = clean.toLowerCase();

  for (const valid of CANONICAL_STATES) {
    if (valid.toLowerCase() === lower) return valid;
  }

  const aliases = {
    evaluada: 'Evaluated',
    condicional: 'Evaluated',
    hold: 'Evaluated',
    evaluar: 'Evaluated',
    verificar: 'Evaluated',
    aplicado: 'Applied',
    enviada: 'Applied',
    aplicada: 'Applied',
    applied: 'Applied',
    sent: 'Applied',
    respondido: 'Responded',
    entrevista: 'Interview',
    offer: 'Offer',
    rechazado: 'Rejected',
    rechazada: 'Rejected',
    descartado: 'Discarded',
    descartada: 'Discarded',
    cerrada: 'Discarded',
    cancelada: 'Discarded',
    'no aplicar': 'SKIP',
    no_aplicar: 'SKIP',
    skip: 'SKIP',
    monitor: 'SKIP',
    'geo blocker': 'SKIP',
  };

  if (aliases[lower]) return aliases[lower];

  if (/^(duplicado|dup|repost)/i.test(lower)) return 'Discarded';

  console.warn(`⚠️  Non-canonical status "${status}" → defaulting to "Evaluated"`);
  return 'Evaluated';
}

function normalizeCompany(name) {
  return String(name ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Tokens that almost every role shares — must NOT count as signal.
const ROLE_STOPWORDS = new Set([
  'junior', 'mid', 'middle', 'senior', 'staff', 'principal', 'lead', 'head',
  'chief', 'associate', 'intern', 'entry', 'level',
  'remote', 'hybrid', 'onsite', 'contract', 'contractor', 'freelance',
  'fulltime', 'parttime', 'permanent', 'temporary', 'internship',
  'role', 'position', 'opportunity', 'team', 'based',
  'bangalore', 'bengaluru', 'mumbai', 'delhi', 'hyderabad', 'pune', 'chennai',
  'london', 'berlin', 'paris', 'madrid', 'barcelona', 'amsterdam', 'dublin',
  'york', 'francisco', 'seattle', 'boston', 'austin', 'chicago', 'toronto',
  'tokyo', 'singapore', 'sydney', 'melbourne', 'lisbon', 'warsaw',
  'europe', 'emea', 'apac', 'latam', 'americas', 'india', 'spain', 'germany',
  'france', 'italy', 'canada', 'brazil', 'mexico', 'japan',
  'with', 'from', 'into', 'over', 'this', 'that',
]);

const SHORT_SPECIALTY = new Set([
  'api', 'sre', 'sdk', 'cli', 'gpu', 'cpu',
  'ios', 'qa', 'ux', 'ui', 'ar', 'vr',
  'ocr', 'crm', 'erp',
]);

const BASELINE_TOKENS = new Set([
  'software', 'engineer', 'developer', 'manager', 'architect',
  'analyst', 'designer', 'consultant', 'specialist',
  'platform', 'systems', 'services',
  'backend', 'frontend', 'fullstack',
]);

function roleTokens(s) {
  return String(s ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => (w.length > 3 || SHORT_SPECIALTY.has(w)) && !ROLE_STOPWORDS.has(w));
}

function roleFuzzyMatch(a, b) {
  const wordsA = roleTokens(a);
  const wordsB = roleTokens(b);

  if (wordsA.length === 0 || wordsB.length === 0) return false;

  const setB = new Set(wordsB);
  const overlap = wordsA.filter(w => setB.has(w));

  if (overlap.length < 2) return false;

  const discriminating = overlap.filter(w => !BASELINE_TOKENS.has(w));
  if (discriminating.length === 0) return false;

  const union = new Set([...wordsA, ...wordsB]).size;
  const ratio = overlap.length / union;
  return ratio >= 0.6;
}

function extractReportNum(reportStr) {
  const m = String(reportStr ?? '').match(/\[(\d+)\]/);
  return m ? parseInt(m[1], 10) : null;
}

function parseScore(s) {
  const m = String(s ?? '').replace(/\*\*/g, '').match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : 0;
}

function parseScoreOrNull(s) {
  const m = String(s ?? '').replace(/\*\*/g, '').trim().match(/([\d.]+)/);
  return m ? parseFloat(m[1]) : null;
}

function isMissingValue(value) {
  const v = String(value ?? '').trim().toLowerCase();
  return !v || [
    'unknown',
    'n/a',
    '?',
    'none',
    'null',
    'undefined',
    '(calculated at end)',
    'calculated at end',
    'see below',
    'to be determined',
    'tbd',
  ].includes(v);
}

function appendNote(existing, addition) {
  const base = String(existing ?? '').trim();
  const next = String(addition ?? '').trim();

  if (!next) return base;
  if (!base) return next;
  if (base.includes(next)) return base;

  return `${base} | ${next}`;
}

function parseAppLine(line) {
  const parts = line.split('|').map(s => s.trim());
  if (parts.length < 9) return null;

  const num = parseInt(parts[1], 10);
  if (isNaN(num) || num === 0) return null;

  return {
    num,
    date: parts[2],
    company: parts[3],
    role: parts[4],
    score: parts[5],
    status: parts[6],
    pdf: parts[7],
    report: parts[8],
    notes: parts[9] || '',
    raw: line,
  };
}

/**
 * Parse a TSV file content into a structured addition object.
 * Handles: 9-col TSV, 8-col TSV, pipe-delimited markdown.
 */
function parseTsvContent(content, filename) {
  content = String(content ?? '').trim();
  if (!content) return null;

  let parts;
  let addition;

  if (content.startsWith('|')) {
    parts = content.split('|').map(s => s.trim()).filter(Boolean);

    if (parts.length < 8) {
      console.warn(`⚠️  Skipping malformed pipe-delimited ${filename}: ${parts.length} fields`);
      return null;
    }

    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      score: parts[4],
      status: validateStatus(parts[5]),
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  } else {
    parts = content.split('\t');

    if (parts.length < 8) {
      console.warn(`⚠️  Skipping malformed TSV ${filename}: ${parts.length} fields`);
      return null;
    }

    const col4 = parts[4].trim();
    const col5 = parts[5].trim();

    const col4LooksLikeScore =
      /^\d+\.?\d*\/5$/.test(col4) || col4 === 'N/A' || col4 === 'DUP' || col4 === '?';

    const col5LooksLikeScore =
      /^\d+\.?\d*\/5$/.test(col5) || col5 === 'N/A' || col5 === 'DUP' || col5 === '?';

    const col4LooksLikeStatus =
      /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip|evaluada|aplicado|respondido|entrevista|rechazado|descartado|no aplicar|cerrada|duplicado|repost|condicional|hold|monitor)/i.test(col4);

    const col5LooksLikeStatus =
      /^(evaluated|applied|responded|interview|offer|rejected|discarded|skip|evaluada|aplicado|respondido|entrevista|rechazado|descartado|no aplicar|cerrada|duplicado|repost|condicional|hold|monitor)/i.test(col5);

    let statusCol;
    let scoreCol;

    if (col4LooksLikeStatus && !col4LooksLikeScore) {
      statusCol = col4;
      scoreCol = col5;
    } else if (col4LooksLikeScore && col5LooksLikeStatus) {
      statusCol = col5;
      scoreCol = col4;
    } else if (col5LooksLikeScore && !col4LooksLikeScore) {
      statusCol = col4;
      scoreCol = col5;
    } else {
      statusCol = col4;
      scoreCol = col5;
    }

    addition = {
      num: parseInt(parts[0], 10),
      date: parts[1],
      company: parts[2],
      role: parts[3],
      status: validateStatus(statusCol),
      score: scoreCol,
      pdf: parts[6],
      report: parts[7],
      notes: parts[8] || '',
    };
  }

  if (isNaN(addition.num) || addition.num === 0) {
    console.warn(`⚠️  Skipping ${filename}: invalid entry number`);
    return null;
  }

  return addition;
}

// ---- Main ----

if (!existsSync(APPS_FILE)) {
  console.log('No applications.md found. Nothing to merge into.');
  process.exit(0);
}

const appContent = readFileSync(APPS_FILE, 'utf-8');

// One-time migration: rewrite existing report links so they resolve relative
// to the tracker file's directory (see #760).
if (MIGRATE) {
  const migrated = appContent
    .split('\n')
    .map(line => (line.startsWith('|') ? normalizeReportLink(line) : line));

  const before = appContent.split('\n');
  const changed = migrated.filter((l, i) => l !== before[i]).length;

  if (DRY_RUN) {
    console.log(`🔎 Migration (dry-run): ${changed} row(s) would be rewritten in ${basename(APPS_FILE)}`);
  } else {
    writeFileSync(APPS_FILE, migrated.join('\n'));
    console.log(
      `✅ Migration: rewrote ${changed} report link(s) in ${basename(APPS_FILE)} relative to ${TRACKER_DIR === CAREER_OPS ? 'repo root' : 'data/'}`
    );
  }

  process.exit(0);
}

const appLines = appContent.split('\n');
const existingApps = [];
let maxNum = 0;

for (const line of appLines) {
  if (line.startsWith('|') && !line.includes('---') && !line.includes('Empresa')) {
    const app = parseAppLine(line);
    if (app) {
      existingApps.push(app);
      if (app.num > maxNum) maxNum = app.num;
    }
  }
}

console.log(`📊 Existing: ${existingApps.length} entries, max #${maxNum}`);

if (!existsSync(ADDITIONS_DIR)) {
  console.log('No tracker-additions directory found.');
  process.exit(0);
}

const tsvFiles = readdirSync(ADDITIONS_DIR).filter(f => f.endsWith('.tsv'));

if (tsvFiles.length === 0) {
  console.log('✅ No pending additions to merge.');
  process.exit(0);
}

tsvFiles.sort((a, b) => {
  const numA = parseInt(a.replace(/\D/g, ''), 10) || 0;
  const numB = parseInt(b.replace(/\D/g, ''), 10) || 0;
  return numA - numB;
});

console.log(`📥 Found ${tsvFiles.length} pending additions`);

let added = 0;
let updated = 0;
let rescored = 0;
let skipped = 0;
const newLines = [];

for (const file of tsvFiles) {
  const content = readFileSync(join(ADDITIONS_DIR, file), 'utf-8').trim();
  const addition = parseTsvContent(content, file);

  if (!addition) {
    skipped++;
    continue;
  }

  addition.report = normalizeReportLink(addition.report);

  // Check for duplicate by:
  // 1. Exact report number match
  // 2. Exact entry number match with same company
  // 3. Company + role fuzzy match
  const reportNum = extractReportNum(addition.report);
  let duplicate = null;

  if (reportNum) {
    duplicate = existingApps.find(app => {
      const existingReportNum = extractReportNum(app.report);
      return existingReportNum === reportNum;
    });
  }

  if (!duplicate) {
    const normCompany = normalizeCompany(addition.company);
    duplicate = existingApps.find(app =>
      app.num === addition.num && normalizeCompany(app.company) === normCompany
    );
  }

  if (!duplicate) {
    const normCompany = normalizeCompany(addition.company);
    duplicate = existingApps.find(app => {
      if (normalizeCompany(app.company) !== normCompany) return false;
      return roleFuzzyMatch(addition.role, app.role);
    });
  }

  if (duplicate) {
    const oldScore = parseScoreOrNull(duplicate.score);
    const newScore = parseScoreOrNull(addition.score);
    const today = addition.date || duplicate.date;

    const lineIdx = appLines.indexOf(duplicate.raw);
    if (lineIdx < 0) {
      console.warn(`⚠️  Could not locate existing row for #${duplicate.num} ${duplicate.company}`);
      skipped++;
      continue;
    }

    let finalDate = duplicate.date;
    let finalCompany = duplicate.company;
    let finalRole = duplicate.role;
    let finalScore = duplicate.score;
    let finalStatus = duplicate.status;
    let finalPdf = duplicate.pdf;
    let finalReport = duplicate.report;
    let finalNotes = duplicate.notes || '';

    let changed = false;
    let onlyRescoreNote = false;
    const changeNotes = [];

    // Repair obviously bad metadata
    if (isMissingValue(finalCompany) && !isMissingValue(addition.company)) {
      finalCompany = addition.company;
      changed = true;
      changeNotes.push(`company repaired on ${today}`);
    }

    if (isMissingValue(finalRole) && !isMissingValue(addition.role)) {
      finalRole = addition.role;
      changed = true;
      changeNotes.push(`role repaired on ${today}`);
    }

    if ((isMissingValue(finalReport) || !extractReportNum(finalReport)) && !isMissingValue(addition.report)) {
      finalReport = addition.report;
      changed = true;
      changeNotes.push(`report link repaired on ${today}`);
    }

    if ((isMissingValue(finalPdf) || finalPdf === '❌') && addition.pdf === '✅') {
      finalPdf = addition.pdf;
      changed = true;
      changeNotes.push(`PDF updated on ${today}`);
    }

    if (isMissingValue(finalStatus) && !isMissingValue(addition.status)) {
      finalStatus = addition.status;
      changed = true;
      changeNotes.push(`status repaired to ${addition.status} on ${today}`);
    }

    // Score logic
    if (oldScore === null && newScore !== null) {
      finalScore = addition.score;
      finalDate = addition.date || finalDate;
      changed = true;
      changeNotes.push(`score repaired to ${addition.score} on ${today}`);
    } else if (oldScore !== null && newScore !== null) {
      if (newScore > oldScore) {
        finalScore = addition.score;
        finalDate = addition.date || finalDate;
        changed = true;
        changeNotes.push(`rescored from ${duplicate.score} to ${addition.score} on ${today}`);
      } else if (newScore < oldScore) {
        finalNotes = appendNote(
          finalNotes,
          `rescored ${addition.score} on ${today}; kept existing ${duplicate.score}`
        );
        onlyRescoreNote = true;
      } else {
        finalNotes = appendNote(
          finalNotes,
          `rescored ${addition.score} on ${today}; unchanged`
        );
        onlyRescoreNote = true;
      }
    } else if (oldScore === null && newScore === null) {
      finalNotes = appendNote(finalNotes, `rerun on ${today} still produced invalid score`);
    }

    // Notes merge
    if (isMissingValue(finalNotes) && !isMissingValue(addition.notes)) {
      finalNotes = addition.notes;
      changed = true;
    } else if (!isMissingValue(addition.notes) && addition.notes !== duplicate.notes) {
      finalNotes = appendNote(finalNotes, addition.notes);
    }

    if (changeNotes.length > 0) {
      finalNotes = appendNote(finalNotes, changeNotes.join('; '));
    }

    const updatedLine =
      `| ${duplicate.num} | ${finalDate} | ${finalCompany} | ${finalRole} | ${finalScore} | ${finalStatus} | ${finalPdf} | ${finalReport} | ${finalNotes} |`;

    if (updatedLine !== duplicate.raw) {
      appLines[lineIdx] = updatedLine;

      if (onlyRescoreNote && !changed) {
        rescored++;
        console.log(`📝 Rescored: #${duplicate.num} ${finalCompany} — ${finalRole}`);
      } else {
        updated++;
        console.log(`🔄 Update: #${duplicate.num} ${finalCompany} — ${finalRole}`);
      }
    } else {
      skipped++;
      console.log(`⏭️  Skip: ${addition.company} — ${addition.role} (no effective change)`);
    }
  } else {
    // New entry — use the number from the TSV if it's above max, else bump max.
    const entryNum = addition.num > maxNum ? addition.num : ++maxNum;
    if (addition.num > maxNum) maxNum = addition.num;

    const newLine =
      `| ${entryNum} | ${addition.date} | ${addition.company} | ${addition.role} | ${addition.score} | ${addition.status} | ${addition.pdf} | ${addition.report} | ${addition.notes} |`;

    newLines.push(newLine);
    added++;
    console.log(`➕ Add #${entryNum}: ${addition.company} — ${addition.role} (${addition.score})`);
  }
}

// Insert new lines after header separator
if (newLines.length > 0) {
  let insertIdx = -1;

  for (let i = 0; i < appLines.length; i++) {
    if (appLines[i].includes('---') && appLines[i].startsWith('|')) {
      insertIdx = i + 1;
      break;
    }
  }

  if (insertIdx >= 0) {
    appLines.splice(insertIdx, 0, ...newLines);
  }
}

// Write back
if (!DRY_RUN) {
  writeFileSync(APPS_FILE, appLines.join('\n'));

  if (!existsSync(MERGED_DIR)) mkdirSync(MERGED_DIR, { recursive: true });

  for (const file of tsvFiles) {
    renameSync(join(ADDITIONS_DIR, file), join(MERGED_DIR, file));
  }

  console.log(`\n✅ Moved ${tsvFiles.length} TSVs to merged/`);
}

console.log(`\n📊 Summary: +${added} added, 🔄${updated} updated, 📝${rescored} rescored, ⏭️${skipped} skipped`);

if (DRY_RUN) console.log('(dry-run — no changes written)');

// Optional verify
if (VERIFY && !DRY_RUN) {
  console.log('\n--- Running verification ---');
  try {
    execFileSync('node', [join(CAREER_OPS, 'verify-pipeline.mjs')], { stdio: 'inherit' });
  } catch {
    process.exit(1);
  }
}