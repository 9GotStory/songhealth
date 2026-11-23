// The About section (Feature 003 #60, #61; spec #51 "Public reads" (About), `01` §3, `03` §5 and
// §14).
//
// /about is the office information page. It links to every About sub-page in `01` §3 order.
// Leadership and Personnel list the publicly visible Personnel (src/lib/personnel-directory.ts).
// Policies, Plans and Results list the Documents of one Document Type each: the reference terms
// `policy`, `plan` and `result` that the model-update step adds (scripts/model-update.mjs).

import type { Destination, DestinationIconName } from "./destinations";

/** The About section's own title, its main-navigation label. */
export const ABOUT_TITLE = "เกี่ยวกับเรา";

export const ABOUT_PATH = "/about";

/** Where the reserved Basic Page `organization` renders (src/lib/basic-pages.ts). */
export const ORGANIZATION_PATH = "/about/organization";

/** An About sub-page that lists records: its address, how it reads and its heading's icon. */
interface AboutListPage {
	path: string;
	title: string;
	lead: string;
	icon: DestinationIconName;
}

export const LEADERSHIP_PAGE: AboutListPage = {
	path: "/about/leadership",
	title: "ผู้บริหาร",
	lead: "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง",
	icon: "user-round",
};

export const PERSONNEL_PAGE: AboutListPage = {
	path: "/about/personnel",
	title: "บุคลากร",
	lead: "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน",
	icon: "users-round",
};

/** An About Document page: an About list page of one Document Type, by term slug. */
export interface AboutDocumentList extends AboutListPage {
	type: string;
}

export const ABOUT_DOCUMENT_LISTS = {
	policies: {
		path: "/about/policies",
		type: "policy",
		title: "นโยบาย",
		lead: "เอกสารนโยบายของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "scroll-text",
	},
	plans: {
		path: "/about/plans",
		type: "plan",
		title: "แผนงาน",
		lead: "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "clipboard-list",
	},
	results: {
		path: "/about/results",
		type: "result",
		title: "ผลการดำเนินงาน",
		lead: "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง",
		icon: "chart-column",
	},
} as const satisfies Record<string, AboutDocumentList>;

/**
 * /about's cards, one to every About sub-page in `01` §3 order (Feature 014 #420; spec #417 "The
 * cards", decisions 4 and 5): each list page with its heading's icon and its lead, and first
 * โครงสร้างองค์กร with `network`, its page having no heading icon, and the published `organization`
 * Basic Page's summary, none while that page is not published or gives none.
 */
export function aboutDestinations(organizationSummary?: string | null): Destination[] {
	const summary = organizationSummary?.trim() ? organizationSummary : undefined;
	return [
		{ href: ORGANIZATION_PATH, title: "โครงสร้างองค์กร", icon: "network", summary },
		...[LEADERSHIP_PAGE, PERSONNEL_PAGE, ...Object.values(ABOUT_DOCUMENT_LISTS)].map(
			({ path, title, icon, lead }) => ({ href: path, title, icon, summary: lead }),
		),
	];
}
