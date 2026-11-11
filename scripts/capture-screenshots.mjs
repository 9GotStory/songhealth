// Pull-request screenshots of public pages, taken from the development runtime.
//
//   node scripts/capture-screenshots.mjs [--in-window] <out-dir> <target> [<target>...]
//
// A target `[name=]path` is captured full-page at 1440 px (desktop), 375 px and 320 px (mobile),
// into <name>-<width>.png. Without a name, the path gives it ("/news/x" is "news-x"), so name a
// path whose slug is synthetic. At the mobile widths the first target, when it is a full-page one,
// is captured again with the menu open. A target `name=path@width` is captured full-page at that
// one width, into <name>.png, and `name=path@width>selector` is a close-up of the first element the
// selector matches, such as "header-375=/@375>header", for a small change that a full page
// would bury (#145 retro). The selector is a Playwright locator, so
// `article:has(h3:has-text("x"))` picks a card by its title. A close-up shows each select in it as
// the list of all its options, since a screenshot leaves out the pop-up an open select draws
// (#176). A target that ends in `!text` is captured after a click on the element whose whole text
// is `text`, such as a control that opens part of the page (#148). The origin is
// PLAYWRIGHT_BASE_URL, else http://127.0.0.1:4324. Pages are read anonymously, with no credential.
// It prints each file with its size in pixels, so a pull request can quote a page's height from it
// (#146 retro). A close-up also prints its element's layout size, the one to quote: its PNG covers
// every pixel the element touches, so it can come out a pixel larger (#194 retro).
//
// While a window holds the runtime (docs/operations/development-quadlet.md "A window") its pages
// show the window's content in place of the demo dataset, so the script stops and names the
// window. The window's holder passes --in-window, as to scripts/dev-runtime-env.sh (#240 retro:
// a ticket's before screenshots were taken on another ticket's trial import).
//
// A pull request shows its pages before and after. Take the before screenshots while the runtime
// still serves the base, before the ticket's first scripts/dev-runtime-update.sh: afterwards they
// need the base promoted again.
//
// To show the images in a pull request without adding them to the code tree, put them on an
// image-only branch with scripts/evidence-branch.sh <ticket> <out-dir>, which prints how to push
// and embed them.

import { existsSync, readFileSync } from "node:fs";
import { mkdir, readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const WIDTHS = [
	{ name: "desktop", viewport: { width: 1440, height: 900 } },
	{ name: "375", viewport: { width: 375, height: 812 } },
	{ name: "320", viewport: { width: 320, height: 640 } },
];

const args = process.argv.slice(2);
const inWindow = args[0] === "--in-window";
/** scripts/dev-runtime-common.sh's WINDOW_LOCK. */
const windowLock = join(homedir(), ".local/state/songhealth-qdev/window");
if (!inWindow && existsSync(windowLock)) {
	console.error(
		`capture-screenshots: a window holds the runtime: ${readFileSync(windowLock, "utf8").trim()}`,
	);
	console.error("wait until it closes (scripts/dev-runtime-window.sh status)");
	process.exit(1);
}
const [outDir, ...targets] = inWindow ? args.slice(1) : args;
if (outDir === undefined || targets.length === 0) {
	console.error(
		"usage: node scripts/capture-screenshots.mjs [--in-window] <out-dir> <target> [<target>...]",
	);
	process.exit(2);
}
const origin = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:4324";

/** A file-name stem for a path: "/" is "home", "/news/x" is "news-x". Thai letters stay. */
function stem(path) {
	const trimmed = path.replace(/^\/+|\/+$/g, "").replace(/[^\p{L}\p{M}\p{N}]+/gu, "-");
	return trimmed === "" ? "home" : trimmed;
}

/**
 * A target as its file-name base, its path, the one width and element it names, if any, and the
 * text of what to click first, if any: "name=/path" names it, a bare "/path" names itself,
 * "@width>selector" follows the path, and "!text" ends the target.
 */
const pages = targets.map((target) => {
	const split = target.startsWith("/") ? -1 : target.indexOf("=");
	const name = split === -1 ? undefined : target.slice(0, split);
	const unnamed = split === -1 ? target : target.slice(split + 1);
	const bang = unnamed.indexOf("!");
	const rest = bang === -1 ? unnamed : unnamed.slice(0, bang);
	const one = /^(?<path>.*?)@(?<width>\d+)(?:>(?<selector>.+))?$/.exec(rest)?.groups;
	const path = one?.path ?? rest;
	return {
		base: name ?? (one ? `${stem(path)}-${one.width}` : stem(path)),
		path,
		width: one && Number(one.width),
		selector: one?.selector,
		click: bang === -1 ? undefined : unnamed.slice(bang + 1),
	};
});

await mkdir(outDir, { recursive: true });
const browser = await chromium.launch();
const written = [];
/** Each close-up's element size in CSS px, by its file. */
const elementSizes = new Map();

/** A PNG's width × height in pixels, from its IHDR header: a CSS px each, at scale factor 1. */
async function pngSize(file) {
	const header = (await readFile(file)).subarray(16, 24);
	return `${header.readUInt32BE(0)}×${header.readUInt32BE(4)}`;
}

/**
 * `path` opened at `viewport`, with every picture loaded and decoded, after a click on the element
 * whose whole text is `click`, when given.
 */
async function openPage(path, viewport, click) {
	const page = await browser.newPage({ viewport });
	await page.goto(new URL(path, origin).href);
	// A full-page screenshot does not scroll, so lazy pictures below the fold would never load.
	// Load and decode every picture first, as a reader scrolling down would see it, including those
	// the click shows.
	await page.evaluate(async () => {
		await document.fonts.ready;
		for (const image of document.images) image.loading = "eager";
		await Promise.all([...document.images].map((image) => image.decode().catch(() => {})));
	});
	if (click !== undefined) await page.getByText(click, { exact: true }).click();
	return page;
}

try {
	for (const [index, { base, path, width, selector, click }] of pages.entries()) {
		if (width !== undefined) {
			const page = await openPage(path, { width, height: 900 }, click);
			const file = join(outDir, `${base}.png`);
			if (selector === undefined) await page.screenshot({ path: file, fullPage: true });
			else {
				const element = page.locator(selector).first();
				await element.evaluate((node) => {
					for (const select of node.querySelectorAll("select")) select.size = select.length;
				});
				await element.screenshot({ path: file });
				const box = await element.boundingBox();
				elementSizes.set(file, `${box.width}×${box.height}`);
			}
			written.push(file);
			await page.close();
			continue;
		}
		for (const { name, viewport } of WIDTHS) {
			const page = await openPage(path, viewport, click);
			const file = join(outDir, `${base}-${name}.png`);
			await page.screenshot({ path: file, fullPage: true });
			written.push(file);
			if (index === 0 && name !== "desktop") {
				await page.locator("summary").filter({ hasText: "เปิดเมนู" }).click();
				const menuFile = join(outDir, `${base}-${name}-menu.png`);
				await page.screenshot({ path: menuFile, fullPage: true });
				written.push(menuFile);
			}
			await page.close();
		}
	}
} finally {
	await browser.close();
}
for (const file of written) {
	const element = elementSizes.has(file) ? ` (element ${elementSizes.get(file)})` : "";
	console.log(`${file} ${await pngSize(file)}${element}`);
}
