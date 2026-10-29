// `03` §15: the canonical address of each public collection's entries. The node tests check the
// seed against it and the browser tests check the running site, so both name the same table.

export const CANONICAL_URL_PATTERNS: Record<string, string> = {
	news: "/news/{slug}",
	activities: "/activities/{slug}",
	announcements: "/announcements/{slug}",
	services: "/services/{slug}",
	health_services: "/health-services/{slug}",
	health_content: "/health/content/{slug}",
	health_reports: "/health/reports/{slug}",
	documents: "/documents/{slug}",
	pages: "/pages/{slug}",
};
