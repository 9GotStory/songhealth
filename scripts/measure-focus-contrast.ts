// The contrast of a focus ring against what is drawn behind it, on the development runtime (#281
// retro; Product Owner, 2026-11-13: #281 comment 6848893055, item 2). The suites check that a ring
// shows and is whole, and axe does not measure it against the page under it, so a piece that takes
// focus and lies over two surfaces, such as a card over the deep field's edge, reads its ring with
// this (CODING_STANDARDS "Public pages").
//
//   node scripts/measure-focus-contrast.ts [--fixtures <module>] [--style <css>] <path> \
//     <selector> [<selector>...]
//
// At each of the widths 1440, 1024, 768, 375 and 320 px it opens <path> and, for the first element
// each selector matches, a Playwright locator such as "main article a >> nth=0", gives that element
// the keyboard's focus and prints two readings of the contrast (WCAG 2.2 relative luminance) of
// the ring's colour, its computed `outline-color`, each as the lowest, the highest and how many
// pixels are under 3:1 (SC 1.4.11):
// - under the ring: against the page under each of the ring's own pixels without focus, which is
//   what a ring alone stands out from;
// - beside it: against the pixels next to the ring on either side with focus, which counts what
//   focus draws there too, such as a band of another colour (`focus-ring-banded`).
// The ring's pixels are the band the outline covers, from the element's box with its corners'
// radius, grown by the outline's offset and then its width; a pixel that the band's edge crosses
// is a blend and is left out. It also prints how many of the ring's pixels do not show its colour,
// which is 0 or a few at a fractional edge unless something covers the ring. The element's
// surroundings are captured without focus and with it, after scrolling the element to the
// window's middle and waiting for the pictures that then load. Animations and transitions are
// stopped first, and the pointer rests at the window's corner. The script prints and judges
// nothing.
//
// --fixtures takes a module of scripts/screenshot-fixtures/, through scripts/dev-runtime-env.sh,
// and a prototype's page is measured with its folder as the origin, as
// scripts/measure-text-contrast.ts does. --style adds CSS to each page before it is read, so a ring
// is measured before it is built (#283: the band offered to the Product Owner). Pages are read
// anonymously; the origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import type { Page } from "@playwright/test";

import { contrast, decode, distance, measureAtEachWidth, pixelAt, rgbOf } from "./contrast-kit.ts";

const args = process.argv.slice(2);
const options: { fixtures?: string; style?: string } = {};
while (args[0] === "--fixtures" || args[0] === "--style") {
	const [option, value] = args.splice(0, 2);
	options[option === "--fixtures" ? "fixtures" : "style"] = value;
}
const [path, ...selectors] = args;
if (
	path === undefined ||
	selectors.length === 0 ||
	Object.values(options).some((value) => !value)
) {
	console.error(
		"usage: node scripts/measure-focus-contrast.ts [--fixtures <module>] [--style <css>] <path> <selector> [<selector>...]",
	);
	process.exit(2);
}

/** The lowest and highest of a set of contrast ratios, and how many of them are under 3:1. */
class Reading {
	lowest = Infinity;
	highest = 0;
	pixels = 0;
	low = 0;

	add(ratio: number): void {
		this.pixels++;
		this.lowest = Math.min(this.lowest, ratio);
		this.highest = Math.max(this.highest, ratio);
		if (ratio < 3) this.low++;
	}

	toString(): string {
		const share = Math.round((100 * this.low) / this.pixels);
		return `lowest ${this.lowest.toFixed(2)}:1, highest ${this.highest.toFixed(2)}:1, ${share} % of ${this.pixels} px under 3:1`;
	}
}

/** The contrast of `selector`'s focus ring against the page under it and beside it. */
async function ringContrast(page: Page, selector: string): Promise<string> {
	const element = page.locator(selector).first();
	if (!(await element.isVisible())) return "not shown";
	await element.evaluate((node) => node.scrollIntoView({ block: "center" }));
	await page.waitForLoadState("networkidle");
	await page.mouse.move(0, 0);
	await element.focus();
	const ring = await element.evaluate((node) => {
		const style = getComputedStyle(node);
		return {
			shown: style.outlineStyle !== "none" && Number.parseFloat(style.outlineWidth) > 0,
			color: style.outlineColor,
			offset: Number.parseFloat(style.outlineOffset),
			width: Number.parseFloat(style.outlineWidth),
			radius: Number.parseFloat(style.borderTopLeftRadius),
		};
	});
	if (!ring.shown) return "no focus ring";
	await element.evaluate((node) => (node as HTMLElement).blur());
	const box = await element.boundingBox();
	if (box === null) return "not shown";
	// The element's box widened by the ring's reach and a pixel of its blended edge, in the window.
	const viewport = page.viewportSize()!;
	const margin = Math.ceil(ring.offset + ring.width) + 1;
	const x = Math.max(0, Math.floor(box.x) - margin);
	const y = Math.max(0, Math.floor(box.y) - margin);
	const clip = {
		x,
		y,
		width: Math.min(viewport.width, Math.ceil(box.x + box.width) + margin) - x,
		height: Math.min(viewport.height, Math.ceil(box.y + box.height) + margin) - y,
	};
	const unfocused = await page.screenshot({ clip });
	await element.focus();
	const focused = await page.screenshot({ clip });
	const [before, after] = await decode(page, [unfocused, focused]);

	/**
	 * How far a point of the clip lies outside the element's box with its corners' radius, grown by
	 * `grow`, as Chromium draws an outline around a rounded box; negative inside it.
	 */
	const outside = (px: number, py: number, grow: number) => {
		const radius = ring.radius > 0 ? ring.radius + grow : 0;
		const qx = Math.abs(px + x - (box.x + box.width / 2)) - (box.width / 2 + grow - radius);
		const qy = Math.abs(py + y - (box.y + box.height / 2)) - (box.height / 2 + grow - radius);
		return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - radius;
	};
	const color = rgbOf(ring.color);
	const [under, beside] = [new Reading(), new Reading()];
	let covered = 0;
	for (let at = 0; at < after!.data.length; at += 4) {
		const index = at / 4;
		// The pixel's centre; a pixel the band's edge crosses is left out, as a blend.
		const px = (index % after!.width) + 0.5;
		const py = Math.floor(index / after!.width) + 0.5;
		const inner = outside(px, py, ring.offset);
		const outer = outside(px, py, ring.offset + ring.width);
		if (inner >= 0.5 && outer <= -0.5) {
			const shown = pixelAt(after!, at);
			if (distance(shown, color) > 24) covered++;
			under.add(contrast(color, pixelAt(before!, at)));
		} else if ((inner <= -0.5 && inner >= -1.5) || (outer >= 0.5 && outer <= 1.5)) {
			// The pixel next to the ring on either side, as the page shows it with focus.
			beside.add(contrast(color, pixelAt(after!, at)));
		}
	}
	if (under.pixels === 0) return "no ring pixel found";
	return `${ring.color}; under the ring: ${under}; beside it, with focus: ${beside}; ${covered} px of the ring not in its colour`;
}

await measureAtEachWidth({ path, selectors, ...options }, ringContrast);
