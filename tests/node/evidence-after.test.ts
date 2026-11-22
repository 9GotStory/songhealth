// A folder of captures named as scripts/capture-screenshots.mjs names them, staged as after
// images for scripts/evidence-branch.sh --after (#395 retro): scripts/evidence-after/plan.ts.

import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { afterImages } from "../../scripts/evidence-after/plan.ts";

describe("afterImages", () => {
	it("names each capture after-<name> and keeps its captures.txt line, renamed, in file order", () => {
		assert.deepEqual(
			afterImages(
				["moit-demo-1-375.png", "moit-demo-1-1440.png"],
				"moit-demo-1-1440.png\t/ita/demo-moit-1-2570@1440\nmoit-demo-1-375.png\t/ita/demo-moit-1-2570@375\n",
			),
			{
				copies: [
					{ from: "moit-demo-1-375.png", to: "after-moit-demo-1-375.png" },
					{ from: "moit-demo-1-1440.png", to: "after-moit-demo-1-1440.png" },
				],
				captures:
					"after-moit-demo-1-1440.png\t/ita/demo-moit-1-2570@1440\nafter-moit-demo-1-375.png\t/ita/demo-moit-1-2570@375\n",
			},
		);
	});

	it("leaves out the captures.txt lines of images the folder does not hold", () => {
		assert.deepEqual(
			afterImages(
				["moit-demo-1-375.png"],
				"ita-375.png\t/ita@375\nmoit-demo-1-375.png\t/ita/demo-moit-1-2570@375\nmoit-demo-1-3750.png\t/x@3750\n",
			).captures,
			"after-moit-demo-1-375.png\t/ita/demo-moit-1-2570@375\n",
		);
	});

	it("gives no captures.txt when the folder has none or none of its lines names an image there", () => {
		assert.equal(afterImages(["news-375.png"], undefined).captures, undefined);
		assert.equal(afterImages(["news-375.png"], "ita-375.png\t/ita@375\n").captures, undefined);
	});

	it("refuses a folder that already holds a before- or after- image, naming each", () => {
		assert.throws(
			() => afterImages(["after-news-375.png", "news-1440.png", "before-news-375.png"], undefined),
			{
				message:
					"evidence-after: after-news-375.png, before-news-375.png already carry a before-/after- name; run without --after",
			},
		);
	});

	it("refuses a folder without a PNG", () => {
		assert.throws(() => afterImages([], undefined), {
			message: "evidence-after: no PNG in the folder",
		});
	});
});
