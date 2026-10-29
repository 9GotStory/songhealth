// Songhealth site identity (Feature 003 #52; spec #51 "Identity" and "SEO").
//
// The site title, tagline, logo and title separator come from EmDash's native
// site settings, so staff change them in Admin without a code change (#51 user
// story 79). Until the settings name them, the office's own name stands in for
// the title, the tagline is left out, the shell shows a placeholder mark
// instead of a logo, and page titles read "page | site title".
//
// An empty value counts as unset. The native settings API cannot delete a
// title, tagline or separator once saved, only empty it (emdash 1.1.0
// src/api/schemas/settings.ts: only the media references accept null), and
// EmDash's own SEO helper treats an empty separator as unset too
// (src/seo/index.ts).
//
// The public origin makes canonical addresses absolute. It resolves the way
// EmDash's native sitemap does (emdash 1.1.0 src/astro/routes/sitemap.xml.ts):
// the settings' site URL, then the configured EMDASH_SITE_URL
// (src/api/public-url.ts getPublicOrigin), then the request's own origin. So a
// page's canonical address and its sitemap entry always agree.

import { getSiteSettings } from "emdash";

/** The office's official name, fixed interface text in the utility bar and footer. */
export const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The site title while the native site settings name none. */
export const DEFAULT_SITE_TITLE = "สำนักงานสาธารณสุขอำเภอสอง";

/** The resolved fields of the native logo setting that the shell renders. */
export interface SiteLogo {
	url: string;
	width?: number;
	height?: number;
}

export interface SiteIdentity {
	title: string;
	tagline?: string;
	/** Absent when no logo is set or its media item no longer exists. */
	logo?: SiteLogo;
	/** Placed between a page's own title and the site title. */
	titleSeparator: string;
	/** The site's public origin, such as "https://example.org", without a trailing slash. */
	origin: string;
}

/** The configured EMDASH_SITE_URL as an origin, or undefined when unset or not http(s). */
function configuredOrigin(): string | undefined {
	const configured = process.env.EMDASH_SITE_URL;
	if (!configured || !URL.canParse(configured)) return undefined;
	const url = new URL(configured);
	return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
}

export async function getSiteIdentity(requestUrl: URL): Promise<SiteIdentity> {
	const settings = await getSiteSettings();
	const title = settings.title?.trim();
	const tagline = settings.tagline?.trim();
	const logo = settings.logo;
	return {
		title: title || DEFAULT_SITE_TITLE,
		tagline: tagline || undefined,
		logo: logo?.url ? { url: logo.url, width: logo.width, height: logo.height } : undefined,
		titleSeparator: settings.seo?.titleSeparator || " | ",
		origin: (settings.url?.trim() || configuredOrigin() || requestUrl.origin).replace(/\/$/, ""),
	};
}
