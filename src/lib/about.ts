// The About section (Feature 003 #60; spec #51 "Public reads" (About), `01` §3, `03` §5 and §14).
//
// /about is the office information page. It links to every About sub-page in `01` §3 order.
// Policies, Plans and Results list the Documents of one Document Type each: the reference terms
// `policy`, `plan` and `result` that the model-update step adds (scripts/model-update.mjs).

/** The About section's own title, its main-navigation label. */
export const ABOUT_TITLE = "เกี่ยวกับเรา";

export const ABOUT_PATH = "/about";

/** Every About sub-page, in `01` §3 order. */
export const ABOUT_SUBPAGES = [
	{ label: "โครงสร้างองค์กร", href: "/about/organization" },
	{ label: "ผู้บริหาร", href: "/about/leadership" },
	{ label: "บุคลากร", href: "/about/personnel" },
	{ label: "นโยบาย", href: "/about/policies" },
	{ label: "แผนงาน", href: "/about/plans" },
	{ label: "ผลการดำเนินงาน", href: "/about/results" },
] as const;

/** An About Document page: the Document Type it lists, by term slug, and how it reads. */
export interface AboutDocumentList {
	/** The page's address. */
	path: string;
	/** The Document Type's term slug. */
	type: string;
	title: string;
	lead: string;
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
