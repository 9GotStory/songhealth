// Screenshot content for the Homepage's Quick Access (Feature 008 #247; spec #239 "Quick Access"):
// the demo dataset's Homepage with three shortcuts in the Quick Access menu, which the dataset
// leaves empty, so the section shows in its new look before the Contact Summary. Captures / at
// the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ homepageMenus }) => {
	await homepageMenus({
		quickAccess: [
			{ label: "เอกสารเผยแพร่", url: "/documents" },
			{ label: "ข้อมูลสุขภาพ", url: "/health" },
			{ label: "ข่าวสุขภาพ", url: "/news/health" },
		],
	});
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-quick-access-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;
