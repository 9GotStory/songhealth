// The Health Information section (Feature 003 #59; spec #51 "Public reads", `01` §7, `03` §9 and
// §14).
//
// /health is the section's hub. It links to its two areas: Health Content, evergreen
// public-health knowledge, and Health Reports, described reports whose authoritative content is a
// Document (GLOSSARY). Every page of the section passes through the hub in its breadcrumb. The
// Dashboard is deferred from V1 and has no place here (`03` §9).

/** The section's own title, its main-navigation label. */
export const HEALTH_TITLE = "ข้อมูลสุขภาพ";

export const HEALTH_PATH = "/health";

/** The Health Content list's title, the GLOSSARY's Thai name. */
export const HEALTH_CONTENT_TITLE = "ความรู้สุขภาพ";

export const HEALTH_CONTENT_PATH = "/health/content";

/** The Health Reports list's title, the GLOSSARY's Thai name. */
export const HEALTH_REPORTS_TITLE = "รายงานสุขภาพ";

export const HEALTH_REPORTS_PATH = "/health/reports";

/** The hub's links, one to each area. */
export const HEALTH_AREAS = [
	{ label: HEALTH_CONTENT_TITLE, href: HEALTH_CONTENT_PATH },
	{ label: HEALTH_REPORTS_TITLE, href: HEALTH_REPORTS_PATH },
] as const;

/** The breadcrumb's crumb for the hub, which every page of the section passes through. */
export const HEALTH_CRUMB = { label: HEALTH_TITLE, href: HEALTH_PATH };
