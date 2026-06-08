/**
 * assemble-company-batch.ts
 *
 * Deterministic descriptor assembler for the company-source pipeline. Joins:
 *   - a survivors file (output of `probe-company-source.ts`) — live listings, and
 *   - an enrichment file (factual prose: oneLiner, sector, hq, description,
 *     highlights, canonical displayName) keyed by slug, and
 *   - a numbering file mapping slug → { specNo, phaseNo }
 *
 * …into the `CompanyDescriptor[]` batch JSON consumed by both
 * `scaffold-company-source.ts` and `wire-company-source.ts`.
 *
 * All mechanical identifier fields (className / moduleName / serviceName /
 * enumKey) are DERIVED from the canonical displayName so the naming convention
 * is single-sourced and collision-free. Pure + side-effect-free except the
 * final write of the batch file.
 *
 * Usage (via ts-node):
 *   ts-node --project tsconfig.base.json -r tsconfig-paths/register \
 *     scripts/assemble-company-batch.ts .survivors-merged.json .enrich.json .numbering.json .batch-input.json
 */
import * as fs from 'fs';
import * as path from 'path';
import type { CompanyDescriptor, ListingInput } from './scaffold-company-source';

interface Survivor {
  slug: string;
  boardName: string;
  jobCount: number;
  listings: ListingInput[];
}

interface Enrichment {
  slug: string;
  displayName: string;
  oneLiner: string;
  sector: string;
  hq: string;
  description: string;
  highlights: string[];
}

interface Numbering {
  slug: string;
  specNo: number;
  phaseNo: number;
}

/** "Rocket Lab" → "RocketLab"; "EnergyHub" → "EnergyHub"; "U.S. Foods" → "USFoods". */
export function pascalBase(displayName: string): string {
  const cleaned = displayName.replace(/[^A-Za-z0-9 ]+/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words
    .map((w) => (/[a-z]/.test(w) ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join('');
}

/** "Rocket Lab" → "ROCKET_LAB"; "EnergyHub" → "ENERGYHUB". */
export function enumKeyOf(displayName: string): string {
  const cleaned = displayName.replace(/[^A-Za-z0-9 ]+/g, ' ');
  const words = cleaned.split(/\s+/).filter(Boolean);
  return words.map((w) => w.toUpperCase()).join('_');
}

export function assembleOne(
  s: Survivor,
  e: Enrichment,
  n: Numbering,
): CompanyDescriptor {
  const base = pascalBase(e.displayName);
  return {
    slug: s.slug,
    className: base,
    moduleName: `${base}Module`,
    serviceName: `${base}Service`,
    enumKey: enumKeyOf(e.displayName),
    displayName: e.displayName,
    specNo: n.specNo,
    phaseNo: n.phaseNo,
    jobCount: s.jobCount,
    description: e.description,
    oneLiner: e.oneLiner,
    sector: e.sector,
    hq: e.hq,
    highlights: e.highlights,
    listings: s.listings.slice(0, 3),
  };
}

function main(): void {
  const [survPath, enrichPath, numPath, outPath] = process.argv.slice(2);
  const repoRoot = process.cwd();
  const abs = (p: string) => (path.isAbsolute(p) ? p : path.join(repoRoot, p));

  const survivors: Survivor[] = JSON.parse(fs.readFileSync(abs(survPath), 'utf8'));
  const enrich: Enrichment[] = JSON.parse(fs.readFileSync(abs(enrichPath), 'utf8'));
  const numbering: Numbering[] = JSON.parse(fs.readFileSync(abs(numPath), 'utf8'));

  const eBySlug = new Map(enrich.map((e) => [e.slug, e]));
  const nBySlug = new Map(numbering.map((n) => [n.slug, n]));

  const batch: CompanyDescriptor[] = [];
  for (const s of survivors) {
    const e = eBySlug.get(s.slug);
    const n = nBySlug.get(s.slug);
    if (!e) throw new Error(`No enrichment for slug ${s.slug}`);
    if (!n) throw new Error(`No numbering for slug ${s.slug}`);
    batch.push(assembleOne(s, e, n));
  }
  fs.writeFileSync(abs(outPath), JSON.stringify(batch, null, 2) + '\n');
  // eslint-disable-next-line no-console
  console.log(`Assembled ${batch.length} descriptors → ${outPath}`);
  for (const d of batch) {
    // eslint-disable-next-line no-console
    console.log(`  Spec ${d.specNo} / Phase ${d.phaseNo}  ${d.enumKey} = '${d.slug}'  (${d.serviceName})`);
  }
}

if (require.main === module) {
  main();
}
