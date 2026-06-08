/**
 * TypeScript interfaces for the isolved Hire public careers surface.
 *
 * isolved Hire tenant boards (`{tenant}.isolvedhire.com`) expose two clean public
 * surfaces the adapter consumes: a per-tenant job sitemap (`/job_site_map.xml`) that
 * enumerates every open role as a `/jobs/{jobId}.html` detail URL, and each role's
 * detail page, which embeds a Google-for-Jobs JSON-LD `JobPosting` object. The
 * interfaces below describe the subset of the `JobPosting` wire shape the adapter reads
 * plus the normalised internal role assembled from it. Everything the adapter reads is
 * optional and defensively narrowed at parse time, so cross-tenant or future-shape drift
 * never breaks the parser.
 */

/**
 * The `address` sub-object of a JSON-LD `JobPosting.jobLocation.address`
 * (schema.org `PostalAddress`). Only the parts the adapter maps are modelled.
 */
export interface IsolvedPostalAddress {
  /** City / locality of the role (e.g. `Miami`). */
  addressLocality?: string | null;
  /** State / province / region of the role (e.g. `FL`). */
  addressRegion?: string | null;
  /** Country of the role (e.g. `US`). */
  addressCountry?: string | null;
}

/**
 * The `jobLocation` sub-object of a JSON-LD `JobPosting` (schema.org `Place`). The board
 * may emit a single object or, defensively, an array of them; the adapter narrows both.
 */
export interface IsolvedJobLocation {
  /** Postal address parts of the role's place of work. */
  address?: IsolvedPostalAddress | null;
}

/** The `hiringOrganization` sub-object of a JSON-LD `JobPosting` (schema.org `Organization`). */
export interface IsolvedHiringOrganization {
  /** Hiring-organisation display name (the tenant's brand name). */
  name?: string | null;
}

/** The `identifier` sub-object of a JSON-LD `JobPosting` (schema.org `PropertyValue`). */
export interface IsolvedIdentifier {
  /** Property name (often the org name on isolved Hire). */
  name?: string | null;
  /** The stable per-role id value (the numeric `jobId` on isolved Hire). */
  sameAs?: string | number | null;
}

/**
 * A single role's JSON-LD `JobPosting`, as embedded in its `/jobs/{jobId}.html` detail
 * page. Only the fields the adapter consumes are modelled; all are optional and
 * defensively narrowed.
 */
export interface IsolvedJobPosting {
  /** Should be `"JobPosting"` — used to select the right JSON-LD block on the page. */
  '@type'?: string | string[] | null;
  /** Role display title. */
  title?: string | null;
  /** Canonical public detail URL (`…/jobs/{jobId}.html`). */
  url?: string | null;
  /** HTML job-ad body (the rich description). */
  description?: string | null;
  /** Posted timestamp (e.g. `2026-05-06 00:00:00`), when present. */
  datePosted?: string | null;
  /** Employment-type token (e.g. `FULL_TIME`, `PART_TIME`), when present. */
  employmentType?: string | string[] | null;
  /** Hiring organisation (the tenant's brand name). */
  hiringOrganization?: IsolvedHiringOrganization | null;
  /** Place(s) of work (single object or array). */
  jobLocation?: IsolvedJobLocation | IsolvedJobLocation[] | null;
  /** Stable per-role identifier (`sameAs` carries the numeric `jobId`). */
  identifier?: IsolvedIdentifier | null;
}

/**
 * A role reference harvested from the per-tenant job sitemap: the stable numeric `jobId`
 * and its canonical detail URL. The adapter fans out from these to the detail pages.
 */
export interface IsolvedJobRef {
  /** Stable numeric isolved Hire ATS id (the `/jobs/{jobId}.html` path segment). */
  jobId: string;
  /** Absolute canonical detail / apply URL of the role. */
  url: string;
  /** Optional last-modified date from the sitemap (`<lastmod>`), `YYYY-MM-DD`. */
  lastmod?: string | null;
}

/**
 * Normalised view of a single isolved Hire role, ready to map to a JobPostDto.
 */
export interface IsolvedJob {
  /** Stable ATS id (the numeric `jobId`). */
  atsId: string;

  /** Absolute public detail URL (the canonical board job page). */
  url: string;

  /** Absolute public apply URL (the same detail page hosts the apply flow). */
  applyUrl: string;

  /** Job display title. */
  title?: string | null;

  /** Hiring-organisation display name (from the posting, else derived from the slug). */
  companyName?: string | null;

  /** Structured location parts derived from the posting's `jobLocation.address`. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Raw location text (city/state/country joined), used for remote detection. */
  locationText?: string | null;

  /** HTML job-ad body (the richest description available), when present. */
  descriptionHtml?: string | null;

  /** Employment-type label (normalised from `employmentType`). */
  employmentType?: string | null;

  /** Posted date — parsed from `datePosted` / sitemap `lastmod`, when available. */
  datePosted?: string | null;

  /** True when the role advertises remote / virtual / home-working. */
  isRemote?: boolean | null;
}
