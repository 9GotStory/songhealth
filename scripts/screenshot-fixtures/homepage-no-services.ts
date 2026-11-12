// Screenshot content for the Homepage with no Frequently Used Service (Feature 008 #242; spec #239
// "Frequently Used Services"): the demo dataset's Homepage with an empty Services menu, so the
// section is left out and the deep field ends under the hero. Captures / at the five widths the
// feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ homepageMenus }) => {
	await homepageMenus({ services: [] });
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-no-services-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;
