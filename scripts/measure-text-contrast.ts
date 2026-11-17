// The contrast of text against what is drawn behind it, on the development runtime (#241 retro).
// axe leaves text over a gradient or a decoration unmeasured, and a gradient the browser rejects
// leaves no fill at all, so a page that puts text on a drawn field reads its contrast with this
// before its suites run.
//
//   node scripts/measure-text-contrast.ts [--fixtures <module>] [--all-text] [--fold] <path> \
//     <selector> [<selector>...]
//
// At each of the widths 1440, 1024, 768, 375 and 320 px it opens <path> and, for the first element
// each selector matches, a Playwright locator such as "main > section p >> nth=0", prints the
// lowest contrast ratio (WCAG 2.2 relative luminance) between the element's own colour and the
// page under each pixel its text covers. It finds those pixels by capturing the element with its
// text and again with the text transparent, after scrolling it into the window and waiting for the
// pictures that then load (#244). Text inside the element in another colour is measured
// against the element's colour, so give such a run its own selector. A selector that matches more
// than one element prints how many and the first one's words beside its reading. Animations are
// stopped first. Small text needs 4.5:1 and large text 3:1 (SC 1.4.3); the script prints and
// judges nothing. After the widths it prints each text's lowest reading and the widths that read
// it, the line a record quotes (scripts/contrast/plan.ts).
//
// --all-text reads every text of a surface, the reading a spec or a hand-off asks for (#287 retro:
// three tickets in a row left a text of a surface unread, a pill's words, a breadcrumb's later
// links and a card without its picture). Each selector is then a container, such as
// "main .deep-field" or "main article >> nth=0", or "main" for a whole page's texts in one run
// (#318), and every element in it that shows text of its own is read under its tag and first
// words, with the text in its own colour alone: a part in another colour is read as its own line.
// A text in a colour with an alpha, which the script cannot set against the page, is named as not
// read. --fold closes with one line for the texts whose words differ only in their numbers, such
// as a list's rows, in place of a line per text (#318 retro).
//
// A state the demo dataset does not hold takes --fixtures, a module of
// scripts/screenshot-fixtures/, through scripts/dev-runtime-env.sh: its content is made first and
// removed afterwards, as scripts/capture-with-fixtures.ts does. A path written "fixture:<name>" is
// the page of the module's capture of that name, such as "fixture:health-content-plain" for the
// post scripts/screenshot-fixtures/post-empty-row.ts makes; any other path is opened as written.
// A prototype's page is measured the same way before its look is offered to the Product Owner
// (#245 retro), with its folder as the origin and its file as the path:
//   PLAYWRIGHT_BASE_URL=file:///…/home-redesign/ node scripts/measure-text-contrast.ts \
//     home-bold.html <selector>
// The measuring runs in this process without blocking it, so the fixture kit's restore
// still reaches the runtime (a blocked event loop failed a menu restore in #241). Pages are read
// anonymously; the origin is PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324.

import type { Page } from "@playwright/test";

import { foldedLines, summaryLines, type Reading } from "./contrast/plan.ts";
import {
	contrast,
	decode,
	distance,
	measureAtEachWidth,
	pixelAt,
	rgbOf,
	type Target,
} from "./contrast-kit.ts";

const args = process.argv.slice(2);
let fixturesPath: string | undefined;
let allText = false;
let fold = false;
while (args[0] === "--fixtures" || args[0] === "--all-text" || args[0] === "--fold") {
	const option = args.shift();
	if (option === "--all-text") allText = true;
	else if (option === "--fold") fold = true;
	else fixturesPath = args.shift();
}
const [path, ...selectors] = args;
if (path === undefined || selectors.length === 0) {
	console.error(
		"usage: node scripts/measure-text-contrast.ts [--fixtures <module>] [--all-text] [--fold] <path> <selector> [<selector>...]",
	);
	process.exit(2);
}

/** The attribute that marks a text --all-text found, so a locator finds it again. */
const MARK = "data-contrast-text";

/**
 * Every element in the containers `selector` matches that shows text of its own, in the page's
 * order, each named by its tag and first words. An element in the colour of an ancestor that is
 * read is left out: the ancestor's reading covers it. A second text of the same name takes a
 * number, so each keeps its own line over the widths.
 */
async function textsIn(page: Page, selector: string): Promise<Target[]> {
	const found = await page.locator(selector).evaluateAll((roots, mark) => {
		const texts: { id: string; name: string }[] = [];
		const names = new Map<string, number>();
		for (const root of roots) {
			for (const node of [root, ...root.querySelectorAll("*")]) {
				if (!(node instanceof HTMLElement) || node.hasAttribute(mark)) continue;
				const own = [...node.childNodes].some(
					(child) => child.nodeType === Node.TEXT_NODE && child.textContent?.trim(),
				);
				const style = getComputedStyle(node);
				const box = node.getBoundingClientRect();
				// A text for screen readers alone is a box of one pixel.
				if (!own || style.visibility === "hidden" || box.width <= 1 || box.height <= 1) continue;
				let covered = false;
				for (let up = node.parentElement; up !== null && root.contains(up); up = up.parentElement) {
					if (up.hasAttribute(mark) && getComputedStyle(up).color === style.color) covered = true;
				}
				if (covered) continue;
				const words = node.innerText.trim().replace(/\s+/g, " ").slice(0, 30);
				const name = `${node.tagName.toLowerCase()} "${words}"`;
				const count = (names.get(name) ?? 0) + 1;
				names.set(name, count);
				const id = `${document.querySelectorAll(`[${mark}]`).length}`;
				node.setAttribute(mark, id);
				texts.push({ id, name: count === 1 ? name : `${name} (${count})` });
			}
		}
		return texts;
	}, MARK);
	return found.map(({ id, name }) => ({ name, selector: `[${MARK}="${id}"]` }));
}

const readings: Reading[] = [];

/**
 * The lowest contrast of `selector`'s text against the page under it, and how many pixels. Where
 * the selector matches more than one element, the reading names how many and the words of the
 * first, the one measured, so a selector that matches another part first shows it (#285 retro: one
 * read the row of pills at 1.58:1 where the review date was meant). With --all-text the parts of
 * the element in another colour keep their text, so the reading is of the element's colour alone.
 * The text gets its colour back afterwards, for the next reading.
 */
async function lowestContrast(page: Page, selector: string, name: string): Promise<string> {
	const width = page.viewportSize()!.width;
	const unread = (reason: string) => {
		readings.push({ width, text: name });
		return reason;
	};
	const matches = await page.locator(selector).count();
	const element = page.locator(selector).first();
	if (!(await element.isVisible())) return unread("not shown");
	const measured =
		matches > 1
			? `, the first of ${matches}: "${(await element.innerText()).trim().slice(0, 30)}"`
			: "";
	// A screenshot's clip lies in the window, and a picture below it loads once it comes into view.
	await element.scrollIntoViewIfNeeded();
	await page.waitForLoadState("networkidle");
	const clip = await element.boundingBox();
	if (clip === null) return unread("not shown");
	const colour = await element.evaluate((node) => getComputedStyle(node).color);
	if (!colour.startsWith("rgb(")) return unread(`not read: its colour is ${colour}${measured}`);
	const text = rgbOf(colour);
	const withText = await page.screenshot({ clip });
	await element.evaluate((node, ownColourAlone) => {
		const own = getComputedStyle(node).color;
		const parts = [node, ...node.querySelectorAll<HTMLElement>("*")].filter(
			(part) => !ownColourAlone || getComputedStyle(part).color === own,
		) as HTMLElement[];
		for (const part of parts) {
			part.dataset.contrastColour = `${part.style.getPropertyValue("color")}|${part.style.getPropertyPriority("color")}`;
			part.style.setProperty("color", "transparent", "important");
		}
	}, allText);
	const withoutText = await page.screenshot({ clip });
	await page.evaluate(() => {
		for (const part of document.querySelectorAll<HTMLElement>("[data-contrast-colour]")) {
			const [value = "", priority = ""] = part.dataset.contrastColour!.split("|");
			part.style.setProperty("color", value, priority);
			delete part.dataset.contrastColour;
		}
	});
	const [seen, behind] = await decode(page, [withText, withoutText]);
	let lowest = Infinity;
	let covered = 0;
	for (let at = 0; at < behind!.data.length; at += 4) {
		const [shown, field] = [pixelAt(seen!, at), pixelAt(behind!, at)];
		if (distance(shown, field) < 60) continue;
		covered++;
		lowest = Math.min(lowest, contrast(text, field));
	}
	if (covered === 0) return unread(`no text pixel found${measured}`);
	readings.push({ width, text: name, ratio: lowest });
	return `${lowest.toFixed(2)}:1 (${covered} px${measured})`;
}

await measureAtEachWidth(
	{ path, selectors, fixtures: fixturesPath, ...(allText ? { expand: textsIn } : {}) },
	lowestContrast,
);
for (const line of (fold ? foldedLines : summaryLines)(readings)) console.log(line);
