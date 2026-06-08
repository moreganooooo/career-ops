#!/usr/bin/env node
// One-time migration: extract Greenhouse-based companies from the
// ever-jobs catalog (ever-jobs-develop/packages/plugins/source-company-*)
// and emit a YAML block of net-new tracked_companies entries for portals.yml.
//
// Usage: node import-everjobs-companies.mjs > batch/everjobs-import.yml

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';

const PLUGINS_DIR = join(process.cwd(), 'ever-jobs-develop/packages/plugins');
const PORTALS_PATH = join(process.cwd(), 'portals.yml');

// Matches both `api.greenhouse.io` (legacy host used by some ever-jobs
// plugins) and `boards.greenhouse.io` — both normalize to the same slug.
const SLUG_RE = /(?:boards|api)\.greenhouse\.io\/v1\/boards\/([a-zA-Z0-9_-]+)\/jobs/;
const NAME_RE = /@SourcePlugin\(\{[\s\S]*?name:\s*'([^']+)'/;

function extractCompanyEntries() {
  const dirs = readdirSync(PLUGINS_DIR).filter((d) => d.startsWith('source-company-'));
  const entries = [];
  for (const dir of dirs) {
    const srcDir = join(PLUGINS_DIR, dir, 'src');
    if (!existsSync(srcDir)) continue;
    const serviceFile = readdirSync(srcDir).find((f) => f.endsWith('.service.ts'));
    if (!serviceFile) continue;
    const content = readFileSync(join(srcDir, serviceFile), 'utf8');
    const slugMatch = content.match(SLUG_RE);
    const nameMatch = content.match(NAME_RE);
    if (!slugMatch || !nameMatch) continue;
    entries.push({ name: nameMatch[1], slug: slugMatch[1] });
  }
  return entries;
}

function existingSlugs() {
  const config = yaml.load(readFileSync(PORTALS_PATH, 'utf8'));
  const slugs = new Set();
  for (const company of config.tracked_companies || []) {
    const match = (company.api || '').match(/boards-api\.greenhouse\.io\/v1\/boards\/([a-zA-Z0-9_-]+)\/jobs/);
    if (match) slugs.add(match[1]);
  }
  return slugs;
}

const seen = existingSlugs();
const candidates = extractCompanyEntries();
const dedupedSlugs = new Set();
const netNew = [];

for (const { name, slug } of candidates) {
  if (seen.has(slug) || dedupedSlugs.has(slug)) continue;
  dedupedSlugs.add(slug);
  netNew.push({
    name,
    careers_url: `https://boards.greenhouse.io/${slug}`,
    api: `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs`,
    enabled: true,
  });
}

netNew.sort((a, b) => a.name.localeCompare(b.name));

process.stderr.write(`Found ${candidates.length} Greenhouse company plugins, ${netNew.length} net-new after dedup against ${seen.size} existing.\n`);
process.stdout.write(`\n# Imported from ever-jobs catalog — ${new Date().toISOString().slice(0, 10)}\n`);
process.stdout.write(yaml.dump(netNew, { lineWidth: -1 }));
