import { basename } from 'path';

/**
 * Rewrite a report link so it resolves relative to the tracker file's directory.
 *
 * TSVs carry root-relative `[num](reports/...)` links. When the tracker lives
 * at data/applications.md the reports/ dir is one level up, so links must be
 * rewritten to `../reports/...`. At the root layout they stay as `reports/...`.
 *
 * @param {string} reportField  - e.g. "[123](reports/123-foo-2026-06-10.md)" or a full table row
 * @param {string} trackerDir   - absolute path to the directory containing applications.md
 * @param {string} reportsRoot  - absolute path to the directory containing reports/
 * @returns {string}
 */
export function normalizeReportLink(reportField, trackerDir, reportsRoot) {
  if (!reportField) return reportField;
  const prefix = basename(trackerDir) === 'data' ? '../reports/' : 'reports/';
  return reportField.replace(
    /\[(\d+)\]\((\.\.\/)?reports\/([^)]+)\)/g,
    (_, num, _dotdot, file) => `[${num}](${prefix}${file})`
  );
}
