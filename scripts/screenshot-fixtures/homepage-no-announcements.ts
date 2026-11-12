// Screenshot content for the Homepage with no current Announcement (Feature 008 #245; spec #239
// "Current Announcements"): the demo dataset's Homepage with every published Announcement returned
// to draft, so the section is left out and Health Information follows Latest News. The run
// publishes each again at its own date. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";

const WIDTHS = [1440, 1024, 768, 375, 320];

const fixtures: Fixtures = async ({ borrow }) => {
	await borrow("announcements");
	return WIDTHS.map((width) => ({ name: `home-no-announcements-${width}`, path: `/@${width}` }));
};

export default fixtures;
