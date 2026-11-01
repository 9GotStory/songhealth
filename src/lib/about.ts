// The About section (Feature 003 #60, #61; spec #51 "Public reads" (About), `01` §3, `03` §5 and
// §14).
//
// /about is the office information page. It links to every About sub-page in `01` §3 order.
// Leadership and Personnel list the publicly visible Personnel (src/lib/personnel-directory.ts).
// Policies, Plans and Results list the Documents of one Document Type each: the reference terms
// `policy`, `plan` and `result` that the model-update step adds (scripts/model-update.mjs).

/** The About section's own title, its main-navigation label. */
export const ABOUT_TITLE = "เกี่ยวกับเรา";

export const ABOUT_PATH = "/about";

/** Where the reserved Basic Page `organization` renders (src/lib/basic-pages.ts). */
export const ORGANIZATION_PATH = "/about/organization";

/** An About sub-page that lists records: its address and how it reads. */
interface AboutListPage {
	path: string;
	title: string;
	lead: string;
}

export const LEADERSHIP_PAGE: AboutListPage = {
	path: "/about/leadership",
	title: "ผู้บริหาร",
	lead: "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง",
};

export const PERSONNEL_PAGE: AboutListPage = {
	path: "/about/personnel",
	title: "บุคลากร",
	lead: "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน",
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
	},
	plans: {
		path: "/about/plans",
		type: "plan",
		title: "แผนงาน",
		lead: "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง",
	},
	results: {
		path: "/about/results",
		type: "result",
		title: "ผลการดำเนินงาน",
		lead: "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง",
	},
} as const satisfies Record<string, AboutDocumentList>;

/** Every About sub-page, in `01` §3 order. */
export const ABOUT_SUBPAGES = [
	{ label: "โครงสร้างองค์กร", href: ORGANIZATION_PATH },
	...[LEADERSHIP_PAGE, PERSONNEL_PAGE, ...Object.values(ABOUT_DOCUMENT_LISTS)].map(
		({ title, path }) => ({ label: title, href: path }),
	),
];
