// The destinations /health and /about show as the Service catalog's cards (Feature 014 #420; spec
// #417 "The cards", decisions 4 to 8 and 14).
//
// - /health shows Health Content and Health Reports, in that order; /about its six sub-pages in
//   `01` §3 order. Each card links to the destination's address, is named by the destination's
//   name and carries the icon its page shows in its heading; โครงสร้างองค์กร, whose page has no
//   heading icon, carries `network`.
// - A card's summary is the lead its destination's page opens with. โครงสร้างองค์กร's is the
//   published `organization` Basic Page's summary, and it has none while that page is not
//   published or gives none.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { aboutDestinations } from "../../src/lib/about.ts";
import type { Destination } from "../../src/lib/destinations.ts";
import { HEALTH_DESTINATIONS } from "../../src/lib/health.ts";

/** A destination as the card shows it: its address, name, icon and summary. */
const shown = (destinations: readonly Destination[]) =>
	destinations.map(({ href, title, icon, summary }) => ({ href, title, icon, summary }));

describe("/health's destinations", () => {
	it("are Health Content then Health Reports, each with its heading icon and its list's lead", () => {
		assert.deepEqual(shown(HEALTH_DESTINATIONS), [
			{
				href: "/health/content",
				title: "ความรู้สุขภาพ",
				icon: "heart-pulse",
				summary: "ความรู้ด้านสุขภาพสำหรับประชาชนในอำเภอสอง เลือกประเด็นสุขภาพที่สนใจได้",
			},
			{
				href: "/health/reports",
				title: "รายงานสุขภาพ",
				icon: "file-chart-column",
				summary:
					"รายงานด้านสุขภาพของสำนักงานสาธารณสุขอำเภอสองและเครือข่าย พร้อมเอกสารรายงานฉบับเต็ม",
			},
		]);
	});
});

describe("/about's destinations", () => {
	/** The five list pages' cards, the same whatever the organization page gives. */
	const LISTS = [
		{
			href: "/about/leadership",
			title: "ผู้บริหาร",
			icon: "user-round",
			summary: "ผู้บริหารของสำนักงานสาธารณสุขอำเภอสอง",
		},
		{
			href: "/about/personnel",
			title: "บุคลากร",
			icon: "users-round",
			summary: "บุคลากรของสำนักงานสาธารณสุขอำเภอสอง แยกตามหน่วยงาน",
		},
		{
			href: "/about/policies",
			title: "นโยบาย",
			icon: "scroll-text",
			summary: "เอกสารนโยบายของสำนักงานสาธารณสุขอำเภอสอง",
		},
		{
			href: "/about/plans",
			title: "แผนงาน",
			icon: "clipboard-list",
			summary: "เอกสารแผนงานของสำนักงานสาธารณสุขอำเภอสอง",
		},
		{
			href: "/about/results",
			title: "ผลการดำเนินงาน",
			icon: "chart-column",
			summary: "เอกสารผลการดำเนินงานของสำนักงานสาธารณสุขอำเภอสอง",
		},
	];
	const organization = (summary: string | undefined) => ({
		href: "/about/organization",
		title: "โครงสร้างองค์กร",
		icon: "network",
		summary,
	});

	it("are the six sub-pages in `01` §3 order, โครงสร้างองค์กร first with the organization page's summary", () => {
		const summary = "โครงสร้างการบริหารงานของสำนักงาน";
		assert.deepEqual(shown(aboutDestinations(summary)), [organization(summary), ...LISTS]);
	});

	it("give โครงสร้างองค์กร no summary while its page is not published or gives none", () => {
		for (const summary of [undefined, "", "   "]) {
			assert.deepEqual(
				shown(aboutDestinations(summary)),
				[organization(undefined), ...LISTS],
				`organization summary ${JSON.stringify(summary)}`,
			);
		}
	});
});
