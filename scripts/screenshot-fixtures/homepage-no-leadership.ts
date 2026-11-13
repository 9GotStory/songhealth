// Screenshot content for the Homepage with no Leadership (Feature 008 #250; spec #239 "Leadership
// strip", "the missing-content cases"): the demo dataset's Homepage with every published Personnel
// returned to draft, so the strip is left out and Latest News follows the deep field. The run
// publishes each again at its own date. Captures / at the five widths the feature's tickets name.

import type { Fixtures } from "../capture-with-fixtures.ts";
import { HOMEPAGE_WIDTHS } from "./homepage-widths.ts";

const fixtures: Fixtures = async ({ borrow }) => {
	await borrow("personnel");
	return HOMEPAGE_WIDTHS.map((width) => ({
		name: `home-no-leadership-${width}`,
		path: `/@${width}`,
	}));
};

export default fixtures;
