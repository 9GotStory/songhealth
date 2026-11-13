// The verdict of the built page's reveal check (#276; scripts/built-reveal/plan.ts).
//
// The lost reveal below is what Playwright's Chromium 153 read on a page built with the reveal as
// an `animation` shorthand, which lightningcss 1.33.0 folds the timeline into: `animation-timeline`
// computed to auto, and the part was whole below the window (#276's red run).

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { revealFailures, type RevealReadings } from "../../scripts/built-reveal/plan.ts";

/** A reveal that works: the part waits below a 900 px window, shows in it, and stands whole. */
const WORKING: RevealReadings = {
	windowHeight: 900,
	waiting: { top: 5_200, timeline: "view()", opacity: 0 },
	shown: 1,
	still: { top: 5_200, opacity: 1 },
};

describe("the built page's reveal check", () => {
	it("passes a part that waits below the window, shows in it, and stands whole with reduced motion", () => {
		assert.deepEqual(revealFailures(WORKING), []);
	});

	it("names a reveal the built page lost: no view timeline, and the part whole before it is scrolled to", () => {
		assert.deepEqual(
			revealFailures({ ...WORKING, waiting: { top: 5_200, timeline: "auto", opacity: 1 } }),
			[
				"motion allowed, at the page's top: animation-timeline is auto, not view()",
				"motion allowed, at the page's top: opacity is 1, not 0",
			],
		);
	});

	it("takes a part whose top edge is at the window's bottom edge as below it, and names one that starts inside", () => {
		const startsAt = (top: number): RevealReadings => ({
			...WORKING,
			waiting: { ...WORKING.waiting, top },
			still: { ...WORKING.still, top },
		});
		assert.deepEqual(revealFailures(startsAt(900)), []);
		assert.deepEqual(revealFailures(startsAt(899)), [
			"motion allowed, at the page's top: the part is not below the window (899 px down, the window is 900 px)",
			"reduced motion, at the page's top: the part is not below the window (899 px down, the window is 900 px)",
		]);
	});

	it("names a part that stays held back once it is in the window", () => {
		assert.deepEqual(revealFailures({ ...WORKING, shown: 0.4 }), [
			"motion allowed, scrolled to: opacity is 0.4, not 1",
		]);
	});

	it("names a part that waits although reduced motion is preferred", () => {
		assert.deepEqual(revealFailures({ ...WORKING, still: { top: 5_200, opacity: 0 } }), [
			"reduced motion, at the page's top: opacity is 0, not 1",
		]);
	});
});
