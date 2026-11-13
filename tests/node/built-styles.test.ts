// The check of the built stylesheets (#249 retro; scripts/built-styles/plan.ts).
//
// The two stylesheets below are what `npm run build:check` wrote for the Homepage's reveal in
// #249: first with the reveal as an `animation` shorthand, which lightningcss 1.33.0 folded the
// timeline into and Chromium 153 dropped, then with longhands.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { droppedAnimations, revealHasTimeline } from "../../scripts/built-styles/plan.ts";

const FOLDED =
	"@supports (animation-timeline:view()){.scroll-reveal{animation:linear backwards rise-in view();animation-range:entry 0% entry var(--reveal-end,60%)}}";
const LONGHANDS =
	"@supports (animation-timeline:view()){.scroll-reveal{animation-name:rise-in;animation-timing-function:linear;animation-fill-mode:backwards;animation-timeline:view();animation-range:entry 0% entry var(--reveal-end,60%)}.scroll-reveal:focus-within{animation-name:none}}";

describe("the built stylesheets' check", () => {
	it("names an animation shorthand that carries a view or scroll timeline", () => {
		assert.deepEqual(droppedAnimations(FOLDED), ["animation: linear backwards rise-in view()"]);
		assert.deepEqual(droppedAnimations(".a{animation:fade scroll(self x) both}"), [
			"animation: fade scroll(self x) both",
		]);
	});

	it("passes longhands, a shorthand without a timeline, and a timeline of its own", () => {
		assert.deepEqual(droppedAnimations(LONGHANDS), []);
		assert.deepEqual(
			droppedAnimations(
				".a{animation:1.6s linear 3 picture-shimmer}.b{animation-timeline:scroll(self x)}",
			),
			[],
		);
	});

	it("reads whether the reveal has its view timeline, and that a stylesheet has no reveal", () => {
		assert.equal(revealHasTimeline(LONGHANDS), true);
		assert.equal(revealHasTimeline(FOLDED), false);
		assert.equal(revealHasTimeline(".scroll-reveal {\n  animation-timeline: view();\n}"), true);
		assert.equal(revealHasTimeline(".page-container{width:100%}"), undefined);
	});
});
