// Songhealth site identity (Feature 003 #52; spec #51 "Identity").
//
// The site title, tagline and logo come from EmDash's native site settings, so
// staff change them in Admin without a code change (#51 user story 79). Until
// the settings name them, the office's own name stands in for the title, the
// tagline is left out, and the shell shows a placeholder mark instead of a logo.
// An empty value counts as unset: the native settings API cannot delete a
// title or tagline once saved, only empty it.

import { getSiteSettings } from "emdash";

/** The office's official name, fixed interface text in the utility bar and footer. */
export const OFFICE_NAME = "สำนักงานสาธารณสุขอำเภอสอง จังหวัดแพร่";

/** The site title while the native site settings name none. */
export const DEFAULT_SITE_TITLE = "สำนักงานสาธารณสุขอำเภอสอง";

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
}

export async function getSiteIdentity(): Promise<SiteIdentity> {
	const settings = await getSiteSettings();
	const title = settings.title?.trim();
	const tagline = settings.tagline?.trim();
	const logo = settings.logo;
	return {
		title: title || DEFAULT_SITE_TITLE,
		tagline: tagline || undefined,
		logo: logo?.url ? { url: logo.url, width: logo.width, height: logo.height } : undefined,
	};
}
