/**
 * TypeScript interfaces for the Dover public careers surface.
 *
 * Dover exposes a tenant's open roles through its careers-page JSON feed
 * (`/api/v1/careers-page/{slug}`), served unauthenticated so the hosted/embedded
 * board can render it client-side. As a defensive fallback the adapter also reads
 * any schema.org `JobPosting` JSON-LD pre-rendered into the board HTML for
 * Google-for-Jobs. The interfaces below model the normalised, parsed shape the
 * adapter extracts from those sources. Field names mirror the wire meaning; a
 * handful of aliases are modelled defensively so minor cross-tenant or future
 * version drift never breaks the parser.
 */

/**
 * A structured location object as it may appear on a role in the careers feed.
 * Dover surfaces location either as a free-text string or as a small object; both
 * shapes are tolerated.
 */
export interface DoverLocation {
  /** City / town (e.g. "San Francisco"). */
  city?: string | null;
  /** State / region (e.g. "CA"). */
  state?: string | null;
  /** Country code or name (e.g. "US" / "United States"). */
  country?: string | null;
  /** Free-text location label, when the feed gives a single string. */
  name?: string | null;
  /** Whether this location is remote. */
  isRemote?: boolean | null;
}

/**
 * A single role object as carried by the Dover careers-page feed. Only the fields
 * the adapter consumes are typed; everything is optional and defensively narrowed
 * at parse time, since the feed shape varies by tenant and may drift.
 */
export interface DoverFeedJob {
  /** Stable per-role id. Used as the ATS id. */
  id?: string | number | null;
  /** Alternate id aliases observed across tenants / versions. */
  uuid?: string | null;
  jobId?: string | number | null;

  /** Job display title. */
  title?: string | null;
  name?: string | null;

  /** Job-ad body — HTML when present, else plain text. */
  description?: string | null;
  descriptionHtml?: string | null;

  /** Public board / apply URL when the feed advertises one. */
  url?: string | null;
  jobUrl?: string | null;
  applyUrl?: string | null;
  applicationUrl?: string | null;

  /** Location, as a free-text string or a structured object (or a list thereof). */
  location?: string | DoverLocation | Array<string | DoverLocation> | null;
  locations?: Array<string | DoverLocation> | null;

  /** Whether the role is remote / distributed. */
  isRemote?: boolean | null;
  remote?: boolean | null;

  /** Department / team label, when present. */
  department?: string | null;
  team?: string | null;

  /** Employment-type label (e.g. "Full Time"), when present. */
  employmentType?: string | null;
  commitment?: string | null;

  /** Posted / created date, when present. */
  datePosted?: string | null;
  createdAt?: string | null;
  publishedAt?: string | null;
}

/**
 * The careers-page feed envelope. Dover may return the roles as a bare array, or
 * wrapped under a `jobs` / `results` / `data` key; all shapes are tolerated.
 */
export interface DoverCareersFeed {
  jobs?: DoverFeedJob[] | null;
  results?: DoverFeedJob[] | null;
  data?: DoverFeedJob[] | null;
  /** Tenant company display name, when the envelope advertises one. */
  name?: string | null;
  companyName?: string | null;
}

/** schema.org `PostalAddress` carried inside a `JobPosting.jobLocation`. */
export interface DoverPostalAddress {
  /** City / town (e.g. "San Francisco"). */
  addressLocality?: string | null;
  /** State / region (e.g. "California"). */
  addressRegion?: string | null;
  /** Country code or name (e.g. "US" / "United States"). */
  addressCountry?: string | { name?: string | null } | null;
}

/** schema.org `Place` carried inside a `JobPosting.jobLocation`. */
export interface DoverJobLocation {
  address?: DoverPostalAddress | null;
}

/** schema.org `Organization` carried inside a `JobPosting.hiringOrganization`. */
export interface DoverHiringOrganization {
  name?: string | null;
}

/** schema.org `PropertyValue` carried inside a `JobPosting.identifier`. */
export interface DoverIdentifier {
  value?: string | number | null;
}

/**
 * The schema.org `JobPosting` JSON-LD object pre-rendered into a board page. Only
 * the fields the adapter consumes are typed; everything is optional and
 * defensively narrowed at parse time.
 */
export interface DoverJobPosting {
  '@type'?: string | string[] | null;
  title?: string | null;
  description?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  employmentType?: string | string[] | null;
  industry?: string | null;
  /** Free-text "remote OK" flag schema.org uses for distributed roles. */
  jobLocationType?: string | null;
  hiringOrganization?: DoverHiringOrganization | string | null;
  jobLocation?: DoverJobLocation | DoverJobLocation[] | null;
  identifier?: DoverIdentifier | string | number | null;
  /** Canonical / apply URL when the JSON-LD advertises one. */
  url?: string | null;
}

/**
 * Normalised view of a single Dover role, assembled from a careers-feed job (or,
 * defensively, a parsed board-page JSON-LD `JobPosting`).
 */
export interface DoverJob {
  /** Role id — used as the ATS id. */
  jobId: string;

  /** Absolute public board / apply URL. */
  url: string;
  /** Canonical / apply URL from the feed / JSON-LD, when present. */
  applyUrl?: string | null;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name. */
  companyName?: string | null;

  /** Full job-ad body as HTML (when the source carries HTML). */
  descriptionHtml?: string | null;
  /** Plain-text body fallback when no HTML body exists. */
  description?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label, when present. */
  employmentType?: string | null;

  /** Department / team label, when present. */
  department?: string | null;

  /** Posted date — parsed to `YYYY-MM-DD`. */
  datePosted?: string | null;

  /** True when the role advertises remote / distributed working. */
  isRemote?: boolean | null;
}
