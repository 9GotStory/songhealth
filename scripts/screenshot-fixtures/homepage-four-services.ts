// Screenshot content for the Homepage with four Frequently Used Services (Feature 008 #242; spec
// #239 "Frequently Used Services"): the demo dataset's Homepage with the first four of its
// published Services in the Services menu, so the grid goes two to a row from 640 px. Captures /
// at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];

const fixtures: Fixtures = async ({ admin, helpers, homepageMenus }) => {
	const services = (await helpers.listPublishedEntries(admin, "services")).slice(0, 4);
	if (services.length < 4) throw new Error("the runtime holds fewer than four published Services");
	await homepageMenus({
		services: services.map(({ id, data }) =>
			helpers.pickedMenuItem("services", { id, title: String(data?.title) }),
		),
	});
	return WIDTHS.map((width) => ({ name: `home-four-services-${width}`, path: `/@${width}` }));
};

export default fixtures;
