// Screenshot content for the Homepage with nothing Featured (Feature 008 #241; spec #239 "Hero and
// Featured"): the demo dataset's Homepage with an empty Featured menu, so the hero shows its
// headline and the site search alone. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];

const fixtures: Fixtures = async ({ homepageMenus }) => {
	await homepageMenus({ featured: [] });
	return WIDTHS.map((width) => ({ name: `home-no-featured-${width}`, path: `/@${width}` }));
};

export default fixtures;
