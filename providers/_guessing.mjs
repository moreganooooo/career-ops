/**
 * _guessing.mjs — Asynchronous engine to guess careers URLs before hitting search APIs.
 */

import { fetchWithTimeout } from './_http.mjs';
import { recognizeProvider } from './_recognition.mjs';

const SLUGS = ['careers', 'jobs', 'about/careers', 'about-us/careers', 'company/careers', 'working-at'];
const SUBDOMAINS = ['careers', 'jobs', 'work'];

/**
 * Attempts to find a company's careers portal by guessing common URL patterns.
 * @param {string} companyName 
 * @param {string} domain Optional — e.g. 'duolingo.com'
 * @returns {Promise<{url: string, provider: string}|null>}
 */
export async function guessPortal(companyName, domain) {
  if (!domain && !companyName) return null;

  const baseDomain = domain || `${companyName.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;
  const urlsToTry = [];

  // Try subdomains
  for (const sub of SUBDOMAINS) {
    urlsToTry.push(`https://${sub}.${baseDomain}`);
  }

  // Try path slugs
  for (const slug of SLUGS) {
    urlsToTry.push(`https://${baseDomain}/${slug}`);
  }

  // Add the root domain as a fallback to look for links
  urlsToTry.push(`https://${baseDomain}`);

  for (const url of urlsToTry) {
    try {
      // Use a shorter timeout for guessing to keep scans fast
      const res = await fetchWithTimeout(url, { timeoutMs: 3000, redirect: 'follow' });
      if (!res.ok) continue;

      const finalUrl = res.url;
      const providerId = recognizeProvider(finalUrl);

      if (providerId) {
        return { url: finalUrl, provider: providerId };
      }

      // If we landed on a generic careers page, check the body for known ATS links
      if (url.includes('careers') || url.includes('jobs')) {
        const html = await res.text();
        const atsLink = findAtsLink(html);
        if (atsLink) {
          return { url: atsLink, provider: recognizeProvider(atsLink) };
        }
      }
    } catch (err) {
      // Ignore failures during guessing
      continue;
    }
  }

  return null;
}

/**
 * Scans HTML for common ATS link patterns.
 */
function findAtsLink(html) {
  const patterns = [
    /https?:\/\/boards\.greenhouse\.io\/[a-z0-9_-]+/i,
    /https?:\/\/jobs\.lever\.co\/[a-z0-9_-]+/i,
    /https?:\/\/jobs\.ashbyhq\.com\/[a-z0-9_-]+/i,
    /https?:\/\/apply\.workable\.com\/[a-z0-9_-]+/i,
  ];

  for (const p of patterns) {
    const match = html.match(p);
    if (match) return match[0];
  }
  return null;
}
