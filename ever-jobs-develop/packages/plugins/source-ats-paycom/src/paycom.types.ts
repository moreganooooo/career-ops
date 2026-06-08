/**
 * TypeScript interfaces for the Paycom public careers surface.
 *
 * Paycom serves a multi-tenant, clientkey-addressed careers board from
 * `paycomonline.net`. The board is a client-rendered React app that boots a
 * page-embedded bearer token and calls an applicant-tracking JSON API:
 * `POST /api/ats/job-posting-previews/search` enumerates a tenant's open roles
 * and `GET /api/ats/job-postings/{id}` returns a single role's full HTML body.
 * Each role is also pre-rendered for Google-for-Jobs with a schema.org
 * `JobPosting` JSON-LD block on its classic detail page, used as a fallback. The
 * interfaces below model the normalised, parsed shape the adapter extracts from
 * those payloads. Field names mirror the API / schema.org wire meaning; a handful
 * of aliases are modelled defensively so minor cross-tenant or future-version
 * payload drift never breaks the parser.
 */

/**
 * A single job-posting preview from the search API
 * (`/api/ats/job-posting-previews/search`). Only the fields the adapter consumes
 * are typed; everything is optional and defensively narrowed at parse time, since
 * the exact payload varies by tenant and API version. A few aliases (e.g.
 * `jobPostingId` / `id`, `name` / `title`) are modelled so the parser tolerates
 * either naming.
 */
export interface PaycomJobPreview {
  /** Stable per-role id (used as the ATS id). */
  jobPostingId?: string | number | null;
  id?: string | number | null;
  jobId?: string | number | null;

  /** Job display title. */
  title?: string | null;
  name?: string | null;
  jobTitle?: string | null;

  /** Truncated listing description (the full body comes from the detail call). */
  description?: string | null;
  summary?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  stateProvince?: string | null;
  country?: string | null;
  location?: string | null;

  /** Department / category label, when present. */
  department?: string | null;
  category?: string | null;

  /** Employment-type label (e.g. "Full Time"), when present. */
  employmentType?: string | null;
  jobType?: string | null;

  /** Posted / created date. */
  datePosted?: string | null;
  postedDate?: string | null;
  createdDate?: string | null;

  /** Remote flag when the API advertises one. */
  isRemote?: boolean | null;
  remote?: boolean | null;
}

/** The search API envelope: a page of previews plus a total count. */
export interface PaycomSearchResponse {
  results?: PaycomJobPreview[] | null;
  data?: PaycomJobPreview[] | null;
  items?: PaycomJobPreview[] | null;
  jobPostings?: PaycomJobPreview[] | null;
  total?: number | null;
  totalCount?: number | null;
}

/**
 * A single job-posting detail (`/api/ats/job-postings/{id}`). Carries the full
 * HTML `description`; otherwise shares the preview's shape.
 */
export interface PaycomJobDetail extends PaycomJobPreview {
  /** Full job-ad body as HTML. */
  descriptionHtml?: string | null;
}

/** schema.org `PostalAddress` carried inside a `JobPosting.jobLocation`. */
export interface PaycomPostalAddress {
  /** City / town (e.g. "Oklahoma City"). */
  addressLocality?: string | null;
  /** State / region (e.g. "OK"). */
  addressRegion?: string | null;
  /** Country code or name (e.g. "US" / "United States"). */
  addressCountry?: string | { name?: string | null } | null;
}

/** schema.org `Place` carried inside a `JobPosting.jobLocation`. */
export interface PaycomJobLocation {
  address?: PaycomPostalAddress | null;
}

/** schema.org `Organization` carried inside a `JobPosting.hiringOrganization`. */
export interface PaycomHiringOrganization {
  name?: string | null;
}

/**
 * The schema.org `JobPosting` JSON-LD object embedded in a classic detail page.
 * Only the fields the adapter consumes are typed; everything is optional and
 * defensively narrowed at parse time, since the rendered payload varies by tenant.
 */
export interface PaycomJobPosting {
  '@type'?: string | string[] | null;
  title?: string | null;
  description?: string | null;
  datePosted?: string | null;
  validThrough?: string | null;
  employmentType?: string | string[] | null;
  industry?: string | null;
  /** Free-text "remote OK" flag schema.org uses for home-working roles. */
  jobLocationType?: string | null;
  hiringOrganization?: PaycomHiringOrganization | string | null;
  jobLocation?: PaycomJobLocation | PaycomJobLocation[] | null;
  identifier?: { value?: string | number | null } | string | number | null;
  /** Canonical / apply URL when the JSON-LD advertises one. */
  url?: string | null;
}

/**
 * Normalised view of a single Paycom role, assembled from its search preview +
 * detail payload (or, on the JSON-LD fallback path, from its detail-page
 * `JobPosting` JSON-LD with `og:` meta as fallbacks).
 */
export interface PaycomJob {
  /** Job-posting id — used as the ATS id. */
  jobPostingId: string;

  /** Absolute public detail / apply URL. */
  url: string;
  /** Canonical URL from JSON-LD `url` / `og:url`, when present. */
  canonicalUrl?: string | null;

  /** Job display title. */
  title?: string | null;

  /** Tenant company display name. */
  companyName?: string | null;

  /** Full job-ad body as HTML (from the detail call / JSON-LD `description`). */
  descriptionHtml?: string | null;
  /** Plain-text body fallback (from a preview summary / `og:description`). */
  description?: string | null;

  /** Structured location parts. */
  city?: string | null;
  state?: string | null;
  country?: string | null;

  /** Employment-type label. */
  employmentType?: string | null;

  /** Department / category label, when present. */
  department?: string | null;

  /** Posted date — parsed to YYYY-MM-DD. */
  datePosted?: string | null;

  /** True when the role advertises remote / work-from-home. */
  isRemote?: boolean | null;
}
