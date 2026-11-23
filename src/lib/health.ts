// The Health Information section (Feature 003 #59; spec #51 "Public reads", `01` §7, `03` §9 and
// §14).
//
// /health is the section's hub. It links to its two areas: Health Content, evergreen
// public-health knowledge, and Health Reports, described reports whose authoritative content is a
// Document (GLOSSARY). Every page of the section passes through the hub in its breadcrumb. The
// Dashboard is deferred from V1 and has no place here (`03` §9).

import type { Destination } from "./destinations";

/** The section's own title, its main-navigation label. */
export const HEALTH_TITLE = "ข้อมูลสุขภาพ";

export const HEALTH_PATH = "/health";

/** The Health Content list's title, the GLOSSARY's Thai name. */
export const HEALTH_CONTENT_TITLE = "ความรู้สุขภาพ";

export const HEALTH_CONTENT_PATH = "/health/content";

/** The lead the Health Content list opens with. */
export const HEALTH_CONTENT_LEAD =
	"ความรู้ด้านสุขภาพสำหรับประชาชนในอำเภอสอง เลือกประเด็นสุขภาพที่สนใจได้";

/** The Health Reports list's title, the GLOSSARY's Thai name. */
export const HEALTH_REPORTS_TITLE = "รายงานสุขภาพ";

export const HEALTH_REPORTS_PATH = "/health/reports";

/** The lead the Health Reports list opens with. */
export const HEALTH_REPORTS_LEAD =
	"รายงานด้านสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย พร้อมเอกสารรายงานฉบับเต็ม";

/**
 * The hub's cards, one to each area (Feature 014 #420; spec #417 "The cards"), each with its
 * list's heading icon and its list's lead.
 */
export const HEALTH_DESTINATIONS: readonly Destination[] = [
	{
		href: HEALTH_CONTENT_PATH,
		title: HEALTH_CONTENT_TITLE,
		icon: "heart-pulse",
		summary: HEALTH_CONTENT_LEAD,
	},
	{
		href: HEALTH_REPORTS_PATH,
		title: HEALTH_REPORTS_TITLE,
		icon: "file-chart-column",
		summary: HEALTH_REPORTS_LEAD,
	},
];
